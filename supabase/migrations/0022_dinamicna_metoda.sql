-- ==========================================================================
-- Dinamična raspodjela postaje zasebna metoda.
--
-- Ograničenje na tabeli stanja rotacije nije poznavalo tu vrijednost, pa se
-- stanje upisivalo pod oznakom Femi bi-ševk i prepisivalo tuđe podatke. Ovdje se
-- vrijednost dodaje u dozvoljene, uz kolonu za početak ciklusa.
-- ==========================================================================

alter table rotation_state add column if not exists cycle_start date;

alter table rotation_state drop constraint if exists rotation_state_method_check;
alter table rotation_state add constraint rotation_state_method_check
  check (method in ('dzuzevi','stranice','seton','dinamicna'));
