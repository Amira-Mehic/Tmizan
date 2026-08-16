-- ==========================================================================
-- Novi tip poruke: zahtjev za termin preslušavanja koji učenik šalje muallimu.
-- ==========================================================================

alter table messages drop constraint if exists messages_context_type_check;
alter table messages add constraint messages_context_type_check
  check (context_type in ('zadatak', 'stranica', 'sesija', 'opcenito', 'preslusavanje_zahtjev'));
