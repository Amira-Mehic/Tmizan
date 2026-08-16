-- ==========================================================================
-- Datum ponavljanja dobija i vrijeme.
--
-- Model pohrane mjeri razmake u satima, pa sam datum nije dovoljan. Postojeći
-- zapisi zadržavaju svoj datum uz ponoć kao vrijeme, tako da se ništa ne gubi.
-- ==========================================================================

alter table page_repeat_history
  alter column repeat_date type timestamptz using repeat_date::timestamptz;

alter table verse_repeat_history
  alter column repeat_date type timestamptz using repeat_date::timestamptz;
