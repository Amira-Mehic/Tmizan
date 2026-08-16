// ============================================================================
// AyahBrowser - horizontalna traka ajet-chipova (broj + status) za jednu
// stranicu, sa proširenim prikazom IZABRANOG ajeta ispod (bez tabova, sve na
// jednom mjestu): arapski tekst, prijevod (bs/en), status, link na tefsir,
// bilješke, datumi, nivo sigurnosti/težina, historija ponavljanja, slični
// ajeti i (ako je userId dat) toggle "greška na ovom ajetu".
//
// Isti pattern kao horizontalna traka dana na PlanRasporedPage ("Uredi dan") -
// traka se skrola vodoravno, klik na chip prebacuje izabrani ajet, a stranični
// kontekst (broj stranice, statistika) ostaje vidljiv iznad/oko ove komponente.
//
// autoSave=true  → auto-snimanje bez ručnog dugmeta (Učenje danas, EditForm).
// autoSave=false → ručno "Sačuvaj promjene" + potvrda pri prelasku na drugi
//                   ajet ili zatvaranju dok ima nespremljenih izmjena (Tracker).
// ============================================================================

import { useState, useEffect, useRef } from "react";
import { useLang } from "../../../context/LanguageContext";
import { STATUS } from "../../../constants/hifz/STATUS";
import { todayStr, fmtDateTime, toArabicNumerals, statusCardBg, statusBorder, statusPillBg, tefsirBaSuraUrl } from "../../../constants/hifz/helpers";
import { ArabicText } from "./ArabicText";
import { TranslationPanel } from "./TranslationPanel";
import { ConfidencePicker } from "./ConfidencePicker";
import { Counter } from "./Counter";
import { StatusPicker } from "./StatusPicker";
import { RepeatHistoryInput } from "./RepeatHistoryInput";
import { FirstTimeHint } from "../../shared/FirstTimeHint";
import HelpTip from "../../shared/HelpTip";

export function AyahBrowser({
  verses,                 // [{ verse_key, verse_number, text_uthmani }]
  verseStatuses,          // { [verse_key]: data }
  onSaveVerse,             // (verseKey, data) => void
  userId = null,           // ako je dat, prikazuje se toggle "greška na ajetu"
  flaggedAyahs = [],        // [verse_key] trenutno označeni kao greška
  onToggleError,            // (verseKey) => void
  initialVerseKey = null,
  autoSave = true,
  onClose = null,          // ako je dat, prikazuje se "Zatvori" - guard pita prije zatvaranja ako ima nespremljenih izmjena
  theme, s, isLight,
}) {
  const { lang } = useLang();
  // Po defaultu ništa nije izabrano - samo traka brojeva je vidljiva, klik na
  // chip otvara prošireni prikaz (isti chip ponovo zatvara ga, kao accordion).
  const [selectedKey, setSelectedKey] = useState(initialVerseKey || null);
  const [pendingKey, setPendingKey] = useState(null);
  const activeChipRef = useRef(null);

  const verse = verses?.find(v => v.verse_key === selectedKey) || null;

  const [status, setStatus] = useState("prazna");
  const [startDate, setStartDate] = useState("");
  const [lastRepeat, setLastRepeat] = useState("");
  const [repeatCount, setRepeatCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [difficulty, setDifficulty] = useState("srednja");
  const [errors, setErrors] = useState(0);
  const [shortNote, setShortNote] = useState("");
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState([]);
  const [similarAyahs, setSimilarAyahs] = useState([]);
  const [personalTefsir, setPersonalTefsir] = useState("");
  const [newSimilar, setNewSimilar] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Kad se promijeni izabrani ajet, popuni lokalni state njegovim podacima.
  // Namjerno se prilagođava TOKOM rendera (ne u useEffect) - standardan React
  // pattern za "reset lokalnog state-a kad se promijeni odabrana stavka",
  // bez dodatnog "praznog" rendera koji bi useEffect verzija imala.
  const [prevSelectedKey, setPrevSelectedKey] = useState(selectedKey);
  if (selectedKey !== prevSelectedKey) {
    setPrevSelectedKey(selectedKey);
    const d2 = (verse && verseStatuses?.[verse.verse_key]) || {};
    setStatus(d2.status || "prazna");
    setStartDate(d2.startDate || "");
    setLastRepeat(d2.lastRepeat || "");
    setRepeatCount(d2.repeatCount || 0);
    setConfidence(d2.confidence || 0);
    setDifficulty(d2.difficulty || "srednja");
    setErrors(d2.errors || 0);
    setShortNote(d2.shortNote || "");
    setNotes(d2.notes || "");
    setHistory(d2.history || []);
    setSimilarAyahs(d2.similarAyahs || []);
    setPersonalTefsir(d2.personalTefsir || "");
    setIsDirty(false);
  }

  // Dovuci izabrani chip do sredine trake (glatko skrolanje) - isti pattern
  // kao horizontalna traka dana na PlanRasporedPage.
  useEffect(() => {
    if (selectedKey && activeChipRef.current) {
      activeChipRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedKey]);

  const mark = fn => (...args) => { fn(...args); setIsDirty(true); };

  const buildPayload = () => ({
    status, startDate, lastRepeat, repeatCount, confidence, difficulty,
    errors, shortNote, notes, history, similarAyahs, personalTefsir,
  });

  const doSave = () => {
    if (!verse) return;
    onSaveVerse(verse.verse_key, buildPayload());
    setIsDirty(false);
  };

  // Auto-save (debounced) - samo kad je autoSave uključen.
  useEffect(() => {
    if (!autoSave || !isDirty || !verse) return;
    const t = setTimeout(() => {
      doSave();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1600);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, isDirty, status, startDate, lastRepeat, repeatCount, confidence, difficulty, errors, shortNote, notes, history, similarAyahs, personalTefsir]);

  const resolvePending = () => {
    if (pendingKey === "__CLOSE__") { onClose?.(); }
    else if (pendingKey === "__COLLAPSE__") { setSelectedKey(null); }
    else if (pendingKey) { setSelectedKey(pendingKey); }
    setPendingKey(null);
  };

  const handleSaveManual = () => {
    doSave();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1600);
    resolvePending();
  };

  const handleDiscardManual = () => {
    setIsDirty(false);
    resolvePending();
  };

  const selectChip = (verseKey) => {
    // Klik na već izabrani chip zatvara prošireni prikaz (accordion) -
    // po defaultu ništa nije otvoreno, samo traka brojeva.
    const next = verseKey === selectedKey ? null : verseKey;
    if (next === selectedKey) return;
    if (!autoSave && isDirty) { setPendingKey(next ?? "__COLLAPSE__"); return; }
    setSelectedKey(next);
  };

  const requestClose = () => {
    if (!autoSave && isDirty) { setPendingKey("__CLOSE__"); return; }
    onClose?.();
  };

  const addSimilar = () => {
    const trimmed = newSimilar.trim();
    if (!trimmed) return;
    setSimilarAyahs(prev => [...prev, { id: Date.now(), key: trimmed }]);
    setNewSimilar("");
    setIsDirty(true);
  };

  const deleteHistory = (id) => {
    const newHist = history.filter(x => x.id !== id);
    setHistory(newHist);
    setRepeatCount(newHist.length);
    const latest = newHist[0];
    if (latest) { setLastRepeat(latest.date); setErrors(latest.errors || 0); }
    else { setLastRepeat(""); setErrors(0); }
    setIsDirty(true);
  };

  if (!verses?.length) return null;

  const st = STATUS[status] || STATUS.prazna;
  const sv = s?.verse || {};

  const tText   = theme?.text  || "text-white";
  const tMuted  = theme?.muted || "text-white/50";
  const tSubtle = isLight ? "text-[#A89880]" : "text-white/25";
  const tBorder = isLight ? "border-black/8" : "border-white/8";
  const tInput  = isLight
    ? "border-black/10 bg-black/5 text-[#3D2E22] placeholder:text-[#B0A090] focus:border-[#1D9E75]/50"
    : "border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#1D9E75]/50";

  const accentBg = (theme?.button || "").split(" ").find(c => c.startsWith("bg-[")) || "bg-[#1D9E75]";
  const _vk = (verse?.verse_key || "").replace(":", "/");
  const tefsirUrl = verse ? (lang === "bs" ? tefsirBaSuraUrl(verse.verse_key) : `https://quran.com/${_vk}`) : "#";
  const tefsirHost = lang === "bs" ? "tefsir.ba" : "quran.com";
  const isFlagged = verse ? flaggedAyahs.includes(verse.verse_key) : false;

  const L = lang === "en" ? {
    unsavedTitle: "You have unsaved changes on this ayah.",
    keepEditing: "Keep editing",
    discardSwitch: "Discard and switch",
    saveSwitch: "Save and switch",
    errorToggle: "Mistake on this ayah",
    errorToggleHint: "Marks this specific ayah — feeds \"Pages & ayahs with mistakes\" on the Dashboard.",
    autoSaveNote: "Changes are saved automatically.",
    statusHelp: "Tap a status to mark it for this exact ayah — saved automatically, no separate 'Save' needed.",
  } : {
    unsavedTitle: "Imaš nespremljene izmjene na ovom ajetu.",
    keepEditing: "Nastavi uređivati",
    discardSwitch: "Odbaci i pređi",
    saveSwitch: "Sačuvaj i pređi",
    errorToggle: "Greška na ovom ajetu",
    errorToggleHint: "Označava baš ovaj ajet — ide u \"Stranice i ajeti s greškama\" na Dashboardu.",
    autoSaveNote: "Izmjene se automatski čuvaju.",
    statusHelp: "Klikni status da ga odmah označiš baš za ovaj ajet — sprema se automatski, nema posebnog 'Sačuvaj'.",
  };

  return (
    <div className="flex flex-col gap-4">

      {onClose && (
        <button onClick={requestClose}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#1D9E75] hover:opacity-70 transition-all w-fit">
          ← {s?.nav?.backToPage || (lang === "en" ? "Close" : "Zatvori")}
        </button>
      )}

      {/* ── HORIZONTALNA TRAKA AJET-CHIPOVA ─────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1.5 -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
        {verses.map(v => {
          const vd = verseStatuses?.[v.verse_key] || {};
          const vst = STATUS[vd.status || "prazna"];
          const active = v.verse_key === selectedKey;
          const flagged = flaggedAyahs.includes(v.verse_key);
          return (
            <button key={v.verse_key} type="button" ref={active ? activeChipRef : null}
              onClick={() => selectChip(v.verse_key)}
              className={`shrink-0 snap-center w-12 rounded-xl px-1 py-2 text-center border transition-all
                ${active ? "border-[#1D9E75]" : (isLight ? "border-black/8 hover:bg-black/[0.03]" : "border-white/8 hover:bg-white/[0.03]")}`}
              style={{ backgroundColor: active ? (isLight ? "rgba(29,158,117,0.12)" : "rgba(29,158,117,0.18)") : undefined }}>
              <div className="font-bold leading-none"
                style={{ fontFamily: "'Amiri', serif", fontSize: "16px", color: active ? "#1D9E75" : (vd.status && vd.status !== "prazna" ? vst.hex : (isLight ? "#00000055" : "#ffffff55")) }}>
                {toArabicNumerals(v.verse_number)}
              </div>
              <div className={`text-[10px] font-semibold leading-none mt-1 ${active ? "text-[#1D9E75]" : (isLight ? "text-black/40" : "text-white/40")}`}>
                {v.verse_number}
              </div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: vd.status && vd.status !== "prazna" ? vst.hex : (isLight ? "#00000022" : "#ffffff22") }} />
                {flagged && <span className="text-[9px] leading-none">⚠</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Potvrda pri prelasku na drugi ajet s nespremljenim izmjenama ────── */}
      {pendingKey && (
        <div className="px-4 py-3 rounded-xl border border-[#EF9F27]/40 bg-[#EF9F27]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs font-semibold text-[#F5B453]">{L.unsavedTitle}</p>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <button onClick={() => setPendingKey(null)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${tBorder} ${tMuted} hover:opacity-70`}>
              {L.keepEditing}
            </button>
            <button onClick={handleDiscardManual}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${tBorder} ${tMuted} hover:opacity-70`}>
              {L.discardSwitch}
            </button>
            <button onClick={handleSaveManual}
              className="px-3 py-1.5 rounded-lg bg-[#1D9E75] text-white text-xs font-bold hover:bg-[#1A8E68] transition-all">
              {L.saveSwitch}
            </button>
          </div>
        </div>
      )}

      {/* ── PROŠIRENI PRIKAZ IZABRANOG AJETA ────────────────────────────────── */}
      {verse && (
        <div className="flex flex-col gap-5">

          <FirstTimeHint
            storageKey="tmizan_hint_ayahbrowser_seen"
            theme={theme}
            text={lang === "en"
              ? "Tap another ayah chip above to switch. Below you can mark the status (Learned/In progress/...), and if you tap ⚠ you flag a mistake on this exact ayah."
              : "Klikni na drugi chip iznad da promijeniš ajet. Ispod možeš označiti status (Naučen/U toku/...), a klikom na ⚠ označavaš grešku baš na ovom ajetu."}
          />

          {/* Meta header - boja prati status, isti pattern kao Tracker */}
          <div className={`rounded-2xl border p-4 sm:p-5 ${status !== "prazna" ? "" : (theme?.card || "bg-white/[0.03]")}`}
            style={status !== "prazna" ? {
              backgroundColor: statusCardBg(st.hex, isLight),
              borderColor: statusBorder(st.hex, isLight),
              borderLeft: `4px solid ${st.hex}`,
            } : undefined}>
            <div className={`flex items-center justify-between flex-wrap gap-3 pb-3 border-b ${tBorder}`}>
              <div className="flex items-center gap-3">
                <p className={`text-xl font-black leading-none ${tText}`}>{verse.verse_key}</p>
                {isFlagged && <span className="text-xs font-bold text-[#F58C8C]">⚠ {sv.errors || "greška"}</span>}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                style={{ backgroundColor: statusPillBg(st.hex, isLight), borderColor: statusBorder(st.hex, isLight) }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: st.hex }} />
                <span className="text-xs font-bold" style={{ color: st.hex }}>
                  {s?.statusLabel?.[status]?.label || st.label}
                </span>
              </div>
            </div>

            {/* Arapski tekst */}
            {verse.text_uthmani && (
              <div className="pt-4">
                <ArabicText text={verse.text_uthmani} verseNumber={verse.verse_number} isLight={isLight} />
              </div>
            )}

            {/* Prijevod (bs/en) + tefsir link */}
            <div className={`mt-4 pt-4 border-t ${tBorder} flex flex-col gap-3`}>
              <TranslationPanel verseKey={verse.verse_key} isLight={isLight} tMuted={tMuted} tBorder={tBorder} accentBg={accentBg} />
              <a href={tefsirUrl} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest w-fit hover:opacity-70 transition-all ${tSubtle}`}>
                <span>📖</span>
                <span>{sv.tefsirLink || "Otvori tefsir"} ({tefsirHost}) ↗</span>
              </a>
            </div>
          </div>

          {/* Status ajeta */}
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle} flex items-center`}>
              {sv.statusLabel || "Status ajeta"}
              <HelpTip text={L.statusHelp} />
            </p>
            <StatusPicker layout="pills" value={status} onChange={mark(key => {
              setStatus(key);
              if (key !== "prazna" && !startDate) setStartDate(todayStr());
            })} s={s} isLight={isLight} />
          </div>

          {/* Greška toggle (samo ako je userId dat) */}
          {userId && onToggleError && (
            <div className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-3 ${isFlagged ? "border-[#F58C8C]/40 bg-[#F58C8C]/10" : tBorder}`}>
              <div>
                <p className={`text-xs font-semibold ${isFlagged ? "text-[#F58C8C]" : tText}`}>{L.errorToggle}</p>
                <p className={`text-[10px] mt-0.5 ${tMuted}`}>{L.errorToggleHint}</p>
              </div>
              <button type="button" onClick={() => onToggleError(verse.verse_key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                  ${isFlagged ? "bg-[#F58C8C] border-[#F58C8C] text-white" : `${tBorder} ${tMuted} hover:opacity-70`}`}>
                {isFlagged ? "✕" : "⚠"}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* LIJEVO: datumi + procjena */}
            <div className="flex flex-col gap-5">
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle}`}>{sv.dates || "Datumi"}</p>
                <div className="flex flex-col gap-3">
                  {[
                    { label: sv.firstLearnDate || "Datum prvog učenja", value: startDate,  setter: setStartDate },
                    { label: sv.lastRepeat     || "Zadnje ponavljanje", value: lastRepeat, setter: setLastRepeat },
                  ].map(({ label, value, setter }) => (
                    <div key={label}>
                      <label className={`text-xs block mb-1.5 ${tMuted}`}>{label}</label>
                      <input type="date" value={value} onChange={e => mark(setter)(e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all ${tInput}`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className={`pt-4 border-t ${tBorder}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle}`}>{sv.confidence || "Procjena"}</p>
                <p className={`text-xs mb-1.5 ${tMuted}`}>{sv.difficultyLabel || "Težina ajeta"}</p>
                <div className="flex gap-1.5 mb-3">
                  {[
                    { id: "laka",    label: sv.difficultyEasy || "Lak",    cls: "bg-[#1D9E75]/20 text-[#1D9E75] border-[#1D9E75]/40" },
                    { id: "srednja", label: sv.difficultyMed  || "Srednji", cls: "bg-[#EF9F27]/20 text-[#EF9F27] border-[#EF9F27]/40" },
                    { id: "teska",   label: sv.difficultyHard || "Težak",  cls: "bg-[#F58C8C]/20 text-[#F58C8C] border-[#F58C8C]/40" },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => { setDifficulty(opt.id); setIsDirty(true); }}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                        difficulty === opt.id ? opt.cls
                          : isLight ? "bg-black/5 border-black/10 text-black/35 hover:bg-black/10"
                          : "bg-white/5 border-white/10 text-white/35 hover:bg-white/10"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className={`text-xs mb-2 ${tMuted}`}>{sv.confidenceLabel || "Nivo sigurnosti (1–5)"}</p>
                <ConfidencePicker value={confidence} onChange={mark(setConfidence)} isLight={isLight} />
                <div className="flex flex-col gap-0 mt-3">
                  <div className={`flex items-center justify-between py-2.5 border-t ${tBorder}`}>
                    <span className={`text-sm ${errors > 0 ? "text-[#F58C8C]" : tMuted}`}>{sv.errors || "Greške"}</span>
                    <Counter value={errors} setter={mark(setErrors)} small isLight={isLight} />
                  </div>
                  <div className={`flex items-center justify-between py-2.5 border-t ${tBorder}`}>
                    <span className={`text-sm ${tMuted}`}>{sv.totalReps || "Ukupno ponavljanja"}</span>
                    <Counter value={repeatCount} setter={mark(setRepeatCount)} small isLight={isLight} />
                  </div>
                </div>
              </div>
            </div>

            {/* DESNO: bilješka + osobni tefsir + historija + slični ajeti */}
            <div className="flex flex-col gap-5">
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle}`}>{sv.notes || "Bilješka"}</p>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className={`text-xs block mb-1.5 ${tMuted}`}>{sv.shortNote || "Kratka napomena"}</label>
                    <input type="text" value={shortNote} onChange={e => { setShortNote(e.target.value); setIsDirty(true); }}
                      placeholder={sv.shortNotePh || "Kratka napomena..."}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all ${tInput}`} />
                  </div>
                  <div>
                    <label className={`text-xs block mb-1.5 ${tMuted}`}>{sv.detailedNote || "Detaljna bilješka"}</label>
                    <textarea value={notes} onChange={e => { setNotes(e.target.value); setIsDirty(true); }} rows={3}
                      placeholder={sv.detailedNotePh || "Detaljna zapažanja..."}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all resize-none ${tInput}`} />
                  </div>
                </div>
              </div>

              <div className={`pt-4 border-t ${tBorder}`}>
                <label className={`text-xs font-semibold block mb-1.5 ${tMuted}`}>{sv.myTefsir || "Lični osvrt"}</label>
                <p className={`text-[10px] mb-1.5 ${tMuted} opacity-60`}>
                  {sv.myTefsirDesc || "Kako planiraš raditi na ovom ajetu, šta trebaš popraviti ili na šta paziti."}
                </p>
                <textarea value={personalTefsir} onChange={e => { setPersonalTefsir(e.target.value); setIsDirty(true); }} rows={3}
                  placeholder={sv.myTefsirPh || "Npr. plan ponavljanja, na čemu trebam poraditi..."}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all resize-none ${tInput}`} />
              </div>

              <div className={`pt-4 border-t ${tBorder}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle}`}>
                  {sv.addRepeat || "Historija ponavljanja"}
                  {history.length > 0 && <span className="text-[#378ADD] normal-case ml-1.5">({history.length})</span>}
                </p>
                <RepeatHistoryInput
                  history={history}
                  setHistory={h => { setHistory(h); setIsDirty(true); }}
                  setRepeatCount={mark(setRepeatCount)}
                  setLastRepeat={mark(setLastRepeat)}
                  setErrors={mark(setErrors)}
                  isLight={isLight} s={s}
                />
                {history.length > 0 && (
                  <div className="mt-3 flex flex-col max-h-40 overflow-y-auto">
                    {history.map(h => (
                      <div key={h.id} className={`flex items-center gap-2.5 py-2 border-t group ${tBorder}`}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${h.errors > 0 ? "bg-[#F58C8C]" : "bg-[#378ADD]"}`} />
                        <span className={`text-xs font-semibold flex-shrink-0 ${tText}`}>{fmtDateTime(h.date)}</span>
                        {h.note && <span className={`text-xs flex-1 truncate ${tMuted}`}>{h.note}</span>}
                        {!h.note && <span className="flex-1" />}
                        {h.errors > 0 && <span className="text-[10px] text-[#F58C8C] flex-shrink-0">⚠{h.errors}</span>}
                        <button onClick={() => deleteHistory(h.id)}
                          className="text-[10px] text-[#F58C8C] opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all flex-shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`pt-4 border-t ${tBorder}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${tSubtle}`}>{sv.similarVerses || "Slični ajeti"}</p>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={newSimilar} onChange={e => setNewSimilar(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addSimilar()}
                    placeholder={sv.similarPh || "npr. 2:255"}
                    className={`flex-1 min-w-0 rounded-xl border px-3 py-2 text-sm outline-none transition-all font-mono ${tInput}`} />
                  <button onClick={addSimilar}
                    className="px-3 py-1.5 rounded-xl bg-[#378ADD]/15 border border-[#378ADD]/30 text-[#378ADD] text-xs font-bold hover:bg-[#378ADD]/25 transition-all whitespace-nowrap flex-shrink-0">
                    {sv.addSimilarBtn || "+ Dodaj"}
                  </button>
                </div>
                {similarAyahs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {similarAyahs.map(sa => (
                      <span key={sa.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#378ADD]/30 bg-[#378ADD]/8 text-xs font-semibold text-[#378ADD]">
                        {sa.key}
                        <button onClick={() => { setSimilarAyahs(prev => prev.filter(x => x.id !== sa.id)); setIsDirty(true); }}
                          className="opacity-60 hover:opacity-100">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer: auto-save napomena ili ručno Sačuvaj/Odustani */}
          {autoSave ? (
            <div className={`pt-3 border-t ${tBorder} flex items-center justify-center gap-2`}>
              {justSaved && <span className="text-xs font-bold text-[#1D9E75]">✓</span>}
              <p className={`text-[11px] text-center ${tSubtle}`}>{L.autoSaveNote}</p>
            </div>
          ) : (
            <div className={`flex justify-end gap-3 pt-3 border-t ${tBorder}`}>
              <button onClick={() => {
                  const d2 = verseStatuses?.[verse.verse_key] || {};
                  setStatus(d2.status || "prazna"); setStartDate(d2.startDate || ""); setLastRepeat(d2.lastRepeat || "");
                  setRepeatCount(d2.repeatCount || 0); setConfidence(d2.confidence || 0); setDifficulty(d2.difficulty || "srednja");
                  setErrors(d2.errors || 0); setShortNote(d2.shortNote || ""); setNotes(d2.notes || "");
                  setHistory(d2.history || []); setSimilarAyahs(d2.similarAyahs || []); setPersonalTefsir(d2.personalTefsir || "");
                  setIsDirty(false);
                }}
                className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${tBorder} ${tMuted} hover:opacity-70`}>
                {sv.cancel || "Odustani"}
              </button>
              <button onClick={handleSaveManual}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all border
                  ${justSaved
                    ? `border-[#1D9E75]/30 text-[#1D9E75] ${isLight ? "bg-[#1D9E75]/10" : "bg-[#1D9E75]/15"}`
                    : `${theme?.button || "bg-[#1D9E75] text-white hover:bg-[#1A8E68]"} border-transparent`}`}>
                {justSaved ? (sv.saved || "✓ Sačuvano") : (sv.save || "Sačuvaj promjene")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
