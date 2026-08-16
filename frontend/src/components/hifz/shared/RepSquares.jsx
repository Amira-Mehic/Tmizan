// ============================================================================
// RepSquares - interaktivna "mreža kvadratića" za brojanje ponavljanja.
// Umjesto golog broja, svaki kvadratić predstavlja JEDNO ponavljanje: prazan
// dok nije proučen, popunjen s kvačicom čim se proučenje potvrdi. Klik na sljedeći
// prazan kvadratić = "proučio/la sam ovo ponavljanje"; klik na ZADNJI popunjen
// = poništi (ako se pogriješi u brojanju).
// ============================================================================

export function RepSquares({ total, done, onTap, onUndo, theme, isLight, small }) {
  if (!total || total < 1) return null;

  const sq = small ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  const filledCls = theme?.button || "bg-[#1D9E75] text-white";
  const nextCls = isLight
    ? "bg-black/5 border border-[#1D9E75]/50 text-black/40 hover:bg-black/10"
    : "bg-white/5 border border-[#1D9E75]/50 text-white/50 hover:bg-white/10";
  const lockedCls = isLight
    ? "bg-black/[0.02] border border-black/5 text-black/15"
    : "bg-white/[0.02] border border-white/5 text-white/10";

  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < done;
        const isNext = i === done;
        const isLastFilled = isFilled && i === done - 1;
        return (
          <button
            key={i}
            type="button"
            disabled={!isFilled && !isNext}
            onClick={() => {
              if (isLastFilled) onUndo?.();
              else if (isNext) onTap?.();
            }}
            title={isLastFilled ? "Klikni da poništiš" : isNext ? "Klikni kad proučiš" : undefined}
            className={`${sq} rounded-lg flex items-center justify-center font-bold transition-all flex-shrink-0
              ${isFilled ? `${filledCls} ${isLastFilled ? "cursor-pointer hover:opacity-75" : "cursor-default"}`
                : isNext ? `${nextCls} cursor-pointer animate-pulse`
                : `${lockedCls} cursor-not-allowed`}`}
          >
            {isFilled ? "✓" : i + 1}
          </button>
        );
      })}
    </div>
  );
}
