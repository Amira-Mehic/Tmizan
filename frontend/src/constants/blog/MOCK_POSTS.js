// Mock blog postovi - zamijeniti Supabase podacima kada baza bude gotova
// localStorage ključ za blogger-ove postove: "tmizan_blog_posts"

export const CATEGORIES = [
  { id: "sve",        label: "Sve",         labelEn: "All" },
  { id: "hifz",      label: "Hifz",        labelEn: "Hifz" },
  { id: "tedzvid",   label: "Tedžvid",     labelEn: "Tajweed" },
  { id: "motivacija",label: "Motivacija",  labelEn: "Motivation" },
  { id: "arapski",   label: "Arapski",     labelEn: "Arabic" },
  { id: "vijesti",   label: "Vijesti",     labelEn: "News" },
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
    date: "2026-08-27",
    category: "hifz",
    readTime: 10,
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
