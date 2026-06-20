import { useState, useMemo } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { useArabicSize } from "../../../context/ArabicSizeContext";
import { useLang } from "../../../context/LanguageContext";
import { STATUS } from "../../../constants/hifz/STATUS";
import { SURA_DATA } from "../../../constants/hifz/SURA_DATA";
import { todayStr, toArabicNumerals } from "../../../constants/hifz/helpers";
import { ArabicText } from "../../../components/hifz/shared/ArabicText";
import { useHifzState, getStreak } from "../../../hooks/hifz/useHifzState";
import { DzuzCard } from "./components/DzuzCard";
import { JuzDetailView } from "./components/JuzDetailView";
import { PageDetailView } from "./components/PageDetailView";
import { VerseDetailView } from "./components/VerseDetailView";
import { SuraCard } from "./components/SuraCard";
import { SurahDetailView } from "./components/SurahDetailView";
import { PageGridView } from "./components/PageGridView";

export default function HifzPlanner() {
  const { theme }  = useTheme();
  const { lang, setLang, s } = useLang();
  const { arabicSize, setArabicSize } = useArabicSize();

  // ── State ────────────────────────────────────────────────────────────────
  const {
    pageStatuses, verseStatuses, surahStatuses,
    setPageStatus, savePageDetail, saveVerseDetail, saveSurahDetail,
  } = useHifzState();

  const [activeTab,    setActiveTab]    = useState("juz");
  const [view,         setView]         = useState({ type: "juzGrid" });
  const [selectedSura, setSelectedSura] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [legendOpen,   setLegendOpen]   = useState(() => {
    try { return localStorage.getItem("tmizan_legend_open") !== "false"; } catch { return true; }
  });
  const [surahSearch,  setSurahSearch]  = useState("");
  const [pageSearch,   setPageSearch]   = useState("");

  const [rowsPerPage, setRowsPerPage] = useState(() => {
    try { return Number(localStorage.getItem("tmizan_rows_per_page")) || 15; } catch { return 15; }
  });
  const handleSetRows = n => { setRowsPerPage(n); try { localStorage.setItem("tmizan_rows_per_page", n); } catch {} };

  const toggleLegend = () => {
    const next = !legendOpen;
    setLegendOpen(next);
    try { localStorage.setItem("tmizan_legend_open", next); } catch {};
  };

  // ── Statistike ───────────────────────────────────────────────────────────
  const today       = todayStr();
  const totalDone   = Object.values(pageStatuses).filter(p => p.status === "naucen" || p.status === "savladano").length;
  const totalReview = Object.values(pageStatuses).filter(p => p.status === "ponavljanje").length;
  const pctDone     = Math.round((totalDone / 604) * 100);

  const streak = getStreak();

  const todayActive = Object.values(pageStatuses).filter(p =>
    p.startDate === today || p.lastRepeat === today
  ).length + Object.values(verseStatuses).filter(v =>
    v.startDate === today || v.lastRepeat === today
  ).length;

  const nextReviewPage = useMemo(() => {
    const candidates = Object.entries(pageStatuses)
      .filter(([, p]) => p.status === "ponavljanje" && p.lastRepeat)
      .sort((a, b) => a[1].lastRepeat.localeCompare(b[1].lastRepeat));
    return candidates[0]?.[0] || null;
  }, [pageStatuses]);

  // ── Surah filter ─────────────────────────────────────────────────────────
  const filteredSurahs = useMemo(() => {
    const q = surahSearch.trim().toLowerCase();
    if (!q) return SURA_DATA;
    return SURA_DATA.filter(su =>
      su.name.toLowerCase().includes(q) ||
      String(su.id).includes(q) ||
      String(su.startPage).includes(q)
    );
  }, [surahSearch]);

  const resetNav = tab => { setActiveTab(tab); setView({ type: "juzGrid" }); setSelectedSura(null); setShowSettings(false); setSurahSearch(""); setPageSearch(""); };

  // ── Tema ─────────────────────────────────────────────────────────────────
  const isLight    = theme?.id === "beige_white" || theme?.id === "pink_soft";
  const cardCls    = theme?.card    || "bg-white/[0.04] border border-white/10";
  const cardAltCls = theme?.cardAlt || "bg-white/[0.02] border border-white/8";
  const cardSubCls = theme?.cardSub || "bg-white/[0.01] border border-white/6";
  const textCls    = theme?.text    || "text-white";
  const mutedCls   = theme?.muted   || "text-white/40";
  const tBorderCls = isLight ? "border-black/8" : "border-white/[0.06]";
  const tInput     = isLight
    ? "border-black/12 bg-black/5 text-[#3D2E22] placeholder:text-black/25 focus:border-[#1D9E75]/50"
    : "border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#1D9E75]/50";

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5 p-3 sm:p-5 bg-transparent">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${textCls}`}>Hifz Planner</h1>
          <p className={`text-xs mt-0.5 ${mutedCls}`}>{s.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === "bs" ? "en" : "bs")}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${cardCls} ${mutedCls} hover:opacity-80`}
            title={s.settings.language}>
            {lang === "bs" ? "EN" : "BS"}
          </button>
          <button onClick={() => setShowSettings(v => !v)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all
              ${showSettings ? "bg-[#1D9E75]/20 border-[#1D9E75]/40 text-[#49C79A]" : `${cardCls} ${mutedCls} hover:opacity-80`}`}>
            {s.nav.settings}
          </button>
        </div>
      </div>

      {/* ── SETTINGS ──────────────────────────────────────────────────────── */}
      {showSettings && (
        <div className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-5 ${cardAltCls}`}>
          <h2 className={`text-sm font-bold ${textCls}`}>{s.settings.title}</h2>

          {/* Veličina arapskog teksta */}
          <div>
            <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-3 ${mutedCls}`}>
              {s.settings.arabicSize(arabicSize)}
            </label>
            <div className="flex items-center gap-4">
              <button onClick={() => setArabicSize(v => Math.max(16, v - 2))}
                className={`w-8 h-8 rounded-lg border text-sm font-bold hover:opacity-80 transition-all flex items-center justify-center ${cardSubCls} ${mutedCls}`}>−</button>
              <div className="flex-1">
                <input type="range" min="16" max="48" step="2" value={arabicSize}
                  onChange={e => setArabicSize(Number(e.target.value))}
                  className="w-full accent-[#1D9E75] h-1.5 rounded-full cursor-pointer" />
              </div>
              <button onClick={() => setArabicSize(v => Math.min(48, v + 2))}
                className={`w-8 h-8 rounded-lg border text-sm font-bold hover:opacity-80 transition-all flex items-center justify-center ${cardSubCls} ${mutedCls}`}>+</button>
              <button onClick={() => setArabicSize(28)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold hover:opacity-80 transition-all ${cardSubCls} ${mutedCls}`}>
                Reset
              </button>
            </div>
            <div className={`mt-4 p-3 rounded-xl border ${cardSubCls}`}>
              <p className={`text-[10px] uppercase tracking-wider mb-2 ${mutedCls}`}>{s.settings.preview}</p>
              <ArabicText text="بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ" verseNumber={1} />
            </div>
          </div>

          {/* Mushaf izdanje */}
          <div className={`pt-4 border-t ${tBorderCls}`}>
            <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${mutedCls}`}>
              {s.settings.mushhafEdition}
            </label>
            <p className={`text-[10px] mb-3 ${mutedCls} opacity-60`}>
              {s.settings.mushhafDesc}
            </p>
            <div className="flex gap-2 flex-wrap">
              {[
                { rows: 13, sub: s.settings.edition13 },
                { rows: 15, sub: s.settings.edition15 },
                { rows: 16, sub: s.settings.edition16 },
              ].map(({ rows, sub }) => (
                <button key={rows} onClick={() => handleSetRows(rows)}
                  className={`flex flex-col items-start px-4 py-2.5 rounded-xl border text-left transition-all
                    ${rowsPerPage === rows
                      ? "bg-[#1D9E75]/20 border-[#1D9E75]/40 text-[#49C79A]"
                      : `${cardSubCls} ${mutedCls} hover:opacity-80`}`}>
                  <span className="text-base font-black">{s.settings.lines(rows)}</span>
                  <span className="text-[10px] opacity-60 mt-0.5">{sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STATISTIKE ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {/* Naučeno */}
        <div className={`rounded-xl border p-3 sm:p-4 ${cardCls}`}>
          <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${mutedCls}`}>{s.stats.learned}</div>
          <div className={`text-2xl font-black leading-none ${textCls}`}>{pctDone}%</div>
          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>{s.stats.pagesOf(totalDone)}</div>
        </div>
        {/* Ponavljanje */}
        <div className={`rounded-xl border p-3 sm:p-4 ${cardCls}`}>
          <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${mutedCls}`}>{s.stats.review}</div>
          <div className="text-2xl font-black leading-none text-[#67A6E6]">{totalReview}</div>
          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>{s.stats.pages}</div>
        </div>
        {/* Streak */}
        <div className={`rounded-xl border p-3 sm:p-4 ${cardCls}`}>
          <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${mutedCls}`}>{s.stats.streak}</div>
          <div className="text-2xl font-black leading-none text-[#F5B453]">{streak > 0 ? `${streak}🔥` : "—"}</div>
          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>{s.stats.streakDays}</div>
        </div>
        {/* Danas */}
        <div className={`rounded-xl border p-3 sm:p-4 ${cardCls}`}>
          <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${mutedCls}`}>{s.stats.today}</div>
          <div className={`text-2xl font-black leading-none ${todayActive > 0 ? "text-[#49C79A]" : textCls}`}>{todayActive}</div>
          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>{s.stats.todayPages}</div>
        </div>
        {/* Sljedeće ponavljanje */}
        <div className={`rounded-xl border p-3 sm:p-4 col-span-2 sm:col-span-1 ${cardCls}`}>
          <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${mutedCls}`}>{s.stats.nextReview}</div>
          {nextReviewPage ? (
            <button onClick={() => setView({ type: "pageDetail", page: Number(nextReviewPage), juz: null })}
              className="text-2xl font-black leading-none text-[#67A6E6] hover:opacity-70 transition-all text-left">
              {s.stats.nextReviewPage(nextReviewPage)}
            </button>
          ) : (
            <div className={`text-2xl font-black leading-none ${mutedCls}`}>—</div>
          )}
          <div className={`text-[10px] mt-0.5 ${mutedCls}`}>{s.stats.nextReviewSub}</div>
        </div>
      </div>

      {/* ── LEGENDA (collapsible) ─────────────────────────────────────────── */}
      <div className={`rounded-xl border overflow-hidden ${cardAltCls}`}>
        <button onClick={toggleLegend}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:opacity-80 transition-all">
          <div className="flex items-center gap-3 flex-wrap">
            {legendOpen
              ? Object.entries(STATUS).map(([key, st]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-[3px] ${st.dot}`} />
                    <span className={`text-[10px] sm:text-xs font-medium ${mutedCls}`}>
                      {s.statusLabel[key]?.label || st.label}
                    </span>
                  </div>
                ))
              : <span className={`text-[10px] font-semibold uppercase tracking-wider ${mutedCls}`}>
                  {s.nav.legendTitle}
                </span>
            }
          </div>
          <span className={`text-xs flex-shrink-0 ml-3 transition-transform duration-200 ${legendOpen ? "rotate-180" : ""} ${mutedCls}`}>⌄</span>
        </button>
      </div>

      {/* ── TABOVI ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3 text-sm font-semibold select-none overflow-x-auto pb-1">
        {[
          { id: "juz",   label: s.nav.byJuz  },
          { id: "surah", label: s.nav.bySurah },
          { id: "page",  label: s.nav.byPage  },
        ].map((tab, idx) => (
          <span key={tab.id} className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {idx > 0 && <span className={`opacity-20 pointer-events-none ${mutedCls}`}>|</span>}
            <button onClick={() => resetNav(tab.id)}
              className={`transition-colors hover:opacity-100 whitespace-nowrap
                ${activeTab === tab.id ? "text-[#1D9E75]" : `${mutedCls} opacity-70`}`}>
              {tab.label}
            </button>
          </span>
        ))}
      </div>

      {/* ── SADRŽAJ ───────────────────────────────────────────────────────── */}
      <div className="min-h-[400px]">

        {/* Džuzevi */}
        {activeTab === "juz" && (
          <>
            {view.type === "juzGrid" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                {Array.from({ length: 30 }, (_, i) => i + 1).map(juzNo => (
                  <DzuzCard key={juzNo} juzNo={juzNo} pageStatuses={pageStatuses} theme={theme} lang={lang} s={s}
                    onPageClick={(p, st) => setPageStatus(p, st)}
                    onCardClick={() => setView({ type: "juzDetail", juz: juzNo })} />
                ))}
              </div>
            )}
            {view.type === "juzDetail" && (
              <JuzDetailView juzNo={view.juz} pageStatuses={pageStatuses} theme={theme} lang={lang} s={s}
                onPageStatusChange={(p, st) => setPageStatus(p, st)}
                onOpenPage={p => setView({ type: "pageDetail", juz: view.juz, page: p })}
                onBack={() => setView({ type: "juzGrid" })} />
            )}
            {view.type === "pageDetail" && (
              <PageDetailView
                pageNum={view.page} pageData={pageStatuses[view.page]}
                onSave={savePageDetail}
                onBack={() => view.juz ? setView({ type: "juzDetail", juz: view.juz }) : resetNav("page")}
                verseStatuses={verseStatuses} onSaveVerse={saveVerseDetail}
                onOpenVerse={verse => setView({ type: "verseDetail", verse, prevPage: view.page, prevJuz: view.juz })}
                rowsPerPage={rowsPerPage} theme={theme} lang={lang} s={s}
              />
            )}
            {view.type === "verseDetail" && (
              <VerseDetailView
                verse={view.verse} verseData={verseStatuses[view.verse?.verse_key]}
                onSave={data => saveVerseDetail(view.verse?.verse_key, data)}
                onBack={() => setView({ type: "pageDetail", juz: view.prevJuz, page: view.prevPage })}
                theme={theme} lang={lang} s={s}
              />
            )}
          </>
        )}

        {/* Sure */}
        {activeTab === "surah" && !selectedSura && (
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none ${mutedCls}`}>🔍</span>
              <input
                value={surahSearch} onChange={e => setSurahSearch(e.target.value)}
                placeholder={s.search.surahPh}
                className={`w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none transition-all ${tInput}`}
              />
              {surahSearch && (
                <button onClick={() => setSurahSearch("")}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${mutedCls} hover:opacity-100 transition-all`}>✕</button>
              )}
            </div>
            {filteredSurahs.length === 0
              ? <p className={`text-sm py-8 text-center ${mutedCls}`}>{s.search.noResults}</p>
              : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  {filteredSurahs.map(surah => {
                    const total = surah.endPage - surah.startPage + 1;
                    const done  = Array.from({ length: total }, (_, i) => surah.startPage + i)
                      .filter(p => pageStatuses[p]?.status === "naucen" || pageStatuses[p]?.status === "savladano").length;
                    return (
                      <SuraCard key={surah.id} surah={surah} done={done} total={total}
                        onClick={() => { setSelectedSura(surah); setView({ type: "surahDetail" }); }}
                        theme={theme} lang={lang} s={s} />
                    );
                  })}
                </div>
            }
          </div>
        )}
        {activeTab === "surah" && selectedSura && view.type === "surahDetail" && (
          <SurahDetailView
            surah={selectedSura} pageStatuses={pageStatuses}
            surahData={surahStatuses[selectedSura.id]} onSave={saveSurahDetail}
            onBack={() => { setSelectedSura(null); setView({ type: "juzGrid" }); }}
            onOpenPage={p => setView({ type: "pageDetail", page: p, fromSurah: selectedSura })}
            theme={theme} s={s}
          />
        )}
        {activeTab === "surah" && selectedSura && view.type === "pageDetail" && (
          <PageDetailView
            pageNum={view.page} pageData={pageStatuses[view.page]}
            onSave={savePageDetail}
            onBack={() => setView({ type: "surahDetail" })}
            verseStatuses={verseStatuses} onSaveVerse={saveVerseDetail}
            onOpenVerse={verse => setView({ type: "verseDetail", verse, prevPage: view.page, fromSurah: view.fromSurah })}
            rowsPerPage={rowsPerPage} theme={theme} lang={lang} s={s}
          />
        )}
        {activeTab === "surah" && selectedSura && view.type === "verseDetail" && (
          <VerseDetailView
            verse={view.verse} verseData={verseStatuses[view.verse?.verse_key]}
            onSave={data => saveVerseDetail(view.verse?.verse_key, data)}
            onBack={() => setView({ type: "pageDetail", page: view.prevPage, fromSurah: view.fromSurah })}
            theme={theme} lang={lang} s={s}
          />
        )}

        {/* Stranice */}
        {activeTab === "page" && view.type === "juzGrid" && (
          <div className="flex flex-col gap-3">
            {/* Search po stranici */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none ${mutedCls}`}>🔍</span>
                <input
                  value={pageSearch}
                  onChange={e => setPageSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && pageSearch && Number(pageSearch) >= 1 && Number(pageSearch) <= 604) {
                      setView({ type: "pageDetail", juz: null, page: Number(pageSearch) });
                    }
                  }}
                  placeholder={s.search.pagePh}
                  className={`w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none transition-all ${tInput}`}
                  type="number" min="1" max="604"
                />
                {pageSearch && (
                  <button onClick={() => setPageSearch("")}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${mutedCls} hover:opacity-100 transition-all`}>✕</button>
                )}
              </div>
              {pageSearch && Number(pageSearch) >= 1 && Number(pageSearch) <= 604 && (
                <button
                  onClick={() => setView({ type: "pageDetail", juz: null, page: Number(pageSearch) })}
                  className="px-4 py-2.5 rounded-xl bg-[#1D9E75]/20 border border-[#1D9E75]/40 text-[#49C79A] text-sm font-bold hover:bg-[#1D9E75]/30 transition-all whitespace-nowrap flex-shrink-0">
                  {s.search.goToPage(pageSearch)}
                </button>
              )}
            </div>
            <PageGridView
              pageStatuses={pageStatuses}
              pageFilter={pageSearch ? Number(pageSearch) : null}
              onOpenPage={p => setView({ type: "pageDetail", juz: null, page: p })}
              theme={theme} s={s}
            />
          </div>
        )}
        {activeTab === "page" && view.type === "pageDetail" && (
          <PageDetailView
            pageNum={view.page} pageData={pageStatuses[view.page]}
            onSave={savePageDetail}
            onBack={() => setView({ type: "juzGrid" })}
            verseStatuses={verseStatuses} onSaveVerse={saveVerseDetail}
            onOpenVerse={verse => setView({ type: "verseDetail", verse, prevPage: view.page, prevJuz: null })}
            rowsPerPage={rowsPerPage} theme={theme} lang={lang} s={s}
          />
        )}
        {activeTab === "page" && view.type === "verseDetail" && (
          <VerseDetailView
            verse={view.verse} verseData={verseStatuses[view.verse?.verse_key]}
            onSave={data => saveVerseDetail(view.verse?.verse_key, data)}
            onBack={() => setView({ type: "pageDetail", juz: null, page: view.prevPage })}
            theme={theme} lang={lang} s={s}
          />
        )}
      </div>
    </div>
  );
}
