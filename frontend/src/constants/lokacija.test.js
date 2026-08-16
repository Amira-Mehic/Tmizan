// ============================================================================
// Lokacija i geo-ciljanje oglasa - testovi (čisti Node, bez framework-a)
// Pokretanje:  node src/constants/lokacija.test.js   (iz frontend/)
// ============================================================================

import {
  normalize, isteVrijednosti, regijaZaGrad, imaSpisakGradova, gradoviZaDrzavu,
  bodujOglas, odaberiOglas, NIJE_ZA_PRIKAZ, BA_GRADOVI, COUNTRIES, countryName,
  drzaveZaPrikaz, CESTE_DRZAVE,
} from "./lokacija.js";

let passed = 0, failed = 0;
function assert(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; console.error(`✗ ${name}\n    očekivano: ${e}\n    dobijeno:  ${a}`); }
}

// ── NORMALIZACIJA ───────────────────────────────────────────────────────────
{
  assert("normalize: velika slova i razmaci", normalize("  SaRaJeVo "), "sarajevo");
  assert("normalize: dijakritici", normalize("Živinice"), "zivinice");
  assert("normalize: Široki Brijeg", normalize("Široki Brijeg"), "siroki brijeg");
  assert("normalize: višestruki razmaci", normalize("Novi   Travnik"), "novi travnik");
  assert("normalize: prazno", normalize(null), "");

  assert("isteVrijednosti: različit oblik istog grada", isteVrijednosti("sarajevo", "Sarajevo"), true);
  assert("isteVrijednosti: dijakritik", isteVrijednosti("Žepče", "zepce"), true);
  assert("isteVrijednosti: različiti gradovi", isteVrijednosti("Mostar", "Tuzla"), false);
  // Prazno se nikad ne smije smatrati poklapanjem, inače bi oglas bez ciljanja
  // "pogodio" korisnika bez lokacije i preskočio provjeru.
  assert("isteVrijednosti: prazno nije poklapanje", isteVrijednosti("", ""), false);
  assert("isteVrijednosti: null nije poklapanje", isteVrijednosti(null, "Tuzla"), false);
}

// ── SPISAK GRADOVA I REGIJA ─────────────────────────────────────────────────
{
  assert("spisak gradova postoji samo za BiH", imaSpisakGradova("BA"), true);
  assert("Njemačka nema spisak gradova", imaSpisakGradova("DE"), false);
  assert("gradovi za DE su prazni", gradoviZaDrzavu("DE").length, 0);
  assert("BiH ima više od 90 gradova", BA_GRADOVI.length > 90, true);

  assert("regija: Tuzla", regijaZaGrad("BA", "Tuzla"), "Tuzlanski kanton");
  assert("regija: Sarajevo", regijaZaGrad("BA", "Sarajevo"), "Kanton Sarajevo");
  assert("regija: Banja Luka", regijaZaGrad("BA", "Banja Luka"), "Republika Srpska");
  assert("regija: Brčko", regijaZaGrad("BA", "Brčko"), "Brčko distrikt");
  assert("regija radi i za ranije ručno unesen oblik", regijaZaGrad("BA", "  mostar "), "Hercegovačko-neretvanski kanton");
  assert("regija: nepoznat grad", regijaZaGrad("BA", "Vukovar"), null);
  assert("regija: država bez spiska", regijaZaGrad("DE", "Berlin"), null);

  assert("svaki grad ima regiju", BA_GRADOVI.every(g => !!g.region), true);
  assert("nema duplikata gradova", new Set(BA_GRADOVI.map(g => g.city)).size, BA_GRADOVI.length);
}

// ── DRŽAVE ──────────────────────────────────────────────────────────────────
{
  assert("spisak sadrži sve države svijeta", COUNTRIES.length > 240, true);
  assert("svaka država ima kod i oba naziva",
    COUNTRIES.every(c => !!c.code && !!c.bs && !!c.en), true);
  assert("nema duplih kodova", new Set(COUNTRIES.map(c => c.code)).size, COUNTRIES.length);
  assert("svi kodovi su dva slova ili OTHER",
    COUNTRIES.every(c => c.code === "OTHER" || /^[A-Z]{2}$/.test(c.code)), true);

  assert("countryName: BA na bosanskom", countryName("BA"), "Bosna i Hercegovina");
  assert("countryName: BA na engleskom", countryName("BA", "en"), "Bosnia & Herzegovina");
  assert("countryName: bosanski oblik za Holandiju", countryName("NL"), "Holandija");
  assert("countryName: bosanski oblik za Veliku Britaniju", countryName("GB"), "Velika Britanija");
  // Ranija, kraća lista je imala vrijednost OTHER - profili koji su je sačuvali
  // moraju i dalje raditi.
  assert("countryName: zadržan OTHER iz ranije verzije", countryName("OTHER"), "Ostalo");
  assert("countryName: nepoznat kod se vraća kakav jeste", countryName("XYZ"), "XYZ");
  assert("countryName: prazno", countryName(null), "");

  // Provjera da su ušle države koje su bitne za dijasporu i muslimanski svijet
  const kodovi = new Set(COUNTRIES.map(c => c.code));
  assert("sadrži ključne države",
    ["BA","HR","RS","ME","SI","MK","DE","AT","CH","SE","NO","DK","NL","US","CA","AU","TR","SA","AE","EG","MY","ID","PK","XK"]
      .every(c => kodovi.has(c)), true);
  // Nadnacionalni i povučeni kodovi ne smiju biti u spisku
  assert("ne sadrži tehničke i povučene kodove",
    ["EU","UN","ZZ","YU","SU","AQ"].some(c => kodovi.has(c)), false);

  const { ceste, ostale } = drzaveZaPrikaz("bs");
  assert("najčešće države su izdvojene", ceste.length, CESTE_DRZAVE.length);
  assert("BiH je prva među najčešćim", ceste[0].code, "BA");
  assert("obje grupe zajedno daju cijeli spisak", ceste.length + ostale.length, COUNTRIES.length);
  assert("nema preklapanja između grupa",
    ostale.some(c => CESTE_DRZAVE.includes(c.code)), false);
  assert("ostale su abecedno poredane po bosanskom nazivu",
    ostale.map(c => c.bs).join("|") ===
    [...ostale].sort((a, b) => a.bs.localeCompare(b.bs, "bs")).map(c => c.bs).join("|"), true);
}

// ── BODOVANJE OGLASA ────────────────────────────────────────────────────────
const tuzlak = { country: "BA", city: "Tuzla", region: "Tuzlanski kanton" };

{
  const globalni = { target_country: null, target_city: null, target_region: null };
  const zaBiH = { target_country: "BA", target_city: null, target_region: null };
  const zaTuzlu = { target_country: "BA", target_city: "Tuzla", target_region: "Tuzlanski kanton" };
  const zaTK = { target_country: "BA", target_city: null, target_region: "Tuzlanski kanton" };
  const zaMostar = { target_country: "BA", target_city: "Mostar", target_region: "Hercegovačko-neretvanski kanton" };
  const zaHrvatsku = { target_country: "HR", target_city: null, target_region: null };

  assert("bod: globalni oglas", bodujOglas(tuzlak, globalni), 0);
  assert("bod: ciljana država", bodujOglas(tuzlak, zaBiH), 1);
  assert("bod: ciljana regija", bodujOglas(tuzlak, zaTK), 2);
  assert("bod: ciljani grad", bodujOglas(tuzlak, zaTuzlu), 3);

  // Ovo je bila glavna greška ranije: oglas za drugi grad dobijao je istu
  // težinu kao oglas za korisnikov grad.
  assert("bod: oglas za drugi grad se ne prikazuje", bodujOglas(tuzlak, zaMostar), NIJE_ZA_PRIKAZ);
  assert("bod: oglas za drugu državu se ne prikazuje", bodujOglas(tuzlak, zaHrvatsku), NIJE_ZA_PRIKAZ);

  assert("bod: grad se poredi bez obzira na oblik zapisa",
    bodujOglas({ country: "ba", city: "tuzla", region: null }, zaTuzlu), 3);

  // Korisnik bez lokacije smije vidjeti samo globalne oglase.
  const bezLokacije = { country: null, city: null, region: null };
  assert("bod: korisnik bez lokacije vidi globalni", bodujOglas(bezLokacije, globalni), 0);
  assert("bod: korisnik bez lokacije ne vidi ciljani", bodujOglas(bezLokacije, zaBiH), NIJE_ZA_PRIKAZ);

  // Korisnik iz grada koji nije na spisku nema regiju, pa regijski oglas otpada.
  const bezRegije = { country: "BA", city: "Nepoznato", region: null };
  assert("bod: bez regije otpada regijski oglas", bodujOglas(bezRegije, zaTK), NIJE_ZA_PRIKAZ);
  assert("bod: bez regije i dalje vrijedi državni oglas", bodujOglas(bezRegije, zaBiH), 1);
}

// ── ODABIR POBJEDNIKA ───────────────────────────────────────────────────────
{
  const globalni = { id: "g", target_country: null, target_city: null, target_region: null, priority: 0 };
  const zaBiH = { id: "ba", target_country: "BA", target_city: null, target_region: null, priority: 0 };
  const zaTK = { id: "tk", target_country: "BA", target_city: null, target_region: "Tuzlanski kanton", priority: 0 };
  const zaTuzlu = { id: "tz", target_country: "BA", target_city: "Tuzla", target_region: "Tuzlanski kanton", priority: 0 };
  const zaMostar = { id: "mo", target_country: "BA", target_city: "Mostar", target_region: null, priority: 99 };

  assert("odabir: najprecizniji pobjeđuje",
    odaberiOglas(tuzlak, [globalni, zaBiH, zaTK, zaTuzlu]).id, "tz");
  assert("odabir: regija ispred države",
    odaberiOglas(tuzlak, [globalni, zaBiH, zaTK]).id, "tk");
  assert("odabir: država ispred globalnog",
    odaberiOglas(tuzlak, [globalni, zaBiH]).id, "ba");

  // Visok prioritet ne smije nadjačati činjenicu da oglas cilja drugi grad.
  assert("odabir: visok prioritet ne spašava pogrešan grad",
    odaberiOglas(tuzlak, [globalni, zaMostar]).id, "g");

  // Prioritet odlučuje samo kad su oglasi jednako precizni.
  const a = { id: "a", target_country: "BA", target_city: null, target_region: null, priority: 1 };
  const b = { id: "b", target_country: "BA", target_city: null, target_region: null, priority: 5 };
  assert("odabir: kod izjednačenja odlučuje prioritet", odaberiOglas(tuzlak, [a, b]).id, "b");

  assert("odabir: nema kandidata", odaberiOglas(tuzlak, [zaMostar]), null);
  assert("odabir: prazna lista", odaberiOglas(tuzlak, []), null);
  assert("odabir: lista je null", odaberiOglas(tuzlak, null), null);
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed) process.exit(1);
