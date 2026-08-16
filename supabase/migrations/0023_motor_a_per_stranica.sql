-- ==========================================================================
-- Motor A prelazi na model po stranici.
--
-- Raniji model držao je niz stranica i poziciju kursora u njemu. Novi model daje
-- svakoj stranici vlastiti datum sljedećeg ponavljanja, isto kao što Motor B već
-- radi za blokove. Time prelazak gradiva iz jednog motora u drugi postaje izmjena
-- nekoliko kolona u istom redu, umjesto brisanja iz jedne i upisa u drugu tabelu.
--
-- Stare kolone se ne uklanjaju sa žive baze, samo ih noviji kod više ne koristi
-- za sam raspored nego zadržava kao parametre ciklusa.
--
-- Ocjena slabosti stranice namjerno se ne čuva kao kolona - računa se pri prikazu
-- iz sigurnosti, grešaka i datuma zadnjeg ponavljanja, da se ne duplira podatak
-- koji se može izvesti.
-- ==========================================================================

alter table page_progress
  add column if not exists sljedece_ponavljanje date;

create index if not exists idx_page_progress_sljedece
  on page_progress(user_id, sljedece_ponavljanje);

-- Ranije se cijela sedmica čuvala kao jedan složeni zapis. Novi model umjesto
-- toga drži pojedinačne parametre: bazen stranica ili naučenih džuzeva, koji je
-- džuz trenutno na redu, i broj završenih ciklusa. Početak tekućeg ciklusa
-- označava već postojeća kolona sa datumom početka sedmice.
alter table femi_state
  add column if not exists items jsonb not null default '[]',
  add column if not exists juz_index int not null default 0,
  add column if not exists cycles_done int not null default 0;
