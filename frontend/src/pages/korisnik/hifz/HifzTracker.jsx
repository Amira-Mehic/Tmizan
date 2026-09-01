// ============================================================================
// Glavni ekran za evidenciju hifza. Napredak se može pratiti na tri nivoa -
// po džuzu, po suri i po pojedinačnoj stranici - jer korisnici razmišljaju u
// različitim jedinicama, a podaci ispod su isti. Prikaz se prebacuje između tih
// pogleda, uz filtriranje i mogućnost da se vide samo započete stranice.
// Sve stanje dolazi iz useHifzState, pa ovaj ekran ne pristupa bazi direktno.
// ============================================================================

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTheme } from "../../../context/ThemeContext";
import { useArabicSize } from "../../../context/ArabicSizeContext";
import { useLang } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";
import { STATUS } from "../../../constants/hifz/STATUS";
import { SURA_DATA } from "../../../constants/hifz/SURA_DATA";
import { todayStr, getDominantStatus, getJuzPages } from "../../../constants/hifz/helpers";
import { ArabicText } from "../../../components/hifz/shared/ArabicText";
import { useHifzState, getStreak } from "../../../hooks/hifz/useHifzState";
import { useAllPageVerseKeys } from "../../../hooks/hifz/useAllPageVerseKeys";
import { HifzPdfExportView } from "./components/HifzPdfExportView";
import { DzuzCard } from "./components/DzuzCard";
import { JuzDetailView } from "./components/JuzDetailView";
import { PageDetailView } from "./components/PageDetailView";
import { VerseDetailView } from "./components/VerseDetailView";
import { SuraCard } from "./components/SuraCard";
import { SurahDetailView } from "./components/SurahDetailView";
import { PageGridView } from "./components/PageGridView";
import BackButton from "../../../components/shared/BackButton";
import { ResetProgressSection } from "./components/ResetProgressSection";
import { FirstTimeHint } from "../../../components/shared/FirstTimeHint";
import GuidedTour from "../../../components/shared/GuidedTour";
import { PageTourButton } from "../../../components/shared/PageTourButton";
import { HIFZ_TRACKER_TOUR } from "../../../constants/tours/hifzTrackerTour";
import { hasSeenTour, markTourSeen } from "../../../lib/tourStorage";
import HelpTip from "../../../components/shared/HelpTip";

export default function HifzPlanner() {
  const { theme }  = useTheme();
  const { lang, setLang, s } = useLang();
  const { arabicSize, setArabicSize } = useArabicSize();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Ako je korisnik ovdje stigao preko "Unesi ručno" na koraku 1 plana
  // ponavljanja, prikaži floating dugme da se lako vrati i nastavi wizard
  // (korak 2 - Metoda), umjesto da mora ručno tražiti put nazad.
  const fromReviewSetup = searchParams.get("fromReviewSetup") === "1";

  // ── Kratak vodič, prvi put kad korisnik uđe na ovu stranicu ──
  // Čisto sinhrona provjera (localStorage) - prilagođava se tokom rendera uz
  // poređenje s prethodnim user?.id (isti okidač kao stari dependency niz).
  const [showTour, setShowTour] = useState(false);
  const [prevUserIdTour, setPrevUserIdTour] = useState(user?.id);
  if (user?.id !== prevUserIdTour) {
    setPrevUserIdTour(user?.id);
    if (user?.id && !hasSeenTour(user.id, "hifz-tracker")) setShowTour(true);
  }
  const finishTour = () => { if (user?.id) markTourSeen(user.id, "hifz-tracker"); setShowTour(false); };

  // ── State ────────────────────────────────────────────────────────────────
  const {
    pageStatuses, verseStatuses, surahStatuses,
    setPageStatus, setPageStatusBulk, setPagesStatusBulk, savePageDetail, saveVerseDetail, saveSurahDetail, setSurahStatusBulk,
    resetPageData, resetSurahData, resetPagesData,
  } = useHifzState();

  // Tab/view/odabrana sura se pamte u sessionStorage - tako da odlazak na
  // Postavke (odvojena ruta, van HifzTrackera) i povratak nazad ne resetuje
  // korisnika na početni ekran, nego ga vrati tačno gdje je bio.
  const [activeTab,    setActiveTab]    = useState(() => {
    try { return sessionStorage.getItem("tmizan_active_tab") || "juz"; } catch { return "juz"; }
  });
  const [view,         setView]         = useState(() => {
    try {
      const saved = sessionStorage.getItem("tmizan_view");
      return saved ? JSON.parse(saved) : { type: "juzGrid" };
    } catch { return { type: "juzGrid" }; }
  });
  const [selectedSura, setSelectedSura] = useState(() => {
    try {
      const saved = sessionStorage.getItem("tmizan_selected_sura");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showPdfExport, setShowPdfExport] = useState(false);
  const { pageVerseKeys, loadingKeys } = useAllPageVerseKeys(showPdfExport);

  useEffect(() => {
    try { sessionStorage.setItem("tmizan_active_tab", activeTab); } catch { /* sessionStorage nedostupan */ }
  }, [activeTab]);
  useEffect(() => {
    try { sessionStorage.setItem("tmizan_view", JSON.stringify(view)); } catch { /* sessionStorage nedostupan */ }
  }, [view]);
  useEffect(() => {
    try {
      if (selectedSura) sessionStorage.setItem("tmizan_selected_sura", JSON.stringify(selectedSura));
      else sessionStorage.removeItem("tmizan_selected_sura");
    } catch { /* sessionStorage nedostupan */ }
  }, [selectedSura]);
  const [legendOpen,   setLegendOpen]   = useState(() => {
    try { return localStorage.getItem("tmizan_legend_open") !== "false"; } catch { return true; }
  });
  const [surahSearch,  setSurahSearch]  = useState("");
  const [pageSearch,   setPageSearch]   = useState("");

  // Filter: prikaži samo započete (bilo koji status != prazna) i naučene -
  // radi kroz sva tri taba (juz/sura su grupni uslov "bar jedna stranica",
  // stranica je pojedinačni uslov).
  const [onlyStarted, setOnlyStarted] = useState(() => {
    try { return localStorage.getItem("tmizan_only_started") === "true"; } catch { return false; }
  });
  const toggleOnlyStarted = () => {
    const next = !onlyStarted;
    setOnlyStarted(next);
    try { localStorage.setItem("tmizan_only_started", String(next)); } catch { /* localStorage nedostupan */ }
  };

  const [rowsPerPage, setRowsPerPage] = useState(() => {
    try { return Number(localStorage.getItem("tmizan_rows_per_page")) || 15; } catch { return 15; }
  });
  const handleSetRows = n => { setRowsPerPage(n); try { localStorage.setItem("tmizan_rows_per_page", n); } catch { /* localStorage nedostupan */ } };

  const [hideMemorizeWarning, setHideMemorizeWarning] = useState(() => {
    try { return localStorage.getItem("tmizan_hide_memorize_warning") === "true"; } catch { return false; }
  });
  const toggleMemorizeWarning = () => {
    const next = !hideMemorizeWarning;
    setHideMemorizeWarning(next);
    try { localStorage.setItem("tmizan_hide_memorize_warning", String(next)); } catch { /* localStorage nedostupan */ }
  };

  const toggleLegend = () => {
    const next = !legendOpen;
    setLegendOpen(next);
    try { localStorage.setItem("tmizan_legend_open", next); } catch { /* localStorage nedostupan */ }
  };

  // ── Statistike ───────────────────────────────────────────────────────────
  const today       = todayStr();
  const totalDone   = Object.values(pageStatuses).filter(p => p.status === "naucen" || p.status === "savladano").length;
  const totalReview = Object.values(pageStatuses).filter(p => p.status === "ponavljanje").length;
  const pctDone     = Math.round((totalDone / 604) * 100);

  const streak = getStreak();

  const todayPagesCount  = Object.values(pageStatuses).filter(p =>
    p.startDate === today || p.lastRepeat === today
  ).length;
  const todayVersesCount = Object.values(verseStatuses).filter(v =>
    v.startDate === today || v.lastRepeat === today
  ).length;

  const nextReviewPage = useMemo(() => {
    const candidates = Object.entries(pageStatuses)
      .filter(([, p]) => p.status === "ponavljanje" && p.lastRepeat)
      .sort((a, b) => a[1].lastRepeat.localeCompare(b[1].lastRepeat));
    return candidates[0]?.[0] || null;
  }, [pageStatuses]);

  // stranica se smatra "započetom" ako ima BILO KOJI status osim "prazna"
  // (dakle uključuje i "naučeno" - filter je namjerno "započeto ILI naučeno")
  const isPageStarted = useCallback(
    p => (pageStatuses[p]?.status || "prazna") !== "prazna",
    [pageStatuses]
  );

  // ── Džuz filter (grupni uslov: prikaži džuz samo ako bar 1 stranica u njemu
  //    nije prazna) ──────────────────────────────────────────────────────────
  const visibleJuzNumbers = useMemo(() => {
    const all = Array.from({ length: 30 }, (_, i) => i + 1);
    if (!onlyStarted) return all;
    return all.filter(juzNo => getJuzPages(juzNo).some(isPageStarted));
  }, [onlyStarted, isPageStarted]);

  // ── Surah filter (tekst pretraga + isti grupni uslov kad je onlyStarted) ──
  const filteredSurahs = useMemo(() => {
    const q = surahSearch.trim().toLowerCase();
    let list = q
      ? SURA_DATA.filter(su =>
          su.name.toLowerCase().includes(q) ||
          String(su.id).includes(q) ||
          String(su.startPage).includes(q)
        )
      : SURA_DATA;
    if (onlyStarted) {
      list = list.filter(su => {
        const total = su.endPage - su.startPage + 1;
        const pages = Array.from({ length: total }, (_, i) => su.startPage + i);
        return pages.some(isPageStarted);
      });
    }
    return list;
  }, [surahSearch, onlyStarted, isPageStarted]);

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
    <div className="w-full mx-auto flex flex-col gap-5 p-3 sm:p-5 bg-transparent">
      <GuidedTour steps={HIFZ_TRACKER_TOUR[lang] || HIFZ_TRACKER_TOUR.bs} active={showTour} onFinish={finishTour} theme={theme} lang={lang} dismissible />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <BackButton />
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${textCls} flex items-center`}>
            Hifz Tracker
            <PageTourButton onClick={() => setShowTour(true)} />
          </h1>
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
          <button onClick={() => setShowPdfExport(true)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${cardCls} ${mutedCls} hover:opacity-80`}
            title={lang === "en" ? "Export a full progress report as PDF" : "Izvezi kompletan izvještaj napretka kao PDF"}>
            📄 {lang === "en" ? "Export PDF" : "Izvezi PDF"}
          </button>
          <HelpTip text={lang === "en"
            ? "Export your progress as a PDF: choose a summary, a full detailed report, or a blank tracking sheet — with print options like pages per row."
            : "Izvezi svoj napredak kao PDF: biraš sažetak, potpuni detaljan izvještaj, ili prazan list za praćenje — s opcijama štampe poput broja stranica po redu."} />
        </div>
      </div>

      {showPdfExport && (
        <HifzPdfExportView
          pageStatuses={pageStatuses}
          verseStatuses={verseStatuses}
          pageVerseKeys={pageVerseKeys}
          loadingKeys={loadingKeys}
          rowsPerPage={rowsPerPage}
          theme={theme}
          onClose={() => setShowPdfExport(false)}
        />
      )}

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

          {/* Upozorenje pri masovnom označavanju stranice */}
          <div className={`pt-4 border-t ${tBorderCls}`}>
            <button onClick={toggleMemorizeWarning}
              className="w-full flex items-center justify-between gap-3 text-left">
              <div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${mutedCls}`}>
                  {s.settings.memorizeWarningTitle || "Upozorenje pri označavanju stranice"}
                </span>
                <p className={`text-[10px] ${mutedCls} opacity-60`}>
                  {s.settings.memorizeWarningDesc || "Pokaži potvrdu prije nego što se svi ajeti stranice automatski označe kao Naučeno."}
                </p>
              </div>
              <div className={`flex-shrink-0 w-10 h-6 rounded-full p-0.5 transition-all ${!hideMemorizeWarning ? "bg-[#1D9E75]" : (isLight ? "bg-black/15" : "bg-white/15")}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-all ${!hideMemorizeWarning ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </button>
          </div>

          {/* Opasna zona: reset progresa / planova / historije (dvostruka potvrda) */}
          <ResetProgressSection cardSubCls={cardSubCls} mutedCls={mutedCls} tBorderCls={tBorderCls} />
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
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className={`text-2xl font-black leading-none ${todayPagesCount > 0 ? "text-[#49C79A]" : textCls}`}>
              {todayPagesCount}
              <span className={`text-[10px] font-semibold ml-1 ${mutedCls}`}>str.</span>
            </span>
            <span className={`text-2xl font-black leading-none ${todayVersesCount > 0 ? "text-[#378ADD]" : textCls}`}>
              {todayVersesCount}
              <span className={`text-[10px] font-semibold ml-1 ${mutedCls}`}>ajeta</span>
            </span>
          </div>
          <div className={`text-[10px] mt-1 ${mutedCls}`}>{s.stats.todayPages}</div>
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
      <div data-tour="tour-hifztracker-legend" className={`rounded-xl border overflow-hidden ${cardAltCls}`}>
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

      {/* ── TABOVI + filter "samo započeto" ─────────────────────────────────── */}
      <div data-tour="tour-hifztracker-tabs" className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 text-sm font-semibold select-none overflow-x-auto pb-1">
          {[
            { id: "juz",   label: s.nav.byJuz,
              help: lang === "en" ? "Browse by juz — open one to see and mark its pages, or mark the whole juz at once." : "Pregled po džuzu — otvori jedan da vidiš i označiš njegove stranice, ili označi cijeli džuz odjednom." },
            { id: "surah", label: s.nav.bySurah,
              help: lang === "en" ? "Browse by surah — card color follows the most common status among its pages; % shows only what's actually memorized." : "Pregled po suri — boja kartice prati najzastupljeniji status njenih stranica; % pokazuje samo koliko je zaista naučeno." },
            { id: "page",  label: s.nav.byPage,
              help: lang === "en" ? "Browse every page individually — tap one to open its detail view (status, notes, ayahs)." : "Pregled svake stranice pojedinačno — klikni jednu da otvoriš njen detalj (status, bilješke, ajeti)." },
          ].map((tab, idx) => (
            <span key={tab.id} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {idx > 0 && <span className={`opacity-20 pointer-events-none ${mutedCls}`}>|</span>}
              <button onClick={() => resetNav(tab.id)}
                className={`transition-colors hover:opacity-100 whitespace-nowrap
                  ${activeTab === tab.id ? "text-[#1D9E75]" : `${mutedCls} opacity-70`}`}>
                {tab.label}
              </button>
              <HelpTip text={tab.help} />
            </span>
          ))}
        </div>
        {(view.type === "juzGrid") && (
          <button onClick={toggleOnlyStarted}
            className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all whitespace-nowrap
              ${onlyStarted ? "bg-[#1D9E75]/20 border-[#1D9E75]/40 text-[#49C79A]" : `${cardCls} ${mutedCls} hover:opacity-80`}`}>
            {onlyStarted ? "✓ " : ""}{s.nav.onlyStarted}
          </button>
        )}
      </div>

      {/* ── SADRŽAJ ───────────────────────────────────────────────────────── */}
      <div className="min-h-[400px]">

        {/* Džuzevi */}
        {activeTab === "juz" && (
          <>
            {view.type === "juzGrid" && (
              <div className="flex flex-col gap-3">
                <FirstTimeHint
                  storageKey={`tmizan_hint_juzlock_${user?.id || "anon"}`}
                  theme={theme}
                  text={lang === "en"
                    ? "🔒 Each card has a lock icon — tap it to unlock before you can mark pages as learned. It's there to protect against accidentally changing a status with a stray tap."
                    : "🔒 Svaka kartica ima ikonu katanca — klikni na nju da otključaš prije nego što možeš označavati stranice. To je zaštita od slučajne promjene statusa nehotičnim klikom."}
                />
                {visibleJuzNumbers.length === 0 ? (
                  <p className={`text-sm py-8 text-center ${mutedCls}`}>{s.nav.noStarted}</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                    {visibleJuzNumbers.map(juzNo => (
                      <DzuzCard key={juzNo} juzNo={juzNo} pageStatuses={pageStatuses} theme={theme} lang={lang} s={s}
                        onPageClick={(p, st) => setPageStatus(p, st)}
                        onCardClick={() => setView({ type: "juzDetail", juz: juzNo })} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {view.type === "juzDetail" && (
              <JuzDetailView juzNo={view.juz} pageStatuses={pageStatuses} theme={theme} lang={lang} s={s}
                onPageStatusChange={(p, st) => setPageStatus(p, st)}
                onQuickStatusAll={(pages, status, verseKeys) => setPagesStatusBulk(pages, status, verseKeys)}
                onResetJuz={(pages, verseKeys) => resetPagesData(pages, verseKeys)}
                onOpenPage={p => setView({ type: "pageDetail", juz: view.juz, page: p })}
                onBack={() => setView({ type: "juzGrid" })} />
            )}
            {view.type === "pageDetail" && (
              <PageDetailView
                pageNum={view.page} pageData={pageStatuses[view.page]}
                onSave={savePageDetail}
                onQuickPageStatus={setPageStatusBulk}
                onResetPage={resetPageData}
                onBack={() => view.juz ? setView({ type: "juzDetail", juz: view.juz }) : resetNav("page")}
                verseStatuses={verseStatuses} onSaveVerse={saveVerseDetail}
                onOpenVerse={verse => setView({ type: "verseDetail", verse, prevPage: view.page, prevJuz: view.juz })}
                rowsPerPage={rowsPerPage} theme={theme} lang={lang} s={s} userId={user?.id}
              />
            )}
            {view.type === "verseDetail" && (
              <VerseDetailView
                verse={view.verse} verseData={verseStatuses[view.verse?.verse_key]}
                onSave={data => saveVerseDetail(view.verse?.verse_key, data, view.prevPage)}
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
                    const pages = Array.from({ length: total }, (_, i) => surah.startPage + i);
                    const done  = pages.filter(p => pageStatuses[p]?.status === "naucen" || pageStatuses[p]?.status === "savladano").length;
                    const dominant = getDominantStatus(pages, pageStatuses);
                    return (
                      <SuraCard key={surah.id} surah={surah} done={done} total={total} dominant={dominant}
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
            verseStatuses={verseStatuses}
            surahData={surahStatuses[selectedSura.id]} onSave={saveSurahDetail}
            onQuickStatusAll={status => setSurahStatusBulk(selectedSura, status)}
            onResetSurah={() => resetSurahData(selectedSura)}
            onBack={() => { setSelectedSura(null); setView({ type: "juzGrid" }); }}
            onOpenPage={p => setView({ type: "pageDetail", page: p, fromSurah: selectedSura })}
            theme={theme} s={s}
          />
        )}
        {activeTab === "surah" && selectedSura && view.type === "pageDetail" && (
          <PageDetailView
            pageNum={view.page} pageData={pageStatuses[view.page]}
            onSave={savePageDetail}
            onQuickPageStatus={setPageStatusBulk}
            onResetPage={resetPageData}
            onBack={() => setView({ type: "surahDetail" })}
            verseStatuses={verseStatuses} onSaveVerse={saveVerseDetail}
            onOpenVerse={verse => setView({ type: "verseDetail", verse, prevPage: view.page, fromSurah: view.fromSurah })}
            rowsPerPage={rowsPerPage} theme={theme} lang={lang} s={s} userId={user?.id}
          />
        )}
        {activeTab === "surah" && selectedSura && view.type === "verseDetail" && (
          <VerseDetailView
            verse={view.verse} verseData={verseStatuses[view.verse?.verse_key]}
            onSave={data => saveVerseDetail(view.verse?.verse_key, data, view.prevPage)}
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
              onlyStarted={onlyStarted}
              noResultsLabel={s.nav.noStarted}
              onOpenPage={p => setView({ type: "pageDetail", juz: null, page: p })}
              theme={theme} s={s}
            />
          </div>
        )}
        {activeTab === "page" && view.type === "pageDetail" && (
          <PageDetailView
            pageNum={view.page} pageData={pageStatuses[view.page]}
            onSave={savePageDetail}
            onQuickPageStatus={setPageStatusBulk}
            onResetPage={resetPageData}
            onBack={() => setView({ type: "juzGrid" })}
            verseStatuses={verseStatuses} onSaveVerse={saveVerseDetail}
            onOpenVerse={verse => setView({ type: "verseDetail", verse, prevPage: view.page, prevJuz: null })}
            rowsPerPage={rowsPerPage} theme={theme} lang={lang} s={s} userId={user?.id}
          />
        )}
        {activeTab === "page" && view.type === "verseDetail" && (
          <VerseDetailView
            verse={view.verse} verseData={verseStatuses[view.verse?.verse_key]}
            onSave={data => saveVerseDetail(view.verse?.verse_key, data, view.prevPage)}
            onBack={() => setView({ type: "pageDetail", juz: null, page: view.prevPage })}
            theme={theme} lang={lang} s={s}
          />
        )}
      </div>

      {/* ── Floating "Sljedeći korak" - samo kad je korisnik ovdje stigao preko
          "Unesi ručno" na koraku 1 plana ponavljanja; vodi nazad na wizard,
          direktno na korak 2 (Metoda), sa stvarno označenim stranicama. ── */}
      {fromReviewSetup && (
        <div className="fixed bottom-5 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className={`${theme?.card || cardCls} rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 flex-wrap justify-center pointer-events-auto max-w-md`}>
            <p className={`text-xs ${mutedCls}`}>{s.nav.reviewSetupHint}</p>
            <button onClick={() => navigate("/korisnik/hifz/planner?resumeReview=1")}
              className={`${theme?.button || "bg-indigo-600 text-white"} rounded-xl px-4 py-2 text-sm font-semibold shrink-0 whitespace-nowrap`}>
              {s.nav.reviewSetupNext}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
