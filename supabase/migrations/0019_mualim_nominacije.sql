-- ==========================================================================
-- Prijedlog muallima koji dolazi od učenika.
--
-- Odvojeno od samostalne prijave za muallim ulogu iz migracije 0011. Ovdje učenik
-- predlaže mentora kojeg poznaje uživo, a koji se možda ne bi registrovao samostalno.
-- Nakon odobrenja administracija ga kontaktira ručno, jer kreiranje naloga u
-- sistemu prijave traži povlašteni ključ koji aplikacija nema.
-- ==========================================================================

create table if not exists mualim_nominations (
  id                uuid primary key default gen_random_uuid(),
  nominated_by      uuid not null references profiles(id) on delete cascade,  -- učenik
  mualim_full_name  text not null,
  mualim_contact    text not null,   -- email ili telefon predloženog mentora
  odnos             text,           -- veza s predloženim, npr. "hodža u džamiji"
  poruka            text,
  status            text not null default 'na_cekanju' check (status in ('na_cekanju','odobren','odbijen')),
  decided_by        uuid references profiles(id),
  decided_at        timestamptz,
  created_at        timestamptz default now()
);
create index if not exists idx_mualim_nom_student on mualim_nominations(nominated_by);

alter table mualim_nominations enable row level security;

drop policy if exists "mn_insert_own" on mualim_nominations;
create policy "mn_insert_own" on mualim_nominations for insert with check (auth.uid() = nominated_by);
drop policy if exists "mn_select_own" on mualim_nominations;
create policy "mn_select_own" on mualim_nominations for select using (auth.uid() = nominated_by);
drop policy if exists "mn_staff_select" on mualim_nominations;
create policy "mn_staff_select" on mualim_nominations for select using (public.is_staff());
drop policy if exists "mn_staff_update" on mualim_nominations;
create policy "mn_staff_update" on mualim_nominations for update using (public.is_staff());

