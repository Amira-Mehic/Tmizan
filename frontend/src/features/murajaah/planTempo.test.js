// ============================================================================
// planTempo.js - testovi
// Pokretanje:  node src/features/murajaah/planTempo.test.js   (iz frontend/)
// ============================================================================

import { compatibleMethods, computeTempo, suggestedDailyQty, FLEXIBLE_METHODS } from "./planTempo.js";

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

// ── compatibleMethods ────────────────────────────────────────────────────
{
  assert("dzuzevi: uključuje native + fleksibilne", compatibleMethods("dzuzevi"),
    ["dzuzevi", "dzuz_sedmica", ...FLEXIBLE_METHODS]);
  assert("sure: samo fleksibilne (nema native surah-metode)", compatibleMethods("sure"), FLEXIBLE_METHODS);
  assert("stranice: uključuje seton/femi + fleksibilne", compatibleMethods("stranice"),
    ["seton", "femi", ...FLEXIBLE_METHODS]);
  assertThrows("nepoznata jedinica baca grešku", () => compatibleMethods("nepostojece"));
}

// ── computeTempo - mode "broj" ───────────────────────────────────────────
{
  // 1 džuz dnevno ≈ 20.13 str/dan (604/30) → zaokruženo 20; 604/20 = 30.2 → 31 dan
  const r1 = computeTempo({ unit: "dzuzevi", mode: "broj", quantity: 1 });
  assert("broj: 1 džuz/dan → dailyQtyPages", r1.dailyQtyPages, 20);
  assert("broj: 1 džuz/dan → totalDays", r1.totalDays, 31);

  // 2 džuza dnevno → 604/30*2 = 40.27 → 40; 604/40 = 15.1 → 16 dana
  const r2 = computeTempo({ unit: "dzuzevi", mode: "broj", quantity: 2 });
  assert("broj: 2 džuza/dan → dailyQtyPages", r2.dailyQtyPages, 40);
  assert("broj: 2 džuza/dan → totalDays", r2.totalDays, 16);

  // 3 sure dnevno → 604/114*3 = 15.89 → 16; 604/16 = 37.75 → 38 dana
  const r3 = computeTempo({ unit: "sure", mode: "broj", quantity: 3 });
  assert("broj: 3 sure/dan → dailyQtyPages", r3.dailyQtyPages, 16);
  assert("broj: 3 sure/dan → totalDays", r3.totalDays, 38);

  // 15 stranica dnevno (direktno, factor=1) → 604/15 = 40.27 → 41 dan
  const r4 = computeTempo({ unit: "stranice", mode: "broj", quantity: 15 });
  assert("broj: 15 str/dan → dailyQtyPages", r4.dailyQtyPages, 15);
  assert("broj: 15 str/dan → totalDays", r4.totalDays, 41);
}

// ── computeTempo - mode "vrijeme" ────────────────────────────────────────
{
  // Za 30 dana → 604/30 = 20.13 → 21 str/dan
  const r1 = computeTempo({ unit: "stranice", mode: "vrijeme", quantity: 30 });
  assert("vrijeme: 30 dana → dailyQtyPages", r1.dailyQtyPages, 21);
  assert("vrijeme: 30 dana → totalDays", r1.totalDays, 30);

  // Jedinica ne mijenja rezultat u "vrijeme" modu (uvijek cijelih 604 str)
  const r2 = computeTempo({ unit: "dzuzevi", mode: "vrijeme", quantity: 30 });
  assert("vrijeme: jedinica ne utiče na dailyQtyPages", r2.dailyQtyPages, r1.dailyQtyPages);

  // Za 1 dan → sve odjednom (604 str)
  const r3 = computeTempo({ unit: "stranice", mode: "vrijeme", quantity: 1 });
  assert("vrijeme: 1 dan → sve stranice odjednom", r3.dailyQtyPages, 604);
}

// ── Greške ────────────────────────────────────────────────────────────────
{
  assertThrows("computeTempo: nepoznata jedinica", () => computeTempo({ unit: "x", mode: "broj", quantity: 1 }));
  assertThrows("computeTempo: nepoznat način", () => computeTempo({ unit: "stranice", mode: "x", quantity: 1 }));
  assertThrows("computeTempo: količina 0", () => computeTempo({ unit: "stranice", mode: "broj", quantity: 0 }));
  assertThrows("computeTempo: negativna količina", () => computeTempo({ unit: "stranice", mode: "vrijeme", quantity: -5 }));
}

// ── suggestedDailyQty ─────────────────────────────────────────────────────
{
  assert("predloženo: džuzevi (30/30)", suggestedDailyQty("dzuzevi"), 1);
  assert("predloženo: sure (114/30≈3.8→4)", suggestedDailyQty("sure"), 4);
  assert("predloženo: stranice (604/30≈20.1→20)", suggestedDailyQty("stranice"), 20);
  assertThrows("predloženo: nepoznata jedinica", () => suggestedDailyQty("x"));
}

// ── computeTempo / suggestedDailyQty - sa opsegom (džuzevi, sure, ručni unos):
//    tempo radi za bilo koji opseg, ne samo za cijeli Kur'an ────────────────
{
  // opseg od 3 džuza (~60 stranica): 1 džuz/dan → ~20 str/dan, ~3 dana
  const r1 = computeTempo({ unit: "dzuzevi", mode: "broj", quantity: 1, totalPagesInScope: 60 });
  assert("opseg: 3 džuza, 1 džuz/dan → dailyQtyPages", r1.dailyQtyPages, 20);
  assert("opseg: 3 džuza, 1 džuz/dan → totalDays", r1.totalDays, 3);

  // opseg 60 stranica, "vrijeme" mod, 6 dana → 10 str/dan
  const r2 = computeTempo({ unit: "stranice", mode: "vrijeme", quantity: 6, totalPagesInScope: 60 });
  assert("opseg: 60 str za 6 dana → dailyQtyPages", r2.dailyQtyPages, 10);

  // bez totalPagesInScope → ponaša se identično starom (cijeli Kur'an)
  const stari = computeTempo({ unit: "dzuzevi", mode: "broj", quantity: 1 });
  const noviBezOpsega = computeTempo({ unit: "dzuzevi", mode: "broj", quantity: 1, totalPagesInScope: 604 });
  assert("opseg: bez argumenta = isto kao eksplicitno 604", noviBezOpsega, stari);

  // suggestedDailyQty sa malim opsegom (60 str ≈ 3 džuza) → 3/30 → min 1
  assert("predloženo: mali opseg (60 str, dzuzevi) → min 1", suggestedDailyQty("dzuzevi", 60), 1);
  // veliki opseg identičan 604 → isto kao podrazumijevano
  assert("predloženo: opseg=604 isto kao bez argumenta", suggestedDailyQty("sure", 604), suggestedDailyQty("sure"));
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
