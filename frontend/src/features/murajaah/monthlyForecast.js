// ============================================================================
// Murajaa - mjesečna projekcija ("šta me čeka narednih dana") za AKTIVAN plan
// ponavljanja, bilo koje od 16 metoda. Isti duh kao mjesečni plan UČENJA
// (features/talim/mjesecniPlan.js), ali za PONAVLJANJE: umjesto "koje je
// sljedeće NOVO gradivo", ovdje je pitanje "šta i kada TREBA PONOVITI".
//
// KLJUČNA RAZLIKA od plana učenja: plan učenja je potpuno determinističan
// (uvijek se zna tačno koji red/stranica je sljedeća). Kod ponavljanja,
// budući datumi kod INTERVALNIH metoda (fibonacci/tri_dana/sedam_dana/srs)
// zavise od toga da li ćeš uspješno ponoviti ili ne - to se ne može znati
// unaprijed. Zato je projekcija za te metode OPTIMISTIČNA pretpostavka
// (kao da će svako ponavljanje proći bez greške) - čim se desi STVARNA
// interakcija (Tačno/Greška na Murajaa stranici), stvarno stanje bloka se
// ažurira, i sljedeći put kad se projekcija generiše, ona kreće od TE nove,
// stvarne tačke - efektivno se "ažurira u zavisnosti od interakcije".
//
// Kružne metode (dzuzevi/stranice/seton/dinamicna) i sedmične (femi/dzuz
// sedmično) NE zavise od uspjeha/greške - redoslijed je fiksan bez obzira
// na grešku (greške se posebno prate za mapu slabih mjesta), pa je njihova
// projekcija potpuno determinističan pravi raspored, ne samo pretpostavka.
//
// greske / novo_staro / nivo / slobodan / mualim NEMAJU fiksni raspored:
//  - greske: prati postojeće greške, nema unaprijed poznatog rasporeda
//  - novo_staro: dijeli POSTOJEĆE blokove po starosti, nije svoj raspoređivač
//  - nivo: samo nadograđuje neku DRUGU (stvarnu) metodu
//  - slobodan / mualim: namjerno bez automatike / ručno od strane muallima
// Za te metode forecastReviewPlan vraća null.
// ============================================================================

import { addDays, applyReview } from "./engine.js";
import { partitionPages, seedCycle, dueGroups, duePages, completePages } from "./motorA.js";
import { dinamicnaToday, completeDinamicnaCycle } from "./dinamicna.js";
import { femiToday, completeFemiWeek, juzWeeklyToday, completeJuzWeek } from "./femi.js";
import { getJuzForPage, getJuzPages } from "../../constants/hifz/helpers.js";

export const DEFAULT_FORECAST_DAYS = 30;

// ── Pomoćno: pretvori page_progress podatke (Map ili undefined) u
//    { page, sljedeceP } niz za dato "units" grupisanje. Ako stranica NIKAD
//    nije bila u ciklusu (nema real page_progress podataka), koristi se
//    svježe zasijavanje (seedCycle) kao razuman početak. ───────────────────
function buildPageStates(units, pageProgress, startDate) {
  const flatPages = units.flat();
  const hasRealData = pageProgress && flatPages.some((p) => pageProgress.get(p)?.sljedece_ponavljanje);
  if (hasRealData) {
    return flatPages.map((page) => ({ page, sljedeceP: pageProgress.get(page)?.sljedece_ponavljanje || null }));
  }
  return seedCycle(units, { startDate });
}

// ── KRUŽNE METODE (dzuzevi / stranice / seton) - determinističke, nad
//    datumom PO STRANICI (motorA.js). ──────────────────────────────────────
export function forecastRotation(state, { days = DEFAULT_FORECAST_DAYS, startDate } = {}) {
  let units, groupOf, ciklusDana, kindOf;

  if (state.type === "dzuzevi") {
    units = state.items.map((juz) => getJuzPages(juz));
    groupOf = (page) => getJuzForPage(page);
    ciklusDana = state.items.length;
    kindOf = (groupId, pages) => ({ juz: groupId, pages });
  } else if (state.type === "stranice") {
    const quota = state.quota || 1;
    units = partitionPages(state.items, Math.max(1, Math.ceil(state.items.length / quota)));
    groupOf = null; // "Po stranicama" nema jedinicu - kvota se uzima direktno
    ciklusDana = Math.max(1, Math.ceil(state.items.length / quota));
    kindOf = (_, pages) => {
      const half = Math.ceil(pages.length / 2);
      return { pages, jutro: pages.slice(0, half), vecer: pages.slice(half) };
    };
  } else if (state.type === "seton") {
    units = partitionPages(state.items, state.parts || 8);
    groupOf = (page) => units.findIndex((g) => g.includes(page));
    ciklusDana = units.length;
    kindOf = (groupId, pages) => ({ dio: groupId + 1, pages });
  } else {
    throw new Error(`forecastRotation: nepodržan tip ${state.type}`);
  }

  let cur = buildPageStates(units, state.pageProgress, startDate);
  const out = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    let pages, groupId;

    if (groupOf) {
      const due = dueGroups(cur, date, groupOf);
      const sorted = [...due.keys()].sort((a, b) => a - b);
      groupId = sorted[0];
      pages = groupId !== undefined ? due.get(groupId) : [];
    } else {
      const quota = state.quota || units[0]?.length || 1;
      pages = duePages(cur, date).slice(0, quota);
    }

    out.push({ date, kind: state.type, data: kindOf(groupId, pages) });
    if (pages.length) cur = completePages(cur, pages, date, ciklusDana);
  }
  return out;
}

// ── DINAMIČNA RASPODJELA - auto-rebalans, i dalje determinističan (ne zavisi
//    od uspjeha/greške, samo od proteklog vremena). Radi nad last_repeat
//    umjesto sljedece_ponavljanje (isto kao pravi motor u dinamicna.js). ───
export function forecastDinamicna(state, { days = DEFAULT_FORECAST_DAYS, startDate } = {}) {
  const lastRepeatByPage = new Map(
    (state.items || []).map((p) => [p, state.pageProgress?.get(p)?.last_repeat || null])
  );
  const lastRepeatOf = (p) => lastRepeatByPage.get(p) || null;

  let cycleStart = state.cycleStart;
  let cyclesDone = state.cyclesDone || 0;
  const out = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const data = dinamicnaToday(state.items, { cycleStart, cycleLengthDays: state.quota }, lastRepeatOf, date);
    out.push({ date, kind: "dinamicna", data });

    if (data.pages.length) {
      for (const p of data.pages) lastRepeatByPage.set(p, date);
      const params = completeDinamicnaCycle(state.items, { cycleStart, cyclesDone, cycleLengthDays: state.quota }, lastRepeatOf, date, data.pages);
      cycleStart = params.cycleStart;
      cyclesDone = params.cyclesDone;
    }
  }
  return out;
}

// ── SEDMIČNE METODE (Femi bi-ševk / Džuz kroz sedmicu) - pretpostavka da je
//    svaki dan odrađeno TAČNO kako je predloženo. Femi je Dinamična sa
//    ciklusom od 7 dana (vidi femi.js); Džuz-sedmično dodatno mijenja koji
//    je džuz aktivan kad se sedmica zatvori. ────────────────────────────────
export function forecastFemiWeekly(femiRow, { days = DEFAULT_FORECAST_DAYS, startDate } = {}) {
  const isDzuzSedmicno = femiRow.method !== "femi";
  const out = [];

  if (!isDzuzSedmicno) {
    const lastRepeatByPage = new Map((femiRow.items || []).map((p) => [p, femiRow.pageProgress?.get(p)?.last_repeat || null]));
    const lastRepeatOf = (p) => lastRepeatByPage.get(p) || null;
    let cycleStart = femiRow.cycleStart, cyclesDone = femiRow.cyclesDone || 0;

    for (let i = 0; i < days; i++) {
      const date = addDays(startDate, i);
      const data = femiToday(femiRow.items, { cycleStart }, lastRepeatOf, date);
      out.push({ date, kind: "femi", data: { ...data, planned: data.pages } });
      if (data.pages.length) {
        for (const p of data.pages) lastRepeatByPage.set(p, date);
        const params = completeFemiWeek(femiRow.items, { cycleStart, cyclesDone }, lastRepeatOf, date, data.pages);
        cycleStart = params.cycleStart; cyclesDone = params.cyclesDone;
      }
    }
    return out;
  }

  // dzuz_sedmicno
  let juzState = { juzs: femiRow.items, juzIndex: femiRow.juzIndex || 0, cycleStart: femiRow.cycleStart, cyclesDone: femiRow.cyclesDone || 0 };
  const lastRepeatByPage = new Map();
  const lastRepeatOf = (p) => lastRepeatByPage.get(p) || femiRow.pageProgress?.get(p)?.last_repeat || null;

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const data = juzWeeklyToday(juzState, lastRepeatOf, date);
    out.push({ date, kind: "dzuz_sedmicno", data: { ...data, planned: data.pages } });
    if (data.pages.length) {
      for (const p of data.pages) lastRepeatByPage.set(p, date);
      juzState = completeJuzWeek(juzState, lastRepeatOf, date, data.pages);
    }
  }
  return out;
}

// ── INTERVALNE METODE (fibonacci/tri_dana/sedam_dana/srs) - OPTIMISTIČNA
//    projekcija: pretpostavlja da će svako ponavljanje proći bez greške.
//    blocks: niz redova iz review_blocks (engine.js oblik, camelCase).
//    NAPOMENA: block.nextReviewOn je od Motora B (sati) PUNI ISO timestamp,
//    ne datum - ovdje se grupiše po KALENDARSKOM danu (slice 0,10) radi
//    prikaza u dnevnoj projekciji. ────────────────────────────────────────
export function forecastIntervalBlocks(blocks, { days = DEFAULT_FORECAST_DAYS, startDate } = {}) {
  const horizon = addDays(startDate, days - 1);
  const byDate = new Map(); // date -> [{ blockId, label, items }]

  for (const block of blocks || []) {
    let cur = block;
    let guard = 0; // sigurnosna kočnica (max koraka po bloku) - sprječava beskonačnu petlju
    while (cur.nextReviewOn && cur.nextReviewOn.slice(0, 10) <= horizon && guard < 200) {
      guard++;
      const date = cur.nextReviewOn.slice(0, 10);
      if (date >= startDate) {
        if (!byDate.has(date)) byDate.set(date, []);
        byDate.get(date).push({ blockId: block.id, label: block.label, items: cur.items, method: cur.method });
      }
      cur = applyReview(cur, { result: "correct", at: cur.nextReviewOn });
    }
  }

  const out = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    out.push({ date, kind: "blocks", data: byDate.get(date) || [] });
  }
  return out;
}

// ── Dispečer: iz metode + dostupnih izvora podataka odabire pravu granu.
//    Vraća null za metode koje NEMAJU fiksni raspored unaprijed. ────────────
export function forecastReviewPlan(method, sources = {}, { days = DEFAULT_FORECAST_DAYS, startDate } = {}) {
  const opts = { days, startDate };
  if (method === "dzuzevi" || method === "stranice" || method === "seton") {
    return sources.rotationState ? forecastRotation(sources.rotationState, opts) : null;
  }
  if (method === "dinamicna") {
    return sources.rotationState ? forecastDinamicna(sources.rotationState, opts) : null;
  }
  if (method === "femi" || method === "dzuz_sedmica") {
    return sources.femiRow ? forecastFemiWeekly(sources.femiRow, opts) : null;
  }
  if (method === "fibonacci" || method === "tri_dana" || method === "sedam_dana" || method === "srs") {
    return sources.reviewBlocks ? forecastIntervalBlocks(sources.reviewBlocks, opts) : null;
  }
  // greske, novo_staro, nivo, slobodan, mualim - nema fiksnog rasporeda
  return null;
}
