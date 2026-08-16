// ============================================================================
// femi.js - testovi (Femi bi-ševk kao alias Dinamične + Džuz kroz sedmicu)
// Pokretanje:  node src/features/murajaah/femi.test.js   (iz frontend/)
// ============================================================================

import { femiToday, completeFemiWeek, createJuzWeeklyState, currentJuzPages, juzWeeklyToday, completeJuzWeek, DANA_U_SEDMICI } from "./femi.js";
import { getJuzPages } from "../../constants/hifz/helpers.js";

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

function lastRepeatFrom(map) { return (p) => map[p] || null; }

// ── Femi bi-ševk - 14 stranica kroz sedmicu (2/dan) ────────────────────────
{
  const pages = Array.from({ length: 14 }, (_, i) => i + 1);
  const today = femiToday(pages, {}, lastRepeatFrom({}), "2026-01-05");
  assert("femi: 14 str / 7 dana = 2 dnevno", today.dnevnaKvota, 2);
  assert("femi: ciklus je uvijek 7 dana", DANA_U_SEDMICI, 7);
}

// ── Femi: preskočen dan → rebalans na preostale dane sedmice ───────────────
{
  const pages = Array.from({ length: 14 }, (_, i) => i + 1);
  // dan 1 preskočen - 4 dana kasnije, 14 str ostalo / 3 dana ostalo u sedmici
  const today = femiToday(pages, { cycleStart: "2026-01-05" }, lastRepeatFrom({}), "2026-01-08");
  assert("femi: preostalo je i dalje svih 14 (ništa odrađeno)", today.remaining, 14);
  assert("femi: kvota raste kad su dani preskočeni", today.dnevnaKvota, Math.ceil(14 / 4));
}

// ── Femi: sedmica se zatvara isto kao dinamični ciklus ─────────────────────
{
  const pages = [1, 2, 3];
  const done = { 1: "2026-01-05", 2: "2026-01-05" };
  const params = completeFemiWeek(pages, { cycleStart: "2026-01-05", cyclesDone: 0 }, lastRepeatFrom(done), "2026-01-05", [3]);
  assert("femi: sedmica se zatvara kad je sve odrađeno", params.cyclesDone, 1);
  assert("femi: nova sedmica počinje danas", params.cycleStart, "2026-01-05");
}

// ── Džuz kroz sedmicu - bazen je SAMO trenutni džuz ─────────────────────────
{
  const state = createJuzWeeklyState([2, 5, 9]);
  assert("dzuz_sedmicno: džuzevi sortirani", state.juzs, [2, 5, 9]);
  assert("dzuz_sedmicno: kreće od prvog (indeks 0)", state.juzIndex, 0);

  const { juz, pages } = currentJuzPages(state);
  assert("dzuz_sedmicno: trenutni džuz je prvi iz liste", juz, 2);
  assert("dzuz_sedmicno: stranice odgovaraju getJuzPages", pages, getJuzPages(2));

  const today = juzWeeklyToday(state, lastRepeatFrom({}), "2026-01-05");
  assert("dzuz_sedmicno: today uključuje koji je džuz", today.juz, 2);
  assert("dzuz_sedmicno: kvota se računa nad SAMO tim džuzom", today.dnevnaKvota, Math.ceil(pages.length / 7));

  assertThrows("dzuz_sedmicno: prazna lista džuzeva baca grešku", () => createJuzWeeklyState([]));
}

// ── Džuz kroz sedmicu - prelazak na sljedeći džuz kad sedmica završi (wrap) ─
{
  let state = createJuzWeeklyState([2, 5, 9]);
  const { pages } = currentJuzPages(state);
  const done = {};
  for (const p of pages) done[p] = "2026-01-05"; // sve stranice džuza 2 odrađene
  state = completeJuzWeek(state, lastRepeatFrom(done), "2026-01-05", pages);

  assert("wrap: prelazi na sljedeći naučeni džuz", state.juzIndex, 1);
  assert("wrap: novi ciklus počinje danas", state.cycleStart, "2026-01-05");
  assert("wrap: cyclesDone raste", state.cyclesDone, 1);
  assert("wrap: trenutni džuz je sad 5", currentJuzPages(state).juz, 5);
}

// ── Džuz kroz sedmicu - kružno vraćanje na prvi džuz nakon zadnjeg ──────────
{
  let state = { juzs: [2, 5, 9], juzIndex: 2, cycleStart: "2026-01-05", cyclesDone: 2 };
  const { pages } = currentJuzPages(state); // džuz 9
  const done = {};
  for (const p of pages) done[p] = "2026-01-05";
  state = completeJuzWeek(state, lastRepeatFrom(done), "2026-01-05", pages);
  assert("kružno: nakon zadnjeg džuza vraća se na prvi (indeks 0)", state.juzIndex, 0);
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
