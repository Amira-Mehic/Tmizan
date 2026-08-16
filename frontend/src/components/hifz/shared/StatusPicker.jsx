// ============================================================================
// Odabir statusa učenja (uči se, naučeno, savladano, ponavlja se). Jedina takva
// komponenta u aplikaciji, pa se koristi jednako za stranicu, suru, džuz i
// pojedinačni ajet - izmjena ovdje djeluje na sva ta mjesta.
// ============================================================================

import { STATUS } from "../../../constants/hifz/STATUS";
import { statusPillBg, statusBorder } from "../../../constants/hifz/helpers";

// Odabrana pilula koristi punu boju statusa, izračunatu
// miješanjem hex boje s bijelom/crnom (statusPillBg/statusBorder) - ne CSS opacity -
// tako da se boja teme nikad ne "vidi kroz" pilulu, bez obzira koja je tema odabrana.
// Ovo je jedini shared StatusPicker pa popravka ovdje pokriva mushaf, suru, džuz i ajete.
export function StatusPicker({ value, onChange, isLight, s, layout = "grid" }) {
  // Neaktivne opcije nemaju krug/border/pozadinu - samo tekst, dok se ne hoveruju.
  // Jedino odabrana (active) pilula ima puni border + pozadinu boje statusa.
  const inactiveCls = isLight
    ? "border-transparent bg-transparent text-black/40 hover:text-black/70 hover:bg-black/8"
    : "border-transparent bg-transparent text-white/35 hover:text-white/70 hover:bg-white/5";

  const sl = s?.statusLabel || {};

  if (layout === "pills") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(STATUS).map(([key, st]) => {
          const label  = sl[key]?.label || st.label;
          const active = value === key;
          return (
            <button key={key} onClick={() => onChange(key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all
                ${active ? "" : inactiveCls}`}
              style={active ? {
                backgroundColor: statusPillBg(st.hex, isLight),
                borderColor: statusBorder(st.hex, isLight),
                color: st.hex,
              } : undefined}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? "" : st.dot}`}
                style={active ? { backgroundColor: st.hex } : undefined} />
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {Object.entries(STATUS).map(([key, st]) => {
        const label  = sl[key]?.label || st.label;
        const active = value === key;
        return (
          <button key={key} onClick={() => onChange(key)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left
              ${active ? "" : inactiveCls}`}
            style={active ? {
              backgroundColor: statusPillBg(st.hex, isLight),
              borderColor: statusBorder(st.hex, isLight),
              color: st.hex,
            } : undefined}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "" : st.dot}`}
              style={active ? { backgroundColor: st.hex } : undefined} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
