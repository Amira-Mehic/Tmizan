// ============================================================================
// zaostatak.js - testovi
// Pokretanje:  node src/features/murajaah/zaostatak.test.js   (iz frontend/)
// ============================================================================

import {
  zaostatakStatus, maxNadoknada, danaOdZadnjeg, trebaLaganiPovratakEkran,
  laganiPovratakKvota, MAX_PRIKAZ_STAVKI,
} from "./zaostatak.js";

let passed = 0, failed = 0;
function assert(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; console.error(`✗ ${name}\n    očekivano: ${e}\n    dobijeno:  ${a}`); }
}

// ── zaostatakStatus ──────────────────────────────────────────────────────
assert("zaostatak: pod pragom, nije prekoračen", zaostatakStatus(10, 5).prekoracen, false);
assert("zaostatak: tačno na pragu (3×) nije prekoračenje", zaostatakStatus(15, 5).prekoracen, false);
assert("zaostatak: preko praga (3×+1)", zaostatakStatus(16, 5).prekoracen, true);
assert("zaostatak: nikad ne prikaži preko 200", zaostatakStatus(500, 10).prikaz, MAX_PRIKAZ_STAVKI);
assert("zaostatak: sakriveno = razlika preko 200", zaostatakStatus(250, 10).sakriveno, 50);
assert("zaostatak: ispod 200 → sakriveno 0", zaostatakStatus(60, 10).sakriveno, 0);

// ── maxNadoknada ─────────────────────────────────────────────────────────
assert("nadoknada: 10 kvota → max 15", maxNadoknada(10), 15);
assert("nadoknada: 3 kvota → max 4 (zaokruženo naniže)", maxNadoknada(3), 4);

// ── povratak nakon pauze ─────────────────────────────────────────────────
assert("pauza: 20 dana od zadnjeg", danaOdZadnjeg("2026-07-01", "2026-07-21"), 20);
assert("pauza: >14 dana → lagani povratak ekran", trebaLaganiPovratakEkran("2026-07-01", "2026-07-21"), true);
assert("pauza: 10 dana → nema ekrana", trebaLaganiPovratakEkran("2026-07-11", "2026-07-21"), false);
assert("pauza: bez prethodne posjete → 0 dana", danaOdZadnjeg(null, "2026-07-21"), 0);

assert("lagani povratak: pola kvote (10→5)", laganiPovratakKvota(10), 5);
assert("lagani povratak: pola kvote zaokruženo (5→3)", laganiPovratakKvota(5), 3);

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
