// ============================================================================
// Murajaa - Metoda novog i starog (dvostruka sesija)
//
// Dnevna sesija se dijeli na dva dijela:
//   NOVO  - naučeno u zadnjih 7–14 dana (da ne izgori iz kratkoročnog pamćenja)
//   STARO - naučeno prije više od 30 dana (osvježavanje dubokog znanja)
// Svakom pripada otprilike polovina raspoloživog vremena.
// ============================================================================

import { daysBetween } from "./engine.js";

export const NOVO_MAX_DANA = 14;
export const STARO_MIN_DANA = 30;
export const STARO_UPOZORENJE_DANA = 30; // "staro" neponovljeno duže od 30 dana

// ── Podjela materijala na novo / srednje / staro ────────────────────────────
// blocks: [{ learnedOn, lastReviewedOn?, ... }], today: "YYYY-MM-DD"
export function classify(blocks, today) {
  const novo = [];
  const srednje = [];
  const staro = [];

  for (const b of blocks) {
    const age = daysBetween(b.learnedOn, today);
    if (age <= NOVO_MAX_DANA) novo.push(b);
    else if (age > STARO_MIN_DANA) staro.push(b);
    else srednje.push(b);
  }
  return { novo, srednje, staro };
}

// ── Dnevna sesija: dva odvojena bloka ───────────────────────────────────────
// Novo: najsvježije prvo. Staro: najduže neponovljeno prvo (najhitnije).
export function dailySession(blocks, today) {
  const { novo, staro } = classify(blocks, today);

  const sortedNovo = [...novo].sort((a, b) => b.learnedOn.localeCompare(a.learnedOn));
  const sortedStaro = [...staro].sort((a, b) => {
    const ra = a.lastReviewedOn || a.learnedOn;
    const rb = b.lastReviewedOn || b.learnedOn;
    return ra.localeCompare(rb);
  });

  return {
    novo: sortedNovo,
    staro: sortedStaro,
    // otprilike polovina vremena svakom dijelu
    raspodjelaVremena: { novo: 0.5, staro: 0.5 },
  };
}

// ── Koliko je prošlo od zadnjeg ponavljanja ─────────────────────────────────
export function daysSinceReview(block, today) {
  return daysBetween(block.lastReviewedOn || block.learnedOn, today);
}

// ── Upozorenja: "stari" blokovi neponovljeni duže od 30 dana ────────────────
export function warnings(blocks, today) {
  const { staro } = classify(blocks, today);
  return staro
    .filter((b) => daysSinceReview(b, today) > STARO_UPOZORENJE_DANA)
    .map((b) => ({
      block: b,
      daysSince: daysSinceReview(b, today),
      poruka: `Blok "${b.label || b.learnedOn}" nije ponavljan ${daysSinceReview(b, today)} dana`,
    }))
    .sort((a, b) => b.daysSince - a.daysSince);
}
