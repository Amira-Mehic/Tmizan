-- ==========================================================================
-- Ponovno slanje zahtjeva za ulogu nakon odbijanja.
--
-- Tabela zahtjeva dopušta samo jedan zapis po korisniku i ulozi, a pravila iz
-- migracije 0011 ne dozvoljavaju izmjenu postojećeg, pa drugi pokušaj ne bi
-- prošao. Pravilo ispod dopušta isključivo prelaz iz odbijenog stanja nazad u
-- čekanje - samo-odobravanje ostaje nemoguće.
-- ==========================================================================

drop policy if exists "rr_reapply_own" on role_requests;
create policy "rr_reapply_own" on role_requests for update
  using (auth.uid() = user_id and status = 'odbijen')
  with check (auth.uid() = user_id and status = 'na_cekanju');
