// ============================================================================
// Mjesečna projekcija (monthlyForecast.js) - testovi
// Pokretanje:  node src/features/murajaah/monthlyForecast.test.js   (iz frontend/)
//
// Nakon prelaska Motora A na model po stranici (motorA.js, dinamicna.js,
// femi.js), testovi rade nad oblikom stanja koji monthlyForecast.js stvarno
// prima od rotationService.js: { type, items, quota/parts, pageProgress: Map }.
// ============================================================================

import {
  forecastRotation, forecastDinamicna, forecastFemiWeekly, forecastIntervalBlocks,
  forecastReviewPlan,
} from "./monthlyForecast.js";
import { createBlock, applyReview } from "./engine.js";

let passed = 0, failed = 0;
function assert(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; console.error(`✗ ${name}\n    očekivano: ${e}\n    dobijeno:  ${a}`); }
}

// ── SISTEM DŽUZEVA - ciklus se vrti kroz 3 džuza (1, 5, 15), po 1 dan svaki ──
{
  const state = { type: "dzuzevi", items: [1, 5, 15], pageProgress: new Map() };
  const fc = forecastRotation(state, { days: 5, startDate: "2026-01-01" });

  assert("dzuzevi forecast: redoslijed džuzeva (ciklus od 3)", fc.map((d) => d.data.juz), [1, 5, 15, 1, 5]);
  assert("dzuzevi forecast: datumi rastu dan po dan", fc.map((d) => d.date),
    ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"]);
  assert("dzuzevi forecast: ciklus se vrti (dan 4 = dan 1)", fc[3].data.juz, fc[0].data.juz);
}

// ── DNEVNA KVOTA STRANICA - 10 str., kvota 3/dan → ciklus od 4 dana ────────
{
  const state = { type: "stranice", items: Array.from({ length: 10 }, (_, i) => i + 1), quota: 3, pageProgress: new Map() };
  const fc = forecastRotation(state, { days: 5, startDate: "2026-02-01" });

  assert("stranice forecast: stranice po danu (ciklus od 4 dana)", fc.map((d) => d.data.pages),
    [[1, 2, 3], [4, 5, 6], [7, 8], [9, 10], [1, 2, 3]]);
}

// ── ŠETONOVA - 16 str., 8 dijelova → ciklus od 8 dana ──────────────────────
{
  const state = { type: "seton", items: Array.from({ length: 16 }, (_, i) => i + 1), parts: 8, pageProgress: new Map() };
  const fc = forecastRotation(state, { days: 10, startDate: "2026-03-01" });

  assert("seton forecast: koji je dio na redu svaki dan", fc.map((d) => d.data.dio), [1, 2, 3, 4, 5, 6, 7, 8, 1, 2]);
}

// ── DINAMIČNA RASPODJELA - 10 str., ciklus 6 dana → auto-rebalans ─────────
{
  const state = { items: Array.from({ length: 10 }, (_, i) => i + 1), quota: 6, cycleStart: null, cyclesDone: 0, pageProgress: new Map() };
  const fc = forecastDinamicna(state, { days: 6, startDate: "2026-01-01" });

  assert("dinamicna forecast: dnevna kvota po danu (rebalans pred kraj)", fc.map((d) => d.data.dnevnaKvota), [2, 2, 2, 2, 1, 1]);
  assert("dinamicna forecast: stranice po danu", fc.map((d) => d.data.pages),
    [[1, 2], [3, 4], [5, 6], [7, 8], [9], [10]]);
}

// ── FEMI BI-ŠEVK - 14 str., ciklus fiksno 7 dana, 10 dana prozora (preko granice sedmice) ──
{
  const femiRow = { method: "femi", items: Array.from({ length: 14 }, (_, i) => i + 1), cycleStart: null, cyclesDone: 0, pageProgress: new Map() };
  const fc = forecastFemiWeekly(femiRow, { days: 10, startDate: "2026-01-05" });

  assert("femi forecast: planirane stranice po danu (10 dana)", fc.map((d) => d.data.planned),
    [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [1, 2], [3, 4], [5, 6]]);
  assert("femi forecast: 8. dan počinje nova sedmica (isti raspored kao dan 1)", fc[7].data.planned, fc[0].data.planned);
}

// ── DŽUZ KROZ SEDMICU - kružno kroz naučene džuzeve (2 → 4), jedan po sedmici ──
{
  const femiRow = { method: "dzuz_sedmicno", items: [2, 4], juzIndex: 0, cycleStart: null, cyclesDone: 0, pageProgress: new Map() };
  const fc = forecastFemiWeekly(femiRow, { days: 10, startDate: "2026-01-05" });

  assert("dzuz_sedmicno forecast: tačan broj dana", fc.length, 10);
  assert("dzuz_sedmicno forecast: dan 1 = džuz 2 (prvi naučeni)", fc[0].data.juz, 2);
  // Nakon 7 dana (cijeli džuz 2 odrađen) prelazi se na sljedeći naučeni džuz (kružno: 2 → 4)
  assert("dzuz_sedmicno forecast: nakon sedmice ide na sljedeći džuz (4)", fc[7].data.juz, 4);
}

// ── INTERVALNE METODE (Tri dana) - optimistična projekcija (sve "tačno") ───
// Motor B radi u satima nad punim ISO timestampom (engine.js) -
// nextReviewOn je puni timestamp, ne "YYYY-MM-DD"; forecastIntervalBlocks
// grupiše po kalendarskom danu (slice 0,10).
{
  const block = createBlock({ unitType: "stranica", items: [1, 2, 3], label: "test", learnedOn: "2026-01-01", methodId: "tri_dana" });
  assert("blok: prvo ponavljanje sutra", block.nextReviewOn.slice(0, 10), "2026-01-02");

  const fc = forecastIntervalBlocks([block], { days: 15, startDate: "2026-01-01" });
  const hitDates = fc.filter((d) => d.data.length > 0).map((d) => d.date);

  let cur = block;
  const expected = [];
  const horizon = "2026-01-15";
  while (cur.nextReviewOn && cur.nextReviewOn.slice(0, 10) <= horizon) {
    expected.push(cur.nextReviewOn.slice(0, 10));
    cur = applyReview(cur, { result: "correct", at: cur.nextReviewOn });
  }
  assert("tri_dana forecast: datumi ponavljanja unutar 15 dana", hitDates, expected);
}

// ── INTERVALNE METODE - više blokova istog dana se grupišu ─────────────────
{
  const b1 = createBlock({ unitType: "stranica", items: [1], label: "A", learnedOn: "2026-01-01", methodId: "fibonacci" });
  const b2 = createBlock({ unitType: "stranica", items: [2], label: "B", learnedOn: "2026-01-01", methodId: "fibonacci" });
  const fc = forecastIntervalBlocks([b1, b2], { days: 3, startDate: "2026-01-01" });
  assert("fibonacci forecast: dva bloka istog dana grupisana", fc[1].data.length, 2);
  assert("fibonacci forecast: dan 0 (danas) nema ništa na redu", fc[0].data.length, 0);
}

// ── DISPEČER forecastReviewPlan ─────────────────────────────────────────────
{
  const rotState = { type: "stranice", items: [1, 2, 3, 4, 5], quota: 2, pageProgress: new Map() };
  const fc = forecastReviewPlan("stranice", { rotationState: rotState }, { days: 3, startDate: "2026-01-01" });
  assert("dispečer: stranice vraća 3 dana", fc.length, 3);
  assert("dispečer: stranice ima ispravan kind", fc[0].kind, "stranice");

  assert("dispečer: nedostaje izvor → null", forecastReviewPlan("stranice", {}, { days: 3, startDate: "2026-01-01" }), null);

  // Metode bez fiksnog rasporeda uvijek vraćaju null, bez obzira na izvore
  for (const m of ["greske", "novo_staro", "nivo", "slobodan", "mualim"]) {
    assert(`dispečer: ${m} nema raspored (null)`,
      forecastReviewPlan(m, { rotationState: rotState, femiRow: {}, reviewBlocks: [] }, { days: 3, startDate: "2026-01-01" }),
      null);
  }

  const dinState = { items: [1, 2, 3], quota: 30, cycleStart: null, cyclesDone: 0, pageProgress: new Map() };
  assert("dispečer: dinamicna vraća 3 dana", forecastReviewPlan("dinamicna", { rotationState: dinState }, { days: 3, startDate: "2026-01-01" }).length, 3);

  const femiRow = { method: "femi", items: [1, 2, 3, 4, 5, 6, 7], cycleStart: null, cyclesDone: 0, pageProgress: new Map() };
  assert("dispečer: femi vraća 3 dana", forecastReviewPlan("femi", { femiRow }, { days: 3, startDate: "2026-01-05" }).length, 3);

  const block = createBlock({ unitType: "stranica", items: [1], label: "", learnedOn: "2026-01-01", methodId: "srs" });
  assert("dispečer: srs vraća 3 dana", forecastReviewPlan("srs", { reviewBlocks: [block] }, { days: 3, startDate: "2026-01-01" }).length, 3);
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
