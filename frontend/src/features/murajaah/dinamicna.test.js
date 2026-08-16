// ============================================================================
// Dinamična raspodjela - testovi (per-stranica model)
// Pokretanje:  node src/features/murajaah/dinamicna.test.js   (iz frontend/)
// ============================================================================

import { dinamicnaToday, completeDinamicnaCycle, DEFAULT_CYCLE_DAYS } from "./dinamicna.js";

let passed = 0, failed = 0;
function assert(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; console.error(`✗ ${name}\n    očekivano: ${e}\n    dobijeno:  ${a}`); }
}
function assertThrows(name, fn) {
  try { fn(); failed++; console.error(`✗ ${name}\n    očekivan je throw, nije bačen`); }
  catch { passed++; }
}

// Helper: simulira page_progress.last_repeat lookup iz plain objekta.
function lastRepeatFrom(map) {
  return (page) => map[page] || null;
}

// ── Prvi dan: kvota = ceil(ukupno / dužina ciklusa) ─────────────────────────
{
  const pages = Array.from({ length: 30 }, (_, i) => i + 1); // 30 str, ciklus 30 dana
  const today = dinamicnaToday(pages, {}, lastRepeatFrom({}), "2026-01-01");
  assert("prvi dan: 30 str / 30 dana = 1 dnevno", today.dnevnaKvota, 1);
  assert("prvi dan: prva stranica je 1", today.pages, [1]);
  assert("prvi dan: cycleStart se postavlja na danas", today.cycleStart, "2026-01-01");
  assert("prvi dan: default dužina ciklusa = 30", DEFAULT_CYCLE_DAYS, 30);
}

// ── Manji broj stranica nego dana ciklusa → i dalje bar 1 dnevno ────────────
{
  const pages = [10, 20, 30];
  const today = dinamicnaToday(pages, {}, lastRepeatFrom({}), "2026-01-01");
  assert("malo stranica: minimalna kvota je 1", today.dnevnaKvota, 1);
  assert("malo stranica: 3 str / 30 dana → 1 dnevno", today.pages, [10]);
}

// ── Auto-rebalans: propušteni dani → kvota raste ────────────────────────────
{
  const pages = Array.from({ length: 30 }, (_, i) => i + 1);
  // prvi dan odrađen kako treba (stranica 1 dobija last_repeat = 2026-01-01)
  const lastRepeat1 = lastRepeatFrom({ 1: "2026-01-01" });
  const params1 = completeDinamicnaCycle(pages, { cycleStart: "2026-01-01" }, lastRepeat1, "2026-01-01", [1]);
  assert("rebalans: cycleStart ostaje (ciklus nije završen)", params1.cycleStart, "2026-01-01");
  assert("rebalans: cyclesDone se ne mijenja", params1.cyclesDone, 0);

  // korisnik preskoči 4 dana - sad je 5. dan ciklusa, ostalo 29 str / 25 dana
  const today2 = dinamicnaToday(pages, { cycleStart: params1.cycleStart }, lastRepeat1, "2026-01-06");
  assert("rebalans: preostalo 29 stranica", today2.remaining, 29);
  assert("rebalans: nakon preskoka kvota raste", today2.dnevnaKvota, Math.ceil(29 / 25));
}

// ── Rani dovršetak (uradio više) → kvota se smanjuje ────────────────────────
{
  const pages = Array.from({ length: 30 }, (_, i) => i + 1);
  // stanje u kojem je 25 od 30 stranica već odrađeno (last_repeat na dan cikla)
  const done = {};
  for (let i = 1; i <= 25; i++) done[i] = "2026-01-01";
  const today = dinamicnaToday(pages, { cycleStart: "2026-01-01" }, lastRepeatFrom(done), "2026-01-06");
  assert("rani dovršetak: 5 str ostalo / 25 dana ostalo → 1 dnevno", today.dnevnaKvota, 1);
  assert("rani dovršetak: preostale stranice su tačne", today.remaining, 5);
}

// ── Kraj ciklusa: sve odrađeno → wrap i cyclesDone ──────────────────────────
{
  const pages = [1, 2, 3];
  const done = { 1: "2026-01-01", 2: "2026-01-01" }; // 3 je zadnja preostala
  const today = dinamicnaToday(pages, { cycleStart: "2026-01-01" }, lastRepeatFrom(done), "2026-01-01");
  assert("kraj ciklusa: zadnja preostala stranica", today.pages, [3]);

  const params = completeDinamicnaCycle(pages, { cycleStart: "2026-01-01", cyclesDone: 0 }, lastRepeatFrom(done), "2026-01-01", [3]);
  assert("kraj ciklusa: novi ciklus počinje danas (wrap)", params.cycleStart, "2026-01-01");
  assert("kraj ciklusa: cyclesDone raste za 1", params.cyclesDone, 1);
}

// ── Sve odrađeno u ciklusu → "danas" nema šta prikazati ─────────────────────
{
  const pages = [1, 2];
  const done = { 1: "2026-01-01", 2: "2026-01-01" };
  const today = dinamicnaToday(pages, { cycleStart: "2026-01-01" }, lastRepeatFrom(done), "2026-01-02");
  assert("sve odrađeno: nema stranica za danas", today.pages, []);
  assert("sve odrađeno: dnevnaKvota 0", today.dnevnaKvota, 0);
}

// ── Prilagođena dužina ciklusa ───────────────────────────────────────────────
{
  const pages = Array.from({ length: 10 }, (_, i) => i + 1);
  const today = dinamicnaToday(pages, { cycleLengthDays: 10 }, lastRepeatFrom({}), "2026-01-01");
  assert("prilagođen ciklus: 10 str / 10 dana = 1 dnevno", today.dnevnaKvota, 1);

  assertThrows("nevalidna dužina ciklusa baca grešku", () => dinamicnaToday(pages, { cycleLengthDays: 0 }, lastRepeatFrom({}), "2026-01-01"));
  assertThrows("prazan niz stranica baca grešku", () => dinamicnaToday([], {}, lastRepeatFrom({}), "2026-01-01"));
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
