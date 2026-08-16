// ============================================================================
// Murajaa - Testovi za slabe ajete (samopreslušavanje)
//
// Korisnik testira SAMO ajete koje slabo zna (po greškama, niskoj sigurnosti
// ili ručnoj oznaci). Test koristi Most (Bridge) prikaz: prethodni ajet,
// prazno mjesto, sljedeći ajet. Rezultati i historija testova su vidljivi
// SAMO učeniku (privatno - RLS u bazi).
//
// Označavanje riječi s greškom: uz svaki ajet se može zabilježiti niz
// indeksa riječi gdje je greška (0-bazirano po arapskom tekstu) - UI ih
// oboji drugom bojom. Pohrana je mala (JSON niz brojeva po ajetu).
// ============================================================================

import { makeBridge } from "./pohrana.js";

// ── Odabir slabih ajeta ─────────────────────────────────────────────────────
// verseStates: [{ verseKey, errors, confidence (0–5), manualFlag }]
// Kriterij "slab": greške > 0 ILI sigurnost ≤ 2 ILI ručna oznaka.
export function selectWeakVerses(verseStates, { maxCount = 20 } = {}) {
  return verseStates
    .filter((v) => (v.errors || 0) > 0 || (v.confidence ?? 5) <= 2 || v.manualFlag)
    .sort((a, b) => {
      // najslabiji prvi: više grešaka, pa niža sigurnost
      const diff = (b.errors || 0) - (a.errors || 0);
      return diff !== 0 ? diff : (a.confidence ?? 5) - (b.confidence ?? 5);
    })
    .slice(0, maxCount);
}

// ── Generisanje testa ───────────────────────────────────────────────────────
// weakVerses: rezultat selectWeakVerses
// orderedKeys: puni redoslijed ajeta (za Most kontekst)
export function generateTest(weakVerses, orderedKeys, { shuffle = true } = {}) {
  if (!weakVerses?.length) throw new Error("Nema slabih ajeta za testiranje");

  let items = weakVerses.map((v) => ({
    verseKey: v.verseKey,
    bridge: makeBridge(v.verseKey, orderedKeys),
    result: null,           // null | "tacno" | "netacno"
    errorWordIndices: [],   // indeksi riječi gdje je greška (za bojenje)
    note: "",
  }));

  if (shuffle) items = shuffleArray(items);

  return {
    createdAt: new Date().toISOString(),
    items,
    finished: false,
  };
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Odgovor na jedno pitanje testa ──────────────────────────────────────────
export function answerItem(test, verseKey, { correct, errorWordIndices = [], note = "" }) {
  const items = test.items.map((it) =>
    it.verseKey === verseKey
      ? { ...it, result: correct ? "tacno" : "netacno", errorWordIndices, note }
      : it
  );
  const finished = items.every((it) => it.result !== null);
  return { ...test, items, finished };
}

// ── Rezultat testa ──────────────────────────────────────────────────────────
export function testResult(test) {
  const answered = test.items.filter((it) => it.result !== null);
  const tacno = answered.filter((it) => it.result === "tacno").length;
  const netacno = answered.length - tacno;
  return {
    ukupno: test.items.length,
    odgovoreno: answered.length,
    tacno,
    netacno,
    percent: answered.length ? Math.round((tacno / answered.length) * 100) : 0,
    // ajeti koji i dalje ne idu - kandidati za sljedeći test i za murajaa pad
    zaPonovo: answered.filter((it) => it.result === "netacno").map((it) => it.verseKey),
  };
}

// ── Historija testova: trend po ajetu ───────────────────────────────────────
// history: [{ createdAt, items: [{verseKey, result}] }]
export function verseTrend(history, verseKey) {
  const results = [];
  for (const t of history) {
    const item = t.items.find((i) => i.verseKey === verseKey);
    if (item && item.result) results.push({ date: t.createdAt, result: item.result });
  }
  const zadnje2 = results.slice(-2);
  const popravlja = zadnje2.length >= 2 && zadnje2.every((r) => r.result === "tacno");
  return { results, popravljaSe: popravlja, ukupnoTestiran: results.length };
}

// ── Označavanje riječi s greškom (helper za UI bojenje) ─────────────────────
// arabicText: puni tekst ajeta; indices: [1, 4] → te riječi se boje drugačije.
// Vraća segmente: [{ word, isError }] - UI ih samo mapira u <span>.
export function splitWithErrors(arabicText, errorWordIndices = []) {
  const set = new Set(errorWordIndices);
  return arabicText
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => ({ word, index: i, isError: set.has(i) }));
}
