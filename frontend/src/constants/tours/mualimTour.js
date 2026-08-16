// ============================================================================
// Koraci vodiča za ulogu "mualim" - kraći vodič (samo sidebar), za razliku
// od korisničkog koji ima i par dodatnih koraka na samoj stranici.
// ============================================================================

export const MUALIM_TOUR = {
  bs: [
    { selector: '[data-tour="tour-mualim-dashboard"]', title: "Mualim panel", description: "Tvoja početna stranica kao mualima — pregled tvojih učenika, njihovog napretka i grešaka koje treba ispraviti." },
    { selector: '[data-tour="tour-mualim-reviews"]', title: "Preslušavanja", description: "Ovdje upravljaš zahtjevima za preslušavanje i zakazanim sesijama sa svojim učenicima." },
    { selector: '[data-tour="tour-mualimdash-tab-ucenici"]', title: "Učenici", description: "Pregled po učeniku: napredak, mapa slabih mjesta, zadaci koje mu zadaješ i poruke." },
    { selector: '[data-tour="tour-mualimdash-tab-zahtjevi"]', title: "Zahtjevi", description: "Novi učenici koji se žele povezati s tobom čekaju ovdje — prihvati ih ili odbij." },
    { selector: '[data-tour="tour-mualimdash-tab-sesije"]', title: "Sesije", description: "Zakazuj termine preslušavanja/časova (online ili uživo) i vodi evidenciju prisustva." },
    { selector: '[data-tour="tour-mualimdash-tab-halka_ucenje"]', title: "Halka učenje", description: "Zadaješ dijelove sure po halka metodi — učenik priprema, ti preslušavaš i otključavaš sljedeći." },
    { selector: '[data-tour="tour-mualimdash-tab-plan"]', title: "Mualimov plan", description: "Ovdje možeš napraviti sedmični plan učenja i ponavljanja za učenika — čim ga sačuvaš, automatski mu bude dodijeljen i prikazan kao prioritet za tu sedmicu." },
    { selector: '[data-tour="tour-mualimdash-tab-ploca"]', title: "Oglasna ploča", description: "Šalješ obavijesti, motivaciju ili pohvale — svaka objava ide jednom konkretnom učeniku." },
    { selector: null, title: "To je to!", description: "Pored svake stavke u sidebaru sad stoji mali sivi upitnik — klikni na njega kad god ti zatreba podsjetnik gdje šta vodi. Ako ti smetaju, možeš ih isključiti u Postavkama → Vodič kroz aplikaciju." },
  ],
  en: [
    { selector: '[data-tour="tour-mualim-dashboard"]', title: "Muallim panel", description: "Your home page as a muallim — an overview of your students, their progress, and mistakes that need correcting." },
    { selector: '[data-tour="tour-mualim-reviews"]', title: "Reviews", description: "Manage review requests and scheduled sessions with your students here." },
    { selector: '[data-tour="tour-mualimdash-tab-ucenici"]', title: "Students", description: "Per-student overview: progress, weak-spot map, tasks you assign, and messages." },
    { selector: '[data-tour="tour-mualimdash-tab-zahtjevi"]', title: "Requests", description: "New students who want to connect with you wait here — accept or reject them." },
    { selector: '[data-tour="tour-mualimdash-tab-sesije"]', title: "Sessions", description: "Schedule recitation/class sessions (online or in person) and track attendance." },
    { selector: '[data-tour="tour-mualimdash-tab-halka_ucenje"]', title: "Halaqa learning", description: "Assign surah parts using the halaqa method — the student prepares, you listen and unlock the next." },
    { selector: '[data-tour="tour-mualimdash-tab-plan"]', title: "Muallim's plan", description: "Create a weekly learning & review plan here — as soon as you save it, it's automatically assigned to the student and shown as their priority for that week." },
    { selector: '[data-tour="tour-mualimdash-tab-ploca"]', title: "Board", description: "Send announcements, motivation, or praise — each post goes to one specific student." },
    { selector: null, title: "That's it!", description: "Every sidebar item now has a small gray question mark next to it — click it anytime for a reminder of where it leads. If they bother you, you can turn them off in Settings → App guide." },
  ],
};
