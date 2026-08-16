-- ==========================================================================
-- Slobodan raspored, muallimov plan preslušavanja i podsjetnici iz baze.
--
-- Slobodan raspored je metoda bez automatike: korisnik sam odlučuje šta ponavlja,
-- a aplikacija samo bilježi šta je odrađeno i iz toga računa statistiku.
--
-- Muallimov plan ima prednost nad korisnikovim vlastitim rasporedom, jer dolazi
-- od osobe koja preslušava.
--
-- Podsjetnici prije sesije zakazuju se unutar same baze, a ne u aplikaciji, pa
-- stižu i kada korisnik nema otvorenu stranicu.
-- ==========================================================================

-- 1) FREE_REVIEW_LOG - metoda slobodnog rasporeda (samo bilježi, bez automatike)
create table if not exists free_review_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  ref         text not null,                 -- stranica / verse_key / sura
  ref_type    text not null default 'page' check (ref_type in ('page','verse','surah','juz')),
  review_date date not null default current_date,
  errors      int default 0,
  note        text,
  created_at  timestamptz default now()
);
create index if not exists idx_free_review_user on free_review_log(user_id, review_date);

-- 2) MUALIM_REVIEW_PLANS - muallimov personalizovani plan (prioritetni)
--    Prikazuje se učeniku IZNAD svih automatskih rasporeda.
create table if not exists mualim_review_plans (
  id          uuid primary key default gen_random_uuid(),
  mualim_id   uuid not null references profiles(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  naslov      text not null,                 -- npr. "Sedmični plan - 2. džuz"
  komentar    text,                          -- npr. "Pazi na ajet 7"
  active      boolean default true,
  created_at  timestamptz default now()
);

create table if not exists mualim_review_plan_days (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references mualim_review_plans(id) on delete cascade,
  dan_datum   date not null,                 -- kojeg dana
  vrsta       text not null default 'ucenje' check (vrsta in ('ucenje','ponavljanje')),
  opis        text not null,                 -- npr. "Ponovi str. 22–24"
  done        boolean default false,
  created_at  timestamptz default now()
);

-- 3) SESSION_REMINDERS - evidencija poslatih push obavijesti (idempotencija)
create table if not exists session_reminders_sent (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  offset_min  int  not null,                 -- 60 ili 30
  sent_at     timestamptz default now(),
  unique (session_id, offset_min)
);

create index if not exists idx_mrp_student on mualim_review_plans(student_id, active);
create index if not exists idx_mrp_days_plan on mualim_review_plan_days(plan_id, dan_datum);

-- RLS
alter table free_review_log         enable row level security;
alter table mualim_review_plans     enable row level security;
alter table mualim_review_plan_days enable row level security;
alter table session_reminders_sent  enable row level security;

-- slobodni log: samo vlasnik
drop policy if exists "frl_own" on free_review_log;
create policy "frl_own" on free_review_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- mualimov plan: muallim (autor) upravlja; učenik čita svoj; staff sve
drop policy if exists "mrp_mualim_all" on mualim_review_plans;
create policy "mrp_mualim_all" on mualim_review_plans for all
  using (auth.uid() = mualim_id or public.is_staff())
  with check (auth.uid() = mualim_id or public.is_staff());
drop policy if exists "mrp_student_select" on mualim_review_plans;
create policy "mrp_student_select" on mualim_review_plans for select
  using (auth.uid() = student_id);

-- dani plana: preko roditelja
drop policy if exists "mrpd_mualim_all" on mualim_review_plan_days;
create policy "mrpd_mualim_all" on mualim_review_plan_days for all
  using (exists (select 1 from mualim_review_plans p where p.id = plan_id and (p.mualim_id = auth.uid() or public.is_staff())))
  with check (exists (select 1 from mualim_review_plans p where p.id = plan_id and (p.mualim_id = auth.uid() or public.is_staff())));
drop policy if exists "mrpd_student" on mualim_review_plan_days;
create policy "mrpd_student" on mualim_review_plan_days for all
  using (exists (select 1 from mualim_review_plans p where p.id = plan_id and p.student_id = auth.uid()))
  with check (exists (select 1 from mualim_review_plans p where p.id = plan_id and p.student_id = auth.uid()));

-- reminderi: čita staff (za debug); piše servisna funkcija (service_role zaobilazi RLS)
drop policy if exists "srs_staff_select" on session_reminders_sent;
create policy "srs_staff_select" on session_reminders_sent for select using (public.is_staff());

-- 4) SERVER-SIDE PODSJETNICI 60/30 min - pg_cron + funkcija koja pravi
--    IN-APP obavijesti (poruke) svim učenicima sesije. Radi i kad je app
--    zatvorena: poruka čeka učenika na dashboardu. (Za pravi browser push
--    dok je app zatvorena, vidi supabase/functions/session-reminders - Edge
--    Function s VAPID web-push; ova funkcija je robusni SQL fallback.)
create or replace function public.send_session_reminders()
returns void language plpgsql security definer set search_path = public as $$
declare
  off int;
  sess record;
  stud record;
begin
  foreach off in array array[60, 30] loop
    -- sesije koje počinju za ~off minuta (prozor od 5 min), a podsjetnik još nije poslan
    for sess in
      select s.* from sessions s
      where s.starts_at between now() + (off || ' minutes')::interval
                            and now() + ((off + 5) || ' minutes')::interval
        and not exists (
          select 1 from session_reminders_sent r
          where r.session_id = s.id and r.offset_min = off
        )
    loop
      -- svim učenicima sesije (individualnoj ili preko halke) - in-app poruka
      for stud in
        select distinct u.student_id from (
          select sess.student_id as student_id where sess.student_id is not null
          union
          select hm.student_id from halka_members hm where hm.halka_id = sess.halka_id
        ) u where u.student_id is not null
      loop
        insert into messages (sender_id, recipient_id, body, context_type, context_ref)
        values (sess.mualim_id, stud.student_id,
                '⏰ Čas "' || sess.naslov || '" počinje za ' || off || ' min.',
                'sesija', sess.id::text);
      end loop;
      insert into session_reminders_sent (session_id, offset_min) values (sess.id, off)
      on conflict (session_id, offset_min) do nothing;
    end loop;
  end loop;
end;
$$;

-- Zakazivanje svakih 5 min preko pg_cron (ako je ekstenzija dostupna).
-- Na Supabase: prvo omogući pg_cron u Dashboard → Database → Extensions,
-- pa pokreni ovaj blok (ili ga odkomentariši ako create extension ne prolazi).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule('tmizan-session-reminders')
      where exists (select 1 from cron.job where jobname = 'tmizan-session-reminders');
    perform cron.schedule('tmizan-session-reminders', '*/5 * * * *',
      $cron$ select public.send_session_reminders(); $cron$);
  end if;
exception when others then
  raise notice 'pg_cron nije aktiviran - podsjetnici se mogu pokrenuti ručno: select send_session_reminders();';
end $$;
