// ============================================================================
// Detaljan prikaz jednog ajeta: arapski tekst, prijevod, status, sigurnost
// znanja, greške po riječima, lični tefsir, bilješke, historija ponavljanja i
// popis sličnih ajeta. Slični ajeti se bilježe ručno, jer su zamjene između njih
// najčešći uzrok greške pri učenju napamet.
// ============================================================================

import { useState } from "react";
import { useLang } from "../../../../context/LanguageContext";
import { STATUS } from "../../../../constants/hifz/STATUS";
import { todayStr, fmtDate, fmtDateTime, toArabicNumerals, statusCardBg, statusBorder, statusPillBg, tefsirBaSuraUrl } from "../../../../constants/hifz/helpers";
import { SURA_DATA } from "../../../../constants/hifz/SURA_DATA";
import { ArabicText } from "../../../../components/hifz/shared/ArabicText";
import { TranslationPanel } from "../../../../components/hifz/shared/TranslationPanel";
import { ConfidenceDots } from "../../../../components/hifz/shared/ConfidenceDots";
import { ConfidencePicker } from "../../../../components/hifz/shared/ConfidencePicker";
import { Counter } from "../../../../components/hifz/shared/Counter";
import { StatusPicker } from "../../../../components/hifz/shared/StatusPicker";
import { RepeatHistoryInput } from "../../../../components/hifz/shared/RepeatHistoryInput";
import { FirstTimeHint } from "../../../../components/shared/FirstTimeHint";
import HelpTip from "../../../../components/shared/HelpTip";

export function VerseDetailView({ verse, verseData, onSave, onBack, theme, s }) {
  const d = verseData || {};
  const isLight = theme?.id === "beige_white" || theme?.id === "pink_soft";

  const tText   = theme?.text  || "text-white";
  const tMuted  = theme?.muted || "text-white/50";
  const tSubtle = isLight ? "text-[#A89880]" : "text-white/25";
  const tBorder = isLight ? "border-black/8" : "border-white/8";
  const tCard   = theme?.card    || "bg-white/[0.03]";
  const tCardSub= theme?.cardSub || "bg-white/[0.02]";
  const tInput  = isLight
    ? "border-black/10 bg-black/5 text-[#3D2E22] placeholder:text-[#B0A090] focus:border-[#1D9E75]/50"
    : "border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#1D9E75]/50";

  const sv = s?.verse || {};
  const sl = s?.statusLabel || {};

  const [tab, setTab]             = useState("pregled");
  const [isDirty, setIsDirty]     = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);
  const [status, setStatus]       = useState(d.status      || "prazna");
  const [startDate, setStartDate] = useState(d.startDate   || "");
  const [lastRepeat, setLastRepeat] = useState(d.lastRepeat|| "");
  const [repeatCount, setRepeatCount] = useState(d.repeatCount || 0);
  const [confidence, setConfidence] = useState(d.confidence || 0);
  const [difficulty, setDifficulty] = useState(d.difficulty || "srednja");
  const [errors, setErrors]       = useState(d.errors      || 0);
  const [shortNote, setShortNote] = useState(d.shortNote   || "");
  const [notes, setNotes]         = useState(d.notes       || "");
  const [history, setHistory]     = useState(d.history     || []);
  const [similarAyahs, setSimilarAyahs] = useState(d.similarAyahs || []);
  const [personalTefsir, setPersonalTefsir] = useState(d.personalTefsir || "");
  const [newSimilar, setNewSimilar] = useState("");
  const [saved, setSaved]         = useState(false);

  const st = STATUS[status];
  const statusLabelM = sl[status]?.label || st.label;

  const { lang } = useLang()
  const accentBg = (theme?.button || "").split(" ").find(c => c.startsWith("bg-[")) || "bg-[#1D9E75]"
  const _vk = (verse.verse_key || "").replace(":", "/")
  const tefsirUrl = lang === "bs"
    ? tefsirBaSuraUrl(verse.verse_key)
    : `https://quran.com/${_vk}`
  const tefsirHost = lang === "bs" ? "tefsir.ba" : "quran.com"

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
    onSave({ status, startDate, lastRepeat, repeatCount, confidence, difficulty, errors, shortNote, notes, history, similarAyahs, personalTefsir });
    setSaved(true);
    setIsDirty(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBack = () => {
    if (tab === "uredi" && isDirty) { setConfirmBack(true); return; }
    onBack();
  };

  const addSimilar = () => {
    const trimmed = newSimilar.trim();
    if (!trimmed) return;
    setSimilarAyahs(prev => [...prev, { id: Date.now(), key: trimmed }]);
    setNewSimilar("");
    setIsDirty(true);
  };

  const surahId = parseInt(verse.verse_key?.split(":")[0]);
  const suraInfo = SURA_DATA.find(su => su.id === surahId);
  const pageNum = suraInfo?.startPage || "—";

  const tabs = [
    { id: "pregled", label: sv.tabView    || "Pregled"       },
    { id: "uredi",   label: sv.tabEdit    || "Uredi"         },
  ];

  return (
    <div className="flex flex-col">

      {/* BACK */}
      <button onClick={handleBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#1D9E75] hover:opacity-70 transition-all w-fit mb-3">
        ← {s?.nav?.backToPage || "Nazad na stranicu"}
      </button>

      {/* Confirm back s nespremljenim promjenama */}
      {confirmBack && (
        <div className={`mb-4 px-4 py-3 rounded-xl border border-[#EF9F27]/40 bg-[#EF9F27]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
          <p className="text-xs font-semibold text-[#F5B453]">
            {s?.form?.unsavedWarning || "Imaš nespremljene promjene. Šta želiš uraditi?"}
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => { setConfirmBack(false); onBack(); }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${isLight ? "border-black/10 text-black/40" : "border-white/10 text-white/40"} hover:opacity-70`}>
              {s?.form?.discardAndBack || "Odbaci i idi nazad"}
            </button>
            <button onClick={() => { handleSave(); setConfirmBack(false); }}
              className="px-3 py-1.5 rounded-lg bg-[#1D9E75] text-white text-xs font-bold hover:bg-[#1A8E68] transition-all">
              {s?.verse?.save || "Sačuvaj"}
            </button>
          </div>
        </div>
      )}

      {/* ── META HEADER CARD ────────────────────────────────────────────────── */}
      {/* Boja kartice prati status ajeta - isti solid-color pattern kao na hero
          karticama stranice/sure/džuza, i vraća se na neutralno za "prazna". */}
      <div className={`rounded-2xl border p-4 sm:p-5 mb-1 ${status !== "prazna" ? "" : tCard}`}
        style={status !== "prazna" ? {
          backgroundColor: statusCardBg(st.hex, isLight),
          borderColor: statusBorder(st.hex, isLight),
          borderLeft: `4px solid ${st.hex}`,
        } : undefined}>
        <div className={`flex items-center justify-between flex-wrap gap-3 pb-4 border-b ${tBorder}`}>
          <div className="flex items-center gap-5 flex-wrap">
            <div>
              <p className={`text-[10px] uppercase tracking-widest font-semibold mb-0.5 ${tSubtle}`}>
                {sv.verse || "Ajet"}
              </p>
              <p className={`text-2xl font-black leading-none ${tText}`}>{verse.verse_key}</p>
            </div>
            <div className={`h-9 w-px ${isLight ? "bg-black/10" : "bg-white/10"}`} />
            <div>
              <p className={`text-[10px] uppercase tracking-widest font-semibold mb-0.5 ${tSubtle}`}>
                {sv.page || "Stranica"}
              </p>
              <p className={`text-2xl font-black leading-none ${tText}`}>{pageNum}</p>
            </div>
            <div className={`h-9 w-px ${isLight ? "bg-black/10" : "bg-white/10"}`} />
            <div>
              <p className={`text-[10px] uppercase tracking-widest font-semibold mb-0.5 ${tSubtle}`}>
                {sv.verse || "Ajet"} #
              </p>
              <div className="flex items-center gap-2 leading-none">
                <p className={`text-2xl font-black ${tText}`}>{verse.verse_number}</p>
                <span style={{ fontFamily: "'Amiri', serif", fontSize: "1.4rem", color: isLight ? "#7A5C00" : "#F5C842", lineHeight: 1 }}>
                  {toArabicNumerals(verse.verse_number)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{
              backgroundColor: statusPillBg(st.hex, isLight),
              borderColor: statusBorder(st.hex, isLight),
            }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: st.hex }} />
            <span className="text-xs font-bold" style={{ color: st.hex }}>{statusLabelM}</span>
          </div>
        </div>

        {/* Arapski tekst */}
        {verse.text_uthmani && (
          <div className="pt-4">
            <ArabicText text={verse.text_uthmani} verseNumber={verse.verse_number} isLight={isLight} />
          </div>
        )}

        {/* Prijevod toggle + tefsir link */}
        {verse.verse_key && (
          <div className={`mt-4 pt-4 border-t ${tBorder} flex flex-col gap-3`}>
            <TranslationPanel
              verseKey={verse.verse_key}
              isLight={isLight}
              tMuted={tMuted}
              tBorder={tBorder}
              accentBg={accentBg}
            />
            <a
              href={tefsirUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest w-fit hover:opacity-70 transition-all ${tSubtle}`}
            >
              <span>📖</span>
              <span>{sv.tefsirLink || "Otvori tefsir"} ({tefsirHost}) ↗</span>
            </a>
          </div>
        )}
      </div>

      {/* ── QUICK STATS (samo kad ima podataka) ─────────────────────────────── */}
      {(repeatCount > 0 || errors > 0 || confidence > 0) && (
        <div className={`flex gap-6 py-4 border-b flex-wrap ${tBorder}`}>
          {repeatCount > 0 && (
            <div className="text-center">
              <p className="text-xl font-black text-[#378ADD]">{repeatCount}</p>
              <p className={`text-[10px] uppercase tracking-wider mt-0.5 ${tMuted}`}>{sv.totalReps || "ponavljanja"}</p>
            </div>
          )}
          {errors > 0 && (
            <div className="text-center">
              <p className="text-xl font-black text-[#F58C8C]">{errors}</p>
              <p className={`text-[10px] uppercase tracking-wider mt-0.5 ${tMuted}`}>{sv.errors || "greške"}</p>
            </div>
          )}
          {confidence > 0 && (
            <div className="text-center">
              <ConfidenceDots value={confidence} />
              <p className={`text-[10px] uppercase tracking-wider mt-1 ${tMuted}`}>{sv.confidence || "sigurnost"}</p>
            </div>
          )}
          {startDate && (
            <div className="text-center">
              <p className={`text-sm font-bold ${tText}`}>{fmtDate(startDate)}</p>
              <p className={`text-[10px] uppercase tracking-wider mt-0.5 ${tMuted}`}>{sv.firstLearnDate || "početo"}</p>
            </div>
          )}
        </div>
      )}

      {/* ── TABOVI ──────────────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-1 mt-5 mb-6 border-b ${tBorder}`}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold transition-all relative whitespace-nowrap
              ${tab === t.id
                ? `${tText} after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-[#1D9E75] after:rounded-t-full`
                : `${tMuted} hover:opacity-80`
              }`}>
            {t.label}
          </button>
        ))}
        <HelpTip text={lang === "en"
          ? "'Overview' is read-only — a quick summary of what's saved. 'Edit' is where you change status, difficulty, notes and history."
          : "'Pregled' je samo za uvid — brz pregled onoga što je sačuvano. 'Uredi' je gdje mijenjaš status, težinu, bilješke i historiju."} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: PREGLED
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "pregled" && (
        <div className="flex flex-col gap-5">

          <FirstTimeHint
            storageKey="tmizan_hint_versedetail_pregled_seen"
            theme={theme}
            text={lang === "en"
              ? "This 'Overview' tab is read-only — a quick summary of what's already saved. To change the status, notes, difficulty or repeat history, switch to the 'Edit' tab above."
              : "Ovaj tab 'Pregled' je samo za brz uvid — prikazuje ono što je već sačuvano. Da promijeniš status, bilješke, težinu ili historiju ponavljanja, prebaci se na tab 'Uredi' iznad."}
          />

          {/* ── STAT CHIPS ─────────────────────────────────────────────────── */}
          {(startDate || lastRepeat || repeatCount > 0 || errors > 0 || confidence > 0) && (
            <div className="flex flex-wrap gap-2">
              {startDate && (
                <div className={`flex flex-col px-4 py-2.5 rounded-xl ${tCardSub}`}>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${tSubtle}`}>{sv.firstLearnDate || "Početo"}</span>
                  <span className={`text-sm font-bold mt-0.5 ${tText}`}>{fmtDate(startDate)}</span>
                </div>
              )}
              {lastRepeat && (
                <div className={`flex flex-col px-4 py-2.5 rounded-xl ${tCardSub}`}>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${tSubtle}`}>{sv.lastRepeat || "Zadnje"}</span>
                  <span className={`text-sm font-bold mt-0.5 ${tText}`}>{fmtDate(lastRepeat)}</span>
                </div>
              )}
              {repeatCount > 0 && (
                <div className={`flex flex-col px-4 py-2.5 rounded-xl ${tCardSub}`}>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${tSubtle}`}>{sv.totalReps || "Ponavljanja"}</span>
                  <span className="text-sm font-bold mt-0.5 text-[#378ADD]">{repeatCount}×</span>
                </div>
              )}
              {confidence > 0 && (
                <div className={`flex flex-col px-4 py-2.5 rounded-xl ${tCardSub}`}>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${tSubtle}`}>{sv.confidence || "Sigurnost"}</span>
                  <div className="flex gap-1 mt-1.5">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} className={`w-2 h-2 rounded-full ${confidence >= n ? "bg-[#1D9E75]" : (isLight ? "bg-black/10" : "bg-white/10")}`} />
                    ))}
                  </div>
                </div>
              )}
              {errors > 0 && (
                <div className="flex flex-col px-4 py-2.5 rounded-xl bg-[#F58C8C]/10 border border-[#F58C8C]/20">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#F58C8C]/70">{sv.errors || "Greške"}</span>
                  <span className="text-sm font-bold mt-0.5 text-[#F58C8C]">⚠ {errors}</span>
                </div>
              )}
            </div>
          )}

          {/* ── OSOBNI TEFSIR ──────────────────────────────────────────────── */}
          {personalTefsir && (
            <div className={`rounded-xl px-4 py-3.5 border-l-2 border-[#EF9F27]/50 ${isLight ? "bg-[#EF9F27]/[0.05]" : "bg-[#EF9F27]/[0.07]"}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-[#C07A00]">
                {sv.myTefsir || "Lični osvrt"}
              </p>
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${tMuted}`}>{personalTefsir}</p>
            </div>
          )}

          {/* ── BILJEŠKA ───────────────────────────────────────────────────── */}
          {(shortNote || notes) && (
            <div className={`rounded-xl px-4 py-3.5 border-l-2 border-[#1D9E75]/40 ${isLight ? "bg-black/[0.03]" : "bg-white/[0.03]"}`}>
              {shortNote && (
                <p className={`text-sm font-semibold leading-snug ${tText}`}>{shortNote}</p>
              )}
              {notes && (
                <p className={`text-sm leading-relaxed whitespace-pre-wrap mt-1 ${tMuted}`}>{notes}</p>
              )}
            </div>
          )}

          {/* ── HISTORIJA PONAVLJANJA ──────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className={`text-xs font-semibold uppercase tracking-widest ${tSubtle}`}>
                {sv.repeatHistory || "Historija ponavljanja"}
              </p>
              {history.length > 0 && (
                <span className="text-xs font-bold text-[#378ADD]">{history.length}×</span>
              )}
            </div>

            {history.length === 0 ? (
              <p className={`text-sm ${tSubtle}`}>{sv.noHistory || "Nema zabilježenih ponavljanja."}</p>
            ) : (
              <div className="relative pl-5">
                {/* Vertikalna linija */}
                <div className={`absolute left-[5px] top-1 bottom-1 w-px ${isLight ? "bg-black/10" : "bg-white/10"}`} />

                <div className={`flex flex-col gap-4 ${history.length > 10 ? "max-h-[420px] overflow-y-auto pr-1" : ""}`}>
                  {history.map((h, i) => (
                    <div key={h.id} className="relative">
                      <div className={`absolute -left-[19px] top-[5px] w-2.5 h-2.5 rounded-full z-10
                        ${h.errors > 0
                          ? "bg-[#F58C8C]"
                          : i === 0
                            ? "bg-[#1D9E75]"
                            : isLight ? "bg-[#C8BCAC]" : "bg-[#444]"
                        }`}
                      />
                      <div className="flex items-start justify-between gap-4">
                        <div>
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
            )}
          </div>

          {/* ── SLIČNI AJETI ───────────────────────────────────────────────── */}
          <div>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${tSubtle}`}>
              {sv.similarVerses || "Slični ajeti"}
            </p>
            {similarAyahs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {similarAyahs.map(sa => (
                  <span key={sa.id}
                    className="px-3 py-1.5 rounded-full border border-[#378ADD]/30 bg-[#378ADD]/8 text-xs font-semibold text-[#378ADD]">
                    {sa.key}
                  </span>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${tSubtle}`}>{sv.noSimilar || "Nema sličnih ajeta."}</p>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: UREDI
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "uredi" && (
        <div className="flex flex-col gap-5">
          {/* ── 2 KOLONE ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* LIJEVO: Status, Datumi, Ponavljanja, Procjena */}
            <div className="flex flex-col gap-5">

              {/* Status */}
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle} flex items-center`}>
                  {sv.statusLabel || "Status ajeta"}
                  <HelpTip text={lang === "en"
                    ? "Sets the status for this exact ayah — remember to tap 'Save changes' at the bottom when you're done."
                    : "Postavlja status baš za ovaj ajet — ne zaboravi kliknuti 'Sačuvaj promjene' na dnu kad završiš."} />
                </p>
                <StatusPicker value={status} onChange={(key) => {
                  setStatus(key); setIsDirty(true);
                  if (key !== "prazna" && !startDate) setStartDate(todayStr());
                }} s={s} isLight={isLight} />
              </div>

              {/* Datumi */}
              <div className={`pt-4 border-t ${tBorder}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle}`}>
                  {sv.dates || "Datumi"}
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    { label: sv.firstLearnDate || "Datum prvog učenja", value: startDate,  setter: setStartDate },
                    { label: sv.lastRepeat     || "Zadnje ponavljanje", value: lastRepeat, setter: setLastRepeat },
                  ].map(({ label, value, setter }) => (
                    <div key={label}>
                      <label className={`text-xs block mb-1.5 ${tMuted}`}>{label}</label>
                      <input type="date" value={value} onChange={e => setter(e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all ${isLight ? "light-input" : "dark-input"} ${tInput}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Procjena */}
              <div className={`pt-4 border-t ${tBorder}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle}`}>
                  {sv.confidence || "Procjena"}
                </p>
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
                <ConfidencePicker value={confidence} onChange={setConfidence} isLight={isLight} />
                <div className="flex flex-col gap-0 mt-3">
                  <div className={`flex items-center justify-between py-2.5 border-t ${tBorder}`}>
                    <span className={`text-sm ${errors > 0 ? "text-[#F58C8C]" : tMuted}`}>
                      {sv.errors || "Greške"}
                    </span>
                    <Counter value={errors} setter={setErrors} small isLight={isLight} />
                  </div>
                  <div className={`flex items-center justify-between py-2.5 border-t ${tBorder}`}>
                    <span className={`text-sm ${tMuted}`}>{sv.totalReps || "Ukupno ponavljanja"}</span>
                    <Counter value={repeatCount} setter={setRepeatCount} small isLight={isLight} />
                  </div>
                </div>
              </div>
            </div>

            {/* DESNO: Bilješka + Historija */}
            <div className="flex flex-col gap-5">

              {/* Bilješka */}
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${tSubtle} flex items-center`}>
                  {sv.notes || "Bilješka"}
                  <HelpTip text={lang === "en"
                    ? "Short note = a quick tag visible in the pages/ayahs list. Detailed note = longer, only visible when you open this ayah."
                    : "Kratka napomena = brza oznaka vidljiva u listi stranica/ajeta. Detaljna bilješka = duža, vidljiva samo kad otvoriš baš ovaj ajet."} />
                </p>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className={`text-xs block mb-1.5 ${tMuted}`}>{sv.shortNote || "Kratka napomena"}</label>
                    <input type="text" value={shortNote} onChange={e => setShortNote(e.target.value)}
                      placeholder={sv.shortNotePh || "Kratka napomena..."}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all ${tInput}`} />
                  </div>
                  <div>
                    <label className={`text-xs block mb-1.5 ${tMuted}`}>{sv.detailedNote || "Detaljna bilješka"}</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                      placeholder={sv.detailedNotePh || "Detaljna zapažanja..."}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all resize-none ${tInput}`} />
                  </div>
                </div>
              </div>

              {/* Osobni tefsir */}
              <div className={`pt-4 border-t ${tBorder}`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <label className={`text-xs font-semibold ${tMuted}`}>
                    {sv.myTefsir || "Lični osvrt"}
                  </label>
                  <a
                    href={tefsirUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-[10px] font-bold flex items-center gap-1 hover:opacity-70 transition-all flex-shrink-0 ${isLight ? "text-black/30" : "text-white/30"}`}
                  >
                    📖 {tefsirHost} ↗
                  </a>
                </div>
                <p className={`text-[10px] mb-2 ${tMuted} opacity-60`}>
                  {sv.myTefsirDesc || "Kako planiraš raditi na ovom ajetu, šta trebaš popraviti ili na šta paziti."}
                </p>
                <textarea
                  value={personalTefsir}
                  onChange={e => { setPersonalTefsir(e.target.value); setIsDirty(true); }}
                  rows={5}
                  placeholder={sv.myTefsirPh || "Npr. plan ponavljanja, na čemu trebam poraditi..."}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all resize-none ${tInput}`}
                />
              </div>

              {/* Historija ponavljanja */}
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
                {history.length > 0 ? (
                  <div className="mt-3 flex flex-col">
                    {history.map(h => (
                      <div key={h.id} className={`flex items-center gap-2.5 py-2 border-t group ${tBorder}`}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${h.errors > 0 ? "bg-[#F58C8C]" : "bg-[#378ADD]"}`} />
                        <span className={`text-xs font-semibold flex-shrink-0 ${tText}`}>{fmtDateTime(h.date)}</span>
                        {h.note && <span className={`text-xs flex-1 truncate ${tMuted}`}>{h.note}</span>}
                        {!h.note && <span className="flex-1" />}
                        {h.errors > 0 && <span className="text-[10px] text-[#F58C8C] flex-shrink-0">⚠{h.errors}</span>}
                        <button onClick={() => deleteHistory(h.id)}
                          className={`text-[10px] text-[#F58C8C] opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all flex-shrink-0`}>✕</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`mt-3 text-xs ${tMuted}`}>{sv.noHistory || "Nema historije ponavljanja."}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Slični ajeti (uklopljeno unutar Uredi, ne poseban tab) ────────── */}
          <div className={`pt-4 border-t ${tBorder}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${tSubtle}`}>
              {sv.addSimilar || "Dodaj slični ajet"}
            </p>
            <p className={`text-xs mb-3 ${tMuted}`}>
              {sv.similarDesc || "Upiši ključ ajeta koji je sličan ovom (npr. 2:255, 3:18...)"}
            </p>
            <div className="flex gap-2 mb-3">
              <input type="text" value={newSimilar} onChange={e => setNewSimilar(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addSimilar()}
                placeholder={sv.similarPh || "npr. 2:255"}
                className={`flex-1 min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none transition-all font-mono ${tInput}`} />
              <button onClick={addSimilar}
                className="px-4 py-2 rounded-xl bg-[#378ADD]/15 border border-[#378ADD]/30 text-[#378ADD] text-sm font-bold hover:bg-[#378ADD]/25 transition-all whitespace-nowrap flex-shrink-0">
                {sv.addSimilarBtn || "+ Dodaj"}
              </button>
            </div>

            {similarAyahs.length === 0 ? (
              <p className={`text-sm ${tSubtle}`}>{sv.noSimilar || "Nema dodanih sličnih ajeta."}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {similarAyahs.map(sa => (
                  <span key={sa.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#378ADD]/30 bg-[#378ADD]/8 text-xs font-semibold text-[#378ADD]">
                    {sa.key}
                    <button onClick={() => { setSimilarAyahs(prev => prev.filter(x => x.id !== sa.id)); setIsDirty(true); }}
                      className="opacity-60 hover:opacity-100">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sačuvaj + Odustani */}
          <div className={`flex justify-end gap-3 pt-4 border-t ${tBorder}`}>
            <button onClick={() => setTab("pregled")}
              className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${tBorder} ${tMuted} hover:opacity-70`}>
              {sv.cancel || "Odustani"}
            </button>
            <button onClick={handleSave}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all border
                ${saved
                  ? `border-[#1D9E75]/30 text-[#1D9E75] ${isLight ? "bg-[#1D9E75]/10" : "bg-[#1D9E75]/15"}`
                  : `${theme?.button || "bg-[#1D9E75] text-white hover:bg-[#1A8E68]"} border-transparent`}`}>
              {saved ? (sv.saved || "✓ Sačuvano") : (sv.save || "Sačuvaj promjene")}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
