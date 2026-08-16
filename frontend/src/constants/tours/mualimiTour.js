// ============================================================================
// Kratki vodič na stranici "Mualimi" (pronalazak i spajanje s mualimom) -
// prikazuje se prvi put kad korisnik uđe na tu stranicu. Selektori odgovaraju
// data-tour atributima u KorisnikMualimLink.jsx.
// ============================================================================

export const MUALIMI_TOUR = {
  bs: [
    {
      selector: '[data-tour="tour-mualimi-search"]',
      title: "Pronađi mualima",
      description: "Pretraži mualime po imenu — podrazumijevano se prikazuju samo oni istog roda kao ti, a oni iz tvog grada idu na vrh liste. Klikni 'Pošalji zahtjev' da zatražiš praćenje.",
    },
    {
      selector: '[data-tour="tour-mualimi-manual"]',
      title: "Spajanje preko koda",
      description: "Želiš baš određenog mualima suprotnog roda? On/ona ti mora lično dati svoj email i privatni kod (vidi ga samo on/ona u svom profilu) — unesi ih ovdje da se spojite.",
    },
  ],
  en: [
    {
      selector: '[data-tour="tour-mualimi-search"]',
      title: "Find a muallim",
      description: "Search muallims by name — by default only muallims of the same gender as you are shown, and ones from your city appear at the top. Tap 'Send request' to ask them to follow your progress.",
    },
    {
      selector: '[data-tour="tour-mualimi-manual"]',
      title: "Connect with a code",
      description: "Want a specific muallim of the opposite gender? They have to personally share their email and private code (only they can see it in their own profile) — enter it here to connect.",
    },
  ],
};
