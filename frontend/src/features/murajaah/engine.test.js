// ============================================================================
// Murajaa engine - testovi (čisti Node, bez framework-a)
// Pokretanje:  node src/features/murajaah/engine.test.js   (iz frontend/)
//
// Motor B mjeri vrijeme u satima, nad punim ISO timestampom, a ne nad datumom
// u obliku "YYYY-MM-DD". Kako su svi intervali višekratnici od 24 sata,
// kalendarski datum se ipak poklapa s očekivanim, pa se provjere rade nad
// punim timestampom umjesto poređenjem tekstualnih datuma.
// ============================================================================

import { createBlock, applyReview, dueBlocks, daysOverdue, describeState, addDays } from "./engine.js";

let passed = 0;
let failed = 0;

function assert(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    console.error(`✗ ${name}\n    očekivano: ${e}\n    dobijeno:  ${a}`);
  }
}

const D0 = "2026-07-23"; // dan učenja
// datum (kalendarski dio) sljedećeg ponavljanja, N dana od D0 - jer je
// anchor uvijek podne UTC, ovo se poklapa tačno s addDays(D0, n)
const dan = (n) => addDays(D0, n);

function novi(methodId) {
  return createBlock({
    unitType: "ajet",
    items: ["2:255", "2:256", "2:257"],
    label: "El-Bekara 255–257",
    learnedOn: D0,
    methodId,
  });
}

// Odradi ponavljanje na tačno zakazani trenutak
function ponovi(block, result) {
  return applyReview(block, { result, at: block.nextReviewOn });
}

// datum-dio ISO timestampa (za poređenje s addDays)
const d = (iso) => iso.slice(0, 10);

// ── METODA TRI DANA ─────────────────────────────────────────────────────────
{
  let b = novi("tri_dana");
  assert("tri_dana: prvo ponavljanje sutra", d(b.nextReviewOn), dan(1));
  assert("tri_dana: opis Dan 1 od 3", describeState(b), "Dan 1 od 3");

  b = ponovi(b, "correct"); // dan 1 prošao
  assert("tri_dana: nakon dana 1 → sutra opet", d(b.nextReviewOn), dan(2));
  b = ponovi(b, "correct"); // dan 2
  b = ponovi(b, "correct"); // dan 3 → prelazi na sedmično
  assert("tri_dana: nakon 3 dana → sedmično (+7)", d(b.nextReviewOn), dan(10));
  assert("tri_dana: opis sedmično", describeState(b), "Sedmično 1 od 4");

  // 4 sedmična prolaza → mjesečno
  b = ponovi(b, "correct");
  b = ponovi(b, "correct");
  b = ponovi(b, "correct");
  b = ponovi(b, "correct");
  assert("tri_dana: nakon 4 sedmice → mjesečno", describeState(b), "Mjesečno održavanje");
  assert("tri_dana: mjesečni interval je 30", d(b.nextReviewOn), dan(61));
  assert("tri_dana: finished na mjesečnom", b.finished, true);

  // mjesečno se ponavlja zauvijek
  b = ponovi(b, "correct");
  assert("tri_dana: mjesečno ostaje mjesečno", d(b.nextReviewOn), dan(91));

  // greška → sve ispočetka
  b = ponovi(b, "incorrect");
  assert("tri_dana: greška vraća na Dan 1", describeState(b), "Dan 1 od 3");
  assert("tri_dana: greška → sutra ponovo", d(b.nextReviewOn), dan(92));
  assert("tri_dana: greška poništava finished", b.finished, false);
}

// ── METODA SEDAM DANA ───────────────────────────────────────────────────────
{
  let b = novi("sedam_dana");
  // 7 uzastopnih dana
  for (let i = 1; i <= 7; i++) {
    assert(`sedam_dana: dan ${i} zakazan`, d(b.nextReviewOn), dan(i));
    b = ponovi(b, "correct");
  }
  // poslije 7. dana → pauza 14 dana → ponavljanje na dan 22 od učenja
  assert("sedam_dana: pauza — provjera na dan 22", d(b.nextReviewOn), dan(22));
  assert("sedam_dana: opis pauze", describeState(b), "Pauza — provjera za 14 dana");

  b = ponovi(b, "correct");
  assert("sedam_dana: poslije pauze → mjesečno", describeState(b), "Mjesečno održavanje");

  // greška usred ciklusa → od Dana 1
  let c = novi("sedam_dana");
  c = ponovi(c, "correct"); // dan 1
  c = ponovi(c, "incorrect"); // greška na danu 2
  assert("sedam_dana: greška → Dan 1 od 7", describeState(c), "Dan 1 od 7");
}

// ── METODA (1–2–3–5–8) FIBONACCI ────────────────────────────────────────────
{
  let b = novi("fibonacci");
  // ponavljanja na dane 1, 2, 3, 5, 8 od učenja
  const ocekivaniDani = [1, 2, 3, 5, 8];
  for (let i = 0; i < 5; i++) {
    assert(`fibonacci: ponavljanje ${i + 1} na dan ${ocekivaniDani[i]}`, d(b.nextReviewOn), dan(ocekivaniDani[i]));
    b = ponovi(b, "correct");
  }
  // dalje: sedmično pa mjesečno
  assert("fibonacci: poslije dana 8 → sedmično (+7)", d(b.nextReviewOn), dan(15));
  b = ponovi(b, "correct");
  assert("fibonacci: zatim mjesečno (+30)", d(b.nextReviewOn), dan(45));

  // greška → restart niza
  b = ponovi(b, "incorrect");
  assert("fibonacci: greška → ponavljanje 1 od 5", describeState(b), "Ponavljanje 1 od 5 (dan 1)");
}

// ── SRS (NIVOI 1–7) ─────────────────────────────────────────────────────────
{
  let b = novi("srs");
  assert("srs: počinje na nivou 1", b.srsLevel, 1);
  assert("srs: nivo 1 → sutra", d(b.nextReviewOn), dan(1));

  b = ponovi(b, "correct");
  assert("srs: uspjeh → nivo 2 (+3 dana)", [b.srsLevel, d(b.nextReviewOn)], [2, dan(4)]);

  b = ponovi(b, "correct"); // nivo 3 (+7)
  b = ponovi(b, "correct"); // nivo 4 (+14)
  assert("srs: nivo 4 poslije 3 uspjeha", b.srsLevel, 4);

  b = ponovi(b, "incorrect");
  assert("srs: greška → pad na nivo 3, ne ispočetka", b.srsLevel, 3);

  // do nivoa 7
  b = ponovi(b, "correct"); // 4
  b = ponovi(b, "correct"); // 5
  b = ponovi(b, "correct"); // 6
  b = ponovi(b, "correct"); // 7
  assert("srs: maksimalni nivo 7", b.srsLevel, 7);
  assert("srs: finished na nivou 7", b.finished, true);
  b = ponovi(b, "correct");
  assert("srs: nivo 7 ostaje 7 (pregled na 180 dana)", b.srsLevel, 7);

  // greška na nivou 1 ne ide ispod 1
  let c = novi("srs");
  c = ponovi(c, "incorrect");
  assert("srs: nivo 1 na grešku ostaje 1", c.srsLevel, 1);
}

// ── DUE BLOKOVI I KAŠNJENJE ─────────────────────────────────────────────────
{
  const b1 = { ...novi("tri_dana"), nextReviewOn: "2026-07-20T12:00:00.000Z" }; // kasni 4 dana
  const b2 = { ...novi("srs"), nextReviewOn: "2026-07-24T12:00:00.000Z" };      // sad
  const b3 = { ...novi("fibonacci"), nextReviewOn: "2026-07-30T12:00:00.000Z" };// budućnost

  const sad = "2026-07-24T12:00:00.000Z";
  const due = dueBlocks([b3, b2, b1], sad);
  assert("due: vraća 2 bloka (sad + zakašnjeli)", due.length, 2);
  assert("due: zakašnjeli prvi", due[0].nextReviewOn, "2026-07-20T12:00:00.000Z");
  assert("overdue: kašnjenje 4 dana", daysOverdue(b1, sad), 4);
  assert("overdue: današnji ne kasni", daysOverdue(b2, sad), 0);
}

// ── VALIDACIJE ──────────────────────────────────────────────────────────────
{
  let threw = false;
  try { createBlock({ unitType: "ajet", items: [], learnedOn: D0, methodId: "srs" }); } catch { threw = true; }
  assert("validacija: prazan blok baca grešku", threw, true);

  threw = false;
  try { createBlock({ unitType: "xyz", items: ["1:1"], learnedOn: D0, methodId: "srs" }); } catch { threw = true; }
  assert("validacija: nepoznata jedinica baca grešku", threw, true);

  threw = false;
  try { createBlock({ unitType: "ajet", items: ["1:1"], learnedOn: D0, methodId: "nema" }); } catch { threw = true; }
  assert("validacija: nepoznata metoda baca grešku", threw, true);
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
