// ============================================================================
// Murajaa - "kojim tempom želiš ponavljati". Radi za BILO KOJI opseg (cijeli
// Kur'an/hafiz, odabrani džuzevi, odabrane sure, ili ručno unesene stranice)
// - poziv prosljeđuje totalPagesInScope (veličinu TOG opsega u stranicama);
// bez tog argumenta podrazumijeva se cijeli Kur'an (604), što čuva stari
// "hafiz" izračun netaknutim.
//
// Korisnik u wizardu bira DVIJE stvari:
//   1) JEDINICU u kojoj razmišlja - džuzevi / sure / stranice
//   2) NAČIN unosa tempa:
//        "broj"    - koliko [jedinica] želi ponoviti SVAKI DAN
//        "vrijeme" - za koliko DANA želi ponoviti CIJELI Kur'an
//
// Ovaj modul to pretvara u ono što motorima ponavljanja stvarno treba:
//   - dailyQtyPages - dnevna količina u STRANICAMA (sve metode ispod haube
//                     rade sa stranicama, jedinica je samo ugodniji unos)
//   - totalDays     - za koliko dana bi se, tim tempom, prošao cijeli Kur'an
//
// I vraća koje od 16 metoda odgovaraju odabranoj JEDINICI:
//   - "fleksibilne" metode (Po stranicama, Dinamična, Fibonacci, Tri dana,
//     Sedam dana, SRS) prilagođavaju SVOJ tempo bilo kojoj jedinici/količini
//     (vidi seedMethodEngine u HifzPlannerPage.jsx - tu se dailyQtyPages/
//     totalDays stvarno i koriste za podešavanje kvote/ciklusa/veličine bloka).
//   - "native" metode imaju SVOJ fiksni, ugrađeni tempo (Sistem džuzeva radi
//     uvijek tačno 1 džuz dnevno; Šetonova uvijek dijeli na 8 dijelova;
//     Femi/Džuz sedmično uvijek rade po sedmici) - te se nude
//     SAMO kad izabrana jedinica prirodno odgovara toj metodi, ali se njihov
//     unutrašnji tempo ne mijenja (to bi bila druga izmjena, van ovog kruga).
// ============================================================================

export const TOTAL_PAGES = 604;
export const TOTAL_JUZ = 30;
export const TOTAL_SURE = 114;

export const TEMPO_UNITS = ["dzuzevi", "sure", "stranice"];
export const TEMPO_MODES = ["broj", "vrijeme"];

const UNIT_TOTALS = { dzuzevi: TOTAL_JUZ, sure: TOTAL_SURE, stranice: TOTAL_PAGES };
const UNIT_TO_PAGES_FACTOR = { dzuzevi: TOTAL_PAGES / TOTAL_JUZ, sure: TOTAL_PAGES / TOTAL_SURE, stranice: 1 };

// Metode koje se PRILAGOĐAVAJU bilo kojem tempu (mijenjamo im parametre).
export const FLEXIBLE_METHODS = ["stranice", "dinamicna", "fibonacci", "tri_dana", "sedam_dana", "srs"];

// Metode koje prirodno "govore" tom jedinicom, ali zadržavaju svoj fiksni,
// ugrađeni tempo (ne mijenjamo ih ovaj put).
const UNIT_NATIVE_METHODS = {
  dzuzevi: ["dzuzevi", "dzuz_sedmica"],
  sure: [],
  stranice: ["seton", "femi"],
};

// ── Koje metode se nude za odabranu jedinicu ────────────────────────────────
export function compatibleMethods(unit) {
  const native = UNIT_NATIVE_METHODS[unit];
  if (!native) throw new Error(`Nepoznata jedinica: ${unit}`);
  return [...native, ...FLEXIBLE_METHODS];
}

// ── Iz (jedinica, način, količina) izračunaj dnevnu količinu STRANICA
//    i broj dana da se ponovi cijeli Kur'an tim tempom ─────────────────────
// mode "broj":    quantity = [jedinica] po danu (npr. 2 džuza dnevno)
// mode "vrijeme": quantity = broj DANA da se ponovi CIJELI OPSEG (UI je
//                 odgovoran da sedmice/mjesece prije poziva pretvori u dane)
// totalPagesInScope: veličina opsega koji se ponavlja (npr. broj stranica u
//   odabranim džuzevima/surama/ručnom unosu); bez ovog argumenta = cijeli
//   Kur'an (604) - stari "hafiz" izračun.
export function computeTempo({ unit, mode, quantity, totalPagesInScope = TOTAL_PAGES }) {
  if (!UNIT_TOTALS[unit]) throw new Error(`Nepoznata jedinica: ${unit}`);
  if (!TEMPO_MODES.includes(mode)) throw new Error(`Nepoznat način: ${mode}`);
  if (!quantity || quantity <= 0) throw new Error("Količina mora biti pozitivan broj");
  const totalPages = totalPagesInScope > 0 ? totalPagesInScope : TOTAL_PAGES;

  if (mode === "broj") {
    const factor = UNIT_TO_PAGES_FACTOR[unit];
    const dailyQtyPages = Math.max(1, Math.round(quantity * factor));
    const totalDays = Math.max(1, Math.ceil(totalPages / dailyQtyPages));
    return { dailyQtyPages, totalDays };
  }

  // mode === "vrijeme"
  const totalDays = Math.max(1, Math.round(quantity));
  const dailyQtyPages = Math.max(1, Math.ceil(totalPages / totalDays));
  return { dailyQtyPages, totalDays };
}

// ── Predložena (prefill) vrijednost za unos "broj po danu" - cijeli OPSEG
//    uveden kroz otprilike mjesec dana. Prikazuje se KAO BROJ u polju za
//    unos (korisnik ga vidi i može promijeniti), ne kao skrivena magija.
//    totalPagesInScope: isto kao u computeTempo - bez njega, cijeli Kur'an. ─
export function suggestedDailyQty(unit, totalPagesInScope = TOTAL_PAGES) {
  if (!UNIT_TOTALS[unit]) throw new Error(`Nepoznata jedinica: ${unit}`);
  const totalPages = totalPagesInScope > 0 ? totalPagesInScope : TOTAL_PAGES;
  const totalUnitsInScope = totalPages / UNIT_TO_PAGES_FACTOR[unit];
  return Math.max(1, Math.round(totalUnitsInScope / 30));
}
