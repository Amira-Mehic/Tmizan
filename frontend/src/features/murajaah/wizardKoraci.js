// ============================================================================
// Murajaa - pravila wizarda za plan ponavljanja (dokument arhitekture,
// sekcija 3): koje jedinice ponuditi po profilu, upozorenja o realnosti
// tempa, presjek strogosti prema greškama, i koji se koraci preskaču po
// profilu (tabela 3.4). Čista logika - HifzPlannerPage.jsx (UI) ovo koristi
// za popunjavanje/filtriranje koraka wizarda.
// ============================================================================

// ── Korak 3 - koje jedinice ponuditi po profilu (tabela u 3.2) ────────────
export const JEDINICE_PO_PROFILU = {
  N0: [],
  N1: ["ajet", "red", "sura"],
  N2: ["stranica", "sura", "red"],
  N3: ["stranica", "dzuz", "sura"],
  N4: ["stranica", "dzuz", "sura"],
  N5: ["dzuz", "stranica"],
  N6: ["dzuz", "stranica"],
};

export const DEFAULT_JEDINICA_PO_PROFILU = {
  N1: "ajet", N2: "stranica", N3: "stranica", N4: "stranica", N5: "dzuz", N6: "dzuz",
};

export function dostupneJedinice(profil) {
  return JEDINICE_PO_PROFILU[profil] || [];
}

// ── Korak 4 - provjere realnosti tempa (tabela u 3.2), "upozori, ne blokiraj":
//    ovo VRAĆA upozorenja, UI ih prikazuje ali dozvoljava nastavak. ────────
export function provjeriRealnostTempa({ ciklusDana, dailyQtyPages }) {
  const upozorenja = [];
  if (ciklusDana < 3) upozorenja.push({ kod: "prekratak_ciklus", poruka: "Ovo je vrlo intenzivno. Siguran/na si?" });
  if (ciklusDana > 40) upozorenja.push({ kod: "predug_ciklus", poruka: "Ovako dug razmak znači da će gradivo blijedjeti između ponavljanja. Preporučujemo najviše 30–40 dana." });
  if (dailyQtyPages > 40) upozorenja.push({ kod: "prevelik_tempo", poruka: "Ovo je preko 40 stranica dnevno. Realno je samo ako imaš nekoliko sati." });
  if (dailyQtyPages < 1) upozorenja.push({ kod: "premalen_tempo", poruka: "S ovim tempom ciklus je predug. Razmisli o povećanju." });
  return upozorenja;
}

// ── Korak 7 - strogost prema greškama → parametri Sloja 2 (red slabih),
//    dokument sekcija 4.11 (max_dnevno, izlazak nakon N uzastopnih čistih). ─
export const STROGOST_PRESETS = {
  blago:    { maxDnevno: 2, izlazakUzastopno: 2 },
  normalno: { maxDnevno: 3, izlazakUzastopno: 2 },
  strogo:   { maxDnevno: 5, izlazakUzastopno: 3 },
};

export function strogostParametri(nivo) {
  return STROGOST_PRESETS[nivo] || STROGOST_PRESETS.normalno;
}

// ── Korak preskakanje po profilu (tabela 3.4) - vraća SET brojeva koraka
//    koji se prikazuju za dati profil (1=Mushaf, 2=Šta ponavljaš, 3=Jedinica,
//    4=Tempo/rok, 5=Metode, 6=Redoslijed, 7=Strogost, 8=Pregled). N1 preskače
//    2 (uvijek "sve"), 6 i 7 (redoslijed/strogost fiksni, pojednostavljeno). ─
export function vidljiviKoraci(profil) {
  const svi = [1, 2, 3, 4, 5, 6, 7, 8];
  if (profil === "N1") return svi.filter((k) => ![2, 6, 7].includes(k));
  return svi;
}
