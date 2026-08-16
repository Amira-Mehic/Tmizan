-- ==========================================================================
-- Dopuna kolone za odredišnu adresu oglasa.
--
-- Tabela oglasa postojala je i prije migracije 0025, pa kreiranje tabele u njoj
-- nije ništa uradilo. Ostale kolone su tada dodane zasebnim naredbama, a ova je
-- ispuštena.
-- ==========================================================================

alter table advertisements add column if not exists target_url text;
