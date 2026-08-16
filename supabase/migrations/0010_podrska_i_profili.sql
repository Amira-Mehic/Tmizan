-- ==========================================================================
-- Tiketi podrške i proširena pravila čitanja profila.
--
-- Osnovna pravila iz prve migracije dopuštaju uvid isključivo u vlastiti profil.
-- Ovdje se dodaju izuzeci bez kojih dijelovi aplikacije ne bi mogli prikazati
-- imena: direktorij muallima, muallimov popis učenika i status poslanog zahtjeva.
-- ==========================================================================

-- 1) SUPPORT_TICKETS - prijava greške / pitanje / prijedlog
create table if not exists support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  vrsta       text not null default 'pitanje'
                check (vrsta in ('greska','pitanje','prijedlog')),
  naslov      text not null,
  opis        text not null,
  status      text not null default 'otvoren'
                check (status in ('otvoren','u_obradi','rijesen')),
  odgovor     text,                          -- odgovor podrške (management/admin)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_support_tickets_user   on support_tickets(user_id);
create index if not exists idx_support_tickets_status on support_tickets(status);

alter table support_tickets enable row level security;

-- korisnik: kreira i vidi svoje tikete
create policy "st_insert_own" on support_tickets for insert
  with check (auth.uid() = user_id);
create policy "st_select_own" on support_tickets for select
  using (auth.uid() = user_id);

-- podrška (management/admin): vidi i odgovara na sve
create policy "st_staff_select" on support_tickets for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('management','admin')));
create policy "st_staff_update" on support_tickets for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('management','admin')));

-- 2) PROFILES - dodatne politike čitanja (0001 dozvoljava SAMO svoj profil)

-- svi prijavljeni mogu vidjeti profile MUALLIMA (za stranicu "Mualimi")
create policy "profiles_select_mualims" on profiles for select
  using (role = 'mualim' and auth.uid() is not null);

-- muallim vidi profile SVOJIH učenika (za imena u panelu, halkama, porukama)
create policy "profiles_select_my_students" on profiles for select
  using (exists (
    select 1 from mualim_students ms
    where ms.student_id = profiles.id and ms.mualim_id = auth.uid()
  ));

-- učenik vidi profile muallima kojima je poslao zahtjev (status na dashboardu)
create policy "profiles_select_my_mualims" on profiles for select
  using (exists (
    select 1 from mualim_students ms
    where ms.mualim_id = profiles.id and ms.student_id = auth.uid()
  ));
