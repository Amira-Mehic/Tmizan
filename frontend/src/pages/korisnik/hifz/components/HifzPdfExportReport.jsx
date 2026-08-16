// ============================================================================
// Detaljan izvještaj o napretku, do nivoa pojedinačnog ajeta, s historijom
// ponavljanja i zabilježenim greškama.
// ============================================================================

import { STATUS } from "../../../../constants/hifz/STATUS";
import { SURA_DATA } from "../../../../constants/hifz/SURA_DATA";
import { getJuzPages, getSurahsForPage, statusBorder, statusPillBg, toArabicNumerals, ALL_JUZ, isStarted } from "../../../../constants/hifz/helpers";
import { CoverSection, PdfPrintStyle } from "./HifzPdfExportShared";
import { useLang } from "../../../../context/LanguageContext";

const STR = {
  bs: {
    ajeta: "ajeta", naucenoSuffix: "naučeno",
    strCol: "Str.", suraCol: "Sura", statusCol: "Status", ajetiCol: "Ajeti", biljeskaCol: "Bilješka",
    dzuz: "Džuz", str: "str.", naucenoPct: "naučeno",
    toolbarTitle: "Pregled izvještaja — Detaljno",
    loadingAjeti: "Učitavam podatke o ajetima (samo prvi put)…",
    backSettings: "← Podešavanja", close: "Zatvori", print: "🖨 Štampaj / Sačuvaj kao PDF",
    byJuz: "Pregled po džuzevima", bySurah: "Pregled po surama",
    emptyTitle: "Nema stranica za prikaz",
    emptyDesc: "Ili nisi počela ništa učiti u odabranom opsegu, ili su svi filteri isključeni. Vrati se na podešavanja i prilagodi izbor.",
  },
  en: {
    ajeta: "verses", naucenoSuffix: "learned",
    strCol: "Pg.", suraCol: "Surah", statusCol: "Status", ajetiCol: "Verses", biljeskaCol: "Note",
    dzuz: "Juz", str: "pg.", naucenoPct: "learned",
    toolbarTitle: "Report preview — Detailed",
    loadingAjeti: "Loading verse data (first time only)…",
    backSettings: "← Settings", close: "Close", print: "🖨 Print / Save as PDF",
    byJuz: "Overview by juz", bySurah: "Overview by surah",
    emptyTitle: "No pages to show",
    emptyDesc: "Either you haven't started learning anything in the selected range, or all filters are off. Go back to settings and adjust your selection.",
  },
};

/* ── Broj ajeta na stranici (+ koliko od njih je naučeno/savladano) ── */
function AjetCount({ pageNum, pageVerseKeys, verseStatuses, loadingKeys }) {
  const { lang } = useLang();
  const s = STR[lang] || STR.bs;
  const keys = pageVerseKeys[pageNum];
  if (!keys) {
    return <span style={{ fontSize: 9, color: "#B0A090" }}>{loadingKeys ? "…" : "—"}</span>;
  }
  const learned = keys.filter(vk => ["naucen", "savladano"].includes(verseStatuses[vk]?.status)).length;
  return (
    <span style={{ fontSize: 11 }}>
      <span style={{ fontWeight: 800, color: "#2b2b2b" }}>{keys.length}</span>
      <span style={{ color: "#8A7A65" }}> {s.ajeta}</span>
      {learned > 0 && <span style={{ color: "#1D9E75", fontWeight: 700 }}> · {learned} {s.naucenoSuffix}</span>}
    </span>
  );
}

/* ── Jedan red = jedna stranica mushafa ── */
function PageRow({ pageNum, subLabel, pageStatuses, pageVerseKeys, verseStatuses, loadingKeys }) {
  const stat = pageStatuses[pageNum]?.status || "prazna";
  const st   = STATUS[stat];
  return (
    <tr style={{ breakInside: "avoid" }}>
      <td style={tdCell}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>{pageNum}</span>
      </td>
      <td style={{ ...tdCell, fontSize: 9.5, color: "#8A7A65" }}>{subLabel}</td>
      <td style={tdCell}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 700,
          backgroundColor: statusPillBg(st.hex, true), border: `1px solid ${statusBorder(st.hex, true)}`, color: st.hex,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: st.hex }} />
          {st.label}
        </span>
      </td>
      <td style={tdCell}>
        <AjetCount pageNum={pageNum} pageVerseKeys={pageVerseKeys} verseStatuses={verseStatuses} loadingKeys={loadingKeys} />
      </td>
      <td style={{ ...tdCell, textAlign: "center" }}>
        <span style={{ display: "inline-block", width: 11, height: 11, border: "1.3px solid #B0A090", borderRadius: 3 }} />
      </td>
      <td style={{ ...tdCell, borderBottom: "1px solid #D8CBB5" }} />
    </tr>
  );
}

const tdCell = { padding: "5px 8px", borderBottom: "1px solid #ECE3D4", verticalAlign: "middle" };
const thCell = {
  padding: "6px 8px", textAlign: "left", fontSize: 8.5, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A7A65",
  borderBottom: "1.5px solid #C9BBA0",
};

function SectionTable({ pages, pageStatuses, pageVerseKeys, verseStatuses, loadingKeys, subLabelFor }) {
  const { lang } = useLang();
  const s = STR[lang] || STR.bs;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
      <thead style={{ display: "table-header-group" }}>
        <tr>
          <th style={{ ...thCell, width: 40 }}>{s.strCol}</th>
          <th style={{ ...thCell, width: 130 }}>{s.suraCol}</th>
          <th style={{ ...thCell, width: 110 }}>{s.statusCol}</th>
          <th style={{ ...thCell, width: 160 }}>{s.ajetiCol}</th>
          <th style={{ ...thCell, width: 30, textAlign: "center" }}>✓</th>
          <th style={thCell}>{s.biljeskaCol}</th>
        </tr>
      </thead>
      <tbody>
        {pages.map(p => (
          <PageRow key={p} pageNum={p} subLabel={subLabelFor(p)}
            pageStatuses={pageStatuses} pageVerseKeys={pageVerseKeys}
            verseStatuses={verseStatuses} loadingKeys={loadingKeys} />
        ))}
      </tbody>
    </table>
  );
}

function JuzSection({ juzNo, pageStatuses, pageVerseKeys, verseStatuses, loadingKeys, hideEmpty }) {
  const { lang } = useLang();
  const s = STR[lang] || STR.bs;
  let pages = getJuzPages(juzNo);
  if (hideEmpty) pages = pages.filter(p => isStarted(pageStatuses, p));
  if (pages.length === 0) return null;

  const learned = pages.filter(p => ["naucen", "savladano"].includes(pageStatuses[p]?.status)).length;
  const pct = Math.round((learned / pages.length) * 100);
  const subLabelFor = p => getSurahsForPage(p).map(su => su.name).join(", ");

  return (
    <div style={{ breakInside: "avoid", marginBottom: 22 }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        borderBottom: "2.5px solid #1D9E75", paddingBottom: 5, marginBottom: 2,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#2b2b2b" }}>{s.dzuz} {juzNo}</span>
          <span style={{ fontFamily: "'Amiri', serif", fontSize: 16, color: "#C9A97A" }}>{toArabicNumerals(juzNo)}</span>
          <span style={{ fontSize: 9.5, color: "#8A7A65" }}>{pages.length} {s.str}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#1D9E75" }}>{pct}% {s.naucenoPct}</span>
      </div>
      <SectionTable pages={pages} pageStatuses={pageStatuses} pageVerseKeys={pageVerseKeys}
        verseStatuses={verseStatuses} loadingKeys={loadingKeys} subLabelFor={subLabelFor} />
    </div>
  );
}

function SurahSection({ surah, pageStatuses, pageVerseKeys, verseStatuses, loadingKeys, hideEmpty }) {
  const { lang } = useLang();
  const s = STR[lang] || STR.bs;
  let pages = Array.from({ length: surah.endPage - surah.startPage + 1 }, (_, i) => surah.startPage + i);
  if (hideEmpty) pages = pages.filter(p => isStarted(pageStatuses, p));
  if (pages.length === 0) return null;

  const learned = pages.filter(p => ["naucen", "savladano"].includes(pageStatuses[p]?.status)).length;
  const pct = Math.round((learned / pages.length) * 100);

  return (
    <div style={{ breakInside: "avoid", marginBottom: 22 }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        borderBottom: "2.5px solid #378ADD", paddingBottom: 5, marginBottom: 2,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, color: "#378ADD", background: "#378ADD22",
            borderRadius: 5, padding: "1px 6px",
          }}>{surah.id}</span>
          <span style={{ fontSize: 17, fontWeight: 900, color: "#2b2b2b" }}>{surah.name}</span>
          <span style={{ fontSize: 9.5, color: "#8A7A65" }}>{surah.verses} {s.ajeta} · {s.str} {surah.startPage}–{surah.endPage}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#378ADD" }}>{pct}% {s.naucenoPct}</span>
      </div>
      <SectionTable pages={pages} pageStatuses={pageStatuses} pageVerseKeys={pageVerseKeys}
        verseStatuses={verseStatuses} loadingKeys={loadingKeys} subLabelFor={() => ""} />
    </div>
  );
}

export function HifzPdfExportReport({
  pageStatuses, verseStatuses, pageVerseKeys, loadingKeys,
  hideEmpty, includeJuz, includeSurah, selectedJuz, selectedSurah,
  onBack, onClose,
}) {
  const { lang } = useLang();
  const s = STR[lang] || STR.bs;
  const juzList   = includeJuz   ? ALL_JUZ.filter(j => selectedJuz.has(j))          : [];
  const surahList = includeSurah ? SURA_DATA.filter(su => selectedSurah.has(su.id)) : [];

  return (
    <div className="pdf-root fixed inset-0 z-[100] bg-white overflow-y-auto" style={{ colorScheme: "light" }}>

      {/* Toolbar - sakriven pri štampi */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-8 py-3 bg-[#1D9E75] text-white shadow-md">
        <div className="flex flex-col">
          <span className="font-bold text-sm">{s.toolbarTitle}</span>
          {loadingKeys && (
            <span className="text-[11px] text-white/80">{s.loadingAjeti}</span>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onBack}
            className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-semibold transition-all">
            {s.backSettings}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-semibold transition-all">
            {s.close}
          </button>
          <button onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-white text-[#1D9E75] text-sm font-bold hover:opacity-90 transition-all">
            {s.print}
          </button>
        </div>
      </div>

      {/* Sadržaj izvještaja */}
      <div className="max-w-[880px] mx-auto px-8 sm:px-12 py-10 print:p-0 print:max-w-none"
        style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#2b2b2b" }}>

        <CoverSection pageStatuses={pageStatuses} />

        {juzList.length === 0 && surahList.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#8A7A65" }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{s.emptyTitle}</p>
            <p style={{ fontSize: 11 }}>{s.emptyDesc}</p>
          </div>
        )}

        {juzList.length > 0 && (
          <>
            <h2 style={{
              fontSize: 15, fontWeight: 900, color: "#1D9E75", textTransform: "uppercase",
              letterSpacing: "0.08em", borderBottom: "1px solid #D8CBB5", paddingBottom: 8, marginBottom: 16,
            }} className="pdf-section-break">
              {s.byJuz}
            </h2>
            {juzList.map(juzNo => (
              <JuzSection key={juzNo} juzNo={juzNo} hideEmpty={hideEmpty}
                pageStatuses={pageStatuses} pageVerseKeys={pageVerseKeys}
                verseStatuses={verseStatuses} loadingKeys={loadingKeys} />
            ))}
          </>
        )}

        {surahList.length > 0 && (
          <>
            <h2 style={{
              fontSize: 15, fontWeight: 900, color: "#378ADD", textTransform: "uppercase",
              letterSpacing: "0.08em", borderBottom: "1px solid #D8CBB5", paddingBottom: 8, marginBottom: 16, marginTop: 8,
            }} className="pdf-section-break">
              {s.bySurah}
            </h2>
            {surahList.map(surah => (
              <SurahSection key={surah.id} surah={surah} hideEmpty={hideEmpty}
                pageStatuses={pageStatuses} pageVerseKeys={pageVerseKeys}
                verseStatuses={verseStatuses} loadingKeys={loadingKeys} />
            ))}
          </>
        )}
      </div>

      <PdfPrintStyle />
    </div>
  );
}
