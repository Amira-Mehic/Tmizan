// ============================================================================
// FirstTimeHint - malo, diskretno objašnjenje koje se prikaže SAMO PRVI PUT
// (localStorage flag po storageKey), pa nestane zauvijek nakon što ga korisnik
// zatvori klikom na križić. Za razliku od GuidedTour-a (spotlight preko cijelog ekrana),
// ovo je namijenjeno za kontrole duboko unutar stranice (npr. način
// označavanja "Naučeno"/grešaka u Hifz Trackeru) gdje bi puni tour bio previše.
// ============================================================================

import { useState } from "react";

export function FirstTimeHint({ storageKey, text, theme }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });

  if (dismissed || !text) return null;

  const isLight = theme?.id === "beige_white" || theme?.id === "pink_soft";

  const dismiss = () => {
    try { localStorage.setItem(storageKey, "1"); } catch { /* localStorage nedostupan */ }
    setDismissed(true);
  };

  return (
    <div className={`rounded-xl border px-3 py-2.5 text-xs flex items-start gap-2.5 ${isLight ? "bg-black/[0.03] border-black/10 text-black/60" : "bg-white/[0.04] border-white/10 text-white/60"}`}>
      <span className="text-sm shrink-0">💡</span>
      <p className="flex-1 leading-relaxed">{text}</p>
      <button type="button" onClick={dismiss} aria-label="Zatvori" className="shrink-0 text-[11px] font-semibold opacity-60 hover:opacity-100 transition-opacity">
        ✕
      </button>
    </div>
  );
}
