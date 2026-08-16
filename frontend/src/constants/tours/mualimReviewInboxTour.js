// ============================================================================
// Kratki vodič na inboxu za preslušavanje, iz ugla mualima - objašnjava
// kako stižu zahtjevi učenika i kako se na njih odgovara. Selektori
// odgovaraju data-tour atributima u MualimReviewInbox.jsx.
// ============================================================================

export const MUALIM_REVIEW_INBOX_TOUR = {
  bs: [
    {
      selector: '[data-tour="tour-reviewinbox-page"]',
      title: "Zahtjevi za preslušavanje",
      description: "Novi zahtjevi učenika su gore, pregledani ispod. Odgovori direktno u polju, klikni 'Zakaži' da otvoriš dashboard na tabu sesija za tog učenika, ili 'Označi pregledano' ako ne treba odgovor.",
    },
  ],
  en: [
    {
      selector: '[data-tour="tour-reviewinbox-page"]',
      title: "Review requests",
      description: "New student requests are at the top, handled ones below. Reply directly in the field, tap 'Schedule' to open the dashboard's sessions tab for that student, or 'Mark handled' if no reply is needed.",
    },
  ],
};
