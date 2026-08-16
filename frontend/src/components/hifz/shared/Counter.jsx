// ============================================================================
// Brojač s dugmadima za povećanje i smanjenje, za unos broja ponavljanja i
// grešaka. Donja granica se zadaje, pa vrijednost ne može ispod nule.
// ============================================================================

export function Counter({ value, setter, min = 0, small, isLight }) {
  const sz    = small ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  const numSz = small ? "w-6 text-xs"     : "w-8 text-sm";

  const btnCls = isLight
    ? "border-black/10 bg-black/5 text-black/50 hover:bg-black/10"
    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10";
  const numCls = isLight ? "text-[#3D2E22]" : "text-white";

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => setter(v => Math.max(min, v - 1))}
        className={`${sz} rounded-lg border transition-all flex items-center justify-center flex-shrink-0 font-bold ${btnCls}`}>
        −
      </button>
      <span className={`${numSz} text-center font-bold ${numCls}`}>{value}</span>
      <button onClick={() => setter(v => v + 1)}
        className={`${sz} rounded-lg border transition-all flex items-center justify-center flex-shrink-0 font-bold ${btnCls}`}>
        +
      </button>
    </div>
  );
}
