// ============================================================================
// Preferenca "prikaži male upitnike (?) pored sidebar stavki". Čuva se u
// localStorage (nije po korisniku - čisto lokalna postavka uređaja/browsera).
// Budući da je SidebarLayout.jsx trajno montiran (persistentan layout), a
// toggle je na drugoj stranici (Settings.jsx), obični native "storage" event
// se NE okida unutar istog taba - zato koristimo i custom window event da se
// SidebarLayout odmah osvježi kad se postavka promijeni.
// ============================================================================

const KEY = "tmizan_help_tips_enabled";
const EVENT = "tmizan-helptips-changed";

export function areHelpTipsEnabled() {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? true : v === "1"; // podrazumijevano uključeno
  } catch {
    return true;
  }
}

export function setHelpTipsEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // localStorage nedostupan (npr. privatni mod) - tiho ignoriši
  }
}

export function onHelpTipsChanged(cb) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
