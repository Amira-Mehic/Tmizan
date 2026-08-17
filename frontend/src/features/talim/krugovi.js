// ============================================================================
// Ta'lim - Bosanska metoda krugova (20 krugova)
//
// Kur'an se dijeli na 20 'krugova' po 30 stranica: krug 1 = zadnje stranice
// svakog džuza, krug 2 = pretposljednje, itd. Sa svakim novim krugom
// ponavljaju se prethodni - učenje i ponavljanje su spojeni.
// Datum završetka je PROCJENA (na osnovu strukture 30 str./krug).
//
// Koriste se stvarne granice džuzeva (džuz 1 ima 21, džuz 30 ima 23
// stranice), pa krugovi rade s tačnim brojevima stranica iz mushafa.
// ============================================================================

import { getJuzPages } from "../../constants/hifz/helpers.js";

export const TOTAL_KRUGOVA = 20;

// ── Stranica džuza j za krug k = k-ta stranica OD KRAJA tog džuza ───────────
export function krugPage(juzNo, krug) {
  const pages = getJuzPages(juzNo);
  const idx = pages.length - krug;
  return idx >= 0 ? pages[idx] : null;
}

// ── Sve stranice jednog kruga (30 džuzeva → do 30 stranica) ─────────────────
export function krugPages(krug) {
  if (krug < 1 || krug > TOTAL_KRUGOVA) throw new Error(`Krug mora biti 1–${TOTAL_KRUGOVA}`);
  const result = [];
  for (let j = 1; j <= 30; j++) {
    const p = krugPage(j, krug);
    if (p !== null) result.push({ juz: j, page: p });
  }
  return result;
}

// ── Preostale stranice van 20 krugova ───────────────────────────────────────
// Džuz 1 (21 str.) i džuz 30 (23 str.) imaju višak - te stranice se uče
// nakon 20. kruga, kao završni dio.
export function extraPages() {
  const extra = [];
  for (const j of [1, 30]) {
    const pages = getJuzPages(j);
    const viskova = pages.length - TOTAL_KRUGOVA;
    for (let i = 0; i < viskova; i++) extra.push({ juz: j, page: pages[i] });
  }
  return extra.sort((a, b) => a.page - b.page);
}

// ── Stanje napretka kroz krugove ────────────────────────────────────────────
export function createProgress() {
  return { krug: 1, juzIndex: 0, finishedKrugovi: false, extraIndex: 0, finished: false };
}

// ── Dnevni zadatak ──────────────────────────────────────────────────────────
// Uči se stranica iz tekućeg kruga; PRAVILO: uz nju se ponavljaju stranice
// ISTOG džuza iz svih prethodnih krugova (krug-1 ... 1).
export function todayTask(state) {
  if (state.finished) return null;

  // završna faza: višak stranica van 20 krugova
  if (state.finishedKrugovi) {
    const extra = extraPages();
    const item = extra[state.extraIndex];
    return item ? { learn: item, review: [], faza: "zavrsna" } : null;
  }

  const krug = krugPages(state.krug);
  const item = krug[state.juzIndex];
  if (!item) return null;

  const review = [];
  for (let k = state.krug - 1; k >= 1; k--) {
    const p = krugPage(item.juz, k);
    if (p !== null) review.push({ juz: item.juz, page: p, krug: k });
  }

  return { learn: { ...item, krug: state.krug }, review, faza: "krugovi" };
}

// ── Označavanje odrađenog dana ──────────────────────────────────────────────
export function completeDay(state) {
  if (state.finished) return state;

  if (state.finishedKrugovi) {
    const nextExtra = state.extraIndex + 1;
    return { ...state, extraIndex: nextExtra, finished: nextExtra >= extraPages().length };
  }

  const krug = krugPages(state.krug);
  const nextJuz = state.juzIndex + 1;

  if (nextJuz < krug.length) return { ...state, juzIndex: nextJuz };

  // krug završen → sljedeći krug
  const nextKrug = state.krug + 1;
  if (nextKrug <= TOTAL_KRUGOVA) return { ...state, krug: nextKrug, juzIndex: 0 };

  // svih 20 krugova gotovo → završna faza (višak stranica)
  return { ...state, finishedKrugovi: true, extraIndex: 0 };
}

// ── Napredak ────────────────────────────────────────────────────────────────
export function progressInfo(state) {
  const perKrug = 30;
  const doneDays = state.finishedKrugovi
    ? TOTAL_KRUGOVA * perKrug + state.extraIndex
    : (state.krug - 1) * perKrug + state.juzIndex;
  const totalDays = TOTAL_KRUGOVA * perKrug + extraPages().length;
  return {
    krug: state.finishedKrugovi ? TOTAL_KRUGOVA : state.krug,
    dan: doneDays,
    ukupnoDana: totalDays,
    percent: Math.round((doneDays / totalDays) * 100),
  };
}

// Procjena preostalih dana (1 stranica učenja dnevno po strukturi metode)
export function estimateDaysLeft(state) {
  const info = progressInfo(state);
  return info.ukupnoDana - info.dan;
}
