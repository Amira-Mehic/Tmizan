-- ==========================================================================
-- Novi sistem uloga: više uloga po korisniku i odobravanje muallima.
--
-- Zamjenjuje shemu iz migracije 0000, koja je uloge razlagala na dozvole kroz
-- četiri povezane tabele. U praksi se pokazalo da aplikacija koristi svega
-- nekoliko uloga s jasnim opsegom, pa je ta složenost donosila više održavanja
-- nego koristi.
--
-- Ovdje umjesto toga stoji jedna tabela koja korisniku pridružuje ulogu. Korisnik
-- može imati više uloga istovremeno - muallim je često i sam učenik.
--
-- Muallim uloga se ne dodjeljuje na zahtjev nego nakon odobrenja. Do tada
-- podnosilac ostaje u ulozi korisnika.
-- ==========================================================================

-- Kolone se dodaju obazrivo, za slučaj da prethodna migracija nije izvršena.
alter table profiles add column if not exists role      text default 'korisnik';
alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists country   text;
alter table profiles add column if not exists city      text;

-- popuni prazne role prije nego postavimo CHECK ograničenje
update profiles set role = 'korisnik' where role is null;

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('korisnik','ucenik','mualim','blogger','admin','management','moderator'));

-- 1) USER_ROLES - korisnik može imati VIŠE uloga (admin ih dodjeljuje)
create table if not exists app_user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  role        text not null check (role in ('korisnik','ucenik','mualim','blogger','moderator','admin')),
  granted_by  uuid references profiles(id),
  created_at  timestamptz default now(),
  unique (user_id, role)
);

-- DEFANZIVNO: ako tabela app_user_roles već postoji od ranije s drugim kolonama,
-- "create table if not exists" ju je preskočio pa dopunjavamo kolone i indeks.
alter table app_user_roles add column if not exists user_id    uuid;
alter table app_user_roles add column if not exists role       text;
alter table app_user_roles add column if not exists granted_by uuid;
alter table app_user_roles add column if not exists created_at timestamptz default now();
create unique index if not exists app_user_roles_user_role_uidx on app_user_roles (user_id, role);

-- postojeće primarne uloge preseli u app_user_roles (idempotentno)
insert into app_user_roles (user_id, role)
select id, role from profiles
where role is not null
on conflict (user_id, role) do nothing;

-- 2) ROLE_REQUESTS - zahtjevi za ulogu (registracija kao muallim)
create table if not exists role_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  role        text not null default 'mualim',
  status      text not null default 'na_cekanju'
                check (status in ('na_cekanju','odobren','odbijen')),
  poruka      text,                          -- korisnikova napomena (iskustvo itd.)
  decided_by  uuid references profiles(id),
  decided_at  timestamptz,
  created_at  timestamptz default now(),
  unique (user_id, role)
);

-- DEFANZIVNO (ako je tabela postojala od ranije bez ovih kolona)
alter table role_requests add column if not exists user_id    uuid;
alter table role_requests add column if not exists role       text default 'mualim';
alter table role_requests add column if not exists status     text default 'na_cekanju';
alter table role_requests add column if not exists poruka     text;
alter table role_requests add column if not exists decided_by uuid;
alter table role_requests add column if not exists decided_at timestamptz;
alter table role_requests add column if not exists created_at timestamptz default now();
create unique index if not exists role_requests_user_role_uidx on role_requests (user_id, role);

-- 3) OBAVIJESTI I SESIJE - potpis autora ("od muallima" / "od moderatora")
alter table announcements add column if not exists author_id   uuid references profiles(id);
alter table announcements add column if not exists author_role text default 'mualim';
alter table sessions add column if not exists created_by      uuid references profiles(id);
alter table sessions add column if not exists created_by_role text default 'mualim';

-- POMOĆNA FUNKCIJA - ima li trenutni korisnik datu ulogu (za RLS)
create or replace function public.tmizan_has_role(r text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_user_roles ur where ur.user_id = auth.uid() and ur.role = r
  ) or exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = r
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.tmizan_has_role('admin') or public.tmizan_has_role('moderator') or public.tmizan_has_role('management');
$$;

-- RLS
alter table app_user_roles    enable row level security;
alter table role_requests enable row level security;

-- app_user_roles: svako vidi svoje; admin vidi i upravlja svima
drop policy if exists "ur_select_own" on app_user_roles;
create policy "ur_select_own" on app_user_roles for select using (auth.uid() = user_id);
drop policy if exists "ur_admin_all" on app_user_roles;
create policy "ur_admin_all" on app_user_roles for all
  using (public.tmizan_has_role('admin')) with check (public.tmizan_has_role('admin'));

-- role_requests: korisnik kreira i vidi svoj; admin/moderator vide i odlučuju
drop policy if exists "rr_insert_own" on role_requests;
create policy "rr_insert_own" on role_requests for insert with check (auth.uid() = user_id);
drop policy if exists "rr_select_own" on role_requests;
create policy "rr_select_own" on role_requests for select using (auth.uid() = user_id);
drop policy if exists "rr_staff_select" on role_requests;
create policy "rr_staff_select" on role_requests for select using (public.is_staff());
drop policy if exists "rr_staff_update" on role_requests;
create policy "rr_staff_update" on role_requests for update using (public.is_staff());

-- admin/moderator: pregled svih profila (lista korisnika u panelu)
drop policy if exists "profiles_staff_select" on profiles;
create policy "profiles_staff_select" on profiles for select using (public.is_staff());
-- admin: promjena primarne uloge (odobravanje muallima)
drop policy if exists "profiles_admin_update" on profiles;
create policy "profiles_admin_update" on profiles for update using (public.tmizan_has_role('admin') or public.tmizan_has_role('moderator'));

-- MODERATOR - smije: spajati učenike i muallime, halke, sesije, oglasnu ploču
-- (NE smije: oglase/ads - te politike se ne diraju)
drop policy if exists "ms_staff_all" on mualim_students;
create policy "ms_staff_all" on mualim_students for all
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "halke_staff_all" on halke;
create policy "halke_staff_all" on halke for all
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "hm_staff_all" on halka_members;
create policy "hm_staff_all" on halka_members for all
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "sessions_staff_all" on sessions;
create policy "sessions_staff_all" on sessions for all
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "ann_staff_all" on announcements;
create policy "ann_staff_all" on announcements for all
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "msg_staff_insert" on messages;
create policy "msg_staff_insert" on messages for insert
  with check (auth.uid() = sender_id);  -- moderator šalje u svoje ime (potpis je sender)

-- HALKA METODA UČENJA - muallim (i staff) upravlja talim planom SVOG učenika
drop policy if exists "tp_mualim_select" on talim_plans;
create policy "tp_mualim_select" on talim_plans for select
  using (exists (
    select 1 from mualim_students ms
    where ms.student_id = talim_plans.user_id
      and ms.mualim_id = auth.uid() and ms.status = 'prihvacen'
  ) or public.is_staff());

drop policy if exists "tp_mualim_write" on talim_plans;
create policy "tp_mualim_write" on talim_plans for update
  using (exists (
    select 1 from mualim_students ms
    where ms.student_id = talim_plans.user_id
      and ms.mualim_id = auth.uid() and ms.status = 'prihvacen'
  ) or public.is_staff());

drop policy if exists "tp_mualim_insert" on talim_plans;
create policy "tp_mualim_insert" on talim_plans for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from mualim_students ms
      where ms.student_id = talim_plans.user_id
        and ms.mualim_id = auth.uid() and ms.status = 'prihvacen'
    ) or public.is_staff()
  );

create index if not exists idx_app_user_roles_user    on app_user_roles(user_id);
create index if not exists idx_role_requests_stat on role_requests(status);
