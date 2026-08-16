// ============================================================================
// Pomoćne funkcije za hifz modul, zajedničke trackeru, planeru i ponavljanju.
// Pokrivaju četiri stvari: pretvaranje opsega stranica iz slobodnog teksta,
// preračunavanje između stranica, sura i džuzeva, rad s datumima ponavljanja,
// te boje statusa. Stoje ovdje da bi se ista pravila primjenjivala na svim
// ekranima umjesto da se računanje ponavlja u svakoj komponenti.
// ============================================================================

import { SURA_DATA } from './SURA_DATA.js';

// Parsira slobodan tekst stranica/raspona ("5, 12, 40-45") u sortiran, bez
// duplikata, niz brojeva stranica - dijele ga TalimWizard (korak "Šta učiš")
// i PlanRasporedPage (uređivanje opsega postojećeg plana, bez wizarda).
export function parsePageRanges(text) {
  const out = new Set();
  (text || "").split(/[,\s]+/).filter(Boolean).forEach((tok) => {
    const m = tok.match(/^(\d+)-(\d+)$/);
    if (m) {
      let a = Number(m[1]), b = Number(m[2]);
      if (a > b) [a, b] = [b, a];
      for (let p = a; p <= b; p++) out.add(p);
    } else {
      const n = Number(tok);
      if (Number.isFinite(n)) out.add(n);
    }
  });
  return [...out].sort((a, b) => a - b);
}

// Vraća sure koje se nalaze na datoj stranici
export const getSurahsForPage = (pageNum) =>
  SURA_DATA.filter(s => s.startPage <= pageNum && s.endPage >= pageNum);

export const getJuzForPage = (pageNum) => {
  if (pageNum <= 21) return 1;
  if (pageNum >= 582) return 30;
  return Math.floor((pageNum - 22) / 20) + 2;
};

export const getJuzPages = (juzNo) => {
  if (juzNo === 1)  return Array.from({ length: 21 }, (_, i) => i + 1);       // 1–21
  if (juzNo === 30) return Array.from({ length: 23 }, (_, i) => 582 + i);     // 582–604
  const start = 22 + (juzNo - 2) * 20;                                         // 2→22, 3→42, ..., 29→562
  return Array.from({ length: 20 }, (_, i) => start + i);
};

export const todayStr = () => new Date().toISOString().split("T")[0];

// Trenutni datum+vrijeme u formatu za <input type="datetime-local"> (lokalno
// vrijeme, ne UTC - zato ručno, ne preko toISOString koji je uvijek UTC).
export const nowDateTimeLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Prikaz datuma + vremena (npr. "02.08.2026 14:35"). Ako uneseni string nema
// vremenski dio (stari zapisi, samo "YYYY-MM-DD"), prikazuje se samo datum -
// da se ne izmišlja lažno "00:00" za podatke koji ga nikad nisu ni imali.
export const fmtDateTime = (s) => {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d)) return fmtDate(s);
  const pad = (n) => String(n).padStart(2, "0");
  const datePart = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  const hasTime = typeof s === "string" && s.includes("T");
  return hasTime ? `${datePart} ${pad(d.getHours())}:${pad(d.getMinutes())}` : datePart;
};

export const toArabicNumerals = (n) => {
  const d = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  return String(n).split('').map(c => d[parseInt(c)] ?? c).join('');
};

export const fmtDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
};

// Puni datum s danom u sedmici (npr. "Utorak, 4. august 2026.") - RUČNO
// formatirano (ne toLocaleDateString/Intl), jer "bs-BA" lokal nije uvijek
// potpuno podržan u svakom browseru/runtimeu i zna vratiti neispravan ispis
// (npr. sirove ICU skeleton oznake tipa "2026 M08 4, Tue" umjesto pravog
// datuma) - ovako je ispis uvijek pouzdan i identičan svugdje.
const WEEKDAYS_BS = ["nedjelja", "ponedjeljak", "utorak", "srijeda", "četvrtak", "petak", "subota"];
const MONTHS_BS = ["januar", "februar", "mart", "april", "maj", "juni", "juli", "august", "septembar", "oktobar", "novembar", "decembar"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const fmtFullDate = (date, lang) => {
  const d = date instanceof Date ? date : new Date();
  if (lang === "en") {
    return `${WEEKDAYS_EN[d.getDay()]}, ${MONTHS_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  const wd = WEEKDAYS_BS[d.getDay()];
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${d.getDate()}. ${MONTHS_BS[d.getMonth()]} ${d.getFullYear()}.`;
};

// Miješa hex boju statusa sa bijelom/crnom u fiksnom omjeru → vraća PUNU (ne providnu)
// rgb() boju. Ovo namjerno NE koristi CSS opacity/alpha, tako da se pozadina teme
// nikad ne "vidi kroz" karticu - boja statusa je uvijek identična, bez obzira na temu.
export const mixHex = (hex, withHex, ratio) => {
  const h = hex.replace('#', '');
  const w = withHex.replace('#', '');
  const r1 = parseInt(h.slice(0, 2), 16), g1 = parseInt(h.slice(2, 4), 16), b1 = parseInt(h.slice(4, 6), 16);
  const r2 = parseInt(w.slice(0, 2), 16), g2 = parseInt(w.slice(2, 4), 16), b2 = parseInt(w.slice(4, 6), 16);
  const r = Math.round(r1 * ratio + r2 * (1 - ratio));
  const g = Math.round(g1 * ratio + g2 * (1 - ratio));
  const b = Math.round(b1 * ratio + b2 * (1 - ratio));
  return `rgb(${r}, ${g}, ${b})`;
};

// Puna (solidna) pozadina kartice za dati status - pastelna na svijetlim temama,
// prigušeno tamna na tamnim temama. Uvijek potpuno neprozirna.
export const statusCardBg = (hex, isLight) => mixHex(hex, isLight ? '#FFFFFF' : '#000000', isLight ? 0.16 : 0.22);
export const statusPillBg = (hex, isLight) => mixHex(hex, isLight ? '#FFFFFF' : '#000000', isLight ? 0.30 : 0.35);
export const statusBorder = (hex, isLight) => mixHex(hex, isLight ? '#FFFFFF' : '#000000', isLight ? 0.55 : 0.5);

// Vraća status koji se najčešće javlja među datim stranicama (npr. za hero karticu
// sure/džuza) - tako da hero boja odmah odražava ono što je stvarno odabrano preko
// "Označi cijelu suru/džuz" pilula, umjesto da se računa samo iz % naučenosti.
export const getDominantStatus = (pageNumbers, pageStatuses) => {
  const counts = {};
  for (const p of pageNumbers) {
    const st = pageStatuses[p]?.status || "prazna";
    counts[st] = (counts[st] || 0) + 1;
  }
  let dominant = "prazna", max = 0;
  for (const [st, count] of Object.entries(counts)) {
    if (st === "prazna") continue;
    if (count > max) { max = count; dominant = st; }
  }
  return dominant;
};

// Link na tefsir sure na tefsir.ba (Ibn Kesir, bosanski). Provjereno: njihov
// interni sura-ID = standardni broj sure + 2 (sura 1 → /sura/3, 114 → /sura/116).
// Deep-link po ajetu nije moguć - njihovi ajet-ID-jevi su proizvoljni; zato vodimo
// na cijelu suru, a korisnik skrola do ajeta (prijevod ajeta ionako pokazujemo lokalno).
export const tefsirBaSuraUrl = (verseKey) => {
  const sura = parseInt((verseKey || "").split(":")[0], 10);
  return sura ? `https://www.tefsir.ba/sura/${sura + 2}` : "https://www.tefsir.ba/sure";
};

// ── PDF izvještaj - dijeljene konstante/helperi (koristi ih i Detaljni i Sažeti format) ──
export const ALL_JUZ = Array.from({ length: 30 }, (_, i) => i + 1);
export const TOTAL_PAGES = 604;

export const isStarted = (pageStatuses, p) => (pageStatuses[p]?.status || "prazna") !== "prazna";

export const emptyStatusCounts = () => ({ naucen: 0, u_toku: 0, ponavljanje: 0, savladano: 0, treba_vjezbe: 0, prazna: 0 });

// Prebroji status svih stranica u datom nizu brojeva stranica.
export const countStatuses = (pageStatuses, pages) => {
  const counts = emptyStatusCounts();
  for (const p of pages) {
    const st = pageStatuses[p]?.status || "prazna";
    counts[st] = (counts[st] || 0) + 1;
  }
  return counts;
};

// Zbir repeatCount / errors preko datih stranica (za "Sažetak" PDF prikaz).
export const sumPageMetrics = (pageStatuses, pages) => {
  let repeats = 0, errors = 0;
  for (const p of pages) {
    repeats += pageStatuses[p]?.repeatCount || 0;
    errors  += pageStatuses[p]?.errors || 0;
  }
  return { repeats, errors };
};
