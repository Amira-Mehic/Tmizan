// ============================================================================
// Ta'lim - Redom kroz mushaf (metoda 'zaključanog' napretka)
//
// Uči se strogo redom; novi dio se OTKLJUČAVA tek kad je prethodni
// proučen bez greške. Nema gomilanja polunaučenog.
// Datum završetka je PROCJENA (neki dani prođu na utvrđivanju).
// ============================================================================

export const DIRECTIONS = {
  od_pocetka: "Od El-Fatihe prema kraju",
  od_kraja: "Od kraćih sura (En-Nas) prema Bekari",
  zadnji_dzuz_pa_redom: "Prvo zadnji džuz, pa od početka redom",
};

// ── Redoslijed jedinica prema smjeru ────────────────────────────────────────
// units: uređena lista jedinica u prirodnom redoslijedu mushafa
// (stranice, ajeti ili redovi - svejedno, motor ne zavisi od tipa)
export function orderUnits(units, direction) {
  switch (direction) {
    case "od_pocetka":
      return [...units];
    case "od_kraja":
      return [...units].reverse();
    case "zadnji_dzuz_pa_redom": {
      // pretpostavka: units su stranice 1–604; zadnji džuz = stranice 582–604
      const zadnji = units.filter((u) => u >= 582);
      const ostalo = units.filter((u) => u < 582);
      return [...zadnji, ...ostalo];
    }
    default:
      throw new Error(`Nepoznat smjer: ${direction}`);
  }
}

// ── Stanje napretka ─────────────────────────────────────────────────────────
export function createProgress(units, direction) {
  return {
    order: orderUnits(units, direction),
    currentIndex: 0,      // jedinica koja se trenutno uči
    attempts: 0,          // pokušaji potvrde trenutne jedinice
    utvrdjivanjeDana: 0,  // koliko je dana ukupno otišlo na utvrđivanje
    finished: false,
  };
}

export function currentUnit(state) {
  return state.finished ? null : state.order[state.currentIndex];
}

// ── Potvrda: korisnik je proučio trenutni dio ───────────────────────────────
// errorFree = true → otključava se sljedeći dio
// errorFree = false → ostaje na istom dijelu (dan utvrđivanja)
export function confirm(state, { errorFree }) {
  if (state.finished) return state;

  if (!errorFree) {
    return { ...state, attempts: state.attempts + 1, utvrdjivanjeDana: state.utvrdjivanjeDana + 1 };
  }

  const nextIndex = state.currentIndex + 1;
  return {
    ...state,
    currentIndex: nextIndex,
    attempts: 0,
    finished: nextIndex >= state.order.length,
  };
}

// ── Procjena završetka ──────────────────────────────────────────────────────
// Na osnovu dosadašnjeg omjera utvrđivanja: ako je do sada svaka jedinica
// tražila prosječno k dana, preostale jedinice → remaining × k dana.
export function estimateDaysLeft(state) {
  const done = state.currentIndex;
  const remaining = state.order.length - done;
  if (remaining <= 0) return 0;
  // prosjek dana po jedinici (najmanje 1 - bez historije pretpostavljamo 1/dan)
  const avgDaysPerUnit = done > 0 ? (done + state.utvrdjivanjeDana) / done : 1;
  return Math.ceil(remaining * avgDaysPerUnit);
}

export function progressPercent(state) {
  return Math.round((state.currentIndex / state.order.length) * 100);
}
