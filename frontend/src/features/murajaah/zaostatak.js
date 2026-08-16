// ============================================================================
// Murajaa - pravila zaostatka (dokument arhitekture, sekcija 8): Motor B
// gomilanje i povratak nakon duže pauze. Čista logika - UI (Dashboard)
// odlučuje KAKO prikazati dijalog, ova funkcija samo kaže KADA i ŠTA nuditi.
// ============================================================================

import { daysBetween } from "./engine.js";

export const MAX_PRIKAZ_STAVKI = 200; // "NIKAD ne prikaži 200 stavki" - ovo je gornja granica
export const PREKORACENJE_FAKTOR = 3;  // zaostatak > 3× dnevne kvote → traži odluku
export const DUZA_PAUZA_DANA = 14;     // "ako korisnik nije ušao > 14 dana"
export const MAX_NADOKNADA_FAKTOR = 1.5; // nadoknada nikad ne prekorači 1.5× normalne kvote/dan

// ── Motor B: da li je zaostatak dovoljno velik da traži izbor od korisnika ──
export function zaostatakStatus(dueCount, dnevnaKvota) {
  const prekoracen = dnevnaKvota > 0 && dueCount > dnevnaKvota * PREKORACENJE_FAKTOR;
  return {
    prekoracen,
    prikaz: Math.min(dueCount, MAX_PRIKAZ_STAVKI),
    sakriveno: Math.max(0, dueCount - MAX_PRIKAZ_STAVKI),
  };
}

// ── Motor A: nadoknada zaostatka - nikad preko 1.5× normalne kvote/dan ──────
export function maxNadoknada(dnevnaKvota) {
  return Math.floor(dnevnaKvota * MAX_NADOKNADA_FAKTOR);
}

// ── Povratak nakon pauze ─────────────────────────────────────────────────
export function danaOdZadnjeg(lastVisitDate, today) {
  if (!lastVisitDate) return 0;
  return Math.max(0, daysBetween(lastVisitDate, today));
}

export function trebaLaganiPovratakEkran(lastVisitDate, today) {
  return danaOdZadnjeg(lastVisitDate, today) > DUZA_PAUZA_DANA;
}

// "Lagani povratak" - 5 dana na pola tempa (jedna od 3 opcije na ekranu
// "Dobro došao nazad").
export function laganiPovratakKvota(normalnaKvota) {
  return Math.max(1, Math.round(normalnaKvota / 2));
}
export const LAGANI_POVRATAK_DANA = 5;
