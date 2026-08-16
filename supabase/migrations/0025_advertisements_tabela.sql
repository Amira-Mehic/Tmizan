-- ==========================================================================
-- Tabela oglasa, naknadno uvedena u migracije.
--
-- Tabela je nastala izvan migracija, direktno u bazi, kad je ciljanje oglasa po
-- lokaciji prvi put dodano. Zbog toga se ovdje piše obazrivo: kreiranje i dodavanje
-- kolona izvršavaju se samo ako ne postoje, pa migracija prolazi i na okruženju
-- gdje tabela već stoji i na praznoj bazi, ne dirajući postojeće zapise.
-- ==========================================================================

create table if not exists advertisements (
  id             uuid primary key default gen_random_uuid(),
  position       text not null,
  image_url      text not null,
  target_url     text not null,
  title          text,
  target_country text,
  target_city    text,
  target_region  text,
  priority       integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ako je tabela već postojala od ranije (produkcija), dodaj kolone koje
-- eventualno fale - 0004 je već pokrila target_country/city/region
alter table advertisements add column if not exists priority   integer not null default 0;
alter table advertisements add column if not exists created_at timestamptz not null default now();
alter table advertisements add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_ads_position on advertisements(position);
create index if not exists idx_ads_country  on advertisements(target_country);

alter table advertisements enable row level security;

-- javno čitanje samo aktivnih oglasa (BanerSlot ovo koristi i za gosta i za prijavljenog)
drop policy if exists "advertisements_select_active" on advertisements;
create policy "advertisements_select_active" on advertisements
  for select using (is_active = true);

-- CRUD u admin panelu smiju samo admini
drop policy if exists "advertisements_admin_all" on advertisements;
create policy "advertisements_admin_all" on advertisements
  for all using (public.tmizan_has_role('admin'))
  with check (public.tmizan_has_role('admin'));

grant select on advertisements to anon;
grant select, insert, update, delete on advertisements to authenticated;
