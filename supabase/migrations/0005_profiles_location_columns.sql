-- ==========================================================================
-- Kolone lokacije na profilu: država, grad i regija.
--
-- Lokacija se koristi za ciljanje oglasa i za direktorij muallima. Ranija
-- migracija dodala je samo regiju, pa se ovdje dopunjuju sve tri odjednom.
-- ==========================================================================

alter table public.profiles
  add column if not exists country text,
  add column if not exists city    text,
  add column if not exists region  text;

-- PostgREST drži shemu u kešu, pa bez osvježavanja nove kolone ne bi bile
-- vidljive aplikaciji do sljedećeg pokretanja.
notify pgrst, 'reload schema';
