// ============================================================================
// Ta'lim - generator plana učenja (Koraci 3, 4 i 5)
//
// Korak 3: kapacitet u redovima/stranicama (NE u minutama)
// Korak 4: zaključavanje - datum daje tempo, ili tempo daje datum,
//          uz provjeru realnosti
// Korak 5: metoda i smjer (metode su u zasebnim fajlovima)
//
// Plus: preračun kad korisnik promijeni količinu (isti datum ILI isti tempo),
// nadoknada zaostatka, automatsko skraćenje procjene kad nauči više,
// i oznaka tačnosti datuma po metodi.
// ============================================================================

import { addDays, daysBetween } from "../murajaah/engine.js";
import { getEdition, lineToPosition } from "./mushaf.js";

// ── Tačnost procijenjenog datuma po metodi učenja ───────────────────────────
// postepeno: tempo pod kontrolom → TAČAN datum
// redom:     dani mogu proći na utvrđivanju → PROCJENA
// krugovi:   struktura 30 str./krug → PROCJENA
// halka:     tempo zavisi od mentora → OKVIRAN
export const DATE_CERTAINTY = {
  postepeno: "tacan",
  redom: "procjena",
  krugovi: "procjena",
  halka: "okviran",
};

export function dateCertainty(methodId) {
  return DATE_CERTAINTY[methodId] || "procjena";
}

// ── Realnost tempa ──────────────────────────────────────────────────────────
// Klasična preporuka (metoda 20×): ne preći jedan hizb dnevno ≈ 2,5 stranice.
export function maxRealisticLinesPerDay(editionId) {
  return 2.5 * getEdition(editionId).linesPerPage;
}

// ── Broj radnih dana (bez sedmičnih slobodnih dana) između dva datuma,
// UKLJUČIVO oba kraja - za razliku od workingDaysBetween ispod (koja broji
// KORAKE od startDate do endDate, isključivo početni dan). Dijele je
// useTodayLearning (Dashboard/Hub) i PlanRasporedPage (provjera je li
// korisnik ispred/iza plana nakon ručnog unosa), da je račun uvijek identičan.
export function countWorkingDays(startDate, endDate, restWeekdays) {
  if (!startDate || !endDate || endDate < startDate) return 0;
  const set = new Set(restWeekdays || []);
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  let count = 0;
  while (cur <= end) {
    if (!set.has(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ── Slobodni dani (state.restWeekdays, Date.getDay() indeksi) u računu datuma ──
// Generalizacija daysBetween/addDays koja preskače sedmične slobodne dane; kad
// restWeekdays nema (ili je prazno), ponaša se identično kao daysBetween/addDays.
function workingDaysBetween(startDate, endDate, restWeekdays) {
  const set = new Set(restWeekdays || []);
  if (!set.size) return daysBetween(startDate, endDate);
  let d = startDate, count = 0;
  while (d !== endDate) {
    d = addDays(d, 1);
    const [y, m, dd] = d.split("-").map(Number);
    if (!set.has(new Date(y, m - 1, dd).getDay())) count++;
  }
  return count;
}

function addWorkingDays(startDate, days, restWeekdays) {
  const set = new Set(restWeekdays || []);
  if (!set.size) return addDays(startDate, days);
  let d = startDate, remaining = days;
  while (remaining > 0) {
    d = addDays(d, 1);
    const [y, m, dd] = d.split("-").map(Number);
    if (!set.has(new Date(y, m - 1, dd).getDay())) remaining--;
  }
  return d;
}

// ── Korak 4a: korisnik zaključa DATUM, iz njega se računa potreban tempo ────
export function tempoForDate({ totalLines, startDate, targetDate, editionId, restWeekdays = [] }) {
  const days = workingDaysBetween(startDate, targetDate, restWeekdays);
  if (days < 1) throw new Error("Datum završetka mora biti poslije početka");

  const linesPerDay = totalLines / days;
  const limit = maxRealisticLinesPerDay(editionId);
  const realistic = linesPerDay <= limit;

  return {
    linesPerDay,
    realistic,
    // Ako je nerealno, nudi se pomjeranje datuma ILI veći tempo,
    // ali odluka ostaje na korisniku.
    suggestion: realistic
      ? null
      : {
          predlozeniDatum: addWorkingDays(startDate, Math.ceil(totalLines / limit), restWeekdays),
          potrebniRedoviDnevno: linesPerDay,
          maksimalnoPreporuceno: limit,
        },
  };
}

// ── Korak 4b: korisnik zaključa TEMPO, iz njega se računa datum ─────────────
export function dateForTempo({ totalLines, linesPerDay, startDate, restWeekdays = [] }) {
  if (!linesPerDay || linesPerDay <= 0) throw new Error("Tempo mora biti veći od 0");
  const days = Math.ceil(totalLines / linesPerDay);
  return { endDate: addWorkingDays(startDate, days, restWeekdays), days };
}

// ── Generisanje dnevnog rasporeda ───────────────────────────────────────────
// Za svaki dan: tačno koji redovi (stranica + red od–do), do kraja opsega.
// Učenje i ponavljanje su UVIJEK odvojeni - ovo je samo blok UČENJA;
// blok ponavljanja vodi murajaa motor zasebno.
export function generateSchedule({ pages, editionId, linesPerDay, startDate, restWeekdays = [] }) {
  const { linesPerPage } = getEdition(editionId);
  const totalLines = pages.length * linesPerPage;
  const schedule = [];
  const restSet = new Set(restWeekdays);

  let globalLine = 0; // 0-bazirani red od početka opsega
  let day = 0;
  let carry = 0; // razlomljeni dio tempa se prenosi (npr. pola stranice dnevno)

  while (globalLine < totalLines) {
    const date = addDays(startDate, day);
    if (restSet.size) {
      const [y, m, dd] = date.split("-").map(Number);
      if (restSet.has(new Date(y, m - 1, dd).getDay())) { day++; continue; } // slobodan dan: preskoči
    }

    carry += linesPerDay;
    const todayLines = Math.floor(carry);
    carry -= todayLines;
    if (todayLines < 1) { day++; continue; } // tempo < 1 red/dan: preskoči dan

    const from = lineToPosition(globalLine, pages, editionId);
    const toLineIndex = Math.min(globalLine + todayLines, totalLines) - 1;
    const to = lineToPosition(toLineIndex, pages, editionId);

    schedule.push({
      date,
      from,               // { page, line }
      to,                 // { page, line }
      lineCount: toLineIndex - globalLine + 1,
      pages: pagesInRange(pages, from.page, to.page),
    });

    globalLine = toLineIndex + 1;
    day++;
  }

  return { schedule, endDate: schedule.at(-1)?.date || startDate, totalLines };
}

function pagesInRange(pages, fromPage, toPage) {
  return pages.filter((p) => p >= fromPage && p <= toPage);
}

// ── Preračun: korisnik mijenja dnevnu količinu usred plana ──────────────────
// keep = "datum" → isti datum, novi tempo za preostalo gradivo
// keep = "tempo" → isti (novi) tempo, pomjeri datum
export function recalcPlan({ totalLines, learnedLines, targetDate, today, keep, newLinesPerDay, editionId, restWeekdays = [] }) {
  const remaining = Math.max(0, totalLines - learnedLines);
  if (remaining === 0) return { done: true };

  if (keep === "datum") {
    const days = workingDaysBetween(today, targetDate, restWeekdays);
    if (days < 1) {
      // datum je već prošao/danas - jedino rješenje je novi datum
      return { keep, feasible: false, remaining };
    }
    const required = remaining / days;
    const limit = maxRealisticLinesPerDay(editionId);
    return { keep, feasible: required <= limit, linesPerDay: required, targetDate, remaining };
  }

  if (keep === "tempo") {
    if (!newLinesPerDay || newLinesPerDay <= 0) throw new Error("Novi tempo mora biti veći od 0");
    const days = Math.ceil(remaining / newLinesPerDay);
    return { keep, feasible: true, linesPerDay: newLinesPerDay, targetDate: addWorkingDays(today, days, restWeekdays), remaining };
  }

  throw new Error(`Nepoznat izbor: ${keep} (očekuje se "datum" ili "tempo")`);
}

// ── Nadoknada zaostatka ─────────────────────────────────────────────────────
// Ako je korisnik zaostao: raspodijeli zaostale redove na sljedećih N dana
// povrh redovnog tempa.
export function catchUpPlan({ backlogLines, linesPerDay, spreadDays }) {
  if (backlogLines <= 0) return { needed: false };
  if (!spreadDays || spreadDays < 1) throw new Error("Broj dana nadoknade mora biti bar 1");
  const extraPerDay = backlogLines / spreadDays;
  return {
    needed: true,
    extraPerDay,
    totalPerDay: linesPerDay + extraPerDay,
    days: spreadDays,
  };
}

// ── Evidencija stvarnog napretka ────────────────────────────────────────────
// Ako korisnik neki dan nauči VIŠE od planiranog, procjena završetka se
// automatski SMANJUJE; ako nauči manje - vidi se zaostatak.
export function progressStatus({ totalLines, learnedLines, plannedLinesToDate, linesPerDay, today, restWeekdays = [] }) {
  const remaining = Math.max(0, totalLines - learnedLines);
  const diff = learnedLines - plannedLinesToDate; // + ispred plana, − zaostatak
  const daysLeft = linesPerDay > 0 ? Math.ceil(remaining / linesPerDay) : Infinity;
  return {
    remaining,
    aheadLines: Math.max(0, diff),
    backlogLines: Math.max(0, -diff),
    estimatedEnd: linesPerDay > 0 ? addWorkingDays(today, daysLeft, restWeekdays) : null,
    percentDone: totalLines > 0 ? Math.round((learnedLines / totalLines) * 100) : 0,
  };
}
