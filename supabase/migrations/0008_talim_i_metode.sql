-- ==========================================================================
-- Ta'lim planovi, metode ponavljanja i model višestruke pohrane.
--
-- Tabele prate podjelu na module u aplikaciji: plan učenja s odabirom mushafa,
-- opsega i tempa, te stanja pojedinačnih metoda ponavljanja.
--
-- Kapacitet se svuda mjeri u redovima mushafa, a ne u minutama ni stranicama. Red
-- je jedina mjera jednaka za sve korisnike i sva izdanja - dužina ajeta se kreće
-- od pola reda do cijele stranice, pa bi svaka druga jedinica davala netačnu
-- procjenu trajanja plana.
-- ==========================================================================

-- 1) TALIM_PLANS - plan učenja (generator, koraci 1–5)
create table if not exists talim_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,

  -- Korak 1: mushaf
  mushaf_edition  text not null default 'medina_15'
                    check (mushaf_edition in ('medina_15','medina_16','indo_13')),
  -- Korak 2: opseg
  scope_type      text not null check (scope_type in ('cijeli','dzuzevi','sure','stranice')),
  scope_data      jsonb default '{}',      -- npr. {"dzuzevi":[30]} ili {"from":582,"to":604}
  -- Korak 3: kapacitet (u redovima dnevno - NE minutama)
  lines_per_day   numeric not null check (lines_per_day > 0),
  -- Korak 4: šta je zaključano
  lock_type       text not null check (lock_type in ('datum','tempo')),
  start_date      date not null default current_date,
  target_date     date,                    -- izračunat ili unesen
  date_certainty  text not null default 'procjena'
                    check (date_certainty in ('tacan','procjena','okviran')),
  -- Korak 5: metoda i smjer
  method          text not null check (method in ('postepeno','redom','krugovi','halka')),
  direction       text default 'od_pocetka'
                    check (direction in ('od_pocetka','od_kraja','zadnji_dzuz_pa_redom')),
  reps_target     int default 20,          -- za metodu postepeno (podesivo)

  state           jsonb default '{}',      -- stanje metode (indeks, krug, halka dijelovi...)
  learned_lines   numeric default 0,       -- ukupno naučeno (za preračun i procenat)
  active          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Dnevna evidencija učenja (planirano vs. stvarno - za nadoknadu i skraćenje procjene)
create table if not exists talim_daily_log (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references talim_plans(id) on delete cascade,
  log_date       date not null,
  planned_lines  numeric default 0,
  learned_lines  numeric default 0,
  note           text,
  created_at     timestamptz default now(),
  unique (plan_id, log_date)
);

-- 2) ROTATION_STATE - kružne metode ponavljanja (džuzevi / kvota / Šeton)
create table if not exists rotation_state (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  method      text not null check (method in ('dzuzevi','stranice','seton')),
  items       jsonb not null default '[]', -- džuzevi / stranice / dijelovi
  position    int  not null default 0,
  quota       int,                          -- za metodu stranica
  temp_quota  int,                          -- privremena kvota (bez gubitka pozicije)
  parts       int,                          -- za Šetona (zadano 8)
  cycles_done int  not null default 0,
  updated_at  timestamptz default now(),
  unique (user_id, method)
);

-- 3) AYAH_MEMORY - model višestruke pohrane (nivoi 6→0 po ajetu)
create table if not exists ayah_memory (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  verse_key     text not null,              -- npr. "36:12"
  block_id      uuid references review_blocks(id) on delete set null,
  nivo          int  not null default 6 check (nivo between 0 and 6),
  sub_step      int  not null default 0 check (sub_step between 0 and 2), -- vatrena zona
  next_due_at   timestamptz,                -- minutska preciznost (nivo 6!)
  last_result   text check (last_result in ('correct','incorrect')),
  updated_at    timestamptz default now(),
  unique (user_id, verse_key)
);

-- 4) ERROR_TRACKING - metoda na osnovu grešaka (mapa slabih mjesta)
create table if not exists error_tracking (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  ref            text not null,             -- broj stranice ili verse_key
  ref_type       text not null check (ref_type in ('page','verse')),
  errors         int  not null default 0,   -- ukupno u historiji
  recent_errors  int  not null default 0,   -- u tekućem ciklusu (reset stabilizacijom)
  clean_streak   int  not null default 0,
  manual_flag    boolean default false,     -- ručno označena nesigurnost
  note           text,
  za_mualima     boolean default false,     -- teško mjesto za muallimov pregled
  next_review_on date,
  updated_at     timestamptz default now(),
  unique (user_id, ref, ref_type)
);

-- INDEXI
create index if not exists idx_talim_plans_user     on talim_plans(user_id);
create index if not exists idx_talim_daily_log_plan on talim_daily_log(plan_id);
create index if not exists idx_rotation_state_user  on rotation_state(user_id);
create index if not exists idx_ayah_memory_user     on ayah_memory(user_id);
create index if not exists idx_ayah_memory_due      on ayah_memory(user_id, next_due_at);
create index if not exists idx_error_tracking_user  on error_tracking(user_id);

-- RLS
alter table talim_plans     enable row level security;
alter table talim_daily_log enable row level security;
alter table rotation_state  enable row level security;
alter table ayah_memory     enable row level security;
alter table error_tracking  enable row level security;

create policy "talim_plans_all_own" on talim_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "talim_daily_log_all_own" on talim_daily_log for all
  using (exists (select 1 from talim_plans p where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from talim_plans p where p.id = plan_id and p.user_id = auth.uid()));

create policy "rotation_state_all_own" on rotation_state for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ayah_memory_all_own" on ayah_memory for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "error_tracking_all_own" on error_tracking for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
