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
