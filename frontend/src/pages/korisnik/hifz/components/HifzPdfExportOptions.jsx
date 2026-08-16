// ============================================================================
// Odabir šta ulazi u PDF izvještaj: opseg (cijeli Kur'an, džuzevi, sure ili
// raspon stranica), vrsta izvještaja i nivo detalja. Odavde se pokreće priprema
// prikaza za štampu.
// ============================================================================

import { useState } from "react";
import { SURA_DATA } from "../../../../constants/hifz/SURA_DATA";
import { getJuzPages, ALL_JUZ, isStarted } from "../../../../constants/hifz/helpers";
import { useLang } from "../../../../context/LanguageContext";

const STR = {
  bs: {
    title: "Izvezi PDF izvještaj",
    subtitle: "Podesi šta želiš da se prikaže prije generisanja.",
    formatLabel: "Format izvještaja",
    detailedTitle: "Detaljno",
    detailedDesc: "Red po stranici, sa ✓ i prostorom za bilješke",
    summaryTitle: "Sažetak",
    summaryDesc: "Samo brojevi po statusu, bez liste stranica",
    hideEmptyLabel: "Prikaži samo započete stranice",
    hideEmptyDesc: "Preskače prazne (nezapočete) stranice, i cijele džuzeve/sure koje uopšte nisi dirala.",
    summaryInfo: "Sažetak za svaki odabrani džuz/suru prikazuje broj stranica po statusu — naučeno, u toku, ponavljanje, savladano, treba vježbe i nije počet — uključujući nezapočete.",
    includeLabel: "Uključi sekcije",
    byJuz: "Pregled po džuzevima",
    bySurah: "Pregled po surama",
    advancedToggle: "Napredni izbor — ručno odaberi džuzeve/sure",
    selectAll: "Označi sve",
    deselectAll: "Odznači sve",
    juzevi: "Džuzevi",
    all: "Sve",
    none: "Nijedan",
    sure: "Sure",
    noneF: "Nijedna",
    searchPh: "Pretraži sure…",
    nothingSelected: "Nijedna sekcija nije uključena.",
    summaryEst: (n, juzPart, surahPart, sep) => `≈ ${n} redova sažetka (${juzPart}${sep}${surahPart})`,
    detailedEst: (n, juzPart, surahPart, sep) => `≈ ${n} redova u izvještaju (${juzPart}${sep}${surahPart})`,
    juzCount: (n) => `${n} džuzeva`,
    surahCount: (n) => `${n} sura`,
    juzRowCount: (n) => `${n} po džuzevima`,
    surahRowCount: (n) => `${n} po surama`,
    cancel: "Odustani",
    generate: "Generiši izvještaj",
  },
  en: {
    title: "Export PDF report",
    subtitle: "Set what should be shown before generating.",
    formatLabel: "Report format",
    detailedTitle: "Detailed",
    detailedDesc: "One row per page, with ✓ and space for notes",
    summaryTitle: "Summary",
    summaryDesc: "Just counts by status, no page list",
    hideEmptyLabel: "Show only started pages",
    hideEmptyDesc: "Skips empty (not started) pages, and entire juz/surahs you haven't touched at all.",
    summaryInfo: "The summary shows, for every selected juz/surah, the number of pages by status — learned, in progress, review, mastered, needs practice, and not started — including untouched pages.",
    includeLabel: "Include sections",
    byJuz: "Overview by juz",
    bySurah: "Overview by surah",
    advancedToggle: "Advanced selection — manually pick juz/surahs",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    juzevi: "Juz",
    all: "All",
    none: "None",
    sure: "Surahs",
    noneF: "None",
    searchPh: "Search surahs…",
    nothingSelected: "No section is included.",
    summaryEst: (n, juzPart, surahPart, sep) => `≈ ${n} summary rows (${juzPart}${sep}${surahPart})`,
    detailedEst: (n, juzPart, surahPart, sep) => `≈ ${n} rows in the report (${juzPart}${sep}${surahPart})`,
    juzCount: (n) => `${n} juz`,
    surahCount: (n) => `${n} surahs`,
    juzRowCount: (n) => `${n} by juz`,
    surahRowCount: (n) => `${n} by surah`,
    cancel: "Cancel",
    generate: "Generate report",
  },
};

export function HifzPdfExportOptions({
  theme, pageStatuses,
  reportFormat, setReportFormat,
  hideEmpty, setHideEmpty,
  includeJuz, setIncludeJuz,
  includeSurah, setIncludeSurah,
  selectedJuz, setSelectedJuz,
  selectedSurah, setSelectedSurah,
  onClose, onGenerate,
}) {
  const { lang } = useLang();
  const s = STR[lang] || STR.bs;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [surahSearch, setSurahSearch]   = useState("");

  const isLight    = theme?.id === "beige_white" || theme?.id === "pink_soft";
  const cardAltCls = theme?.cardAlt || "bg-white/[0.02] border border-white/8";
  const cardSubCls = theme?.cardSub || "bg-white/[0.01] border border-white/6";
  const textCls    = theme?.text    || "text-white";
  const mutedCls   = theme?.muted   || "text-white/40";
  const tBorder    = isLight ? "border-black/8" : "border-white/[0.06]";
  const tInput     = isLight
    ? "border-black/12 bg-black/5 text-[#3D2E22] placeholder:text-black/25 focus:border-[#1D9E75]/50"
    : "border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#1D9E75]/50";

  const juzHasProgress   = j  => getJuzPages(j).some(p => isStarted(pageStatuses, p));
  const surahHasProgress = su => {
    for (let p = su.startPage; p <= su.endPage; p++) if (isStarted(pageStatuses, p)) return true;
    return false;
  };

  const countPagesFor = (pages) => pages.filter(p => !hideEmpty || isStarted(pageStatuses, p)).length;
  const juzRows = includeJuz
    ? ALL_JUZ.filter(j => selectedJuz.has(j)).reduce((sum, j) => sum + countPagesFor(getJuzPages(j)), 0)
    : 0;
  const surahRows = includeSurah
    ? SURA_DATA.filter(su => selectedSurah.has(su.id)).reduce((sum, su) => {
        const pages = Array.from({ length: su.endPage - su.startPage + 1 }, (_, i) => su.startPage + i);
        return sum + countPagesFor(pages);
      }, 0)
    : 0;

  const toggleJuz = j => setSelectedJuz(prev => {
    const next = new Set(prev);
    next.has(j) ? next.delete(j) : next.add(j);
    return next;
  });
  const toggleSurah = id => setSelectedSurah(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const filteredSurahList = SURA_DATA.filter(su => {
    const q = surahSearch.trim().toLowerCase();
    if (!q) return true;
    return su.name.toLowerCase().includes(q) || String(su.id).includes(q);
  });

  const nothingToShow = !includeJuz && !includeSurah;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6">
      <div className={`w-full max-w-xl rounded-2xl border p-5 sm:p-6 flex flex-col gap-5 ${cardAltCls}`}>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className={`text-base font-bold ${textCls}`}>{s.title}</h2>
            <p className={`text-xs mt-0.5 ${mutedCls}`}>{s.subtitle}</p>
          </div>
          <button onClick={onClose}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-all ${cardSubCls} ${mutedCls}`}>
            ✕
          </button>
        </div>

        {/* Format izvještaja */}
        <div className="flex flex-col gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${mutedCls}`}>{s.formatLabel}</span>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setReportFormat("detailed")}
              className={`flex flex-col items-start px-3.5 py-2.5 rounded-xl border text-left transition-all
                ${reportFormat === "detailed" ? "bg-[#1D9E75]/20 border-[#1D9E75]/40 text-[#49C79A]" : `${cardSubCls} ${mutedCls} hover:opacity-80`}`}>
              <span className="text-xs font-bold">{s.detailedTitle}</span>
              <span className="text-[10px] opacity-70 mt-0.5">{s.detailedDesc}</span>
            </button>
            <button onClick={() => setReportFormat("summary")}
              className={`flex flex-col items-start px-3.5 py-2.5 rounded-xl border text-left transition-all
                ${reportFormat === "summary" ? "bg-[#1D9E75]/20 border-[#1D9E75]/40 text-[#49C79A]" : `${cardSubCls} ${mutedCls} hover:opacity-80`}`}>
              <span className="text-xs font-bold">{s.summaryTitle}</span>
              <span className="text-[10px] opacity-70 mt-0.5">{s.summaryDesc}</span>
            </button>
          </div>
        </div>

        {/* Glavni filter - rješava "previše stranica" (samo za Detaljno; Sažetak uvijek broji i nezapočete) */}
        {reportFormat === "detailed" ? (
          <button onClick={() => setHideEmpty(v => !v)}
            className="w-full flex items-center justify-between gap-3 text-left">
            <div>
              <span className={`text-xs font-semibold block ${textCls}`}>{s.hideEmptyLabel}</span>
              <p className={`text-[10px] mt-0.5 ${mutedCls}`}>
                {s.hideEmptyDesc}
              </p>
            </div>
            <div className={`flex-shrink-0 w-10 h-6 rounded-full p-0.5 transition-all ${hideEmpty ? "bg-[#1D9E75]" : (isLight ? "bg-black/15" : "bg-white/15")}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-all ${hideEmpty ? "translate-x-4" : "translate-x-0"}`} />
            </div>
          </button>
        ) : (
          <p className={`text-[10px] ${mutedCls}`}>
            {s.summaryInfo}
          </p>
        )}

        {/* Koje sekcije uključiti */}
        <div className={`pt-4 border-t ${tBorder} flex flex-col gap-2.5`}>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${mutedCls}`}>{s.includeLabel}</span>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={includeJuz} onChange={e => setIncludeJuz(e.target.checked)}
              className="accent-[#1D9E75] w-4 h-4" />
            <span className={`text-sm ${textCls}`}>{s.byJuz}</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={includeSurah} onChange={e => setIncludeSurah(e.target.checked)}
              className="accent-[#378ADD] w-4 h-4" />
            <span className={`text-sm ${textCls}`}>{s.bySurah}</span>
          </label>
        </div>

        {/* Napredni izbor - ručno biranje tačno kojih džuzeva/sura */}
        <div className={`pt-4 border-t ${tBorder}`}>
          <div className="w-full flex items-center justify-between gap-2">
            <button onClick={() => setAdvancedOpen(v => !v)} className="flex items-center gap-2 min-w-0">
              <span className={`text-[10px] font-semibold uppercase tracking-wider truncate ${mutedCls}`}>
                {s.advancedToggle}
              </span>
              <span className={`text-xs flex-shrink-0 ${mutedCls} transition-transform ${advancedOpen ? "rotate-180" : ""}`}>⌄</span>
            </button>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => { setSelectedJuz(new Set(ALL_JUZ)); setSelectedSurah(new Set(SURA_DATA.map(su => su.id))); }}
                className="text-[10px] font-semibold text-[#1D9E75] hover:opacity-70">
                {s.selectAll}
              </button>
              <button onClick={() => { setSelectedJuz(new Set()); setSelectedSurah(new Set()); }}
                className="text-[10px] font-semibold text-[#EF6F6F] hover:opacity-70">
                {s.deselectAll}
              </button>
            </div>
          </div>

          {advancedOpen && (
            <div className="flex flex-col gap-5 mt-4">

              {/* Džuz grid */}
              <div className={includeJuz ? "" : "opacity-40 pointer-events-none"}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${textCls}`}>{s.juzevi}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedJuz(new Set(ALL_JUZ))}
                      className={`text-[10px] font-semibold ${mutedCls} hover:opacity-70`}>{s.all}</button>
                    <button onClick={() => setSelectedJuz(new Set())}
                      className={`text-[10px] font-semibold ${mutedCls} hover:opacity-70`}>{s.none}</button>
                  </div>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                  {ALL_JUZ.map(j => {
                    const active = selectedJuz.has(j);
                    const hasProgress = juzHasProgress(j);
                    return (
                      <button key={j} onClick={() => toggleJuz(j)}
                        className={`relative h-8 rounded-lg border text-xs font-bold transition-all
                          ${active ? "bg-[#1D9E75]/20 border-[#1D9E75]/40 text-[#49C79A]" : `${cardSubCls} ${mutedCls} hover:opacity-80`}`}>
                        {j}
                        {hasProgress && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Surah checklist */}
              <div className={includeSurah ? "" : "opacity-40 pointer-events-none"}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${textCls}`}>{s.sure}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedSurah(new Set(SURA_DATA.map(su => su.id)))}
                      className={`text-[10px] font-semibold ${mutedCls} hover:opacity-70`}>{s.all}</button>
                    <button onClick={() => setSelectedSurah(new Set())}
                      className={`text-[10px] font-semibold ${mutedCls} hover:opacity-70`}>{s.noneF}</button>
                  </div>
                </div>
                <input type="text" value={surahSearch} onChange={e => setSurahSearch(e.target.value)}
                  placeholder={s.searchPh}
                  className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition-all mb-2 ${tInput}`} />
                <div className={`max-h-48 overflow-y-auto flex flex-col rounded-lg border ${tBorder}`}>
                  {filteredSurahList.map(su => (
                    <label key={su.id}
                      className={`flex items-center gap-2.5 px-3 py-1.5 cursor-pointer border-b last:border-b-0 ${tBorder} ${isLight ? "hover:bg-black/[0.03]" : "hover:bg-white/[0.03]"}`}>
                      <input type="checkbox" checked={selectedSurah.has(su.id)} onChange={() => toggleSurah(su.id)}
                        className="accent-[#378ADD] w-3.5 h-3.5 flex-shrink-0" />
                      <span className={`text-[10px] font-mono w-5 flex-shrink-0 ${mutedCls}`}>{su.id}</span>
                      <span className={`text-xs flex-1 ${textCls}`}>{su.name}</span>
                      {surahHasProgress(su) && <span className="w-1.5 h-1.5 rounded-full bg-[#378ADD] flex-shrink-0" />}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live procjena + akcije */}
        <div className={`pt-4 border-t ${tBorder} flex items-center justify-between gap-3`}>
          <span className={`text-[11px] ${mutedCls}`}>
            {nothingToShow
              ? s.nothingSelected
              : reportFormat === "summary"
                ? s.summaryEst(
                    (includeJuz ? selectedJuz.size : 0) + (includeSurah ? selectedSurah.size : 0),
                    includeJuz ? s.juzCount(selectedJuz.size) : "",
                    includeSurah ? s.surahCount(selectedSurah.size) : "",
                    includeJuz && includeSurah ? " + " : ""
                  )
                : s.detailedEst(
                    juzRows + surahRows,
                    includeJuz ? s.juzRowCount(juzRows) : "",
                    includeSurah ? s.surahRowCount(surahRows) : "",
                    includeJuz && includeSurah ? " + " : ""
                  )}
          </span>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${cardSubCls} ${mutedCls} hover:opacity-80`}>
            {s.cancel}
          </button>
          <button onClick={onGenerate} disabled={nothingToShow}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              nothingToShow ? "bg-[#1D9E75]/30 text-white/50 cursor-not-allowed" : "bg-[#1D9E75] text-white hover:bg-[#1A8E68]"}`}>
            {s.generate}
          </button>
        </div>
      </div>
    </div>
  );
}
