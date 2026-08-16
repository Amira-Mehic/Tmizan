// ============================================================================
// Kratki vodič na stranici "Učenje" - prikazuje se prvi put kad korisnik uđe
// na tu stranicu. Selektor odgovara data-tour atributu u UcenjeSession.jsx.
// ============================================================================

export const UCENJE_TOUR = {
  bs: [
    {
      selector: '[data-tour="tour-ucenje-page"]',
      title: "Prvo napravi plan",
      description: "Ova stranica prati tvoj AKTIVAN plan iz Hifz Plannera i sama te vodi korak po korak — ne biraš ništa ručno. Ako još nemaš plan, prvo idi u Hifz Planner i generiši ga — tek onda će se ovdje pojaviti šta je danas na redu.",
    },
  ],
  en: [
    {
      selector: '[data-tour="tour-ucenje-page"]',
      title: "First, create a plan",
      description: "This page follows your ACTIVE plan from the Hifz Planner and guides you step by step — you don't choose anything manually. If you don't have a plan yet, go to the Hifz Planner first and generate one — only then will today's task appear here.",
    },
  ],
};
