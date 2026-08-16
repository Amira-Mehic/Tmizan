// ============================================================================
// Murajaa - konfiguracije metoda ponavljanja
// Sve 4 metode dijele isti intervalni motor (engine.js); razlika je samo
// u nizu intervala i ponašanju na grešku.
//
// interval = broj SATI od zadnjeg ponavljanja do sljedećeg (ne dana - vidi
// dokument arhitekture, sekcija 1.2 i 4.6-4.10: "tabela_intervala niz
// brojeva U SATIMA, ne dani, zbog originalne metode"). Za sequence metode
// (tri_dana/sedam_dana/fibonacci) brojevi su i dalje višekratnici od 24h -
// isti kalendarski raspored, samo mjeren satima: motor radi nad punim ISO
// timestampom, ne samo datumom, pa je kašnjenje mjerljivo u satima, dosljedno
// s modelom višestruke pohrane (pohrana.js), koji radi u minutama/satima.
// ============================================================================

export const METHODS = {
  // ── Metoda tri dana - trodnevna konsolidacija ─────────────────────────────
  // Dan 1, 2, 3 svaki dan → sedmično 4 sedmice → mjesečno trajno.
  // Greška bilo kada → ponovo od Dana 1.
  tri_dana: {
    id: "tri_dana",
    type: "sequence",
    intervals: [24, 24, 24, 168, 168, 168, 168, 720], // 1,1,1,7,7,7,7,30 dana
    // zadnji interval (720h = 30 dana) se ponavlja zauvijek - trajno mjesečno održavanje
    repeatLast: true,
    onError: "reset", // vrati na step 0 (Dan 1)
  },

  // ── Metoda sedam dana - sedmični ciklus ───────────────────────────────────
  // Dani 1–7 svaki dan → pauza 14 dana (ponavljanje na dan 22) → mjesečno.
  // Greška → ponovo od Dana 1 ciklusa.
  sedam_dana: {
    id: "sedam_dana",
    type: "sequence",
    intervals: [24, 24, 24, 24, 24, 24, 24, 360, 720], // 7×1, 15, 30 dana
    repeatLast: true,
    onError: "reset",
  },

  // ── Metoda (1–2–3–5–8) - Fibonacci ────────────────────────────────────────
  // Ponavljanja na dane 1, 2, 3, 5, 8 od učenja → sedmično → mjesečno.
  // Dani od učenja: 1,2,3,5,8 → intervali između: 1,1,1,2,3.
  // Greška → restart niza (Dan 1).
  fibonacci: {
    id: "fibonacci",
    type: "sequence",
    intervals: [24, 24, 24, 48, 72, 168, 720], // 1,1,1,2,3,7,30 dana
    repeatLast: true,
    onError: "reset",
  },

  // ── SRS - Sistem prostornog ponavljanja (nivoi 1–7) ───────────────────────
  // Nivo određuje interval; uspjeh diže nivo, greška spušta za jedan.
  srs: {
    id: "srs",
    type: "levels",
    // indeks = nivo (1..7); nivo 1 → 24h (1 dan), nivo 7 → 4320h (180 dana)
    levelIntervals: { 1: 24, 2: 72, 3: 168, 4: 336, 5: 720, 6: 2160, 7: 4320 },
    minLevel: 1,
    maxLevel: 7,
    onError: "stepDown", // pad za jedan nivo, ne ispočetka
  },
};

export const METHOD_IDS = Object.keys(METHODS);
