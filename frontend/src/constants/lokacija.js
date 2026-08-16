// ============================================================================
// Zajednički izvor lokacija za cijelu aplikaciju.
//
// Isti spisak koriste: postavke i profil (gdje korisnik bira svoju lokaciju),
// admin panel za oglase (gdje se bira ciljana lokacija) i BanerSlot (gdje se
// te dvije strane uparuju). Ranije je svaka strana imala svoj slobodan unos,
// pa se "Sarajevo" i "sarajevo" nikad nisu poklopili i ciljanje po gradu
// praktično nije radilo.
//
// Regija se NE unosi ručno - izvodi se iz odabranog grada (vidi regijaZaGrad).
// Time se popunjava i kolona profiles.region, koja je do sada uvijek bila
// prazna iako je BanerSlot čita.
// ============================================================================

// ─── Države (ISO 3166-1 alpha-2) ────────────────────────────────────────────
// Puni spisak (252 države) je u drzave.js. Ovdje se samo dopunjava vrijednošću
// "OTHER", koja je postojala u ranijoj, kraćoj listi - zadržana je da profili
// koji su je već sačuvali ostanu ispravni.
// Nastavak .js je obavezan jer lokacija.test.js pokreće ovaj modul direktno
// kroz Node (bez Vite razrješavanja putanja).
import { SVE_DRZAVE, CESTE_DRZAVE } from "./drzave.js"

export const OSTALO = { code: "OTHER", bs: "Ostalo", en: "Other" }

export const COUNTRIES = [...SVE_DRZAVE, OSTALO]

export { CESTE_DRZAVE }

// Naziv države na traženom jeziku. Nepoznat kod se vraća kakav jeste, da se u
// sučelju barem vidi šta je zapisano u bazi.
export function countryName(code, lang = "bs") {
  const d = COUNTRIES.find((c) => c.code === code)
  if (!d) return code || ""
  return (lang === "en" ? d.en : d.bs) || d.bs
}

// Države podijeljene na "najčešće" i "ostale", za prikaz u dvije grupe.
export function drzaveZaPrikaz(lang = "bs") {
  const ceste = CESTE_DRZAVE
    .map((code) => COUNTRIES.find((c) => c.code === code))
    .filter(Boolean)
  const cesteKodovi = new Set(CESTE_DRZAVE)
  const ostale = COUNTRIES
    .filter((c) => !cesteKodovi.has(c.code))
    .sort((a, b) => countryName(a.code, lang).localeCompare(countryName(b.code, lang), lang))
  return { ceste, ostale }
}

// ─── Gradovi Bosne i Hercegovine, grupisani po regiji ───────────────────────
// Regija = kanton (Federacija BiH), entitet (Republika Srpska) ili distrikt.
// Primarno tržište aplikacije je BiH, pa je samo ovdje spisak detaljan; za
// ostale države grad se unosi slobodno, a regija ostaje prazna.
const BA_REGIJE = {
  "Kanton Sarajevo": ["Sarajevo", "Ilidža", "Vogošća", "Hadžići", "Ilijaš", "Trnovo"],
  "Unsko-sanski kanton": ["Bihać", "Cazin", "Velika Kladuša", "Sanski Most", "Bosanska Krupa", "Bužim", "Ključ"],
  "Posavski kanton": ["Orašje", "Odžak", "Domaljevac"],
  "Tuzlanski kanton": ["Tuzla", "Živinice", "Gračanica", "Gradačac", "Srebrenik", "Lukavac", "Banovići", "Kalesija", "Kladanj", "Čelić", "Sapna", "Teočak"],
  "Zeničko-dobojski kanton": ["Zenica", "Kakanj", "Visoko", "Tešanj", "Zavidovići", "Maglaj", "Žepče", "Breza", "Vareš", "Olovo", "Usora"],
  "Bosanskopodrinjski kanton": ["Goražde", "Ustikolina", "Prača"],
  "Srednjobosanski kanton": ["Travnik", "Bugojno", "Jajce", "Vitez", "Novi Travnik", "Gornji Vakuf-Uskoplje", "Donji Vakuf", "Busovača", "Fojnica", "Kiseljak", "Kreševo"],
  "Hercegovačko-neretvanski kanton": ["Mostar", "Konjic", "Jablanica", "Čapljina", "Stolac", "Neum", "Prozor-Rama", "Čitluk", "Ravno"],
  "Zapadnohercegovački kanton": ["Široki Brijeg", "Ljubuški", "Grude", "Posušje"],
  "Kanton 10": ["Livno", "Tomislavgrad", "Kupres", "Glamoč", "Drvar", "Bosansko Grahovo"],
  "Republika Srpska": ["Banja Luka", "Bijeljina", "Prijedor", "Doboj", "Zvornik", "Trebinje", "Gradiška", "Prnjavor", "Derventa", "Modriča", "Brod", "Laktaši", "Teslić", "Kozarska Dubica", "Novi Grad", "Mrkonjić Grad", "Istočno Sarajevo", "Foča", "Višegrad", "Sokolac", "Pale", "Srebrenica", "Bratunac", "Milići", "Vlasenica", "Rogatica", "Nevesinje", "Gacko", "Bileća", "Ljubinje"],
  "Brčko distrikt": ["Brčko"],
}

// Ravan spisak {city, region}, sortiran po nazivu grada
export const BA_GRADOVI = Object.entries(BA_REGIJE)
  .flatMap(([region, gradovi]) => gradovi.map((city) => ({ city, region })))
  .sort((a, b) => a.city.localeCompare(b.city, "bs"))

export const BA_REGIJE_LISTA = Object.keys(BA_REGIJE)

// Države za koje postoji spisak gradova; za ostale se grad unosi slobodno.
export const imaSpisakGradova = (country) => country === "BA"

export const gradoviZaDrzavu = (country) =>
  imaSpisakGradova(country) ? BA_GRADOVI : []

// ─── Normalizacija i poređenje ──────────────────────────────────────────────
// Poređenje mora biti otporno na velika slova, razmake i dijakritike, jer u
// bazi već postoje ranije ručno unesene vrijednosti ("sarajevo", "Sarajevo ").
export function normalize(value) {
  if (!value) return ""
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
}

export const isteVrijednosti = (a, b) => {
  const na = normalize(a)
  const nb = normalize(b)
  return !!na && na === nb
}

// Regija za odabrani grad. Vraća null ako država nema spisak ili grad nije
// prepoznat (npr. ranije ručno unesen naziv koji nije na spisku).
export function regijaZaGrad(country, city) {
  if (!imaSpisakGradova(country) || !city) return null
  const n = normalize(city)
  return BA_GRADOVI.find((g) => normalize(g.city) === n)?.region || null
}

// ─── Bodovanje oglasa ───────────────────────────────────────────────────────
// Što je oglas precizniji za korisnikovu lokaciju, to je bod veći:
//   3 = poklapa se grad
//   2 = poklapa se regija
//   1 = poklapa se država
//   0 = oglas bez ciljanja (globalni, prikazuje se svima)
//  -1 = oglas cilja drugu lokaciju i NE smije se prikazati
//
// Ranija verzija je bodovala samo po tome da li je kolona popunjena, pa je
// oglas za Zagreb kod sarajevskog korisnika dobijao istu težinu kao oglas za
// Sarajevo. Ovdje se stvarno porede vrijednosti.
export const NIJE_ZA_PRIKAZ = -1

export function bodujOglas(lokacija, oglas) {
  const l = lokacija || {}
  const cilja = {
    country: oglas?.target_country || null,
    city: oglas?.target_city || null,
    region: oglas?.target_region || null,
  }

  // Oglas bez ikakvog ciljanja je globalan i uvijek se smije prikazati.
  if (!cilja.country && !cilja.city && !cilja.region) return 0

  // Ako oglas cilja državu koja nije korisnikova, odbaci ga odmah.
  if (cilja.country && !isteVrijednosti(cilja.country, l.country)) return NIJE_ZA_PRIKAZ

  // Grad je najprecizniji kriterij. Ako je zadan a ne poklapa se, oglas otpada
  // (nema smisla prikazati oglas za Mostar korisniku iz Tuzle).
  if (cilja.city) {
    return isteVrijednosti(cilja.city, l.city) ? 3 : NIJE_ZA_PRIKAZ
  }

  if (cilja.region) {
    return isteVrijednosti(cilja.region, l.region) ? 2 : NIJE_ZA_PRIKAZ
  }

  // Preostaje samo poklapanje po državi.
  return 1
}

// Odabir najboljeg oglasa iz liste. Kod izjednačenja odlučuje priority
// (veći broj ima prednost), koji do sada uopšte nije bio korišten.
export function odaberiOglas(lokacija, oglasi) {
  const kandidati = (oglasi || [])
    .map((o) => ({ oglas: o, bod: bodujOglas(lokacija, o) }))
    .filter((k) => k.bod !== NIJE_ZA_PRIKAZ)

  if (!kandidati.length) return null

  kandidati.sort((a, b) =>
    b.bod - a.bod || (Number(b.oglas.priority) || 0) - (Number(a.oglas.priority) || 0)
  )
  return kandidati[0].oglas
}
