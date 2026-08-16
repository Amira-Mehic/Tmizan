// ============================================================================
// Murajaa - generisi_dan(): jedinstveni dnevni generator (dokument
// arhitekture, sekcija 1.3 i 1.5 - "3 sloja").
//
// Dnevni plan se UVIJEK sastavlja istim redom prioriteta:
//   SLOJ 1 - mualimov nalog       (najviši prioritet, gura sve ostalo dolje)
//   SLOJ 2 - red slabih           (ograničen, max_slabih_dnevno)
//   SLOJ 3 - motor (A i/ili B)    (popunjava ostatak kapaciteta)
//
// Ovo je ČISTA funkcija - ne čita bazu i ne čuva rezultat (dokument, pravilo
// #1 iz sekcije 10: "ne čuvaj generisani plan u bazi, nikad - računaj ga").
// Servisni sloj (dashboard) samo prikuplja ulaze (mualimService,
// greskeService.fetchErrorDailyPlan, murajaahService.fetchDueBlocks,
// rotationService.rotationToday/femiWeekToday) i prosljeđuje ih ovdje.
// ============================================================================

// stavke: bilo koji niz objekata - funkcija samo slaže/reže, ne zna šta je
// unutra (stranica, ajet, blok...). Svakoj dodaje `sloj` radi prikaza/debug-a.
export function generisiDan({
  mualimNalozi = [],
  motorBDospjeli = [],
  redSlabih = [],
  motorAStavke = [],
  kvota = null,          // kolicina_dnevno iz plana; null = bez kape (npr. hafiz bez fiksne kvote)
  dnevniMaxB = Infinity, // plan.motor_b.dnevni_max
  maxSlabihDnevno = 3,   // sekcija 4.11 (blago 2 / normalno 3 / strogo 5)
  kapaFaktor = 1.5,      // "kapa protiv lavine" (sekcija 8) - max = kvota × 1.5
} = {}) {
  const stavke = [];
  stavke.push(...mualimNalozi.map((x) => ({ ...x, sloj: "mualim" })));
  stavke.push(...motorBDospjeli.slice(0, dnevniMaxB).map((x) => ({ ...x, sloj: "motorB" })));
  stavke.push(...redSlabih.slice(0, maxSlabihDnevno).map((x) => ({ ...x, sloj: "slabi" })));

  if (kvota != null) {
    const preostalo = Math.max(0, kvota - stavke.length);
    stavke.push(...motorAStavke.slice(0, preostalo).map((x) => ({ ...x, sloj: "motorA" })));
  } else {
    stavke.push(...motorAStavke.map((x) => ({ ...x, sloj: "motorA" })));
  }

  const kapa = kvota != null ? Math.max(kvota, Math.ceil(kvota * kapaFaktor)) : Infinity;
  return stavke.slice(0, kapa);
}

// ── Podjela dana na sesije (jutro/veče, ili 1/2/3 sesije) - otprilike
//    jednaki dijelovi, redoslijed sačuvan (mualim/slabi ostaju rano). ───────
export function podijeliNaSesije(stavke, brojSesija = 1) {
  if (brojSesija <= 1) return [stavke];
  const size = Math.ceil(stavke.length / brojSesija);
  const out = [];
  for (let i = 0; i < brojSesija; i++) out.push(stavke.slice(i * size, (i + 1) * size));
  return out;
}

// ── Redoslijed (dokument, wizard korak "Redoslijed i raspored") - sortira
//    stavke JEDNOG sloja (npr. Motor A/B prije nego što uđu u generisi_dan)
//    po odabranom pravilu. Čista funkcija - pageOf/skorOf su callback-ovi jer
//    "stavka" izgleda drugačije za Motor A (page-level) i Motor B (blok sa
//    .items nizom stranica). "nasumicno" koristi seed (npr. broj izveden iz
//    today) da raspored bude STABILAN kroz cijeli dan, ne drugačiji na svaki
//    re-render. ─────────────────────────────────────────────────────────────
export function poredajStavke(stavke, redoslijed, { pageOf = (x) => x.ref, skorOf = () => 0, seed = 0 } = {}) {
  const arr = [...stavke];
  if (redoslijed === "od_kraja") return arr.sort((a, b) => pageOf(b) - pageOf(a));
  if (redoslijed === "najslabiji") return arr.sort((a, b) => skorOf(b) - skorOf(a));
  if (redoslijed === "nasumicno") return promiješajSaSjemenom(arr, seed);
  return arr.sort((a, b) => pageOf(a) - pageOf(b)); // "od_pocetka" (podrazumijevano)
}

// Fisher-Yates sa jednostavnim seeded PRNG-om (mulberry32) - isti seed uvijek
// daje isti raspored (npr. seed izveden iz današnjeg datuma → stabilno kroz
// cijeli dan, promijeni se tek sutra).
function promiješajSaSjemenom(arr, seed) {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Seed od stringa (npr. "2026-08-06") - zbir kodova karaktera, dovoljno za
// stabilan dnevni raspored, ne treba kriptografska kvaliteta.
export function seedOdStringa(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
