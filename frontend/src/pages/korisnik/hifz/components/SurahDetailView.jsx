// ============================================================================
// Detaljan prikaz jedne sure - lista svih njenih ajeta sa statusom i napretkom.
// Uz pojedinačni unos, status se može postaviti i za cijelu suru odjednom, jer
// se sure često uče i ponavljaju u cjelini.
// ============================================================================

import { useState } from "react";
import { STATUS } from "../../../../constants/hifz/STATUS";
import { toArabicNumerals, fmtDate, fmtDateTime, getSurahsForPage, statusCardBg, statusBorder, getDominantStatus } from "../../../../constants/hifz/helpers";
import { usePageVerseCounts } from "../../../../hooks/hifz/usePageVerseCounts";
import { ConfidenceDots } from "../../../../components/hifz/shared/ConfidenceDots";
import { ConfidencePicker } from "../../../../components/hifz/shared/ConfidencePicker";
import { Counter } from "../../../../components/hifz/shared/Counter";
import { RepeatHistoryInput } from "../../../../components/hifz/shared/RepeatHistoryInput";
import { StatusPicker } from "../../../../components/hifz/shared/StatusPicker";
import HelpTip from "../../../../components/shared/HelpTip";

export function SurahDetailView({ surah, pageStatuses, surahData, onSave, onQuickStatusAll, onResetSurah, onBack, onOpenPage, theme, s }) {
  const d        = surahData || {};
  const isLight  = theme?.id === "beige_white" || theme?.id === "pink_soft";
  const [bulkSaving, setBulkSaving] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetFinalOpen, setResetFinalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleQuickStatusAll = async (status) => {
    if (!onQuickStatusAll || bulkSaving) return;
    setBulkSaving(true);
    try {
      await onQuickStatusAll(status);
    } finally {
      setBulkSaving(false);
    }
  };

  const handleResetConfirm = async () => {
    if (!onResetSurah || resetting) return;
    setResetting(true);
    try {
      await onResetSurah();
    } finally {
      setResetting(false);
      setResetFinalOpen(false);
    }
  };

  const proceedToFinalReset = () => { setResetConfirmOpen(false); setResetFinalOpen(true); };
  const cancelReset = () => { setResetConfirmOpen(false); setResetFinalOpen(false); };

  // ── Tema ────────────────────────────────────────────────────────────────
  const tCard    = theme?.card    || "bg-white/[0.04] border border-white/10";
  const tCardAlt = theme?.cardAlt || "bg-white/[0.02] border border-white/8";
  const tText    = theme?.text    || "text-white";
  const tMuted   = theme?.muted   || "text-white/40";
  const tSubtle  = isLight ? "text-black/35"   : "text-white/25";
  const tBorder  = isLight ? "border-black/8"  : "border-white/[0.06]";
  const tInput   = isLight
    ? "border-black/10 bg-black/5 text-[#3D2E22] placeholder:text-[#B0A090] focus:border-[#1D9E75]/50"
    : "border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#1D9E75]/50";

  const ss = s?.surah || {};
  const sl = s?.statusLabel || {};

  // ── Stranice sure ────────────────────────────────────────────────────────
  const pages       = Array.from({ length: surah.endPage - surah.startPage + 1 }, (_, i) => surah.startPage + i);
  const verseCounts = usePageVerseCounts();

  const learnedCount  = pages.filter(p => {
    const st = pageStatuses[p]?.status;
    return st === "naucen" || st === "savladano";
  }).length;
  const reviewCount   = pages.filter(p => pageStatuses[p]?.status === "ponavljanje").length;
  const inProgCount   = pages.filter(p => pageStatuses[p]?.status === "u_toku").length;
  const pct           = pages.length > 0 ? Math.round((learnedCount / pages.length) * 100) : 0;

  // ── Lokalni state za edit ────────────────────────────────────────────────
  const [editOpen,     setEditOpen]     = useState(false);
  const [repeatCount,  setRepeatCount]  = useState(d.repeatCount  || 0);
  const [lastRepeat,   setLastRepeat]   = useState(d.lastRepeat   || "");
  const [confidence,   setConfidence]   = useState(d.confidence   || 0);
  const [errors,       setErrors]       = useState(d.errors       || 0);
  const [shortNote,    setShortNote]    = useState(d.shortNote    || "");
  const [notes,        setNotes]        = useState(d.notes        || "");
  const [history,      setHistory]      = useState(d.history      || []);
  const [saved,        setSaved]        = useState(false);

  const handleSave = () => {
    onSave?.(surah.id, { repeatCount, lastRepeat, confidence, errors, shortNote, notes, history });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── Boja hero kartice - odražava dominantan status stranica sure (ono što je
  // stvarno odabrano preko "Označi cijelu suru"), a ne samo % naučenosti ──────
  const heroSt = STATUS[getDominantStatus(pages, pageStatuses)];

  return (
    <div className="flex flex-col gap-4">

      {/* BACK */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#1D9E75] hover:opacity-70 transition-all w-fit">
          {ss.backToSurahs || "← Nazad na sure"}
        </button>
        {onResetSurah && (
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#EF6F6F] hover:opacity-80 transition-all px-3 py-1.5 rounded-lg border border-[#EF6F6F]/30"
          >
            {ss.resetData || "Obriši podatke sure"}
          </button>
        )}
      </div>

      {/* ── HERO CARD ───────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-4 sm:p-5 ${heroSt !== STATUS.prazna ? "" : tCard}`}
        style={heroSt !== STATUS.prazna ? {
          backgroundColor: statusCardBg(heroSt.hex, isLight),
          borderColor: statusBorder(heroSt.hex, isLight),
          borderLeft: `4px solid ${heroSt.hex}`,
        } : undefined}>
        <div className="flex flex-wrap items-start gap-4 sm:gap-6">

          {/* Ime i broj sure */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-lg font-black flex-shrink-0
              ${isLight ? "bg-black/8 text-black/60" : "bg-white/8 text-white/60"}`}>
              {surah.id}
            </div>
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-0.5 ${tMuted}`}>
                {ss.surahLabel || "Sura"}
              </p>
              <h2 className={`text-2xl sm:text-3xl font-black leading-none ${tText}`}>{surah.name}</h2>
              <p className={`text-xs mt-1 ${tSubtle}`}>
                {ss.pagesLabel || "Stranice"} {surah.startPage}–{surah.endPage}
                {" · "}
                {surah.verses} {ss.versesLabel || "ajeta"}
              </p>
            </div>
          </div>

          {/* Separatori + stats */}
          <div className={`hidden sm:block h-14 w-px ${isLight ? "bg-black/10" : "bg-white/10"}`} />

          <div className="flex gap-5 sm:gap-8 flex-wrap">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-[#49C79A]">{learnedCount}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${tSubtle}`}>
                {ss.learned || "Naučeno"}
              </span>
            </div>
            {reviewCount > 0 && (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-[#67A6E6]">{reviewCount}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${tSubtle}`}>
                  {ss.review || "Ponavljanje"}
                </span>
              </div>
            )}
            {inProgCount > 0 && (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-[#F5B453]">{inProgCount}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${tSubtle}`}>
                  {s?.juz?.inProgress || "U toku"}
                </span>
              </div>
            )}
            <div className="flex flex-col items-center">
              <span className={`text-2xl font-black ${tText}`}>{pages.length}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${tSubtle}`}>
                {ss.pagesLabel || "Stranice"}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className={`text-2xl font-black ${pct === 100 ? "text-[#49C79A]" : pct > 0 ? "text-[#F5B453]" : tMuted}`}>
                {pct}%
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${tSubtle}`}>
                {ss.completionLabel || "Završeno"}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className={`mt-4 w-full h-1.5 rounded-full ${isLight ? "bg-black/10" : "bg-white/8"}`}>
          <div
            className="h-full rounded-full bg-[#1D9E75] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Brzo označavanje CIJELE sure - kaskadno postavlja sve stranice + sve ajete */}
        {onQuickStatusAll && (
          <div className={`mt-4 pt-4 border-t flex flex-col gap-2 ${isLight ? "border-black/8" : "border-white/[0.08]"}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${tMuted}`}>
                {ss.markWholeSurah || "Označi cijelu suru"}
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
              {ss.markWholeSurahHint || "Ovo mijenja status svih stranica i ajeta ove sure odjednom."}
            </p>
          </div>
        )}

        {/* Quick stats (ako ima podataka) */}
        {(repeatCount > 0 || lastRepeat || confidence > 0) && (
          <div className={`flex gap-5 mt-4 pt-4 border-t flex-wrap ${isLight ? "border-black/8" : "border-white/[0.08]"}`}>
            {repeatCount > 0 && (
              <div>
                <span className="text-lg font-black text-[#378ADD]">{repeatCount}×</span>
                <p className={`text-[10px] uppercase tracking-wider ${tSubtle}`}>{ss.totalReps || "Ponavljanja"}</p>
              </div>
            )}
            {lastRepeat && (
              <div>
                <span className={`text-sm font-bold ${tText}`}>{fmtDate(lastRepeat)}</span>
                <p className={`text-[10px] uppercase tracking-wider ${tSubtle}`}>{ss.lastRepeat || "Zadnje pon."}</p>
              </div>
            )}
            {confidence > 0 && (
              <div>
                <ConfidenceDots value={confidence} />
                <p className={`text-[10px] uppercase tracking-wider mt-1 ${tSubtle}`}>{ss.confidence || "Sigurnost"}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── EDIT ACCORDION ──────────────────────────────────────────────────── */}
      <div className={`rounded-2xl overflow-hidden transition-all ${editOpen ? `border ${tCard}` : ""}`}>
        <div className="flex items-center">
          <button
            onClick={() => setEditOpen(v => !v)}
            className={`flex items-center gap-2 px-1 py-2.5 text-left transition-all hover:opacity-70`}
          >
            <span className={`text-base transition-transform duration-200 flex-shrink-0 ${editOpen ? "rotate-90" : ""} ${tSubtle}`}>›</span>
            <span className={`text-sm font-semibold ${editOpen ? "text-[#49C79A]" : tMuted}`}>
              {ss.editTitle || "Uredi podatke sure"}
            </span>
          </button>
          <HelpTip text="Ovdje uređuješ podatke za CIJELU suru odjednom: broj ponavljanja, datum zadnjeg ponavljanja, sigurnost (koliko dobro znaš), bilješke i historiju ponavljanja. Za pojedinačne ajete otvori stranicu ili ajet posebno." />
        </div>

        {editOpen && (
          <div className={`border-t px-4 sm:px-5 py-4 flex flex-col gap-5 ${tBorder}`}>

            {/* 2 kolone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* LIJEVO: Ponavljanja + Sigurnost */}
              <div className="flex flex-col gap-5">

                {/* Ponavljanja */}
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle}`}>
                    {ss.repeatSection || "Ponavljanja"}
                  </p>
                  <div className="flex flex-col gap-0">
                    <div className={`flex items-center justify-between py-2.5 border-t ${tBorder}`}>
                      <span className={`text-sm ${tMuted}`}>{ss.totalReps || "Ukupno ponavljanja"}</span>
                      <Counter value={repeatCount} setter={setRepeatCount} small isLight={isLight} />
                    </div>
                    <div className={`flex items-center justify-between py-2.5 border-t ${tBorder}`}>
                      <span className={`text-sm ${errors > 0 ? "text-[#F58C8C]" : tMuted}`}>
                        {ss.repeatErrors?.replace(":", "") || "Greške"}
                      </span>
                      <Counter value={errors} setter={setErrors} small isLight={isLight} />
                    </div>
                  </div>
                </div>

                {/* Zadnje ponavljanje */}
                <div className={`pt-4 border-t ${tBorder}`}>
                  <label className={`text-[10px] font-semibold uppercase tracking-widest block mb-2 ${tSubtle}`}>
                    {ss.lastRepeat || "Zadnje ponavljanje"}
                  </label>
                  <input type="date" value={lastRepeat} onChange={e => setLastRepeat(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all ${tInput}`} />
                </div>

                {/* Sigurnost */}
                <div className={`pt-4 border-t ${tBorder}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${tSubtle}`}>
                    {ss.confidence || "Sigurnost"}
                  </p>
                  <p className={`text-xs mb-3 ${tMuted}`}>{ss.confidenceLabel || "Nivo sigurnosti (1–5)"}</p>
                  <ConfidencePicker value={confidence} onChange={setConfidence} isLight={isLight} />
                </div>
              </div>

              {/* DESNO: Bilješka + Historija */}
              <div className="flex flex-col gap-5">

                {/* Bilješka */}
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle}`}>
                    {ss.notes || "Bilješka"}
                  </p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className={`text-xs block mb-1.5 ${tMuted}`}>{ss.shortNote || "Kratka napomena"}</label>
                      <input type="text" value={shortNote} onChange={e => setShortNote(e.target.value)}
                        placeholder={ss.shortNotePh || "Kratka napomena..."}
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all ${tInput}`} />
                    </div>
                    <div>
                      <label className={`text-xs block mb-1.5 ${tMuted}`}>{ss.detailedNotes || "Više detalja"}</label>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                        placeholder={ss.detailedNotesPh || "Detaljna zapažanja..."}
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all resize-none ${tInput}`} />
                    </div>
                  </div>
                </div>

                {/* Historija ponavljanja */}
                <div className={`pt-4 border-t ${tBorder}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle}`}>
                    {ss.addRepeat || "Dodaj ponavljanje"}
                    {history.length > 0 && (
                      <span className="text-[#378ADD] normal-case ml-1.5">({history.length})</span>
                    )}
                  </p>
                  <RepeatHistoryInput
                    history={history} setHistory={setHistory}
                    setRepeatCount={setRepeatCount} setLastRepeat={setLastRepeat} setErrors={setErrors}
                    s={{ ...s, verse: { ...s?.verse, addRepeatBtn: ss.addRepeatBtn, errors: ss.repeatErrors?.replace(":", ""), notePh: ss.notePh } }}
                  />
                  {history.length > 0 ? (
                    <div className="mt-3 flex flex-col">
                      {history.map(h => (
                        <div key={h.id} className={`flex items-center gap-2.5 py-2 border-t group ${tBorder}`}>
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${h.errors > 0 ? "bg-[#F58C8C]" : "bg-[#378ADD]"}`} />
                          <span className={`text-xs font-semibold flex-shrink-0 ${tText}`}>{fmtDateTime(h.date)}</span>
                          {h.note && <span className={`text-xs flex-1 truncate ${tMuted}`}>{h.note}</span>}
                          {!h.note && <span className="flex-1" />}
                          {h.errors > 0 && <span className="text-[10px] text-[#F58C8C] flex-shrink-0">⚠{h.errors}</span>}
                          <button onClick={() => setHistory(prev => prev.filter(x => x.id !== h.id))}
                            className="text-[10px] text-[#F58C8C] opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all flex-shrink-0">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`mt-3 text-xs ${tMuted}`}>{ss.noHistory || "Nema historije ponavljanja."}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sačuvaj */}
            <div className={`flex justify-end gap-3 pt-4 border-t ${tBorder}`}>
              <button onClick={() => setEditOpen(false)}
                className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${tBorder} ${tMuted} hover:opacity-70`}>
                {ss.cancel || "Odustani"}
              </button>
              <button onClick={handleSave}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all border
                  ${saved
                    ? `border-[#1D9E75]/30 text-[#1D9E75] ${isLight ? "bg-[#1D9E75]/10" : "bg-[#1D9E75]/15"}`
                    : `${theme?.button || "bg-[#1D9E75] text-white hover:bg-[#1A8E68]"} border-transparent`}`}>
                {saved ? (ss.saved || "✓ Sačuvano") : (ss.save || "Sačuvaj")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── HISTORIJA PONAVLJANJA (pregled) + BILJEŠKA ──────────────────────── */}
      {(history.length > 0 || shortNote || notes) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Historija - 3/5 */}
          {history.length > 0 && (
            <div className={`lg:col-span-3 rounded-2xl border p-4 ${tCard}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-[10px] font-semibold uppercase tracking-widest ${tSubtle}`}>
                  {ss.repeatHistory || "Historija ponavljanja sure"}
                </h3>
                <span className="text-xs font-bold text-[#378ADD]">{history.length}×</span>
              </div>
              <div className="relative pl-5">
                <div className={`absolute left-[5px] top-1 bottom-1 w-px ${isLight ? "bg-black/10" : "bg-white/10"}`} />
                <div className={`flex flex-col gap-4 ${history.length > 10 ? "max-h-[340px] overflow-y-auto pr-1" : ""}`}>
                  {history.map((h, i) => (
                    <div key={h.id} className="relative">
                      <div className={`absolute -left-[19px] top-[5px] w-2.5 h-2.5 rounded-full z-10
                        ${h.errors > 0 ? "bg-[#F58C8C]" : i === 0 ? "bg-[#1D9E75]" : isLight ? "bg-[#C8BCAC]" : "bg-[#444]"}`}
                      />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold leading-none ${tText}`}>{fmtDateTime(h.date)}</p>
                          {h.note && <p className={`text-xs mt-1.5 leading-snug ${tMuted}`}>{h.note}</p>}
                        </div>
                        {h.errors > 0 && (
                          <span className="text-xs font-semibold text-[#F58C8C] flex-shrink-0 mt-0.5">⚠ {h.errors}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bilješka - 2/5 */}
          {(shortNote || notes) && (
            <div className={`${history.length > 0 ? "lg:col-span-2" : "lg:col-span-5"} rounded-2xl border p-4 ${tCard}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle}`}>
                {ss.notes || "Bilješka"}
              </p>
              {shortNote && (
                <p className={`text-sm font-semibold leading-snug mb-2 ${tText}`}>{shortNote}</p>
              )}
              {notes && (
                <p className={`text-xs leading-relaxed whitespace-pre-wrap ${tMuted}`}>{notes}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── GRID STRANICA SURE ──────────────────────────────────────────────── */}
      <div className={`rounded-2xl border overflow-hidden ${tCard}`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${tBorder}`}>
          <div>
            <h3 className={`text-sm font-bold ${tText}`}>{ss.surahPagesTitle || "Stranice sure"}</h3>
            <p className={`text-[10px] mt-0.5 ${tSubtle}`}>{ss.clickPage || "Klikni stranicu za detalje"}</p>
          </div>
          <span className={`text-xs font-bold ${tMuted}`}>{pages.length} {s?.juz?.pages || "str."}</span>
        </div>

        <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {pages.map(p => {
            const pd       = pageStatuses[p];
            const stat     = pd?.status || "prazna";
            const stObj    = STATUS[stat];
            const isActive = stat !== "prazna";
            const vc       = verseCounts[p];
            const surahs   = getSurahsForPage(p);
            const mainSura = surahs?.[0];
            const statusLabelF = sl[stat]?.f || stObj.labelF || stObj.label;

            return (
              <button key={p}
                onClick={() => onOpenPage(p)}
                className={`group relative flex flex-col rounded-2xl border p-3 sm:p-4 text-left transition-all
                  hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
                  ${isActive ? "" : `${tCardAlt} ${tBorder}`}`}
                style={{
                  minHeight: "140px",
                  ...(isActive ? {
                    backgroundColor: statusCardBg(stObj.hex, isLight),
                    borderColor: statusBorder(stObj.hex, isLight),
                    borderLeft: `4px solid ${stObj.hex}`,
                  } : {}),
                }}
              >
                {/* Broj stranice + arapski */}
                <div className="flex items-baseline justify-between mb-2">
                  <span className={`text-2xl sm:text-3xl font-black leading-none ${tText}`} style={isActive ? { color: stObj.hex } : undefined}>{p}</span>
                  <span className={`text-base opacity-25 ${tMuted}`} style={{ fontFamily: "'Amiri', serif", ...(isActive ? { color: stObj.hex } : {}) }}>
                    {toArabicNumerals(p)}
                  </span>
                </div>

                {/* Ime sure */}
                {mainSura && (
                  <span className={`text-[10px] font-semibold mb-1 leading-tight ${isActive ? "" : tSubtle} opacity-80 line-clamp-1`}
                    style={isActive ? { color: stObj.hex } : undefined}>
                    {mainSura.name}
                  </span>
                )}

                {/* Ajeti */}
                {vc && (
                  <span className={`text-[10px] ${isActive ? "" : tSubtle} opacity-60 mb-auto`}
                    style={isActive ? { color: stObj.hex } : undefined}>
                    {vc} {s?.page?.versesLabel || "ajeta"}
                  </span>
                )}

                {/* Status pill */}
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: stObj.hex, opacity: isActive ? 0.9 : 0.4 }} />
                  <span className={`text-[10px] font-semibold ${isActive ? "" : tSubtle}`}
                    style={isActive ? { color: stObj.hex } : undefined}>
                    {statusLabelF}
                  </span>
                </div>

                {/* Datumi */}
                {(pd?.startDate || pd?.lastRepeat) && (
                  <div className={`flex flex-col gap-0.5 mt-2 pt-2 border-t ${tBorder}`}>
                    {pd?.startDate  && <span className={`text-[9px] ${tMuted}`}>▶ {fmtDate(pd.startDate)}</span>}
                    {pd?.lastRepeat && <span className={`text-[9px] ${tMuted}`}>↻ {fmtDate(pd.lastRepeat)}</span>}
                  </div>
                )}

                {/* Arrow hover */}
                <span className={`absolute top-3 right-3 text-xs opacity-0 group-hover:opacity-30 transition-all ${tMuted}`}>→</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brisanje podataka sure - upozorenje se NE MOŽE ugasiti/preskočiti */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl border p-6 sm:p-7 max-w-sm w-full flex flex-col gap-4 ${theme?.card || "bg-[#1a1a1a] border-white/10"}`}>
            <h3 className={`text-base font-bold ${theme?.text || "text-white"}`}>
              {ss.resetWarningTitle || "Obrisati sve podatke ove sure?"}
            </h3>
            <p className={`text-sm leading-relaxed ${theme?.muted || "text-white/50"}`}>
              {ss.resetWarningBody
                || "Status i napredak svih stranica i ajeta ove sure, historija ponavljanja i bilješke bit će trajno obrisani. Ova radnja se ne može poništiti."}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={cancelReset}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${isLight ? "bg-black/8 text-black/60 hover:opacity-70" : "bg-white/8 text-white/60 hover:opacity-70"}`}
              >
                {ss.cancel || "Odustani"}
              </button>
              <button
                onClick={proceedToFinalReset}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#EF6F6F] text-white hover:bg-[#e05a5a] transition"
              >
                {ss.confirmReset || "Da, obriši podatke"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalna, druga potvrda - eksplicitno podsjeti koja sura se briše prije
          nego što se brisanje stvarno izvrši. Ne može se preskočiti. */}
      {resetFinalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl border p-6 sm:p-7 max-w-sm w-full flex flex-col gap-4 ${theme?.card || "bg-[#1a1a1a] border-white/10"}`}>
            <h3 className={`text-base font-bold ${theme?.text || "text-white"}`}>
              {ss.resetFinalTitle || "Jeste li sigurni?"}
            </h3>
            <p className={`text-sm leading-relaxed ${theme?.muted || "text-white/50"}`}>
              {ss.resetFinalBody
                ? ss.resetFinalBody(surah?.name)
                : `Provjeri još jednom — ovo je sura ${surah?.name || surah?.id}. Klikom na "Da, siguran/na sam" njen napredak bit će trajno obrisan.`}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={cancelReset}
                disabled={resetting}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${isLight ? "bg-black/8 text-black/60 hover:opacity-70" : "bg-white/8 text-white/60 hover:opacity-70"}`}
              >
                {ss.cancel || "Odustani"}
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#EF6F6F] text-white hover:bg-[#e05a5a] transition disabled:opacity-50"
              >
                {resetting ? (ss.deleting || "Brisanje...") : (ss.confirmResetFinal || "Da, siguran/na sam")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
