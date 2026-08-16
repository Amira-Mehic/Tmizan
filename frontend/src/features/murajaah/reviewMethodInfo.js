// ============================================================================
// Murajaa - opisi metoda ponavljanja (naziv + kratko objašnjenje, bs/en), za
// prikaz na koraku "Metoda" u Hifz Planneru (Plan ponavljanja). Isti obrazac
// kao features/talim/methodInfo.js (metode učenja) - svaka metoda ima jedan
// zajednički slug bloga gdje su SVE metode ponavljanja detaljno objašnjene
// na jednom mjestu (za razliku od učenja, gdje svaka metoda ima svoj post).
//
// Jezik opisa je namjerno jednostavan - piše se za ljude koji ne znaju ništa
// o programiranju i tehnologiji, samo žele znati kako da uče/ponavljaju
// Kur'an. Bez tehničkog žargona.
// ============================================================================

export const REVIEW_METHOD_INFO = {
  bs: {
    fibonacci: {
      naziv: "Fibonacci (1→2→3→5→8)",
      opis: "Kad nešto naučiš, ponoviš ga sutra, pa prekosutra, pa za tri dana, pa za pet, pa za osam — svaki put razmak se povećava. Ako pogriješiš, vraćaš se na početak niza i kreneš ispočetka. Dobra je za one koji redovno uče i brzo napreduju, jer razmak sam prati koliko dobro nešto znaš.",
    },
    tri_dana: {
      naziv: "Tri dana",
      opis: "Sve što naučiš prolazi kroz tri uzastopna dana ponavljanja — danas, sutra i prekosutra. Tek kad tri puta zaredom ponoviš bez greške, prelaziš na rjeđe, sedmično i mjesečno ponavljanje. Jednostavna je i predvidljiva, idealna za početnike koji se boje da će zaboraviti ono što su upravo naučili.",
    },
    sedam_dana: {
      naziv: "Sedam dana",
      opis: "Svaku novu stranicu ili suru ponavljaš sedam dana zaredom, bez preskakanja, a onda slijedi dvosedmična pauza prije novog kruga. Sporija je od ostalih metoda, ali gradi vrlo čvrsto pamćenje jer mozgu daje dovoljno vremena da materijal zaista usvoji. Pogodna je za one koji rade polako i temeljito, ili koji su ranije brzo zaboravljali naučeno.",
    },
    dzuzevi: {
      naziv: "Sistem džuzeva",
      opis: "Najstarija i najraširenija hafiska metoda: cijeli Kur'an je podijeljen na 30 džuzeva, i svaki dan ponavljaš jedan džuz, tako da za mjesec dana prođeš kompletan hifz. Ako još nemaš naučen cijeli Kur'an, krug se prilagođava broju džuzeva koje već znaš. Odlična je za one koji već imaju priličan dio hifza i žele ga trajno održavati.",
    },
    stranice: {
      naziv: "Po stranicama",
      opis: "Sam biraš koliko stranica dnevno želiš ponoviti — recimo deset — i svaki dan dobijaš sljedeći set stranica, bez obzira kad si ih naučio ili kojem džuzu pripadaju. Kad prođeš sve naučene stranice, krug kreće ispočetka. Idealna je za one koji vole slobodu i žele sami prilagođavati tempo prema tome koliko vremena tog dana imaju.",
    },
    seton: {
      naziv: "Šetonova metoda (8 dijelova)",
      opis: "Cijeli tvoj hifz se dijeli na osam približno jednakih dijelova, i svaki dan ponavljaš jedan dio — tako za osam dana prođeš sve što znaš, čak dva puta sedmično. Intenzivnija je od sistema džuzeva i drži znanje uvijek svježim. Pogodna je za napredne hafize i studente koji trebaju biti spremni za recitovanje pred muallimom u svakom trenutku.",
    },
    novo_staro: {
      naziv: "Novo i staro",
      opis: "Svaku sesiju ponavljanja dijeliš na dva dijela: pola vremena posvetiš onome što si naučio u zadnjih dvije sedmice ('novo'), a pola onome što si naučio prije mjesec dana ili više ('staro'). Tako paziš i da ti svježe znanje ne izblijedi, i da se starije gradivo ne zaboravi. Dobra je za sve koji napreduju, ali se boje da će zaboraviti ono što su ranije naučili.",
    },
    greske: {
      naziv: "Na osnovu grešaka",
      opis: "Umjesto fiksnog rasporeda, ova metoda prati TVOJE greške — što više puta pogriješiš na nekom ajetu ili stranici, to će se češće vraćati u tvoj raspored, sve dok ne postane sigurno. Dijelove koje dobro znaš ponavljaš rjeđe, pa ne gubiš vrijeme na ono što ionako umiješ. Najbolja je za one koji dobro poznaju svoje slabe tačke i žele efikasnije trošiti vrijeme.",
    },
    nivo: {
      naziv: "Po hafizovom nivou",
      opis: "Ovo nije posebna metoda ponavljanja, nego podešavanje koje se dodaje na sve ostale metode prema tvom trenutnom nivou. Početnicima daje manji dnevni cilj i češća ponavljanja, dok naprednim hafizima daje brži tempo i više fokusa na održavanje. Nivo možeš promijeniti bilo kad kako napreduješ.",
    },
    slobodan: {
      naziv: "Slobodan raspored",
      opis: "Za one koji već imaju svoj ustaljeni način ponavljanja i ne trebaju da im aplikacija govori šta i kada da rade. U ovom modu aplikacija ne pravi raspored — samo bilježi šta si odradio/la i vodi tvoju historiju i statistiku. Pogodna je za iskusne hafize sa vlastitim sistemom ili one koji žele koristiti aplikaciju samo za praćenje.",
    },
    mualim: {
      naziv: "Muallimov plan",
      opis: "Ovdje raspored ne pravi aplikacija, nego tvoj muallim — na osnovu onoga što zna o tebi, tvom tempu i tvojim slabim tačkama. Muallim ti zadaje sedmične zadatke i rokove i ostavlja bilješke, a taj plan ti se prikazuje kao prioritetan, iznad svih automatskih rasporeda. Idealna je za učenike koji imaju aktivnog muallima koji želi direktno voditi njihovo ponavljanje.",
    },
    femi: {
      naziv: "Femi bi Ševk",
      opis: "Klasična, stoljetna podjela cijelog Kur'ana na sedam približno jednakih dijelova, po jedan za svaki dan sedmice — tako svake sedmice završiš jednu potpunu hatmu ponavljanja. Ovo je tradicionalni sistem koji su generacijama koristili učeni ljudi da drže cijeli Kur'an svježim u pamćenju. Pogodna je za one koji žele redovno prolaziti kompletan hifz, sedmicu za sedmicom.",
    },
    dzuz_sedmica: {
      naziv: "Džuz kroz sedmicu",
      opis: "Sličan sistemu džuzeva, ali usporen: umjesto da jedan džuz ponoviš u jednom danu, tog istog džuza se držiš cijelu sedmicu, raspoređenog na manje, lakše dnevne porcije. Pogodna je za one kojima puni džuz dnevno nije realan, ali i dalje žele redovno prolaziti kroz cijeli svoj hifz.",
    },
    dinamicna: {
      naziv: "Dinamična raspodjela",
      opis: "Aplikacija svaki dan pogleda koliko ti je stvarno vremena i truda ostalo, pa sama prilagodi koliko ćeš danas ponavljati — ako jedan dan uradiš više, sutra ti je lakše, a ako propustiš dan, raspored se pametno preraspoređuje umjesto da te 'kazni'. Dobra je za one čiji se dnevni raspored često mijenja, a ipak žele vođen plan.",
    },
    srs: {
      naziv: "SRS (naučni model)",
      opis: "Zasnovana na naučnim istraživanjima o pamćenju: ono što dobro znaš ponavljaš sve rjeđe (za dan, pa sedmicu, pa mjesec, pa i po pola godine), a ono što ti pravi problem vraća se brzo, sve dok ne postane sigurno. Aplikacija sama prati svaki ajet i odlučuje kad je pravo vrijeme za ponavljanje — ti samo dolaziš i radiš ono što ti pokaže.",
    },
  },
  en: {
    fibonacci: {
      naziv: "Fibonacci (1→2→3→5→8)",
      opis: "Every time you review something successfully, the next review is pushed further into the future — tomorrow, then in three days, then five, then eight. A mistake resets it back to the start of the sequence. Great for active learners who review regularly, since the gaps automatically match how well you know the material.",
    },
    tri_dana: {
      naziv: "Three Days",
      opis: "Everything you learn goes through three days of review in a row — today, tomorrow, and the day after. Only once you've reviewed it correctly three times running do you move to weekly, then monthly review. Simple and predictable, ideal for beginners worried about forgetting what they just learned.",
    },
    sedam_dana: {
      naziv: "Seven Days",
      opis: "Every new page or surah gets reviewed seven days in a row, no skipping, followed by a two-week break before the next round. Slower than other methods, but it builds very solid memory by giving your brain plenty of time to truly absorb the material. Good for those who prefer to work slowly and thoroughly.",
    },
    dzuzevi: {
      naziv: "Juz System",
      opis: "The oldest and most widespread hafiz method: the whole Qur'an is split into 30 juz, and you review one juz a day, completing the full cycle every month. If you haven't memorized the whole Qur'an yet, the cycle adjusts to however many juz you already know. Excellent for those with a solid amount of hifz who want to keep it permanently fresh.",
    },
    stranice: {
      naziv: "By Pages",
      opis: "You decide how many pages you want to review each day — say ten — and you get the next set of pages each day, regardless of when you learned them or which juz they belong to. Once you've gone through everything you know, the cycle starts over. Ideal for people who like flexibility and want to adjust their pace to however much time they have that day.",
    },
    seton: {
      naziv: "Seton Method (8 parts)",
      opis: "Your whole hifz is split into eight roughly equal parts, and you review one part a day — so every eight days you've gone through everything you know, twice a week. More intensive than the juz system, keeping your memorization always fresh. Suited to advanced huffaz who need to be ready to recite at any moment.",
    },
    novo_staro: {
      naziv: "New and Old",
      opis: "Every review session is split in two: half the time goes to what you learned in the last two weeks ('new'), and half to what you learned a month or more ago ('old'). This way your fresh memorization doesn't fade, and your older memorization doesn't get forgotten either. Good for anyone worried about losing what they learned earlier.",
    },
    greske: {
      naziv: "Based on Mistakes",
      opis: "Instead of a fixed schedule, this method tracks your own mistakes — the more times you slip up on an ayah or page, the more often it comes back into your schedule, until it's solid. Parts you already know well are reviewed less often. Best for learners who know their weak spots and want to spend their time more efficiently.",
    },
    nivo: {
      naziv: "By Hafiz Level",
      opis: "This isn't a review method on its own — it's an adjustment layered on top of every other method, based on your current level. Beginners get a smaller daily goal and more frequent repetition, while advanced huffaz get a faster pace and more focus on upkeep. You can change your level anytime as you progress.",
    },
    slobodan: {
      naziv: "Free Schedule",
      opis: "For those who already have their own established review routine and don't need the app to tell them what to do. In this mode the app doesn't build a schedule — it simply logs what you did and keeps your history and stats. Great for experienced huffaz with their own system.",
    },
    mualim: {
      naziv: "Muallim's Plan",
      opis: "Here the schedule isn't built by the app but by your own teacher, based on what they know about your pace and weak points. Your muallim assigns weekly tasks, deadlines, and notes, and this plan shows up as your top priority, above any automatic schedule. Ideal for students with an active muallim guiding their review.",
    },
    femi: {
      naziv: "Femi bi Shevk",
      opis: "A classical, centuries-old division of the whole Qur'an into seven roughly equal parts, one for each day of the week — so every week you complete one full cycle of review. This is the traditional system scholars have used for generations to keep the entire Qur'an fresh in memory.",
    },
    dzuz_sedmica: {
      naziv: "Juz Across the Week",
      opis: "Similar to the juz system, but slower: instead of reviewing a whole juz in one day, you spread that same juz across a full week in smaller, easier daily portions. Good for those for whom a full juz a day isn't realistic, but who still want to steadily work through their whole hifz.",
    },
    dinamicna: {
      naziv: "Dynamic Distribution",
      opis: "Every day, the app looks at how much time and effort you actually have left and adjusts how much you review today — do more one day and tomorrow gets lighter; miss a day and the schedule smartly redistributes instead of punishing you. Good for anyone whose daily schedule changes often.",
    },
    srs: {
      naziv: "SRS (Scientific Model)",
      opis: "Based on scientific research into how memory works: things you know well get reviewed less and less often (a day, a week, a month, even every six months), while anything giving you trouble comes back quickly until it's solid. The app tracks every ayah and decides when it's really time to review — you just show up and do what it shows you.",
    },
  },
};

// Svih 16 metoda ponavljanja je detaljno objašnjeno na JEDNOM zajedničkom
// postu na blogu (za razliku od metoda učenja, gdje svaka ima svoj slug).
export const REVIEW_METHODS_BLOG_SLUG = "metode-ponavljanja-kurana";
