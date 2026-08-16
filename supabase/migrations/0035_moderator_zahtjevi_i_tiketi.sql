-- ==========================================================================
-- Moderator dobija pristup zahtjevima za muallim ulogu i tiketima podrške.
--
-- Pravila pristupa bila su vezana samo za administratora, pa moderatorski panel
-- nije mogao prikazati te sadržaje iako su tabovi postojali.
-- ==========================================================================

-- Tiketi podrške. Dosadašnja pravila ručno su nabrajala uloge, pa ih je
-- trebalo mijenjati pri svakoj novoj. Umjesto toga poziva se zajednička
-- funkcija koja provjeru radi na jednom mjestu i pokriva obje tabele u kojima
-- uloga može stajati.
drop policy if exists "st_staff_select" on support_tickets;
create policy "st_staff_select" on support_tickets for select
  using (public.is_staff());
drop policy if exists "st_staff_update" on support_tickets;
create policy "st_staff_update" on support_tickets for update
  using (public.is_staff());

-- Dodjela uloga. Moderator smije upisati isključivo muallim ulogu, i to samo
-- kad odobri zahtjev. Nijednu drugu ne može dodijeliti. Puni pristup ostaje
-- administratoru, kroz pravilo iz migracije 0011 koje se ovdje ne dira.
drop policy if exists "ur_moderator_mualim" on app_user_roles;
create policy "ur_moderator_mualim" on app_user_roles for all
  using (public.tmizan_has_role('moderator') and role = 'mualim')
  with check (public.tmizan_has_role('moderator') and role = 'mualim');
