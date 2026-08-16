// ============================================================================
// Mrežni prikaz svih 604 stranice mushafa, obojenih po statusu učenja. Uz
// filtriranje po broju stranice i mogućnost da se prikažu samo one koje su
// započete, čime se duga lista svede na ono što je korisniku trenutno bitno.
// ============================================================================

import { STATUS } from "../../../../constants/hifz/STATUS";
import { usePageVerseCounts } from "../../../../hooks/hifz/usePageVerseCounts";
import { getSurahsForPage, toArabicNumerals, getJuzForPage, statusCardBg, statusPillBg, statusBorder } from "../../../../constants/hifz/helpers";

export function PageGridView({ pageStatuses, onOpenPage, pageFilter, onlyStarted, noResultsLabel, theme, s }) {
  const isLight     = theme?.id === "beige_white" || theme?.id === "pink_soft";
  const verseCounts = usePageVerseCounts();

  const tCardAlt = theme?.cardAlt || "bg-white/[0.02] border border-white/8";
  const tText    = theme?.text    || "text-white";
  const tMuted   = theme?.muted   || "text-white/40";
  const tSubtle  = isLight ? "text-black/35" : "text-white/25";
  const tBorder  = isLight ? "border-black/10" : "border-white/[0.06]";

  const sl = s?.statusLabel || {};

  const allPages = Array.from({ length: 604 }, (_, i) => i + 1);
  let pages = pageFilter
    ? allPages.filter(p => String(p).includes(String(pageFilter)))
    : allPages;
  if (onlyStarted) {
    pages = pages.filter(p => (pageStatuses[p]?.status || "prazna") !== "prazna");
  }

  if (pages.length === 0) {
    return <p className={`text-sm py-8 text-center ${tMuted}`}>{noResultsLabel || "—"}</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {pages.map(p => {
        const pd          = pageStatuses[p];
        const stat        = pd?.status || "prazna";
        const st          = STATUS[stat];
        const statusLabel = sl[stat]?.f || st.labelF || st.label;
        const isActive    = stat !== "prazna";
        const difficulty  = pd?.difficulty || null;
        const ayat        = verseCounts[p];
        const juzNo       = getJuzForPage(p);
        const surahNames  = getSurahsForPage(p).map(sr => sr.name).join(" · ");

        return (
          <button
            key={p}
            onClick={() => onOpenPage(p)}
            className={`group relative flex flex-col rounded-2xl border text-left transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] overflow-hidden
              ${isActive ? "" : `${tCardAlt} ${tBorder}`}`}
            style={{
              minHeight: "170px",
              ...(isActive ? {
                backgroundColor: statusCardBg(st.hex, isLight),
                borderColor: statusBorder(st.hex, isLight),
                borderLeft: `4px solid ${st.hex}`,
              } : {}),
            }}
          >
            {/* Gornji dio: broj stranice + arapski broj */}
            <div className="flex items-start justify-between px-4 pt-4 pb-2">
              <span className={`text-3xl font-black leading-none ${tText}`} style={isActive ? { color: st.hex } : undefined}>{p}</span>
              <span
                className={`text-2xl font-bold leading-none opacity-25 ${tMuted}`}
                style={{ fontFamily: "'Amiri', serif", ...(isActive ? { color: st.hex } : {}) }}
              >
                {toArabicNumerals(p)}
              </span>
            </div>

            {/* Sura naziv */}
            <div className="px-4 flex-1">
              {surahNames ? (
                <span className={`text-[11px] font-bold leading-snug ${tText}`} style={isActive ? { color: st.hex } : undefined}>
                  {surahNames}
                </span>
              ) : (
                <span className={`text-[10px] ${tSubtle}`}>—</span>
              )}
            </div>

            {/* Džuz · ajeti */}
            <div className="px-4 pb-2 pt-2">
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest ${tSubtle}`}>
                {s?.juz?.juz || "Džuz"} {juzNo}
                {ayat != null ? (
                  <><span className="opacity-40">·</span><span>{ayat} {s?.page?.versesLabel || "aj."}</span></>
                ) : (
                  <><span className="opacity-40">·</span><span className="opacity-40">···</span></>
                )}
              </span>
            </div>

            {/* Status pill + difficulty */}
            <div className="mx-3 mb-3 flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                style={{ backgroundColor: isActive ? statusPillBg(st.hex, isLight) : (isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)") }}>
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: st.hex, opacity: isActive ? 0.9 : 0.4 }}
                />
                <span className={`text-[10px] font-semibold leading-none ${isActive ? "" : tSubtle}`}
                  style={isActive ? { color: st.hex } : undefined}>
                  {statusLabel}
                </span>
              </div>
              {difficulty === "laka" && (
                <span className="text-[9px] font-bold px-1.5 py-1 rounded-lg bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/25 flex-shrink-0">
                  {s?.page?.difficultyEasy || "L"}
                </span>
              )}
              {difficulty === "teska" && (
                <span className="text-[9px] font-bold px-1.5 py-1 rounded-lg bg-[#F58C8C]/15 text-[#F58C8C] border border-[#F58C8C]/25 flex-shrink-0">
                  {s?.page?.difficultyHard || "T"}
                </span>
              )}
            </div>

            {/* Hover arrow */}
            <span className={`absolute top-3 right-3 text-xs opacity-0 group-hover:opacity-25 transition-all ${tMuted}`}>→</span>
          </button>
        );
      })}
    </div>
  );
}
