-- ==========================================================================
-- Proširenje tipova reference u evidenciji grešaka.
--
-- Kružne metode bilježe greške na nivou džuza, dijela ili sure, a ne samo
-- stranice i ajeta, pa ograničenje mora prihvatiti i te vrijednosti.
-- ==========================================================================

alter table error_tracking drop constraint if exists error_tracking_ref_type_check;
alter table error_tracking add constraint error_tracking_ref_type_check
  check (ref_type in ('page','verse','juz','sura','dio'));
