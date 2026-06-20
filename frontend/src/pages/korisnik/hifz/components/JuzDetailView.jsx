import { STATUS } from "../../../../constants/hifz/STATUS";
import { getJuzPages, toArabicNumerals, fmtDate, getSurahsForPage } from "../../../../constants/hifz/helpers";
import { usePageVerseCounts } from "../../../../hooks/hifz/usePageVerseCounts";

export function JuzDetailView({ juzNo, pageStatuses, onPageStatusChange, onOpenPage, onBack, theme, s }) {
  const pages        = getJuzPages(juzNo);
  const verseCounts  = usePageVerseCounts();
  const learnedCount = pages.filter(p => pageStatuses[p]?.status === "naucen" || pageStatuses[p]?.status === "savladano").length;
  const inProgressCount = pages.filter(p => pageStatuses[p]?.status === "u_toku").length;
  const pct          = Math.round(learnedCount / pages.length * 100);

  const isLight  = theme?.id === "beige_white" || theme?.id === "pink_soft";
  const tCard    = theme?.card    || "bg-white/[0.04] border border-white/10";
  const tCardAlt = theme?.cardAlt || "bg-white/[0.02] border border-white/8";
  const tCardSub = theme?.cardSub || "bg-white/[0.01] border border-white/6";
  const tText    = theme?.text  || "text-white";
  const tMuted   = theme?.muted || "text-white/40";
  const tSubtle  = isLight ? "text-black/35" : "text-white/25";
  const tBorder  = isLight ? "border-black/10" : "border-white/[0.06]";
  const tDivide  = isLight ? "divide-black/[0.05]" : "divide-white/[0.04]";
  const tRow     = isLight ? "hover:bg-black/[0.025]" : "hover:bg-white/[0.03]";
  const tDetBtn  = isLight
    ? "border-black/15 bg-black/[0.03] text-black/35 hover:text-[#1D9E75] hover:border-[#1D9E75]/40 hover:bg-[#1D9E75]/10"
    : "border-white/10 bg-white/[0.03] text-white/40 hover:text-white hover:border-[#1D9E75]/40 hover:bg-[#1D9E75]/10";

  const sj = s?.juz || {};
  const sl = s?.statusLabel || {};

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-[#1D9E75] hover:opacity-80 transition-all">
          {s?.nav?.backToJuz || "← Nazad na džuzeve"}
        </button>
        <span className={`text-xs font-semibold uppercase tracking-wider ${tSubtle}`}>
          {sj.juz || "Džuz"} {juzNo} · {pages.length} {sj.pages || "str."}
        </span>
      </div>

      {/* Summary card */}
      <div className={`rounded-2xl border p-4 sm:p-5 ${tCard}`}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <span className={`text-xs uppercase tracking-wider font-semibold ${tMuted}`}>{sj.juz || "Džuz"}</span>
            <h2 className={`text-3xl font-black leading-none mt-0.5 ${tText}`}>{juzNo}</h2>
          </div>
          <div className="flex gap-4 sm:gap-6">
            {[
              { label: sj.learned    || "Naučene",  value: learnedCount,    color: "text-[#49C79A]" },
              { label: sj.inProgress || "U toku",   value: inProgressCount, color: "text-[#F5B453]" },
              { label: sj.total      || "Ukupno",   value: pages.length,    color: tMuted },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-end">
                <span className={`text-xl font-black ${color}`}>{value}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${tSubtle}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`w-full h-1.5 rounded-full ${isLight ? "bg-black/8" : "bg-white/5"}`}>
          <div className="h-full rounded-full bg-[#1D9E75] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className={`text-[10px] mt-2 font-semibold ${tSubtle}`}>{pct}% · {sj.learnedOf ? sj.learnedOf(learnedCount, pages.length) : `${learnedCount}/${pages.length} naučenih stranica`}</p>
      </div>

      {/* Grid kockice */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {pages.map(p => {
          const pd          = pageStatuses[p];
          const stat        = pd?.status || "prazna";
          const st          = STATUS[stat];
          const statusLabel = sl[stat]?.f || st.labelF || st.label;
          const isActive    = stat !== "prazna";
          const surahs     = getSurahsForPage(p);
          const surahNames = surahs.map(s => s.name).join(" · ");
          const ayatCount  = verseCounts[p];

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

              {/* Džuz · ajeti — mali tag */}
              <div className="px-4 pb-2 pt-2">
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest ${tSubtle}`}>
                  Džuz {juzNo}
                  {ayatCount != null ? (
                    <><span className="opacity-40">·</span><span>{ayatCount} ajeta</span></>
                  ) : (
                    <><span className="opacity-40">·</span><span className="opacity-40">···</span></>
                  )}
                </span>
              </div>

              {/* Status pill */}
              <div className={`mx-3 mb-3 flex items-center gap-2 rounded-lg px-2.5 py-1.5
                ${isActive ? "bg-black/10" : (isLight ? "bg-black/[0.04]" : "bg-white/[0.04]")}`}>
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: st.hex, opacity: isActive ? 0.9 : 0.4 }}
                />
                <span className={`text-[10px] font-semibold leading-none ${isActive ? st.text : tSubtle}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Datumi i napomena */}
              {(pd?.startDate || pd?.lastRepeat || pd?.shortNote) && (
                <div className={`flex flex-col gap-0.5 mx-3 mb-3 pt-2 border-t ${tBorder}`}>
                  {pd?.startDate && (
                    <span className={`text-[9px] leading-tight ${tMuted}`}>▶ {fmtDate(pd.startDate)}</span>
                  )}
                  {pd?.lastRepeat && (
                    <span className={`text-[9px] leading-tight ${tMuted}`}>↻ {fmtDate(pd.lastRepeat)}</span>
                  )}
                  {pd?.shortNote && (
                    <span className={`text-[9px] leading-tight truncate ${tMuted}`} title={pd.shortNote}>
                      {pd.shortNote}
                    </span>
                  )}
                </div>
              )}

              {/* Hover arrow */}
              <span className={`absolute top-3 right-3 text-xs opacity-0 group-hover:opacity-25 transition-all ${tMuted}`}>→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
