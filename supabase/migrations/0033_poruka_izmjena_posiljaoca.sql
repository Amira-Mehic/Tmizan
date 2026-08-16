-- ==========================================================================
-- Pošiljalac smije ispraviti tekst već poslane poruke.
--
-- Postojeće pravilo pokrivalo je samo primaoca, i to radi označavanja poruke kao
-- pročitane. Ovim se muallimu omogućava da ispravi odgovor na zahtjev umjesto da
-- šalje novu poruku.
-- ==========================================================================

drop policy if exists "msg_sender_update" on messages;
create policy "msg_sender_update" on messages for update
  using (auth.uid() = sender_id) with check (auth.uid() = sender_id);
