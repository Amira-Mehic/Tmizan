// ============================================================================
// Da li je korisnik već vidio vodič za datu ulogu - čuva se lokalno
// (localStorage, po user id + uloga) jer je ovo samo UX pogodnost
// ("ne gnjavi me opet"), ne kritičan podatak koji mora preživjeti promjenu
// uređaja/browsera. Postavke stranica ionako nudi ručno pokretanje ponovo.
// ============================================================================

const key = (userId, role) => `tmizan_tour_seen_${role}_${userId}`;

export function hasSeenTour(userId, role) {
  if (!userId) return true; // dok se korisnik ne učita, ne pokreći ništa
  try { return localStorage.getItem(key(userId, role)) === "1"; } catch { return true; }
}

export function markTourSeen(userId, role) {
  try { localStorage.setItem(key(userId, role), "1"); } catch { /* ignore */ }
}

export function resetTourSeen(userId, role) {
  try { localStorage.removeItem(key(userId, role)); } catch { /* ignore */ }
}
