// ============================================================================
// SessionTimer - tajmer za sesiju učenja s tri kontrole: pokreni/pauziraj,
// restartuj, i (kad je pauziran na 00:00 ili ručno zaustavljen) efektivno
// zaustavljen. Ako je targetMinutes dat (npr. iz talim_plans.state.minutesNeeded,
// vrijeme uneseno u čarobnjaku plana), tajmer ODBROJAVA od tog broja minuta do
// 0; bez toga broji običnu štopericu naviše. Restart uvijek vraća tajmer na
// početnu vrijednost (targetMinutes ili 0).
// ============================================================================

import { useState, useEffect, useRef } from "react";

export function SessionTimer({ targetMinutes, theme, isLight, labels }) {
  const isCountdown = !!targetMinutes && targetMinutes > 0;
  const initialSeconds = isCountdown ? targetMinutes * 60 : 0;
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  // Ako se ciljano vrijeme naknadno učita/promijeni, osvježi dok tajmer nije pokrenut.
  useEffect(() => {
    if (running) return;
    const next = isCountdown ? targetMinutes * 60 : 0;
    Promise.resolve().then(() => setSeconds(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMinutes, isCountdown]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => (isCountdown ? Math.max(0, s - 1) : s + 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, isCountdown]);

  const stop = () => setRunning(false);
  const restart = () => { setRunning(false); setSeconds(isCountdown ? targetMinutes * 60 : 0); };

  const expired = isCountdown && running && seconds === 0;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const L = labels || {};
  const wrapBg = isLight ? "bg-black/[0.04] border-black/8" : "bg-white/[0.04] border-white/8";
  const btnCls = theme?.cardSub || (isLight ? "bg-black/6 hover:bg-black/12" : "bg-white/6 hover:bg-white/12");
  const accent = theme?.accent || "text-[#49C79A]";

  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 ${wrapBg}`}>
      <span className={`font-mono text-xl font-black tabular-nums tracking-wide ${expired ? "text-red-500" : running ? accent : ""}`}>
        {mm}:{ss}
      </span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => setRunning((r) => !r)}
          title={running ? (L.pause || "Pauziraj") : (L.start || "Pokreni")}
          className={`${btnCls} rounded-lg w-8 h-8 flex items-center justify-center text-sm transition-all`}>
          {expired ? "⏰" : running ? "⏸" : "▶️"}
        </button>
        <button type="button" onClick={restart}
          title={L.restart || "Restartuj"}
          className={`${btnCls} rounded-lg w-8 h-8 flex items-center justify-center text-sm transition-all`}>
          ↻
        </button>
        {running && (
          <button type="button" onClick={stop}
            title={L.stop || "Zaustavi"}
            className={`${btnCls} rounded-lg w-8 h-8 flex items-center justify-center text-sm transition-all`}>
            ⏹
          </button>
        )}
      </div>
    </div>
  );
}
