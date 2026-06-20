export function SuraCard({ surah, done, total, onClick, theme, s }) {
  const pct         = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete  = pct === 100;
  const hasProgress = pct > 0 && pct < 100;

  const isLight = theme?.id === "beige_white" || theme?.id === "pink_soft";

  // Boje za default (bez napretka) stanje — prilagođene temi
  const defaultCard   = theme?.card   || (isLight ? "bg-black/5 border border-black/10"   : "bg-[#181818] border border-white/10");
  const defaultNumBg  = isLight ? "bg-black/8 border-black/15 text-black/50"  : "bg-white/5 border-white/10 text-white/40";
  const defaultName   = theme?.text   || "text-white";
  const defaultSub    = theme?.muted  || "text-white/40";
  const defaultPct    = isLight ? "text-black/30" : "text-white/20";

  return (
    <div onClick={onClick}
      className={`rounded-xl cursor-pointer transition-all p-3 flex items-center gap-3
        ${isComplete
          ? "border border-[#1D9E75]/40 bg-[#1D9E75]/10"
          : hasProgress
          ? "border border-[#EF9F27]/40 bg-[#EF9F27]/5"
          : `${defaultCard} hover:opacity-80`
        }`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border
        ${isComplete
          ? "bg-[#1D9E75]/20 border-[#1D9E75]/30 text-[#4ECFA0]"
          : hasProgress
          ? "bg-[#EF9F27]/20 border-[#EF9F27]/30 text-[#EF9F27]"
          : defaultNumBg
        }`}>
        {surah.id}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold truncate
          ${isComplete ? "text-[#4ECFA0]" : hasProgress ? "text-[#EF9F27]" : defaultName}`}>
          {surah.name}
        </div>
        <div className={`text-[10px] font-medium ${isComplete || hasProgress ? "text-white/40" : defaultSub}`}>
          {s?.juz?.page || "str."} {surah.startPage}–{surah.endPage}
        </div>
      </div>
      <div className={`text-sm font-bold flex-shrink-0
        ${isComplete ? "text-[#4ECFA0]" : hasProgress ? "text-[#EF9F27]" : defaultPct}`}>
        {pct}%
      </div>
    </div>
  );
}
