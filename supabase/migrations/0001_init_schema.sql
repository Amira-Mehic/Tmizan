-- ==========================================================================
-- Osnovna šema aplikacije: profil, praćenje hifza, blog i planer.
--
-- Napredak se prati na tri nivoa istovremeno - po stranici, po pojedinačnom ajetu
-- i po suri. Nivoi nisu izvedeni jedan iz drugog nego stoje kao zasebne tabele,
-- jer korisnici uče u različitim jedinicama: neko prati stranicu mushafa, neko
-- pojedinačni ajet, a sura služi za pregled cjeline.
--
-- Uz svaki nivo ide i historija ponavljanja, odvojena od trenutnog stanja, da se
-- iz nje mogu izvesti statistika i mapa slabih mjesta.
-- ==========================================================================

-- Proširenje koje daje generator nasumičnih identifikatora.
create extension if not exists "pgcrypto";

-- Profil dopunjuje podatke iz sistema prijave, u odnosu jedan naprema jedan.
create table if not exists profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text,
  role             text not null default 'korisnik'
                     check (role in ('korisnik','ucenik','mualim','blogger','admin','management')),
  theme            text default 'default',
  language         text default 'bs' check (language in ('bs','en')),
  arabic_size      int  default 28,
  country          text,   -- ISO 3166-1 alpha-2 kod (npr. "BA"), koristi Settings.jsx
  city             text,   -- koristi Settings.jsx
  created_at       timestamptz default now()
);

-- 2) PAGE_PROGRESS - status po jednoj od 604 stranice mushafa, po korisniku
create table if not exists page_progress (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  page_number      int  not null check (page_number between 1 and 604),
  status           text not null default 'prazna'
                     check (status in ('naucen','u_toku','ponavljanje','savladano','treba_vjezbe','prazna')),
  start_date       date,
  last_repeat      date,
  repeat_count     int default 0,
  new_lesson_reps  int default 0,
  post_learn_reps  int default 0,
  confidence       int default 0 check (confidence between 0 and 5),
  difficulty       text default 'srednja' check (difficulty in ('laka','srednja','teska')),
  errors           int default 0,
  short_note       text,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (user_id, page_number)
);

-- Historija ponavljanja za stranicu (1:N od page_progress)
create table if not exists page_repeat_history (
  id                uuid primary key default gen_random_uuid(),
  page_progress_id  uuid not null references page_progress(id) on delete cascade,
  repeat_date       date not null,
  note              text,
  errors            int default 0,
  created_at        timestamptz default now()
);

-- 3) VERSE_PROGRESS - status po pojedinačnom ajetu, po korisniku
create table if not exists verse_progress (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  verse_key        text not null,                          -- npr. "2:255"
  status           text not null default 'prazna'
                     check (status in ('naucen','u_toku','ponavljanje','savladano','treba_vjezbe','prazna')),
  start_date       date,
  last_repeat      date,
  repeat_count     int default 0,
  confidence       int default 0 check (confidence between 0 and 5),
  difficulty       text default 'srednja' check (difficulty in ('laka','srednja','teska')),
  errors           int default 0,
  short_note       text,
  notes            text,
  personal_tefsir  text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (user_id, verse_key)
);

-- Historija ponavljanja za ajet (1:N od verse_progress)
create table if not exists verse_repeat_history (
  id                 uuid primary key default gen_random_uuid(),
  verse_progress_id  uuid not null references verse_progress(id) on delete cascade,
  repeat_date        date not null,
  note               text,
  errors             int default 0,
  created_at         timestamptz default now()
);

-- Slični ajeti (N:N self-referenca preko verse_key, jednostavan oblik)
create table if not exists similar_ayahs (
  id                 uuid primary key default gen_random_uuid(),
  verse_progress_id  uuid not null references verse_progress(id) on delete cascade,
  similar_verse_key  text not null,
  created_at         timestamptz default now()
);

-- 4) SURAH_PROGRESS - status/bilješke na nivou cijele sure, po korisniku
create table if not exists surah_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  surah_id    int  not null check (surah_id between 1 and 114),
  notes       text,
  data        jsonb default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, surah_id)
);

-- 5) BLOG
create table if not exists blog_posts (
  id                   uuid primary key default gen_random_uuid(),
  author_id            uuid not null references profiles(id) on delete cascade,
  author_display_name  text,        -- npr. "Tmizan tim" kad se ne prikazuje lično ime
  title                text not null,
  title_en             text,
  slug                 text unique not null,
  excerpt              text,
  excerpt_en           text,
  content              text not null,
  content_en           text,
  thumbnail            text,
  video_url            text,
  category             text default 'sve'
                         check (category in ('sve','hifz','tedzvid','motivacija','arapski','vijesti')),
  read_time            int default 5,
  featured             boolean default false,
  published            boolean default false,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- 6) HIFZ PLANER - generisani planovi ponavljanja (Sprint 9/10)
create table if not exists hifz_plans (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references profiles(id) on delete cascade,
  method                 text not null       -- tačno kako METODE niz definira u HifzPlannerPage.jsx
                           check (method in (
                             'fibonacci','tri_dana','sedam_dana','dzuzevi','stranice','seton',
                             'novo_staro','greske','ramazan','nivo','slobodan','mualim',
                             'femi','dzuz_sedmica','dinamicna','srs'
                           )),
  scope_type             text check (scope_type in ('dzuzovi','sure','hafiz','rucno')),
  scope_data             jsonb default '{}', -- npr. { "odabraniDzuzovi": [1,2,3] } ili { "odabraneSure": [36,67] }
  daily_new_minutes      int,
  daily_review_minutes   int,
  level                  text default 'pocetnik' check (level in ('pocetnik','srednji','napredni')),
  active                 boolean default true,
  created_at             timestamptz default now()
);

create table if not exists hifz_plan_schedule (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references hifz_plans(id) on delete cascade,
  sched_date   date not null,
  item_type    text not null check (item_type in ('new','review')),
  ref_type     text not null check (ref_type in ('page','verse','surah','juz')),
  ref_value    text not null,     -- broj stranice / verse_key / surah_id / juz broj
  done         boolean default false,
  created_at   timestamptz default now()
);

-- 7) SRS - sistem prostornog ponavljanja (Sprint 10)
create table if not exists srs_state (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  item_ref        text not null,   -- broj stranice ili verse_key
  item_type       text not null check (item_type in ('page','verse')),
  srs_level       int  not null default 6 check (srs_level between 0 and 7),
  next_review_at  timestamptz,
  last_result     text check (last_result in ('correct','incorrect')),
  updated_at      timestamptz default now(),
  unique (user_id, item_ref, item_type)
);

-- INDEXI za brzo dohvatanje po korisniku
create index if not exists idx_page_progress_user      on page_progress(user_id);
create index if not exists idx_verse_progress_user      on verse_progress(user_id);
create index if not exists idx_surah_progress_user      on surah_progress(user_id);
create index if not exists idx_page_history_page        on page_repeat_history(page_progress_id);
create index if not exists idx_verse_history_verse      on verse_repeat_history(verse_progress_id);
create index if not exists idx_similar_ayahs_verse      on similar_ayahs(verse_progress_id);
create index if not exists idx_hifz_plans_user          on hifz_plans(user_id);
create index if not exists idx_hifz_plan_schedule_plan  on hifz_plan_schedule(plan_id);
create index if not exists idx_srs_state_user           on srs_state(user_id);
create index if not exists idx_blog_posts_author        on blog_posts(author_id);

-- ROW LEVEL SECURITY - svako vidi/mijenja samo svoje podatke
alter table profiles             enable row level security;
alter table page_progress        enable row level security;
alter table page_repeat_history  enable row level security;
alter table verse_progress       enable row level security;
alter table verse_repeat_history enable row level security;
alter table similar_ayahs        enable row level security;
alter table surah_progress       enable row level security;
alter table blog_posts           enable row level security;
alter table hifz_plans           enable row level security;
alter table hifz_plan_schedule   enable row level security;
alter table srs_state            enable row level security;

-- profiles: korisnik vidi/mijenja samo svoj profil
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- page_progress
create policy "page_progress_all_own" on page_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- page_repeat_history (preko page_progress.user_id)
create policy "page_history_all_own" on page_repeat_history for all
  using (exists (select 1 from page_progress p where p.id = page_progress_id and p.user_id = auth.uid()))
  with check (exists (select 1 from page_progress p where p.id = page_progress_id and p.user_id = auth.uid()));

-- verse_progress
create policy "verse_progress_all_own" on verse_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- verse_repeat_history
create policy "verse_history_all_own" on verse_repeat_history for all
  using (exists (select 1 from verse_progress v where v.id = verse_progress_id and v.user_id = auth.uid()))
  with check (exists (select 1 from verse_progress v where v.id = verse_progress_id and v.user_id = auth.uid()));

-- similar_ayahs
create policy "similar_ayahs_all_own" on similar_ayahs for all
  using (exists (select 1 from verse_progress v where v.id = verse_progress_id and v.user_id = auth.uid()))
  with check (exists (select 1 from verse_progress v where v.id = verse_progress_id and v.user_id = auth.uid()));

-- surah_progress
create policy "surah_progress_all_own" on surah_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- blog_posts: svi mogu čitati OBJAVLJENE postove; autor upravlja svojim
create policy "blog_posts_select_published" on blog_posts for select using (published = true);
create policy "blog_posts_select_own" on blog_posts for select using (auth.uid() = author_id);
create policy "blog_posts_insert_own" on blog_posts for insert with check (auth.uid() = author_id);
create policy "blog_posts_update_own" on blog_posts for update using (auth.uid() = author_id);
create policy "blog_posts_delete_own" on blog_posts for delete using (auth.uid() = author_id);

-- hifz_plans
create policy "hifz_plans_all_own" on hifz_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- hifz_plan_schedule
create policy "hifz_plan_schedule_all_own" on hifz_plan_schedule for all
  using (exists (select 1 from hifz_plans p where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from hifz_plans p where p.id = plan_id and p.user_id = auth.uid()));

-- srs_state
create policy "srs_state_all_own" on srs_state for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SEED - DEV korisnik (odgovara DEV_MODE u AuthContext.jsx). Isključen iz
-- migracije jer zavisi od odgovarajućeg reda u auth.users (Supabase
-- Authentication), koji ova migracija ne kreira.
-- insert into profiles (id, full_name, role)
-- values ('11111111-1111-1111-1111-111111111111', 'Amira Dev', 'korisnik')
-- on conflict (id) do nothing;
