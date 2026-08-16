// ============================================================================
// Murajaa - intervalni motor ponavljanja (čista logika, bez UI i bez baze)
//
// Pojmovi:
//   jedinica - red / ajet / stranica / sura / džuz (unit_type)
//   blok     - ono što je naučeno određenog dana; cijeli blok zajedno
//              prolazi kroz odabranu metodu ponavljanja
//
// Motor je jedan; metode (tri_dana, sedam_dana, fibonacci, srs) su samo
// konfiguracije u methods.js.
// ============================================================================

import { METHODS } from "./methods.js";

export const UNIT_TYPES = ["red", "ajet", "stranica", "sura", "dzuz"];

// ── Pomoćne funkcije za datume (radimo samo s "YYYY-MM-DD" stringovima) ──────
// VAŽNO: ne koristimo toISOString() jer prebacuje u UTC pa u našoj vremenskoj
// zoni (UTC+1/+2) datum sklizne dan unazad. Radimo s lokalnim komponentama.
function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return fmt(date);
}

export function daysBetween(fromStr, toStr) {
  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);
  const a = new Date(fy, fm - 1, fd);
  const b = new Date(ty, tm - 1, td);
  return Math.round((b - a) / 86400000);
}

// ── SATI - Motor B (review_blocks) radi nad PUNIM ISO timestampom, ne samo
//    datumom (vidi dokument arhitekture 1.2/4.6-4.10: "tabela_intervala u
//    SATIMA"). addDays/daysBetween iznad ostaju nedirnuti - Motor A
//    (motorA.js/dinamicna.js) i dalje rade nad datumima, ne satima. ─────────
export function addHours(isoStr, hours) {
  return new Date(new Date(isoStr).getTime() + hours * 3600000).toISOString();
}

export function hoursBetween(fromIso, toIso) {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 3600000;
}

// ── Kreiranje novog bloka ────────────────────────────────────────────────────
// learnedOn: datum ("YYYY-MM-DD") - i dalje se čuva, koristi ga npr.
//   novoStaro.js (klasifikacija novo/srednje/staro, dan-preciznost je dovoljna).
// learnedAt: ISO timestamp trenutka učenja - anchor za SATNI motor B. Ako
//   nije eksplicitno dat (stari pozivaoci i dalje šalju samo learnedOn),
//   izvodi se kao podne (UTC) tog dana - predvidljivo i dovoljno precizno
//   dok korisnik ne unosi tačno vrijeme učenja.
export function createBlock({ unitType, items, label, learnedOn, learnedAt, methodId }) {
  const method = METHODS[methodId];
  if (!method) throw new Error(`Nepoznata metoda: ${methodId}`);
  if (!UNIT_TYPES.includes(unitType)) throw new Error(`Nepoznata jedinica: ${unitType}`);
  if (!items || items.length === 0) throw new Error("Blok mora imati bar jednu stavku");

  const at = learnedAt || `${learnedOn}T12:00:00.000Z`;

  const base = {
    unitType,
    items,
    label: label || "",
    learnedOn,
    learnedAt: at,
    method: methodId,
    lastResult: null,
    finished: false,
  };

  if (method.type === "levels") {
    // SRS: tek naučeno = nivo 1, ponavlja se za levelIntervals[1] sati
    const level = method.minLevel;
    return { ...base, step: 0, srsLevel: level, nextReviewOn: addHours(at, method.levelIntervals[level]) };
  }

  // sequence: step 0, sljedeće ponavljanje za intervals[0] sati
  return { ...base, step: 0, srsLevel: null, nextReviewOn: addHours(at, method.intervals[0]) };
}

// ── Glavna funkcija: primijeni rezultat ponavljanja ─────────────────────────
// Vraća NOVI objekat bloka (ne mijenja postojeći) sa ažuriranim stanjem
// i izračunatim ISO timestampom sljedećeg ponavljanja. `at` je ISO timestamp
// trenutka kad je ponavljanje stvarno odrađeno (ne samo datum).
export function applyReview(block, { result, at }) {
  const method = METHODS[block.method];
  if (!method) throw new Error(`Nepoznata metoda: ${block.method}`);
  if (result !== "correct" && result !== "incorrect") throw new Error(`Nepoznat rezultat: ${result}`);

  if (method.type === "levels") return applySrs(block, method, result, at);
  return applySequence(block, method, result, at);
}

// ── sequence metode (tri_dana, sedam_dana, fibonacci) ───────────────────────
function applySequence(block, method, result, at) {
  if (result === "incorrect") {
    // greška → reset na početak niza (Dan 1)
    return {
      ...block,
      step: 0,
      lastResult: "incorrect",
      finished: false,
      nextReviewOn: addHours(at, method.intervals[0]),
    };
  }

  // uspjeh → sljedeći korak u nizu
  const lastIndex = method.intervals.length - 1;
  const nextStep = Math.min(block.step + 1, lastIndex);
  const interval = method.intervals[Math.min(nextStep, lastIndex)];

  return {
    ...block,
    step: nextStep,
    lastResult: "correct",
    // blok je "završio" niz kad dođe do zadnjeg intervala (trajno održavanje)
    finished: nextStep === lastIndex,
    nextReviewOn: addHours(at, interval),
  };
}

// ── SRS (nivoi 1–7) ─────────────────────────────────────────────────────────
function applySrs(block, method, result, at) {
  const level = block.srsLevel ?? method.minLevel;
  const newLevel =
    result === "correct"
      ? Math.min(level + 1, method.maxLevel)
      : Math.max(level - 1, method.minLevel);

  return {
    ...block,
    srsLevel: newLevel,
    lastResult: result,
    finished: newLevel === method.maxLevel,
    nextReviewOn: addHours(at, method.levelIntervals[newLevel]),
  };
}

// ── Šta je na redu ("sad") ───────────────────────────────────────────────────
// Vraća blokove čije je ponavljanje dospjelo ili je prošlo (zakašnjelo).
// nowIso: puni ISO timestamp "sad" (ne samo datum - satna preciznost).
export function dueBlocks(blocks, nowIso) {
  return blocks
    .filter((b) => b.nextReviewOn && b.nextReviewOn <= nowIso)
    .sort((a, b) => a.nextReviewOn.localeCompare(b.nextReviewOn));
}

// Koliko SATI blok kasni (0 = na vrijeme, >0 = kašnjenje) - koristi se i za
// bojenje tajmera (zeleno/žuto/crveno), isti duh kao pohrana.js.
export function hoursOverdue(block, nowIso) {
  if (!block.nextReviewOn) return 0;
  return Math.max(0, hoursBetween(block.nextReviewOn, nowIso));
}

// Koliko PUNIH DANA blok kasni - tanak omotač oko hoursOverdue za prikaze
// koji i dalje broje u danima (npr. "kasni {n} d." bedž na dashboardu).
export function daysOverdue(block, nowIso) {
  return Math.floor(hoursOverdue(block, nowIso) / 24);
}

// ── Opis stanja bloka za prikaz (npr. "Dan 2 od 3") ─────────────────────────
export function describeState(block) {
  const method = METHODS[block.method];
  if (method.type === "levels") return `Nivo ${block.srsLevel} od ${method.maxLevel}`;

  if (block.method === "tri_dana") {
    if (block.step < 3) return `Dan ${block.step + 1} od 3`;
    if (block.step < 7) return `Sedmično ${block.step - 2} od 4`;
    return "Mjesečno održavanje";
  }
  if (block.method === "sedam_dana") {
    if (block.step < 7) return `Dan ${block.step + 1} od 7`;
    if (block.step === 7) return "Pauza — provjera za 14 dana";
    return "Mjesečno održavanje";
  }
  if (block.method === "fibonacci") {
    const dani = [1, 2, 3, 5, 8];
    if (block.step < 5) return `Ponavljanje ${block.step + 1} od 5 (dan ${dani[block.step]})`;
    if (block.step === 5) return "Sedmično ponavljanje";
    return "Mjesečno održavanje";
  }
  return "";
}
