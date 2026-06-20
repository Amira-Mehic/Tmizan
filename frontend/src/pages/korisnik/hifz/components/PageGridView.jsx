import { STATUS } from "../../../../constants/hifz/STATUS";
import { usePageVerseCounts } from "../../../../hooks/hifz/usePageVerseCounts";
import { getSurahsForPage, toArabicNumerals, getJuzForPage } from "../../../../constants/hifz/helpers";

export function PageGridView({ pageStatuses, onOpenPage, pageFilter, theme, s }) {
  const isLight     = theme?.id === "beige_white" || theme?.id === "pink_soft";
  const verseCounts = usePageVerseCounts();

  const tCardAlt = theme?.cardAlt || "bg-white/[0.02] border border-white/8";
  const tText    = theme?.text    || "text-white";
  const tMuted   = theme?.muted   || "text-white/40";
  const tSubtle  = isLight ? "text-black/35" : "text-white/25";
  const tBorder  = isLight ? "border-black/10" : "border-white/[0.06]";

  const sl = s?.statusLabel || {};

  const allPages = Array.from({ length: 604 }, (_, i) => i + 1);
  const pages = pageFilter
    ? allPages.filter(p => String(p).includes(String(pageFilter)))
    : allPages;

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
              ${isActive ? `${st.bg} ${st.border}` : `${tCardAlt} ${tBorder}`}`}
            style={{ minHeight: "170px" }}
          >
            {/* Gornji dio: broj stranice + arapski broj */}
            <div className="flex items-start justify-between px-4 pt-4 pb-2">
              <span className={`text-3xl font-black leading-none ${isActive ? st.text : tText}`}>{p}</span>
              <span
                className={`text-2xl font-bold leading-none opacity-25 ${isActive ? st.text : tMuted}`}
                style={{ fontFamily: "'Amiri', serif" }}
              >
                {toArabicNumerals(p)}
              </span>
            </div>

            {/* Sura naziv */}
            <div className="px-4 flex-1">
              {surahNames ? (
                <span className={`text-[11px] font-bold leading-snug ${isActive ? st.text : tText}`}>
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
              <div className={`flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5
                ${isActive ? "bg-black/10" : (isLight ? "bg-black/[0.04]" : "bg-white/[0.04]")}`}>
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: st.hex, opacity: isActive ? 0.9 : 0.4 }}
                />
                <span className={`text-[10px] font-semibold leading-none ${isActive ? st.text : tSubtle}`}>
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
