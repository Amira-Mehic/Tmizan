// ============================================================================
// Unos jednog ponavljanja u historiju - datum s vremenom, broj grešaka i
// bilješka. Uz upis u historiju odmah povećava i brojač ponavljanja te pomjera
// datum zadnjeg ponavljanja, jer se te tri vrijednosti uvijek mijenjaju
// zajedno. Novi unos ide na vrh liste, pa je zadnje ponavljanje prvo vidljivo.
// ============================================================================

import { useState } from "react";
import { nowDateTimeLocal } from "../../../constants/hifz/helpers";

export function RepeatHistoryInput({ setHistory, setRepeatCount, setLastRepeat, setErrors, isLight, s }) {
  const [date, setDate] = useState(nowDateTimeLocal());
  const [note, setNote] = useState("");
  const [errs, setErrs] = useState(0);

  const add = () => {
    if (!date) return;
    setHistory(prev => [{ id: Date.now(), date, note, errors: errs }, ...prev]);
    setRepeatCount(v => v + 1);
    setLastRepeat(date);
    setErrors(errs);
    setNote(""); setErrs(0); setDate(nowDateTimeLocal());
  };

  const errorsLabel    = s?.surah?.repeatErrors?.replace(":", "") || s?.verse?.errors    || s?.form?.errors    || "Greške";
  const addRepeatLabel = s?.surah?.addRepeatBtn || s?.verse?.addRepeatBtn || s?.form?.addRepeatBtn || "+ Dodaj ponavljanje";
  const notePh         = s?.surah?.notePh || s?.verse?.notePh || s?.repeatNotePh || "Napomena...";

  const inputCls = isLight
    ? "border-black/12 bg-black/5 text-[#3D2E22] placeholder:text-black/25 focus:border-[#1D9E75]/50"
    : "border-white/10 bg-white/5 text-white placeholder:text-white/15 focus:border-[#1D9E75]/50";

  const btnCountCls = isLight
    ? "border-black/12 bg-black/5 text-black/40 hover:bg-black/10"
    : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10";

  const errLabelCls = isLight ? "text-black/35" : "text-white/30";
  const errValueCls = errs > 0 ? "text-[#F58C8C]" : (isLight ? "text-black/40" : "text-white/40");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
          className={`rounded-lg border px-2 py-1.5 text-xs outline-none transition-all ${inputCls}`} />
        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder={notePh}
          className={`flex-1 min-w-[80px] rounded-lg border px-2 py-1.5 text-xs outline-none transition-all ${inputCls}`} />
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${errLabelCls}`}>{errorsLabel}:</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setErrs(v => Math.max(0, v - 1))}
              className={`w-6 h-6 rounded border text-xs flex items-center justify-center transition-all ${btnCountCls}`}>−</button>
            <span className={`w-6 text-center text-xs font-bold ${errValueCls}`}>{errs}</span>
            <button onClick={() => setErrs(v => v + 1)}
              className={`w-6 h-6 rounded border text-xs flex items-center justify-center transition-all ${btnCountCls}`}>+</button>
          </div>
        </div>
        <button onClick={add}
          className="px-3 py-1.5 rounded-lg bg-[#1D9E75]/20 border border-[#1D9E75]/40 text-[#49C79A] text-xs font-bold hover:bg-[#1D9E75]/30 transition-all whitespace-nowrap">
          {addRepeatLabel}
        </button>
      </div>
    </div>
  );
}
