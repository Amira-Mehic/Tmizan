// ============================================================================
// Kratki vodič na stranici za štampu plana - objašnjava šta se sve nađe u
// ispisu i kako se raspored priprema za papir. Selektori odgovaraju
// data-tour atributima u PlanPrintPage.jsx.
// ============================================================================

export const PLAN_PRINT_TOUR = {
  bs: [
    {
      selector: '[data-tour="tour-plan-print-page"]',
      title: "Mjesečni plan za printanje",
      description: "Generiši plan za odabrani mjesec, označi slobodne dane, upiši šta si naučio/la ili napomene — a onda odaberi 'Print' (Sačuvaj kao PDF u browseru) ili preuzmi kao Word dokument.",
    },
  ],
  en: [
    {
      selector: '[data-tour="tour-plan-print-page"]',
      title: "Monthly plan for printing",
      description: "Generate a plan for the chosen month, mark rest days, add notes on what you've learned — then choose 'Print' (Save as PDF in your browser) or download it as a Word document.",
    },
  ],
};
