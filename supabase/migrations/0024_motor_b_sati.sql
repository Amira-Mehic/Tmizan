-- ==========================================================================
-- Motor B prelazi s dnevne na satnu preciznost.
--
-- Datum sljedećeg ponavljanja dobija i vrijeme, a nova kolona pamti tačan trenutak
-- učenja kao polazište za računanje razmaka. Datum učenja bez vremena ostaje
-- netaknut, jer ga koristi podjela na novo i staro gradivo gdje je preciznost dana
-- dovoljna.
--
-- Postojeći zapisi dobijaju ponoć kao vrijeme sljedećeg ponavljanja i podne kao
-- trenutak učenja. To blago pomjera prikaz kašnjenja u satima, ali ne mijenja
-- redoslijed kojim gradivo dospijeva.
-- ==========================================================================

alter table review_blocks
  add column if not exists learned_at timestamptz;

update review_blocks
  set learned_at = (learned_on::text || 'T12:00:00.000Z')::timestamptz
  where learned_at is null;

alter table review_blocks
  alter column next_review_on type timestamptz using next_review_on::timestamptz;

create index if not exists idx_review_blocks_due_ts on review_blocks(user_id, next_review_on);
