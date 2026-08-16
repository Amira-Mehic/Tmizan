// ============================================================================
// Kratki vodič na stranici "Ponavljanje (Murajaa)" - prikazuje se prvi put
// kad korisnik uđe na tu stranicu (ne veže se za sidebar, nego direktno za
// sadržaj ove stranice). Selektori odgovaraju data-tour atributima u
// MurajaaPage.jsx.
// ============================================================================

export const PONAVLJANJE_TOUR = {
  bs: [
    {
      selector: '[data-tour="tour-ponavljanje-newblock"]',
      title: "Prvo dodaj blok",
      description: "Da bi se nešto pojavilo u 'Na redu danas', prvo ovdje generiši/dodaj blok — odaberi jedinicu (ajet, stranica, sura...), unesi stavke i metodu ponavljanja, pa klikni 'Dodaj u sistem ponavljanja'.",
    },
    {
      selector: '[data-tour="tour-ponavljanje-due"]',
      title: "Na redu danas",
      description: "Ovdje se pojavljuju blokovi kojima je danas vrijeme za ponavljanje. Klikni 'Tačno' ili 'Greška' nakon svakog ponavljanja — sistem sam izračuna kad je sljedeći put na redu.",
    },
  ],
  en: [
    {
      selector: '[data-tour="tour-ponavljanje-newblock"]',
      title: "First, add a block",
      description: "For anything to show up under 'Due today', first generate/add a block here — pick a unit (ayah, page, surah...), enter the items and a review method, then click 'Add to review system'.",
    },
    {
      selector: '[data-tour="tour-ponavljanje-due"]',
      title: "Due today",
      description: "Blocks that are due for review today show up here. Tap 'Correct' or 'Mistake' after each review — the system automatically works out when it's due next.",
    },
  ],
};
