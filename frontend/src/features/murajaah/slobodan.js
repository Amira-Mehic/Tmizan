// ============================================================================
// Murajaa - Metoda slobodnog rasporeda
//
// Bez automatike: korisnik sam vodi raspored, aplikacija samo BILJEŽI
// šta je odrađeno i prikazuje statistike. Nema automatskih rasporeda
// ni obavijesti. Može se kombinovati s Muallimovim planom.
// ============================================================================

import { daysBetween } from "./engine.js";

// ── Zabilježi ručno odrađeno ponavljanje ────────────────────────────────────
// entry: { ref, refType: "page"|"verse"|"surah"|"juz", date, errors?, note? }
export function recordEntry(log, entry) {
  if (!entry.ref || !entry.date) throw new Error("Unos mora imati ref i datum");
  return [
    ...log,
    { ref: entry.ref, refType: entry.refType || "page", date: entry.date, errors: entry.errors || 0, note: entry.note || "" },
  ];
}

// ── Statistike iz dnevnika ──────────────────────────────────────────────────
export function stats(log, today) {
  if (!log.length) return { ukupno: 0, poDanu: {}, aktivnihDana: 0, prosjekDnevno: 0, greskeUkupno: 0 };

  const poDanu = {};
  let greske = 0;
  for (const e of log) {
    poDanu[e.date] = (poDanu[e.date] || 0) + 1;
    greske += e.errors;
  }
  const dani = Object.keys(poDanu).sort();
  const span = Math.max(1, daysBetween(dani[0], today) + 1);

  return {
    ukupno: log.length,
    poDanu,
    aktivnihDana: dani.length,
    prosjekDnevno: Math.round((log.length / span) * 10) / 10,
    greskeUkupno: greske,
  };
}

// ── Historija jedne stavke (broj ponavljanja, greške, datumi) ───────────────
export function itemHistory(log, ref) {
  const entries = log.filter((e) => e.ref === ref).sort((a, b) => a.date.localeCompare(b.date));
  return {
    ref,
    brojPonavljanja: entries.length,
    greske: entries.reduce((s, e) => s + e.errors, 0),
    zadnjiPut: entries.at(-1)?.date || null,
    entries,
  };
}
