// ============================================================================
// Murajaa - Dinamična raspodjela (auto-rebalans po stvarnom vremenu/tempu)
//
// Za razliku od fiksne dnevne kvote ("Po stranicama"), ovdje se dnevna kvota
// stranica IZNOVA računa svaki dan:
//
//   dnevna kvota = koliko stranica je OSTALO NEODRAĐENO u tekućem ciklusu
//                  / koliko dana je OSTALO do kraja ciklusa
//
// Ciklus je podrazumijevano dug 30 dana. Ako korisnik jedan dan uradi više
// ili manje, ili preskoči dan u potpunosti, sljedeći put kad se kvota
// izračuna ona se automatski prilagodi stvarnom stanju - bez "kažnjavanja".
//
// PER-STRANICA MODEL: ovdje se, za razliku od Sistema džuzeva/Šetonove, NE
// koristi sljedece_ponavljanje po stranici - koristi se POSTOJEĆE polje
// page_progress.last_repeat ("zadnje ponavljanje"): stranica je "odrađena
// ovaj ciklus" ako je last_repeat >= cycleStart. cycleStart/cyclesDone su
// mali PARAMETRI plana (i dalje u rotation_state, ne po stranici).
//
// Ovo je NAMJERNO odvojeno od Femi bi-ševk (femi.js) - dijele istu
// opću ideju ("rasporedi stranice kroz vrijeme"), ali femi radi na FIKSNOJ
// sedmici od 7 dana i unaprijed dijeli sve stranice na 7 dijelova, dok
// dinamična metoda svaki dan iznova računa kvotu na osnovu proteklog
// vremena i stvarnog tempa.
// ============================================================================

import { daysBetween } from "./engine.js";

export const DEFAULT_CYCLE_DAYS = 30;

// ── Dinamički izračunata dnevna kvota + stranice za danas ───────────────────
// pages: SVE stranice u bazenu (bilo kojim redoslijedom, sortira se ovdje).
// params: { cycleStart, cycleLengthDays } - cycleStart može biti null (prvi
//   put, postavlja se na todayStr).
// lastRepeatOf(page): vrati "YYYY-MM-DD" zadnjeg ponavljanja te stranice, ili
//   null ako nikad nije ponovljena.
export function dinamicnaToday(pages, { cycleStart, cycleLengthDays = DEFAULT_CYCLE_DAYS } = {}, lastRepeatOf, todayStr) {
  if (!pages?.length) throw new Error("Nema stranica za raspodjelu");
  if (!cycleLengthDays || cycleLengthDays < 1) throw new Error("Ciklus mora trajati bar 1 dan");

  const start = cycleStart || todayStr;
  const remainingPages = [...pages]
    .filter((p) => {
      const lr = lastRepeatOf(p);
      return !lr || lr < start;
    })
    .sort((a, b) => a - b);

  if (!remainingPages.length) {
    // Sve je odrađeno u ovom ciklusu - čeka se da se ciklus zvanično zatvori
    // (vidi completeDinamicnaCycle), ali "danas" nema šta da se prikaže.
    return { pages: [], jutro: [], vecer: [], dnevnaKvota: 0, daysLeft: 0, remaining: 0, cycleStart: start };
  }

  const elapsed = Math.max(0, daysBetween(start, todayStr));
  const daysLeft = Math.max(1, cycleLengthDays - elapsed);
  const dnevnaKvota = Math.max(1, Math.min(remainingPages.length, Math.ceil(remainingPages.length / daysLeft)));
  const todayPages = remainingPages.slice(0, dnevnaKvota);
  const half = Math.ceil(todayPages.length / 2);

  return {
    pages: todayPages,
    jutro: todayPages.slice(0, half),
    vecer: todayPages.slice(half),
    dnevnaKvota,
    daysLeft,
    remaining: remainingPages.length,
    cycleStart: start,
  };
}

// ── Zaključi dan → provjeri je li ciklus time završen (ništa više
//    neodrađeno), ako jeste - novi ciklus kreće danas. Ne piše last_repeat
//    stranica (to radi servisni sloj, isto kao i za Tracker) - samo vraća
//    ažurirane PARAMETRE ciklusa (cycleStart/cyclesDone). ───────────────────
export function completeDinamicnaCycle(pages, { cycleStart, cyclesDone = 0, cycleLengthDays = DEFAULT_CYCLE_DAYS } = {}, lastRepeatOf, todayStr, donePages) {
  const start = cycleStart || todayStr;
  const doneSet = new Set(donePages || []);
  const stillRemaining = pages.filter((p) => {
    if (doneSet.has(p)) return false;
    const lr = lastRepeatOf(p);
    return !lr || lr < start;
  });
  const wrapped = stillRemaining.length === 0;

  return {
    cycleStart: wrapped ? todayStr : start,
    cyclesDone: cyclesDone + (wrapped ? 1 : 0),
    cycleLengthDays,
  };
}
