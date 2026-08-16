-- ==========================================================================
-- Muallim panel: veza s učenicima, poruke, sesije, testovi i mjesečni planovi.
--
-- Zahtijeva prethodno izvršene migracije 0007 i 0008, jer se oslanja na blokove
-- ponavljanja i planove učenja.
--
-- Veza muallima i učenika je odnos više naprema više, s vlastitim stanjem: zahtjev
-- čeka, prihvaćen je, odbijen ili prekinut. Zbog toga stoji kao zasebna tabela, a
-- ne kao kolona na profilu - jedan učenik vremenom može imati više muallima, a
-- historija veze ostaje sačuvana.
--
-- Ovdje se uvode i halke kao grupe učenika. Ta zamisao kasnije je napuštena, pa su
-- pripadajuće tabele uklonjene migracijama 0038 i 0039.
-- ==========================================================================

-- 1) MUALIM_STUDENTS - veza muallim ↔ učenik (zahtjev → prihvat/odbijanje)
create table if not exists mualim_students (
  id          uuid primary key default gen_random_uuid(),
  mualim_id   uuid not null references profiles(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  status      text not null default 'na_cekanju'
                check (status in ('na_cekanju','prihvacen','odbijen','prekinut')),
  requested_at timestamptz default now(),
  decided_at   timestamptz,
  unique (mualim_id, student_id)
);

-- 2) HALKE - grupe učenika kod jednog muallima (može i 1-na-1)
create table if not exists halke (
  id          uuid primary key default gen_random_uuid(),
  mualim_id   uuid not null references profiles(id) on delete cascade,
  naziv       text not null,                  -- npr. "Halka - 30. džuz, subotom"
  opis        text,
  created_at  timestamptz default now()
);

create table if not exists halka_members (
  id          uuid primary key default gen_random_uuid(),
  halka_id    uuid not null references halke(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  joined_at   timestamptz default now(),
  unique (halka_id, student_id)
);

-- 3) SESSIONS - online/uživo preslušavanja i časovi (za halku ili 1 učenika)
create table if not exists sessions (
  id           uuid primary key default gen_random_uuid(),
  mualim_id    uuid not null references profiles(id) on delete cascade,
  halka_id     uuid references halke(id) on delete cascade,       -- null = individualno
  student_id   uuid references profiles(id) on delete cascade,    -- null = cijela halka
  naslov       text not null,                 -- npr. "Preslušavanje - Džuz 15"
  starts_at    timestamptz not null,
  link         text,                          -- Zoom/Teams/Discord/Viber/WhatsApp...
  smjernice    text,                          -- npr. "Pripremi str. 281–285"
  sazetak      text,                          -- muallim popuni NAKON časa
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Prisustvo i bilješke učenika po sesiji
create table if not exists session_attendance (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  prisutan    boolean,                        -- null = još nije evidentirano
  biljeske    text,                           -- učenikove bilješke tokom časa
  unique (session_id, student_id)
);

-- 4) MESSAGES - direktne poruke muallim ↔ učenik (+ komentari uz zadatak)
create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  body         text not null,
  context_type text check (context_type in ('zadatak','stranica','sesija','opcenito')),
  context_ref  text,                          -- npr. task id, broj stranice, session id
  read_at      timestamptz,
  created_at   timestamptz default now()
);

-- 5) ANNOUNCEMENTS - oglasna ploča muallima (vidljiva njegovim učenicima)
create table if not exists announcements (
  id          uuid primary key default gen_random_uuid(),
  mualim_id   uuid not null references profiles(id) on delete cascade,
  halka_id    uuid references halke(id) on delete cascade,  -- null = svi učenici
  body        text not null,
  vrsta       text default 'obavijest'
                check (vrsta in ('obavijest','motivacija','pohvala','podsjetnik')),
  created_at  timestamptz default now()
);

-- 6) MUALIM_TASKS - sedmični zadaci i muallimov plan za učenika
create table if not exists mualim_tasks (
  id           uuid primary key default gen_random_uuid(),
  mualim_id    uuid not null references profiles(id) on delete cascade,
  student_id   uuid not null references profiles(id) on delete cascade,
  opis         text not null,                 -- npr. "Do petka ponovi 2. džuz bez greške"
  komentar     text,                          -- npr. "Pazi na ajet 7"
  rok          date,
  status       text not null default 'otvoren'
                 check (status in ('otvoren','zavrsen','propusten')),
  completed_at timestamptz,
  created_at   timestamptz default now()
);

-- 7) HIFZ_TESTS - samopreslušavanje slabih ajeta (vidljivo SAMO učeniku)
create table if not exists hifz_tests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  finished    boolean default false,
  tacno       int default 0,
  netacno     int default 0
);

create table if not exists hifz_test_items (
  id                 uuid primary key default gen_random_uuid(),
  test_id            uuid not null references hifz_tests(id) on delete cascade,
  verse_key          text not null,
  result             text check (result in ('tacno','netacno')),
  error_word_indices jsonb default '[]',      -- indeksi riječi s greškom (za bojenje)
  note               text
);

-- 8) MONTHLY_PLANS - mjesečni planovi (uređivanje, praćenje, print)
create table if not exists monthly_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  year        int  not null,
  month       int  not null check (month between 1 and 12),
  rest_days   jsonb default '[]',             -- slobodni dani ["YYYY-MM-DD"]
  days        jsonb not null default '[]',    -- puni model dana (učenje/ponavljanje/upisi/bilješke)
  end_line    numeric default 0,              -- dokle se stiglo (nastavak sljedećeg mjeseca)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, year, month)
);

-- 9) FEMI_STATE - Femi bi-ševk i "džuz sedmično" (sedmične raspodjele)
create table if not exists femi_state (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  method      text not null check (method in ('femi','dzuz_sedmicno')),
  state       jsonb not null default '{}',    -- cijela sedmica (days, juzIndex...)
  week_start  date,
  updated_at  timestamptz default now(),
  unique (user_id, method)
);

-- 10) VERSE_PROGRESS - dodatak: indeksi riječi s greškom po ajetu
alter table verse_progress add column if not exists error_word_indices jsonb default '[]';

-- INDEXI
create index if not exists idx_mualim_students_mualim  on mualim_students(mualim_id);
create index if not exists idx_mualim_students_student on mualim_students(student_id);
create index if not exists idx_halke_mualim            on halke(mualim_id);
create index if not exists idx_halka_members_halka     on halka_members(halka_id);
create index if not exists idx_sessions_mualim         on sessions(mualim_id);
create index if not exists idx_sessions_starts         on sessions(starts_at);
create index if not exists idx_messages_recipient      on messages(recipient_id, read_at);
create index if not exists idx_messages_sender         on messages(sender_id);
create index if not exists idx_announcements_mualim    on announcements(mualim_id);
create index if not exists idx_mualim_tasks_student    on mualim_tasks(student_id, status);
create index if not exists idx_hifz_tests_user         on hifz_tests(user_id);
create index if not exists idx_hifz_test_items_test    on hifz_test_items(test_id);
create index if not exists idx_monthly_plans_user      on monthly_plans(user_id);
create index if not exists idx_femi_state_user         on femi_state(user_id);

-- ROW LEVEL SECURITY
alter table mualim_students    enable row level security;
alter table halke              enable row level security;
alter table halka_members      enable row level security;
alter table sessions           enable row level security;
alter table session_attendance enable row level security;
alter table messages           enable row level security;
alter table announcements      enable row level security;
alter table mualim_tasks       enable row level security;
alter table hifz_tests         enable row level security;
alter table hifz_test_items    enable row level security;
alter table monthly_plans      enable row level security;
alter table femi_state         enable row level security;

-- veze: vide obje strane; zahtjev šalje učenik; odluku donosi muallim
create policy "ms_select" on mualim_students for select
  using (auth.uid() = mualim_id or auth.uid() = student_id);
create policy "ms_insert_student" on mualim_students for insert
  with check (auth.uid() = student_id);
create policy "ms_update_mualim" on mualim_students for update
  using (auth.uid() = mualim_id or auth.uid() = student_id);
create policy "ms_delete" on mualim_students for delete
  using (auth.uid() = mualim_id or auth.uid() = student_id);

-- halke: muallim upravlja svojima; član vidi halku u kojoj jeste
create policy "halke_mualim_all" on halke for all
  using (auth.uid() = mualim_id) with check (auth.uid() = mualim_id);
create policy "halke_member_select" on halke for select
  using (exists (select 1 from halka_members m where m.halka_id = id and m.student_id = auth.uid()));

create policy "hm_mualim_all" on halka_members for all
  using (exists (select 1 from halke h where h.id = halka_id and h.mualim_id = auth.uid()))
  with check (exists (select 1 from halke h where h.id = halka_id and h.mualim_id = auth.uid()));
create policy "hm_student_select" on halka_members for select
  using (auth.uid() = student_id);

-- sesije: muallim upravlja; učenik vidi svoje (individualne ili preko halke)
create policy "sessions_mualim_all" on sessions for all
  using (auth.uid() = mualim_id) with check (auth.uid() = mualim_id);
create policy "sessions_student_select" on sessions for select
  using (
    auth.uid() = student_id
    or exists (select 1 from halka_members m where m.halka_id = sessions.halka_id and m.student_id = auth.uid())
  );

-- prisustvo: učenik piše svoje bilješke/prisustvo; muallim vidi za svoje sesije
create policy "sa_student_all" on session_attendance for all
  using (auth.uid() = student_id) with check (auth.uid() = student_id);
create policy "sa_mualim_select" on session_attendance for select
  using (exists (select 1 from sessions s where s.id = session_id and s.mualim_id = auth.uid()));
create policy "sa_mualim_update" on session_attendance for update
  using (exists (select 1 from sessions s where s.id = session_id and s.mualim_id = auth.uid()));
create policy "sa_mualim_insert" on session_attendance for insert
  with check (exists (select 1 from sessions s where s.id = session_id and s.mualim_id = auth.uid()));

-- poruke: vide samo pošiljalac i primalac; šalje se u svoje ime
create policy "msg_select" on messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "msg_insert" on messages for insert
  with check (auth.uid() = sender_id);
create policy "msg_update_read" on messages for update
  using (auth.uid() = recipient_id);

-- oglasna ploča: muallim upravlja; njegovi (prihvaćeni) učenici čitaju
create policy "ann_mualim_all" on announcements for all
  using (auth.uid() = mualim_id) with check (auth.uid() = mualim_id);
create policy "ann_student_select" on announcements for select
  using (exists (
    select 1 from mualim_students ms
    where ms.mualim_id = announcements.mualim_id
      and ms.student_id = auth.uid() and ms.status = 'prihvacen'
  ));

-- zadaci: muallim upravlja; učenik vidi svoje i može označiti završeno
create policy "mt_mualim_all" on mualim_tasks for all
  using (auth.uid() = mualim_id) with check (auth.uid() = mualim_id);
create policy "mt_student_select" on mualim_tasks for select
  using (auth.uid() = student_id);
create policy "mt_student_update" on mualim_tasks for update
  using (auth.uid() = student_id);

-- testovi: STROGO PRIVATNO - vidi i upravlja samo učenik (muallim NE vidi)
create policy "tests_own" on hifz_tests for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "test_items_own" on hifz_test_items for all
  using (exists (select 1 from hifz_tests t where t.id = test_id and t.user_id = auth.uid()))
  with check (exists (select 1 from hifz_tests t where t.id = test_id and t.user_id = auth.uid()));

-- mjesečni planovi i femi: samo vlasnik
create policy "mp_own" on monthly_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "femi_own" on femi_state for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- MUALLIMOV UVID U NAPREDAK UČENIKA (prihvaćena veza → read-only pristup)
create policy "pp_mualim_select" on page_progress for select
  using (exists (
    select 1 from mualim_students ms
    where ms.student_id = page_progress.user_id
      and ms.mualim_id = auth.uid() and ms.status = 'prihvacen'
  ));

create policy "vp_mualim_select" on verse_progress for select
  using (exists (
    select 1 from mualim_students ms
    where ms.student_id = verse_progress.user_id
      and ms.mualim_id = auth.uid() and ms.status = 'prihvacen'
  ));

create policy "et_mualim_select" on error_tracking for select
  using (exists (
    select 1 from mualim_students ms
    where ms.student_id = error_tracking.user_id
      and ms.mualim_id = auth.uid() and ms.status = 'prihvacen'
  ));
