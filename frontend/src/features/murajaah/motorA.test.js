// ============================================================================
// motorA.js - testovi
// Pokretanje:  node src/features/murajaah/motorA.test.js   (iz frontend/)
// ============================================================================

import { partitionPages, seedCycle, dueGroups, duePages, completePages, flattenMotorAToday } from "./motorA.js";

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

// ── partitionPages ────────────────────────────────────────────────────────
{
  assert("partition: 16 stranica na 8 dijelova (po 2)", partitionPages(Array.from({length:16},(_,i)=>i+1), 8).map(c=>c.length),
    [2,2,2,2,2,2,2,2]);
  assert("partition: 10 stranica na 3 dijela (raspodjela ostatka)", partitionPages(Array.from({length:10},(_,i)=>i+1), 3).map(c=>c.length),
    [4,3,3]);
  assert("partition: manje stranica nego dijelova", partitionPages([1,2], 5).length, 2);
  assertThrows("partition: 0 dijelova baca grešku", () => partitionPages([1,2,3], 0));
}

// ── seedCycle - Sistem džuzeva (3 "džuza" simulirano kao grupe) ───────────
{
  const units = [[1,2,3], [4,5], [6,7,8,9]];
  const rows = seedCycle(units, { startDate: "2026-01-01" });
  assert("seed: sve stranice prisutne", rows.length, 9);
  assert("seed: grupa 0 dobija startDate", rows.filter(r=>[1,2,3].includes(r.page)).map(r=>r.sljedeceP), ["2026-01-01","2026-01-01","2026-01-01"]);
  assert("seed: grupa 1 dobija startDate+1", rows.filter(r=>[4,5].includes(r.page)).map(r=>r.sljedeceP), ["2026-01-02","2026-01-02"]);
  assert("seed: grupa 2 dobija startDate+2", rows.filter(r=>[6,7,8,9].includes(r.page)).map(r=>r.sljedeceP), ["2026-01-03","2026-01-03","2026-01-03","2026-01-03"]);
  assertThrows("seed: nema jedinica baca grešku", () => seedCycle([], { startDate: "2026-01-01" }));
}

// ── dueGroups - grupisano po (lažnom) "džuzu" = Math.ceil(page/3) ─────────
{
  const groupOf = (p) => Math.ceil(p / 3);
  const states = [
    { page: 1, sljedeceP: "2026-01-01" }, { page: 2, sljedeceP: "2026-01-01" }, { page: 3, sljedeceP: "2026-01-01" },
    { page: 4, sljedeceP: "2026-01-05" }, { page: 5, sljedeceP: "2026-01-05" },
    { page: 6, sljedeceP: null },
  ];
  const due = dueGroups(states, "2026-01-01", groupOf);
  assert("dueGroups: samo dospjela grupa se vraća", [...due.keys()], [1]);
  assert("dueGroups: stranice grupe su sortirane", due.get(1), [1,2,3]);
  assert("dueGroups: grupa bez sljedeceP se ne vraća nikad", due.has(2), false);

  const dueLater = dueGroups(states, "2026-01-05", groupOf);
  assert("dueGroups: zakašnjele grupe se i dalje vraćaju (nakupljaju se)", [...dueLater.keys()].sort(), [1,2]);
}

// ── duePages - bez grupisanja (Po stranicama) ─────────────────────────────
{
  const states = [
    { page: 5, sljedeceP: "2026-02-01" }, { page: 1, sljedeceP: "2026-02-01" },
    { page: 3, sljedeceP: "2026-02-10" }, { page: 2, sljedeceP: null },
  ];
  assert("duePages: sortirano, isključuje null i buduće", duePages(states, "2026-02-01"), [1, 5]);
  assert("duePages: zakašnjele uključene", duePages(states, "2026-02-10"), [1, 3, 5]);
}

// ── completePages ──────────────────────────────────────────────────────────
{
  const states = [
    { page: 1, sljedeceP: "2026-01-01" }, { page: 2, sljedeceP: "2026-01-01" }, { page: 3, sljedeceP: "2026-01-05" },
  ];
  const next = completePages(states, [1, 2], "2026-01-01", 30);
  assert("complete: odrađene stranice dobijaju +ciklus dana", next.filter(s=>[1,2].includes(s.page)).map(s=>s.sljedeceP), ["2026-01-31","2026-01-31"]);
  assert("complete: neodrađena stranica ostaje netaknuta", next.find(s=>s.page===3).sljedeceP, "2026-01-05");
  assertThrows("complete: ciklus 0 baca grešku", () => completePages(states, [1], "2026-01-01", 0));
}

// ── flattenMotorAToday ────────────────────────────────────────────────────
{
  assert("flatten: null rezultat → prazan niz", flattenMotorAToday(null), []);
  assert("flatten: dzuzevi/seton/stranice/dinamicna koriste .pages",
    flattenMotorAToday({ kind: "stranice", pages: [3, 1] }),
    [{ ref: 3, refType: "page", kind: "stranice" }, { ref: 1, refType: "page", kind: "stranice" }]);
  assert("flatten: femi/dzuz_sedmicno koriste .planned",
    flattenMotorAToday({ kind: "femi", planned: [7] }),
    [{ ref: 7, refType: "page", kind: "femi" }]);
  assert("flatten: nema ni .pages ni .planned → prazan niz", flattenMotorAToday({ kind: "x" }), []);
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
