// ============================================================================
// ErrorAyahPicker - lista ajeta jedne stranice kao chip-ovi; klik označava
// (ili odznačava) da je taj KONKRETAN ajet imao grešku. Označeni ajeti idu u
// error_tracking (ref_type="verse") preko greskeService, pa se automatski
// pojave na Dashboardu ("Stranice i ajeti s greškama za ponavljanje") i na
// mapi slabih mjesta (WeakSpotMap) - isti podaci, dva prikaza.
// ============================================================================

export function ErrorAyahPicker({ verseKeys, flagged, onToggle, isLight, label, hint }) {
  if (!verseKeys?.length) return null;

  return (
    <div className="space-y-1.5">
      {label && (
        <p className={`text-[10px] font-semibold uppercase tracking-wider ${isLight ? "text-black/35" : "text-white/25"}`}>
          {label}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {verseKeys.map((vk) => {
          const active = flagged.includes(vk);
          return (
            <button key={vk} type="button" onClick={() => onToggle(vk)}
              className={`text-xs font-mono px-2.5 py-1 rounded-full border transition-all ${
                active
                  ? "bg-red-600 border-red-600 text-white"
                  : isLight
                    ? "bg-black/5 border-black/10 text-black/40 hover:bg-black/10"
                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
              }`}>
              {vk}{active ? " ✕" : ""}
            </button>
          );
        })}
      </div>
      {hint && <p className={`text-[10px] ${isLight ? "text-black/30" : "text-white/20"}`}>{hint}</p>}
    </div>
  );
}
