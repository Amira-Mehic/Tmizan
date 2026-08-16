// ============================================================================
// Murajaa - Metoda na osnovu grešaka (pametno ponavljanje)
//
// Greške su signal: više grešaka → češće ponavljanje.
//   0 grešaka  → standardni interval
//   1–2 greške → ubrzo (za nekoliko dana)
//   3+ grešaka → dnevno, dok se ne stabilizuje (2 čista prolaza zaredom)
// Teška mjesta se markiraju za muallimov pregled; korisnik može i ručno
// označiti nesigurna mjesta bez formalnih grešaka.
// ============================================================================

import { addDays, daysBetween } from "./engine.js";

export const INTERVALI = {
  standard: 7, // 0 grešaka - sedmično
  ubrzo: 3,    // 1–2 greške
  dnevno: 1,   // 3+ grešaka
};

export const STABILIZACIJA_PROLAZA = 2; // čistih prolaza zaredom za povratak na standard

// ── Interval prema broju grešaka ────────────────────────────────────────────
export function intervalForErrors(errors) {
  if (errors >= 3) return INTERVALI.dnevno;
  if (errors >= 1) return INTERVALI.ubrzo;
  return INTERVALI.standard;
}

export function kategorija(errors) {
  if (errors >= 3) return "kriticno";
  if (errors >= 1) return "nesigurno";
  return "stabilno";
}

// ── Stanje jedne stavke (stranice ili ajeta) ────────────────────────────────
export function createItem({ ref, refType = "page", errors = 0, manualFlag = false, note = "" }) {
  return {
    ref,               // broj stranice ili verse_key
    refType,           // "page" | "verse"
    errors,            // ukupan broj grešaka u historiji
    recentErrors: errors, // greške u tekućem ciklusu (resetuju se stabilizacijom)
    cleanStreak: 0,    // uzastopni čisti prolazi
    manualFlag,        // korisnik ručno označio nesigurnost (npr. "miješam s 2:255")
    note,
    zaMualima: errors >= 3, // teška mjesta - markirana za muallimov pregled
    nextReviewOn: null,
  };
}

// ── Primjena rezultata ponavljanja ──────────────────────────────────────────
export function applyReview(item, { errors = 0, date }) {
  const clean = errors === 0;
  const cleanStreak = clean ? item.cleanStreak + 1 : 0;
  const totalErrors = item.errors + errors;

  // stabilizacija: dovoljno čistih prolaza → greške tekućeg ciklusa se brišu
  const stabilized = cleanStreak >= STABILIZACIJA_PROLAZA;
  const recentErrors = stabilized ? 0 : clean ? item.recentErrors : item.recentErrors + errors;

  const interval = intervalForErrors(recentErrors);

  return {
    ...item,
    errors: totalErrors,
    recentErrors,
    cleanStreak,
    zaMualima: item.zaMualima || recentErrors >= 3,
    nextReviewOn: addDays(date, interval),
  };
}

// ── Ručno označavanje nesigurnog mjesta ─────────────────────────────────────
// Čak i bez formalnih grešaka - tretira se kao 1–2 greške (ubrzano).
export function flagManual(item, { note = "", date }) {
  const recentErrors = Math.max(item.recentErrors, 1);
  return {
    ...item,
    manualFlag: true,
    note: note || item.note,
    recentErrors,
    cleanStreak: 0,
    nextReviewOn: date ? addDays(date, intervalForErrors(recentErrors)) : item.nextReviewOn,
  };
}

// ── Mapa slabih mjesta ──────────────────────────────────────────────────────
// Sortirano od najproblematičnijeg; muallim vidi istu mapu.
export function weakSpotMap(items) {
  return [...items]
    .filter((i) => i.errors > 0 || i.manualFlag)
    .sort((a, b) => b.errors - a.errors)
    .map((i) => ({
      ref: i.ref,
      refType: i.refType,
      errors: i.errors,
      kategorija: kategorija(i.recentErrors),
      manualFlag: i.manualFlag,
      note: i.note,
      zaMualima: i.zaMualima,
    }));
}

// ── Dnevni plan: šta je danas na redu ───────────────────────────────────────
// Problematične stavke ulaze u plan više puta (kritične imaju prioritet).
export function dailyPlan(items, today) {
  const due = items.filter((i) => i.nextReviewOn && i.nextReviewOn <= today);
  const kriticno = due.filter((i) => kategorija(i.recentErrors) === "kriticno");
  const ostalo = due.filter((i) => kategorija(i.recentErrors) !== "kriticno");
  // kritične stavke dva puta u danu (npr. jutro i večer)
  return { jutro: [...kriticno, ...ostalo], vecer: [...kriticno] };
}

// ============================================================================
// SKOR SLABOSTI - tačna formula iz dokumenta arhitekture, sekcija 4.11
// ("Metoda po greškama → SLOJ 2, nije metoda"). Ovo NIJE isti model kao
// gore (error_tracking/weakSpotMap ostaju netaknuti, i dalje ih koristi
// Dashboard/WeakSpotMap) - ovo računa isti skor NAD stranica_stanje
// podacima (page_progress), "uživo", bez čuvanja u bazi:
//
//   skor = (greske_zadnje × 3) + (5 − sigurnost_zadnje)
//        + (greske_prosjek_zadnja_3 × 2) + (dana_od_zadnjeg / 30)
//
// prag_ulaska: skor > 4 (stranica ulazi u red slabih)
// eskalacija:  skor > 10 → stranica ide na DNEVNI raspored + izbacuje se iz
//              Motora A u Motor B (SRS) - vidi motorTransition.js/shouldDemote
//              za sam prelazak; ovaj prag je NAMJERNO grublji (10 vs 3 greške)
//              jer kombinuje više signala, ne samo zadnje greške.
// ============================================================================

export const SKOR_PRAG_ULASKA = 4;
export const SKOR_PRAG_ESKALACIJE = 10;

// greskeZadnje: greške u zadnjem ponavljanju stranice
// sigurnostZadnja: samoocjena 1–5 iz zadnjeg ponavljanja
// greskeProsjek3: prosjek grešaka posljednja 3 ponavljanja (page_repeat_history)
// danaOdZadnjeg: koliko dana je prošlo od zadnjeg ponavljanja
export function skorSlabosti({ greskeZadnje = 0, sigurnostZadnja = 5, greskeProsjek3 = 0, danaOdZadnjeg = 0 }) {
  return (greskeZadnje * 3) + (5 - sigurnostZadnja) + (greskeProsjek3 * 2) + (danaOdZadnjeg / 30);
}

// U redu slabih (prag_ulaska) - koristi se za filtriranje/sortiranje reda
// slabih stranica u dnevnom generatoru (generisi_dan).
export function uReduSlabih(skor) {
  return skor > SKOR_PRAG_ULASKA;
}

// Eskalacija - dovoljno loše da ide na dnevni raspored + izlazi u Motor B.
export function trebaEskalaciju(skor) {
  return skor > SKOR_PRAG_ESKALACIJE;
}

// ── Skor jedne stranice iz SIROVIH podataka (page_progress + istorija) ─────
// historyErrorsDesc: niz brojeva grešaka iz page_repeat_history za tu
// stranicu, sortiran OD NAJNOVIJEG ka najstarijem (servisni sloj sortira).
// Čista funkcija - samo slaže ulaze za skorSlabosti(), ne zna za bazu.
export function skorStranice({ confidence, errors = 0, historyErrorsDesc = [], lastRepeat = null, today }) {
  const greskeZadnje = historyErrorsDesc.length ? historyErrorsDesc[0] : errors;
  const zadnjaTri = historyErrorsDesc.slice(0, 3);
  const greskeProsjek3 = zadnjaTri.length ? zadnjaTri.reduce((a, b) => a + b, 0) / zadnjaTri.length : 0;
  const sigurnostZadnja = confidence == null ? 5 : confidence;
  const danaOdZadnjeg = lastRepeat ? Math.max(0, daysBetween(lastRepeat, today)) : 0;
  return skorSlabosti({ greskeZadnje, sigurnostZadnja, greskeProsjek3, danaOdZadnjeg });
}
