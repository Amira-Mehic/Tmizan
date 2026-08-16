// ============================================================================
// Jedan ajet u listi, s arapskim tekstom, statusom i sažetkom napretka. Detalji
// se otvaraju na klik da lista ostane pregledna i kad sura ima stotine ajeta.
// ============================================================================

import { useState } from "react";
import { useLang } from "../../../../context/LanguageContext";
import { STATUS } from "../../../../constants/hifz/STATUS";
import { toArabicNumerals, tefsirBaSuraUrl } from "../../../../constants/hifz/helpers";
import { StatusPicker } from "../../../../components/hifz/shared/StatusPicker";
import { ArabicText } from "../../../../components/hifz/shared/ArabicText";
import { TranslationPanel } from "../../../../components/hifz/shared/TranslationPanel";
import HelpTip from "../../../../components/shared/HelpTip";

export function VerseRowItem({ verse, verseData, onOpen, onQuickStatus, onViewDetails, theme, s }) {
  const { lang } = useLang()
  const [expanded, setExpanded] = useState(false);

  const stat       = verseData?.status || "prazna";
  const st         = STATUS[stat];
  const isActive   = stat !== "prazna";
  const isLight    = theme?.id === "beige_white" || theme?.id === "pink_soft";
  const difficulty = verseData?.difficulty || null;

  const rowBg    = isLight ? "hover:bg-black/[0.03]" : "hover:bg-white/[0.03]";
  const numBg    = isLight ? "bg-black/6 text-black/50" : "bg-white/8 text-white/50";
  const keyTxt   = isLight ? "text-black/35" : "text-white/35";
  const noStatus = isLight ? "text-black/25" : "text-white/25";
  const confDot  = isLight ? "bg-black/12" : "bg-white/10";
  const arrowTxt = isLight ? "text-black/20 group-hover:text-black/50" : "text-white/20 group-hover:text-white/50";
  const tBorder  = isLight ? "border-black/8"  : "border-white/[0.06]";
  const tSubtle  = isLight ? "text-black/35" : "text-white/25";
  const tMuted   = theme?.muted || (isLight ? "text-black/50" : "text-white/50");
  const panelBg  = isLight ? "bg-black/[0.015]" : "bg-white/[0.015]";

  const statusLabel    = s?.statusLabel?.[stat]?.label || st.label;
  const similarAyahs   = verseData?.similarAyahs || [];
  const personalTefsir = verseData?.personalTefsir || "";
  const sv             = s?.verse || {};

  // Accent bg klasa za TranslationPanel tabove
  const accentBg = (theme?.button || "").split(" ").find(c => c.startsWith("bg-[")) || "bg-[#1D9E75]"

  // Tefsir link - tefsir.ba Ibn Kesir (BS, na nivou sure) ili quran.com (EN)
  const [surahId, ayahId] = (verse.verse_key || "").split(":")
  const tefsirUrl = lang === "bs"
    ? tefsirBaSuraUrl(verse.verse_key)
    : `https://quran.com/${surahId}/${ayahId}`

  return (
    <div className={`border-b ${tBorder}`}>

      {/* ── ROW ─────────────────────────────────────────────────────────────── */}
      <div
        onClick={() => setExpanded(v => !v)}
        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all group ${rowBg}`}
      >
        {/* Broj ajeta */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold
            ${isActive ? `${st.bg} ${st.text}` : numBg}`}
          style={{ fontFamily: "'Amiri', serif", fontSize: "17px" }}
        >
          {toArabicNumerals(verse.verse_number)}
        </div>

        {/* Ključ + status */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-xs font-mono flex-shrink-0 ${keyTxt}`}>{verse.verse_key}</span>
          <div className={`w-1 h-1 rounded-full flex-shrink-0 ${isActive ? st.dot : (isLight ? "bg-black/15" : "bg-white/15")}`} />
          <span className={`text-xs font-medium truncate ${isActive ? st.text : noStatus}`}>{statusLabel}</span>
          {verseData?.errors > 0 && (
            <span className="text-[10px] text-[#F58C8C] flex-shrink-0">⚠{verseData.errors}</span>
          )}
          {/* Težina ajeta */}
          {difficulty === "laka" && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-[#1D9E75]/15 text-[#1D9E75]">L</span>
          )}
          {difficulty === "teska" && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-[#F58C8C]/15 text-[#F58C8C]">T</span>
          )}
          {/* Slični ajeti */}
          {similarAyahs.length > 0 && (
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 truncate max-w-[160px] ${
              isLight
                ? "bg-[#378ADD]/10 border-[#378ADD]/25 text-[#2060AA]"
                : "bg-[#378ADD]/12 border-[#378ADD]/25 text-[#378ADD]"
            }`}>
              {sv.similarVerses || "Slični"}: {similarAyahs.map(a => a.key).join(", ")}
            </span>
          )}
          {/* Indikator osobnog tefsira */}
          {personalTefsir && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${isLight ? "bg-[#EF9F27]/15 text-[#C07A00]" : "bg-[#EF9F27]/15 text-[#F5B453]"}`}>
              T
            </span>
          )}
        </div>

        {/* Desna strana */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {verseData?.confidence > 0 && (
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(n => (
                <div key={n} className={`w-1.5 h-1.5 rounded-full ${verseData.confidence >= n ? "bg-[#1D9E75]" : confDot}`} />
              ))}
            </div>
          )}
          {verseData?.repeatCount > 0 && (
            <span className="text-[10px] text-[#378ADD]">↻{verseData.repeatCount}</span>
          )}
          {onViewDetails && (
            <button
              onClick={e => { e.stopPropagation(); onViewDetails(verse.verse_key); }}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all flex-shrink-0 ${
                isLight ? "border-black/10 text-black/40 hover:bg-black/8" : "border-white/10 text-white/40 hover:bg-white/8"
              }`}
              title={sv.viewDetails || "Vidi detalje"}
            >
              {sv.viewDetails || "Vidi detalje"}
            </button>
          )}
          <span
            className={`text-sm transition-transform duration-200 ${expanded ? "rotate-90" : "group-hover:translate-x-0.5"} ${arrowTxt}`}
          >›</span>
        </div>
      </div>

      {/* ── EXPANDED PANEL ──────────────────────────────────────────────────── */}
      <div
        style={{
          maxHeight: expanded ? "6000px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className={`px-4 pb-4 pt-3 flex flex-col gap-4 border-t ${tBorder} ${panelBg}`}>

          {/* Arapski tekst */}
          {verse.text_uthmani && (
            <div className={`py-3 px-4 rounded-xl ${isLight ? "bg-black/[0.04]" : "bg-white/[0.04]"}`}>
              <ArabicText text={verse.text_uthmani} verseNumber={verse.verse_number} isLight={isLight} />
            </div>
          )}

          {/* Prijevod (toggle) */}
          {verse.verse_key && (
            <TranslationPanel
              verseKey={verse.verse_key}
              isLight={isLight}
              tMuted={tMuted}
              tBorder={tBorder}
              accentBg={accentBg}
            />
          )}

          {/* Osobni tefsir preview */}
          {personalTefsir && (
            <div className={`rounded-xl px-3.5 py-3 border-l-2 border-[#EF9F27]/50 ${isLight ? "bg-[#EF9F27]/[0.05]" : "bg-[#EF9F27]/[0.07]"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 text-[#C07A00]`}>
                {sv.myTefsir || "Lični osvrt"}
              </p>
              <p className={`text-xs leading-relaxed line-clamp-3 ${tMuted}`}>{personalTefsir}</p>
            </div>
          )}

          {/* Slični ajeti */}
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${tSubtle}`}>
              {sv.similarVerses || "Slični ajeti"}
            </p>
            {similarAyahs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {similarAyahs.map(sa => (
                  <span
                    key={sa.id}
                    className="px-2.5 py-1 rounded-full border border-[#378ADD]/30 bg-[#378ADD]/8 text-xs font-semibold text-[#378ADD]"
                  >
                    {sa.key}
                  </span>
                ))}
              </div>
            ) : (
              <p className={`text-xs ${tSubtle}`}>{sv.noSimilar || "Nema sličnih ajeta."}</p>
            )}
          </div>

          {/* Quick status */}
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${tSubtle} flex items-center`}>
              {sv.statusLabel || "Status ajeta"}
              <HelpTip text="Klikni jedno od dugmadi da odmah označiš status baš OVOG ajeta — sprema se automatski, nema posebnog 'Sačuvaj'." />
            </p>
            <StatusPicker
              layout="pills"
              value={stat}
              onChange={key => onQuickStatus?.(verse.verse_key, key)}
              s={s}
              isLight={isLight}
            />
          </div>

          {/* Footer: Tefsir link + Otvori detalje */}
          <div className={`flex items-center justify-between pt-2 border-t ${tBorder}`}>
            <a
              href={tefsirUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className={`text-xs font-semibold flex items-center gap-1 hover:opacity-70 transition-all ${tSubtle}`}
            >
              <span>📖</span>
              <span>{sv.tefsirLink || "Otvori tefsir"} ↗</span>
            </a>
            <button
              onClick={e => { e.stopPropagation(); onOpen(); }}
              className="text-xs font-semibold text-[#1D9E75] hover:opacity-70 transition-all flex items-center gap-1"
            >
              {sv.openDetails || "Otvori detalje"} ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
