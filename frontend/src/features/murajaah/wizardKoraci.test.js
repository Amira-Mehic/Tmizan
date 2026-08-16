// ============================================================================
// wizardKoraci.js - testovi
// Pokretanje:  node src/features/murajaah/wizardKoraci.test.js   (iz frontend/)
// ============================================================================

import { dostupneJedinice, provjeriRealnostTempa, strogostParametri, vidljiviKoraci } from "./wizardKoraci.js";

let passed = 0, failed = 0;
function assert(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; console.error(`✗ ${name}\n    očekivano: ${e}\n    dobijeno:  ${a}`); }
}

// ── dostupneJedinice ─────────────────────────────────────────────────────
assert("jedinice: N1 → ajet/red/sura", dostupneJedinice("N1"), ["ajet", "red", "sura"]);
assert("jedinice: N2 → stranica/sura/red", dostupneJedinice("N2"), ["stranica", "sura", "red"]);
assert("jedinice: N5 → dzuz/stranica", dostupneJedinice("N5"), ["dzuz", "stranica"]);
assert("jedinice: N0 → prazno", dostupneJedinice("N0"), []);

// ── provjeriRealnostTempa ────────────────────────────────────────────────
assert("tempo: normalan raspon → bez upozorenja", provjeriRealnostTempa({ ciklusDana: 20, dailyQtyPages: 15 }), []);
assert("tempo: ciklus < 3 dana → upozorenje", provjeriRealnostTempa({ ciklusDana: 2, dailyQtyPages: 100 }).map((u) => u.kod), ["prekratak_ciklus", "prevelik_tempo"]);
assert("tempo: ciklus > 40 dana → upozorenje", provjeriRealnostTempa({ ciklusDana: 45, dailyQtyPages: 13 }).map((u) => u.kod), ["predug_ciklus"]);
assert("tempo: preko 40 str/dan → upozorenje", provjeriRealnostTempa({ ciklusDana: 15, dailyQtyPages: 41 }).map((u) => u.kod), ["prevelik_tempo"]);

// ── strogostParametri ────────────────────────────────────────────────────
assert("strogost: blago", strogostParametri("blago"), { maxDnevno: 2, izlazakUzastopno: 2 });
assert("strogost: normalno (default)", strogostParametri("nepoznato"), { maxDnevno: 3, izlazakUzastopno: 2 });
assert("strogost: strogo", strogostParametri("strogo"), { maxDnevno: 5, izlazakUzastopno: 3 });

// ── vidljiviKoraci ───────────────────────────────────────────────────────
assert("koraci: N1 preskače 2,6,7", vidljiviKoraci("N1"), [1, 3, 4, 5, 8]);
assert("koraci: N2 svi koraci", vidljiviKoraci("N2"), [1, 2, 3, 4, 5, 6, 7, 8]);
assert("koraci: N5 svi koraci", vidljiviKoraci("N5"), [1, 2, 3, 4, 5, 6, 7, 8]);

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
