// ============================================================================
// Murajaa - Femi bi-ševk (فمي بشوق) i "Džuz kroz sedmicu"
//
// UVID (iz arhitekturne rasprave): matematički, "rasporedi ostatak na
// preostale dane sedmice" (femi) je ISTA formula kao Dinamična raspodjela
// (dinamicna.js) - samo s dužinom ciklusa fiksiranom na 7 dana. Zato Femi
// bi-ševk NIJE poseban motor: to je Dinamična raspodjela sa
// cycleLengthDays = 7. Ovaj fajl samo poziva dinamicna.js s tim parametrom
// - nema svoje matematike.
//
// "Džuz kroz sedmicu" je isto to, ali bazen NIJE sve što korisnik zna nego
// SAMO stranice trenutno aktivnog džuza (kružno kroz naučene džuzeve, jedan
// džuz po sedmici). Ovaj fajl dodaje samo taj mali omotač: koji je džuz
// trenutno na redu, i prelazak na sljedeći kad se sedmica zatvori (wrap).
// ============================================================================

import { getJuzPages } from "../../constants/hifz/helpers.js";
import { dinamicnaToday, completeDinamicnaCycle } from "./dinamicna.js";

export const DANA_U_SEDMICI = 7;

// ── FEMI BI-ŠEVK - direktan alias Dinamične sa ciklusom od 7 dana ──────────
export function femiToday(pages, { cycleStart } = {}, lastRepeatOf, todayStr) {
  return dinamicnaToday(pages, { cycleStart, cycleLengthDays: DANA_U_SEDMICI }, lastRepeatOf, todayStr);
}

export function completeFemiWeek(pages, { cycleStart, cyclesDone = 0 } = {}, lastRepeatOf, todayStr, donePages) {
  return completeDinamicnaCycle(pages, { cycleStart, cyclesDone, cycleLengthDays: DANA_U_SEDMICI }, lastRepeatOf, todayStr, donePages);
}

// ── DŽUZ KROZ SEDMICU - isto, ali bazen je SAMO trenutni džuz ──────────────
// state: { juzs: [naučeni džuzevi, sortirano], juzIndex, cycleStart, cyclesDone }
export function createJuzWeeklyState(learnedJuzs) {
  if (!learnedJuzs?.length) throw new Error("Unesi bar jedan naučeni džuz");
  return {
    juzs: [...learnedJuzs].sort((a, b) => a - b),
    juzIndex: 0,
    cycleStart: null,
    cyclesDone: 0,
  };
}

export function currentJuzPages(state) {
  const juz = state.juzs[state.juzIndex];
  return { juz, pages: getJuzPages(juz) };
}

export function juzWeeklyToday(state, lastRepeatOf, todayStr) {
  const { juz, pages } = currentJuzPages(state);
  const today = dinamicnaToday(pages, { cycleStart: state.cycleStart, cycleLengthDays: DANA_U_SEDMICI }, lastRepeatOf, todayStr);
  return { ...today, juz };
}

// Zaključi sedmicu - ako je time džuz gotov (wrap), pređi na SLJEDEĆI
// naučeni džuz (kružno) i resetuj ciklus na danas.
export function completeJuzWeek(state, lastRepeatOf, todayStr, donePages) {
  const { pages } = currentJuzPages(state);
  const params = completeDinamicnaCycle(
    pages,
    { cycleStart: state.cycleStart, cyclesDone: state.cyclesDone, cycleLengthDays: DANA_U_SEDMICI },
    lastRepeatOf, todayStr, donePages
  );
  const wrapped = params.cyclesDone > state.cyclesDone;
  if (!wrapped) return { ...state, cycleStart: params.cycleStart };

  const nextIndex = (state.juzIndex + 1) % state.juzs.length;
  return { ...state, juzIndex: nextIndex, cycleStart: todayStr, cyclesDone: params.cyclesDone };
}
