-- ==========================================================================
-- Referentni sadržaj Kur'ana, javno čitljiv i isti za sve korisnike.
--
-- Tekst se drži u vlastitoj bazi umjesto da se dohvata s vanjskog servisa. Time
-- aplikacija radi neovisno o dostupnosti tuđeg sistema, a plan učenja može
-- računati po redovima mushafa, što vanjski izvori ne nude.
--
-- Male tabele - izdanja, sure, džuzevi i stranice - popunjavaju se odmah ovdje.
-- Velike, s pojedinačnim ajetima, prijevodima i rasporedom redova, ovdje se samo
-- kreiraju; puni ih zasebna skripta iz lokalnih datoteka, jer bi upis šest hiljada
-- zapisa unutar migracije bio nepregledan i spor.
-- ==========================================================================

-- 1) MUSHAF IZDANJA - određuje broj redova po stranici (temelj plana učenja)
--    total_lines je nominalno (stranice × redova/str.); prve ukrasne stranice
--    imaju manje teksta, ali za planiranje je nominalna vrijednost dovoljna.
create table if not exists mushaf_editions (
  id             text primary key,
  name_bs        text not null,
  lines_per_page int  not null,
  total_pages    int  not null,
  total_lines    int  not null,
  script         text default 'uthmani'
);

insert into mushaf_editions (id, name_bs, lines_per_page, total_pages, total_lines, script) values
  ('medinski_15', 'Medinski mushaf (15 redova)', 15, 604, 9060, 'uthmani'),
  ('medinski_16', 'Medinski mushaf (16 redova)', 16, 604, 9664, 'uthmani'),
  ('indopak_13',  'Indo-Pak mushaf (13 redova)', 13, 611, 7943, 'indopak')
on conflict (id) do nothing;
-- aplikacija je trenutno 604-stranična (Medinski). Indo-Pak (611 str.) je
-- uveden radi kompletnosti, ali bi mu trebalo još rada na layoutu.

-- 2) SURE - 114 sura. name = transliteracija; name_ar/name_bs puni seed skripta.
create table if not exists surahs (
  id          int  primary key check (id between 1 and 114),
  name        text not null,
  name_ar     text,
  name_bs     text,
  total_ayahs int  not null,
  start_page  int  not null,
  end_page    int  not null
);

insert into surahs (id, name, total_ayahs, start_page, end_page) values
  (1, 'Al-Fatihah', 7, 1, 1),
  (2, 'Al-Baqarah', 286, 2, 49),
  (3, 'Ali ''Imran', 200, 50, 76),
  (4, 'An-Nisa''', 176, 77, 106),
  (5, 'Al-Ma''idah', 120, 107, 127),
  (6, 'Al-An''am', 165, 128, 150),
  (7, 'Al-A''raf', 206, 151, 176),
  (8, 'Al-Anfal', 75, 177, 186),
  (9, 'At-Tawbah', 129, 187, 207),
  (10, 'Yunus', 109, 208, 221),
  (11, 'Hud', 123, 221, 235),
  (12, 'Yusuf', 111, 235, 248),
  (13, 'Ar-Ra''d', 43, 249, 255),
  (14, 'Ibrahim', 52, 255, 261),
  (15, 'Al-Hijr', 99, 262, 267),
  (16, 'An-Nahl', 128, 267, 281),
  (17, 'Al-Isra''', 111, 282, 293),
  (18, 'Al-Kahf', 110, 293, 304),
  (19, 'Maryam', 98, 305, 312),
  (20, 'Ta-Ha', 135, 312, 321),
  (21, 'Al-Anbiya''', 112, 322, 331),
  (22, 'Al-Hajj', 78, 332, 341),
  (23, 'Al-Mu''minun', 118, 342, 349),
  (24, 'An-Nur', 64, 350, 359),
  (25, 'Al-Furqan', 77, 359, 366),
  (26, 'Ash-Shu''ara''', 227, 367, 376),
  (27, 'An-Naml', 93, 377, 385),
  (28, 'Al-Qasas', 88, 385, 396),
  (29, 'Al-''Ankabut', 69, 396, 404),
  (30, 'Ar-Rum', 60, 404, 410),
  (31, 'Luqman', 34, 411, 414),
  (32, 'As-Sajdah', 30, 415, 417),
  (33, 'Al-Ahzab', 73, 418, 427),
  (34, 'Saba''', 54, 428, 434),
  (35, 'Fatir', 45, 434, 440),
  (36, 'Ya-Sin', 83, 440, 445),
  (37, 'As-Saffat', 182, 446, 452),
  (38, 'Sad', 88, 453, 458),
  (39, 'Az-Zumar', 75, 458, 467),
  (40, 'Ghafir', 85, 467, 476),
  (41, 'Fussilat', 54, 477, 482),
  (42, 'Ash-Shura', 53, 483, 489),
  (43, 'Az-Zukhruf', 89, 489, 495),
  (44, 'Ad-Dukhan', 59, 496, 498),
  (45, 'Al-Jathiyah', 37, 499, 502),
  (46, 'Al-Ahqaf', 35, 502, 507),
  (47, 'Muhammad', 38, 507, 510),
  (48, 'Al-Fath', 29, 511, 515),
  (49, 'Al-Hujurat', 18, 515, 517),
  (50, 'Qaf', 45, 518, 520),
  (51, 'Adh-Dhariyat', 60, 520, 523),
  (52, 'At-Tur', 49, 523, 525),
  (53, 'An-Najm', 62, 526, 528),
  (54, 'Al-Qamar', 55, 528, 531),
  (55, 'Ar-Rahman', 78, 531, 534),
  (56, 'Al-Waqi''ah', 96, 534, 537),
  (57, 'Al-Hadid', 29, 537, 541),
  (58, 'Al-Mujadila', 22, 542, 545),
  (59, 'Al-Hashr', 24, 545, 549),
  (60, 'Al-Mumtahanah', 13, 549, 551),
  (61, 'As-Saf', 14, 551, 552),
  (62, 'Al-Jumu''ah', 11, 553, 554),
  (63, 'Al-Munafiqun', 11, 554, 555),
  (64, 'At-Taghabun', 18, 556, 557),
  (65, 'At-Talaq', 12, 558, 560),
  (66, 'At-Tahrim', 12, 560, 562),
  (67, 'Al-Mulk', 30, 562, 564),
  (68, 'Al-Qalam', 52, 564, 566),
  (69, 'Al-Haqqah', 52, 566, 568),
  (70, 'Al-Ma''arij', 44, 568, 570),
  (71, 'Nuh', 28, 570, 571),
  (72, 'Al-Jinn', 28, 572, 573),
  (73, 'Al-Muzzammil', 20, 574, 575),
  (74, 'Al-Muddaththir', 56, 575, 577),
  (75, 'Al-Qiyamah', 40, 577, 578),
  (76, 'Al-Insan', 31, 578, 580),
  (77, 'Al-Mursalat', 50, 580, 581),
  (78, 'An-Naba''', 40, 582, 583),
  (79, 'An-Nazi''at', 46, 583, 584),
  (80, '''Abasa', 42, 585, 585),
  (81, 'At-Takwir', 29, 586, 586),
  (82, 'Al-Infitar', 19, 587, 587),
  (83, 'Al-Mutaffifin', 36, 587, 589),
  (84, 'Al-Inshiqaq', 25, 589, 589),
  (85, 'Al-Buruj', 22, 590, 590),
  (86, 'At-Tariq', 17, 591, 591),
  (87, 'Al-A''la', 19, 591, 592),
  (88, 'Al-Ghashiyah', 26, 592, 592),
  (89, 'Al-Fajr', 30, 593, 594),
  (90, 'Al-Balad', 20, 594, 594),
  (91, 'Ash-Shams', 15, 595, 595),
  (92, 'Al-Layl', 21, 595, 596),
  (93, 'Ad-Duha', 11, 596, 596),
  (94, 'Ash-Sharh', 8, 596, 596),
  (95, 'At-Tin', 8, 597, 597),
  (96, 'Al-''Alaq', 19, 597, 597),
  (97, 'Al-Qadr', 5, 598, 598),
  (98, 'Al-Bayyinah', 8, 598, 599),
  (99, 'Az-Zalzalah', 8, 599, 599),
  (100, 'Al-''Adiyat', 11, 599, 600),
  (101, 'Al-Qari''ah', 11, 600, 600),
  (102, 'At-Takathur', 8, 600, 600),
  (103, 'Al-''Asr', 3, 601, 601),
  (104, 'Al-Humazah', 9, 601, 601),
  (105, 'Al-Fil', 5, 601, 601),
  (106, 'Quraysh', 4, 602, 602),
  (107, 'Al-Ma''un', 7, 602, 602),
  (108, 'Al-Kawthar', 3, 602, 602),
  (109, 'Al-Kafirun', 6, 603, 603),
  (110, 'An-Nasr', 3, 603, 603),
  (111, 'Al-Masad', 5, 603, 603),
  (112, 'Al-Ikhlas', 4, 604, 604),
  (113, 'Al-Falaq', 5, 604, 604),
  (114, 'An-Nas', 6, 604, 604)
on conflict (id) do nothing;

-- 3) DŽUZEVI - 30 džuzeva sa rasponom stranica (Medinski 604).
create table if not exists juzs (
  number     int primary key check (number between 1 and 30),
  page_start int not null,
  page_end   int not null
);

insert into juzs (number, page_start, page_end) values
  (1, 1, 21),
  (2, 22, 41),
  (3, 42, 61),
  (4, 62, 81),
  (5, 82, 101),
  (6, 102, 121),
  (7, 122, 141),
  (8, 142, 161),
  (9, 162, 181),
  (10, 182, 201),
  (11, 202, 221),
  (12, 222, 241),
  (13, 242, 261),
  (14, 262, 281),
  (15, 282, 301),
  (16, 302, 321),
  (17, 322, 341),
  (18, 342, 361),
  (19, 362, 381),
  (20, 382, 401),
  (21, 402, 421),
  (22, 422, 441),
  (23, 442, 461),
  (24, 462, 481),
  (25, 482, 501),
  (26, 502, 521),
  (27, 522, 541),
  (28, 542, 561),
  (29, 562, 581),
  (30, 582, 604)
on conflict (number) do nothing;

-- 4) STRANICE - 604 stranice → džuz (popunjeno formulom, bez ručnih redova).
create table if not exists pages (
  number     int primary key check (number between 1 and 604),
  juz_number int not null
);

insert into pages (number, juz_number)
select g,
  case when g <= 21  then 1
       when g >= 582 then 30
       else floor((g - 22) / 20.0)::int + 2
  end
from generate_series(1, 604) as g
on conflict (number) do nothing;

-- 5) AJETI - 6236 ajeta. PUNI seed skripta (text_uthmani, stranica, džuz).
create table if not exists ayahs (
  verse_key    text primary key,            -- npr. "2:255"
  surah_id     int  not null references surahs(id),
  ayah_number  int  not null,
  page_number  int,
  juz_number   int,
  text_uthmani text
);

-- 6) PRIJEVODI - bosanski (Korkut) + engleski. PUNI seed skripta.
create table if not exists translations (
  id         bigserial primary key,
  verse_key  text not null,
  language   text not null check (language in ('bs','en')),
  text       text not null,
  source     text,
  unique (verse_key, language, source)
);

-- 7) LAYOUT REDOVA po izdanju - red na kojem ajet POČINJE (za planer po redovima).
--    PUNI seed skripta (za sada medinski_15 iz QUL qpc-hafs podataka).
create table if not exists mushaf_layout (
  edition_id   text not null references mushaf_editions(id),
  verse_key    text not null,
  page_number  int  not null,
  line_number  int  not null,
  primary key (edition_id, verse_key)
);

-- INDEKSI
create index if not exists idx_ayahs_surah      on ayahs(surah_id);
create index if not exists idx_ayahs_page       on ayahs(page_number);
create index if not exists idx_translations_vk  on translations(verse_key);
create index if not exists idx_layout_page      on mushaf_layout(edition_id, page_number);

-- ROW LEVEL SECURITY - sadržaj Kur'ana je JAVAN za čitanje (isti za sve).
-- Pisanje ide samo preko service_role ključa (seed skripta), koji zaobilazi RLS.
alter table mushaf_editions enable row level security;
alter table surahs          enable row level security;
alter table juzs            enable row level security;
alter table pages           enable row level security;
alter table ayahs           enable row level security;
alter table translations    enable row level security;
alter table mushaf_layout   enable row level security;

create policy "read_editions"     on mushaf_editions for select using (true);
create policy "read_surahs"       on surahs          for select using (true);
create policy "read_juzs"         on juzs            for select using (true);
create policy "read_pages"        on pages           for select using (true);
create policy "read_ayahs"        on ayahs           for select using (true);
create policy "read_translations" on translations    for select using (true);
create policy "read_layout"       on mushaf_layout   for select using (true);

grant select on mushaf_editions, surahs, juzs, pages, ayahs, translations, mushaf_layout
  to anon, authenticated;

-- service_role (seed skripta) mora moći PISATI sadržaj u referentne tabele.
grant all privileges on mushaf_editions, surahs, juzs, pages, ayahs, translations, mushaf_layout
  to service_role;
grant usage, select on all sequences in schema public to service_role;
