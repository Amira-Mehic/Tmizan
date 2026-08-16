// ============================================================================
// Murajaa - Motor A: CIKLUS, nad datumom PO STRANICI
//
// Zamjenjuje raniji model, koji je držao niz stranica i poziciju kursora, sa
// modelom gdje SVAKA stranica ima svoj "sljedeće ponavljanje" datum - isti
// duh kao Motor B (review_blocks.next_review_on), samo za ciklus (fiksni
// razmak) umjesto za rastuće intervale.
//
// Zašto: prelazak "gradivo prošlo Motor B → ulazi u Motor A" (kad ga
// napravimo u Fazi 2) postaje samo promjena par kolona na ISTOM redu
// stranice u page_progress, umjesto brisanja iz jedne tabele i pisanja u
// drugu.
//
// Ulaz/izlaz ovih funkcija je čist niz { page, sljedeceP } - bez baze, bez
// UI-ja ("sljedeceP" = "YYYY-MM-DD" ili null ako stranica još nikad nije
// bila u ciklusu). Servisni sloj (rotationService.js) čita/piše ovo iz/u
// page_progress.sljedece_ponavljanje.
//
// "Jedinica" (za Sistem džuzeva: jedan džuz; za Šetonovu: jedan od 8
// dijelova) grupiše stranice koje ZAJEDNO dobijaju isti novi datum kad se
// odrade. "Po stranicama" nema jedinicu - svaka stranica se tretira
// pojedinačno (koristi duePages/completePages bez groupOf).
// ============================================================================

import { addDays } from "./engine.js";

// ── Podjela SORTIRANIH stranica na `parts` približno jednakih uzastopnih
//    grupa (koristi se za Šetonovu i za "Po stranicama"-kvotu). ─────────────
export function partitionPages(sortedPages, parts) {
  if (!sortedPages?.length) return [];
  if (!parts || parts < 1) throw new Error("Broj dijelova mora biti bar 1");
  const result = [];
  const base = Math.floor(sortedPages.length / parts);
  let remainder = sortedPages.length % parts;
  let start = 0;
  for (let i = 0; i < parts; i++) {
    const size = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    result.push(sortedPages.slice(start, start + size));
    start += size;
  }
  return result.filter((c) => c.length > 0);
}

// ── Inicijalno "zasijavanje" ciklusa - svaka GRUPA (units[i], već poredana
//    redoslijedom kojim ide kroz ciklus) dobija početni datum
//    startDate + i dana, tako da prvi prolaz kroz ciklus ima smisla (grupa
//    0 je "danas na redu", grupa 1 "sutra", itd. - isto razmicanje kao kod
//    Motora B). ─────────────────────────────────────────────────────────────
export function seedCycle(units, { startDate }) {
  if (!units?.length) throw new Error("Nema jedinica za zasijavanje ciklusa");
  const rows = [];
  units.forEach((pages, i) => {
    const date = addDays(startDate, i);
    for (const p of pages) rows.push({ page: p, sljedeceP: date });
  });
  return rows;
}

// ── Šta je danas na redu, GRUPISANO po jedinici (npr. po džuzu) ────────────
// groupOf(page) → id jedinice kojoj stranica pripada. Vraća Map<groupId,
// stranice[]> za sve jedinice čiji je sljedeceP <= danas (uključuje i
// zakašnjele - ništa se ne gubi, samo čeka dok se ne odradi).
export function dueGroups(pageStates, todayStr, groupOf) {
  const map = new Map();
  for (const ps of pageStates) {
    if (!ps.sljedeceP || ps.sljedeceP > todayStr) continue;
    const g = groupOf(ps.page);
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(ps.page);
  }
  for (const pages of map.values()) pages.sort((a, b) => a - b);
  return map;
}

// ── Sve pojedinačne stranice na redu, BEZ grupisanja (za "Po stranicama") ──
export function duePages(pageStates, todayStr) {
  return pageStates
    .filter((ps) => ps.sljedeceP && ps.sljedeceP <= todayStr)
    .map((ps) => ps.page)
    .sort((a, b) => a - b);
}

// ── Odradi date stranice danas → svima njima postavi novi datum (danas +
//    dužina ciklusa u danima). Radi i za grupu (sve stranice jedne
//    jedinice) i za slobodan skup stranica (kvota). ─────────────────────────
export function completePages(pageStates, pagesDone, todayStr, ciklusDana) {
  if (!ciklusDana || ciklusDana < 1) throw new Error("Ciklus mora trajati bar 1 dan");
  const done = new Set(pagesDone);
  const nextDate = addDays(todayStr, ciklusDana);
  return pageStates.map((ps) =>
    done.has(ps.page) ? { ...ps, sljedeceP: nextDate } : ps
  );
}

// ── Normalizacija "šta je danas" rezultata (rotationToday/femiWeekToday, koji
//    imaju različite oblike po tipu - dzuzevi/seton/stranice/dinamicna vraćaju
//    `.pages`, femi/dzuz_sedmicno vraćaju `.planned`) u RAVAN niz pojedinačnih
//    stranica - ulaz za generisi_dan() (Sloj 3). Čista funkcija, ne zna ništa
//    o bazi; servisni sloj (rotationService.js) je poziva za svaki aktivan
//    Motor A red i spaja rezultate. ────────────────────────────────────────
export function flattenMotorAToday(result) {
  if (!result) return [];
  const pages = result.pages || result.planned || [];
  return pages.map((page) => ({ ref: page, refType: "page", kind: result.kind }));
}
