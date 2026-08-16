// ============================================================================
// Kratki vodič na stranici poruka osoblja - objašnjava razgovore koje
// pokreće osoblje platforme. Selektori odgovaraju data-tour atributima u
// KorisnikStaffMessages.jsx.
// ============================================================================

export const STAFF_MESSAGES_TOUR = {
  bs: [
    {
      selector: '[data-tour="tour-staffmessages-page"]',
      title: "Poruke od podrške",
      description: "Ovdje su razgovori koje ti direktno pokrene admin ili moderator (ne tvoji tiketi — to je na stranici 'Podrška'). Možeš odgovoriti jednom, pa čekaš njihov odgovor prije sljedeće poruke.",
    },
  ],
  en: [
    {
      selector: '[data-tour="tour-staffmessages-page"]',
      title: "Staff messages",
      description: "Conversations started directly by an admin or moderator (not your tickets — those are on the 'Support' page). You can reply once, then wait for their reply before sending another message.",
    },
  ],
};
