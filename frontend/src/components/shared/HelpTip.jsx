// ============================================================================
// HelpTip - mali sivi "?" u uglu sekcije. Klik otvara kratko objašnjenje za
// nekoga ko ne zna šta ta funkcija radi. Ne zahtijeva ThemeContext (radi
// generičkom bg/border kombinacijom), pa se može ubaciti bilo gdje bez
// dodatnog "prop drilling"-a.
//
// Popover se renderuje kroz portal u document.body, POZICIONIRAN
// preko getBoundingClientRect() dugmeta (position: fixed, klampovano unutar
// viewporta). Ovo je namjerno - apsolutno pozicioniran popover unutar
// sidebara/kartica se REZAO na pola, jer:
//  (a) sidebar <nav> ima overflow-y-auto (siječe sve što izađe van njega),
//  (b) neke kartice imaju overflow-hidden,
//  (c) <aside> ima translate-x klasu (transform), što bi position:fixed
//      unutar njega svejedno vezalo za aside umjesto za pravi viewport.
// Portal + fixed + ručno klampovanje su jedini pouzdan način da popover UVIJEK
// stane na ekran, bez obzira gdje je HelpTip ubačen.
// ============================================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const POPOVER_WIDTH = 240;
const MARGIN = 8;

export default function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // { top, left } u viewport koordinatama
  const btnRef = useRef(null);
  const popoverRef = useRef(null);

  const measure = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Podrazumijevano centriran ispod dugmeta, ali klampovan da ne izađe
    // ni lijevo ni desno ni dolje van viewporta.
    let left = r.left + r.width / 2 - POPOVER_WIDTH / 2;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - POPOVER_WIDTH - MARGIN));
    let top = r.bottom + 6;
    // Ako nema mjesta ispod (blizu dna ekrana), prikaži IZNAD dugmeta.
    const estHeight = popoverRef.current?.offsetHeight || 90;
    if (top + estHeight > window.innerHeight - MARGIN) {
      top = Math.max(MARGIN, r.top - estHeight - 6);
    }
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    const onOutside = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Pomoć"
        className="w-4 h-4 shrink-0 rounded-full bg-white/15 text-white/70 border border-white/25 text-[10px] leading-none font-bold flex items-center justify-center hover:bg-white/25 hover:text-white transition-colors align-middle ml-1.5"
      >
        ?
      </button>
      {open && pos && createPortal(
        <span
          ref={popoverRef}
          role="tooltip"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: POPOVER_WIDTH, zIndex: 200 }}
          className="block text-xs font-normal normal-case tracking-normal leading-relaxed p-3 rounded-xl shadow-2xl bg-gray-900 text-white/85 border border-white/10"
        >
          {text}
        </span>,
        document.body
      )}
    </>
  );
}
