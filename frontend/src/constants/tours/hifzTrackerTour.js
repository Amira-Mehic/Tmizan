// ============================================================================
// Kratki vodič na Hifz Trackeru - prikazuje se prvi put kad korisnik uđe na
// tu stranicu. Selektori odgovaraju data-tour atributima u HifzTracker.jsx.
// ============================================================================

export const HIFZ_TRACKER_TOUR = {
  bs: [
    {
      selector: '[data-tour="tour-hifztracker-tabs"]',
      title: "Džuzevi / Sure / Stranice",
      description: "Biraj kako pregledaš napredak — po džuzu, po suri ili po stranici. Klikni na karticu (npr. suru) da otvoriš njene stranice i tamo označiš status svake.",
    },
    {
      selector: '[data-tour="tour-hifztracker-legend"]',
      title: "Legenda boja",
      description: "Boje pokazuju status svake stranice — nije počeo, u toku, naučeno ili ponavljanje. Klikni ovdje da suziš ili proširiš legendu.",
    },
  ],
  en: [
    {
      selector: '[data-tour="tour-hifztracker-tabs"]',
      title: "By Juz / Surah / Page",
      description: "Choose how you browse your progress — by juz, by surah, or by page. Tap a card (e.g. a surah) to open its pages and mark each one's status.",
    },
    {
      selector: '[data-tour="tour-hifztracker-legend"]',
      title: "Color legend",
      description: "Colors show each page's status — not started, in progress, learned, or review. Tap here to collapse or expand the legend.",
    },
  ],
};
