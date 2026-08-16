// ============================================================================
// Kartica jednog džuza u Hifz Trackeru. Prikazuje sve stranice tog džuza kao
// mrežu obojenu po statusu, pa se napredak vidi na prvi pogled. Klik na karticu
// otvara detalje džuza, a klik na pojedinačnu stranicu vodi direktno na nju.
// ============================================================================

import { useState } from "react";
import { STATUS, cycleStatus } from "../../../../constants/hifz/STATUS";
import { getJuzPages, toArabicNumerals } from "../../../../constants/hifz/helpers";

export function DzuzCard({ juzNo, pageStatuses, onPageClick, onCardClick, theme, s }) {
  const [unlocked, setUnlocked] = useState(false);
  const pages      = getJuzPages(juzNo);
  const doneCount  = pages.filter(p => pageStatuses[p]?.status === "naucen" || pageStatuses[p]?.status === "savladano").length;
  const inProgress = pages.filter(p => pageStatuses[p]?.status && pageStatuses[p]?.status !== "prazna").length;
  const colsClass  = (juzNo === 1 || juzNo === 30) ? "grid-cols-6" : "grid-cols-5";

  // Cotton Candy (pink_soft) ima tamnu karticu (bg-[#2A0A1C]) iako mu je akcent
  // svijetao, pa se ovdje tretira kao tamna tema (inače su brojevi nečitljivi).
  const isLight = theme?.id === "beige_white";
  const inactiveBar   = isLight ? "bg-black/20"  : "bg-white/10";
  const inactiveNum   = isLight ? "text-black/55" : "text-white/25";
  const dividerBorder = isLight ? "border-black/15" : "border-white/5";
  const lockBtn       = isLight
    ? "bg-black/8 border-black/20 text-black/50 hover:text-black/80"
    : "bg-white/5 border-white/10 text-white/30 hover:text-white/60";

  return (
    <div className={`rounded-2xl p-3 sm:p-4 flex flex-col justify-between select-none min-h-[190px] group relative ${theme?.card || "bg-white/[0.04] border border-white/10"}`}>
      <button onClick={e => { e.stopPropagation(); setUnlocked(u => !u); }}
        title={unlocked ? (s?.juz?.unlockHint || "Zaključaj nazad") : (s?.juz?.lockHint || "Otključaj da bi mogao/la označavati stranice — zaštita od slučajnog klika")}
        className={`absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-lg border text-[11px] flex items-center justify-center transition-all
          ${unlocked ? "bg-[#1D9E75]/20 border-[#1D9E75]/40 text-[#49C79A]" : lockBtn}`}>
        {unlocked ? "🔓" : "🔒"}
      </button>
      <div onClick={onCardClick} className="flex items-baseline gap-1.5 mb-2 cursor-pointer pr-8">
        <span className={`text-xs font-medium lowercase ${theme?.muted || "text-white/40"}`}>{s?.juz?.juz?.toLowerCase() || "džuz"}</span>
        <span className={`text-2xl font-bold tracking-tight ${theme?.text || "text-white"}`}>{juzNo}</span>
        <span className={`text-sm font-bold ml-0.5 ${theme?.muted || "text-white/40"}`} style={{ fontFamily: "'Amiri', serif" }}>
          {toArabicNumerals(juzNo)}
        </span>
      </div>
      <div className={`grid ${colsClass} gap-x-1 gap-y-2 my-1`}>
        {pages.map(p => {
          const s  = pageStatuses[p]?.status || "prazna";
          const st = STATUS[s];
          const isActive = s !== "prazna";
          return (
            <div key={p}
              onClick={e => { e.stopPropagation(); if (unlocked) onPageClick(p, cycleStatus(s)); }}
              className={`flex flex-col items-center gap-0.5 ${unlocked ? "cursor-pointer" : "cursor-default"}`}
              title={`Str. ${p} · ${st.label}`}>
              <div className={`w-full h-2.5 rounded-[2px] transition-all ${isActive ? `${st.bg} border ${st.border}` : inactiveBar}`} />
              <span className={`text-[9px] font-bold ${isActive ? st.text : inactiveNum}`}>{p}</span>
            </div>
          );
        })}
      </div>
      <div onClick={onCardClick} className={`flex justify-between items-center mt-2 pt-2 border-t text-[10px] font-medium cursor-pointer ${dividerBorder} ${theme?.muted || "text-white/30"}`}>
        <span>{doneCount} {s?.juz?.learned?.toLowerCase() || "naučene"}</span>
        {inProgress > 0
          ? <span className="w-1.5 h-1.5 rounded-full bg-[#EF9F27] animate-pulse" />
          : <span className="opacity-40 group-hover:opacity-80 transition-colors">{s?.juz?.show || "Prikaži →"}</span>
        }
      </div>
    </div>
  );
}
