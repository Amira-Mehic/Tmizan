// ============================================================================
// Murajaa - ORIGINALNA TMIZAN METODA: Model višestruke pohrane ajeta
//
// Zasnovano na tri vrste pamćenja: senzorno → kratkoročno → dugoročno.
// Svaki ajet se svjesno provlači kroz nivoe dok ne bude trajno pohranjen.
//
// NIVOI (6 = vatrena zona, 0 = trajno pohranjeno):
//   6: prvi dan - 3 ponavljanja (odmah, +15–30 min, +6–8 h), tajmer s bojama
//   5: pauza 24 h  → test
//   4: pauza 2 dana → test
//   3: pauza 4 dana → test
//   2: pauza 8 dana → test
//   1: pauza 16 dana → zadnji test
//   0: trajno - ulazi u 'Glavni krug hifza' (fluidno svakih 10–15 dana)
//
// KLJUČNO - mikro/makro razdvajanje greške:
//   ajeti NE padaju svi zajedno. Pogriješeni ajet se izoluje (mikro nivo),
//   ostatak bloka (makro nivo) nesmetano nastavlja svoju putanju.
//   Blaža kazna na dubokim nivoima: greška na nivou 2 ili 1 → pad na nivo 5
//   (ne na 6), jer je materijal već bio duboko u memoriji.
// ============================================================================

// ── Konstante nivoa ─────────────────────────────────────────────────────────
export const NIVO_PAUZE_DANA = { 5: 1, 4: 2, 3: 4, 2: 8, 1: 16 };
export const GLAVNI_KRUG_DANA = { min: 10, max: 15 }; // nivo 0 - fluidno održavanje

// Nivo 6 - tri ponavljanja unutar prvog dana (u minutama od prethodnog koraka)
export const NIVO6_KORACI = [
  { korak: 1, opis: "Odmah nakon učenja", offsetMin: 0 },
  { korak: 2, opis: "Nakon 15–30 minuta", offsetMin: 20 },
  { korak: 3, opis: "Nakon 6–8 sati", offsetMin: 7 * 60 },
];

// Kuda pada pogriješeni ajet, po nivou na kojem je pogriješio
export const PAD_NA_GRESKU = { 6: 6, 5: 6, 4: 6, 3: 6, 2: 5, 1: 5 };

// ── Pomoćne funkcije za vrijeme (ISO timestamp, minutska preciznost) ────────
export function addMinutes(isoStr, minutes) {
  return new Date(new Date(isoStr).getTime() + minutes * 60000).toISOString();
}
export function addDaysIso(isoStr, days) {
  return addMinutes(isoStr, days * 24 * 60);
}
export function minutesBetween(fromIso, toIso) {
  return Math.round((new Date(toIso) - new Date(fromIso)) / 60000);
}

// ── Kreiranje bloka: tek naučeni ajeti ulaze u vatrenu zonu (nivo 6) ────────
// ayahKeys: uređeni ajeti bloka, npr. ["36:1","36:2","36:3"]
// learnedAt: ISO timestamp trenutka učenja
export function createBlock(ayahKeys, learnedAt) {
  if (!ayahKeys?.length) throw new Error("Blok mora imati bar jedan ajet");
  const ayahs = {};
  for (const key of ayahKeys) ayahs[key] = enterNivo6(learnedAt);
  return { order: [...ayahKeys], ayahs, createdAt: learnedAt };
}

function enterNivo6(at) {
  return {
    nivo: 6,
    subStep: 0, // 0,1,2 → tri ponavljanja vatrene zone
    nextDueAt: addMinutes(at, NIVO6_KORACI[0].offsetMin), // odmah
    lastResult: null,
  };
}

// ── NIVO 6: jedno od tri ponavljanja vatrene zone ───────────────────────────
// correct → sljedeći korak; sva tri čista → sutradan nivo 5.
// incorrect → ostaje na nivou 6, tajmer se resetuje (ispočetka).
export function reviewNivo6(ayahState, { correct, at }) {
  if (ayahState.nivo !== 6) throw new Error("Ajet nije na nivou 6");

  if (!correct) {
    return { ...enterNivo6(at), lastResult: "incorrect" };
  }

  const nextSub = ayahState.subStep + 1;
  if (nextSub < NIVO6_KORACI.length) {
    return {
      nivo: 6,
      subStep: nextSub,
      nextDueAt: addMinutes(at, NIVO6_KORACI[nextSub].offsetMin),
      lastResult: "correct",
    };
  }
  // sva tri ponavljanja čista → sutradan test nivoa 5
  return { nivo: 5, subStep: 0, nextDueAt: addDaysIso(at, NIVO_PAUZE_DANA[5]), lastResult: "correct" };
}

// ── NIVOI 5–1: test poslije pauze ───────────────────────────────────────────
// correct → sljedeći nivo (5→4→3→2→1→0); incorrect → pad po PAD_NA_GRESKU.
export function reviewNivo(ayahState, { correct, at }) {
  const nivo = ayahState.nivo;
  if (nivo === 6) return reviewNivo6(ayahState, { correct, at });
  if (nivo === 0) return reviewGlavniKrug(ayahState, { at });
  if (!(nivo >= 1 && nivo <= 5)) throw new Error(`Nepoznat nivo: ${nivo}`);

  if (correct) {
    const noviNivo = nivo - 1;
    if (noviNivo === 0) {
      // trajno pohranjeno → Glavni krug hifza
      return { nivo: 0, subStep: 0, nextDueAt: addDaysIso(at, GLAVNI_KRUG_DANA.min), lastResult: "correct" };
    }
    return { nivo: noviNivo, subStep: 0, nextDueAt: addDaysIso(at, NIVO_PAUZE_DANA[noviNivo]), lastResult: "correct" };
  }

  // greška → pad (blaža kazna s nivoa 2 i 1: na nivo 5, ne ispočetka)
  const padNa = PAD_NA_GRESKU[nivo];
  if (padNa === 6) return { ...enterNivo6(at), lastResult: "incorrect" };
  return { nivo: padNa, subStep: 0, nextDueAt: addDaysIso(at, NIVO_PAUZE_DANA[padNa]), lastResult: "incorrect" };
}

// ── NIVO 0: Glavni krug hifza ───────────────────────────────────────────────
// Bez izolovanog testiranja - ajet prolazi prirodno kroz učenje sure;
// samo se pomjera sljedeći fluidni termin (10–15 dana).
export function reviewGlavniKrug(ayahState, { at }) {
  return { ...ayahState, nextDueAt: addDaysIso(at, GLAVNI_KRUG_DANA.min), lastResult: "correct" };
}

// ── TEST CIJELOG BLOKA - mikro/makro razdvajanje ────────────────────────────
// results: { "36:1": true, "36:2": false, ... } (true = tačno)
// Uspješni ajeti napreduju ZAJEDNO; pogriješeni se IZOLUJU i padaju sami.
export function reviewBlock(block, { results, at }) {
  const ayahs = {};
  const izolovani = [];

  for (const key of block.order) {
    const state = block.ayahs[key];
    const correct = results[key];
    if (correct === undefined) {
      ayahs[key] = state; // nije testiran - ne dira se
      continue;
    }
    ayahs[key] = reviewNivo(state, { correct, at });
    if (!correct) izolovani.push(key);
  }

  return { block: { ...block, ayahs }, izolovani };
}

// ── Tajmer vatrene zone - boje za dashboard ─────────────────────────────────
// zeleno = vrijeme je za ponavljanje; žuto = kasni par sati;
// crveno = hitno (informacija isparava iz senzorne memorije)
export const TAJMER_ZUTO_MIN = 60;      // do 1 h kašnjenja → još zeleno
export const TAJMER_CRVENO_MIN = 6 * 60; // preko 6 h → crveno

export function timerColor(ayahState, nowIso) {
  if (!ayahState.nextDueAt) return null;
  const late = minutesBetween(ayahState.nextDueAt, nowIso);
  if (late < 0) return "ceka";      // još nije vrijeme
  if (late <= TAJMER_ZUTO_MIN) return "zeleno";
  if (late <= TAJMER_CRVENO_MIN) return "zuto";
  return "crveno";
}

// ── Šta je na redu (za cijeli blok ili listu blokova) ───────────────────────
export function dueAyahs(block, nowIso) {
  return block.order
    .filter((key) => block.ayahs[key].nextDueAt && block.ayahs[key].nextDueAt <= nowIso)
    .map((key) => ({ key, ...block.ayahs[key], boja: timerColor(block.ayahs[key], nowIso) }));
}

// ── MOST (Bridge) - kontekstualni prikaz pri ponavljanju ────────────────────
// Ajet se nikad ne ponavlja u vakuumu: prikazuje se prethodni i sljedeći,
// a korisnik iz memorije popunjava prazno mjesto u sredini.
// allAyahsOrdered: puni redoslijed ajeta sure/stranice (verse_key lista)
export function makeBridge(ayahKey, allAyahsOrdered) {
  const i = allAyahsOrdered.indexOf(ayahKey);
  if (i === -1) throw new Error(`Ajet ${ayahKey} nije u datom redoslijedu`);
  return {
    prethodni: i > 0 ? allAyahsOrdered[i - 1] : null,
    trazeni: ayahKey,
    sljedeci: i < allAyahsOrdered.length - 1 ? allAyahsOrdered[i + 1] : null,
  };
}

// Ocjena Mosta: znao → TAČNO (napreduje), nije znao → NETAČNO (pad/reset)
export function gradeBridge(ayahState, { znao, at }) {
  return reviewNivo(ayahState, { correct: znao, at });
}

// ── Pregled stanja bloka ────────────────────────────────────────────────────
export function blockSummary(block) {
  const poNivou = {};
  for (const key of block.order) {
    const n = block.ayahs[key].nivo;
    poNivou[n] = (poNivou[n] || 0) + 1;
  }
  const ukupno = block.order.length;
  const trajno = poNivou[0] || 0;
  return { ukupno, poNivou, trajno, percentTrajno: Math.round((trajno / ukupno) * 100) };
}
