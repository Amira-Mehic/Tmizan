-- ==========================================================================
-- Rod korisnika i zaštita od njegove izmjene.
--
-- Podatak se postavlja pri registraciji i koristi za odvajanje muškog i ženskog
-- dijela pri povezivanju učenika i muallima. Korisnik ga ne može mijenjati sam,
-- nego isključivo kroz zahtjev koji odobrava administracija.
--
-- Svaki pokušaj izmjene mimo tog toka baza odbija i bilježi u sigurnosni dnevnik,
-- pa provjera ne zavisi od aplikacije.
-- ==========================================================================

-- Kolona dopušta praznu vrijednost, jer nalozi nastali prije ove izmjene rod
-- nemaju upisan. Za nove naloge popunjavanje se traži pri registraciji.
alter table profiles add column if not exists gender text
  check (gender is null or gender in ('musko','zensko'));

-- Okidač iz ranijih migracija proširuje se da uz ime i adresu upiše i rod.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, gender)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'gender')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- 2) GENDER_CHANGE_REQUESTS - jedini dozvoljeni put za promjenu roda
create table if not exists gender_change_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  current_gender   text,
  requested_gender text not null check (requested_gender in ('musko','zensko')),
  razlog           text not null,
  status           text not null default 'na_cekanju' check (status in ('na_cekanju','odobren','odbijen')),
  decided_by       uuid references profiles(id),
  decided_at       timestamptz,
  created_at       timestamptz default now()
);
create index if not exists idx_gcr_user on gender_change_requests(user_id);

alter table gender_change_requests enable row level security;

drop policy if exists "gcr_insert_own" on gender_change_requests;
create policy "gcr_insert_own" on gender_change_requests for insert with check (auth.uid() = user_id);
drop policy if exists "gcr_select_own" on gender_change_requests;
create policy "gcr_select_own" on gender_change_requests for select using (auth.uid() = user_id);
drop policy if exists "gcr_staff_select" on gender_change_requests;
create policy "gcr_staff_select" on gender_change_requests for select using (public.is_staff());
drop policy if exists "gcr_staff_update" on gender_change_requests;
create policy "gcr_staff_update" on gender_change_requests for update using (public.is_staff());

-- 3) SECURITY_LOG - evidencija sumnjivih radnji (npr. pokušaj direktne izmjene
--    roda) za ručni pregled administracije.
create table if not exists security_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete set null,
  event      text not null,
  detail     text,
  created_at timestamptz default now()
);
alter table security_log enable row level security;
drop policy if exists "security_log_staff_select" on security_log;
create policy "security_log_staff_select" on security_log for select using (public.is_staff());

-- 4) TRIGGER - blokira svaki pokušaj direktne izmjene profiles.gender koji NIJE
--    izvršio staff (admin/moderator, npr. kroz odobravanje gender_change_requests).
--    Umjesto da propusti izmjenu, VRAĆA staru vrijednost i deaktivira profil.
create or replace function public.block_gender_tamper()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.gender is distinct from old.gender and not public.is_staff() then
    insert into public.security_log (user_id, event, detail)
    values (old.id, 'gender_tamper_blocked',
      format('Pokušaj direktne promjene roda (%s → %s) mimo odobrenog zahtjeva.', old.gender, new.gender));
    new.gender := old.gender;      -- poništi pokušanu izmjenu
    new.is_active := false;        -- blokiraj profil do ručnog pregleda
  end if;
  return new;
end;
$$;

drop trigger if exists trg_block_gender_tamper on profiles;
create trigger trg_block_gender_tamper
  before update on profiles
  for each row execute function public.block_gender_tamper();
