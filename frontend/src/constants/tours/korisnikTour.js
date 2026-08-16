// ============================================================================
// Koraci vodiča za ulogu "korisnik" (učenik) - prvo par koraka na samoj
// Dnevni hub stranici (gdje se tour i pokreće), pa redom kroz stavke u
// sidebaru. Selektori moraju odgovarati data-tour atributima u
// KorisnikDashboard.jsx i SidebarLayout.jsx.
// ============================================================================

export const KORISNIK_TOUR = {
  bs: [
    { selector: '[data-tour="tour-streak"]', title: "Tvoj niz dana (streak)", description: "Broj uzastopnih dana kad si nešto naučio/la ili ponovio/la. Ne prekidaj niz — svaki dan se računa, makar i mala količina." },
    { selector: '[data-tour="tour-mualim-plan"]', title: "Plan od tvog mualima", description: "Ako imaš mualima, ovdje se prvo pojavljuje ono što je ON tebi zadao za taj dan — to ima prioritet nad automatskim rasporedom." },
    { selector: '[data-tour="tour-quick-links"]', title: "Brzi linkovi", description: "Prečice do planera, trackera i printanja plana — sve na jedan klik odavde." },
    { selector: '[data-tour="tour-daily-hub"]', title: "Dnevni hub", description: "Ovo je tvoja početna stranica nakon prijave — pregled šta ti je danas za učenje i ponavljanje." },
    { selector: '[data-tour="tour-mualim-hub"]', title: "Mualim", description: "Sve što dolazi od tvog mualima na jednom mjestu: zadaci, plan ponavljanja, i poruke/razgovor s njim." },
    { selector: '[data-tour="tour-foundations"]', title: "Temelji", description: "Osnovna objašnjenja — kako birati metodu učenja, šta je ponavljanje, kako radi pametno ponavljanje (SRS) i slično. Kreni odavde ako ti nešto nije jasno." },
    { selector: '[data-tour="tour-hifz-planner-page"]', title: "Hifz Planner", description: "Ovdje postavljaš i podešavaš svoj plan učenja Kur'ana — koliko stranica dnevno, koja metoda, koje dane ne radiš." },
    { selector: '[data-tour="tour-hifz-tracker"]', title: "Hifz Tracker", description: "Pregled tvog napretka po džuzevima, surama ili stranicama — vidiš šta je naučeno, u toku, ili treba ponoviti." },
    { selector: '[data-tour="tour-ucenje"]', title: "Učenje", description: "Ovdje počinješ dnevnu sesiju učenja novih stranica prema tvom planu." },
    { selector: '[data-tour="tour-ponavljanje"]', title: "Ponavljanje", description: "Ovdje ponavljaš ono što si već naučio/la — sistem sam bira šta je najviše na redu." },
    { selector: '[data-tour="tour-mualimi"]', title: "Mualimi", description: "Pronađi mualima i pošalji zahtjev da prati tvoj napredak — mualim ti onda može zadavati zadatke i zakazivati preslušavanja." },
    { selector: '[data-tour="tour-support"]', title: "Podrška", description: "Prijavi grešku, postavi pitanje ili predloži poboljšanje. Poruke koje ti admin ili moderator direktno pošalju nalaze se u dnu sidebara." },
    { selector: '[data-tour="tour-blog"]', title: "Blog", description: "Klik ovdje te vodi na blog — tamo mualimi i bloggeri objavljuju korisne članke i savjete o učenju i pamćenju Kur'ana." },
    { selector: null, title: "To je to!", description: "Pored svake stavke u sidebaru sad stoji mali crveni upitnik — klikni na njega kad god ti zatreba podsjetnik gdje šta vodi. Ako ti smetaju, možeš ih isključiti u Postavkama → Vodič kroz aplikaciju." },
  ],
  en: [
    { selector: '[data-tour="tour-streak"]', title: "Your daily streak", description: "How many days in a row you've learned or reviewed something. Don't break the streak — even a small amount each day counts." },
    { selector: '[data-tour="tour-mualim-plan"]', title: "Your muallim's plan", description: "If you have a muallim, whatever THEY assigned you for that day shows up here first — it takes priority over the automatic schedule." },
    { selector: '[data-tour="tour-quick-links"]', title: "Quick links", description: "Shortcuts to the planner, tracker, and plan printing — all one click away from here." },
    { selector: '[data-tour="tour-daily-hub"]', title: "Daily Hub", description: "This is your home page after login — an overview of what's due today for learning and review." },
    { selector: '[data-tour="tour-mualim-hub"]', title: "Muallim", description: "Everything from your muallim in one place: tasks, review plan, and messages/conversation with them." },
    { selector: '[data-tour="tour-foundations"]', title: "Foundations", description: "Basic explanations — how to choose a learning method, what review is, how smart review (SRS) works, and more. Start here if something is unclear." },
    { selector: '[data-tour="tour-hifz-planner-page"]', title: "Hifz Planner", description: "Set up and adjust your Qur'an memorization plan here — pages per day, method, rest days." },
    { selector: '[data-tour="tour-hifz-tracker"]', title: "Hifz Tracker", description: "See your progress by juz, sura, or page — what's learned, in progress, or due for review." },
    { selector: '[data-tour="tour-ucenje"]', title: "Learning", description: "Start your daily session of learning new pages according to your plan here." },
    { selector: '[data-tour="tour-ponavljanje"]', title: "Review", description: "Review what you've already learned here — the system picks what's most due on its own." },
    { selector: '[data-tour="tour-mualimi"]', title: "Muallims", description: "Find a muallim and send a request for them to follow your progress — they can then assign tasks and schedule recitations." },
    { selector: '[data-tour="tour-support"]', title: "Support", description: "Report a bug, ask a question, or suggest an improvement. Messages an admin or moderator sends you directly are at the bottom of the sidebar." },
    { selector: '[data-tour="tour-blog"]', title: "Blog", description: "Clicking here takes you to the blog — that's where muallims and bloggers post useful articles and tips about learning and memorizing the Qur'an." },
    { selector: null, title: "That's it!", description: "Every sidebar item now has a small red question mark next to it — click it anytime for a reminder of where it leads. If they bother you, you can turn them off in Settings → App guide." },
  ],
};
