// ============================================================================
// Testovi: testovi slabih ajeta, mjesečni plan
// Pokretanje:  node src/features/murajaah/novo.test.js   (iz frontend/)
//
// Femi bi-ševk i Džuz sedmično se testiraju u femi.test.js, jer su tanak
// omotač oko dinamicna.js.
// ============================================================================

import { selectWeakVerses, generateTest, answerItem, testResult, verseTrend, splitWithErrors } from "./testovi.js";
import { monthDates, generateMonthlyPlan, updateDay, toggleRestDay, printableModel, monthStats } from "../talim/mjesecniPlan.js";
import { scopeToPages } from "../talim/mushaf.js";

let passed = 0, failed = 0;
function assert(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; console.error(`✗ ${name}\n    očekivano: ${e}\n    dobijeno:  ${a}`); }
}

// ── TESTOVI SLABIH AJETA ────────────────────────────────────────────────────
{
  const verses = [
    { verseKey: "2:1", errors: 0, confidence: 5 },
    { verseKey: "2:2", errors: 3, confidence: 2 },
    { verseKey: "2:3", errors: 1, confidence: 4 },
    { verseKey: "2:4", errors: 0, confidence: 1 },
    { verseKey: "2:5", errors: 0, confidence: 5, manualFlag: true },
  ];
  const weak = selectWeakVerses(verses);
  assert("test: slabi = greške, niska sigurnost, ručna oznaka", weak.map((v) => v.verseKey), ["2:2", "2:3", "2:4", "2:5"]);
  assert("test: najslabiji prvi (3 greške)", weak[0].verseKey, "2:2");

  const ordered = ["2:1", "2:2", "2:3", "2:4", "2:5"];
  let test = generateTest(weak, ordered, { shuffle: false });
  assert("test: 4 pitanja", test.items.length, 4);
  assert("test: Most za 2:2 (prethodni 2:1, sljedeći 2:3)", [test.items[0].bridge.prethodni, test.items[0].bridge.sljedeci], ["2:1", "2:3"]);

  test = answerItem(test, "2:2", { correct: false, errorWordIndices: [1, 3], note: "zamjena riječi" });
  test = answerItem(test, "2:3", { correct: true });
  test = answerItem(test, "2:4", { correct: true });
  assert("test: nije gotov dok sva pitanja nisu odgovorena", test.finished, false);
  test = answerItem(test, "2:5", { correct: true });
  assert("test: gotov", test.finished, true);

  const res = testResult(test);
  assert("test: rezultat 3/4 = 75%", [res.tacno, res.netacno, res.percent], [3, 1, 75]);
  assert("test: 2:2 za ponovo", res.zaPonovo, ["2:2"]);

  const trend = verseTrend([
    { createdAt: "a", items: [{ verseKey: "2:2", result: "netacno" }] },
    { createdAt: "b", items: [{ verseKey: "2:2", result: "tacno" }] },
    { createdAt: "c", items: [{ verseKey: "2:2", result: "tacno" }] },
  ], "2:2");
  assert("test: trend — popravlja se", trend.popravljaSe, true);

  // bojenje riječi s greškom
  const seg = splitWithErrors("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", [1, 3]);
  assert("greška-riječ: 4 riječi, 2 obojene", [seg.length, seg.filter((s) => s.isError).map((s) => s.index)], [4, [1, 3]]);
}

// ── MJESEČNI PLAN (sa slobodnim danima) ─────────────────────────────────────
{
  assert("mjesec: august 2026 = 31 dan", monthDates(2026, 8).length, 31);

  const pages = scopeToPages({ type: "sure", sure: [36] }); // Ja-Sin, 6 str. = 90 redova
  const rest = ["2026-08-07", "2026-08-14", "2026-08-21", "2026-08-28"]; // petkom slobodno
  const plan = generateMonthlyPlan({
    year: 2026, month: 8, pages, editionId: "medina_15", linesPerDay: 3,
    restDays: rest,
    reviewProvider: (date) => (date === "2026-08-07" ? "Džuz 30 — pojačano" : "Redovno ponavljanje"),
  });

  assert("mjesec: 27 radnih + 4 slobodna", [plan.radnihDana, plan.slobodnihDana], [27, 4]);
  const d7 = plan.days.find((d) => d.date === "2026-08-07");
  assert("mjesec: slobodan dan bez učenja, pojačano ponavljanje", [d7.learning, d7.pojacanoPonavljanje, d7.review], [null, true, "Džuz 30 — pojačano"]);

  // svih 90 redova stane u radne dane (27 × 3 = 81 → 81 red ovog mjeseca)
  const totalLines = plan.days.reduce((s, d) => s + (d.learning?.lineCount || 0), 0);
  assert("mjesec: 81 red raspoređen na radne dane", totalLines, 81);
  assert("mjesec: nastavak za sljedeći mjesec (endLine)", plan.endLine, 81);

  // uređivanje: upis naučenog i bilješka s oznakom greške
  let p2 = updateDay(plan, "2026-08-03", { upisNaucenog: "Ja-Sin 1–8", biljeska: "greška na 36:5", oznakaGreske: true });
  const d3 = p2.days.find((d) => d.date === "2026-08-03");
  assert("mjesec: dan uređen", [d3.upisNaucenog, d3.oznakaGreske], ["Ja-Sin 1–8", true]);

  // printable model čuva upise i dodaje marker upozorenja
  const pm = printableModel(p2);
  const pm3 = pm.find((r) => r.date === "2026-08-03");
  assert("print: bilješka s markerom greške", pm3.biljeska, "greška na 36:5 ⚠");
  assert("print: engleske labele rade", printableModel(p2, { language: "en" })[0].labels.learn, "Learn");

  // naknadni slobodan dan → preraspodjela, upisi sačuvani
  const p3 = toggleRestDay(p2, "2026-08-10", { pages, editionId: "medina_15", linesPerDay: 3 });
  const d10 = p3.days.find((d) => d.date === "2026-08-10");
  assert("mjesec: 10.8. postao slobodan", [d10.isRest, d10.learning], [true, null]);
  assert("mjesec: raniji upis sačuvan nakon preraspodjele", p3.days.find((d) => d.date === "2026-08-03").upisNaucenog, "Ja-Sin 1–8");

  const st = monthStats(p2);
  assert("mjesec: statistika", [st.danaPopunjeno, st.danaSaGreskom], [1, 1]);
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
