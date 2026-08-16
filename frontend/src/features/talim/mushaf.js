// ============================================================================
// Ta'lim - model mushafa (Korak 1 i 2 generatora)
// Sve se mjeri u REDOVIMA mushafa, jer je red jedina mjera jednaka za sve;
// dužina ajeta varira (pola reda do cijele stranice).
//
// Izdanje mushafa određuje broj redova po stranici → od toga se računa
// cijeli plan (stranica, sura, džuz → broj redova).
// ============================================================================

import { SURA_DATA } from "../../constants/hifz/SURA_DATA.js";
import { getJuzPages } from "../../constants/hifz/helpers.js";

export const TOTAL_PAGES = 604;

// ── Korak 1: izdanja mushafa ────────────────────────────────────────────────
export const MUSHAF_EDITIONS = {
  medina_15: { id: "medina_15", naziv: "Medinski (15 redova)", linesPerPage: 15 },
  medina_16: { id: "medina_16", naziv: "Medinski (16 redova)", linesPerPage: 16 },
  indo_13:   { id: "indo_13",   naziv: "Indo-pakistanski (13 redova)", linesPerPage: 13 },
};

export function getEdition(editionId) {
  const e = MUSHAF_EDITIONS[editionId];
  if (!e) throw new Error(`Nepoznato izdanje mushafa: ${editionId}`);
  return e;
}

// ── Korak 2: opseg učenja → lista stranica ──────────────────────────────────
// scope oblici:
//   { type: "cijeli" }
//   { type: "dzuzevi",  dzuzevi: [1, 2, 30] }
//   { type: "sure",     sure: [36, 67] }        (surah id 1–114)
//   { type: "stranice", from: 100, to: 120 }
//   { type: "kombinovano", parts: [ ...bilo koji od gornjih oblika... ] }
//     - korisnik istovremeno bira više opsega (npr. 2 džuza + sura + raspon);
//     stranice svih dijelova se sjedine (unija, bez duplikata).
export function scopeToPages(scope) {
  switch (scope?.type) {
    case "cijeli":
      return Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

    case "kombinovano": {
      if (!scope.parts?.length) throw new Error("Odaberi bar jedan opseg");
      const pages = new Set();
      scope.parts.forEach((part) => scopeToPages(part).forEach((p) => pages.add(p)));
      return [...pages].sort((a, b) => a - b);
    }

    case "dzuzevi": {
      if (!scope.dzuzevi?.length) throw new Error("Odaberi bar jedan džuz");
      const pages = new Set();
      for (const j of scope.dzuzevi) {
        // Number.isInteger(NaN) je false - hvata i nevažeći tekstualni unos
        // (npr. "w"), koji bi inače prošao provjeru j<1||j>30 jer su oba false za NaN
        if (!Number.isInteger(j) || j < 1 || j > 30) throw new Error(`Nepostojeći džuz: ${j}`);
        getJuzPages(j).forEach((p) => pages.add(p));
      }
      return [...pages].sort((a, b) => a - b);
    }

    case "sure": {
      if (!scope.sure?.length) throw new Error("Odaberi bar jednu suru");
      const pages = new Set();
      for (const id of scope.sure) {
        const s = SURA_DATA.find((x) => x.id === id);
        if (!s) throw new Error(`Nepostojeća sura: ${id}`);
        for (let p = s.startPage; p <= s.endPage; p++) pages.add(p);
      }
      return [...pages].sort((a, b) => a - b);
    }

    case "stranice": {
      const { from, to, extra } = scope;
      if (!from || !to || from < 1 || to > TOTAL_PAGES || from > to)
        throw new Error(`Neispravan raspon stranica: ${from}–${to}`);
      const pages = new Set(Array.from({ length: to - from + 1 }, (_, i) => from + i));
      // dodatne pojedinačne stranice / raspon(i) upisani ručno (npr. "5, 12, 40-45"),
      // uz postojeći Od–Do raspon - ne mijenja ponašanje kad extra nije prisutan
      if (Array.isArray(extra)) {
        extra.forEach((p) => { if (p >= 1 && p <= TOTAL_PAGES) pages.add(p); });
      }
      return [...pages].sort((a, b) => a - b);
    }

    default:
      throw new Error(`Nepoznat tip opsega: ${scope?.type}`);
  }
}

// ── Ukupno redova za opseg ──────────────────────────────────────────────────
// Napomena: prve dvije stranice mushafa imaju manje redova; za plan koristimo
// aproksimaciju punih stranica (dovoljno precizno za procjenu datuma).
export function scopeToLines(scope, editionId) {
  const pages = scopeToPages(scope);
  return pages.length * getEdition(editionId).linesPerPage;
}

// ── Pretvaranje tempa u redove dnevno ───────────────────────────────────────
// tempo: { amount: 3, unit: "redovi" | "stranice", per: "dan" | "sedmica" | "mjesec" }
export function tempoToLinesPerDay(tempo, editionId) {
  const { linesPerPage } = getEdition(editionId);
  if (!tempo || !tempo.amount || tempo.amount <= 0) throw new Error("Tempo mora biti veći od 0");

  const lines = tempo.unit === "stranice" ? tempo.amount * linesPerPage : tempo.amount;
  const perDays = { dan: 1, sedmica: 7, mjesec: 30 }[tempo.per];
  if (!perDays) throw new Error(`Nepoznat period: ${tempo.per}`);
  return lines / perDays;
}

// ── Opis pozicije reda unutar stranice ──────────────────────────────────────
// Globalni red (0-bazirano od početka opsega) → { page, line } (1-bazirano)
export function lineToPosition(globalLine, pages, editionId) {
  const { linesPerPage } = getEdition(editionId);
  const pageIndex = Math.floor(globalLine / linesPerPage);
  if (pageIndex >= pages.length) return null;
  return { page: pages[pageIndex], line: (globalLine % linesPerPage) + 1 };
}
