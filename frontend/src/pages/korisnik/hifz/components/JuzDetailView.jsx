// ============================================================================
// Detaljan prikaz jednog džuza - lista njegovih stranica sa statusom, brojem
// ponavljanja i datumima. Odavde se status mijenja direktno, bez otvaranja
// pojedinačne stranice, što ubrzava unos kad se odjednom obrađuje cijeli džuz.
// ============================================================================

import { useState } from "react";
import { STATUS } from "../../../../constants/hifz/STATUS";
import { getJuzPages, toArabicNumerals, fmtDate, fmtDateTime, getSurahsForPage, statusCardBg, statusPillBg, statusBorder, getDominantStatus } from "../../../../constants/hifz/helpers";
import { usePageVerseCounts } from "../../../../hooks/hifz/usePageVerseCounts";
import { StatusPicker } from "../../../../components/hifz/shared/StatusPicker";
import { supabase } from "../../../../services/SupaBaseClient";
import HelpTip from "../../../../components/shared/HelpTip";

const HIDE_WARNING_KEY = "tmizan_hide_memorize_warning";

export function JuzDetailView({ juzNo, pageStatuses, onQuickStatusAll, onResetJuz, onOpenPage, onBack, theme, s }) {
  const pages        = getJuzPages(juzNo);
  const verseCounts  = usePageVerseCounts();
  const learnedCount = pages.filter(p => pageStatuses[p]?.status === "naucen" || pageStatuses[p]?.status === "savladano").length;
  const inProgressCount = pages.filter(p => pageStatuses[p]?.status === "u_toku").length;
  const pct          = Math.round(learnedCount / pages.length * 100);

  const [bulkSaving,    setBulkSaving]    = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetFinalOpen, setResetFinalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Dohvati verse_key-eve svih stranica džuza iz lokalne baze (za kaskadu "Naučen" i reset)
  const fetchJuzVerseKeys = async () => {
    const { data, error } = await supabase
      .from("ayahs")
      .select("verse_key")
      .in("page_number", pages);
    if (error) { console.error("fetchJuzVerseKeys:", error); return []; }
    return (data || []).map(r => r.verse_key);
  };

  const applyQuickStatusAll = async (status) => {
    if (!onQuickStatusAll) return;
    setBulkSaving(true);
    try {
      const verseKeys = status === "naucen" ? await fetchJuzVerseKeys() : [];
      await onQuickStatusAll(pages, status, verseKeys);
    } finally {
      setBulkSaving(false);
    }
  };

  const handleQuickStatusAll = (status) => {
    if (bulkSaving) return;
    const warningHidden = (() => {
      try { return localStorage.getItem(HIDE_WARNING_KEY) === "true"; } catch { return false; }
    })();
    if (status === "naucen" && !warningHidden) {
      setDontShowAgain(false);
      setConfirmStatus(status);
      return;
    }
    applyQuickStatusAll(status);
  };

  const confirmProceed = () => {
    if (dontShowAgain) {
      try { localStorage.setItem(HIDE_WARNING_KEY, "true"); } catch { /* localStorage nedostupan */ }
    }
    const status = confirmStatus;
    setConfirmStatus(null);
    applyQuickStatusAll(status);
  };

  const confirmCancel = () => setConfirmStatus(null);

  const handleResetConfirm = async () => {
    if (!onResetJuz || resetting) return;
    setResetting(true);
    try {
      const verseKeys = await fetchJuzVerseKeys();
      await onResetJuz(pages, verseKeys);
    } finally {
      setResetting(false);
      setResetFinalOpen(false);
    }
  };

  const proceedToFinalReset = () => { setResetConfirmOpen(false); setResetFinalOpen(true); };
  const cancelReset = () => { setResetConfirmOpen(false); setResetFinalOpen(false); };

  const isLight  = theme?.id === "beige_white" || theme?.id === "pink_soft";
  const tCard    = theme?.card    || "bg-white/[0.04] border border-white/10";
  const tCardAlt = theme?.cardAlt || "bg-white/[0.02] border border-white/8";
  const tText    = theme?.text  || "text-white";
  const tMuted   = theme?.muted || "text-white/40";
  const tSubtle  = isLight ? "text-black/35" : "text-white/25";
  const tBorder  = isLight ? "border-black/10" : "border-white/[0.06]";

  const sj = s?.juz || {};
  const sl = s?.statusLabel || {};

  // ── Boja hero kartice - dominantan status stranica džuza (ono što je stvarno
  // odabrano preko "Označi cijeli džuz"), a ne samo % naučenosti ─────────────
  const heroSt = STATUS[getDominantStatus(pages, pageStatuses)];

  // Zadnje ažurirano u ovom džuzu - najnoviji updatedAt među svim njegovim
  // stranicama (džuz nema svoj zaseban zapis, pa se ovo izvodi iz stranica).
  const juzLastUpdated = pages
    .map((p) => pageStatuses[p]?.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-[#1D9E75] hover:opacity-80 transition-all">
          {s?.nav?.backToJuz || "← Nazad na džuzeve"}
        </button>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold uppercase tracking-wider ${tSubtle}`}>
            {sj.juz || "Džuz"} {juzNo} · {pages.length} {sj.pages || "str."}
          </span>
          {onResetJuz && (
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#EF6F6F] hover:opacity-80 transition-all px-3 py-1.5 rounded-lg border border-[#EF6F6F]/30"
            >
              {sj.resetData || "Obriši podatke džuza"}
            </button>
          )}
        </div>
      </div>

      {/* Summary card */}
      <div className={`rounded-2xl border p-4 sm:p-5 ${heroSt !== STATUS.prazna ? "" : tCard}`}
        style={heroSt !== STATUS.prazna ? {
          backgroundColor: statusCardBg(heroSt.hex, isLight),
          borderColor: statusBorder(heroSt.hex, isLight),
          borderLeft: `4px solid ${heroSt.hex}`,
        } : undefined}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <span className={`text-xs uppercase tracking-wider font-semibold ${tMuted} flex items-center`}>
              {sj.juz || "Džuz"}
              <HelpTip text="Klikni bilo koju stranicu ispod da je otvoriš i pojedinačno označiš (status, bilješke, ajeti). 'Označi cijeli džuz' ispod postavlja isti status na SVE stranice odjednom." />
            </span>
            <h2 className={`text-3xl font-black leading-none mt-0.5 ${tText}`}>{juzNo}</h2>
          </div>
          <div className="flex gap-4 sm:gap-6">
            {[
              { label: sj.learned    || "Naučene",  value: learnedCount,    color: "text-[#49C79A]" },
              { label: sj.inProgress || "U toku",   value: inProgressCount, color: "text-[#F5B453]" },
              { label: sj.total      || "Ukupno",   value: pages.length,    color: tMuted },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-end">
                <span className={`text-xl font-black ${color}`}>{value}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${tSubtle}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`w-full h-1.5 rounded-full ${isLight ? "bg-black/8" : "bg-white/5"}`}>
          <div className="h-full rounded-full bg-[#1D9E75] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className={`text-[10px] mt-2 font-semibold ${tSubtle}`}>{pct}% · {sj.learnedOf ? sj.learnedOf(learnedCount, pages.length) : `${learnedCount}/${pages.length} naučenih stranica`}</p>
        {juzLastUpdated && (
          <p className={`text-[10px] mt-1 ${tSubtle}`}>{sj.lastUpdated || "Zadnje ažurirano"}: {fmtDateTime(juzLastUpdated)}</p>
        )}

        {/* Brzo označavanje CIJELOG džuza - kaskadno na sve stranice (+ ajete za "Naučen") */}
        {onQuickStatusAll && (
          <div className={`mt-4 pt-4 border-t flex flex-col gap-2 ${tBorder}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${tMuted} flex items-center`}>
                {sj.markWholeJuz || "Označi cijeli džuz"}
                <HelpTip text="Kaskadno postavlja isti status na svih stranica ovog džuza odjednom — 'Naučen' pritom označava i sve ajete. Za pojedinačno označavanje, otvori jednu stranicu ispod." />
              </span>
              {bulkSaving && (
                <span className="w-3 h-3 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
              )}
            </div>
            <div className={bulkSaving ? "opacity-50 pointer-events-none" : ""}>
              <StatusPicker
                layout="pills"
                value={getDominantStatus(pages, pageStatuses)}
                onChange={handleQuickStatusAll}
                s={s}
                isLight={isLight}
              />
            </div>
            <p className={`text-[9px] ${tSubtle}`}>
              {sj.markWholeJuzHint || "\"Naučen\" postavlja i sve ajete džuza. Ostali statusi mijenjaju samo stranice."}
            </p>
          </div>
        )}
      </div>

      {/* Grid kockice */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {pages.map(p => {
          const pd          = pageStatuses[p];
          const stat        = pd?.status || "prazna";
          const st          = STATUS[stat];
          const statusLabel = sl[stat]?.f || st.labelF || st.label;
          const isActive    = stat !== "prazna";
          const surahs     = getSurahsForPage(p);
          const surahNames = surahs.map(s => s.name).join(" · ");
          const ayatCount  = verseCounts[p];

          return (
            <button
              key={p}
              onClick={() => onOpenPage(p)}
              className={`group relative flex flex-col rounded-2xl border text-left transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] overflow-hidden ${isActive ? "" : `${tCardAlt} ${tBorder}`}`}
              style={{
                minHeight: "170px",
                ...(isActive ? {
                  backgroundColor: statusCardBg(st.hex, isLight),
                  borderColor: statusBorder(st.hex, isLight),
                  borderLeft: `4px solid ${st.hex}`,
                } : {}),
              }}
            >
              {/* Gornji dio: broj stranice + arapski broj */}
              <div className="flex items-start justify-between px-4 pt-4 pb-2">
                <span className={`text-3xl font-black leading-none ${tText}`} style={isActive ? { color: st.hex } : undefined}>{p}</span>
                <span
                  className={`text-2xl font-bold leading-none opacity-25 ${tMuted}`}
                  style={{ fontFamily: "'Amiri', serif", ...(isActive ? { color: st.hex } : {}) }}
                >
                  {toArabicNumerals(p)}
                </span>
              </div>

              {/* Sura naziv */}
              <div className="px-4 flex-1">
                {surahNames ? (
                  <span className={`text-[11px] font-bold leading-snug ${tText}`} style={isActive ? { color: st.hex } : undefined}>
                    {surahNames}
                  </span>
                ) : (
                  <span className={`text-[10px] ${tSubtle}`}>—</span>
                )}
              </div>

              {/* Džuz · ajeti - mali tag */}
              <div className="px-4 pb-2 pt-2">
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest ${tSubtle}`}>
                  Džuz {juzNo}
                  {ayatCount != null ? (
                    <><span className="opacity-40">·</span><span>{ayatCount} ajeta</span></>
                  ) : (
                    <><span className="opacity-40">·</span><span className="opacity-40">···</span></>
                  )}
                </span>
              </div>

              {/* Status pill - fiksna nijansa boje, ista na svim temama */}
              <div className={`mx-3 mb-3 flex items-center gap-2 rounded-lg px-2.5 py-1.5`}
                style={{ backgroundColor: isActive ? statusPillBg(st.hex, isLight) : (isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)") }}>
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: st.hex, opacity: isActive ? 0.9 : 0.4 }}
                />
                <span className={`text-[10px] font-semibold leading-none ${isActive ? "" : tSubtle}`}
                  style={isActive ? { color: st.hex } : undefined}>
                  {statusLabel}
                </span>
              </div>

              {/* Datumi i napomena */}
              {(pd?.startDate || pd?.lastRepeat || pd?.shortNote) && (
                <div className={`flex flex-col gap-0.5 mx-3 mb-3 pt-2 border-t ${tBorder}`}>
                  {pd?.startDate && (
                    <span className={`text-[9px] leading-tight ${tMuted}`}>▶ {fmtDate(pd.startDate)}</span>
                  )}
                  {pd?.lastRepeat && (
                    <span className={`text-[9px] leading-tight ${tMuted}`}>↻ {fmtDate(pd.lastRepeat)}</span>
                  )}
                  {pd?.shortNote && (
                    <span className={`text-[9px] leading-tight truncate ${tMuted}`} title={pd.shortNote}>
                      {pd.shortNote}
                    </span>
                  )}
                </div>
              )}

              {/* Hover arrow */}
              <span className={`absolute top-3 right-3 text-xs opacity-0 group-hover:opacity-25 transition-all ${tMuted}`}>→</span>
            </button>
          );
        })}
      </div>

      {/* Upozorenje: označavanje cijelog džuza kao "Naučen" kaskadno mijenja i sve ajete */}
      {confirmStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl border p-6 sm:p-7 max-w-sm w-full flex flex-col gap-4 ${tCard}`}>
            <h3 className={`text-base font-bold ${tText}`}>
              {sj.memorizeWarningTitle || `Označiti cijeli Džuz ${juzNo} kao Naučeno?`}
            </h3>
            <p className={`text-sm leading-relaxed ${tMuted}`}>
              {sj.memorizeWarningBody
                || `Svi ajeti na svih ${pages.length} stranica ovog džuza će automatski biti označeni kao Naučeno, bez obzira šta je prije pisalo. Bilo koji drugi status mijenja samo status stranica — ajeti ostaju netaknuti.`}
            </p>
            <label className={`flex items-center gap-2 text-xs cursor-pointer select-none ${tMuted}`}>
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={e => setDontShowAgain(e.target.checked)}
                className="accent-[#1D9E75] w-3.5 h-3.5"
              />
              {sj.dontShowAgain || "Ne prikazuj ovo ponovo (može se vratiti u Postavkama)"}
            </label>
            <div className="flex gap-3 pt-1">
              <button
                onClick={confirmCancel}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${isLight ? "bg-black/8 text-black/60 hover:opacity-70" : "bg-white/8 text-white/60 hover:opacity-70"}`}
              >
                {sj.cancel || "Odustani"}
              </button>
              <button
                onClick={confirmProceed}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#1D9E75] text-white hover:bg-[#1A8E68] transition"
              >
                {sj.confirmMemorize || "Da, označi sve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brisanje podataka džuza - upozorenje se NE MOŽE ugasiti/preskočiti */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl border p-6 sm:p-7 max-w-sm w-full flex flex-col gap-4 ${tCard}`}>
            <h3 className={`text-base font-bold ${tText}`}>
              {sj.resetWarningTitle || `Obrisati sve podatke Džuza ${juzNo}?`}
            </h3>
            <p className={`text-sm leading-relaxed ${tMuted}`}>
              {sj.resetWarningBody
                || `Status i napredak svih ${pages.length} stranica i ajeta ovog džuza, historija ponavljanja i bilješke bit će trajno obrisani. Ova radnja se ne može poništiti.`}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={cancelReset}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${isLight ? "bg-black/8 text-black/60 hover:opacity-70" : "bg-white/8 text-white/60 hover:opacity-70"}`}
              >
                {sj.cancel || "Odustani"}
              </button>
              <button
                onClick={proceedToFinalReset}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#EF6F6F] text-white hover:bg-[#e05a5a] transition"
              >
                {sj.confirmReset || "Da, obriši podatke"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalna, druga potvrda - eksplicitno podsjeti koji džuz se briše prije
          nego što se brisanje stvarno izvrši. Ne može se preskočiti. */}
      {resetFinalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl border p-6 sm:p-7 max-w-sm w-full flex flex-col gap-4 ${tCard}`}>
            <h3 className={`text-base font-bold ${tText}`}>
              {sj.resetFinalTitle || "Jeste li sigurni?"}
            </h3>
            <p className={`text-sm leading-relaxed ${tMuted}`}>
              {sj.resetFinalBody
                ? sj.resetFinalBody(juzNo)
                : `Provjeri još jednom — ovo je ${juzNo}. džuz (${pages.length} stranica). Klikom na "Da, siguran/na sam" njegov napredak bit će trajno obrisan.`}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={cancelReset}
                disabled={resetting}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${isLight ? "bg-black/8 text-black/60 hover:opacity-70" : "bg-white/8 text-white/60 hover:opacity-70"}`}
              >
                {sj.cancel || "Odustani"}
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#EF6F6F] text-white hover:bg-[#e05a5a] transition disabled:opacity-50"
              >
                {resetting ? (sj.deleting || "Brisanje...") : (sj.confirmResetFinal || "Da, siguran/na sam")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
