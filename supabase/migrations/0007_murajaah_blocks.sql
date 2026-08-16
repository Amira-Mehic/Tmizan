-- ==========================================================================
-- Blokovi ponavljanja i stanje intervalnog motora (Motor B).
--
-- Blok je gradivo naučeno istog dana, koje dalje kroz metodu ponavljanja prolazi
-- kao cjelina. Time se prati jedan zapis umjesto svakog ajeta zasebno, a razmaci
-- između ponavljanja rastu prema odabranoj metodi.
--
-- Pokrivene metode: tri dana, sedam dana, Fibonacci i model razmaknutog
-- ponavljanja.
-- ==========================================================================

-- 1) REVIEW_BLOCKS - jedan blok ponavljanja po korisniku
create table if not exists review_blocks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,

  -- Jedinica: šta blok sadrži
  unit_type       text not null default 'ajet'
                    check (unit_type in ('red','ajet','stranica','sura','dzuz')),
  items           jsonb not null default '[]',  -- npr. ["2:255","2:256"] ili [304,305] (stranice)
  label           text,                          -- prikazni naziv, npr. "El-Bekara 255–257"

  -- Kada je naučeno (definiše blok)
  learned_on      date not null default current_date,

  -- Metoda i stanje motora
  method          text not null
                    check (method in ('tri_dana','sedam_dana','fibonacci','srs')),
  step            int  not null default 0,       -- pozicija u nizu intervala (sequence metode)
  srs_level       int  check (srs_level between 1 and 7),  -- samo za SRS
  next_review_on  date,                          -- kada je sljedeće ponavljanje
  last_result     text check (last_result in ('correct','incorrect')),
  finished        boolean not null default false, -- blok prešao u trajno održavanje

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 2) REVIEW_BLOCK_HISTORY - svaki odrađeni pregled bloka
create table if not exists review_block_history (
  id           uuid primary key default gen_random_uuid(),
  block_id     uuid not null references review_blocks(id) on delete cascade,
  review_date  date not null default current_date,
  result       text not null check (result in ('correct','incorrect')),
  errors       int  default 0,
  note         text,
  created_at   timestamptz default now()
);

create index if not exists idx_review_blocks_user      on review_blocks(user_id);
create index if not exists idx_review_blocks_due       on review_blocks(user_id, next_review_on);
create index if not exists idx_review_block_history    on review_block_history(block_id);

-- RLS - svako vidi/mijenja samo svoje blokove
alter table review_blocks        enable row level security;
alter table review_block_history enable row level security;

create policy "review_blocks_all_own" on review_blocks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "review_block_history_all_own" on review_block_history for all
  using (exists (select 1 from review_blocks b where b.id = block_id and b.user_id = auth.uid()))
  with check (exists (select 1 from review_blocks b where b.id = block_id and b.user_id = auth.uid()));
