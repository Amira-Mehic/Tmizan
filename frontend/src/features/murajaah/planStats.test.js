// ============================================================================
// planStats.js - testovi
// Pokretanje:  node src/features/murajaah/planStats.test.js   (iz frontend/)
// ============================================================================

import { proceniPlan } from "./planStats.js";

let passed = 0, failed = 0;
function assert(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; console.error(`✗ ${name}\n    očekivano: ${e}\n    dobijeno:  ${a}`); }
}

// ── Tempo ima prioritet nad svime ────────────────────────────────────────
{
  const r = proceniPlan({ method: "dzuzevi", ukupnoStr: 100, tempo: { dailyQtyPages: 15, totalDays: 7 }, dzuzArrLen: 5 });
  assert("tempo: koristi tempo.dailyQtyPages/totalDays direktno", r, { dnevnaKolicina: 15, trajanjeDana: 7 });
}

// ── dzuzevi (bez tempa) ───────────────────────────────────────────────────
{
  const r = proceniPlan({ method: "dzuzevi", ukupnoStr: 60, dzuzArrLen: 3 });
  assert("dzuzevi: 60 str / 3 džuza = 20 str/dan, trajanje 3 dana", r, { dnevnaKolicina: 20, trajanjeDana: 3 });
  assert("dzuzevi: bez odabranih džuzeva → null", proceniPlan({ method: "dzuzevi", ukupnoStr: 60, dzuzArrLen: 0 }),
    { dnevnaKolicina: null, trajanjeDana: null });
}

// ── seton - uvijek 8 dijelova ────────────────────────────────────────────
{
  assert("seton: 160 str / 8 = 20 str/dan, 8 dana", proceniPlan({ method: "seton", ukupnoStr: 160 }),
    { dnevnaKolicina: 20, trajanjeDana: 8 });
}

// ── stranice - koristi rotation_state.quota ─────────────────────────────
{
  assert("stranice: quota=10 → trajanje=ceil(95/10)=10", proceniPlan({ method: "stranice", ukupnoStr: 95, rotationQuota: 10 }),
    { dnevnaKolicina: 10, trajanjeDana: 10 });
  assert("stranice: bez quote → null", proceniPlan({ method: "stranice", ukupnoStr: 95 }), { dnevnaKolicina: null, trajanjeDana: null });
}

// ── dinamicna - dinamicnaQuotaDays je dužina ciklusa ────────────────────
{
  assert("dinamicna: 90 str / 30 dana = 3 str/dan", proceniPlan({ method: "dinamicna", ukupnoStr: 90, dinamicnaQuotaDays: 30 }),
    { dnevnaKolicina: 3, trajanjeDana: 30 });
  assert("dinamicna: podrazumijevano 30 dana bez quote", proceniPlan({ method: "dinamicna", ukupnoStr: 60 }),
    { dnevnaKolicina: 2, trajanjeDana: 30 });
}

// ── femi - uvijek sedmica ────────────────────────────────────────────────
{
  assert("femi: 70 str / 7 = 10 str/dan", proceniPlan({ method: "femi", ukupnoStr: 70 }), { dnevnaKolicina: 10, trajanjeDana: 7 });
}

// ── dzuz_sedmica ──────────────────────────────────────────────────────────
{
  assert("dzuz_sedmica: 1 džuz (~20 str) / 7 dana ≈ 3", proceniPlan({ method: "dzuz_sedmica", ukupnoStr: 20, dzuzArrLen: 1 }),
    { dnevnaKolicina: 3, trajanjeDana: 7 });
}

// ── Intervalne metode bez tempa - dijele se na podrazumijevanih 5 str/dan,
//    NE sve odjednom (bag: hafiz+Fibonacci je pravio jedan blok od 604 str.) ─
{
  for (const m of ["fibonacci", "tri_dana", "sedam_dana", "srs"]) {
    assert(`${m}: bez tempa → podrazumijevano 5 str/dan, trajanje=ceil(45/5)=9`,
      proceniPlan({ method: m, ukupnoStr: 45 }), { dnevnaKolicina: 5, trajanjeDana: 9 });
  }
  assert("fibonacci: sa tempom → koristi tempo, ne podrazumijevanih 5",
    proceniPlan({ method: "fibonacci", ukupnoStr: 45, tempo: { dailyQtyPages: 3, totalDays: 15 } }),
    { dnevnaKolicina: 3, trajanjeDana: 15 });
}

// ── novo_staro - nije samostalan raspoređivač, ostaje "sve odjednom" ────
{
  assert("novo_staro: bez tempa → sve odjednom (dnevnaKolicina=ukupnoStr, trajanje=null)",
    proceniPlan({ method: "novo_staro", ukupnoStr: 45 }), { dnevnaKolicina: 45, trajanjeDana: null });
}

// ── Metode bez strukture rasporeda ───────────────────────────────────────
{
  for (const m of ["greske", "slobodan", "mualim"]) {
    assert(`${m}: nema strukturu → null/null`, proceniPlan({ method: m, ukupnoStr: 45 }), { dnevnaKolicina: null, trajanjeDana: null });
  }
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
