// ============================================================================
// GuidedTour - lagani "spotlight" vodič kroz aplikaciju, bez vanjskih paketa
// (npm registry nije dostupan u ovom okruženju pa je driver.js/intro.js
// preskočen - ovo je isti vizualni efekat, ručno napisano u stilu ostatka
// koda). Osvijetli jedan DOM element po korak (preko CSS selektora, npr.
// `[data-tour="daily_hub"]`) i pored njega prikaže naslov + kratko objašnjenje
// s dugmadima Nazad/Dalje(/Preskoči).
//
// Korak sa selector:null je "centrirana" poruka bez mete (koristi se za
// uvod/zaključak, npr. objašnjenje da se pomoć može isključiti u Postavkama).
//
// dismissible=false (podrazumijevano za PRVI put, automatski pokrenut vodič):
// nema dugme "Preskoči" niti ESC - cijela pozadina je blokirana za klik, tako
// da se vodič mora stvarno proći do kraja. Ručno pokretanje iz Postavki šalje
// dismissible=true.
//
// Korak koji ne postoji u DOM-u (npr. stavka skrivena na mobitelu) se tiho
// preskoči - tour nikad ne "zapne".
// ============================================================================

import { useEffect, useState, useCallback } from "react";

const STR = {
  bs: { next: "Dalje", prev: "Nazad", done: "Gotovo", skip: "Preskoči vodič", stepOf: (a, b) => `${a} / ${b}` },
  en: { next: "Next", prev: "Back", done: "Done", skip: "Skip tour", stepOf: (a, b) => `${a} / ${b}` },
};

export default function GuidedTour({ steps = [], active, onFinish, theme, lang, dismissible = false }) {
  const s = STR[lang] || STR.bs;
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);

  // Resetuje korak na 0 kad tour postane aktivan - prilagođava se tokom
  // rendera (ne u useEffect) uz poređenje s prethodnom vrijednosti.
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setIdx(0);
  }

  const step = active ? steps[idx] : null;

  const measure = useCallback(() => {
    if (!step) { setRect(null); return; }
    if (!step.selector) { setRect("center"); return; } // uvod/zaključak - bez mete
    const el = document.querySelector(step.selector);
    if (!el) {
      // element trenutno ne postoji (npr. sidebar suzen na mobitelu) - preskoči
      if (idx < steps.length - 1) setIdx((i) => i + 1);
      else onFinish?.();
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(() => setRect(el.getBoundingClientRect()), 260);
  }, [step, idx, steps.length, onFinish]);

  // measure() čita stvarnu poziciju DOM elementa (getBoundingClientRect) - mora
  // se pokrenuti NAKON što je DOM zaista nacrtan, pa ostaje u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { measure(); }, [measure]);

  useEffect(() => {
    if (!active) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const onKey = (e) => { if (dismissible && e.key === "Escape") onFinish?.(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [active, measure, onFinish, dismissible]);

  if (!active || !step || !rect) return null;

  const isLight = theme?.id === "beige_white" || theme?.id === "pink_soft";
  const isCentered = rect === "center";

  let spotlightStyle, popoverStyle;
  if (isCentered) {
    spotlightStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.68)", zIndex: 100 };
    popoverStyle = {
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      width: 320, zIndex: 101,
    };
  } else {
    const pad = 8;
    spotlightStyle = {
      position: "fixed", top: rect.top - pad, left: rect.left - pad,
      width: rect.width + pad * 2, height: rect.height + pad * 2,
      borderRadius: 14, boxShadow: "0 0 0 9999px rgba(0,0,0,0.68)",
      zIndex: 100, transition: "all 0.25s ease",
    };
    // Popover ide desno od mete ako ima mjesta, inače ispod; uvijek unutar viewporta.
    const popW = 300;
    const spaceRight = window.innerWidth - rect.right;
    const placeRight = spaceRight > popW + 32;
    const top = placeRight
      ? Math.min(Math.max(rect.top, 16), window.innerHeight - 220)
      : Math.min(rect.bottom + pad + 12, window.innerHeight - 220);
    const left = placeRight
      ? Math.min(rect.right + pad + 12, window.innerWidth - popW - 16)
      : Math.min(Math.max(rect.left, 16), window.innerWidth - popW - 16);
    popoverStyle = { position: "fixed", top, left, width: popW, zIndex: 101, transition: "top 0.25s ease, left 0.25s ease" };
  }

  return (
    <>
      {/* Blokira klikove na pozadinu dok je vodič aktivan (osvijetljeni element
          ostaje NEKLIKABILAN namjerno - vodič se prolazi dugmadima, ne
          isprobavanjem funkcija ispod dok traje objašnjenje). */}
      <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={(e) => e.stopPropagation()} />
      <div style={spotlightStyle} />
      <div
        style={popoverStyle}
        className={`rounded-2xl p-4 shadow-2xl border ${isLight ? "bg-white border-black/10" : "bg-gray-900 border-white/10"}`}
      >
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${theme?.muted || "text-white/40"}`}>
          {s.stepOf(idx + 1, steps.length)}
        </p>
        <h3 className={`font-bold text-sm mb-1.5 ${theme?.text || "text-white"}`}>{step.title}</h3>
        <p className={`text-xs leading-relaxed mb-3 ${theme?.muted || "text-white/60"}`}>{step.description}</p>
        <div className="flex items-center justify-between gap-2">
          {dismissible ? (
            <button onClick={onFinish} className={`text-[11px] ${theme?.muted || "text-white/40"} hover:opacity-80 transition`}>
              {s.skip}
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <button
                onClick={() => setIdx((i) => i - 1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${isLight ? "bg-black/8 text-black/60 hover:bg-black/14" : "bg-white/8 text-white/70 hover:bg-white/14"}`}>
                {s.prev}
              </button>
            )}
            <button
              onClick={() => (idx < steps.length - 1 ? setIdx((i) => i + 1) : onFinish?.())}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${theme?.button || "bg-emerald-600 text-white"}`}>
              {idx < steps.length - 1 ? s.next : s.done}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
