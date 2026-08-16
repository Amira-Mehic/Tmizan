// ============================================================================
// Kartica jedne sure u Hifz Trackeru. Boja kartice prati najzastupljeniji
// status njenih stranica, dok postotak prikazuje samo naučeno i savladano - te
// dvije stvari namjerno nisu ista mjera, jer sura može biti većinom u toku a
// imati mali postotak naučenog.
// ============================================================================

import { STATUS } from "../../../../constants/hifz/STATUS";
import { statusCardBg, statusBorder } from "../../../../constants/hifz/helpers";

// dominant = ključ najzastupljenijeg (ne-praznog) statusa stranica sure; "prazna" ako nema.
// Kartica se boji po dominantnom statusu (npr. cijela sura "U toku" → narandžasto),
// dok % i dalje prikazuje SAMO naučenost (naučeno + savladano).
export function SuraCard({ surah, done, total, dominant, onClick, theme, s }) {
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const st       = STATUS[dominant || "prazna"];
  const isActive = !!dominant && dominant !== "prazna";
  const hex      = st.hex;

  const isLight = theme?.id === "beige_white" || theme?.id === "pink_soft";

  // Boje za default (bez ikakvog napretka) stanje - prilagođene temi
  const defaultCard  = theme?.card  || (isLight ? "bg-black/5 border border-black/10" : "bg-[#181818] border border-white/10");
  const defaultNumBg = isLight ? "bg-black/8 border-black/15 text-black/50" : "bg-white/5 border-white/10 text-white/40";
  const defaultName  = theme?.text  || "text-white";
  const defaultSub   = theme?.muted || "text-white/40";
  const defaultPct   = isLight ? "text-black/30" : "text-white/20";

  return (
    <div onClick={onClick}
      className={`rounded-xl cursor-pointer transition-all p-3 flex items-center gap-3 border ${isActive ? "" : `${defaultCard} hover:opacity-80`}`}
      style={isActive ? { backgroundColor: statusCardBg(hex, isLight), borderColor: statusBorder(hex, isLight) } : undefined}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border ${isActive ? "" : defaultNumBg}`}
        style={isActive ? { backgroundColor: statusBorder(hex, isLight), borderColor: hex, color: hex } : undefined}
      >
        {surah.id}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold truncate ${isActive ? "" : defaultName}`}
          style={isActive ? { color: hex } : undefined}>
          {surah.name}
        </div>
        <div className={`text-[10px] font-medium ${isActive ? (isLight ? "text-black/40" : "text-white/40") : defaultSub}`}>
          {s?.juz?.page || "str."} {surah.startPage}–{surah.endPage}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* mala oznaka statusa (da se vidi ŠTA je, ne samo % naučenosti) */}
        {isActive && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: statusBorder(hex, isLight), color: hex }}>
            {s?.statusLabel?.[dominant]?.label || st.label}
          </span>
        )}
        <div className={`text-sm font-bold ${isActive ? "" : defaultPct}`}
          style={isActive ? { color: hex } : undefined}>
          {pct}%
        </div>
      </div>
    </div>
  );
}
