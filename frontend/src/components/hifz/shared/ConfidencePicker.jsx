// ============================================================================
// Unos nivoa sigurnosti znanja, od 1 do 5. Ponovni klik na već odabranu
// vrijednost je poništava, čime se ocjena može ukloniti bez posebnog dugmeta.
// ============================================================================

export function ConfidencePicker({ value, onChange, isLight }) {
  const inactiveCls = isLight
    ? "border-black/10 bg-black/5 text-black/30 hover:text-black/60 hover:bg-black/8"
    : "border-white/10 bg-white/5 text-white/25 hover:text-white/60 hover:bg-white/8";

  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n === value ? 0 : n)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all
            ${value >= n
              ? "bg-[#1D9E75]/15 border-[#1D9E75]/40 text-[#1D9E75]"
              : inactiveCls
            }`}>
          {n}
        </button>
      ))}
    </div>
  );
}
