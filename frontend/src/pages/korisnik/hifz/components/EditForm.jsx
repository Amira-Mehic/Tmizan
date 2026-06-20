import { useState, useEffect } from "react";
import { STATUS } from "../../../../constants/hifz/STATUS";
import { todayStr, fmtDate } from "../../../../constants/hifz/helpers";
import { Counter } from "../../../../components/hifz/shared/Counter";
import { StatusPicker } from "../../../../components/hifz/shared/StatusPicker";
import { ConfidencePicker } from "../../../../components/hifz/shared/ConfidencePicker";
import { RepeatHistoryInput } from "../../../../components/hifz/shared/RepeatHistoryInput";

export function EditForm({ pageNum, pageData, onSave, theme, s }) {
  const [open,          setOpen]          = useState(false);
  const [isDirty,       setIsDirty]       = useState(false);
  const [confirmClose,  setConfirmClose]  = useState(false);

  const d       = pageData || {};
  const isLight = theme?.id === "beige_white" || theme?.id === "pink_soft";

  const tCard     = theme?.cardAlt || "bg-white/[0.02] border border-white/8";
  const tCardSub  = theme?.cardSub || "bg-white/[0.01] border border-white/6";
  const tText     = theme?.text    || "text-white";
  const tMuted    = theme?.muted   || "text-white/40";
  const tSubtle   = isLight ? "text-black/35" : "text-white/25";
  const tBorder   = isLight ? "border-black/10" : "border-white/[0.06]";
  const tInput    = isLight
    ? "border-black/15 bg-black/5 text-[#3D3A35] placeholder:text-[#B0A898] focus:border-[#1D9E75]/60"
    : "border-white/10 bg-white/5 text-white placeholder:text-white/15 focus:border-[#1D9E75]/60";
  const tIndicator = isLight ? "bg-black/20" : "bg-white/20";

  const sf = s?.form || {};

  const [status,        setStatus]        = useState(d.status        || "prazna");
  const [startDate,     setStartDate]     = useState(d.startDate     || "");
  const [lastRepeat,    setLastRepeat]    = useState(d.lastRepeat    || "");
  const [repeatCount,   setRepeatCount]   = useState(d.repeatCount   || 0);
  const [newLessonReps, setNewLessonReps] = useState(d.newLessonReps || 0);
  const [postLearnReps, setPostLearnReps] = useState(d.postLearnReps || 0);
  const [confidence,    setConfidence]    = useState(d.confidence    || 0);
  const [difficulty,    setDifficulty]    = useState(d.difficulty    || "srednja");
  const [errors,        setErrors]        = useState(d.errors        || 0);
  const [shortNote,     setShortNote]     = useState(d.shortNote     || "");
  const [notes,         setNotes]         = useState(d.notes         || "");
  const [history,       setHistory]       = useState(d.history       || []);

  useEffect(() => {
    const d2 = pageData || {};
    setStatus(d2.status        || "prazna");
    setStartDate(d2.startDate  || "");
    setLastRepeat(d2.lastRepeat || "");
    setRepeatCount(d2.repeatCount   || 0);
    setNewLessonReps(d2.newLessonReps || 0);
    setPostLearnReps(d2.postLearnReps || 0);
    setConfidence(d2.confidence || 0);
    setDifficulty(d2.difficulty || "srednja");
    setErrors(d2.errors         || 0);
    setShortNote(d2.shortNote   || "");
    setNotes(d2.notes           || "");
    setHistory(d2.history       || []);
    setIsDirty(false);
  }, [pageNum]);

  // Čistači koji označavaju dirty stanje
  const mark = fn => (...args) => { fn(...args); setIsDirty(true); };

  const deleteHistory = (id) => {
    const newHist = history.filter(x => x.id !== id);
    setHistory(newHist);
    setRepeatCount(newHist.length);
    const latest = newHist[0];
    if (latest) { setLastRepeat(latest.date); setErrors(latest.errors || 0); }
    else { setLastRepeat(""); setErrors(0); }
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(pageNum, { status, startDate, lastRepeat, repeatCount, newLessonReps, postLearnReps, confidence, difficulty, errors, shortNote, notes, history });
    setIsDirty(false);
    setConfirmClose(false);
    setOpen(false);
  };

  const handleToggle = () => {
    if (open && isDirty) { setConfirmClose(true); return; }
    setOpen(o => !o);
    setConfirmClose(false);
  };

  const handleDiscard = () => {
    // Resetuj na originalne podatke
    const d2 = pageData || {};
    setStatus(d2.status        || "prazna");
    setStartDate(d2.startDate  || "");
    setLastRepeat(d2.lastRepeat || "");
    setRepeatCount(d2.repeatCount   || 0);
    setNewLessonReps(d2.newLessonReps || 0);
    setPostLearnReps(d2.postLearnReps || 0);
    setConfidence(d2.confidence || 0);
    setDifficulty(d2.difficulty || "srednja");
    setErrors(d2.errors         || 0);
    setShortNote(d2.shortNote   || "");
    setNotes(d2.notes           || "");
    setHistory(d2.history       || []);
    setIsDirty(false);
    setConfirmClose(false);
    setOpen(false);
  };

  return (
    <div className={`rounded-2xl overflow-hidden transition-all ${open ? `border ${tCard}` : ""}`}>

      {/* Accordion toggle */}
      <button onClick={handleToggle}
        className="flex items-center gap-2 px-1 py-2.5 hover:opacity-70 transition-all">
        <span className={`text-base transition-transform duration-200 flex-shrink-0 ${open ? "rotate-90" : ""} ${tSubtle}`}>›</span>
        <span className={`text-sm font-semibold ${open ? "text-[#49C79A]" : tMuted}`}>
          {sf.title || "Uredi podatke stranice"}
        </span>
        {isDirty && (
          <span className="text-[10px] text-[#EF9F27] font-bold flex-shrink-0">● {sf.unsaved || "nespremljeno"}</span>
        )}
        {!isDirty && d.status && d.status !== "prazna" && (
          <span className={`text-[10px] opacity-40 ${tMuted} flex-shrink-0`}>· {s?.statusLabel?.[d.status]?.f || ""}</span>
        )}
      </button>

      {/* Confirm close bez čuvanja */}
      {confirmClose && (
        <div className={`mx-1 mb-2 px-4 py-3 rounded-xl border border-[#EF9F27]/40 bg-[#EF9F27]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
          <p className="text-xs font-semibold text-[#F5B453]">
            {sf.unsavedWarning || "Imaš nespremljene promjene. Šta želiš uraditi?"}
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleDiscard}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${tBorder} ${tMuted} hover:opacity-70`}>
              {sf.discard || "Odbaci promjene"}
            </button>
            <button onClick={handleSave}
              className="px-3 py-1.5 rounded-lg bg-[#1D9E75] text-white text-xs font-bold hover:bg-[#1A8E68] transition-all">
              {sf.save || "Sačuvaj"}
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className={`border-t ${tBorder} px-4 sm:px-5 pb-5 pt-5 flex flex-col gap-5`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* LIJEVO */}
            <div className="flex flex-col gap-4">
              <div>
                <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-2 ${tSubtle}`}>
                  {sf.statusSection || "Status stranice"}
                </label>
                <StatusPicker isLight={isLight} value={status} onChange={mark(key => {
                  setStatus(key);
                  if (key !== "prazna" && !startDate) setStartDate(todayStr());
                })} s={s} />
              </div>
              <div>
                <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-2 ${tSubtle}`}>
                  {sf.datesSection || "Datumi"}
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    { label: sf.firstLearnDate  || "Datum prvog učenja",        value: startDate,  setter: mark(setStartDate) },
                    { label: sf.lastRepeatDate  || "Datum zadnjeg ponavljanja", value: lastRepeat, setter: mark(setLastRepeat) },
                  ].map(({ label, value, setter }) => (
                    <div key={label}>
                      <span className={`text-[10px] block mb-1 ${tSubtle}`}>{label}</span>
                      <input type="date" value={value} onChange={e => setter(e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all ${tInput}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-2 ${tSubtle}`}>
                  {sf.repsSection || "Ponavljanja"}
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    { label: sf.totalReps     || "Ukupan broj",  value: repeatCount,   setter: mark(setRepeatCount) },
                    { label: sf.newLessonReps || "Nove lekcije", value: newLessonReps, setter: mark(setNewLessonReps) },
                    { label: sf.postLearnReps || "Nakon učenja", value: postLearnReps, setter: mark(setPostLearnReps) },
                  ].map(({ label, value, setter }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className={`text-xs ${tMuted}`}>{label}</span>
                      <Counter value={value} setter={setter} isLight={isLight} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-2 ${tSubtle}`}>
                  {sf.assessSection || "Procjena"}
                </label>
                <div className="flex flex-col gap-3">
                  <div>
                    <span className={`text-[10px] block mb-1.5 ${tSubtle}`}>{sf.difficultyLabel || "Težina stranice"}</span>
                    <div className="flex gap-1.5">
                      {[
                        { id: "laka",    label: sf.difficultyEasy || "Laka",   active: "bg-[#1D9E75]/20 text-[#1D9E75] border-[#1D9E75]/40" },
                        { id: "srednja", label: sf.difficultyMed  || "Srednja",active: "bg-[#EF9F27]/20 text-[#EF9F27] border-[#EF9F27]/40" },
                        { id: "teska",   label: sf.difficultyHard || "Teška",  active: "bg-[#F58C8C]/20 text-[#F58C8C] border-[#F58C8C]/40" },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => mark(setDifficulty)(opt.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                            difficulty === opt.id
                              ? opt.active
                              : isLight
                                ? "bg-black/5 border-black/10 text-black/35 hover:bg-black/10"
                                : "bg-white/5 border-white/10 text-white/35 hover:bg-white/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className={`text-[10px] block mb-1.5 ${tSubtle}`}>{sf.confidenceLabel || "Nivo sigurnosti (1–5)"}</span>
                    <ConfidencePicker value={confidence} onChange={mark(setConfidence)} isLight={isLight} />
                  </div>
                  <div className={`flex items-center justify-between pt-1 border-t ${tBorder}`}>
                    <span className={`text-xs ${tMuted}`}>
                      {sf.errors || "Greške"}{errors > 0 && <span className="ml-2 text-[#F58C8C]">⚠ {errors}</span>}
                    </span>
                    <Counter value={errors} setter={mark(setErrors)} isLight={isLight} />
                  </div>
                </div>
              </div>
            </div>

            {/* DESNO */}
            <div className="flex flex-col gap-4">
              <div>
                <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-2 ${tSubtle}`}>
                  {sf.notesSection || "Bilješke"}
                </label>
                <div className="flex flex-col gap-2">
                  <div>
                    <span className={`text-[10px] block mb-1 ${tSubtle}`}>{sf.shortNote || "Kratka napomena"}</span>
                    <input type="text" value={shortNote} onChange={e => { setShortNote(e.target.value); setIsDirty(true); }}
                      placeholder={sf.shortNotePh || "Npr. teško mjesto, počeo sa šejhom..."}
                      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all ${tInput}`} />
                  </div>
                  <div>
                    <span className={`text-[10px] block mb-1 ${tSubtle}`}>{sf.detailedNotes || "Više detalja"}</span>
                    <textarea value={notes} onChange={e => { setNotes(e.target.value); setIsDirty(true); }} rows={4}
                      placeholder={sf.detailedNotesPh || "Detaljna zapažanja..."}
                      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all resize-none ${tInput}`} />
                  </div>
                </div>
              </div>
              <div>
                <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-2 ${tSubtle}`}>
                  {sf.repeatHistory ? sf.repeatHistory(history.length) : `Historija ponavljanja${history.length > 0 ? ` (${history.length})` : ""}`}
                </label>
                <div className={`rounded-xl border p-3 mb-2 ${tCardSub}`}>
                  <RepeatHistoryInput
                    history={history}
                    setHistory={h => { setHistory(h); setIsDirty(true); }}
                    setRepeatCount={mark(setRepeatCount)}
                    setLastRepeat={mark(setLastRepeat)}
                    setErrors={mark(setErrors)}
                    isLight={isLight} s={s}
                  />
                </div>
                {history.length > 0 && (
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {history.map(h => (
                      <div key={h.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border group ${tCardSub}`}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${h.errors > 0 ? "bg-[#F58C8C]" : "bg-[#378ADD]"}`} />
                        <span className={`text-xs font-semibold flex-shrink-0 ${tText}`}>{fmtDate(h.date)}</span>
                        {h.note && <span className={`text-xs flex-1 truncate ${tMuted}`}>{h.note}</span>}
                        {!h.note && <span className="flex-1" />}
                        {h.errors > 0 && <span className="text-[10px] text-[#F58C8C] flex-shrink-0">⚠{h.errors}</span>}
                        <button onClick={() => deleteHistory(h.id)}
                          className="text-[10px] text-[#F58C8C] opacity-0 group-hover:opacity-60 hover:!opacity-100 flex-shrink-0 transition-all">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`flex justify-end gap-3 pt-2 border-t ${tBorder}`}>
            <button onClick={handleToggle}
              className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${tBorder} ${tMuted} hover:opacity-70`}>
              {sf.cancel || "Odustani"}
            </button>
            <button onClick={handleSave}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme?.button || "bg-[#1D9E75] text-white hover:bg-[#1A8E68]"}`}>
              {sf.save || "Sačuvaj"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
