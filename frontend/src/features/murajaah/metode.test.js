// ============================================================================
// Murajaa - testovi pametnih metoda + model višestruke pohrane
// Pokretanje:  node src/features/murajaah/metode.test.js   (iz frontend/)
// ============================================================================

import { classify, dailySession, warnings, daysSinceReview } from "./novoStaro.js";
import { createItem, applyReview as greskeReview, flagManual, weakSpotMap, dailyPlan, intervalForErrors, kategorija, skorSlabosti, uReduSlabih, trebaEskalaciju, skorStranice } from "./greske.js";
import { recordEntry, stats, itemHistory } from "./slobodan.js";
import { PROFILES, adjustIntervals, adjustDailyGoal, recommendation } from "./nivo.js";
import {
  createBlock, reviewNivo6, reviewNivo, reviewBlock, timerColor, dueAyahs,
  makeBridge, gradeBridge, blockSummary, addMinutes, addDaysIso,
} from "./pohrana.js";

let passed = 0, failed = 0;
function assert(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; console.error(`✗ ${name}\n    očekivano: ${e}\n    dobijeno:  ${a}`); }
}

// ── NOVO I STARO ────────────────────────────────────────────────────────────
{
  const today = "2026-07-23";
  const blocks = [
    { label: "svježe", learnedOn: "2026-07-20" },                                  // 3 dana - novo
    { label: "granica", learnedOn: "2026-07-09" },                                 // 14 dana - novo
    { label: "srednje", learnedOn: "2026-06-30" },                                 // 23 dana - srednje
    { label: "staro", learnedOn: "2026-05-01", lastReviewedOn: "2026-06-25" },     // staro, ponovljeno prije 28 d
    { label: "zapušteno", learnedOn: "2026-04-01", lastReviewedOn: "2026-06-01" }, // staro, 52 dana!
  ];
  const c = classify(blocks, today);
  assert("novo/staro: podjela 2/1/2", [c.novo.length, c.srednje.length, c.staro.length], [2, 1, 2]);

  const s = dailySession(blocks, today);
  assert("novo/staro: novo — najsvježije prvo", s.novo[0].label, "svježe");
  assert("novo/staro: staro — najzapuštenije prvo", s.staro[0].label, "zapušteno");
  assert("novo/staro: pola-pola vremena", s.raspodjelaVremena, { novo: 0.5, staro: 0.5 });

  const w = warnings(blocks, today);
  assert("novo/staro: 1 upozorenje (52 dana)", [w.length, w[0].daysSince], [1, 52]);
  assert("novo/staro: dana od ponavljanja", daysSinceReview(blocks[3], today), 28);
}

// ── METODA NA OSNOVU GREŠAKA ────────────────────────────────────────────────
{
  assert("greške: 0 → standard (7 d)", intervalForErrors(0), 7);
  assert("greške: 2 → ubrzo (3 d)", intervalForErrors(2), 3);
  assert("greške: 3 → dnevno (1 d)", intervalForErrors(3), 1);

  let item = createItem({ ref: "255", refType: "page" });
  item = greskeReview(item, { errors: 3, date: "2026-07-23" });
  assert("greške: 3 greške → sutra opet, kritično", [item.nextReviewOn, kategorija(item.recentErrors)], ["2026-07-24", "kriticno"]);
  assert("greške: markirano za muallima", item.zaMualima, true);

  // stabilizacija: 2 čista prolaza → nazad na standard
  item = greskeReview(item, { errors: 0, date: "2026-07-24" });
  assert("greške: 1 čist prolaz — još dnevno", intervalForErrors(item.recentErrors), 1);
  item = greskeReview(item, { errors: 0, date: "2026-07-25" });
  assert("greške: 2 čista prolaza → stabilizovano (+7)", item.nextReviewOn, "2026-08-01");

  // ručno označavanje bez formalnih grešaka
  let m = createItem({ ref: "2:285", refType: "verse" });
  m = flagManual(m, { note: "miješam s 2:255", date: "2026-07-23" });
  assert("greške: ručna oznaka → ubrzano (3 d)", m.nextReviewOn, "2026-07-26");

  const map = weakSpotMap([item, m, createItem({ ref: "10", refType: "page" })]);
  assert("greške: mapa slabih mjesta — 2 stavke, najgora prva", [map.length, map[0].ref], [2, "255"]);

  const plan = dailyPlan([{ ...item, nextReviewOn: "2026-07-23", recentErrors: 3 }, { ...m, nextReviewOn: "2026-07-23" }], "2026-07-23");
  assert("greške: kritično i jutro i večer", [plan.jutro.length, plan.vecer.length], [2, 1]);
}

// ── SKOR SLABOSTI (dokument arhitekture, sekcija 4.11 - tačna formula) ──────
{
  // savršena stranica: 0 grešaka, sigurnost 5, 0 dana od zadnjeg → skor 0
  assert("skor: savršena stranica = 0", skorSlabosti({ greskeZadnje: 0, sigurnostZadnja: 5, greskeProsjek3: 0, danaOdZadnjeg: 0 }), 0);

  // 1 greška×3=3 + (5-3)=2 + prosjek 1×2=2 + 30/30=1 → 8
  assert("skor: primjer iz formule", skorSlabosti({ greskeZadnje: 1, sigurnostZadnja: 3, greskeProsjek3: 1, danaOdZadnjeg: 30 }), 8);

  assert("skor: prag ulaska > 4", [uReduSlabih(4), uReduSlabih(5)], [false, true]);
  assert("skor: prag eskalacije > 10", [trebaEskalaciju(10), trebaEskalaciju(11)], [false, true]);

  // teška stranica: 3 greške×3=9 + (5-1)=4 + prosjek 2×2=4 + 60/30=2 → 19 (eskalacija)
  const teska = skorSlabosti({ greskeZadnje: 3, sigurnostZadnja: 1, greskeProsjek3: 2, danaOdZadnjeg: 60 });
  assert("skor: teška stranica prelazi prag eskalacije", trebaEskalaciju(teska), true);
}

// ── skorStranice - iz sirovih page_progress/page_repeat_history podataka ────
{
  assert("skorStranice: bez historije, savršena stranica → 0",
    skorStranice({ confidence: 5, errors: 0, historyErrorsDesc: [], lastRepeat: null, today: "2026-08-06" }), 0);

  // bez historije → koristi page_progress.errors kao greskeZadnje, greskeProsjek3=0
  assert("skorStranice: bez historije koristi errors kao greskeZadnje",
    skorStranice({ confidence: 5, errors: 2, historyErrorsDesc: [], lastRepeat: null, today: "2026-08-06" }),
    skorSlabosti({ greskeZadnje: 2, sigurnostZadnja: 5, greskeProsjek3: 0, danaOdZadnjeg: 0 }));

  // sa historijom → greskeZadnje = prvi (najnoviji), prosjek3 = prosjek prva 3
  assert("skorStranice: sa historijom",
    skorStranice({ confidence: 3, errors: 99, historyErrorsDesc: [1, 2, 0], lastRepeat: "2026-07-07", today: "2026-08-06" }),
    skorSlabosti({ greskeZadnje: 1, sigurnostZadnja: 3, greskeProsjek3: 1, danaOdZadnjeg: 30 }));

  // više od 3 stavke historije → uzima samo prve 3 za prosjek
  assert("skorStranice: prosjek samo od prve 3",
    skorStranice({ confidence: 5, errors: 0, historyErrorsDesc: [3, 3, 3, 0, 0], lastRepeat: "2026-08-06", today: "2026-08-06" }),
    skorSlabosti({ greskeZadnje: 3, sigurnostZadnja: 5, greskeProsjek3: 3, danaOdZadnjeg: 0 }));

  // confidence null → default 5 (nema samoocjene još)
  assert("skorStranice: confidence null → default 5",
    skorStranice({ confidence: null, errors: 0, historyErrorsDesc: [], lastRepeat: null, today: "2026-08-06" }), 0);
}

// ── SLOBODAN RASPORED ───────────────────────────────────────────────────────
{
  let log = [];
  log = recordEntry(log, { ref: "301", refType: "page", date: "2026-07-21" });
  log = recordEntry(log, { ref: "301", refType: "page", date: "2026-07-22", errors: 1 });
  log = recordEntry(log, { ref: "36:1", refType: "verse", date: "2026-07-22" });

  const st = stats(log, "2026-07-23");
  assert("slobodan: 3 unosa, 2 aktivna dana", [st.ukupno, st.aktivnihDana], [3, 2]);
  assert("slobodan: greške ukupno", st.greskeUkupno, 1);

  const h = itemHistory(log, "301");
  assert("slobodan: historija stranice 301", [h.brojPonavljanja, h.greske, h.zadnjiPut], [2, 1, "2026-07-22"]);
}

// ── NIVO PROFILI ────────────────────────────────────────────────────────────
{
  assert("nivo: 3 profila", Object.keys(PROFILES).length, 3);
  assert("nivo: početnik — duži intervali (×1.5)", adjustIntervals([1, 2, 3, 5, 8], "pocetnik"), [2, 3, 5, 8, 12]);
  assert("nivo: napredni — kraći intervali (×0.75)", adjustIntervals([4, 8], "napredni"), [3, 6]);
  assert("nivo: minimalni interval je 1", adjustIntervals([1], "napredni"), [1]);
  assert("nivo: preporuka početniku = tri dana", recommendation("pocetnik").metoda, "tri_dana");
  const g = adjustDailyGoal(30, "pocetnik");
  assert("nivo: 30 r/dan za početnika → upozorenje", g.prekoracen, true);
}

// ── MODEL VIŠESTRUKE POHRANE (nivoi 6→0) ────────────────────────────────────
{
  const T0 = "2026-07-23T08:00:00.000Z";
  let block = createBlock(["36:1", "36:2", "36:3"], T0);
  assert("pohrana: svi ajeti ulaze na nivo 6", blockSummary(block).poNivou, { 6: 3 });
  assert("pohrana: 1. ponavljanje odmah", block.ayahs["36:1"].nextDueAt, T0);

  // vatrena zona: 3 čista koraka → sutradan nivo 5
  let a = block.ayahs["36:1"];
  a = reviewNivo6(a, { correct: true, at: T0 });
  assert("pohrana: 2. korak nakon 20 min", a.nextDueAt, addMinutes(T0, 20));
  a = reviewNivo6(a, { correct: true, at: addMinutes(T0, 20) });
  assert("pohrana: 3. korak nakon ~7 h", a.subStep, 2);
  a = reviewNivo6(a, { correct: true, at: addMinutes(T0, 8 * 60) });
  assert("pohrana: vatrena zona čista → nivo 5 (24 h)", [a.nivo, a.nextDueAt], [5, addDaysIso(addMinutes(T0, 8 * 60), 1)]);

  // greška u vatrenoj zoni → reset tajmera, ostaje nivo 6
  let e = block.ayahs["36:2"];
  e = reviewNivo6(e, { correct: false, at: addMinutes(T0, 30) });
  assert("pohrana: greška u zoni → subStep 0, tajmer resetovan", [e.nivo, e.subStep, e.nextDueAt], [6, 0, addMinutes(T0, 30)]);

  // putanja 5→4→3→2→1→0
  const T1 = "2026-07-24T08:00:00.000Z";
  let p = { nivo: 5, subStep: 0, nextDueAt: T1, lastResult: null };
  p = reviewNivo(p, { correct: true, at: T1 });
  assert("pohrana: 5→4 (pauza 2 dana)", [p.nivo, p.nextDueAt], [4, addDaysIso(T1, 2)]);
  p = reviewNivo(p, { correct: true, at: p.nextDueAt });
  assert("pohrana: 4→3 (pauza 4 dana)", p.nivo, 3);
  p = reviewNivo(p, { correct: true, at: p.nextDueAt });
  assert("pohrana: 3→2 (pauza 8 dana)", [p.nivo, p.nextDueAt.slice(0, 10)], [2, "2026-08-07"]);
  p = reviewNivo(p, { correct: true, at: p.nextDueAt });
  assert("pohrana: 2→1 (pauza 16 dana)", p.nivo, 1);
  p = reviewNivo(p, { correct: true, at: p.nextDueAt });
  assert("pohrana: 1→0 trajno (glavni krug 10 dana)", [p.nivo, p.nextDueAt.slice(0, 10)], [0, "2026-09-02"]);

  // blaža kazna: greška na nivou 2 → pad na 5 (ne na 6)
  let b2 = { nivo: 2, subStep: 0, nextDueAt: T1, lastResult: null };
  b2 = reviewNivo(b2, { correct: false, at: T1 });
  assert("pohrana: greška na nivou 2 → nivo 5 (blaža kazna)", b2.nivo, 5);
  let b1 = { nivo: 1, subStep: 0, nextDueAt: T1, lastResult: null };
  b1 = reviewNivo(b1, { correct: false, at: T1 });
  assert("pohrana: greška na nivou 1 → nivo 5", b1.nivo, 5);
  // a greška na nivou 4 → skroz na 6
  let b4 = { nivo: 4, subStep: 0, nextDueAt: T1, lastResult: null };
  b4 = reviewNivo(b4, { correct: false, at: T1 });
  assert("pohrana: greška na nivou 4 → vatrena zona (6)", [b4.nivo, b4.subStep], [6, 0]);

  // MIKRO/MAKRO: test bloka - 9 tačno, 1 netačno → samo taj pada
  let big = createBlock(["1:1","1:2","1:3","1:4","1:5","1:6","1:7","2:1","2:2","2:3"], T0);
  for (const k of big.order) big.ayahs[k] = { nivo: 3, subStep: 0, nextDueAt: T1, lastResult: null };
  const results = Object.fromEntries(big.order.map((k) => [k, k !== "1:4"]));
  const { block: after, izolovani } = reviewBlock(big, { results, at: T1 });
  assert("pohrana: izolovan samo pogriješeni ajet", izolovani, ["1:4"]);
  assert("pohrana: 9 ajeta napreduje na nivo 2", blockSummary(after).poNivou, { 2: 9, 6: 1 });
  assert("pohrana: pogriješeni u vatrenoj zoni odmah", after.ayahs["1:4"].nextDueAt, T1);

  // tajmer boje
  const due = "2026-07-23T10:00:00.000Z";
  const st6 = { nivo: 6, subStep: 1, nextDueAt: due };
  assert("tajmer: prije vremena → čeka", timerColor(st6, "2026-07-23T09:00:00.000Z"), "ceka");
  assert("tajmer: na vrijeme → zeleno", timerColor(st6, "2026-07-23T10:30:00.000Z"), "zeleno");
  assert("tajmer: kasni 3 h → žuto", timerColor(st6, "2026-07-23T13:00:00.000Z"), "zuto");
  assert("tajmer: kasni 8 h → crveno", timerColor(st6, "2026-07-23T18:00:00.000Z"), "crveno");

  const d = dueAyahs(after, addMinutes(T1, 5));
  assert("pohrana: na redu tačno 1 ajet (1:4)", [d.length, d[0].key], [1, "1:4"]);

  // MOST (Bridge)
  const most = makeBridge("1:4", ["1:1","1:2","1:3","1:4","1:5","1:6","1:7"]);
  assert("most: prethodni i sljedeći ajet", [most.prethodni, most.sljedeci], ["1:3", "1:5"]);
  const prvi = makeBridge("1:1", ["1:1","1:2"]);
  assert("most: prvi ajet nema prethodnog", prvi.prethodni, null);

  let mostState = { nivo: 6, subStep: 0, nextDueAt: T1, lastResult: null };
  mostState = gradeBridge(mostState, { znao: true, at: T1 });
  assert("most: TAČNO → napreduje kroz zonu", mostState.subStep, 1);
  mostState = gradeBridge(mostState, { znao: false, at: T1 });
  assert("most: NETAČNO → reset zone", mostState.subStep, 0);
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
