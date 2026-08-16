// ============================================================================
// Tmizan - seed_quran.mjs  (Tanzil verzija)
// Puni VELIKE referentne tabele iz lokalnih TANZIL fajlova:
//   • ayahs         - text_uthmani + page_number + juz_number (za svaki ajet)
//   • translations  - bosanski (Korkut) + engleski (opcionalno)
//   • surahs.name_ar - arapski nazivi sura (iz metadata)
//
// Male tabele (izdanja, sure, džuzevi, stranice) su već popunjene migracijom
// 0006_quran_content.sql - ovu skriptu pokreni TEK nakon te migracije.
//
// ── IZVOR PODATAKA: Tanzil Project (https://tanzil.net) ──────────────────────
//   Kur'anski tekst je licenciran pod Creative Commons Attribution 3.0.
//   Uslovi: tekst se ne smije mijenjati, izvor (Tanzil Project) mora biti
//   naznačen, i mora postojati link na tanzil.net. Ova napomena zadovoljava
//   uslov atribucije za izvedene fajlove.
//
// ── POTREBNI FAJLOVI (spusti u ./data/) ─────────────────────────────────────
//   1) quran-uthmani.txt  - Tanzil → Download → Uthmani, "Text (with aya numbers)"
//                           format linija:  sura|ajet|tekst   (npr. 2|255|ٱللَّهُ...)
//   2) bs.korkut.txt      - Tanzil → Translations → Bosnian (Korkut), isti format
//   3) en.sahih.txt       - (opcionalno) Tanzil → Sahih International
//   4) quran-data.xml     - http://tanzil.net/res/text/metadata/quran-data.xml
//
// ── POKRETANJE ──────────────────────────────────────────────────────────────
//   Skripta cita SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY iz .env datoteke:
//
//     cd supabase/seed
//     npm i @supabase/supabase-js
//     node --env-file=.env seed_quran.mjs
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// ── KONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FILES = {
  textUthmani:   "./data/quran-uthmani.txt",
  translationBs: "./data/bs.korkut.txt",
  translationEn: "./data/en.sahih.txt",   // postavi na null da preskočiš
  metadata:      "./data/quran-data.xml",
};

const BATCH = 500;

// ── SETUP ───────────────────────────────────────────────────────────────────
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Nedostaje SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY (env varijable).");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Putanje se računaju relativno na SAMU skriptu (import.meta.dirname), pa "./data/…"
// uvijek znači supabase/seed/data/ - svejedno iz kojeg foldera pokreneš skriptu.
const abs = (p) => path.resolve(import.meta.dirname, p);
const exists = (p) => p && fs.existsSync(abs(p));
const readText = (p) => fs.readFileSync(abs(p), "utf8");

async function upsertInBatches(table, rows, conflict) {
  if (!rows?.length) return;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await db.from(table).upsert(chunk, { onConflict: conflict });
    if (error) { console.error(`\n❌ ${table} [${i}-${i + chunk.length}]:`, error.message); process.exit(1); }
    process.stdout.write(`\r   ${table}: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");
}

// ── PARSERI ─────────────────────────────────────────────────────────────────

// Tanzil pipe format: linije "sura|ajet|tekst". Komentari/licenca (prazne linije
// ili linije bez ovog oblika, npr. "# ...") se automatski preskaču.
function parseTanzilPipe(file) {
  const out = [];
  for (const line of readText(file).split(/\r?\n/)) {
    const m = line.match(/^(\d+)\|(\d+)\|(.*)$/);
    if (!m) continue;
    out.push({ surah: Number(m[1]), ayah: Number(m[2]), text: m[3].trim() });
  }
  return out;
}

// Iz XML elementa izvuci vrijednost atributa (neovisno o redoslijedu atributa).
const attr = (el, name) => {
  const m = el.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
};

// quran-data.xml → granice stranica i džuzeva + arapski nazivi sura.
function parseMetadata(file) {
  const xml = readText(file);
  const pick = (tag) => (xml.match(new RegExp(`<${tag}\\b[^>]*/?>`, "g")) || []);

  const pages = pick("page")
    .map((el) => ({ index: +attr(el, "index"), sura: +attr(el, "sura"), aya: +attr(el, "aya") }))
    .filter((p) => p.index && p.sura && p.aya)
    .sort((a, b) => a.index - b.index);

  const juzs = pick("juz")
    .map((el) => ({ index: +attr(el, "index"), sura: +attr(el, "sura"), aya: +attr(el, "aya") }))
    .filter((j) => j.index && j.sura && j.aya)
    .sort((a, b) => a.index - b.index);

  const suraNames = {};
  for (const el of pick("sura")) {
    const idx = +attr(el, "index");
    const nameAr = attr(el, "name");
    if (idx && nameAr) suraNames[idx] = nameAr;
  }

  return { pages, juzs, suraNames };
}

// Dodijeli svakom ajetu broj stranice/džuza na osnovu granica.
// ayahs su u mushaf-redoslijedu; granica definira PRVI ajet svoje jedinice.
function assignBoundaries(ayahs, boundaries) {
  const pos = new Map();
  ayahs.forEach((a, i) => pos.set(`${a.surah}:${a.ayah}`, i));
  const starts = boundaries
    .map((b) => ({ index: b.index, at: pos.get(`${b.sura}:${b.aya}`) }))
    .filter((b) => b.at != null)
    .sort((a, b) => a.at - b.at);

  const result = new Array(ayahs.length).fill(null);
  for (let k = 0; k < starts.length; k++) {
    const from = starts[k].at;
    const to = k + 1 < starts.length ? starts[k + 1].at : ayahs.length;
    for (let i = from; i < to; i++) result[i] = starts[k].index;
  }
  return result; // result[i] = broj stranice/džuza za ayahs[i]
}

// ── GLAVNI TOK ──────────────────────────────────────────────────────────────
async function main() {
  console.log("→ Seed Kur'anskog sadržaja (Tanzil) u Supabase\n");

  if (!exists(FILES.textUthmani)) {
    console.error(`❌ Nedostaje ${FILES.textUthmani}. Skini Uthmani "Text (with aya numbers)" s Tanzila.`);
    process.exit(1);
  }
  if (!exists(FILES.metadata)) {
    console.error(`❌ Nedostaje ${FILES.metadata}. Skini quran-data.xml s tanzil.net/res/text/metadata/`);
    process.exit(1);
  }

  // 1) Tekst + granice
  const ayahs = parseTanzilPipe(FILES.textUthmani);           // [{surah,ayah,text}]
  const { pages, juzs, suraNames } = parseMetadata(FILES.metadata);
  const pageOf = assignBoundaries(ayahs, pages);
  const juzOf  = assignBoundaries(ayahs, juzs);

  const ayahRows = ayahs.map((a, i) => ({
    verse_key:    `${a.surah}:${a.ayah}`,
    surah_id:     a.surah,
    ayah_number:  a.ayah,
    page_number:  pageOf[i],
    juz_number:   juzOf[i],
    text_uthmani: a.text,
  }));

  console.log(`1) Ajeti (${ayahRows.length}) + stranica/džuz…`);
  await upsertInBatches("ayahs", ayahRows, "verse_key");

  // 2) Arapski nazivi sura → surahs.name_ar
  //    UPDATE (ne upsert): red sure već postoji iz migracije, a kolona "name" je
  //    NOT NULL - upsert bi pokušao INSERT s name=NULL i pao. Ovdje samo dopunimo name_ar.
  const suraRows = Object.entries(suraNames).map(([id, name_ar]) => ({ id: Number(id), name_ar }));
  console.log(`2) Arapski nazivi sura (${suraRows.length})…`);
  for (let i = 0; i < suraRows.length; i++) {
    const { id, name_ar } = suraRows[i];
    const { error } = await db.from("surahs").update({ name_ar }).eq("id", id);
    if (error) { console.error(`\n❌ surahs (id=${id}):`, error.message); process.exit(1); }
    process.stdout.write(`\r   surahs: ${i + 1}/${suraRows.length}`);
  }
  process.stdout.write("\n");

  // 3) Prijevodi
  if (exists(FILES.translationBs)) {
    const rows = parseTanzilPipe(FILES.translationBs).map((r) => ({
      verse_key: `${r.surah}:${r.ayah}`, language: "bs", text: r.text, source: "korkut",
    }));
    console.log(`3) Prijevod bs - Korkut (${rows.length})…`);
    await upsertInBatches("translations", rows, "verse_key,language,source");
  } else {
    console.log("3) Prijevod bs - preskacem (fajl ne postoji).");
  }

  if (exists(FILES.translationEn)) {
    const rows = parseTanzilPipe(FILES.translationEn).map((r) => ({
      verse_key: `${r.surah}:${r.ayah}`, language: "en", text: r.text, source: "sahih",
    }));
    console.log(`4) Prijevod en (${rows.length})…`);
    await upsertInBatches("translations", rows, "verse_key,language,source");
  } else {
    console.log("4) Prijevod en - preskacem (fajl ne postoji).");
  }

  console.log("\n✅ Gotovo. Provjera: select count(*) from ayahs;  → 6236");
  console.log("   (Layout redova za planer je zaseban korak - QUL qpc-hafs, kasnije.)");
}

main().catch((e) => { console.error(e); process.exit(1); });
