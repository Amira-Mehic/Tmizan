// ============================================================================
// Ta'lim - testovi (čisti Node, bez framework-a)
// Pokretanje:  node src/features/talim/talim.test.js   (iz frontend/)
// ============================================================================

import { scopeToPages, scopeToLines, tempoToLinesPerDay, MUSHAF_EDITIONS, TOTAL_PAGES } from "./mushaf.js";
import { tempoForDate, dateForTempo, generateSchedule, recalcPlan, catchUpPlan, progressStatus, dateCertainty } from "./planner.js";
import { buildSteps, createSession, tick, counterDisplay, currentStep, exceedsDailyLimit } from "./postepeno.js";
import { orderUnits, createProgress as redomProgress, confirm as redomConfirm, currentUnit, estimateDaysLeft as redomEta } from "./redom.js";
import { krugPages, krugPage, extraPages, createProgress as krugProgress, todayTask, completeDay, estimateDaysLeft as krugEta } from "./krugovi.js";
import { createPlan as halkaPlan, markPrepared, mentorReview, currentPart, estimateDaysLeft as halkaEta, progressPercent } from "./halka.js";
import { generateMonthlyPlan, regenerateFromTempo, generateMonthlyPlanByAyahs, regenerateAyahPlanFromTempo, toggleAyahRestDay } from "./mjesecniPlan.js";

let passed = 0, failed = 0;
function assert(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; console.error(`✗ ${name}\n    očekivano: ${e}\n    dobijeno:  ${a}`); }
}

// ── MUSHAF ──────────────────────────────────────────────────────────────────
{
  assert("mushaf: cijeli Kur'an = 604 stranice", scopeToPages({ type: "cijeli" }).length, TOTAL_PAGES);
  assert("mushaf: džuz 30 = 23 stranice (582–604)", scopeToPages({ type: "dzuzevi", dzuzevi: [30] }).length, 23);
  assert("mushaf: sura Ja-Sin = stranice 440–445", scopeToPages({ type: "sure", sure: [36] }), [440, 441, 442, 443, 444, 445]);
  assert("mushaf: raspon 100–102", scopeToPages({ type: "stranice", from: 100, to: 102 }), [100, 101, 102]);
  assert("mushaf: kombinovano (2 džuza + sura + raspon, bez duplikata)",
    scopeToPages({ type: "kombinovano", parts: [
      { type: "dzuzevi", dzuzevi: [30] },
      { type: "sure", sure: [36] },
      { type: "stranice", from: 100, to: 102 },
    ] }),
    [100, 101, 102, 440, 441, 442, 443, 444, 445, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 598, 599, 600, 601, 602, 603, 604]);
  assert("mushaf: Ja-Sin u 15-rednom = 90 redova", scopeToLines({ type: "sure", sure: [36] }, "medina_15"), 90);
  assert("mushaf: Ja-Sin u 13-rednom = 78 redova", scopeToLines({ type: "sure", sure: [36] }, "indo_13"), 78);

  assert("tempo: 3 reda dnevno", tempoToLinesPerDay({ amount: 3, unit: "redovi", per: "dan" }, "medina_15"), 3);
  assert("tempo: pola stranice dnevno (15-redni) = 7.5", tempoToLinesPerDay({ amount: 0.5, unit: "stranice", per: "dan" }, "medina_15"), 7.5);
  assert("tempo: 1 stranica sedmično ≈ 2.14 r/dan", Math.round(tempoToLinesPerDay({ amount: 1, unit: "stranice", per: "sedmica" }, "medina_15") * 100) / 100, 2.14);

  let threw = false;
  try { scopeToPages({ type: "stranice", from: 50, to: 700 }); } catch { threw = true; }
  assert("mushaf: raspon van 604 baca grešku", threw, true);

  let threwNaN = false;
  try { scopeToPages({ type: "dzuzevi", dzuzevi: [Number("w")] }); } catch { threwNaN = true; }
  assert("mushaf: nevažeći (NaN) džuz baca grešku, ne prolazi tiho", threwNaN, true);
}

// ── PLANNER: korak 4 - datum ↔ tempo ────────────────────────────────────────
{
  // zaključan DATUM: Ja-Sin (90 redova) za 30 dana → 3 reda/dan
  const t = tempoForDate({ totalLines: 90, startDate: "2026-07-23", targetDate: "2026-08-22", editionId: "medina_15" });
  assert("planner: tempo za datum = 3 r/dan", t.linesPerDay, 3);
  assert("planner: 3 r/dan je realno", t.realistic, true);

  // nerealan datum: cijeli Kur'an za 30 dana
  const n = tempoForDate({ totalLines: 604 * 15, startDate: "2026-07-23", targetDate: "2026-08-22", editionId: "medina_15" });
  assert("planner: 302 r/dan je nerealno", n.realistic, false);
  assert("planner: nerealno → postoji prijedlog", !!n.suggestion, true);
  assert("planner: prijedlog datuma ~242 dana", n.suggestion.predlozeniDatum, "2027-03-22");

  // zaključan TEMPO: 90 redova po 3 r/dan → 30 dana
  const d = dateForTempo({ totalLines: 90, linesPerDay: 3, startDate: "2026-07-23" });
  assert("planner: datum za tempo = +30 dana", d, { endDate: "2026-08-22", days: 30 });
}

// ── PLANNER: dnevni raspored ────────────────────────────────────────────────
{
  // Ja-Sin (6 stranica × 15 = 90 redova), 3 reda dnevno → 30 dana
  const pages = scopeToPages({ type: "sure", sure: [36] });
  const { schedule, endDate } = generateSchedule({ pages, editionId: "medina_15", linesPerDay: 3, startDate: "2026-07-23" });
  assert("raspored: 30 dana za Ja-Sin po 3 reda", schedule.length, 30);
  assert("raspored: dan 1 = str. 440, redovi 1–3", [schedule[0].from, schedule[0].to], [{ page: 440, line: 1 }, { page: 440, line: 3 }]);
  assert("raspored: dan 6 prelazi na stranicu 441", schedule[5].to.page, 441);
  assert("raspored: zadnji dan završava str. 445 red 15", schedule.at(-1).to, { page: 445, line: 15 });
  assert("raspored: endDate = 30. dan", endDate, "2026-08-21");

  // pola stranice dnevno (7.5 redova) - razlomljeni tempo se prenosi
  const half = generateSchedule({ pages, editionId: "medina_15", linesPerDay: 7.5, startDate: "2026-07-23" });
  assert("raspored: pola stranice dnevno → 12 dana", half.schedule.length, 12);
  assert("raspored: dan 1 = 7 redova, dan 2 = 8 (prenos)", [half.schedule[0].lineCount, half.schedule[1].lineCount], [7, 8]);
}

// ── PLANNER: preračun, nadoknada, napredak ──────────────────────────────────
{
  // korisnik usred plana: 90 ukupno, naučio 30, danas 2026-08-01, cilj 2026-08-21
  const keepDate = recalcPlan({ totalLines: 90, learnedLines: 30, startDate: "2026-07-23", targetDate: "2026-08-21", today: "2026-08-01", keep: "datum", editionId: "medina_15" });
  assert("preračun (isti datum): 60 preostalo / 20 dana = 3 r/dan", keepDate.linesPerDay, 3);
  assert("preračun (isti datum): izvodljivo", keepDate.feasible, true);

  const keepTempo = recalcPlan({ totalLines: 90, learnedLines: 30, startDate: "2026-07-23", targetDate: "2026-08-21", today: "2026-08-01", keep: "tempo", newLinesPerDay: 6, editionId: "medina_15" });
  assert("preračun (isti tempo 6 r/dan): novi datum +10 dana", keepTempo.targetDate, "2026-08-11");

  const catchUp = catchUpPlan({ backlogLines: 12, linesPerDay: 3, spreadDays: 4 });
  assert("nadoknada: 12 zaostalih na 4 dana = +3/dan (ukupno 6)", [catchUp.extraPerDay, catchUp.totalPerDay], [3, 6]);

  // naučio više od plana → procjena se skraćuje
  const ahead = progressStatus({ totalLines: 90, learnedLines: 45, plannedLinesToDate: 30, linesPerDay: 3, today: "2026-08-01" });
  assert("napredak: 15 redova ispred plana", ahead.aheadLines, 15);
  assert("napredak: procjena kraja +15 dana (45 preostalo / 3)", ahead.estimatedEnd, "2026-08-16");
  assert("napredak: 50%", ahead.percentDone, 50);

  // tačnost datuma po metodi
  assert("tačnost: postepeno = tačan", dateCertainty("postepeno"), "tacan");
  assert("tačnost: redom = procjena", dateCertainty("redom"), "procjena");
  assert("tačnost: krugovi = procjena", dateCertainty("krugovi"), "procjena");
  assert("tačnost: halka = okviran", dateCertainty("halka"), "okviran");
}

// ── POSTEPENO NADOGRAĐIVANJE (20×) ──────────────────────────────────────────
{
  const steps = buildSteps(["36:1", "36:2", "36:3"], { reps: 20 });
  // ajet1, ajet2, spoj1-2, ajet3, spoj1-3, stranica = 6 koraka
  assert("postepeno: 3 ajeta → 6 koraka", steps.length, 6);
  assert("postepeno: redoslijed tipova", steps.map((s) => s.type), ["ajet", "ajet", "spoj", "ajet", "spoj", "stranica"]);
  assert("postepeno: spoj 1–3 od prvog do trećeg", [steps[4].from, steps[4].to], ["36:1", "36:3"]);

  const s2 = buildSteps(["36:1"], { reps: 20, prevPageDone: true });
  assert("postepeno: s prethodnom stranicom prvi korak = utvrđivanje", s2[0].type, "utvrdi_prethodnu");

  // sesija s brojačem (mali reps radi testa)
  let ses = createSession(["36:1", "36:2"], { reps: 2 });
  assert("postepeno: počinje na ajetu 1", currentStep(ses).key, "36:1");
  ses = tick(ses); // 1/2
  assert("postepeno: brojač 1", counterDisplay(ses), 1);
  ses = tick(ses); // 2/2 → sljedeći korak
  assert("postepeno: poslije 2 klika → ajet 2", currentStep(ses).key, "36:2");
  ses = tick(ses); ses = tick(ses); // ajet 2 gotov → spoj
  assert("postepeno: sad spoj 1–2", currentStep(ses).type, "spoj");
  ses = tick(ses); ses = tick(ses); // spoj gotov → stranica
  ses = tick(ses); ses = tick(ses); // stranica gotova
  assert("postepeno: stranica sastavljena → finished (ide u ponavljanje)", ses.finished, true);

  // brojač unazad
  let dn = createSession(["36:1"], { reps: 20, counterMode: "down" });
  dn = tick(dn);
  assert("postepeno: brojač unazad 19", counterDisplay(dn), 19);

  assert("postepeno: 3 stranice prelazi hizb", exceedsDailyLimit(3), true);
  assert("postepeno: 2 stranice ne prelazi", exceedsDailyLimit(2), false);
}

// ── REDOM KROZ MUSHAF ───────────────────────────────────────────────────────
{
  assert("redom: od početka", orderUnits([1, 2, 3], "od_pocetka"), [1, 2, 3]);
  assert("redom: od kraja", orderUnits([1, 2, 3], "od_kraja"), [3, 2, 1]);
  assert("redom: zadnji džuz prvi", orderUnits([1, 2, 583, 600], "zadnji_dzuz_pa_redom"), [583, 600, 1, 2]);

  let st = redomProgress([10, 11, 12], "od_pocetka");
  assert("redom: uči se prva jedinica", currentUnit(st), 10);

  st = redomConfirm(st, { errorFree: false }); // dan utvrđivanja
  assert("redom: greška NE otključava novo", currentUnit(st), 10);
  st = redomConfirm(st, { errorFree: true });
  assert("redom: bez greške → otključana sljedeća", currentUnit(st), 11);

  // procjena: 1 jedinica za 2 dana → preostale 2 jedinice ≈ 4 dana
  assert("redom: procjena uključuje dane utvrđivanja", redomEta(st), 4);

  st = redomConfirm(st, { errorFree: true });
  st = redomConfirm(st, { errorFree: true });
  assert("redom: sve potvrđeno → finished", st.finished, true);
}

// ── BOSANSKA METODA KRUGOVA ─────────────────────────────────────────────────
{
  assert("krugovi: krug 1 džuz 1 = str. 21 (zadnja u džuzu)", krugPage(1, 1), 21);
  assert("krugovi: krug 1 džuz 2 = str. 41", krugPage(2, 1), 41);
  assert("krugovi: krug 1 džuz 30 = str. 604", krugPage(30, 1), 604);
  assert("krugovi: krug 2 džuz 2 = str. 40 (pretposljednja)", krugPage(2, 2), 40);
  assert("krugovi: svaki krug ima 30 stranica", krugPages(1).length, 30);
  // višak: džuz 1 ima 21 str. (1 viška), džuz 30 ima 23 str. (3 viška)
  assert("krugovi: 4 stranice viška van 20 krugova", extraPages().length, 4);

  let st = krugProgress();
  const t1 = todayTask(st);
  assert("krugovi: dan 1 = krug 1, džuz 1", [t1.learn.krug, t1.learn.juz, t1.learn.page], [1, 1, 21]);
  assert("krugovi: krug 1 nema ponavljanja", t1.review, []);

  // preskoči na krug 3, džuz 1: uči se 3. od kraja, ponavljaju krug 2 i 1
  let st3 = { ...krugProgress(), krug: 3, juzIndex: 0 };
  const t3 = todayTask(st3);
  assert("krugovi: krug 3 → ponavljaju se krugovi 2 i 1 istog džuza",
    t3.review.map((r) => [r.krug, r.page]), [[2, 20], [1, 21]]);

  // kompletiranje: 30 dana = krug 1 gotov
  for (let i = 0; i < 30; i++) st = completeDay(st);
  assert("krugovi: poslije 30 dana → krug 2", st.krug, 2);
  assert("krugovi: procjena preostalog", krugEta(st), 20 * 30 + 4 - 30);
}

// ── HALKA / MENTORSKA ───────────────────────────────────────────────────────
{
  let plan = halkaPlan([
    { id: "r1", label: "Rub' 1 (En-Nas — El-Fil)", pages: [602, 603, 604] },
    { id: "r2", label: "Rub' 2", pages: [599, 600, 601] },
  ]);
  assert("halka: prvi dio zadan, drugi zaključan", plan.parts.map((p) => p.state), ["zadano", "zakljucano"]);

  plan = markPrepared(plan);
  assert("halka: učenik pripremio", currentPart(plan).state, "pripremljeno");

  plan = mentorReview(plan, { clean: false }); // nije čisto
  assert("halka: nije čisto → nazad na pripremu", currentPart(plan).state, "zadano");
  assert("halka: preslušavanje zabilježeno", currentPart(plan).preslusavanja, 1);

  plan = markPrepared(plan);
  plan = mentorReview(plan, { clean: true }); // čisto → otključava sljedeći
  assert("halka: odobreno → sljedeći dio zadan", [plan.parts[0].state, plan.parts[1].state], ["odobreno", "zadano"]);
  assert("halka: 50% završeno", progressPercent(plan), 50);

  // ETA iz prosjeka odobrenja: 2 odobrenja u 6 dana → 6 d/dio; 1 preostao
  assert("halka: okvirna procjena", halkaEta(plan, ["2026-07-01", "2026-07-07"]), 6);
  assert("halka: bez dovoljno podataka → null", halkaEta(plan, ["2026-07-01"]), null);

  plan = markPrepared(plan);
  plan = mentorReview(plan, { clean: true });
  assert("halka: sve odobreno → finished", plan.finished, true);
}

// ── MJESEČNI PLAN: regeneracija nakon ručne promjene tempa ─────────────────
{
  // Dovoljno stranica da ukupan broj redova NE ograničava mjesečnu raspodjelu
  // (inače generateMonthlyPlan ravnomjerno razvuče cijeli opseg kroz mjesec).
  const pages = Array.from({ length: 50 }, (_, i) => i + 1);
  const editionId = "medina_15";

  let mp = generateMonthlyPlan({ year: 2026, month: 2, pages, editionId, linesPerDay: 9, startLine: 0 });
  assert("mjesecniPlan: prvi dan sa starim tempom (9 r/dan) = 9 redova", mp.days[0].learning.lineCount, 9);

  // korisnik označi prvi dan kao naučen (stvarno 9 redova) pa promijeni tempo na 1 r/dan
  mp.days[0] = { ...mp.days[0], done: true, actualLines: 9 };
  const regen = regenerateFromTempo(mp, { pages, editionId, linesPerDay: 1, restDays: [], startLine: 9 });

  assert("regenTempo: već naučen dan ostaje netaknut (done)", regen.days[0].done, true);
  assert("regenTempo: već naučen dan zadržava stari broj redova", regen.days[0].learning.lineCount, 9);
  assert("regenTempo: sljedeći (neodučeni) dan koristi NOVI tempo (1 red)", regen.days[1].learning.lineCount, 1);
  assert("regenTempo: sljedeći dan nastavlja tačno od startLine (redak 10, tj. indeks 9)", regen.days[1].learning.from.line, 10);
}

// ── MJESEČNI PLAN PO AJETIMA (nezavisno od redova) ──────────────────────────
{
  // Dovoljno ajeta da ukupan broj NE ograničava mjesečnu raspodjelu (isti
  // princip kao "50 stranica" u testu iznad - inače bi tempo pao ispod 5/dan).
  const ayahKeys = Array.from({ length: 300 }, (_, i) => `2:${i + 1}`);

  let ap = generateMonthlyPlanByAyahs({ year: 2026, month: 2, ayahKeys, ayahsPerDay: 5, startIndex: 0 });
  assert("ajetiPlan: prvi dan = 5 ajeta", ap.days[0].learning.amount, 5);
  assert("ajetiPlan: prvi dan počinje od 2:1", ap.days[0].learning.fromKey, "2:1");
  assert("ajetiPlan: prvi dan završava na 2:5", ap.days[0].learning.toKey, "2:5");
  assert("ajetiPlan: drugi dan nastavlja od 2:6", ap.days[1].learning.fromKey, "2:6");
  assert("ajetiPlan: unit je 'ajeti'", ap.days[0].learning.unit, "ajeti");
  assert("ajetiPlan: from je {surah,ayah} objekat", ap.days[0].learning.from, { surah: 2, ayah: 1 });

  // korisnik označi prvi dan kao naučen (stvarno 5 ajeta) pa promijeni tempo na 1 ajet/dan
  ap.days[0] = { ...ap.days[0], done: true, actualLines: 5 };
  const regenA = regenerateAyahPlanFromTempo(ap, { ayahKeys, ayahsPerDay: 1, restDays: [], startIndex: 5 });
  assert("regenAjeti: već naučen dan ostaje netaknut (done)", regenA.days[0].done, true);
  assert("regenAjeti: već naučen dan zadržava stari broj ajeta", regenA.days[0].learning.amount, 5);
  assert("regenAjeti: sljedeći dan koristi novi tempo (1 ajet)", regenA.days[1].learning.amount, 1);
  assert("regenAjeti: sljedeći dan nastavlja tačno od 2:6", regenA.days[1].learning.fromKey, "2:6");

  // prolongiraj (slobodan dan) treći dan → preostali ajeti se preraspodijele
  const toggled = toggleAyahRestDay(ap, ap.days[2].date, { ayahKeys, ayahsPerDay: 5, today: null });
  assert("toggleAjetiRest: dan 3 postaje slobodan", toggled.days[2].isRest, true);
  assert("toggleAjetiRest: prvi (done) dan i dalje netaknut", toggled.days[0].done, true);
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
