// ============================================================================
// Prikaz nivoa sigurnosti znanja kao pet tačkica, za liste gdje nema mjesta za
// puni izbornik. Samo prikazuje vrijednost, ne mijenja je - za unos služi
// ConfidencePicker.
// ============================================================================

export function ConfidenceDots({ value }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <div key={n} className={`w-2.5 h-2.5 rounded-full border ${value >= n ? "bg-[#1D9E75] border-[#1D9E75]" : "bg-white/5 border-white/10"}`} />
      ))}
    </div>
  );
}
