// ============================================================================
// Pregled planova učenja i ponavljanja. Prikazuje aktivne planove sa procjenom
// dnevne količine i datuma završetka, i vodi u čarobnjak za kreiranje novog.
// Više planova može biti aktivno istovremeno, uz pravilo da plan za cijeli
// Kur'an ne trpi druge uz sebe.
// ============================================================================

import { useState, useEffect, useCallback, Fragment } from "react"
import { useTheme } from "../../../context/ThemeContext"
import { useAuth } from "../../../context/AuthContext"
import { useLang } from "../../../context/LanguageContext"
import { supabase } from "../../../services/SupaBaseClient"
import { SURA_DATA } from "../../../constants/hifz/SURA_DATA"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useHifzState } from "../../../hooks/hifz/useHifzState"
import TalimWizard from "./components/TalimWizard"
import { REVIEW_METHOD_INFO, REVIEW_METHODS_BLOG_SLUG } from "../../../features/murajaah/reviewMethodInfo"
import { todayStr } from "../../../constants/hifz/helpers"
import { recommendation as nivoRecommendation } from "../../../features/murajaah/nivo"
import { MonthlyReviewForecast } from "./components/MonthlyReviewForecast"
import { TEMPO_UNITS, compatibleMethods, computeTempo, suggestedDailyQty } from "../../../features/murajaah/planTempo"
import { strogostParametri } from "../../../features/murajaah/wizardKoraci"
import { fetchAllReviewPlans, deactivatePlan, reactivatePlan, deletePlan, fetchPlanStats, efektivnaMetoda } from "../../../features/murajaah/hifzPlansService"
import { seedMethodEngine } from "../../../features/murajaah/seedMethodEngine"
import GuidedTour from "../../../components/shared/GuidedTour"
import { PageTourButton } from "../../../components/shared/PageTourButton"
import { usePageTour } from "../../../hooks/usePageTour"
import { HIFZ_PLANNER_PAGE_TOUR } from "../../../constants/tours/hifzPlannerPageTour"

// 30 džuzova s opsegom stranica (Medinski mushaf)
const JUZOVI = Array.from({ length: 30 }, (_, i) => {
  const startPage = i === 0 ? 1 : Math.round(1 + i * (604 / 30))
  const endPage = i === 29 ? 604 : Math.round((i + 1) * (604 / 30))
  return { id: i + 1, startPage, endPage, pageCount: endPage - startPage + 1 }
})

// Koliko stranica pokriva svaki džuz (aproksimacija Medinskog mushafa)
const JUZ_PAGES = [
  [1,20],[21,41],[42,61],[62,81],[82,101],[102,121],[122,141],[142,161],[162,181],[182,201],
  [202,221],[222,241],[242,261],[262,281],[282,301],[302,321],[322,341],[342,361],[362,381],[382,401],
  [402,421],[422,441],[442,461],[462,481],[482,501],[502,521],[522,541],[542,561],[562,581],[582,604]
]

// ── Prijevodi (bs/en) - isti obrazac kao TalimWizard.jsx ──────────────────
const STR = {
  bs: {
    title: "Hifz Planner",
    subtitle: "Generiši personalni plan učenja i ponavljanja Kur'ana",
    tabReview: "Plan ponavljanja",
    tabLearn: "Plan učenja",
    steps: ["Šta znaš", "Metoda", "Raspored", "Strogost", "Plan"],
    k1Title: "Šta si do sada naučio/la?",
    autoDetectTitle: "Vidimo šta već znaš",
    autoDetectBody: (n) => `U Hifz Trackeru vidimo da znaš ${n} stranica. Da li da to iskoristimo za plan ponavljanja?`,
    autoDetectBodyAll: "U Hifz Trackeru vidimo da znaš svih 604 stranice. Da li da to iskoristimo za plan ponavljanja?",
    autoDetectYes: "Da, ponavljam sve →",
    autoDetectNo: "Ne — biram sam/a šta",
    autoDetectHint: "Ne moraš ponavljati baš sve što znaš — ispod možeš odabrati konkretne sure, džuzeve ili stranice.",
    optJuzTitle: "Po džuzovima", optJuzDesc: "Odaberi džuzove koje znaš",
    optSureTitle: "Po surama", optSureDesc: "Označi sure koje znaš",
    optStraniceTitle: "Po stranicama", optStraniceDesc: "Odaberi konkretne stranice koje znaš",
    optAjetiTitle: "Po ajetima", optAjetiDesc: "Upiši konkretne ajete koje znaš (za intervalne metode)",
    optHafizTitle: "Ja sam hafiz/hafiza", optHafizDesc: "Znam svih 604 stranica",
    optRucnoTitle: "Unesi ručno", optRucnoDesc: "Otvori Hifz Tracker i označi stranice",
    quickInput: "Brzi unos",
    quickInputPh: "Znam prvih X džuzova",
    quickInputStranicePh: "npr. 12, 45-50, 88",
    apply: "Primijeni",
    orManual: "Ili odaberi ručno",
    selectedJuz: (n, p) => `✓ Odabrano ${n} džuz${n === 1 ? "" : "a"} — ukupno ~${p} stranica`,
    searchSuraPh: "Pretraži suru (npr. Al-Kahf ili 18)...",
    pageAbbr: "str.",
    selectedSure: (n, p) => `✓ Odabrano ${n} sura — ukupno ~${p} stranica`,
    selectedStranice: (n) => `✓ Odabrano ${n} stranic${n === 1 ? "a" : n < 5 ? "e" : "a"}`,
    ajetiInputPh: "npr. 36:1, 36:5-10, 2:255",
    ajetiInputHint: "Format: sura:ajet — pojedinačno ili raspon unutar iste sure. Dostupno samo za Fibonacci, Tri dana, Sedam dana i SRS (Motor A radi po cijelim stranicama).",
    ajetiUnosGreskaMsg: "Neki unosi nisu prepoznati (očekivan format sura:ajet, npr. 36:5) — preskočeni su.",
    selectedAjeti: (n) => `✓ Odabrano ${n} ajet${n === 1 ? "" : "a"}`,
    removeAjet: "Ukloni",
    hafizPre: "ما شاء الله — Svih ",
    hafizBold: "604 stranice",
    hafizPost: " će biti uključene u plan ponavljanja.",
    hafizNarrowHint: "Želiš ponavljati samo dio toga? Iznad možeš odabrati Po surama, Po džuzovima ili Po stranicama umjesto ovoga.",
    tempoTitle: "Kojim tempom želiš ponavljati?",
    tempoUnitLabel: "Po čemu razmišljaš?",
    tempoUnitNames: { dzuzevi: "Džuzevi", sure: "Sure", stranice: "Stranice" },
    tempoModeLabel: "Kako želiš unijeti tempo?",
    tempoModeBroj: "Broj po danu",
    tempoModeVrijeme: "Za koliko vremena",
    tempoQtyLabelBroj: (u) => `Koliko ${u.toLowerCase()} dnevno?`,
    tempoQtyLabelVrijeme: "Za koliko vremena želiš ponoviti cijeli Kur'an?",
    tempoDana: "dana", tempoSedmica: "sedmica", tempoMjeseci: "mjeseci",
    tempoSummary: (p, d) => `To znači ~${p} stranica dnevno — cijeli Kur'an za ~${d} dana.`,
    tempoHint: "Ovo određuje koji dnevni tempo dobijaju metode ponavljanja koje se prilagođavaju bilo kojem tempu (npr. Fibonacci, Po stranicama, Dinamična raspodjela).",
    tempoAjetiTitle: "Kojim tempom želiš ponavljati odabrane ajete?",
    tempoAjetiQtyLabelBroj: "Koliko ajeta dnevno?",
    tempoAjetiQtyLabelVrijeme: "Za koliko vremena želiš ponoviti sve odabrane ajete?",
    tempoAjetiSummary: (n, d) => `To znači ~${n} ajeta dnevno — svi odabrani ajeti za ~${d} dana.`,
    tempoAjetiHint: "Opseg se dijeli na manje blokove ove veličine koji kreću razmaknuto, umjesto da se svi ajeti traže odjednom istog dana.",
    showAllMethods: (n) => `Prikaži i preostalih ${n}`,
    hideFilteredMethods: "Sakrij metode koje ne odgovaraju",
    methodsFilteredNote: "Prikazane su samo metode koje odgovaraju odabranoj jedinici.",
    methodFixedPaceNote: "Ima svoj fiksni, ugrađen tempo — ne prati broj/vrijeme koje si unio/la gore.",
    methodPileupWarning: "⚠️ Greška vraća cijeli blok na početak — za ovoliki opseg to može nagomilati puno ponavljanja na isti dan. Za održavanje već naučenog razmisli o Sistemu džuzeva, Po stranicama, Šetonovoj ili Dinamičnoj metodi (bez ovog rizika).",
    nextMethod: "Dalje — Odaberi metodu ponavljanja →",
    k2Title: "Odaberi metodu ponavljanja",
    back: "← Nazad",
    k2DescPre: "Sistem će na osnovu ",
    k2DescBold: (p) => `${p} stranica`,
    k2DescBoldAjeti: (n) => `${n} ajet${n === 1 ? "" : "a"}`,
    k2DescPost: " koje znaš i odabrane metode generisati tvoj raspored.",
    generatePlan: "Generiši plan ponavljanja →",
    raspTitle: "Redoslijed i raspored",
    raspRedoslijedLabel: "Kojim redom?",
    raspRedoslijedOpts: {
      od_pocetka: "Od početka Kur'ana", od_kraja: "Od kraja ka početku",
      najslabiji: "Od najslabijih stranica", nasumicno: "Nasumično",
    },
    raspPodjelaLabel: "Koliko puta dnevno?",
    raspPodjelaOpts: { 1: "Jednom", 2: "Ujutru i navečer", 3: "Tri puta" },
    raspSlobodniLabel: "Ima li dana kad ne ponavljaš?",
    raspDani: { pon: "Pon", uto: "Uto", sri: "Sri", cet: "Čet", pet: "Pet", sub: "Sub", ned: "Ned" },
    raspNext: "Dalje — Strogost prema greškama →",
    strogTitle: "Strogost prema greškama",
    strogQuestion: "Kad pogriješiš na stranici, šta da radimo?",
    strogOpts: {
      blago: { naziv: "Blago", opis: "Zabilježimo, vratimo je u plan za nekoliko dana" },
      normalno: { naziv: "Normalno", opis: "Vratimo je ubrzo i pratimo dok se ne stabilizuje (preporučeno)" },
      strogo: { naziv: "Strogo", opis: "Ide na dnevni raspored dok ne bude čista tri puta zaredom" },
    },
    strogParams: (maxDnevno, izlazak) => `Red slabih: max ${maxDnevno} stranice dnevno, izlazi nakon ${izlazak} čista ponavljanja zaredom.`,
    strogNext: "Dalje — Pregled plana →",
    k3Title: "Tvoj plan ponavljanja",
    pagesInSystem: (n) => `${n} stranica u sistemu`,
    ajetiInSystem: (n) => `${n} ajet${n === 1 ? "" : "a"} u sistemu`,
    k3Note: "Klikni \"Aktiviraj plan\" da vidiš stvaran raspored za naredne dane.",
    activated: "✓ Plan aktiviran i sačuvan",
    saving: "Čuvanje...",
    activate: "Aktiviraj plan →",
    activePlanLabel: "Aktivan plan ponavljanja",
    scopeDzuzoviSummary: (n, p) => `Po džuzovima — ${n} džuz${n === 1 ? "" : "a"} (~${p} stranica)`,
    scopeSureSummary: (n, p) => `Po surama — ${n} sur${n === 1 ? "a" : "e"} (~${p} stranica)`,
    scopeHafizSummary: "Hafiz/hafiza — svih 604 stranice",
    scopeStraniceSummary: (p) => `Po stranicama — ${p} stranic${p === 1 ? "a" : p < 5 ? "e" : "a"} (odabrano ručno)`,
    scopeAjetiSummary: (n) => `Po ajetima — ${n} ajet${n === 1 ? "" : "a"} (odabrano ručno)`,
    scopeRucnoSummary: (p) => `Ručno iz Hifz Trackera — ${p} stranica`,
    generateNewPlan: "+ Generiši novi plan",
    plansListTitle: "Tvoji planovi ponavljanja",
    statusActive: "Aktivan", statusInactive: "Neaktivan",
    statDaily: "Dnevno", statDuration: "Trajanje", statStart: "Start", statEnd: "Kraj",
    statGoal: "Cilj", statDone: "Ponovljeno", statNext: "Na redu", statDays: "Dani ponavljanja",
    statBlockSize: "Opseg bloka",
    daysUnit: (n) => `${n} dana`,
    pagesUnit: (n) => `${n} str.`,
    pagesPerDay: (n) => `${n} str/dan`,
    ajetiUnit: (n) => `${n} ajet${n === 1 ? "" : "a"}`,
    ajetiPerDay: (n) => `${n} ajet${n === 1 ? "" : "a"}/dan`,
    pagesAllAtOnce: (n) => `${n} str. odjednom`,
    ajetiAllAtOnce: (n) => `${n} ajet${n === 1 ? "" : "a"} odjednom`,
    cyclesUnit: (n) => `${n}×`,
    unknownValue: "—",
    everyDay: "svaki dan",
    btnReset: "Resetuj", btnEdit: "Uredi", btnDelete: "Obriši",
    btnActivate: "Aktiviraj", btnDeactivate: "Deaktiviraj",
    confirmDeleteText: "Obrisati ovaj plan? Ne može se vratiti.",
    confirmDeleteYes: "Da, obriši", confirmDeleteNo: "Otkaži",
    confirmResetText: "Resetuj raspored ponavljanja na početak? Hifz Tracker (naučeno/savladano) ostaje netaknut.",
    confirmResetYes: "Da, resetuj",
    editDaniLabel: "Dani ponavljanja",
    editKolicinaLabel: "Dnevna količina (stranica)",
    editKolicinaFixed: "Ova metoda ima fiksnu strukturu — količina se ne može ručno mijenjati.",
    editSave: "Sačuvaj", editCancel: "Otkaži",
    toggleForecast: "30-dnevni pregled",
    confirmNextTitle: "Jesi li označio/la sve što već znaš?",
    confirmNextBody: "Plan ponavljanja se pravi na osnovu onoga što si upravo odabrao/la — provjeri da ništa nisi zaboravio/la prije nego nastaviš na metodu.",
    confirmNextYes: "Da, sve sam označio/la →",
    confirmNextNo: "Ne, vrati me nazad",
    readMore: "Pročitaj više",
    readLess: "Sakrij",
    readInDetail: "Pročitaj detaljno →",
    nivoPickTitle: "Odaberi svoj trenutni nivo:",
    nivoLevels: [
      { id: "pocetnik", naziv: "Početnički", opis: "Novi hafiz, uči prve džuzeve" },
      { id: "srednji", naziv: "Srednji", opis: "Naučeno 5–15 džuzeva" },
      { id: "napredni", naziv: "Napredni / Hafiz", opis: "Cijeli ili veći dio Kur'ana naučen" },
    ],
    methods: [
      { id: "fibonacci",    naziv: "Fibonacci",             opis: "1→2→3→5→8 dana — postepeno udaljavanje" },
      { id: "tri_dana",     naziv: "Tri dana",               opis: "3 uzastopna dana konsolidacije" },
      { id: "sedam_dana",   naziv: "Sedam dana",             opis: "7 dana zaredom, pa pauza 14 dana" },
      { id: "dzuzevi",      naziv: "Sistem džuzeva",         opis: "Jedan džuz dnevno, 30 dana = hatma" },
      { id: "stranice",     naziv: "Po stranicama",          opis: "Dnevna kvota stranica, kružno" },
      { id: "seton",        naziv: "Šetonova (8 dijelova)",  opis: "Hifz u 8 jednakih dijelova, svaki dan 1/8" },
      { id: "novo_staro",   naziv: "Novo i staro",           opis: "Jutro: nedavno naučeno | Veče: stariji hifz" },
      { id: "greske",       naziv: "Na osnovu grešaka",      opis: "Prioritet ajeti s greškama iz Trackera" },
      { id: "nivo",         naziv: "Po hafizovom nivou",     opis: "Plan prilagođen tvom trenutnom nivou" },
      { id: "slobodan",     naziv: "Slobodan raspored",      opis: "Bez automatike — samo bilježi šta uradiš" },
      { id: "mualim",       naziv: "Muallimov plan",         opis: "Muallim kreira i dodjeljuje plan" },
      { id: "femi",         naziv: "Femi bi Ševk",           opis: "Kur'an u 7 dana po tradicionalnoj podjeli" },
      { id: "dzuz_sedmica", naziv: "Džuz kroz sedmicu",      opis: "Jedan džuz raspoređen na 7 dana intenzivno" },
      { id: "dinamicna",    naziv: "Dinamična raspodjela",   opis: "Auto-rebalans svakim danom po stvarnom tempu" },
      { id: "srs",          naziv: "SRS (Naučni model)",     opis: "Pametno ponavljanje — rjeđe ono što znaš dobro" },
    ],
  },
  en: {
    title: "Hifz Planner",
    subtitle: "Generate a personal Qur'an learning and review plan",
    tabReview: "Review Plan",
    tabLearn: "Learning Plan",
    steps: ["What you know", "Method", "Schedule", "Strictness", "Plan"],
    k1Title: "What have you learned so far?",
    autoDetectTitle: "We can see what you already know",
    autoDetectBody: (n) => `The Hifz Tracker shows you know ${n} pages. Should we use that for the review plan?`,
    autoDetectBodyAll: "The Hifz Tracker shows you know all 604 pages. Should we use that for the review plan?",
    autoDetectYes: "Yes, review it all →",
    autoDetectNo: "No — I'll pick myself",
    autoDetectHint: "You don't have to review everything you know — below you can pick specific surahs, juz, or pages.",
    optJuzTitle: "By juz", optJuzDesc: "Select the juz you know",
    optSureTitle: "By surah", optSureDesc: "Mark the surahs you know",
    optStraniceTitle: "By page", optStraniceDesc: "Pick specific pages you know",
    optAjetiTitle: "By ayah", optAjetiDesc: "Type specific ayahs you know (for interval methods)",
    optHafizTitle: "I am a hafiz/hafiza", optHafizDesc: "I know all 604 pages",
    optRucnoTitle: "Enter manually", optRucnoDesc: "Open Hifz Tracker and mark pages",
    quickInput: "Quick entry",
    quickInputPh: "I know the first X juz",
    quickInputStranicePh: "e.g. 12, 45-50, 88",
    apply: "Apply",
    orManual: "Or select manually",
    selectedJuz: (n, p) => `✓ Selected ${n} juz — ~${p} pages total`,
    searchSuraPh: "Search a surah (e.g. Al-Kahf or 18)...",
    pageAbbr: "p.",
    selectedSure: (n, p) => `✓ Selected ${n} surah${n === 1 ? "" : "s"} — ~${p} pages total`,
    selectedStranice: (n) => `✓ Selected ${n} page${n === 1 ? "" : "s"}`,
    ajetiInputPh: "e.g. 36:1, 36:5-10, 2:255",
    ajetiInputHint: "Format: surah:ayah — single or a range within the same surah. Available only for Fibonacci, Three days, Seven days and SRS (Motor A works on whole pages).",
    ajetiUnosGreskaMsg: "Some entries weren't recognized (expected surah:ayah, e.g. 36:5) — they were skipped.",
    selectedAjeti: (n) => `✓ Selected ${n} ayah${n === 1 ? "" : "s"}`,
    removeAjet: "Remove",
    hafizPre: "ما شاء الله — All ",
    hafizBold: "604 pages",
    hafizPost: " will be included in the review plan.",
    hafizNarrowHint: "Want to review only part of that? Above, you can pick By surah, By juz, or By page instead of this.",
    tempoTitle: "What pace do you want to review at?",
    tempoUnitLabel: "What unit do you think in?",
    tempoUnitNames: { dzuzevi: "Juz", sure: "Surahs", stranice: "Pages" },
    tempoModeLabel: "How do you want to set the pace?",
    tempoModeBroj: "Amount per day",
    tempoModeVrijeme: "Time to finish",
    tempoQtyLabelBroj: (u) => `How many ${u.toLowerCase()} per day?`,
    tempoQtyLabelVrijeme: "How long do you want to take to review the whole Qur'an?",
    tempoDana: "days", tempoSedmica: "weeks", tempoMjeseci: "months",
    tempoSummary: (p, d) => `That's ~${p} pages a day — the whole Qur'an in ~${d} days.`,
    tempoHint: "This sets the daily pace for review methods that adapt to any pace (e.g. Fibonacci, By pages, Dynamic distribution).",
    tempoAjetiTitle: "What pace do you want for the selected ayahs?",
    tempoAjetiQtyLabelBroj: "How many ayahs per day?",
    tempoAjetiQtyLabelVrijeme: "In how much time do you want to review all selected ayahs?",
    tempoAjetiSummary: (n, d) => `That means ~${n} ayahs a day — all selected ayahs in ~${d} days.`,
    tempoAjetiHint: "The scope is split into smaller blocks of this size that start staggered, instead of all ayahs being due on the same day.",
    showAllMethods: (n) => `Show the other ${n} too`,
    hideFilteredMethods: "Hide methods that don't fit",
    methodsFilteredNote: "Only methods that fit your chosen unit are shown.",
    methodFixedPaceNote: "Has its own fixed, built-in pace — it doesn't follow the number/time you entered above.",
    methodPileupWarning: "⚠️ A mistake sends the whole block back to day 1 — at this scope that can stack up a lot of reviews on one day. For maintaining material you already know, consider Juz Rotation, By Pages, Seton, or Dynamic Distribution (no such risk).",
    nextMethod: "Next — Choose review method →",
    k2Title: "Choose a review method",
    back: "← Back",
    k2DescPre: "The system will generate your schedule based on the ",
    k2DescBold: (p) => `${p} pages`,
    k2DescBoldAjeti: (n) => `${n} ayah${n === 1 ? "" : "s"}`,
    k2DescPost: " you know and the method you choose.",
    generatePlan: "Generate review plan →",
    raspTitle: "Order and schedule",
    raspRedoslijedLabel: "In what order?",
    raspRedoslijedOpts: {
      od_pocetka: "From the start of the Qur'an", od_kraja: "From the end backwards",
      najslabiji: "From the weakest pages", nasumicno: "Randomly",
    },
    raspPodjelaLabel: "How many times a day?",
    raspPodjelaOpts: { 1: "Once", 2: "Morning and evening", 3: "Three times" },
    raspSlobodniLabel: "Any days you don't review?",
    raspDani: { pon: "Mon", uto: "Tue", sri: "Wed", cet: "Thu", pet: "Fri", sub: "Sat", ned: "Sun" },
    raspNext: "Next — Strictness on errors →",
    strogTitle: "Strictness on errors",
    strogQuestion: "When you make a mistake on a page, what should we do?",
    strogOpts: {
      blago: { naziv: "Gentle", opis: "Note it, put it back in the plan after a few days" },
      normalno: { naziv: "Normal", opis: "Bring it back soon and track it until it stabilizes (recommended)" },
      strogo: { naziv: "Strict", opis: "Goes on the daily schedule until it's clean three times in a row" },
    },
    strogParams: (maxDnevno, izlazak) => `Weak-page queue: max ${maxDnevno} pages/day, exits after ${izlazak} clean reviews in a row.`,
    strogNext: "Next — Review plan →",
    k3Title: "Your review plan",
    pagesInSystem: (n) => `${n} pages in the system`,
    ajetiInSystem: (n) => `${n} ayah${n === 1 ? "" : "s"} in the system`,
    k3Note: "Click \"Activate plan\" to see the actual schedule for the coming days.",
    activated: "✓ Plan activated and saved",
    saving: "Saving...",
    activate: "Activate plan →",
    activePlanLabel: "Active review plan",
    scopeDzuzoviSummary: (n, p) => `By juz — ${n} juz (~${p} pages)`,
    scopeSureSummary: (n, p) => `By surah — ${n} surah${n === 1 ? "" : "s"} (~${p} pages)`,
    scopeHafizSummary: "Hafiz/hafiza — all 604 pages",
    scopeStraniceSummary: (p) => `By page — ${p} page${p === 1 ? "" : "s"} (hand-picked)`,
    scopeAjetiSummary: (n) => `By ayah — ${n} ayah${n === 1 ? "" : "s"} (hand-picked)`,
    scopeRucnoSummary: (p) => `Manual, from Hifz Tracker — ${p} pages`,
    generateNewPlan: "+ Generate new plan",
    plansListTitle: "Your review plans",
    statusActive: "Active", statusInactive: "Inactive",
    statDaily: "Daily", statDuration: "Duration", statStart: "Start", statEnd: "End",
    statGoal: "Goal", statDone: "Reviewed", statNext: "Up next", statDays: "Review days",
    statBlockSize: "Block size",
    daysUnit: (n) => `${n} days`,
    pagesUnit: (n) => `${n} pages`,
    pagesPerDay: (n) => `${n} pages/day`,
    ajetiUnit: (n) => `${n} ayah${n === 1 ? "" : "s"}`,
    ajetiPerDay: (n) => `${n} ayah${n === 1 ? "" : "s"}/day`,
    pagesAllAtOnce: (n) => `${n} pages, all at once`,
    ajetiAllAtOnce: (n) => `${n} ayah${n === 1 ? "" : "s"}, all at once`,
    cyclesUnit: (n) => `${n}×`,
    unknownValue: "—",
    everyDay: "every day",
    btnReset: "Reset", btnEdit: "Edit", btnDelete: "Delete",
    btnActivate: "Activate", btnDeactivate: "Deactivate",
    confirmDeleteText: "Delete this plan? This can't be undone.",
    confirmDeleteYes: "Yes, delete", confirmDeleteNo: "Cancel",
    confirmResetText: "Reset the review schedule to the start? Hifz Tracker (learned/mastered) stays untouched.",
    confirmResetYes: "Yes, reset",
    editDaniLabel: "Review days",
    editKolicinaLabel: "Daily quantity (pages)",
    editKolicinaFixed: "This method has a fixed structure — quantity can't be edited manually.",
    editSave: "Save", editCancel: "Cancel",
    toggleForecast: "30-day preview",
    confirmNextTitle: "Have you marked everything you already know?",
    confirmNextBody: "The review plan is built from what you just selected — double check you haven't forgotten anything before moving on to the method.",
    confirmNextYes: "Yes, I've marked it all →",
    confirmNextNo: "No, take me back",
    readMore: "Read more",
    readLess: "Hide",
    readInDetail: "Read in detail →",
    nivoPickTitle: "Choose your current level:",
    nivoLevels: [
      { id: "pocetnik", naziv: "Beginner", opis: "New hafiz, learning the first juz" },
      { id: "srednji", naziv: "Intermediate", opis: "5–15 juz memorized" },
      { id: "napredni", naziv: "Advanced / Hafiz", opis: "All or most of the Qur'an memorized" },
    ],
    methods: [
      { id: "fibonacci",    naziv: "Fibonacci",            opis: "1→2→3→5→8 days — gradually spacing out" },
      { id: "tri_dana",     naziv: "Three days",           opis: "3 consecutive days of consolidation" },
      { id: "sedam_dana",   naziv: "Seven days",           opis: "7 days in a row, then a 14-day break" },
      { id: "dzuzevi",      naziv: "Juz system",           opis: "One juz per day, 30 days = full khatma" },
      { id: "stranice",     naziv: "By pages",             opis: "Daily page quota, cyclical" },
      { id: "seton",        naziv: "Seton method (8 parts)", opis: "Hifz split into 8 equal parts, 1/8 per day" },
      { id: "novo_staro",   naziv: "New and old",          opis: "Morning: recently learned | Evening: older hifz" },
      { id: "greske",       naziv: "Based on mistakes",    opis: "Prioritizes ayahs with errors from the Tracker" },
      { id: "nivo",         naziv: "By hafiz level",       opis: "Plan tailored to your current level" },
      { id: "slobodan",     naziv: "Free schedule",        opis: "No automation — just log what you do" },
      { id: "mualim",       naziv: "Muallim's plan",       opis: "The muallim creates and assigns the plan" },
      { id: "femi",         naziv: "Femi bi Shevk",        opis: "Qur'an in 7 days by traditional division" },
      { id: "dzuz_sedmica", naziv: "Juz across the week",  opis: "One juz spread intensively over 7 days" },
      { id: "dinamicna",    naziv: "Dynamic distribution", opis: "Auto-rebalances daily based on real pace" },
      { id: "srs",          naziv: "SRS (Scientific model)", opis: "Smart review — less often for what you know well" },
    ],
  },
}

function getPagesForJuzs(juzIds) {
  const pages = new Set()
  juzIds.forEach(id => {
    const [start, end] = JUZ_PAGES[id - 1]
    for (let p = start; p <= end; p++) pages.add(p)
  })
  return pages
}

function getPagesForSuras(suraIds) {
  const pages = new Set()
  suraIds.forEach(id => {
    const sura = SURA_DATA.find(s => s.id === id)
    if (sura) for (let p = sura.startPage; p <= sura.endPage; p++) pages.add(p)
  })
  return pages
}

// seedMethodEngine je izdvojen u features/murajaah/seedMethodEngine.js (i
// muallim panel ga sad poziva za povezane učenike - mualimService.js).

export default function HifzPlannerPage() {
  const { theme } = useTheme()
  const { user }  = useAuth()
  const { lang }  = useLang()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const t = STR[lang] || STR.bs
  // Isti hook koji napaja Hifz Tracker - treba nam da "Unesi ručno" put zna
  // koje je stranice korisnik STVARNO označio kao naučene/savladane.
  const { pageStatuses, setPagesStatusBulk } = useHifzState()
  const tour = usePageTour("hifz-planner-page", HIFZ_PLANNER_PAGE_TOUR)

  const [activeTab, setActiveTab] = useState("ponavljanje") // "ponavljanje" | "ucenje"

  // Plan ponavljanja state
  const [korak, setKorak] = useState(1) // 1=unos šta znaš, 2=metoda, 3=pregled
  const [nacin, setNacin] = useState(null) // "dzuzovi" | "sure" | "stranice" | "hafiz" | "rucno"
  const [aktiviranje, setAktiviranje] = useState(false)
  const [aktivirano, setAktivirano]   = useState(false)
  // Plan koji je TEK aktiviran u ovom prolazu wizarda - koristi se da se na
  // koraku "Pregled" prikaže STVARNA projekcija rasporeda (isti prikaz kao
  // na listi planova), umjesto statične napomene "biće u sljedećoj fazi".
  const [aktivniPlanZaPregled, setAktivniPlanZaPregled] = useState(null)

  // Tempo ponavljanja - radi za SVAKI opseg (hafiz/dzuzevi/sure/rucno)
  const [tempoUnit, setTempoUnit] = useState(null) // "dzuzevi" | "sure" | "stranice"
  const [tempoMode, setTempoMode] = useState("broj") // "broj" | "vrijeme"
  const [tempoQuantity, setTempoQuantity] = useState("")
  const [tempoVrijemeJedinica, setTempoVrijemeJedinica] = useState("dana") // "dana" | "sedmica" | "mjeseci"
  const [showAllMethods, setShowAllMethods] = useState(false)
  // 3.1 Auto-detekcija iz trackera - dok korisnik ne potvrdi/odbije, u koraku
  // 1 se prikazuje potvrda umjesto ručnih opcija (ali ručni unos ostaje
  // dostupan preko "Nije tačno").
  const [autoDetectDismissed, setAutoDetectDismissed] = useState(false)

  // Planovi ponavljanja (SVI - aktivni i historija) - wizard od koraka 1 se
  // prikazuje SAMO kad nijedan plan ne postoji (prvi put) ili kad korisnik
  // eksplicitno traži novi preko "+ Generiši novi plan"; inače se prikazuje
  // lista. Više planova može biti aktivno istovremeno (npr. džuzevi + sure
  // zasebno), samo ne dva na ISTOJ metodi (vidi hifzPlansService.js).
  const [reviewPlans, setReviewPlans] = useState([])
  const [planStatsById, setPlanStatsById] = useState({})
  const [loadingReview, setLoadingReview] = useState(true)
  const [reviewWizardOpen, setReviewWizardOpen] = useState(false)
  // Potvrda prije prelaska na korak 2 - "jesi li označio sve što znaš?"
  const [confirmNextOpen, setConfirmNextOpen] = useState(false)

  // Lista planova - akcije po pojedinačnom planu (id kao ključ)
  const [planActionBusy, setPlanActionBusy] = useState(null) // id plana u obradi (disable dugmad)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmResetId, setConfirmResetId] = useState(null)
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [editSlobodniDani, setEditSlobodniDani] = useState([])
  const [editKolicina, setEditKolicina] = useState("")
  const [expandedForecastId, setExpandedForecastId] = useState(null)

  // Džuzovi
  const [odabraniDzuzovi, setOdabraniDzuzovi] = useState([])
  const [brziDzuz, setBrziDzuz] = useState("")

  // Sure
  const [odabraneSure, setOdabraneSure] = useState([])
  const [suraPretrazivanje, setSuraPretrazivanje] = useState("")

  // Stranice - pojedinačne stranice, neovisno o džuzu/suri (npr. korisnik
  // ne želi ponavljati SVE što zna, nego samo konkretan izbor stranica)
  const [odabraneStranice, setOdabraneStranice] = useState([])
  const [brzaStranica, setBrzaStranica] = useState("")

  // Ajeti - pojedinačni ajeti, unos tekstom (npr. "36:1, 36:5-36:10"), isti
  // fazon kao ručni unos bloka na Murajaa stranici. Dostupno SAMO za
  // intervalne metode (fibonacci/tri_dana/sedam_dana/srs) - Motor A
  // (Sistem džuzeva/Po stranicama/Šetonova/Dinamična) radi isključivo po
  // cijelim stranicama, ne po pojedinačnim ajetima.
  const [odabraniAjeti, setOdabraniAjeti] = useState([])
  const [unosAjeta, setUnosAjeta] = useState("")
  const [ajetiUnosGreska, setAjetiUnosGreska] = useState("")

  // Odabrana metoda
  const [odabranaMetoda, setOdabranaMetoda] = useState(null)
  // Koja je metoda trenutno "Pročitaj više" proširena (samo jedna odjednom)
  const [expandedMethod, setExpandedMethod] = useState(null)
  // "Po hafizovom nivou" nije samostalna metoda ponavljanja - nadograđuje
  // stvarnu (preporučenu) metodu prema odabranom nivou. Traži se dodatni izbor.
  const [nivoLevel, setNivoLevel] = useState(null) // "pocetnik" | "srednji" | "napredni"

  // Korak "Redoslijed i raspored" (dokument, wizard korak 6)
  const [redoslijed, setRedoslijed] = useState("od_pocetka") // "od_pocetka" | "od_kraja" | "najslabiji" | "nasumicno"
  const [podjelaDana, setPodjelaDana] = useState(1) // 1 | 2 | 3 puta dnevno
  const [slobodniDani, setSlobodniDani] = useState([]) // ["pon","uto",...]

  // Korak "Strogost prema greškama" (dokument, wizard korak 7 - sekcija 4.11)
  const [strogost, setStrogost] = useState("normalno") // "blago" | "normalno" | "strogo"

  const isLight = theme?.id === "beige_white" || theme?.id === "pink_soft"
  const border  = isLight ? "border-black/10" : "border-white/8"
  const mutedCls = theme?.muted || "text-gray-400"
  const textCls  = theme?.text  || "text-white"
  const cardCls  = theme?.card  || "bg-gray-800"
  const btnCls   = theme?.button || "bg-indigo-600 text-white"
  const accentCls = theme?.accent || "text-indigo-400"

  // Veličina opsega jednog plana (za statistike) - ista logika kao
  // naučeneStr, samo iz SAČUVANOG scope_data (ne trenutnog wizard state-a).
  const ukupnoStrZaPlan = (plan) => {
    if (plan.scope_type === "hafiz") return 604
    if (plan.scope_type === "dzuzovi") return getPagesForJuzs(plan.scope_data?.odabraniDzuzovi || []).size
    if (plan.scope_type === "sure") return getPagesForSuras(plan.scope_data?.odabraneSure || []).size
    if (plan.scope_type === "stranice") return (plan.scope_data?.odabraneStranice || []).length
    // "ajeti" - broj ajeta, NE stranica (proceniPlan() ne mari za jedinicu,
    // samo dijeli ukupno/dnevno - rezultat je onda ispravan u ajetima, ne
    // stranicama; label se posebno bira niže, u prikazu liste planova).
    if (plan.scope_type === "ajeti") return (plan.scope_data?.odabraniAjeti || []).length
    if (plan.scope_type === "rucno") return (plan.scope_data?.rucnoPages || []).length
    return 0
  }

  // Učitaj SVE planove ponavljanja (aktivne i historiju) + statistike po
  // svakom - određuje da li se prikazuje lista ili wizard od koraka 1.
  const loadReviewPlans = useCallback(async () => {
    if (!user?.id) { setLoadingReview(false); return }
    setLoadingReview(true)
    try {
      const plans = await fetchAllReviewPlans(user.id)
      setReviewPlans(plans)
      const statsEntries = await Promise.all(
        plans.map(async (p) => {
          try { return [p.id, await fetchPlanStats(user.id, p, ukupnoStrZaPlan(p), todayStr())] }
          catch { return [p.id, null] }
        })
      )
      setPlanStatsById(Object.fromEntries(statsEntries))
    } catch { setReviewPlans([]); setPlanStatsById({}) }
    setLoadingReview(false)
  }, [user?.id])

  // loadReviewPlans() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadReviewPlans() }, [loadReviewPlans])

  // Povratak sa Hifz Trackera (floating "Sljedeći korak", nakon "Unesi ručno")
  // - otvara wizard DIREKTNO na koraku 2 (Metoda), jer je korisnik upravo
  // označio šta zna u Trackeru; korak 1 se ovdje preskače u potpunosti.
  // Čita URL query param (vanjski sistem - router) i sinhronizira ga natrag
  // (setSearchParams) - mora ostati u useEffect-u; namjerno se pokreće samo
  // jednom pri mountu (prazan dependency niz).
  useEffect(() => {
    if (searchParams.get("resumeReview") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNacin("rucno")
      setReviewWizardOpen(true)
      setKorak(2)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resetuje wizard na prazno stanje i otvara ga (za "+ Generiši novi plan").
  const startNewReviewPlan = () => {
    setKorak(1)
    setNacin(null)
    setOdabraniDzuzovi([])
    setBrziDzuz("")
    setOdabraneSure([])
    setSuraPretrazivanje("")
    setOdabraneStranice([])
    setBrzaStranica("")
    setOdabraniAjeti([])
    setUnosAjeta("")
    setAjetiUnosGreska("")
    setOdabranaMetoda(null)
    setNivoLevel(null)
    setTempoUnit(null)
    setTempoMode("broj")
    setTempoQuantity("")
    setTempoVrijemeJedinica("dana")
    setShowAllMethods(false)
    setAutoDetectDismissed(false)
    setRedoslijed("od_pocetka")
    setPodjelaDana(1)
    setSlobodniDani([])
    setStrogost("normalno")
    setAktivirano(false)
    setAktivniPlanZaPregled(null)
    setReviewWizardOpen(true)
  }

  // Izračun naučenih stranica
  const naučeneStr = (() => {
    if (nacin === "hafiz") return new Set(Array.from({ length: 604 }, (_, i) => i + 1))
    if (nacin === "dzuzovi") return getPagesForJuzs(odabraniDzuzovi)
    if (nacin === "sure")    return getPagesForSuras(odabraneSure)
    if (nacin === "stranice") return new Set(odabraneStranice)
    // "rucno" - stvarno stanje iz Hifz Trackera (stranice označene kao
    // naučene ili savladane), ne ručni unos ovdje.
    if (nacin === "rucno") {
      return new Set(
        Object.keys(pageStatuses)
          .filter(p => ["naucen", "savladano"].includes(pageStatuses[p]?.status))
          .map(Number)
      )
    }
    return new Set()
  })()

  const ukupnoStr = naučeneStr.size
  // Broj odabranih AJETA (potpuno odvojeno od ukupnoStr/stranica - "ajeti"
  // je jedini opseg gdje jedinica NIJE stranica).
  const ukupnoAjeta = odabraniAjeti.length

  // 3.1 Auto-detekcija - koliko stranica Tracker VEĆ pokazuje kao naučeno,
  // neovisno o tome šta je ovdje odabrano. Koristi se samo za potvrdu u
  // koraku 1 kod SVJEŽEG wizarda (nacin još nije postavljen).
  const detectedPageCount = Object.keys(pageStatuses)
    .filter((p) => ["naucen", "savladano"].includes(pageStatuses[p]?.status)).length

  // Tempo ponavljanja - radi za SVAKI opseg (hafiz/dzuzevi/sure/rucno): iz
  // (jedinica, način, količina) izračunaj dnevnu količinu u stranicama + broj
  // dana da se ponovi CIJELI ODABRANI OPSEG (ukupnoStr, ne uvijek 604) tim
  // tempom. "vrijeme" način: sedmice/mjeseci se prije izračuna pretvore u dane.
  const TEMPO_OPSEZI = ["hafiz", "dzuzevi", "sure", "stranice", "rucno"]
  const tempoQuantityNum = parseFloat(tempoQuantity)
  const tempoVrijemeUDanima =
    tempoVrijemeJedinica === "sedmica" ? tempoQuantityNum * 7 :
    tempoVrijemeJedinica === "mjeseci" ? tempoQuantityNum * 30 :
    tempoQuantityNum
  let tempoResult = null
  if (TEMPO_OPSEZI.includes(nacin) && tempoUnit && tempoQuantityNum > 0 && ukupnoStr > 0) {
    try {
      tempoResult = computeTempo({
        unit: tempoUnit,
        mode: tempoMode,
        quantity: tempoMode === "vrijeme" ? tempoVrijemeUDanima : tempoQuantityNum,
        totalPagesInScope: ukupnoStr,
      })
    } catch { tempoResult = null }
  }

  // Tempo za "ajeti" - POSEBAN, jednostavniji izračun (ne ide kroz
  // planTempo.js jer taj modul radi konverzije džuz/sura/stranica → stranice;
  // ajet je već atomska jedinica, nema potrebe za faktorom konverzije).
  // Polje se i dalje zove dailyQtyPages (isto ime kao za ostale opsege) da
  // seedMethodEngine/planStats ne moraju posebno granati na naziv polja -
  // za "ajeti" ono jednostavno znači "ajeta po bloku", ne stranica.
  let tempoResultAjeti = null
  if (nacin === "ajeti" && tempoQuantityNum > 0 && ukupnoAjeta > 0) {
    if (tempoMode === "broj") {
      const dailyQtyPages = Math.max(1, Math.round(tempoQuantityNum))
      tempoResultAjeti = { dailyQtyPages, totalDays: Math.max(1, Math.ceil(ukupnoAjeta / dailyQtyPages)) }
    } else {
      const totalDays = Math.max(1, Math.round(tempoVrijemeUDanima))
      tempoResultAjeti = { dailyQtyPages: Math.max(1, Math.ceil(ukupnoAjeta / totalDays)), totalDays }
    }
  }

  // Koje metode odgovaraju odabranoj jedinici (dok je opseg aktivan i
  // jedinica odabrana) - filtrira listu metoda u koraku 2. "ajeti" je uvijek
  // ograničen na intervalne metode (fibonacci/tri_dana/sedam_dana/srs) - vidi
  // napomenu uz odabraniAjeti state.
  const allowedMethodIds =
    nacin === "ajeti" ? ["fibonacci", "tri_dana", "sedam_dana", "srs"] :
    (TEMPO_OPSEZI.includes(nacin) && tempoUnit) ? compatibleMethods(tempoUnit) : null
  const FIXED_PACE_METHOD_IDS = ["dzuzevi", "dzuz_sedmica", "seton", "femi"]
  // fibonacci/tri_dana/sedam_dana vraćaju CIJELI blok na dan 1 na grešku
  // (methods.js: onError "reset"); srs samo padne jedan nivo ("stepDown"),
  // ali je i dalje zamišljen za pojedinačne stavke koje se tek uče, ne za
  // održavanje već naučenog. Za veći opseg (npr. hafiz, 604 str. u ~121
  // blok) greške/kašnjenja mogu nagomilati puno blokova na isti dan -
  // upozoravamo, ali ne blokiramo (korisnica i dalje može odabrati).
  const PILEUP_RISK_METHOD_IDS = ["fibonacci", "tri_dana", "sedam_dana", "srs"]
  // Prag ~70 str. = otprilike 3-4 džuza (korisničin vlastiti orijentir) -
  // iznad toga ove metode se podrazumijevano SAKRIJU iz liste (ne samo
  // upozorenje), isti mehanizam kao "izvan tempa" ispod - ostaju dostupne
  // preko "Prikaži i preostale" da ništa nije tvrdo blokirano.
  const velikOpseg = ukupnoStr > 70
  // Metode koje se podrazumijevano ne prikazuju u koraku 2 - ili su izvan
  // odabranog tempa, ili nose rizik gomilanja za veći opseg. Uvijek se mogu
  // otkriti preko "Prikaži i preostale".
  const hiddenMethodIds = t.methods
    .filter(m => (allowedMethodIds && !allowedMethodIds.includes(m.id)) ||
      (velikOpseg && PILEUP_RISK_METHOD_IDS.includes(m.id)))
    .map(m => m.id)

  // Toggle džuz
  const toggleDzuz = (id) => {
    setOdabraniDzuzovi(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  // Brzi unos "znam prvih X džuzova"
  const primijeniBreziDzuz = () => {
    const n = parseInt(brziDzuz)
    if (!n || n < 1 || n > 30) return
    setOdabraniDzuzovi(Array.from({ length: n }, (_, i) => i + 1))
  }

  // Toggle sura
  const toggleSura = (id) => {
    setOdabraneSure(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const filtrovaneSure = SURA_DATA.filter(s =>
    s.name.toLowerCase().includes(suraPretrazivanje.toLowerCase()) ||
    s.id.toString().includes(suraPretrazivanje)
  )

  // Toggle pojedinačna stranica
  const toggleStranica = (id) => {
    setOdabraneStranice(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  // Brzi unos raspona stranica, npr. "12, 45-50, 88" - DODAJE na postojeći
  // izbor (ne zamjenjuje ga), jer stranice biraju iz više razbacanih
  // raspona, za razliku od "prvih X džuzova".
  const primijeniBrzuStranicu = () => {
    const dijelovi = brzaStranica.split(",").map(d => d.trim()).filter(Boolean)
    const nove = new Set(odabraneStranice)
    for (const dio of dijelovi) {
      const raspon = dio.match(/^(\d+)\s*-\s*(\d+)$/)
      if (raspon) {
        let a = parseInt(raspon[1]), b = parseInt(raspon[2])
        if (a > b) [a, b] = [b, a]
        for (let p = Math.max(1, a); p <= Math.min(604, b); p++) nove.add(p)
      } else {
        const n = parseInt(dio)
        if (n >= 1 && n <= 604) nove.add(n)
      }
    }
    setOdabraneStranice([...nove].sort((a, b) => a - b))
    setBrzaStranica("")
  }

  // Toggle pojedinačan ajet
  const toggleAjet = (key) => {
    setOdabraniAjeti(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // Unos ajeta tekstom - isti fazon kao ručni unos bloka na Murajaa stranici,
  // uz podršku raspona unutar iste sure: "36:1, 36:5-10, 2:255". DODAJE na
  // postojeći izbor (ne zamjenjuje ga).
  const primijeniUnosAjeta = () => {
    const dijelovi = unosAjeta.split(/[,\n]+/).map(d => d.trim()).filter(Boolean)
    const nove = new Set(odabraniAjeti)
    let bilaGreska = false
    for (const dio of dijelovi) {
      const raspon = dio.match(/^(\d+):(\d+)\s*-\s*(\d+)$/)
      const pojedinacni = dio.match(/^(\d+):(\d+)$/)
      if (raspon) {
        const sura = parseInt(raspon[1])
        let a = parseInt(raspon[2]), b = parseInt(raspon[3])
        if (a > b) [a, b] = [b, a]
        for (let n = a; n <= b; n++) nove.add(`${sura}:${n}`)
      } else if (pojedinacni) {
        nove.add(`${parseInt(pojedinacni[1])}:${parseInt(pojedinacni[2])}`)
      } else {
        bilaGreska = true
      }
    }
    setOdabraniAjeti([...nove].sort((a, b) => {
      const [as, an] = a.split(":").map(Number)
      const [bs, bn] = b.split(":").map(Number)
      return as - bs || an - bn
    }))
    setUnosAjeta("")
    setAjetiUnosGreska(bilaGreska ? t.ajetiUnosGreskaMsg : "")
  }

  // Kad korisnik u koraku 1 označi da već ZNA neke džuzeve/sure (ili cijeli
  // Kur'an), taj podatak mora stići i do Hifz Trackera - inače Tracker i
  // dalje pokazuje te stranice kao "Nije počeo" iako je plan ponavljanja
  // već aktivan za njih (baš bag koji je korisnica prijavila). Ne diramo
  // stranice koje su VEĆ "Naučen"/"Savladano" (da se ništa ne obriše/vrati
  // nazad), isti mehanizam kao "Označi sve kao naučeno" u JuzDetailView.jsx.
  const syncTrackerNaucen = async (pageNumbers) => {
    const toSync = (pageNumbers || []).filter(
      (p) => !["naucen", "savladano"].includes(pageStatuses[p]?.status)
    )
    if (!toSync.length) return
    try {
      const { data, error } = await supabase.from("ayahs").select("verse_key").in("page_number", toSync)
      if (error) throw error
      const verseKeys = (data || []).map((r) => r.verse_key)
      await setPagesStatusBulk(toSync, "naucen", verseKeys)
    } catch (e) { console.error("sync Trackera (naucen):", e) }
  }

  // Snimanje plana u Supabase (hifz_plans) - dugme "Aktiviraj plan"
  const aktivirajPlan = async () => {
    if (!user?.id || !odabranaMetoda) return
    if (odabranaMetoda === "nivo" && !nivoLevel) return // nivo mora biti odabran
    setAktiviranje(true)

    // "Po hafizovom nivou" nije samostalan motor - preporučuje STVARNU
    // metodu prema odabranom nivou (vidi nivo.js); ta se metoda i pokreće.
    const baseMethod = odabranaMetoda === "nivo" ? nivoRecommendation(nivoLevel).metoda : odabranaMetoda

    // Tempo ponavljanja (jedinica + način + izračunata dnevna količina/broj
    // dana) - pamti se za SVAKI opseg (hafiz/dzuzevi/sure/rucno), da se
    // kasnije može prikazati i po potrebi ponovo iskoristiti (npr. ako se
    // plan uređuje).
    const tempo =
      (nacin === "ajeti" && tempoResultAjeti)
        ? { unit: "ajeti", mode: tempoMode, quantity: tempoMode === "vrijeme" ? tempoVrijemeUDanima : tempoQuantityNum, ...tempoResultAjeti }
      : (TEMPO_OPSEZI.includes(nacin) && tempoResult)
        ? { unit: tempoUnit, mode: tempoMode, quantity: tempoMode === "vrijeme" ? tempoVrijemeUDanima : tempoQuantityNum, ...tempoResult }
        : null

    const scopeData =
      nacin === "dzuzovi"  ? { odabraniDzuzovi, tempo } :
      nacin === "sure"     ? { odabraneSure, tempo }    :
      nacin === "stranice" ? { odabraneStranice, tempo } :
      nacin === "ajeti"    ? { odabraniAjeti, tempo }   :
      nacin === "rucno"    ? { rucnoPages: [...naučeneStr].sort((a, b) => a - b), tempo } :
      nacin === "hafiz"    ? { tempo } : {}
    const punScopeDataBase = odabranaMetoda === "nivo" ? { ...scopeData, nivoLevel, baseMethod } : scopeData
    // Raspored (korak 3) i strogost prema greškama (korak 4) - dokument
    // sekcija 4.11. Pamte se uz plan; motor ih čita kad bude spreman da ih
    // primjeni na generisanje dnevnog plana (generisiDan.js / greske.js).
    const punScopeData = { ...punScopeDataBase, redoslijed, podjelaDana, slobodniDani, strogost }

    // Više aktivnih planova ODJEDNOM je u redu (npr. Sistem džuzeva za
    // naučene džuzeve + Fibonacci za sure zasebno) - ALI ne dva plana koja
    // dijele ISTU metodu, jer rotation_state/femi_state čuvaju stanje
    // jedinstveno po (user_id, method), a review_blocks nema plan_id da
    // razlikuje "čiji" je blok. Zato se gasi samo prethodni aktivan plan
    // ISTE (efektivne) metode, ne svi.
    try {
      const { data: aktivni } = await supabase.from("hifz_plans")
        .select("id, method, scope_data").eq("user_id", user.id).eq("active", true)
      const efektivnaMetoda = (p) => (p.method === "nivo" ? p.scope_data?.baseMethod : p.method)
      const zaGasiti = (aktivni || []).filter((p) => efektivnaMetoda(p) === baseMethod).map((p) => p.id)
      if (zaGasiti.length) {
        await supabase.from("hifz_plans").update({ active: false }).in("id", zaGasiti)
      }
    } catch { /* ignorisano */ }

    const { data: noviPlan, error } = await supabase.from("hifz_plans").insert({
      user_id: user.id,
      method: odabranaMetoda,
      scope_type: nacin,
      scope_data: punScopeData,
      active: true,
    }).select().single()

    // Inicijalizuj stvarni motor (rotation_state / femi_state / review_blocks
    // / localStorage) da "danas na redu" odmah radi za SVIH 16 metoda.
    try {
      const pagesArr = [...naučeneStr].sort((a, b) => a - b)
      const ajetiArr = nacin === "ajeti" ? [...odabraniAjeti] : []
      await seedMethodEngine(baseMethod, { userId: user.id, pagesArr, dzuzArr: odabraniDzuzovi, ajetiArr, today: todayStr(), tempo })
      // "dzuzovi" / "sure" / "hafiz" znače "ovo VEĆ znam" - to mora da se
      // vidi i u Trackeru, ne samo u opsegu plana ponavljanja. "rucno" se
      // preskače jer već ČITA stvarno stanje iz Trackera (nema šta da se piše),
      // a "ajeti" se PRESKAČE namjerno - pojedinačni odabrani ajeti ne bi
      // trebali automatski označiti CIJELE stranice kao naučene u Trackeru.
      if (["dzuzovi", "sure", "stranice", "hafiz"].includes(nacin)) {
        await syncTrackerNaucen(pagesArr)
      }
    } catch (e) { console.error("init motora:", e) }

    setAktiviranje(false)
    if (!error) {
      setAktivirano(true)
      // Novi plan (sa id-jem iz baze) - koristi se za stvarnu projekciju
      // rasporeda odmah na koraku "Pregled", umjesto statične napomene.
      setAktivniPlanZaPregled(noviPlan || null)
      loadReviewPlans()
    }
    else console.error("aktivirajPlan:", error)
  }

  // ── Lista planova: akcije (Reset / Uredi / Obriši / Aktiviraj-Deaktiviraj) ─

  // Iz SAČUVANOG plana rekonstruiši pagesArr (za Reset - poziva isti
  // seedMethodEngine kao prvobitna aktivacija).
  const pagesArrZaPlan = (plan) => {
    if (plan.scope_type === "hafiz") return Array.from({ length: 604 }, (_, i) => i + 1)
    if (plan.scope_type === "dzuzovi") return [...getPagesForJuzs(plan.scope_data?.odabraniDzuzovi || [])].sort((a, b) => a - b)
    if (plan.scope_type === "sure") return [...getPagesForSuras(plan.scope_data?.odabraneSure || [])].sort((a, b) => a - b)
    if (plan.scope_type === "stranice") return [...(plan.scope_data?.odabraneStranice || [])].sort((a, b) => a - b)
    if (plan.scope_type === "rucno") return [...(plan.scope_data?.rucnoPages || [])].sort((a, b) => a - b)
    return []
  }

  // Resetuj raspored ponavljanja na početak (ne dira Hifz Tracker) -
  // ponovo poziva isti seedMethodEngine kao aktivacija, sa startDate=danas.
  const resetujPlan = async (plan) => {
    if (!user?.id) return
    setPlanActionBusy(plan.id)
    try {
      const baseMethod = efektivnaMetoda(plan)
      await seedMethodEngine(baseMethod, {
        userId: user.id, pagesArr: pagesArrZaPlan(plan),
        dzuzArr: plan.scope_data?.odabraniDzuzovi || [],
        ajetiArr: plan.scope_type === "ajeti" ? (plan.scope_data?.odabraniAjeti || []) : [],
        today: todayStr(), tempo: plan.scope_data?.tempo || null,
      })
    } catch (e) { console.error("resetujPlan:", e) }
    setConfirmResetId(null)
    setPlanActionBusy(null)
    loadReviewPlans()
  }

  const obrisiPlan = async (plan) => {
    if (!user?.id) return
    setPlanActionBusy(plan.id)
    try { await deletePlan(user.id, plan) } catch (e) { console.error("obrisiPlan:", e) }
    setConfirmDeleteId(null)
    setPlanActionBusy(null)
    loadReviewPlans()
  }

  const promijeniAktivnost = async (plan) => {
    if (!user?.id) return
    setPlanActionBusy(plan.id)
    try {
      if (plan.active) await deactivatePlan(plan.id)
      else await reactivatePlan(user.id, plan)
    } catch (e) { console.error("promijeniAktivnost:", e) }
    setPlanActionBusy(null)
    loadReviewPlans()
  }

  const otvoriUredjivanje = (plan) => {
    setEditingPlanId(plan.id)
    setEditSlobodniDani(plan.scope_data?.slobodniDani || [])
    const stats = planStatsById[plan.id]
    setEditKolicina(stats?.dnevnaKolicina ? String(stats.dnevnaKolicina) : "")
  }

  // Količina se može ručno mijenjati samo kad postoji jasno polje koje je
  // nosi (rotation_state.quota za "Po stranicama", ili sačuvan tempo za
  // ostale) - metode s fiksnom ugrađenom strukturom (Sistem džuzeva, Šeton,
  // Dinamična/Femi bez tempa...) je ne nude, da se ne bi tiho
  // pretvarali da mijenjaju nešto što se zapravo ne koristi.
  const mozeUreditiKolicinu = (plan) => efektivnaMetoda(plan) === "stranice" || !!plan.scope_data?.tempo

  const sacuvajUredjivanje = async (plan) => {
    if (!user?.id) return
    setPlanActionBusy(plan.id)
    try {
      const noviScopeData = { ...(plan.scope_data || {}), slobodniDani: editSlobodniDani }
      const kolicinaNum = parseInt(editKolicina)
      const metoda = efektivnaMetoda(plan)
      if (kolicinaNum > 0 && mozeUreditiKolicinu(plan)) {
        if (metoda === "stranice") {
          await supabase.from("rotation_state").update({ quota: kolicinaNum })
            .eq("user_id", user.id).eq("method", "stranice")
        } else if (plan.scope_data?.tempo) {
          const ukupno = ukupnoStrZaPlan(plan)
          noviScopeData.tempo = {
            ...plan.scope_data.tempo, dailyQtyPages: kolicinaNum,
            totalDays: Math.max(1, Math.ceil(ukupno / kolicinaNum)),
          }
        }
      }
      await supabase.from("hifz_plans").update({ scope_data: noviScopeData }).eq("id", plan.id)
    } catch (e) { console.error("sacuvajUredjivanje:", e) }
    setEditingPlanId(null)
    setPlanActionBusy(null)
    loadReviewPlans()
  }

  // ── RENDER ──

  return (
    <div className="max-w-3xl mx-auto py-6 px-2">
      <GuidedTour steps={tour.steps} active={tour.active} onFinish={tour.finish} theme={theme} lang={tour.lang} dismissible />

      {/* Naslov */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${textCls} flex items-center`}>
          {t.title}
          <PageTourButton onClick={tour.start} />
        </h1>
        <p className={`text-sm mt-1 ${mutedCls}`}>
          {t.subtitle}
        </p>
      </div>

      {/* Tab selektor - velika slova, tekst razdvojen linijom (bez okvira);
          aktivni tab ima podvučenu liniju i podebljano, ne samo boju */}
      <div data-tour="tour-hifzplanner-tabs" className={`flex items-center mb-8 text-sm font-bold uppercase tracking-wider select-none border-b ${border}`}>
        {[
          { id: "ucenje",      label: t.tabLearn },
          { id: "ponavljanje", label: t.tabReview },
        ].map((tab, idx) => (
          <Fragment key={tab.id}>
            {idx > 0 && (
              <span className={`self-stretch w-px my-2 opacity-20 pointer-events-none ${mutedCls}`} />
            )}
            <button
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-center py-3 border-b-2 -mb-px transition-all duration-200
                ${activeTab === tab.id
                  ? `${accentCls} border-current opacity-100`
                  : `${mutedCls} border-transparent opacity-45 hover:opacity-75`}`}
            >
              {tab.label}
            </button>
          </Fragment>
        ))}
      </div>

      {/* ── TAB: PLAN PONAVLJANJA ── */}
      {activeTab === "ponavljanje" && (
      loadingReview ? (
        <p className={`text-sm ${mutedCls}`}>…</p>
      ) : reviewPlans.length > 0 && !reviewWizardOpen ? (
        // ── Lista SVIH planova ponavljanja (aktivni + historija) - wizard od
        // koraka 1 se prikazuje SAMO prvi put (dok nijedan plan ne postoji);
        // poslije se uvijek prikazuje ova lista. "+ Generiši novi plan" na
        // vrhu uvijek otvara wizard za DODATNI plan (moguće je više aktivnih
        // istovremeno, samo ne dva na istoj metodi - vidi hifzPlansService.js). ──
        <div className="space-y-4">
          <button onClick={startNewReviewPlan} className={`${btnCls} rounded-2xl px-4 py-2.5 text-sm font-semibold`}>
            {t.generateNewPlan}
          </button>

          <p className={`text-xs font-semibold uppercase tracking-wider ${mutedCls}`}>{t.plansListTitle}</p>

          <div className="space-y-3">
            {reviewPlans.map((plan) => {
              const stats = planStatsById[plan.id]
              const busy = planActionBusy === plan.id
              const metodaNaziv = t.methods.find(m => m.id === plan.method)?.naziv || plan.method
              const opisOpsega =
                plan.scope_type === "hafiz" ? t.scopeHafizSummary
                : plan.scope_type === "dzuzovi" ? t.scopeDzuzoviSummary(
                    (plan.scope_data?.odabraniDzuzovi || []).length, ukupnoStrZaPlan(plan))
                : plan.scope_type === "sure" ? t.scopeSureSummary(
                    (plan.scope_data?.odabraneSure || []).length, ukupnoStrZaPlan(plan))
                : plan.scope_type === "stranice" ? t.scopeStraniceSummary((plan.scope_data?.odabraneStranice || []).length)
                : plan.scope_type === "ajeti" ? t.scopeAjetiSummary((plan.scope_data?.odabraniAjeti || []).length)
                : plan.scope_type === "rucno" ? t.scopeRucnoSummary((plan.scope_data?.rucnoPages || []).length)
                : ""

              return (
                <div key={plan.id} className={`rounded-2xl border ${border} ${cardCls} p-4 space-y-3`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${plan.active ? btnCls : `border ${border} ${mutedCls}`} flex items-center justify-center font-bold shrink-0 ${plan.active ? "text-white" : ""}`}>
                        {metodaNaziv[0]}
                      </div>
                      <div className="min-w-0">
                        <div className={`font-semibold text-sm ${textCls}`}>{metodaNaziv}</div>
                        <div className={`text-xs ${mutedCls}`}>{opisOpsega}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0
                      ${plan.active ? "bg-emerald-500/20 text-emerald-500" : `border ${border} ${mutedCls}`}`}>
                      {plan.active ? t.statusActive : t.statusInactive}
                    </span>
                  </div>

                  {/* Statistike */}
                  {/* Intervalne metode (fibonacci/tri_dana/sedam_dana/srs/novo_staro) bez
                      zadanog tempa seeduju CIJELI opseg kao jedan blok koji se ponavlja po
                      intervalima metode, ne svaki dan - "Dnevno: X str/dan" bi tu bilo
                      pogrešno čitati kao dnevnu obavezu, pa se za taj slučaj prikazuje
                      "Opseg bloka" (vidi planStats.js: trajanjeDana=null znači "sve odjednom"). */}
                  {(() => {
                    const blokOdjednom = ["fibonacci", "tri_dana", "sedam_dana", "srs", "novo_staro"]
                      .includes(stats?.metoda) && !stats?.trajanjeDana
                    // "ajeti" plan - ista brojka, ali jedinica je ajet, ne
                    // stranica (vidi ukupnoStrZaPlan: za "ajeti" broji ajete).
                    const jeAjeti = plan.scope_type === "ajeti"
                    return (
                  <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs`}>
                    <div><div className={mutedCls}>{blokOdjednom ? t.statBlockSize : t.statDaily}</div><div className={textCls}>{stats?.dnevnaKolicina ? (jeAjeti ? (blokOdjednom ? t.ajetiAllAtOnce(stats.dnevnaKolicina) : t.ajetiPerDay(stats.dnevnaKolicina)) : (blokOdjednom ? t.pagesAllAtOnce(stats.dnevnaKolicina) : t.pagesPerDay(stats.dnevnaKolicina))) : t.unknownValue}</div></div>
                    <div><div className={mutedCls}>{t.statDuration}</div><div className={textCls}>{stats?.trajanjeDana ? t.daysUnit(stats.trajanjeDana) : t.unknownValue}</div></div>
                    <div><div className={mutedCls}>{t.statStart}</div><div className={textCls}>{stats?.startDatum || t.unknownValue}</div></div>
                    <div><div className={mutedCls}>{t.statEnd}</div><div className={textCls}>{stats?.krajDatum || t.unknownValue}</div></div>
                    <div><div className={mutedCls}>{t.statGoal}</div><div className={textCls}>{stats?.ciljStr ? (jeAjeti ? t.ajetiUnit(stats.ciljStr) : t.pagesUnit(stats.ciljStr)) : t.unknownValue}</div></div>
                    <div><div className={mutedCls}>{t.statDone}</div><div className={textCls}>{stats?.ponovljenoDo != null ? t.cyclesUnit(stats.ponovljenoDo) : t.unknownValue}</div></div>
                    <div><div className={mutedCls}>{t.statNext}</div><div className={textCls}>{stats?.naReduOpis?.pages?.length ? stats.naReduOpis.pages.slice(0, 3).join(", ") : t.unknownValue}</div></div>
                    <div><div className={mutedCls}>{t.statDays}</div><div className={textCls}>{stats ? (stats.daniPonavljanjaBroj >= 7 ? t.everyDay : t.daysUnit(stats.daniPonavljanjaBroj)) : t.unknownValue}</div></div>
                  </div>
                    )
                  })()}

                  {/* Akcije */}
                  {editingPlanId !== plan.id && (
                    <div className="flex gap-2 flex-wrap">
                      <button disabled={busy} onClick={() => promijeniAktivnost(plan)}
                        className={`${cardCls} border ${border} ${mutedCls} rounded-lg px-3 py-1.5 text-xs disabled:opacity-50`}>
                        {plan.active ? t.btnDeactivate : t.btnActivate}
                      </button>
                      {plan.active && (
                        <button disabled={busy} onClick={() => setConfirmResetId(plan.id)}
                          className={`${cardCls} border ${border} ${mutedCls} rounded-lg px-3 py-1.5 text-xs disabled:opacity-50`}>
                          {t.btnReset}
                        </button>
                      )}
                      <button disabled={busy} onClick={() => otvoriUredjivanje(plan)}
                        className={`${cardCls} border ${border} ${mutedCls} rounded-lg px-3 py-1.5 text-xs disabled:opacity-50`}>
                        {t.btnEdit}
                      </button>
                      <button disabled={busy} onClick={() => setConfirmDeleteId(plan.id)}
                        className="border border-red-500/30 text-red-500 rounded-lg px-3 py-1.5 text-xs disabled:opacity-50">
                        {t.btnDelete}
                      </button>
                      <button onClick={() => setExpandedForecastId(expandedForecastId === plan.id ? null : plan.id)}
                        className={`text-xs underline underline-offset-2 ${accentCls} ml-auto`}>
                        {t.toggleForecast}
                      </button>
                    </div>
                  )}

                  {/* Potvrda reset */}
                  {confirmResetId === plan.id && (
                    <div className={`rounded-xl border ${border} p-3 space-y-2`}>
                      <p className={`text-xs ${textCls}`}>{t.confirmResetText}</p>
                      <div className="flex gap-2">
                        <button disabled={busy} onClick={() => setConfirmResetId(null)} className={`text-xs ${mutedCls} px-3 py-1.5 rounded-lg border ${border}`}>{t.editCancel}</button>
                        <button disabled={busy} onClick={() => resetujPlan(plan)} className={`${btnCls} text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50`}>{t.confirmResetYes}</button>
                      </div>
                    </div>
                  )}

                  {/* Potvrda brisanja */}
                  {confirmDeleteId === plan.id && (
                    <div className={`rounded-xl border border-red-500/30 p-3 space-y-2`}>
                      <p className={`text-xs ${textCls}`}>{t.confirmDeleteText}</p>
                      <div className="flex gap-2">
                        <button disabled={busy} onClick={() => setConfirmDeleteId(null)} className={`text-xs ${mutedCls} px-3 py-1.5 rounded-lg border ${border}`}>{t.confirmDeleteNo}</button>
                        <button disabled={busy} onClick={() => obrisiPlan(plan)} className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50">{t.confirmDeleteYes}</button>
                      </div>
                    </div>
                  )}

                  {/* Uredi: dani + količina */}
                  {editingPlanId === plan.id && (
                    <div className={`rounded-xl border ${border} p-3 space-y-3`}>
                      <div>
                        <p className={`text-xs mb-1.5 ${mutedCls}`}>{t.editDaniLabel}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(t.raspDani).map(([key, label]) => {
                            const active = editSlobodniDani.includes(key)
                            return (
                              <button key={key}
                                onClick={() => setEditSlobodniDani(v => active ? v.filter(d => d !== key) : [...v, key])}
                                className={`px-2.5 py-1 rounded-lg border text-xs
                                  ${active ? `${btnCls} border-transparent font-semibold` : `border ${border} ${textCls}`}`}>
                                {label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      {mozeUreditiKolicinu(plan) ? (
                        <div>
                          <p className={`text-xs mb-1 ${mutedCls}`}>{t.editKolicinaLabel}</p>
                          <input type="number" min={1} value={editKolicina} onChange={e => setEditKolicina(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} outline-none`} />
                        </div>
                      ) : (
                        <p className={`text-xs italic ${mutedCls}`}>{t.editKolicinaFixed}</p>
                      )}
                      <div className="flex gap-2">
                        <button disabled={busy} onClick={() => setEditingPlanId(null)} className={`text-xs ${mutedCls} px-3 py-1.5 rounded-lg border ${border}`}>{t.editCancel}</button>
                        <button disabled={busy} onClick={() => sacuvajUredjivanje(plan)} className={`${btnCls} text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50`}>{t.editSave}</button>
                      </div>
                    </div>
                  )}

                  {expandedForecastId === plan.id && (
                    <div className={`pt-3 border-t ${border}`}>
                      <MonthlyReviewForecast plan={plan} userId={user?.id} theme={theme} lang={lang} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Korak indikator */}
          <div className="flex items-center gap-2 mb-2">
            {t.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${korak > i + 1 ? btnCls : korak === i + 1 ? btnCls + " ring-2 ring-offset-1 ring-offset-transparent" : `border ${border} ${mutedCls}`}`}>
                  {korak > i + 1 ? "✓" : i + 1}
                </div>
                <span className={`text-xs font-medium ${korak === i + 1 ? textCls : mutedCls}`}>{s}</span>
                {i < t.steps.length - 1 && <div className={`w-8 h-px ${border} border-t`} />}
              </div>
            ))}
          </div>

          {/* ── KORAK 1: ŠTA ZNAŠ ── */}
          {korak === 1 && (
            <div className="space-y-4">
              <h2 className={`text-base font-semibold ${textCls}`}>{t.k1Title}</h2>

              {/* 3.1 Auto-detekcija iz Trackera - prije nego što se išta
                  pita, prikaži šta VEĆ znamo i traži samo potvrdu. Ako
                  korisnik kaže "nije tačno", otvara se puni ručni izbor
                  ispod (dugme "Nije tačno" samo sakrije ovu karticu). */}
              {!nacin && detectedPageCount > 0 && !autoDetectDismissed ? (
                <div className={`rounded-2xl border ${border} ${cardCls} p-4 space-y-3`}>
                  <p className={`text-sm font-semibold ${textCls}`}>{t.autoDetectTitle}</p>
                  <p className={`text-sm ${mutedCls}`}>
                    {detectedPageCount >= 604 ? t.autoDetectBodyAll : t.autoDetectBody(detectedPageCount)}
                  </p>
                  <p className={`text-xs italic ${mutedCls}`}>{t.autoDetectHint}</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setNacin(detectedPageCount >= 604 ? "hafiz" : "rucno")}
                      className={`${btnCls} rounded-xl px-4 py-2 text-sm font-semibold`}
                    >
                      {t.autoDetectYes}
                    </button>
                    <button
                      onClick={() => setAutoDetectDismissed(true)}
                      className={`${cardCls} border ${border} ${mutedCls} rounded-xl px-4 py-2 text-sm`}
                    >
                      {t.autoDetectNo}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* 5 opcija - ručni izbor, uvijek dostupan (ne samo kao
                  "Nije tačno" ishod): ako korisnica nema ništa u Trackeru,
                  ili je odbila auto-detekciju, ovo je ono što vidi. Isto
                  ostaje vidljivo i NAKON što je nacin postavljen (npr. na
                  "hafiz") - korisnica u svakom trenutku može kliknuti drugu
                  karticu i suziti opseg na nešto konkretno. */}
              {(nacin || detectedPageCount === 0 || autoDetectDismissed) && (
              <div className="grid grid-cols-2 gap-3">

                {/* Džuzovi */}
                <button
                  onClick={() => setNacin(nacin === "dzuzovi" ? null : "dzuzovi")}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200
                    ${nacin === "dzuzovi" ? `${btnCls} border-transparent` : `${cardCls} border-${border} hover:border-opacity-50`}`}
                >
                  <div className="text-xl mb-1">📖</div>
                  <div className={`text-sm font-semibold ${nacin === "dzuzovi" ? "text-white" : textCls}`}>{t.optJuzTitle}</div>
                  <div className={`text-xs mt-0.5 ${nacin === "dzuzovi" ? "text-white/70" : mutedCls}`}>{t.optJuzDesc}</div>
                </button>

                {/* Sure */}
                <button
                  onClick={() => setNacin(nacin === "sure" ? null : "sure")}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200
                    ${nacin === "sure" ? `${btnCls} border-transparent` : `${cardCls} border ${border} hover:opacity-80`}`}
                >
                  <div className="text-xl mb-1">🕌</div>
                  <div className={`text-sm font-semibold ${nacin === "sure" ? "text-white" : textCls}`}>{t.optSureTitle}</div>
                  <div className={`text-xs mt-0.5 ${nacin === "sure" ? "text-white/70" : mutedCls}`}>{t.optSureDesc}</div>
                </button>

                {/* Stranice */}
                <button
                  onClick={() => setNacin(nacin === "stranice" ? null : "stranice")}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200
                    ${nacin === "stranice" ? `${btnCls} border-transparent` : `${cardCls} border ${border} hover:opacity-80`}`}
                >
                  <div className="text-xl mb-1">📄</div>
                  <div className={`text-sm font-semibold ${nacin === "stranice" ? "text-white" : textCls}`}>{t.optStraniceTitle}</div>
                  <div className={`text-xs mt-0.5 ${nacin === "stranice" ? "text-white/70" : mutedCls}`}>{t.optStraniceDesc}</div>
                </button>

                {/* Ajeti */}
                <button
                  onClick={() => setNacin(nacin === "ajeti" ? null : "ajeti")}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200
                    ${nacin === "ajeti" ? `${btnCls} border-transparent` : `${cardCls} border ${border} hover:opacity-80`}`}
                >
                  <div className="text-xl mb-1">🔠</div>
                  <div className={`text-sm font-semibold ${nacin === "ajeti" ? "text-white" : textCls}`}>{t.optAjetiTitle}</div>
                  <div className={`text-xs mt-0.5 ${nacin === "ajeti" ? "text-white/70" : mutedCls}`}>{t.optAjetiDesc}</div>
                </button>

                {/* Hafiz */}
                <button
                  onClick={() => setNacin(nacin === "hafiz" ? null : "hafiz")}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200
                    ${nacin === "hafiz" ? `${btnCls} border-transparent` : `${cardCls} border ${border} hover:opacity-80`}`}
                >
                  <div className="text-xl mb-1">🌟</div>
                  <div className={`text-sm font-semibold ${nacin === "hafiz" ? "text-white" : textCls}`}>{t.optHafizTitle}</div>
                  <div className={`text-xs mt-0.5 ${nacin === "hafiz" ? "text-white/70" : mutedCls}`}>{t.optHafizDesc}</div>
                </button>

                {/* Ručno */}
                <button
                  onClick={() => navigate("/korisnik/hifz/planer?fromReviewSetup=1")}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 ${cardCls} border ${border} hover:opacity-80`}
                >
                  <div className="text-xl mb-1">✏️</div>
                  <div className={`text-sm font-semibold ${textCls}`}>{t.optRucnoTitle}</div>
                  <div className={`text-xs mt-0.5 ${mutedCls}`}>{t.optRucnoDesc}</div>
                </button>
              </div>
              )}

              {/* ── DŽUZOVI ekspanzija ── */}
              {nacin === "dzuzovi" && (
                <div className={`rounded-2xl border ${border} ${cardCls} p-4 space-y-4`}>

                  {/* Brzi unos */}
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${mutedCls}`}>{t.quickInput}</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1} max={30}
                        value={brziDzuz}
                        onChange={e => setBrziDzuz(e.target.value)}
                        placeholder={t.quickInputPh}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} placeholder:${mutedCls} outline-none`}
                      />
                      <button
                        onClick={primijeniBreziDzuz}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold ${btnCls}`}
                      >
                        {t.apply}
                      </button>
                    </div>
                  </div>

                  {/* Grid džuzova */}
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${mutedCls}`}>{t.orManual}</p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(id => (
                        <button
                          key={id}
                          onClick={() => toggleDzuz(id)}
                          className={`aspect-square rounded-xl text-xs font-bold transition-all duration-150
                            ${odabraniDzuzovi.includes(id)
                              ? btnCls
                              : `border ${border} ${mutedCls} hover:opacity-80`}`}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sažetak */}
                  {odabraniDzuzovi.length > 0 && (
                    <div className={`text-xs ${accentCls} font-medium`}>
                      {t.selectedJuz(odabraniDzuzovi.length, ukupnoStr)}
                    </div>
                  )}
                </div>
              )}

              {/* ── SURE ekspanzija ── */}
              {nacin === "sure" && (
                <div className={`rounded-2xl border ${border} ${cardCls} p-4 space-y-3`}>
                  <input
                    type="text"
                    value={suraPretrazivanje}
                    onChange={e => setSuraPretrazivanje(e.target.value)}
                    placeholder={t.searchSuraPh}
                    className={`w-full px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} placeholder:opacity-40 outline-none`}
                  />

                  <div className="max-h-52 overflow-y-auto space-y-1 pr-1 [&::-webkit-scrollbar]:hidden">
                    {filtrovaneSure.map(sura => (
                      <button
                        key={sura.id}
                        onClick={() => toggleSura(sura.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150
                          ${odabraneSure.includes(sura.id)
                            ? btnCls
                            : `border ${border} ${mutedCls} hover:opacity-80`}`}
                      >
                        <span className="font-medium">
                          {sura.id}. {sura.name}
                        </span>
                        <span className={`text-xs ${odabraneSure.includes(sura.id) ? "text-white/70" : mutedCls}`}>
                          {t.pageAbbr} {sura.startPage}–{sura.endPage}
                        </span>
                      </button>
                    ))}
                  </div>

                  {odabraneSure.length > 0 && (
                    <div className={`text-xs ${accentCls} font-medium`}>
                      {t.selectedSure(odabraneSure.length, ukupnoStr)}
                    </div>
                  )}
                </div>
              )}

              {/* ── STRANICE ekspanzija ── konkretne, pojedinačne stranice -
                  za slučaj kad korisnica ne želi ponavljati sve što zna po
                  cijelim džuzevima/surama, nego samo određene stranice. */}
              {nacin === "stranice" && (
                <div className={`rounded-2xl border ${border} ${cardCls} p-4 space-y-4`}>

                  {/* Brzi unos raspona */}
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${mutedCls}`}>{t.quickInput}</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={brzaStranica}
                        onChange={e => setBrzaStranica(e.target.value)}
                        placeholder={t.quickInputStranicePh}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} placeholder:${mutedCls} outline-none`}
                      />
                      <button
                        onClick={primijeniBrzuStranicu}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold ${btnCls}`}
                      >
                        {t.apply}
                      </button>
                    </div>
                  </div>

                  {/* Grid stranica - skrolabilan, 604 chipa */}
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${mutedCls}`}>{t.orManual}</p>
                    <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-52 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
                      {Array.from({ length: 604 }, (_, i) => i + 1).map(id => (
                        <button
                          key={id}
                          onClick={() => toggleStranica(id)}
                          className={`aspect-square rounded-lg text-[10px] font-bold transition-all duration-150
                            ${odabraneStranice.includes(id)
                              ? btnCls
                              : `border ${border} ${mutedCls} hover:opacity-80`}`}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sažetak */}
                  {odabraneStranice.length > 0 && (
                    <div className={`text-xs ${accentCls} font-medium`}>
                      {t.selectedStranice(odabraneStranice.length)}
                    </div>
                  )}
                </div>
              )}

              {/* ── AJETI ekspanzija ── unos tekstom, isti fazon kao ručni
                  unos bloka na Murajaa stranici. Dostupno samo za intervalne
                  metode - Motor A radi po cijelim stranicama. */}
              {nacin === "ajeti" && (
                <div className={`rounded-2xl border ${border} ${cardCls} p-4 space-y-4`}>
                  <p className={`text-xs italic ${mutedCls}`}>{t.ajetiInputHint}</p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <textarea
                      value={unosAjeta}
                      onChange={e => setUnosAjeta(e.target.value)}
                      placeholder={t.ajetiInputPh}
                      rows={2}
                      className={`flex-1 px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} placeholder:${mutedCls} outline-none resize-none`}
                    />
                    <button
                      onClick={primijeniUnosAjeta}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold ${btnCls} self-start`}
                    >
                      {t.apply}
                    </button>
                  </div>

                  {ajetiUnosGreska && (
                    <div className="text-xs text-amber-500 font-medium">{ajetiUnosGreska}</div>
                  )}

                  {/* Odabrani ajeti - chip lista, klik uklanja */}
                  {odabraniAjeti.length > 0 && (
                    <div className="space-y-2">
                      <div className={`text-xs ${accentCls} font-medium`}>
                        {t.selectedAjeti(odabraniAjeti.length)}
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
                        {odabraniAjeti.map(key => (
                          <button
                            key={key}
                            onClick={() => toggleAjet(key)}
                            title={t.removeAjet}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${btnCls} border-transparent hover:opacity-80`}
                          >
                            {key} ✕
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hafiz poruka */}
              {nacin === "hafiz" && (
                <div className={`rounded-2xl border ${border} p-4 ${cardCls} space-y-2`}>
                  <p className={`text-sm ${textCls}`}>
                    {t.hafizPre}<span className="font-bold">{t.hafizBold}</span>{t.hafizPost}
                  </p>
                  <p className={`text-xs italic ${mutedCls}`}>{t.hafizNarrowHint}</p>
                </div>
              )}

              {/* ── TEMPO PONAVLJANJA (svaki opseg - hafiz/dzuzevi/sure/rucno) ──
                  Bira se jedinica (džuzevi/sure/stranice) i način unosa
                  (broj po danu ili vrijeme za CIJELI ODABRANI OPSEG); iz toga
                  se računa dnevna količina u stranicama koju koriste metode
                  ponavljanja koje se prilagođavaju bilo kojem tempu, i
                  filtrira se lista metoda u koraku 2. Za dzuzevi/sure/
                  stranice/rucno prikazuje se tek kad opseg nije prazan
                  (ukupnoStr > 0). ── */}
              {(nacin === "hafiz" || ((nacin === "dzuzovi" || nacin === "sure" || nacin === "stranice" || nacin === "rucno") && ukupnoStr > 0)) && (
                <div className={`rounded-2xl border ${border} ${cardCls} p-4 space-y-4`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${mutedCls}`}>{t.tempoTitle}</p>
                    <p className={`text-xs mt-1 ${mutedCls}`}>{t.tempoHint}</p>
                  </div>

                  {/* Jedinica */}
                  <div>
                    <p className={`text-xs mb-2 ${mutedCls}`}>{t.tempoUnitLabel}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {TEMPO_UNITS.map(u => (
                        <button
                          key={u}
                          onClick={() => setTempoUnit(u)}
                          className={`py-2 rounded-xl text-xs font-semibold border transition-all duration-150
                            ${tempoUnit === u ? `${btnCls} border-transparent` : `border ${border} ${mutedCls} hover:opacity-80`}`}
                        >
                          {t.tempoUnitNames[u]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tempoUnit && (
                    <>
                      {/* Način unosa */}
                      <div>
                        <p className={`text-xs mb-2 ${mutedCls}`}>{t.tempoModeLabel}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setTempoMode("broj")}
                            className={`py-2 rounded-xl text-xs font-semibold border transition-all duration-150
                              ${tempoMode === "broj" ? `${btnCls} border-transparent` : `border ${border} ${mutedCls} hover:opacity-80`}`}
                          >
                            {t.tempoModeBroj}
                          </button>
                          <button
                            onClick={() => setTempoMode("vrijeme")}
                            className={`py-2 rounded-xl text-xs font-semibold border transition-all duration-150
                              ${tempoMode === "vrijeme" ? `${btnCls} border-transparent` : `border ${border} ${mutedCls} hover:opacity-80`}`}
                          >
                            {t.tempoModeVrijeme}
                          </button>
                        </div>
                      </div>

                      {/* Unos količine */}
                      {tempoMode === "broj" ? (
                        <div>
                          <p className={`text-xs mb-1 ${mutedCls}`}>{t.tempoQtyLabelBroj(t.tempoUnitNames[tempoUnit])}</p>
                          <input
                            type="number" min={1}
                            value={tempoQuantity}
                            placeholder={String(suggestedDailyQty(tempoUnit, ukupnoStr))}
                            onChange={e => setTempoQuantity(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} outline-none`}
                          />
                        </div>
                      ) : (
                        <div>
                          <p className={`text-xs mb-1 ${mutedCls}`}>{t.tempoQtyLabelVrijeme}</p>
                          <div className="flex gap-2">
                            <input
                              type="number" min={1}
                              value={tempoQuantity}
                              placeholder="30"
                              onChange={e => setTempoQuantity(e.target.value)}
                              className={`flex-1 px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} outline-none`}
                            />
                            <select
                              value={tempoVrijemeJedinica}
                              onChange={e => setTempoVrijemeJedinica(e.target.value)}
                              className={`px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} outline-none`}
                            >
                              <option value="dana">{t.tempoDana}</option>
                              <option value="sedmica">{t.tempoSedmica}</option>
                              <option value="mjeseci">{t.tempoMjeseci}</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {tempoResult && (
                        <p className={`text-xs font-medium ${accentCls}`}>
                          {t.tempoSummary(tempoResult.dailyQtyPages, tempoResult.totalDays)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── TEMPO za "ajeti" - jednostavniji box, bez izbora jedinice
                  (ajet je već atomska jedinica). Isti tempoMode/tempoQuantity
                  state kao gornji box, samo se rezultat računa preko
                  tempoResultAjeti (vidi izračun gore), ne computeTempo(). ── */}
              {nacin === "ajeti" && ukupnoAjeta > 0 && (
                <div className={`rounded-2xl border ${border} ${cardCls} p-4 space-y-4`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${mutedCls}`}>{t.tempoAjetiTitle}</p>
                    <p className={`text-xs mt-1 ${mutedCls}`}>{t.tempoAjetiHint}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTempoMode("broj")}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all duration-150
                        ${tempoMode === "broj" ? `${btnCls} border-transparent` : `border ${border} ${mutedCls} hover:opacity-80`}`}
                    >
                      {t.tempoModeBroj}
                    </button>
                    <button
                      onClick={() => setTempoMode("vrijeme")}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all duration-150
                        ${tempoMode === "vrijeme" ? `${btnCls} border-transparent` : `border ${border} ${mutedCls} hover:opacity-80`}`}
                    >
                      {t.tempoModeVrijeme}
                    </button>
                  </div>

                  {tempoMode === "broj" ? (
                    <div>
                      <p className={`text-xs mb-1 ${mutedCls}`}>{t.tempoAjetiQtyLabelBroj}</p>
                      <input
                        type="number" min={1}
                        value={tempoQuantity}
                        placeholder="5"
                        onChange={e => setTempoQuantity(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} outline-none`}
                      />
                    </div>
                  ) : (
                    <div>
                      <p className={`text-xs mb-1 ${mutedCls}`}>{t.tempoAjetiQtyLabelVrijeme}</p>
                      <div className="flex gap-2">
                        <input
                          type="number" min={1}
                          value={tempoQuantity}
                          placeholder="30"
                          onChange={e => setTempoQuantity(e.target.value)}
                          className={`flex-1 px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} outline-none`}
                        />
                        <select
                          value={tempoVrijemeJedinica}
                          onChange={e => setTempoVrijemeJedinica(e.target.value)}
                          className={`px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} outline-none`}
                        >
                          <option value="dana">{t.tempoDana}</option>
                          <option value="sedmica">{t.tempoSedmica}</option>
                          <option value="mjeseci">{t.tempoMjeseci}</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {tempoResultAjeti && (
                    <p className={`text-xs font-medium ${accentCls}`}>
                      {t.tempoAjetiSummary(tempoResultAjeti.dailyQtyPages, tempoResultAjeti.totalDays)}
                    </p>
                  )}
                </div>
              )}

              {/* Dugme dalje - prije prelaska na korak 2 pita potvrdu da je
                  korisnik zaista označio sve što već zna. */}
              {((nacin === "hafiz" && tempoResult) || (nacin === "dzuzovi" && odabraniDzuzovi.length > 0) || (nacin === "sure" && odabraneSure.length > 0) || (nacin === "stranice" && odabraneStranice.length > 0) || (nacin === "ajeti" && odabraniAjeti.length > 0)) && (
                <button
                  onClick={() => setConfirmNextOpen(true)}
                  className={`w-full py-3 rounded-2xl font-semibold text-sm ${btnCls} transition-all`}
                >
                  {t.nextMethod}
                </button>
              )}
            </div>
          )}

          {/* ── KORAK 2: METODA ── */}
          {korak === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-semibold ${textCls}`}>{t.k2Title}</h2>
                <button onClick={() => setKorak(1)} className={`text-xs ${mutedCls} hover:opacity-70`}>{t.back}</button>
              </div>

              <p className={`text-xs ${mutedCls}`}>
                {t.k2DescPre}<span className="font-semibold">{nacin === "ajeti" ? t.k2DescBoldAjeti(ukupnoAjeta) : t.k2DescBold(ukupnoStr)}</span>{t.k2DescPost}
              </p>

              {/* Tempo ponavljanja za "rucno" - korak 1 se ovdje preskače
                  (dolazi direktno sa Hifz Trackera), pa se tempo nudi ovdje. */}
              {nacin === "rucno" && ukupnoStr > 0 && (
                <div className={`rounded-2xl border ${border} ${cardCls} p-4 space-y-3`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${mutedCls}`}>{t.tempoTitle}</p>
                    <p className={`text-xs mt-1 ${mutedCls}`}>{t.tempoHint}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPO_UNITS.map(u => (
                      <button
                        key={u}
                        onClick={() => setTempoUnit(u)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all duration-150
                          ${tempoUnit === u ? `${btnCls} border-transparent` : `border ${border} ${mutedCls} hover:opacity-80`}`}
                      >
                        {t.tempoUnitNames[u]}
                      </button>
                    ))}
                  </div>
                  {tempoUnit && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setTempoMode("broj")}
                          className={`py-2 rounded-xl text-xs font-semibold border transition-all duration-150
                            ${tempoMode === "broj" ? `${btnCls} border-transparent` : `border ${border} ${mutedCls} hover:opacity-80`}`}
                        >
                          {t.tempoModeBroj}
                        </button>
                        <button
                          onClick={() => setTempoMode("vrijeme")}
                          className={`py-2 rounded-xl text-xs font-semibold border transition-all duration-150
                            ${tempoMode === "vrijeme" ? `${btnCls} border-transparent` : `border ${border} ${mutedCls} hover:opacity-80`}`}
                        >
                          {t.tempoModeVrijeme}
                        </button>
                      </div>
                      {tempoMode === "broj" ? (
                        <input
                          type="number" min={1}
                          value={tempoQuantity}
                          placeholder={String(suggestedDailyQty(tempoUnit, ukupnoStr))}
                          onChange={e => setTempoQuantity(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} outline-none`}
                        />
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="number" min={1}
                            value={tempoQuantity}
                            placeholder="30"
                            onChange={e => setTempoQuantity(e.target.value)}
                            className={`flex-1 px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} outline-none`}
                          />
                          <select
                            value={tempoVrijemeJedinica}
                            onChange={e => setTempoVrijemeJedinica(e.target.value)}
                            className={`px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} outline-none`}
                          >
                            <option value="dana">{t.tempoDana}</option>
                            <option value="sedmica">{t.tempoSedmica}</option>
                            <option value="mjeseci">{t.tempoMjeseci}</option>
                          </select>
                        </div>
                      )}
                      {tempoResult && (
                        <p className={`text-xs font-medium ${accentCls}`}>
                          {t.tempoSummary(tempoResult.dailyQtyPages, tempoResult.totalDays)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {t.methods
                  .filter(m => showAllMethods || !hiddenMethodIds.includes(m.id))
                  .map(m => {
                  const isSelected = odabranaMetoda === m.id
                  const isExpanded = expandedMethod === m.id
                  const info = REVIEW_METHOD_INFO[lang]?.[m.id] || REVIEW_METHOD_INFO.bs[m.id]
                  const isFixedPace = allowedMethodIds && FIXED_PACE_METHOD_IDS.includes(m.id)
                  const hasPileupRisk = velikOpseg && PILEUP_RISK_METHOD_IDS.includes(m.id)
                  const isOutsideTempo = allowedMethodIds && !allowedMethodIds.includes(m.id)
                  return (
                    <div
                      key={m.id}
                      className={`w-full rounded-2xl border transition-all duration-150 overflow-hidden
                        ${isSelected ? `${btnCls} border-transparent` : `${cardCls} border ${border}`}
                        ${(isOutsideTempo || hasPileupRisk) ? "opacity-50" : ""}`}
                    >
                      <button
                        onClick={() => setOdabranaMetoda(m.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left ${isSelected ? "" : "hover:opacity-80"}`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
                          ${isSelected ? "border-white bg-white" : `border-current ${mutedCls}`}`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-current" style={{ background: "var(--btn-color, #4f46e5)" }} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-semibold ${isSelected ? "text-white" : textCls}`}>{m.naziv}</div>
                          <div className={`text-xs mt-0.5 ${isSelected ? "text-white/70" : mutedCls}`}>{m.opis}</div>
                          {isFixedPace && (
                            <div className={`text-xs mt-1 italic ${isSelected ? "text-white/70" : mutedCls}`}>{t.methodFixedPaceNote}</div>
                          )}
                          {hasPileupRisk && (
                            <div className={`text-xs mt-1 italic ${isSelected ? "text-white/90" : "text-amber-500"}`}>{t.methodPileupWarning}</div>
                          )}
                        </div>
                      </button>

                      {/* Pročitaj više - toggle, odvojen klik od odabira metode */}
                      <div className="px-4 pb-3 -mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedMethod(isExpanded ? null : m.id) }}
                          className={`text-xs font-semibold underline underline-offset-2 ${isSelected ? "text-white/90" : accentCls}`}
                        >
                          {isExpanded ? t.readLess : t.readMore}
                        </button>

                        {isExpanded && info && (
                          <div className={`mt-2 pt-2 border-t ${isSelected ? "border-white/20" : border} space-y-2`}>
                            <p className={`text-xs leading-relaxed ${isSelected ? "text-white/90" : textCls}`}>
                              {info.opis}
                            </p>
                            <a
                              href={`/blog/${REVIEW_METHODS_BLOG_SLUG}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-block text-xs font-semibold underline underline-offset-2 ${isSelected ? "text-white" : accentCls}`}
                            >
                              {t.readInDetail}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Napomena + toggle za sakrivene metode - sakrivaju se metode
                  izvan odabranog tempa I metode s rizikom gomilanja
                  (fibonacci/tri_dana/sedam_dana/srs) za veći opseg (>60 str,
                  ~3 džuza); ništa se ne blokira, samo je podrazumijevano
                  sklonjeno s liste dok korisnica sama ne zatraži da ih vidi. */}
              {hiddenMethodIds.length > 0 && (
                <button
                  onClick={() => setShowAllMethods(v => !v)}
                  className={`text-xs underline underline-offset-2 ${mutedCls}`}
                >
                  {showAllMethods ? t.hideFilteredMethods : t.showAllMethods(hiddenMethodIds.length)}
                </button>
              )}

              {/* "Po hafizovom nivou" nije samostalna metoda - traži dodatni
                  izbor nivoa prije nego što se plan uopšte može generisati. */}
              {odabranaMetoda === "nivo" && (
                <div className={`rounded-2xl border ${border} ${cardCls} p-4 space-y-2`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${mutedCls}`}>{t.nivoPickTitle}</p>
                  <div className="space-y-2">
                    {t.nivoLevels.map(nv => (
                      <button
                        key={nv.id}
                        onClick={() => setNivoLevel(nv.id)}
                        className={`w-full flex items-start gap-3 px-4 py-2.5 rounded-xl border text-left transition-all duration-150
                          ${nivoLevel === nv.id ? `${btnCls} border-transparent` : `border ${border} hover:opacity-80`}`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center
                          ${nivoLevel === nv.id ? "border-white bg-white" : `border-current ${mutedCls}`}`}>
                          {nivoLevel === nv.id && <div className="w-1.5 h-1.5 rounded-full bg-current" style={{ background: "var(--btn-color, #4f46e5)" }} />}
                        </div>
                        <div>
                          <div className={`text-sm font-semibold ${nivoLevel === nv.id ? "text-white" : textCls}`}>{nv.naziv}</div>
                          <div className={`text-xs mt-0.5 ${nivoLevel === nv.id ? "text-white/70" : mutedCls}`}>{nv.opis}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {odabranaMetoda && (odabranaMetoda !== "nivo" || nivoLevel) && (
                <button
                  onClick={() => setKorak(3)}
                  className={`w-full py-3 rounded-2xl font-semibold text-sm ${btnCls}`}
                >
                  {t.generatePlan}
                </button>
              )}
            </div>
          )}

          {/* ── KORAK 3: REDOSLIJED I RASPORED ── */}
          {korak === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-semibold ${textCls}`}>{t.raspTitle}</h2>
                <button onClick={() => setKorak(2)} className={`text-xs ${mutedCls} hover:opacity-70`}>{t.back}</button>
              </div>

              <div className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wider ${mutedCls}`}>{t.raspRedoslijedLabel}</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(t.raspRedoslijedOpts).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setRedoslijed(key)}
                      className={`px-3 py-2.5 rounded-xl border text-left text-sm transition-all duration-150
                        ${redoslijed === key ? `${btnCls} border-transparent font-semibold` : `border ${border} ${textCls} hover:opacity-80`}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wider ${mutedCls}`}>{t.raspPodjelaLabel}</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(t.raspPodjelaOpts).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setPodjelaDana(Number(key))}
                      className={`px-3 py-2.5 rounded-xl border text-center text-sm transition-all duration-150
                        ${podjelaDana === Number(key) ? `${btnCls} border-transparent font-semibold` : `border ${border} ${textCls} hover:opacity-80`}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wider ${mutedCls}`}>{t.raspSlobodniLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(t.raspDani).map(([key, label]) => {
                    const active = slobodniDani.includes(key)
                    return (
                      <button
                        key={key}
                        onClick={() => setSlobodniDani(v => active ? v.filter(d => d !== key) : [...v, key])}
                        className={`px-3 py-1.5 rounded-xl border text-xs transition-all duration-150
                          ${active ? `${btnCls} border-transparent font-semibold` : `border ${border} ${textCls} hover:opacity-80`}`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={() => setKorak(4)}
                className={`w-full py-3 rounded-2xl font-semibold text-sm ${btnCls}`}
              >
                {t.raspNext}
              </button>
            </div>
          )}

          {/* ── KORAK 4: STROGOST PREMA GREŠKAMA ── */}
          {korak === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-semibold ${textCls}`}>{t.strogTitle}</h2>
                <button onClick={() => setKorak(3)} className={`text-xs ${mutedCls} hover:opacity-70`}>{t.back}</button>
              </div>

              <p className={`text-xs ${mutedCls}`}>{t.strogQuestion}</p>

              <div className="space-y-2">
                {Object.entries(t.strogOpts).map(([key, opt]) => (
                  <button
                    key={key}
                    onClick={() => setStrogost(key)}
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-2xl border text-left transition-all duration-150
                      ${strogost === key ? `${btnCls} border-transparent` : `border ${border} ${cardCls} hover:opacity-80`}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
                      ${strogost === key ? "border-white bg-white" : `border-current ${mutedCls}`}`}>
                      {strogost === key && <div className="w-2 h-2 rounded-full bg-current" style={{ background: "var(--btn-color, #4f46e5)" }} />}
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${strogost === key ? "text-white" : textCls}`}>{opt.naziv}</div>
                      <div className={`text-xs mt-0.5 ${strogost === key ? "text-white/70" : mutedCls}`}>{opt.opis}</div>
                    </div>
                  </button>
                ))}
              </div>

              <p className={`text-xs italic ${mutedCls}`}>
                {(() => { const sp = strogostParametri(strogost); return t.strogParams(sp.maxDnevno, sp.izlazakUzastopno) })()}
              </p>

              <button
                onClick={() => setKorak(5)}
                className={`w-full py-3 rounded-2xl font-semibold text-sm ${btnCls}`}
              >
                {t.strogNext}
              </button>
            </div>
          )}

          {/* ── KORAK 5: PREGLED ── prije aktivacije samo sažetak izbora (još
              nema ničeg da se projektuje - rotation_state/review_blocks se
              prave tek u seedMethodEngine unutar aktivirajPlan); ODMAH nakon
              aktivacije prikazuje se STVARNA projekcija narednih dana, isti
              MonthlyReviewForecast koji se koristi i na listi planova. ── */}
          {korak === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-semibold ${textCls}`}>{t.k3Title}</h2>
                <button onClick={() => setKorak(4)} className={`text-xs ${mutedCls} hover:opacity-70`}>{t.back}</button>
              </div>

              <div className={`rounded-2xl border ${border} ${cardCls} p-5 space-y-3`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${btnCls} flex items-center justify-center text-white font-bold`}>
                    {odabranaMetoda ? t.methods.find(m => m.id === odabranaMetoda)?.naziv[0] : "?"}
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${textCls}`}>
                      {t.methods.find(m => m.id === odabranaMetoda)?.naziv}
                    </div>
                    <div className={`text-xs ${mutedCls}`}>{nacin === "ajeti" ? t.ajetiInSystem(ukupnoAjeta) : t.pagesInSystem(ukupnoStr)}</div>
                  </div>
                </div>

                {aktivirano && aktivniPlanZaPregled ? (
                  <>
                    <div className={`h-px ${border} border-t`} />
                    <MonthlyReviewForecast plan={aktivniPlanZaPregled} userId={user?.id} theme={theme} lang={lang} />
                  </>
                ) : (
                  <>
                    <div className={`h-px ${border} border-t`} />
                    <p className={`text-xs ${mutedCls} italic`}>
                      {t.k3Note}
                    </p>
                  </>
                )}
              </div>

              {aktivirano ? (
                <div className="space-y-2">
                  <div className={`w-full py-3 rounded-2xl font-semibold text-sm text-center bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30`}>
                    {t.activated}
                  </div>
                  <button
                    onClick={() => setReviewWizardOpen(false)}
                    className={`w-full py-2.5 rounded-2xl font-semibold text-sm ${cardCls} border ${border} ${mutedCls}`}
                  >
                    {t.plansListTitle}
                  </button>
                </div>
              ) : (
                <button
                  onClick={aktivirajPlan}
                  disabled={aktiviranje}
                  className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all disabled:opacity-50 ${btnCls}`}
                >
                  {aktiviranje ? t.saving : t.activate}
                </button>
              )}
            </div>
          )}
        </div>
      )
      )}

      {/* ── TAB: PLAN UČENJA (Ta'lim čarobnjak spojen na motor) ── */}
      {activeTab === "ucenje" && <TalimWizard />}

      {/* Potvrda prije prelaska na korak 2 - "jesi li označio sve što znaš?" */}
      {confirmNextOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${cardCls} rounded-2xl p-5 max-w-sm w-full space-y-3`}>
            <p className={`font-semibold text-sm ${textCls}`}>{t.confirmNextTitle}</p>
            <p className={`text-sm ${mutedCls}`}>{t.confirmNextBody}</p>
            <div className="flex gap-2 justify-end flex-wrap">
              <button onClick={() => setConfirmNextOpen(false)}
                className={`rounded-xl px-4 py-2 text-sm border ${border} ${mutedCls}`}>
                {t.confirmNextNo}
              </button>
              <button onClick={() => { setConfirmNextOpen(false); setKorak(2) }}
                className={`${btnCls} rounded-xl px-4 py-2 text-sm font-semibold`}>
                {t.confirmNextYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
