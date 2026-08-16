-- ==========================================================================
-- Korisničko ime na profilu.
--
-- Kratak prikazni identifikator, odvojen od punog imena i e-mail adrese. Ostaje
-- prazan dok ga korisnik sam ne postavi. Baza čuva samo jedinstvenost, dok se
-- format provjerava u aplikaciji.
-- ==========================================================================

alter table profiles add column if not exists username text unique;
