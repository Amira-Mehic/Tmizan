// ============================================================================
// Sistem tema prikaza. Svaka tema je skup gotovih Tailwind klasa za pozadinu,
// kartice, tekst i naglaske, pa komponente ne pišu boje direktno nego uzimaju
// klase odavde - time se cijela aplikacija preboji promjenom jedne vrijednosti.
// Odabrana tema se pamti u localStorage i vraća pri sljedećem otvaranju.
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

// ── PALETA ────────────────────────────────────────────────────────────────
// Boje preuzete 1:1 iz odobrenog pregleda tema (Theme Preview). Pozadina je
// flat (jedna boja) kojoj se kartice i sekcije prilagođavaju osvjetljenjem,
// ne zasebnim nijansama. particleColors namjerno nisu dirani u ovom prolazu.
//
// VAŽNO: card/cardAlt/cardSub imaju `border border-[ISTA_BOJA_KAO_BG]`.
// Ovo NIJE vizuelni border (boja je identična pozadini kartice, dakle
// nevidljiv) - postoji zato što desetine komponenti kroz app dodaju svoju
// vlastitu golu `border` Tailwind klasu pored ${theme.card} (npr. `rounded-xl
// border ${cardCls}`). Bez eksplicitne border-boje ovdje, taj `border`
// pada na Tailwind-ov default (siva), pa se na kartici pojavi ivica koja
// se ne poklapa s bojom kartice - baš ono što ne želimo. Postavljanjem
// border-boje na identičnu vrijednost kao bg, svaka takva kartica ostaje
// flat na cijeloj aplikaciji i u svih 7 tema, bez obzira gdje se koristi.
// eslint-disable-next-line react-refresh/only-export-components -- dijeljena konstanta uz Provider u istom fajlu
export const THEMES = {

  // ── 1. SOFT LINEN ─────────────────────────────────────────────────────────
  beige_white: {
    id: 'beige_white',
    name: 'Soft Linen',
    logo: 'bg-[#B8875A]',
    bgGradient: 'bg-[#DDC9A6]',
    card:    'bg-[#EDE2CE] border border-[#EDE2CE]',
    cardAlt: 'bg-[#F5EDE0] border border-[#F5EDE0]',
    cardSub: 'bg-[#EAD8C0] border border-[#EAD8C0]',
    text:    'text-[#2E2016]',
    muted:   'text-[#6B5240]',
    accent:  'text-[#B8875A]',
    button:  'bg-[#B8875A] hover:bg-[#A07448] text-white transition-all duration-200',
    ring:    'ring-[#B8875A]/50',
    particleColors: ['#8D6D49', '#7A6752', '#F1EDE9', '#4A3A26'],
  },

  // ── 2. WARM NIGHT ────────────────────────────────────────────────────────
  dark_beige_orange: {
    id: 'dark_beige_orange',
    name: 'Warm Night',
    logo: 'bg-[#E8860A]',
    bgGradient: 'bg-[#1D0F04]',
    card:    'bg-[#2E1A0E] border border-[#2E1A0E]',
    cardAlt: 'bg-[#1F1108] border border-[#1F1108]',
    cardSub: 'bg-[#150B04] border border-[#150B04]',
    text:    'text-[#F8EDD8]',
    muted:   'text-[#C49A6C]',
    accent:  'text-[#E8860A]',
    button:  'bg-[#E8860A] hover:bg-[#C97208] text-white transition-all duration-200',
    ring:    'ring-[#E8860A]/50',
    particleColors: ['#C18B5C', '#B6A291', '#F1EDE9', '#3A2E22'],
  },

  // ── 3. MODERN NAVY ───────────────────────────────────────────────────────
  purple_blue: {
    id: 'purple_blue',
    name: 'Modern Navy',
    logo: 'bg-[#5B6CF2]',
    bgGradient: 'bg-[#0F1830]',
    card:    'bg-[#192236] border border-[#192236]',
    cardAlt: 'bg-[#101829] border border-[#101829]',
    cardSub: 'bg-[#090F1C] border border-[#090F1C]',
    text:    'text-[#E2EAF8]',
    muted:   'text-[#7A96B8]',
    accent:  'text-[#7B8DF5]',
    button:  'bg-[#5B6CF2] hover:bg-[#4A5ADE] text-white transition-all duration-200',
    ring:    'ring-[#5B6CF2]/50',
    particleColors: ['#5C76C1', '#919AB6', '#E9EBF1', '#2A3040'],
  },

  // ── 4. FOREST SANCTUARY ──────────────────────────────────────────────────
  emerald_dark: {
    id: 'emerald_dark',
    name: 'Forest Sanctuary',
    logo: 'bg-[#0FBF7E]',
    bgGradient: 'bg-[#0A2016]',
    card:    'bg-[#0E2F1D] border border-[#0E2F1D]',
    cardAlt: 'bg-[#071E12] border border-[#071E12]',
    cardSub: 'bg-[#04120A] border border-[#04120A]',
    text:    'text-[#D4F4E2]',
    muted:   'text-[#5A9E78]',
    accent:  'text-[#0FBF7E]',
    button:  'bg-[#0FBF7E] hover:bg-[#0CA86E] text-white transition-all duration-200',
    ring:    'ring-[#0FBF7E]/50',
    particleColors: ['#5CC192', '#91B6A4', '#E9F1ED', '#243A30'],
  },

  // ── 5. PURE STEALTH ──────────────────────────────────────────────────────
  black_slate: {
    id: 'black_slate',
    name: 'Pure Stealth',
    logo: 'bg-[#E5484D]',
    bgGradient: 'bg-[#161616]',
    card:    'bg-[#222222] border border-[#222222]',
    cardAlt: 'bg-[#1C1C1C] border border-[#1C1C1C]',
    cardSub: 'bg-[#141414] border border-[#141414]',
    text:    'text-[#F0F0F0]',
    muted:   'text-[#707070]',
    accent:  'text-[#E5484D]',
    button:  'bg-[#E5484D] hover:bg-[#C93C41] text-white transition-all duration-200',
    ring:    'ring-[#E5484D]/50',
    particleColors: ['#9FACBC', '#E5484D', '#EBEDEF', '#26292D'],
  },

  // ── 6. WARM PEACH & SLATE ────────────────────────────────────────────────
  warm_peach: {
    id: 'warm_peach',
    name: 'Warm Peach & Slate',
    logo: 'bg-[#FF9F76]',
    bgGradient: 'bg-[#141010]',
    card:    'bg-[#181514] border border-[#181514]',
    cardAlt: 'bg-[#1E1917] border border-[#1E1917]',
    cardSub: 'bg-[#141110] border border-[#141110]',
    text:    'text-[#F5EBE6]',
    muted:   'text-[#A0908A]',
    accent:  'text-[#FF9F76]',
    button:  'bg-[#FF9F76] hover:bg-[#F08E65] text-[#121212] font-semibold transition-all duration-200',
    ring:    'ring-[#FF9F76]/50',
    particleColors: ['#FF9F76', '#E8A87C', '#FF8A65', '#282220'],
  },

  // ── 7. COTTON CANDY ──────────────────────────────────────────────────────
  pink_soft: {
    id: 'pink_soft',
    name: 'Cotton Candy',
    logo: 'bg-[#D84B8C]',
    bgGradient: 'bg-[#341022]',
    card:    'bg-[#2A0A1C] border border-[#2A0A1C]',
    cardAlt: 'bg-[#360F25] border border-[#360F25]',
    cardSub: 'bg-[#200615] border border-[#200615]',
    text:    'text-[#FDF2F7]',
    muted:   'text-[#D982B0]',
    accent:  'text-[#FF66AB]',
    button:  'bg-[#D84B8C] hover:bg-[#C23375] text-white transition-all duration-200',
    ring:    'ring-[#D84B8C]/50',
    particleColors: ['#C15C8F', '#B691A3', '#F1E9ED', '#3A2530'],
  },
}

// ── SEKCIJSKI AKCENTI ─────────────────────────────────────────────────────
// `border` je lijevi border-akcent na redovima/karticama sekcija (mualim,
// halka, poruke...), NE border oko običnih kartica (te ostaju flat, bez
// bordera). `wash`/`item` su PUNE (neprovidne) boje kartice - izračunate
// miješanjem cardAlt pozadine teme sa bojom sekcije (50% za wash, ~68% za
// item), isto kao u odobrenom pregledu tema (mixHex(cardAlt, boja, t)).
// Namjerno NEMA alpha/opacity - boje moraju biti identične na svim
// pozadinama, ne providne.
const SECTION_ACCENTS_BY_THEME = {
  // Soft Linen
  beige_white: {
    mualim:   { border: 'border-[#806951]', chip: 'bg-[#806951] text-white', wash: 'bg-[#BAAB98]', item: 'bg-[#A5937F]' },
    halka:    { border: 'border-[#6F755E]', chip: 'bg-[#6F755E] text-white', wash: 'bg-[#B2B19F]', item: 'bg-[#9A9B88]' },
    messages: { border: 'border-[#755855]', chip: 'bg-[#755855] text-white', wash: 'bg-[#B5A29A]', item: 'bg-[#9E8881]' },
    tasks:    { border: 'border-[#8C7D5A]', chip: 'bg-[#8C7D5A] text-white', wash: 'bg-[#C0B59D]', item: 'bg-[#AEA185]' },
    personal: { border: 'border-[#52655E]', chip: 'bg-[#52655E] text-white', wash: 'bg-[#A4A99F]', item: 'bg-[#869188]' },
    review:   { border: 'border-[#5C6975]', chip: 'bg-[#5C6975] text-white', wash: 'bg-[#A8ABAA]', item: 'bg-[#8D9397]' },
    alert:    { border: 'border-[#7C4E48]', chip: 'bg-[#7C4E48] text-white', wash: 'bg-[#B89E94]', item: 'bg-[#A38179]' },
    progress: { border: 'border-[#697867]', chip: 'bg-[#697867] text-white', wash: 'bg-[#AFB2A4]', item: 'bg-[#969D8E]' },
  },
  // Warm Night
  dark_beige_orange: {
    mualim:   { border: 'border-[#A87D46]', chip: 'bg-[#A87D46] text-white', wash: 'bg-[#644727]', item: 'bg-[#7C5A32]' },
    halka:    { border: 'border-[#96735E]', chip: 'bg-[#96735E] text-white', wash: 'bg-[#5A4233]', item: 'bg-[#705442]' },
    messages: { border: 'border-[#AC9579]', chip: 'bg-[#AC9579] text-black', wash: 'bg-[#665340]', item: 'bg-[#7F6B55]' },
    tasks:    { border: 'border-[#44362A]', chip: 'bg-[#44362A] text-white', wash: 'bg-[#322419]', item: 'bg-[#382A1F]' },
    personal: { border: 'border-[#9A846C]', chip: 'bg-[#9A846C] text-white', wash: 'bg-[#5C4A3A]', item: 'bg-[#735F4C]' },
    review:   { border: 'border-[#977559]', chip: 'bg-[#977559] text-white', wash: 'bg-[#5B4330]', item: 'bg-[#71553F]' },
    alert:    { border: 'border-[#7F433D]', chip: 'bg-[#7F433D] text-white', wash: 'bg-[#4F2A22]', item: 'bg-[#60332C]' },
    progress: { border: 'border-[#A3805E]', chip: 'bg-[#A3805E] text-white', wash: 'bg-[#614833]', item: 'bg-[#795C42]' },
  },
  // Modern Navy
  purple_blue: {
    mualim:   { border: 'border-[#5C649E]', chip: 'bg-[#5C649E] text-white', wash: 'bg-[#363E64]', item: 'bg-[#444C79]' },
    halka:    { border: 'border-[#4E8480]', chip: 'bg-[#4E8480] text-white', wash: 'bg-[#2F4E54]', item: 'bg-[#3A6164]' },
    messages: { border: 'border-[#8A6A78]', chip: 'bg-[#8A6A78] text-white', wash: 'bg-[#4D4150]', item: 'bg-[#63505F]' },
    tasks:    { border: 'border-[#646B79]', chip: 'bg-[#646B79] text-white', wash: 'bg-[#3A4251]', item: 'bg-[#49505F]' },
    personal: { border: 'border-[#829E90]', chip: 'bg-[#829E90] text-black', wash: 'bg-[#495B5C]', item: 'bg-[#5E736F]' },
    review:   { border: 'border-[#638BA0]', chip: 'bg-[#638BA0] text-white', wash: 'bg-[#3A5264]', item: 'bg-[#48667A]' },
    alert:    { border: 'border-[#955A59]', chip: 'bg-[#955A59] text-white', wash: 'bg-[#523941]', item: 'bg-[#6A454A]' },
    progress: { border: 'border-[#757DA0]', chip: 'bg-[#757DA0] text-white', wash: 'bg-[#424A64]', item: 'bg-[#555D7A]' },
  },
  // Forest Sanctuary
  emerald_dark: {
    mualim:   { border: 'border-[#408E71]', chip: 'bg-[#408E71] text-white', wash: 'bg-[#245642]', item: 'bg-[#2E6A53]' },
    halka:    { border: 'border-[#4E7179]', chip: 'bg-[#4E7179] text-white', wash: 'bg-[#2A4846]', item: 'bg-[#375658]' },
    messages: { border: 'border-[#78915F]', chip: 'bg-[#78915F] text-white', wash: 'bg-[#405838]', item: 'bg-[#546C46]' },
    tasks:    { border: 'border-[#1E7A64]', chip: 'bg-[#1E7A64] text-white', wash: 'bg-[#124C3B]', item: 'bg-[#175D4A]' },
    personal: { border: 'border-[#8BA092]', chip: 'bg-[#8BA092] text-black', wash: 'bg-[#495F52]', item: 'bg-[#617669]' },
    review:   { border: 'border-[#4A5D33]', chip: 'bg-[#4A5D33] text-white', wash: 'bg-[#283E22]', item: 'bg-[#354928]' },
    alert:    { border: 'border-[#8C6A2E]', chip: 'bg-[#8C6A2E] text-white', wash: 'bg-[#4A4420]', item: 'bg-[#615225]' },
    progress: { border: 'border-[#2D473A]', chip: 'bg-[#2D473A] text-white', wash: 'bg-[#1A3226]', item: 'bg-[#213A2D]' },
  },
  // Pure Stealth
  black_slate: {
    mualim:   { border: 'border-[#5A5A5A]', chip: 'bg-[#5A5A5A] text-white', wash: 'bg-[#3B3B3B]', item: 'bg-[#464646]' },
    halka:    { border: 'border-[#454545]', chip: 'bg-[#454545] text-white', wash: 'bg-[#303030]', item: 'bg-[#383838]' },
    messages: { border: 'border-[#6E6E6E]', chip: 'bg-[#6E6E6E] text-white', wash: 'bg-[#454545]', item: 'bg-[#545454]' },
    tasks:    { border: 'border-[#6E4A3D]', chip: 'bg-[#6E4A3D] text-white', wash: 'bg-[#45332C]', item: 'bg-[#543B32]' },
    personal: { border: 'border-[#8A5A45]', chip: 'bg-[#8A5A45] text-white', wash: 'bg-[#533B30]', item: 'bg-[#674638]' },
    review:   { border: 'border-[#383838]', chip: 'bg-[#383838] text-white', wash: 'bg-[#2A2A2A]', item: 'bg-[#2F2F2F]' },
    alert:    { border: 'border-[#7A4A44]', chip: 'bg-[#7A4A44] text-white', wash: 'bg-[#4B3330]', item: 'bg-[#5C3B37]' },
    progress: { border: 'border-[#B5735A]', chip: 'bg-[#B5735A] text-white', wash: 'bg-[#68483B]', item: 'bg-[#845746]' },
  },
  // Warm Peach & Slate
  warm_peach: {
    mualim:   { border: 'border-[#C19684]', chip: 'bg-[#C19684] text-[#121212]', wash: 'bg-[#70584E]', item: 'bg-[#8D6E61]' },
    halka:    { border: 'border-[#B69A87]', chip: 'bg-[#B69A87] text-[#121212]', wash: 'bg-[#6A5A4F]', item: 'bg-[#857163]' },
    messages: { border: 'border-[#C8B3A2]', chip: 'bg-[#C8B3A2] text-[#121212]', wash: 'bg-[#73665C]', item: 'bg-[#928276]' },
    tasks:    { border: 'border-[#896D5A]', chip: 'bg-[#896D5A] text-white', wash: 'bg-[#544338]', item: 'bg-[#675245]' },
    personal: { border: 'border-[#BAB5B3]', chip: 'bg-[#BAB5B3] text-[#121212]', wash: 'bg-[#6C6765]', item: 'bg-[#888381]' },
    review:   { border: 'border-[#BCABBE]', chip: 'bg-[#BCABBE] text-[#121212]', wash: 'bg-[#6D626A]', item: 'bg-[#897C89]' },
    alert:    { border: 'border-[#B37272]', chip: 'bg-[#B37272] text-white', wash: 'bg-[#684644]', item: 'bg-[#835655]' },
    progress: { border: 'border-[#9A7C71]', chip: 'bg-[#9A7C71] text-white', wash: 'bg-[#5C4A44]', item: 'bg-[#725C54]' },
  },
  // Cotton Candy
  pink_soft: {
    mualim:   { border: 'border-[#AE6186]', chip: 'bg-[#AE6186] text-white', wash: 'bg-[#723856]', item: 'bg-[#884767]' },
    halka:    { border: 'border-[#885272]', chip: 'bg-[#885272] text-white', wash: 'bg-[#5F304C]', item: 'bg-[#6E3D59]' },
    messages: { border: 'border-[#967566]', chip: 'bg-[#967566] text-white', wash: 'bg-[#664246]', item: 'bg-[#775451]' },
    tasks:    { border: 'border-[#BA9A7E]', chip: 'bg-[#BA9A7E] text-black', wash: 'bg-[#785452]', item: 'bg-[#906E62]' },
    personal: { border: 'border-[#C09EAC]', chip: 'bg-[#C09EAC] text-black', wash: 'bg-[#7B5668]', item: 'bg-[#947081]' },
    review:   { border: 'border-[#7E6054]', chip: 'bg-[#7E6054] text-white', wash: 'bg-[#5A383C]', item: 'bg-[#674645]' },
    alert:    { border: 'border-[#995456]', chip: 'bg-[#995456] text-white', wash: 'bg-[#68323E]', item: 'bg-[#793E46]' },
    progress: { border: 'border-[#A4737E]', chip: 'bg-[#A4737E] text-white', wash: 'bg-[#6D4152]', item: 'bg-[#815362]' },
  },
}

// eslint-disable-next-line react-refresh/only-export-components -- dijeljena funkcija uz Provider u istom fajlu
export const getSectionAccents = (themeId) =>
  SECTION_ACCENTS_BY_THEME[themeId] || SECTION_ACCENTS_BY_THEME.beige_white

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('tmizan-theme')
      return THEMES[saved] || THEMES.beige_white
    } catch {
      return THEMES.beige_white
    }
  })

  // Uključi/isključi animirane čestice u pozadini na stranicama iza sidebara
  // (Home stranica ih uvijek prikazuje, neovisno o ovoj postavci).
  const [particlesEnabled, setParticlesEnabled] = useState(() => {
    try {
      return localStorage.getItem('tmizan-particles-enabled') !== 'false'
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (theme?.id) {
      localStorage.setItem('tmizan-theme', theme.id)
    }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem('tmizan-particles-enabled', particlesEnabled ? 'true' : 'false')
    } catch { /* ignore */ }
  }, [particlesEnabled])

  const value = { theme, setTheme, THEMES, particlesEnabled, setParticlesEnabled, sectionAccents: getSectionAccents(theme?.id) }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook uz Provider je standardan Context pattern
export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme mora biti unutar ThemeProvider-a')
  return ctx
}
