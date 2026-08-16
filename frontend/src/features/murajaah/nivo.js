// ============================================================================
// Murajaa - Metoda po hafizovom nivou (početnički / srednji / napredni)
//
// Nije zasebna metoda, nego NADOGRADNJA: prilagođava zadane vrijednosti
// svih ostalih metoda prema profilu korisnika. Onboarding postavlja nivo,
// korisnik ga kasnije može promijeniti u postavkama.
// ============================================================================

export const PROFILES = {
  pocetnik: {
    id: "pocetnik",
    naziv: "Početnički nivo",
    opis: "Novi hafiz, uči prve džuzeve",
    // više ponavljanja istog materijala (3–5× sedmično po bloku)
    ponavljanjaSedmicno: 4,
    // manji dnevni cilj: pola stranice (u redovima za 15-redni mushaf)
    dnevniCiljRedova: 7.5,
    // duži intervali konsolidacije - ne žuri se na novo
    konsolidacijaFaktor: 1.5, // intervali metode × 1.5 (zaokruženo)
    podsjetnici: "cesti",
    preporucenaMetoda: "tri_dana",
    savjet: "Na ovom nivou preporučujemo Metodu tri dana — sporo ali sigurno.",
  },
  srednji: {
    id: "srednji",
    naziv: "Srednji nivo",
    opis: "Naučeno 5–15 džuzeva",
    ponavljanjaSedmicno: 3,
    dnevniCiljRedova: 15, // ~1 stranica dnevno
    ponavljanjeStranicaDnevno: 6, // 5–7 stranica ponavljanja
    konsolidacijaFaktor: 1,
    podsjetnici: "umjereni",
    preporucenaMetoda: "fibonacci",
    savjet: "Balans novog i starog — Fibonacci raspored uz 5–7 stranica ponavljanja dnevno.",
  },
  napredni: {
    id: "napredni",
    naziv: "Napredni nivo / Hafiz",
    opis: "Cijeli ili veći dio Kur'ana naučen",
    ponavljanjaSedmicno: 2,
    dnevniCiljRedova: 7.5, // manje novog - fokus na održavanje
    konsolidacijaFaktor: 0.75, // brži tempo ponavljanja
    podsjetnici: "rijetki",
    preporucenaMetoda: "dzuzevi",
    savjet: "Fokus na održavanje: sistem džuzeva ili Šetonova metoda, dublji rad na slabim mjestima.",
  },
};

export function getProfile(nivoId) {
  const p = PROFILES[nivoId];
  if (!p) throw new Error(`Nepoznat nivo: ${nivoId}`);
  return p;
}

// ── Prilagodba intervala bilo koje metode prema nivou ───────────────────────
// intervals: niz dana iz methods.js → skalirano konsolidacijskim faktorom
export function adjustIntervals(intervals, nivoId) {
  const { konsolidacijaFaktor } = getProfile(nivoId);
  return intervals.map((d) => Math.max(1, Math.round(d * konsolidacijaFaktor)));
}

// ── Prilagodba dnevnog cilja učenja ─────────────────────────────────────────
export function adjustDailyGoal(linesPerDay, nivoId) {
  const profile = getProfile(nivoId);
  // korisnikov unos se poštuje, ali se upozorava ako prelazi preporuku nivoa
  return {
    linesPerDay,
    preporuceno: profile.dnevniCiljRedova,
    prekoracen: linesPerDay > profile.dnevniCiljRedova * 2,
    poruka:
      linesPerDay > profile.dnevniCiljRedova * 2
        ? `Za ${profile.naziv.toLowerCase()} preporučujemo do ${profile.dnevniCiljRedova} redova dnevno`
        : null,
  };
}

// ── Preporuka pri onboardingu ───────────────────────────────────────────────
export function recommendation(nivoId) {
  const p = getProfile(nivoId);
  return { metoda: p.preporucenaMetoda, savjet: p.savjet };
}
