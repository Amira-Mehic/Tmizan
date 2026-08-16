// ============================================================================
// Ta'lim - opisi metoda učenja (naziv + objašnjenje, bs/en) i slug bloga za
// "Pročitaj više →" link. Dijele ga TalimWizard (kratko objašnjenje pod
// odabranom metodom) i PlanRasporedPage (isto + expand/collapse na detaljima),
// da opisi uvijek budu identični na oba mjesta.
// ============================================================================

export const METHOD_INFO = {
  bs: {
    postepeno: { naziv: "Postepeno nadograđivanje (20×)", opis: "Svaki novi ajet (ili kratki blok ajeta) ponavljaš 20 puta prije nego pređeš na sljedeći. Kad se cijela stranica sastavi kroz ovaj proces, blok automatski ulazi u sistem ponavljanja ('Tri dana'), tako da ne moraš ručno pamtiti šta treba ponoviti. Datum završetka je najpredvidljiviji kod ove metode jer ti kontrolišeš broj ponavljanja." },
    redom: { naziv: "Redom kroz mushaf", opis: "Učiš stranicu po stranicu, tačno onim redoslijedom koji si odabrao/la (od početka, od kraja, ili zadnji džuz pa redom). Sljedeća stranica se otključava tek kad prethodnu potvrdiš kao naučenu BEZ greške — ako je bilo greške, ostaješ na istoj stranici dok je ne savladaš čisto. Datum završetka je procjena jer zavisi od toga koliko brzo prolaziš potvrde." },
    krugovi: { naziv: "Bosanska metoda krugova", opis: "Gradivo se dijeli u krugove (cikluse) kroz koje prolaziš više puta, produbljujući pamćenje svakim krugom umjesto da odmah težiš savršenstvu na prvi pokušaj. Dobro za one koji uče u komadu pa se vraćaju da učvrste. Datum završetka je procjena jer broj potrebnih krugova varira od osobe do osobe." },
    halka: { naziv: "Halka / uz muallima", opis: "Muallim ti zadaje dio gradiva, a ti ga pripremiš i prijaviš da si spreman/na za preslušavanje. Sljedeći dio dobijaš tek nakon što muallim odobri prethodni. Tempo najviše zavisi od dostupnosti i procjene muallima, zato je ovdje procjena završetka najokvirnija." },
  },
  en: {
    postepeno: { naziv: "Gradual building (20×)", opis: "You repeat every new ayah (or short block) 20 times before moving to the next. Once a full page is assembled this way, the block automatically enters the review system ('Three days'), so you don't have to track what needs reviewing yourself. This method gives the most predictable finish date, since you control the repetition count." },
    redom: { naziv: "In order through the mushaf", opis: "You learn page by page, in the order you chose (from the start, from the end, or last juz then in order). The next page unlocks only after you confirm the previous one as learned with no mistakes — if there was a mistake, you stay on the same page until it's clean. The finish date is an estimate since it depends on how quickly you pass confirmations." },
    krugovi: { naziv: "Bosnian circles method", opis: "The material is split into circles (cycles) you go through multiple times, deepening memorization with each pass instead of aiming for perfection on the first attempt. Good for people who learn in bulk and come back to reinforce. The finish date is an estimate since the number of circles needed varies by person." },
    halka: { naziv: "Halaqa / with a muallim", opis: "Your muallim assigns you a portion, you prepare it and mark yourself ready for recitation. You get the next portion only after the muallim approves the previous one. Pace mostly depends on the muallim's availability and judgment, so the finish estimate here is the roughest." },
  },
};

// Slug bloga za "Pročitaj više →" - postovi se kreiraju/uređuju kroz
// blogger panel (/blogger/objave/nova) s ISTIM slugom da link radi.
export const METHOD_BLOG_SLUG = {
  postepeno: "postepeno-nadogradivanje-20-puta",
  redom: "redom-kroz-mushaf",
  krugovi: "bosanska-metoda-krugova",
  halka: "halka-uz-muallima",
};
