// Mock blog postovi - zamijeniti Supabase podacima kada baza bude gotova
// localStorage ključ za blogger-ove postove: "tmizan_blog_posts"

export const CATEGORIES = [
  { id: "sve",        label: "Sve",         labelEn: "All" },
  { id: "hifz",      label: "Hifz",        labelEn: "Hifz" },
  { id: "tedzvid",   label: "Tedžvid",     labelEn: "Tajweed" },
  { id: "motivacija",label: "Motivacija",  labelEn: "Motivation" },
  { id: "arapski",   label: "Arapski",     labelEn: "Arabic" },
  { id: "vijesti",   label: "Vijesti",     labelEn: "News" },
  { id: "zdravlje",  label: "Zdravlje",    labelEn: "Health" },
]

export const MOCK_POSTS = [
  {
    id: "1",
    slug: "kako-zapoceti-hifz",
    title: "Kako pravilno započeti hifz — praktičan vodič za početnike",
    titleEn: "How to Start Hifz — A Practical Guide for Beginners",
    excerpt: "Hifz nije samo memorisanje — to je putovanje koje zahtijeva disciplinu, strpljenje i pravu metodologiju. Evo koraka koji su dokazano efikasni.",
    excerptEn: "Hifz is not just memorization — it's a journey requiring discipline, patience, and the right methodology.",
    content: `Hifz Kur'ana je jedna od najuzvišenijih ibadeta koje musliman može obavljati. Međutim, mnogi počinjači čine greške koje ih usporavaju ili potpuno zaustavljaju.

## Priprema prije početka

Prije nego što upišeš prvu suru, odredi:
- **Tačan dio dana** kada učiš (ujutro je mozak najsvježiji)
- **Koliko stranica dnevno** — počni od pola stranice
- **Mualima** koji će pratiti tvoj napredak

## Metodologija ponavljanja

Naučena sura mora se ponavljati svaki dan prvih 7 dana, zatim sedmično. Bez sistematičnog ponavljanja, čak i naučene sure se zaboravljaju.

## Koristite Tmizan Hifz Planer

Naša aplikacija ti omogućava da pratiš svaki ajet, bilježiš greške i vidiš vizuelni napredak na svih 604 stranica mushafa.`,
    contentEn: `Hifz of the Quran is one of the most noble acts of worship a Muslim can undertake.`,
    thumbnail: "https://images.unsplash.com/photo-1585036156171-384164a8c675?w=800&q=80",
    video: null,
    author: "Tmizan tim",
    authorEn: "Tmizan Team",
    authorEmail: "blogger123@gmail.com",
    date: "2026-06-10",
    category: "hifz",
    readTime: 5,
    featured: true,
    published: true,
  },
  {
    id: "2",
    slug: "osnove-tedzvida",
    title: "7 osnovnih pravila tedžvida koja svaki učač mora znati",
    titleEn: "7 Essential Tajweed Rules Every Reciter Must Know",
    excerpt: "Tedžvid nije opcija — to je farz kifaja za sve muslimane koji uče Kur'an. Ovih 7 pravila su temelj ispravne recitacije.",
    excerptEn: "Tajweed is not optional — here are 7 fundamental rules every Muslim reciter must know.",
    content: `## Šta je tedžvid?

Tedžvid (تجويد) znači uljepšavanje i dotjerivanje. U kontekstu Kur'ana, to je skup pravila za ispravno izgovaranje harfova.

## 7 ključnih pravila

1. **Idgam** — spajanje nunacija sa sljedećim harfom
2. **Izhhar** — jasno izgovaranje nunacije
3. **Ikhfa** — prikrivanje nunacije
4. **Madd** — produžavanje vokala
5. **Qalqala** — vibracija harfova
6. **Tafkhim i Tarqiq** — pojačavanje i umekšavanje harfova
7. **Waqf** — pravila stanke`,
    contentEn: `Tajweed rules are essential for correct Quran recitation.`,
    thumbnail: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800&q=80",
    video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    author: "Ustaz Kenan",
    authorEn: "Ustaz Kenan",
    authorEmail: "blogger123@gmail.com",
    date: "2026-06-05",
    category: "tedzvid",
    readTime: 8,
    featured: false,
    published: true,
  },
  {
    id: "3",
    slug: "motivacija-za-ucenje",
    title: "Kako održati motivaciju kada postane teško",
    titleEn: "How to Stay Motivated When It Gets Hard",
    excerpt: "Svaki student prolazi kroz periode slabije motivacije. Ovo su provjerene strategije koje pomažu da nastaviš čak i kada ti je najteže.",
    excerptEn: "Every student goes through periods of low motivation. These proven strategies help you continue even when it's hardest.",
    content: `## Normalno je imati loše dane

Čak i najveći hafizi su prolazili kroz periode kada im se nije učilo. Razlika je u tome što su imali strategije za prevazilaženje tih trenutaka.

## Strategije koje rade

**1. Smanji, ne prestaj**
Ako ti je cilj 1 stranica dnevno, a danas ne možeš — uči samo jedan ajet. Kontinuitet je važniji od količine.

**2. Vrati se uzroku**
Sjeti se zašto si počeo. Napiši to negdje vidljivo.

**3. Zajednica**
Nađi ljude koji uče. Tmizan platforma ti omogućava da se povežeš s mualimom koji te prati.`,
    contentEn: `Every student has hard days. The key is to keep going with the right strategies.`,
    thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    video: null,
    author: "Amina H.",
    authorEn: "Amina H.",
    authorEmail: "blogger123@gmail.com",
    date: "2026-05-28",
    category: "motivacija",
    readTime: 4,
    featured: false,
    published: true,
  },
  {
    id: "4",
    slug: "arapski-za-pocetnike",
    title: "Arapski harfovi — od nule do čitanja za 30 dana",
    titleEn: "Arabic Letters — From Zero to Reading in 30 Days",
    excerpt: "Mnogi misle da je arapsko pismo teško. Zapravo, uz pravu metodologiju, možeš naučiti čitati za samo 30 dana.",
    excerptEn: "Many think Arabic script is hard. With the right method, you can learn to read in just 30 days.",
    content: `## Mit o "teškom" arapskom pismu

Arapsko pismo ima 28 harfova. Engleski alphabet ima 26. Razlika nije u kompleksnosti — razlika je u metodologiji učenja.

## Plan od 30 dana

- **Dani 1-10**: Uči po 3 harfa dnevno s vokalima
- **Dani 11-20**: Vežbaj spajanje harfova u slogove
- **Dani 21-30**: Čitaj kratke sure iz Kur'ana

Tmizan Sufara modul sadrži interaktivni grid svih harfova s audio primjerima.`,
    contentEn: `Arabic has 28 letters. With the right methodology, you can learn to read in 30 days.`,
    thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80",
    video: null,
    author: "Tmizan tim",
    authorEn: "Tmizan Team",
    authorEmail: "blogger123@gmail.com",
    date: "2026-05-20",
    category: "arapski",
    readTime: 6,
    featured: false,
    published: true,
  },
  {
    id: "5",
    slug: "tmizan-lansiranje",
    title: "Tmizan — nova platforma za islamsko obrazovanje je ovdje",
    titleEn: "Tmizan — New Islamic Education Platform Is Here",
    excerpt: "Sa zadovoljstvom predstavljamo Tmizan — prvu adaptivnu platformu za praćenje hifza, tedžvida i arapskog jezika na našem podneblju.",
    excerptEn: "We proudly present Tmizan — the first adaptive platform for Hifz, Tajweed and Arabic learning in our region.",
    content: `## Dobrodošli na Tmizan

Nakon dugotrajnog razvoja, ponosno predstavljamo Tmizan — platformu koja revolucioniše način na koji učimo i pratimo napredak u islamskom obrazovanju.

## Šta Tmizan nudi?

**Hifz Planer** — vizuelna mapa svih 604 stranica mushafa s trackingom po svakom ajetu

**Tedžvid modul** — pravila s statusima (Developing, Stable, Strong)

**Sufara** — interaktivni arapski alfabet za početnike

**Veza s mualimom** — direktna komunikacija i praćenje napretka

## Besplatno za početnike

Osnovna funkcionalnost je besplatna. Napredne opcije s mualimom su dostupne u Premium planu.`,
    contentEn: `Tmizan is a new platform for Islamic education featuring Hifz tracking, Tajweed modules, and Arabic learning.`,
    thumbnail: "https://images.unsplash.com/photo-1574192435627-54e97a56c6a8?w=800&q=80",
    video: null,
    author: "Tmizan tim",
    authorEn: "Tmizan Team",
    authorEmail: "blogger123@gmail.com",
    date: "2026-05-15",
    category: "vijesti",
    readTime: 3,
    featured: false,
    published: true,
  },
  {
    id: "6",
    slug: "ponavljanje-kljuc-hifza",
    title: "Ponavljanje je ključ hifza — kako sistematizovati murajaah",
    titleEn: "Repetition is the Key to Hifz — How to Systematize Murajaah",
    excerpt: "Naučiti novu stranicu relativno je lako. Zadržati sve naučeno je pravo umijeće. Ovo je sistem koji funkcioniše.",
    excerptEn: "Learning a new page is relatively easy. Retaining everything learned is the real art. Here's a system that works.",
    content: `## Zašto se hifz gubi?

Mozak prirodno zaboravlja informacije kojima se ne vraća. Ebbinghausova kriva zaboravljanja pokazuje da zaboravljamo 50% u prvom danu, 70% u prvoj sedmici bez ponavljanja.

## Spaced Repetition za hifz

- **Dan 1**: Nauči novu stranicu
- **Dan 2**: Ponovi novu + jučerašnju
- **Dan 3**: Ponovi novu + prethodne 2
- **Sedmično**: Ponavljaj sve naučeno

Tmizan automatski prati tvoj raspored ponavljanja i obavještava te kada koji dio treba ponoviti.`,
    contentEn: `The Ebbinghaus forgetting curve shows we forget 50% within the first day without review.`,
    thumbnail: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
    video: null,
    author: "Ustaz Kenan",
    authorEn: "Ustaz Kenan",
    authorEmail: "blogger123@gmail.com",
    date: "2026-05-10",
    category: "hifz",
    readTime: 7,
    featured: false,
    published: true,
  },
  {
    id: "7",
    slug: "metode-ponavljanja-kurana",
    title: "Petnaest metoda ponavljanja Kur'ana — koja je prava za tebe?",
    titleEn: "Fifteen Qur'an Review Methods — Which One Is Right for You?",
    excerpt: "Ponavljanje je ono što tvoj hifz čini trajnim. Ovih petnaest metoda pokriva svakoga — od potpunih početnika do hafiza koji već imaju kompletan Kur'an napamet. Evo kratkog vodiča kroz svaku.",
    excerptEn: "Review is what makes your hifz permanent. These fifteen methods cover everyone, from complete beginners to huffaz who already hold the whole Qur'an. Here's a short guide through each one.",
    content: `Kad naučiš novu stranicu Kur'ana, pravi posao tek počinje. Samo učenje je relativno lako — teško je zadržati sve što si naučio, mjesecima i godinama poslije. Za to služi murajaa, ponavljanje onoga što već znaš, i upravo je ponavljanje ono što jedan hifz čini trajnim umjesto privremenim.

Problem je što svaki hafiz pamti drugačije i ima drugačije potrebe. Neko je tek počeo i boji se da će zaboraviti stranicu koju je jučer naučio. Neko već ima priličan dio hifza i samo želi da ga održava svježim. Neko ima muallima koji mu zadaje raspored, a neko uči potpuno sam. Zato u Tmizanu postoji petnaest metoda ponavljanja — da svako pronađe onu koja mu najviše odgovara, umjesto da se prilagođava jednom jedinom kalupu.

Ispod je kratak pregled svake metode. Metodu možeš izabrati i promijeniti u svakom trenutku, u Hifz Planeru pod korakom "Metoda".

## Fibonacci (1→2→3→5→8)
Kad nešto naučiš, ponoviš ga sutra, pa prekosutra, pa za tri dana, pa za pet, pa za osam dana — svaki put je razmak veći. Ako pogriješiš, vraćaš se na početak niza. Pogodna je za one koji redovno uče i brzo napreduju, jer razmak sam prati koliko dobro nešto znaš.

## Tri dana
Sve što naučiš prolazi kroz tri uzastopna dana ponavljanja — danas, sutra i prekosutra. Tek kad tri puta zaredom ponoviš bez greške, prelaziš na rjeđe, sedmično i mjesečno ponavljanje. Jednostavna je i predvidljiva, idealna za početnike koji se boje da će zaboraviti ono što su upravo naučili.

## Sedam dana
Svaku novu stranicu ili suru ponavljaš sedam dana zaredom, bez preskakanja, a onda slijedi dvosedmična pauza prije novog kruga. Sporija je od ostalih metoda, ali gradi vrlo čvrsto pamćenje jer daje dovoljno vremena da se gradivo zaista usvoji. Pogodna je za one koji rade polako i temeljito, ili koji su ranije brzo zaboravljali naučeno.

## Sistem džuzeva
Najstarija i najraširenija hafiska metoda: cijeli Kur'an je podijeljen na 30 džuzeva, i svaki dan ponavljaš jedan džuz, tako da za mjesec dana prođeš kompletan hifz. Ako još nemaš naučen cijeli Kur'an, krug se prilagođava broju džuzeva koje već znaš. Odlična je za one koji već imaju priličan dio hifza i žele ga trajno održavati.

## Po stranicama
Sam biraš koliko stranica dnevno želiš ponoviti — recimo deset — i svaki dan dobijaš sljedeći set stranica, bez obzira kad si ih naučio ili kojem džuzu pripadaju. Kad prođeš sve naučene stranice, krug kreće ispočetka. Idealna je za one koji vole slobodu i žele sami prilagođavati tempo prema tome koliko vremena tog dana imaju.

## Šetonova metoda (8 dijelova)
Cijeli tvoj hifz se dijeli na osam približno jednakih dijelova, i svaki dan ponavljaš jedan dio — tako za osam dana prođeš sve što znaš, čak dva puta sedmično. Intenzivnija je od sistema džuzeva i drži znanje uvijek svježim. Pogodna je za napredne hafize i studente koji trebaju biti spremni za recitovanje pred muallimom u svakom trenutku.

## Novo i staro
Svaku sesiju ponavljanja dijeliš na dva dijela: pola vremena posvetiš onome što si naučio u zadnjih dvije sedmice ("novo"), a pola onome što si naučio prije mjesec dana ili više ("staro"). Tako paziš i da ti svježe znanje ne izblijedi, i da se starije gradivo ne zaboravi. Dobra je za sve koji napreduju, ali se boje da će zaboraviti ono što su ranije naučili.

## Na osnovu grešaka
Umjesto fiksnog rasporeda, ova metoda prati tvoje greške — što više puta pogriješiš na nekom ajetu ili stranici, to će se češće vraćati u tvoj raspored, sve dok ne postane sigurno. Dijelove koje dobro znaš ponavljaš rjeđe, pa ne gubiš vrijeme na ono što ionako umiješ. Najbolja je za one koji dobro poznaju svoje slabe tačke i žele efikasnije trošiti vrijeme.

## Po hafizovom nivou
Ovo nije posebna metoda za sebe, nego podešavanje koje se dodaje na sve ostale metode prema tvom trenutnom nivou. Početnicima daje manji dnevni cilj i češća ponavljanja, dok naprednim hafizima daje brži tempo i više fokusa na održavanje. Nivo možeš promijeniti bilo kad kako napreduješ.

## Slobodan raspored
Za one koji već imaju svoj ustaljeni način ponavljanja i ne trebaju da im aplikacija govori šta i kada da rade. U ovom modu aplikacija ne pravi raspored — samo bilježi šta si odradio/la i vodi tvoju historiju i statistiku. Pogodna je za iskusne hafize sa vlastitim sistemom ili one koji žele koristiti aplikaciju samo za praćenje.

## Muallimov plan
Ovdje raspored ne pravi aplikacija, nego tvoj muallim — na osnovu onoga što zna o tebi, tvom tempu i tvojim slabim tačkama. Muallim ti zadaje sedmične zadatke i rokove i ostavlja bilješke, a taj plan ti se prikazuje kao prioritetan, iznad svih automatskih rasporeda. Idealna je za učenike koji imaju aktivnog muallima koji želi direktno voditi njihovo ponavljanje.

## Femi bi Ševk
Klasična, stoljetna podjela cijelog Kur'ana na sedam približno jednakih dijelova, po jedan za svaki dan sedmice — tako svake sedmice završiš jednu potpunu hatmu ponavljanja. Ovo je tradicionalni sistem koji su generacijama koristili učeni ljudi da drže cijeli Kur'an svježim u pamćenju. Pogodna je za one koji žele redovno prolaziti kompletan hifz, sedmicu za sedmicom.

## Džuz kroz sedmicu
Sličan sistemu džuzeva, ali usporen: umjesto da jedan džuz ponoviš u jednom danu, tog istog džuza se držiš cijelu sedmicu, raspoređenog na manje, lakše dnevne porcije. Pogodna je za one kojima puni džuz dnevno nije realan, ali i dalje žele redovno prolaziti kroz cijeli svoj hifz.

## Dinamična raspodjela
Aplikacija svaki dan pogleda koliko ti je stvarno vremena i truda ostalo, pa sama prilagodi koliko ćeš danas ponavljati — ako jedan dan uradiš više, sutra ti je lakše, a ako propustiš dan, raspored se pametno preraspoređuje umjesto da te "kazni". Dobra je za one čiji se dnevni raspored često mijenja, a ipak žele vođen plan.

## SRS (naučni model)
Zasnovana na naučnim istraživanjima o pamćenju: ono što dobro znaš ponavljaš sve rjeđe (za dan, pa sedmicu, pa mjesec, pa i po pola godine), a ono što ti pravi problem vraća se brzo, sve dok ne postane sigurno. Aplikacija sama prati svaki ajet i odlučuje kad je pravo vrijeme za ponavljanje — ti samo dolaziš i radiš ono što ti pokaže.

## Koju metodu izabrati?
Ne postoji jedna "najbolja" metoda za sve — postoji ona koja odgovara tebi, tvom trenutnom hifzu i tvom rasporedu. Ako si tek na početku, Tri dana ili Sedam dana su siguran izbor. Ako već imaš dio hifza i želiš ga održavati, pogledaj Sistem džuzeva, Šetonovu metodu ili Femi bi Ševk. Ako imaš muallima, Muallimov plan ti daje najviše vođenja. A ako nisi siguran/na, slobodno probaj nekoliko — metodu možeš promijeniti u svakom trenutku, bez gubljenja napretka.`,
    contentEn: `Learning a new page is the easy part. The real work is remembering it months and years later — and that's what review, or murajaah, is for. It's what turns memorization from something temporary into something permanent.

Every hafiz remembers differently, though. Some are just starting out and worry about forgetting yesterday's page. Others already hold a good portion of the Qur'an and just want to keep it fresh. Some have a teacher guiding them, others prefer to manage it themselves. That's why Tmizan offers fifteen different review methods, so everyone can find the one that actually fits them.

## Fibonacci (1→2→3→5→8)
Every time you review something successfully, the next review is pushed further into the future — tomorrow, then three days, then five, then eight. A mistake resets it back to the start. Great for active learners who review regularly.

## Three Days
Everything you learn goes through three days of review in a row — today, tomorrow, and the day after — before moving to weekly, then monthly review. Simple and predictable, ideal for beginners.

## Seven Days
Every new page or surah gets reviewed seven days in a row, followed by a two-week break. Slower, but builds very solid memory.

## Juz System
The whole Qur'an is split into 30 juz, one reviewed per day, completing a full cycle every month. Great for those with a solid amount of hifz already.

## By Pages
You choose how many pages to review each day, and simply get the next set — regardless of when you learned them. Flexible and easy to adjust to your day.

## Seton Method (8 parts)
Your hifz is split into eight parts, one reviewed per day — so you go through everything twice a week. Intensive, and keeps memorization always fresh.

## New and Old
Half your review time goes to what you learned in the last two weeks, half to what you learned longer ago. Keeps both fresh and older memorization safe.

## Based on Mistakes
Tracks your own mistakes — the more you slip up on something, the more often it comes back, until it's solid. Efficient for those who know their weak spots.

## By Hafiz Level
Not a method on its own, but an adjustment layered on every other method based on your current level — smaller goals for beginners, faster pace for advanced huffaz.

## Free Schedule
For those with their own established routine. The app just logs what you did instead of building a schedule for you.

## Muallim's Plan
Your teacher builds the schedule instead of the app, based on what they know about you. Shows up as your top priority.

## Femi bi Shevk
A centuries-old division of the Qur'an into seven parts, one per day of the week, completing a full review cycle every week.

## Juz Across the Week
Like the juz system, but slower — one juz spread across a full week in smaller daily portions.

## Dynamic Distribution
The app looks at how much time you actually have each day and adjusts your review load accordingly, instead of punishing missed days.

## SRS (Scientific Model)
Based on research into memory: things you know well are reviewed less and less often, while anything giving you trouble comes back quickly until it's solid.

## Which one should you pick?
There's no single best method — only the one that fits you, your current hifz, and your schedule. New to hifz? Three Days or Seven Days are safe choices. Already holding a good portion and want to maintain it? Look at the Juz System, Seton Method, or Femi bi Shevk. Have an active teacher? The Muallim's Plan gives you the most guidance. Not sure yet? Try a few — you can switch anytime without losing your progress.`,
    thumbnail: "",
    video: null,
    author: "Tmizan tim",
    authorEn: "Tmizan Team",
    authorEmail: "blogger123@gmail.com",
    date: "2026-08-27",
    category: "hifz",
    readTime: 10,
    featured: false,
    published: true,
  },
  {
    id: "8",
    slug: "isti-mushaf-svaki-put",
    title: "Zašto uvijek treba učiti iz istog mushafa",
    titleEn: "Why You Should Always Memorize From the Same Mushaf",
    excerpt: "Promjena mushafa u toku hifza remeti nešto što djeluje sitno, a zapravo je jedan od najjačih oslonaca pamćenja — vizuelnu sliku stranice. Evo zašto je bolje ostati na jednom izdanju od početka do kraja.",
    excerptEn: "Switching mushafs mid-hifz disturbs something small but powerful — your visual memory of the page. Here's why sticking to one edition matters.",
    content: `Većina hafiza, kad se prisjeti neke stranice, prvo se sjeti kako ta stranica izgleda — gdje se koja riječ nalazi, na kojem redu počinje ajet, koliko je stranica bila "puna" ili "prazna". To je vizuelno pamćenje, i ono radi rame uz rame sa samim učenjem napamet, često i bez da smo toga svjesni.

## Zašto je mushaf bitan

Svako izdanje mushafa ima svoj raspored teksta — Hafs po Asimu sa 15 redova je najrasprostranjeniji, ali postoje i izdanja sa 13 ili 16 redova, različitim marginama i različitim prelomom stranica. Kad učiš iz jednog izdanja, mozak nauči i sadržaj i njegov raspored na papiru zajedno, kao jedan paket.

Ako promijeniš mushaf usred hifza, sadržaj ostaje isti, ali se cijela vizuelna slika promijeni — ajet koji je bio pri vrhu stranice sad je na sredini, stranica koja se završavala jednim ajetom sad se završava drugim. To zbunjuje vizuelno pamćenje i often uzrokuje kolebanje čak i kod ajeta koje si dobro znao/la.

## Šta uraditi

- **Odaberi mushaf na početku** i drži ga se do kraja hifza, ako je ikako moguće
- **Provjeri broj redova po stranici** (13, 15 ili 16) prije nego počneš — ovo je najčešća razlika između izdanja
- **Ako moraš promijeniti mushaf** (izgubljen, oštećen), planiraj kraći period prilagodbe i budi strpljiv/a dok se nova vizuelna slika ne "slegne"
- **Koristi isto izdanje i za ponavljanje**, ne samo za novo učenje

Tmizan Hifz Planer prati tvoj napredak po stranicama mushafa, tako da ti ostaje jasna referenca čak i ako ikad zatreba promjena izdanja.`,
    contentEn: `Most huffaz, when recalling a page, first remember how it looks — where a word sits, which line an ayah starts on. That visual memory works alongside memorization itself. Switching mushaf editions mid-hifz changes line counts and page breaks, which can genuinely confuse pages you already knew well. Pick one mushaf at the start and stick with it through the whole journey, for both new memorization and review.`,
    thumbnail: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800&q=80",
    video: null,
    author: "Ustaz Kenan",
    authorEn: "Ustaz Kenan",
    authorEmail: "blogger123@gmail.com",
    date: "2026-08-28",
    category: "hifz",
    readTime: 5,
    featured: false,
    published: true,
  },
  {
    id: "9",
    slug: "idealno-vrijeme-za-hifz",
    title: "Koje je idealno doba dana za učenje Kur'ana napamet",
    titleEn: "The Best Time of Day to Memorize Qur'an",
    excerpt: "Nije svejedno kad učiš — mozak nije podjednako sposoban za pamćenje u svakom trenutku dana. Evo šta kažu iskustva hafiza i istraživanja o pamćenju o najboljem terminu za hifz.",
    excerptEn: "It's not all the same when you study — the brain isn't equally sharp at every hour. Here's what tradition and memory research say about the best time to memorize.",
    content: `Generacijama se među hafizima prenosi da je vrijeme poslije sabaha najbolje za učenje novog gradiva. To nije samo predanje — poklapa se i sa onim što nauka o pamćenju kaže o funkcionisanju mozga tokom dana.

## Zašto jutro

Nakon sna, mozak je "očišćen" od dnevnih informacija i manje je zauzet mislima i obavezama koje se nagomilaju tokom dana. Koncentracija je viša, a manje je vanjskih ometanja poput poziva, poruka i buke. Zato se novo gradivo najlakše "upija" u satima poslije sabaha, dok drugi još spavaju ili se tek bude.

## Šta raditi u drugim dijelovima dana

Jutro nije jedino vrijeme za rad na hifzu — samo je najbolje za **učenje novog**. Ostatak dana ima svoju ulogu:

- **Poslije podne** — dobro vrijeme za ponavljanje (murajaa) onoga što je već solidno naučeno, kad je koncentracija umjerena
- **Predveče** — pogodno za lakše, mehaničko ponavljanje, slušanje kirata ili rad na tedžvidu
- **Prije spavanja** — kratko ponavljanje neposredno prije sna pomaže da se dan zaokruži, jer se informacije naučene prije sna bolje učvršćuju tokom noći

## Ono što je najvažnije

Idealno vrijeme je korisna smjernica, ali dosljednost pobjeđuje savršen raspored. Bolje je učiti svaki dan u "dobrom" terminu nego čekati "savršen" trenutak koji rijetko dođe. Ako ti jutro ne odgovara zbog posla ili škole, odaberi vrijeme kad si najmirniji/a i drži ga se svaki dan — mozak voli rutinu isto koliko voli i jutro.`,
    contentEn: `Tradition among huffaz holds that the time after Fajr is best for new memorization, and memory research backs this up: the mind is clearer and less cluttered early in the day. Afternoons suit review, evenings suit lighter repetition and tajweed work, and a short review right before sleep helps material settle overnight. Still, consistency beats a perfect schedule — pick a calm time you can keep every day.`,
    thumbnail: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80",
    video: null,
    author: "Tmizan tim",
    authorEn: "Tmizan Team",
    authorEmail: "blogger123@gmail.com",
    date: "2026-08-26",
    category: "hifz",
    readTime: 5,
    featured: false,
    published: true,
  },
  {
    id: "10",
    slug: "okruzenje-za-hifz",
    title: "Kako urediti prostor i rutinu za učenje Kur'ana",
    titleEn: "Setting Up a Space and Routine for Hifz",
    excerpt: "Isto gradivo se puno lakše uči na istom, mirnom mjestu, u isto vrijeme. Prostor i rutina nisu detalj — oni su dio same metode pamćenja.",
    excerptEn: "The same material is far easier to learn in the same quiet place, at the same time. Environment and routine aren't a small detail — they're part of the method itself.",
    content: `Mnogi hafizi primjete da im se određena stranica "veže" za mjesto gdje su je naučili — za ćošak sobe, za miris, za zvuk koji je tad dopirao spolja. To nije slučajnost, nego način na koji mozak povezuje sadržaj sa kontekstom u kojem je naučen.

## Zašto je fiksno mjesto bitno

Kad uvijek učiš na istom mjestu, mozak taj prostor asocira sa fokusom i radom, baš kao što posteljina asocira na san. Vremenom, samo sjedanje na to mjesto počne "signalizirati" mozgu da je vrijeme za koncentraciju, i lakše je ući u stanje pažnje potrebno za pamćenje.

## Elementi dobrog prostora za hifz

- **Tišina ili bijeli šum** — potpuna tišina nije uvijek dostupna, ali konstantan, tih zvuk (npr. ventilator) je bolji od isprekidane buke
- **Minimalno vizuelnih ometanja** — telefon van vidokruga i, po mogućnosti, u drugoj sobi
- **Dobro osvjetljenje** — prirodna svjetlost ujutro, a topla, ne prejaka svjetlost uveče
- **Isto vrijeme, isto mjesto** — kombinacija ovo dvoje stvara naviku brže nego bilo šta drugo

## Rutina prije učenja

Kratak, ponovljiv ritual prije samog učenja (npr. abdest, dova za lahkoću pamćenja, par minuta tišine) šalje mozgu jasan signal da počinje "vrijeme za hifz", odvojeno od ostatka dana. Ovakvi mali rituali smanjuju vrijeme potrebno da se fokusiraš i čine da svaka sesija počne s manje otpora.`,
    contentEn: `Many huffaz notice a page "sticks" to the place where they learned it — the brain links content to context. Studying in the same quiet spot, at the same time, with your phone out of sight, trains your mind to switch into focus mode faster. A short, repeatable ritual before each session — wudu, a short dua, a few quiet minutes — signals to the brain that hifz time has begun.`,
    thumbnail: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    video: null,
    author: "Amina H.",
    authorEn: "Amina H.",
    authorEmail: "blogger123@gmail.com",
    date: "2026-08-24",
    category: "hifz",
    readTime: 5,
    featured: false,
    published: true,
  },
  {
    id: "11",
    slug: "slusanje-kirata-uz-hifz",
    title: "Zašto je slušanje kirata jednako važno kao gledanje u mushaf",
    titleEn: "Why Listening to Recitation Matters as Much as Reading the Page",
    excerpt: "Hifz koji se oslanja samo na oči je krhak. Uho pamti ono što oko propusti, a slušanje istog kirata iz stranice u stranicu gradi drugu vrstu memorije, jednako važnu kao vizuelna.",
    excerptEn: "Hifz that relies on the eyes alone is fragile. The ear catches what the eye misses, and listening to the same reciter builds a second, equally important layer of memory.",
    content: `Kad učiš isključivo gledajući u stranicu i ponavljajući naglas, oslanjaš se na jednu vrstu pamćenja — vizuelnu i mišićnu (pokret usana i jezika). Ali postoji i treća vrsta koja se često zanemari: slušna memorija, izgrađena kroz ponovljeno slušanje kirata.

## Šta slušanje dodaje

Kad redovno slušaš istog karija kako uči dio koji ti učiš napamet, mozak počinje povezivati zvuk sa sadržajem, nezavisno od toga gledaš li u mushaf ili ne. Ovo je posebno korisno u trenucima kad ne možeš gledati u stranicu — u autu, na putu, dok radiš nešto rukama — a i dalje želiš da ojačaš ono što si naučio/la.

## Kako uklopiti slušanje u rutinu

- **Slušaj istog kariju** za dio koji trenutno učiš, barem dok ga ne utvrdiš — miješanje stilova recitacije u početku može zbuniti, iako kasnije, kad je hifz čvrst, slušanje različitih karija samo obogaćuje
- **Pusti kirat dok radiš druge stvari** — pospremanje, vožnja, šetnja — ovo je "pasivno" ponavljanje koje ne oduzima dodatno vrijeme
- **Slušaj prije nego pokušaš sam/a** — kad učiš potpuno novu stranicu, jedno slušanje prije čitanja olakšava izgovor i tačnost harakata
- **Koristi slušanje za provjeru** — ako slušaš kirat i osjetiš nesigurnost prije nego što karija izgovori sljedeći ajet, to je znak da to mjesto treba dodatno ponoviti

Slušna memorija je posebno korisna kad, s vremenom, dio hifza počne blijedjeti — često je dovoljno samo čuti početak ajeta pa da se ostatak sam "vrati".`,
    contentEn: `Reading and repeating aloud builds visual and muscle memory, but there's a third layer often overlooked: memory built through listening. Hearing the same reciter go through the portion you're memorizing links sound to content independently of the page — useful in the car, while walking, or doing anything hands-on. Listen before attempting a new page, and use listening later as a quick check on parts that start to fade.`,
    thumbnail: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80",
    video: null,
    author: "Ustaz Kenan",
    authorEn: "Ustaz Kenan",
    authorEmail: "blogger123@gmail.com",
    date: "2026-08-22",
    category: "hifz",
    readTime: 6,
    featured: false,
    published: true,
  },
  {
    id: "12",
    slug: "ishrana-i-pamcenje",
    title: "Ishrana i hifz — namirnice koje pomažu pamćenju",
    titleEn: "Diet and Hifz — Foods That Support Memory",
    excerpt: "Mozak troši ogromnu količinu energije na pamćenje, a ono što jedeš direktno utiče na to koliko brzo i dugo možeš ostati koncentrisan/na. Evo šta redovno uvrstiti u ishranu tokom hifza.",
    excerptEn: "The brain burns a huge amount of energy on memorization, and what you eat directly affects how long you can stay focused. Here's what to include in your diet during hifz.",
    content: `Mozak čini svega oko dva posto tjelesne težine, ali troši i do dvadeset posto ukupne energije koju tijelo dnevno potroši. Kad je ishrana neuravnotežena, jedno od prvih mjesta gdje se to osjeti je upravo koncentracija i pamćenje — baš ono što je hifzu najpotrebnije.

## Namirnice koje pomažu

- **Hurme** — brz i stabilan izvor energije, sunnet namirnica koju su mnogi hafizi tradicionalno koristili prije sesija učenja
- **Orašasti plodovi (orasi, badem, lješnik)** — bogati zdravim mastima i vitaminom E, koji se povezuju sa sporijim opadanjem kognitivnih funkcija
- **Riba i izvori omega-3 masnih kiselina** — omega-3 je građevni materijal moždanih ćelija i povezuje se sa boljim pamćenjem
- **Bobičasto voće (borovnice, jagode)** — sadrže antioksidanse koji štite moždane ćelije od oksidativnog stresa
- **Jaja** — sadrže holin, hranljivu materiju važnu za razvoj memorije i koncentracije
- **Tamnozeleno lisnato povrće (spanać, blitva)** — bogato je folatom i vitaminom K, povezanim sa sporijim mentalnim opadanjem

## Šta izbjegavati prije učenja

- **Teški, masni obroci neposredno prije sesije** — troše energiju na varenje umjesto na koncentraciju i izazivaju pospanost
- **Previše šećera odjednom** — daje kratak "skok" energije praćen naglim padom i gubitkom fokusa
- **Prekomjeran kofein na prazan želudac** — može izazvati nervozu i otežati mirnu koncentraciju potrebnu za pamćenje

## Praktičan savjet

Lakši obrok sa sporim ugljenim hidratima (ovsena kaša, cjelovite žitarice) sat vremena prije učenja daje postojan nivo energije bez naglih padova — mnogo bolji temelj za sesiju hifza od teškog obroka ili praznog stomaka.`,
    contentEn: `The brain uses up to 20% of daily energy despite being only 2% of body weight, so diet has a direct effect on focus and memory. Dates, nuts, fatty fish and other omega-3 sources, berries, eggs, and leafy greens all support cognitive function, while heavy meals, too much sugar, and excess caffeine right before a session tend to work against concentration. A light, slow-release meal an hour before studying gives steadier energy than a heavy meal or an empty stomach.`,
    thumbnail: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800&q=80",
    video: null,
    author: "Tmizan tim",
    authorEn: "Tmizan Team",
    authorEmail: "blogger123@gmail.com",
    date: "2026-08-20",
    category: "zdravlje",
    readTime: 6,
    featured: false,
    published: true,
  },
  {
    id: "13",
    slug: "san-i-hifz",
    title: "San i hifz — zašto je odmor dio učenja napamet",
    titleEn: "Sleep and Hifz — Why Rest Is Part of Memorization",
    excerpt: "Ono što naučiš tokom dana se zapravo učvršćuje dok spavaš. Nedovoljno sna ne znači samo umor — znači i da naučeno gradivo ima manje šanse da ostane trajno zapamćeno.",
    excerptEn: "What you learn during the day is actually consolidated while you sleep. Not enough sleep doesn't just mean tiredness — it means what you learned is less likely to stick.",
    content: `Učenje napamet ne završava se kad zatvoriš mushaf. Veliki dio procesa dešava se kasnije, dok spavaš, kad mozak prolazi kroz ono što je tog dana primio i odlučuje šta će zadržati kao dugotrajno pamćenje.

## Šta se dešava tokom sna

Tokom dubokog sna, mozak "reprodukuje" i učvršćuje informacije naučene tog dana, prebacujući ih iz kratkoročnog u dugoročno pamćenje. Ovaj proces se naziva konsolidacija, i istraživanja pokazuju da je posebno aktivan u satima neposredno nakon učenja i tokom noćnog sna koji slijedi.

Zato hafiz koji nauči novu stranicu, a onda tu noć spava manje od pet-šest sati, ima realno manje šanse da tu stranicu zadrži isto dobro kao neko ko je odspavao puni san.

## Praktične smjernice

- **Redovno vrijeme odlaska na spavanje** pomaže mozgu da uspostavi predvidljiv ritam konsolidacije pamćenja
- **Izbjegavaj učenje potpuno novog gradiva kasno uveče** ako to znači da ćeš spavati manje — bolje kratko ponoviti staro nego naučiti novo pa žrtvovati san
- **Kratak odmor (15-20 minuta) poslije intenzivne sesije učenja** može pomoći, iako ne zamjenjuje noćni san
- **Izbjegavaj ekrane neposredno prije spavanja** — plavo svjetlo odgađa lučenje melatonina i otežava dubok san potreban za konsolidaciju

## Zaključak

San nije "gubljenje vremena" koje bi se moglo iskoristiti za još jednu stranicu — on je dio istog procesa učenja napamet, samo što se odvija dok ne gledaš.`,
    contentEn: `Memorization doesn't stop when you close the mushaf — much of the work happens later, during sleep, as the brain consolidates the day's material into long-term memory. Sleeping less than 5-6 hours after learning a new page measurably reduces how well it sticks. A consistent bedtime, avoiding new material very late at night, and cutting screen time before bed all support the deep sleep that consolidation depends on.`,
    thumbnail: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&q=80",
    video: null,
    author: "Amina H.",
    authorEn: "Amina H.",
    authorEmail: "blogger123@gmail.com",
    date: "2026-08-18",
    category: "zdravlje",
    readTime: 5,
    featured: false,
    published: true,
  },
  {
    id: "14",
    slug: "voda-i-koncentracija",
    title: "Hidratacija i koncentracija tokom učenja Kur'ana",
    titleEn: "Hydration and Focus While Memorizing Qur'an",
    excerpt: "I blaga dehidracija mjerljivo smanjuje koncentraciju i radnu memoriju — dvije stvari bez kojih učenje napamet jednostavno ne ide. Evo koliko vode zapravo treba tokom dana učenja.",
    excerptEn: "Even mild dehydration measurably reduces concentration and working memory — the two things memorization depends on most. Here's how much water you actually need during a day of study.",
    content: `Mozak je sastavljen od oko 75% vode, i čak blagi pad hidratacije — svega jedan do dva posto tjelesne tečnosti — može mjerljivo uticati na koncentraciju, brzinu razmišljanja i radnu memoriju, upravo one kapacitete koji su najpotrebniji tokom sesije hifza.

## Kako prepoznati blagu dehidraciju

Osjećaj žeđi je već znak da je tijelo blago dehidrirano — do tada je hidratacija trebala biti nadoknađena. Drugi rani znaci su blaga glavobolja, teže fokusiranje i osjećaj "magle" u glavi, koji se lako pobrka sa običnim umorom ili nedostatkom sna.

## Praktične smjernice

- **Čaša vode prije početka sesije** — mnogi počnu učiti odmah nakon buđenja ili posla, a da prethodno satima nisu pili vodu
- **Voda na dohvat ruke tokom učenja**, umjesto da se ostavlja za "kad se sjetim" — tada je često prekasno
- **Izbjegavaj isključivo kofeinske napitke** kao zamjenu za vodu — kofein ima blagi diuretski efekat i ne hidrira jednako dobro
- **Pravi kratke pauze za piće vode** svakih 45-60 minuta tokom dužih sesija ponavljanja

## Koliko je dovoljno

Opšta smjernica je oko 30-35 ml vode po kilogramu tjelesne težine dnevno, uz prilagodbu za vrijeme posta, fizičku aktivnost i vrućinu. Tokom Ramazana, ovo znači posebnu pažnju na hidrataciju u satima između iftara i sehura, kako bi mozak ostao dovoljno "napunjen" za sesije taravih-namaza i noćnog učenja.`,
    contentEn: `The brain is roughly 75% water, and even a 1-2% drop in hydration measurably affects concentration, thinking speed, and working memory — exactly what a hifz session relies on. Thirst itself is already a sign of mild dehydration. Drink a glass of water before starting, keep it within reach during the session, and take short water breaks every 45-60 minutes on longer review sessions. During Ramadan, pay extra attention to hydration between iftar and suhoor.`,
    thumbnail: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80",
    video: null,
    author: "Tmizan tim",
    authorEn: "Tmizan Team",
    authorEmail: "blogger123@gmail.com",
    date: "2026-08-16",
    category: "zdravlje",
    readTime: 4,
    featured: false,
    published: true,
  },
  {
    id: "15",
    slug: "fizicka-aktivnost-i-hifz",
    title: "Kretanje i fizička aktivnost — zaboravljeni saveznik hafiza",
    titleEn: "Movement and Exercise — The Hafiz's Forgotten Ally",
    excerpt: "Sati provedeni sjedeći nad mushafom nisu jedini način da se napreduje. Redovno kretanje povećava protok krvi ka mozgu i pomaže da se naučeno bolje zadrži.",
    excerptEn: "Hours spent sitting over the mushaf aren't the only way to make progress. Regular movement increases blood flow to the brain and helps what you learn actually stick.",
    content: `Lako je pomisliti da više sati provedenih nepomično nad mushafom znači brži hifz. U stvarnosti, tijelo koje se nikad ne pokrene postaje kontraproduktivno — pažnja opada, javlja se nemir, a mozak dobija manje kiseonika nego što bi trebao.

## Zašto kretanje pomaže pamćenju

Fizička aktivnost povećava protok krvi, pa time i dotok kiseonika i hranjivih materija do mozga. Istraživanja povezuju redovnu umjerenu aktivnost sa boljom radnom memorijom i bržim učenjem novog gradiva, dijelom i zato što kretanje potiče lučenje supstanci koje podržavaju rast i povezivanje moždanih ćelija.

## Kako uklopiti kretanje u dan hifza

- **Kratka šetnja prije sesije učenja** — čak 10-15 minuta umjerenog hoda može poboljšati koncentraciju u sesiji koja slijedi
- **Pauze s pokretom svakih 45-60 minuta** — ustani, protegni se, prošetaj do drugog kraja sobe, umjesto da ostaneš satima u istom položaju
- **Ponavljanje napamet u hodu** — mnogi hafizi otkriju da im lakše ide ponavljanje (murajaa) kad hodaju, jer ritam koraka pomaže ritmu recitacije
- **Redovna fizička aktivnost van sesija učenja** (namaz sam po sebi uključuje pokret, uz to i šetnja ili sport) doprinosi boljem opštem fokusu tokom cijelog dana

## Balans, ne krajnost

Cilj nije zamijeniti sjedenje nad mushafom trčanjem, nego razumjeti da tijelo i um rade zajedno — kratke, redovne doze kretanja tokom dana čine sesije učenja efikasnijim, umjesto da im oduzimaju vrijeme.`,
    contentEn: `More hours sitting still over the mushaf doesn't automatically mean faster hifz — a body that never moves becomes counterproductive, with attention dropping and less oxygen reaching the brain. Physical activity increases blood flow and oxygen delivery, and research links regular moderate movement to better working memory. A short walk before a session, movement breaks every 45-60 minutes, and even reviewing while walking can all make study sessions more effective.`,
    thumbnail: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=800&q=80",
    video: null,
    author: "Ustaz Kenan",
    authorEn: "Ustaz Kenan",
    authorEmail: "blogger123@gmail.com",
    date: "2026-08-14",
    category: "zdravlje",
    readTime: 5,
    featured: false,
    published: true,
  },
]

// Pomoćne funkcije
export function getPostBySlug(slug) {
  const stored = getStoredPosts()
  return [...MOCK_POSTS, ...stored].find(p => p.slug === slug) || null
}

export function getAllPosts() {
  const stored = getStoredPosts()
  return [...MOCK_POSTS, ...stored].filter(p => p.published)
}

export function getStoredPosts() {
  try {
    return JSON.parse(localStorage.getItem("tmizan_blog_posts") || "[]")
  } catch {
    return []
  }
}

export function savePost(post) {
  const stored = getStoredPosts()
  const idx = stored.findIndex(p => p.id === post.id)
  if (idx >= 0) {
    stored[idx] = post
  } else {
    stored.unshift(post)
  }
  localStorage.setItem("tmizan_blog_posts", JSON.stringify(stored))
}

export function deletePost(id) {
  const stored = getStoredPosts().filter(p => p.id !== id)
  localStorage.setItem("tmizan_blog_posts", JSON.stringify(stored))
}
