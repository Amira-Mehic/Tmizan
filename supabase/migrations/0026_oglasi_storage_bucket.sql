-- ==========================================================================
-- Prostor za pohranu slika oglasa.
--
-- Slike se postavljaju kroz admin panel, a prikazuju svim posjetiocima
-- uključujući neprijavljene, pa je prostor javno čitljiv - jednako kao bilo koja
-- druga statička slika na stranici. Postavljanje, izmjena i brisanje ostaju
-- ograničeni na administratora.
-- ==========================================================================

insert into storage.buckets (id, name, public)
values ('oglasi', 'oglasi', true)
on conflict (id) do nothing;

drop policy if exists "oglasi_public_read" on storage.objects;
create policy "oglasi_public_read" on storage.objects
  for select using (bucket_id = 'oglasi');

drop policy if exists "oglasi_admin_write" on storage.objects;
create policy "oglasi_admin_write" on storage.objects
  for insert with check (bucket_id = 'oglasi' and public.tmizan_has_role('admin'));

drop policy if exists "oglasi_admin_update" on storage.objects;
create policy "oglasi_admin_update" on storage.objects
  for update using (bucket_id = 'oglasi' and public.tmizan_has_role('admin'));

drop policy if exists "oglasi_admin_delete" on storage.objects;
create policy "oglasi_admin_delete" on storage.objects
  for delete using (bucket_id = 'oglasi' and public.tmizan_has_role('admin'));
