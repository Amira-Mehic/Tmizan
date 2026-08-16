-- ==========================================================================
-- Proširenje halki: termini, moderatori, sesije i opravdanja izostanka.
--
-- Uvodi sedmični raspored po halki, dodjelu moderatora pojedinačnoj halki, razliku
-- između sesija uživo i na daljinu, te obavijesti i zadatke koji se mogu uputiti
-- cijeloj grupi umjesto pojedincu.
--
-- Ovaj dio nikad nije dobio korisničko sučelje. Razvoj je usmjeren na individualni
-- rad s učenikom, pa su tabele uvedene ovdje uklonjene migracijama 0038 i 0039.
-- ==========================================================================

-- 1) HALKE - mjesto održavanja (tekstualni opis, npr. "Online" ili adresa)
alter table halke add column if not exists lokacija text;

-- Redovni sedmični raspored po halki. Jednokratni dodatni časovi se ne upisuju
-- ovdje nego se označavaju na samoj sesiji, da raspored ostane stabilan.
create table if not exists halka_termini (
  id            uuid primary key default gen_random_uuid(),
  halka_id      uuid not null references halke(id) on delete cascade,
  dan_sedmice   int not null check (dan_sedmice between 0 and 6), -- 0=nedjelja..6=subota
  vrijeme       time not null,
  trajanje_min  int default 60,
  aktivan       boolean default true,
  created_at    timestamptz default now()
);
create index if not exists idx_halka_termini_halka on halka_termini(halka_id);

-- 3) HALKA_MODERATORS - dodjela pojedinačne halke konkretnim moderatorima
--    (bilo koji moderator/admin dodjeljuje; svi moderatori inače IMAJU
--    pregled svih halki, ali samo dodijeljeni ili vlasnik mualim/admin mogu
--    njome upravljati - vidi is_halka_staff() ispod)
create table if not exists halka_moderators (
  id            uuid primary key default gen_random_uuid(),
  halka_id      uuid not null references halke(id) on delete cascade,
  moderator_id  uuid not null references profiles(id) on delete cascade,
  dodijelio     uuid references profiles(id),
  created_at    timestamptz default now(),
  unique (halka_id, moderator_id)
);

-- 4) SESSIONS - online/uživo, mjesto (ako uživo), vanredni (dodatni, van
--    redovnog rasporeda) i opciona veza na termin od kojeg je generisana
alter table sessions add column if not exists nacin text default 'online' check (nacin in ('online','uzivo'));
alter table sessions add column if not exists lokacija text;
alter table sessions add column if not exists vanredni boolean default false;
alter table sessions add column if not exists termin_id uuid references halka_termini(id) on delete set null;

-- 5) SESSION_ATTENDANCE - opravdanje izostanka (piše učenik, vidi mualim +
--    dodijeljeni staff); status odlučuje mualim/staff, ne mijenja "prisutan"
--    automatski (ostaje ručna evidencija na času)
alter table session_attendance add column if not exists opravdanje text;
alter table session_attendance add column if not exists opravdanje_status text
  check (opravdanje_status is null or opravdanje_status in ('na_cekanju','odobreno','odbijeno'));
alter table session_attendance add column if not exists opravdanje_odgovor text;

-- 6) ANNOUNCEMENTS - cilj mora biti JEDAN učenik ILI JEDNA halka (provjera
--    ide na frontendu; baza samo dodaje kolonu, bez CHECK-a zbog postojećih
--    "svima" redova iz ranije verzije koji ostaju kakvi jesu)
alter table announcements add column if not exists student_id uuid references profiles(id) on delete cascade;

-- 7) MUALIM_TASKS - halka_id čuva iz koje je grupne dodjele zadatak nastao
--    (sama dodjela i dalje ide kao jedan red po učeniku, radi kompatibilnosti
--    sa postojećim fetchStudentTasks/completeTask tokom)
alter table mualim_tasks add column if not exists halka_id uuid references halke(id) on delete set null;

-- 8) is_halka_staff() - vlasnik mualim, dodijeljeni moderator te halke, ili
--    admin; koristi se u RLS umjesto ponavljanja iste exists() provjere
create or replace function public.is_halka_staff(_halka_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    exists (select 1 from halke h where h.id = _halka_id and h.mualim_id = auth.uid())
    or exists (select 1 from halka_moderators hm where hm.halka_id = _halka_id and hm.moderator_id = auth.uid())
    or public.tmizan_has_role('admin');
$$;

-- RLS ────────────────────────────────────────────────────────────────────
alter table halka_termini    enable row level security;
alter table halka_moderators enable row level security;

-- halke: svi staff (admin/moderator/management) vide SVE halke i ko ih vodi
-- (pregled), ali upravljanje ostaje na is_halka_staff (vlasnik/dodijeljeni/admin)
drop policy if exists "halke_staff_select" on halke;
create policy "halke_staff_select" on halke for select using (public.is_staff());
drop policy if exists "halke_moderator_manage" on halke;
create policy "halke_moderator_manage" on halke for update using (public.is_halka_staff(id)) with check (public.is_halka_staff(id));

-- halka_termini: vidi ih vlasnik/dodijeljeni/admin (upravljanje) + članovi
-- halke (raspored moraju vidjeti i učenici) + svi staff (pregled)
drop policy if exists "ht_manage" on halka_termini;
create policy "ht_manage" on halka_termini for all
  using (public.is_halka_staff(halka_id)) with check (public.is_halka_staff(halka_id));
drop policy if exists "ht_member_select" on halka_termini;
create policy "ht_member_select" on halka_termini for select
  using (exists (select 1 from halka_members m where m.halka_id = halka_termini.halka_id and m.student_id = auth.uid()));
drop policy if exists "ht_staff_select" on halka_termini;
create policy "ht_staff_select" on halka_termini for select using (public.is_staff());

-- halka_moderators: dodjeljuje bilo koji staff; vlasnik mualim i dodijeljeni
-- vide ko je sve na njegovoj halki
drop policy if exists "hmods_staff_all" on halka_moderators;
create policy "hmods_staff_all" on halka_moderators for all
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "hmods_mualim_select" on halka_moderators;
create policy "hmods_mualim_select" on halka_moderators for select
  using (public.is_halka_staff(halka_id));

-- halke/halka_members/sessions/announcements/mualim_tasks: proširi postojeće
-- "mualim_id = auth.uid()" politike da uključe i dodijeljene moderatore, bez
-- diranja postojećih (koje ostaju za mualima samog i staff-all iz 0011/0012)
drop policy if exists "hm_halka_staff_all" on halka_members;
create policy "hm_halka_staff_all" on halka_members for all
  using (public.is_halka_staff(halka_id)) with check (public.is_halka_staff(halka_id));

drop policy if exists "sessions_halka_staff_all" on sessions;
create policy "sessions_halka_staff_all" on sessions for all
  using (halka_id is not null and public.is_halka_staff(halka_id))
  with check (halka_id is not null and public.is_halka_staff(halka_id));

drop policy if exists "ann_halka_staff_all" on announcements;
create policy "ann_halka_staff_all" on announcements for all
  using (halka_id is not null and public.is_halka_staff(halka_id))
  with check (halka_id is not null and public.is_halka_staff(halka_id));
-- učenik vidi i obavijesti upućene direktno njemu (student_id), ne samo halci
drop policy if exists "ann_student_direct_select" on announcements;
create policy "ann_student_direct_select" on announcements for select
  using (auth.uid() = student_id);

drop policy if exists "mt_halka_staff_all" on mualim_tasks;
create policy "mt_halka_staff_all" on mualim_tasks for all
  using (halka_id is not null and public.is_halka_staff(halka_id))
  with check (halka_id is not null and public.is_halka_staff(halka_id));

-- session_attendance: dodijeljeni moderatori te halke vide/upravljaju
-- opravdanjima kao i mualim (preko sessions.halka_id)
drop policy if exists "sa_halka_staff_select" on session_attendance;
create policy "sa_halka_staff_select" on session_attendance for select
  using (exists (
    select 1 from sessions s where s.id = session_id
    and s.halka_id is not null and public.is_halka_staff(s.halka_id)
  ));
drop policy if exists "sa_halka_staff_update" on session_attendance;
create policy "sa_halka_staff_update" on session_attendance for update
  using (exists (
    select 1 from sessions s where s.id = session_id
    and s.halka_id is not null and public.is_halka_staff(s.halka_id)
  ));
