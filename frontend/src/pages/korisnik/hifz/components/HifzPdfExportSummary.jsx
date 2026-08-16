// ============================================================================
// Sažeti izvještaj o napretku - brojevi i pregled po džuzevima i surama, bez
// pojedinačnih ajeta. Namijenjen brzom uvidu i predaji mualimu.
// ============================================================================

import { useMemo, useState } from "react";
import { STATUS } from "../../../../constants/hifz/STATUS";
import { SURA_DATA } from "../../../../constants/hifz/SURA_DATA";
import {
  getJuzPages, getSurahsForPage, toArabicNumerals, ALL_JUZ, TOTAL_PAGES,
  isStarted, countStatuses, statusCardBg, statusBorder,
} from "../../../../constants/hifz/helpers";
import { CoverSection, PdfPrintStyle } from "./HifzPdfExportShared";
import { useLang } from "../../../../context/LanguageContext";

const STR = {
  bs: {
    notes: "Bilješke", notePh: "Upiši bilješku…", inReport: "U izvještaj",
    toolbarTitle: "Sažetak — sastavi izvještaj",
    cardsCount: (sel, total) => `${sel}/${total} kartica`,
    selectAll: "Označi sve", deselectAll: "Odznači sve",
    backSettings: "← Podešavanja", close: "Zatvori", print: "🖨 Sačuvaj kao PDF",
    hint: "Odznači kartice koje ne želiš u PDF-u, upiši bilješke gdje treba, pa „Sačuvaj kao PDF\". Prazno polje za bilješke ostaje kao prostor za ručno pisanje.",
    emptyTitle: "Nema započetog gradiva",
    emptyDesc: "Kad kreneš s učenjem, ovdje se pojave kartice po džuzevima, surama i stranicama.",
    byJuzHead: "Po džuzevima  ·  stranice",
    bySurahHead: "Po surama  ·  ajeti",
    byPageHead: "Po stranicama  ·  ajeti i redovi",
    noJuz: "Nema započetih džuzeva.",
    noSurah: "Nema započetih sura.",
    noPage: "Nema započetih stranica.",
    selectSection: "Označi sve", deselectSection: "Odznači",
    dzuz: "Džuz", str: "str.",
    pagesLine: (learned, started, total) => <>Stranice: <b style={{ color: "#2b2b2b" }}>{learned}</b> naučeno · {started}/{total} započeto</>,
    ajeti: "ajeta", strDot: "str.",
    versesLine: (learned, total) => <>Ajeti: <b style={{ color: "#2b2b2b" }}>{learned}</b> / {total} naučeno</>,
    strLabel: "Str.",
    versesRowsLine: (ajLearned, ajTotal, redLearned, rpp, keys, loadingKeys) => <>
      Ajeti: <b style={{ color: "#2b2b2b" }}>{keys ? `${ajLearned}/${ajTotal}` : (loadingKeys ? "…" : "—")}</b> naučeno<br />
      Redovi: <b style={{ color: "#2b2b2b" }}>{keys ? `~${redLearned}/${rpp}` : "—"}</b>
    </>,
    hardPage: "⚠ Teža stranica", easyPage: "Lakša stranica",
  },
  en: {
    notes: "Notes", notePh: "Write a note…", inReport: "In report",
    toolbarTitle: "Summary — build report",
    cardsCount: (sel, total) => `${sel}/${total} cards`,
    selectAll: "Select all", deselectAll: "Deselect all",
    backSettings: "← Settings", close: "Close", print: "🖨 Save as PDF",
    hint: "Uncheck cards you don't want in the PDF, add notes where needed, then \"Save as PDF\". An empty note field remains as space for handwriting.",
    emptyTitle: "No material started yet",
    emptyDesc: "Once you start learning, cards will appear here by juz, surah, and page.",
    byJuzHead: "By juz  ·  pages",
    bySurahHead: "By surah  ·  verses",
    byPageHead: "By page  ·  verses and lines",
    noJuz: "No juz started yet.",
    noSurah: "No surah started yet.",
    noPage: "No pages started yet.",
    selectSection: "Select all", deselectSection: "Deselect",
    dzuz: "Juz", str: "pg.",
    pagesLine: (learned, started, total) => <>Pages: <b style={{ color: "#2b2b2b" }}>{learned}</b> learned · {started}/{total} started</>,
    ajeti: "verses", strDot: "pg.",
    versesLine: (learned, total) => <>Verses: <b style={{ color: "#2b2b2b" }}>{learned}</b> / {total} learned</>,
    strLabel: "Pg.",
    versesRowsLine: (ajLearned, ajTotal, redLearned, rpp, keys, loadingKeys) => <>
      Verses: <b style={{ color: "#2b2b2b" }}>{keys ? `${ajLearned}/${ajTotal}` : (loadingKeys ? "…" : "—")}</b> learned<br />
      Lines: <b style={{ color: "#2b2b2b" }}>{keys ? `~${redLearned}/${rpp}` : "—"}</b>
    </>,
    hardPage: "⚠ Harder page", easyPage: "Easier page",
  },
};

const SEG = ["naucen", "savladano", "ponavljanje", "u_toku", "treba_vjezbe"];
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 };

const dominantKey = (counts) => {
  let best = "prazna", max = 0;
  for (const k of SEG) if ((counts[k] || 0) > max) { max = counts[k]; best = k; }
  return best;
};

// Broj ajeta po statusu za jednu suru (verse_key = "id:n", ne treba dohvat)
function suraAyahCounts(surahId, versesTotal, verseStatuses) {
  const c = { naucen: 0, savladano: 0, ponavljanje: 0, u_toku: 0, treba_vjezbe: 0 };
  for (let n = 1; n <= versesTotal; n++) {
    const s = verseStatuses?.[`${surahId}:${n}`]?.status;
    if (s && c[s] != null) c[s]++;
  }
  return c;
}

function StatusPill({ hex, label }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start",
      padding: "2px 8px", borderRadius: 999, fontSize: 9.5, fontWeight: 800,
      background: statusCardBg(hex, true), border: `1px solid ${statusBorder(hex, true)}`, color: hex,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: hex }} />{label}
    </span>
  );
}

function Bar({ counts, total }) {
  return (
    <div style={{ display: "flex", height: 7, borderRadius: 4, overflow: "hidden", background: "#EAE2D2" }}>
      {SEG.map(k => counts[k] > 0 ? <div key={k} style={{ width: `${(counts[k] / total) * 100}%`, background: STATUS[k].hex }} /> : null)}
    </div>
  );
}

function Chips({ counts, unit }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 9px" }}>
      {SEG.map(k => counts[k] > 0 ? (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS[k].hex }} />
          <b style={{ color: "#2b2b2b" }}>{counts[k]}</b>
          <span style={{ color: "#6A5A45" }}>{STATUS[k].label}{unit ? "" : ""}</span>
        </span>
      ) : null)}
    </div>
  );
}

// Zajednička ljuska kartice: checkbox (šta se printa) + tijelo + polje za bilješke
function Card({ id, selected, onToggle, accentHex, children }) {
  const { lang } = useLang();
  const s = STR[lang] || STR.bs;
  const off = !selected;
  return (
    <div className={off ? "pdf-excluded pdf-card-off" : ""} style={{
      breakInside: "avoid", background: "#FBF9F5", border: "1px solid #ECE3D4",
      borderTop: `3px solid ${accentHex}`, borderRadius: 8, padding: "10px 11px",
      display: "flex", flexDirection: "column", gap: 7,
    }}>
      {children(accentHex)}
      <div>
        <div style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#A89880", marginBottom: 3 }}>{s.notes}</div>
        <div className="pdf-note" contentEditable suppressContentEditableWarning data-ph={s.notePh} />
      </div>
      <label className="print:hidden" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#8A7A65", cursor: "pointer" }}>
        <input type="checkbox" checked={selected} onChange={() => onToggle(id)} style={{ accentColor: accentHex }} />
        {s.inReport}
      </label>
    </div>
  );
}

export function HifzPdfExportSummary({
  pageStatuses, verseStatuses, pageVerseKeys, loadingKeys, rowsPerPage,
  includeJuz, includeSurah, selectedJuz, selectedSurah, onBack, onClose,
}) {
  const { lang } = useLang();
  const s = STR[lang] || STR.bs;
  const rpp = rowsPerPage || 15;

  const juzList = includeJuz
    ? ALL_JUZ.filter(j => selectedJuz.has(j) && getJuzPages(j).some(p => isStarted(pageStatuses, p)))
    : [];
  const surahList = includeSurah
    ? SURA_DATA.filter(su => selectedSurah.has(su.id) &&
        Array.from({ length: su.endPage - su.startPage + 1 }, (_, i) => su.startPage + i).some(p => isStarted(pageStatuses, p)))
    : [];
  const startedPages = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).filter(p => isStarted(pageStatuses, p));

  const allIds = useMemo(() => [
    ...juzList.map(j => `juz:${j}`),
    ...surahList.map(su => `sura:${su.id}`),
    ...startedPages.map(p => `page:${p}`),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [juzList.length, surahList.length, startedPages.length]);

  const [selected, setSelected] = useState(() => new Set(allIds));

  const toggle = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const setAll = (on) => setSelected(on ? new Set(allIds) : new Set());
  const setSection = (prefix, on) => setSelected(prev => {
    const n = new Set(prev);
    allIds.filter(i => i.startsWith(prefix)).forEach(i => on ? n.add(i) : n.delete(i));
    return n;
  });

  const nothing = allIds.length === 0;
  const sel = (id) => selected.has(id);

  const sectionHead = (text, color, prefix, brk) => (
    <div className={brk ? "pdf-section-break" : ""} style={{
      display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      borderBottom: "1px solid #D8CBB5", paddingBottom: 8, marginBottom: 12, marginTop: 8,
    }}>
      <h2 style={{ fontSize: 15, fontWeight: 900, color, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{text}</h2>
      <span className="print:hidden" style={{ fontSize: 10, color: "#8A7A65" }}>
        <button onClick={() => setSection(prefix, true)} style={linkBtn}>{s.selectSection}</button>
        {" · "}
        <button onClick={() => setSection(prefix, false)} style={linkBtn}>{s.deselectSection}</button>
      </span>
    </div>
  );

  return (
    <div className="pdf-root fixed inset-0 z-[100] bg-white overflow-y-auto" style={{ colorScheme: "light" }}>

      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-8 py-3 bg-[#1D9E75] text-white shadow-md flex-wrap">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">{s.toolbarTitle}</span>
          <span className="text-[11px] text-white/80">{s.cardsCount(selected.size, allIds.length)}</span>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <button onClick={() => setAll(true)} className="px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-all">{s.selectAll}</button>
          <button onClick={() => setAll(false)} className="px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-all">{s.deselectAll}</button>
          <button onClick={onBack} className="px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-all">{s.backSettings}</button>
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-all">{s.close}</button>
          <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-white text-[#1D9E75] text-xs font-bold hover:opacity-90 transition-all">{s.print}</button>
        </div>
      </div>

      <div className="max-w-[880px] mx-auto px-8 sm:px-12 py-10 print:p-0 print:max-w-none"
        style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#2b2b2b" }}>

        <CoverSection pageStatuses={pageStatuses} />

        <p className="print:hidden" style={{ fontSize: 11, color: "#8A7A65", marginTop: -18, marginBottom: 24 }}>
          {s.hint}
        </p>

        {nothing && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#8A7A65" }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{s.emptyTitle}</p>
            <p style={{ fontSize: 11 }}>{s.emptyDesc}</p>
          </div>
        )}

        {/* ── DŽUZEVI → podaci o STRANICAMA ── */}
        {!nothing && juzList.length === 0 && (
          <div style={{ marginBottom: 20 }}>
            {sectionHead(s.byJuzHead, "#1D9E75", "juz:", false)}
            <p style={{ fontSize: 11, color: "#8A7A65" }}>{s.noJuz}</p>
          </div>
        )}
        {juzList.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {sectionHead(s.byJuzHead, "#1D9E75", "juz:", false)}
            <div style={gridStyle}>
              {juzList.map(juzNo => {
                const pages = getJuzPages(juzNo);
                const counts = countStatuses(pageStatuses, pages);
                const started = pages.length - counts.prazna;
                const learned = counts.naucen + counts.savladano;
                const pct = Math.round((learned / pages.length) * 100);
                const dom = STATUS[dominantKey(counts)];
                return (
                  <Card key={juzNo} id={`juz:${juzNo}`} selected={sel(`juz:${juzNo}`)} onToggle={toggle} accentHex="#1D9E75">
                    {() => (<>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{s.dzuz} {juzNo} <span style={{ fontFamily: "'Amiri',serif", fontSize: 11, color: "#C9A97A" }}>{toArabicNumerals(juzNo)}</span></span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: "#1D9E75" }}>{pct}%</span>
                      </div>
                      <StatusPill hex={dom.hex} label={dom.label} />
                      <Bar counts={counts} total={pages.length} />
                      <Chips counts={counts} />
                      <div style={{ fontSize: 9, color: "#8A7A65" }}>{s.pagesLine(learned, started, pages.length)}</div>
                    </>)}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SURE → podaci o AJETIMA ── */}
        {!nothing && surahList.length === 0 && (
          <div style={{ marginBottom: 20 }}>
            {sectionHead(s.bySurahHead, "#378ADD", "sura:", juzList.length > 0)}
            <p style={{ fontSize: 11, color: "#8A7A65" }}>{s.noSurah}</p>
          </div>
        )}
        {surahList.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {sectionHead(s.bySurahHead, "#378ADD", "sura:", juzList.length > 0)}
            <div style={gridStyle}>
              {surahList.map(surah => {
                const c = suraAyahCounts(surah.id, surah.verses, verseStatuses);
                const learned = c.naucen + c.savladano;
                const pct = Math.round((learned / surah.verses) * 100);
                const dom = STATUS[dominantKey(c)];
                return (
                  <Card key={surah.id} id={`sura:${surah.id}`} selected={sel(`sura:${surah.id}`)} onToggle={toggle} accentHex="#378ADD">
                    {() => (<>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{surah.id}. {surah.name}</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: "#378ADD" }}>{pct}%</span>
                      </div>
                      <span style={{ fontSize: 9, color: "#8A7A65", marginTop: -3 }}>{surah.verses} {s.ajeti} · {s.strDot} {surah.startPage}–{surah.endPage}</span>
                      <StatusPill hex={dom.hex} label={dom.label} />
                      <Bar counts={c} total={surah.verses} />
                      <Chips counts={c} />
                      <div style={{ fontSize: 9, color: "#8A7A65" }}>{s.versesLine(learned, surah.verses)}</div>
                    </>)}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STRANICE → podaci o AJETIMA i REDOVIMA ── */}
        {!nothing && startedPages.length === 0 && (
          <div>
            {sectionHead(s.byPageHead, "#9F8FEF", "page:", juzList.length > 0 || surahList.length > 0)}
            <p style={{ fontSize: 11, color: "#8A7A65" }}>{s.noPage}</p>
          </div>
        )}
        {startedPages.length > 0 && (
          <div>
            {sectionHead(s.byPageHead, "#9F8FEF", "page:", juzList.length > 0 || surahList.length > 0)}
            <div style={gridStyle}>
              {startedPages.map(p => {
                const d = pageStatuses[p] || {};
                const st = STATUS[d.status || "prazna"];
                const suraName = getSurahsForPage(p).map(s => s.name).join(", ");
                const keys = pageVerseKeys?.[p];
                const ajTotal = keys?.length || 0;
                const ajLearned = keys ? keys.filter(k => ["naucen", "savladano"].includes(verseStatuses?.[k]?.status)).length : 0;
                const redLearned = ajTotal > 0 ? Math.round((ajLearned / ajTotal) * rpp) : 0;
                const hard = d.difficulty === "teska";
                const easy = d.difficulty === "laka";
                return (
                  <Card key={p} id={`page:${p}`} selected={sel(`page:${p}`)} onToggle={toggle} accentHex="#9F8FEF">
                    {() => (<>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{s.strLabel} {p}</span>
                        <span style={{ fontFamily: "'Amiri',serif", fontSize: 11, color: "#C9A97A" }}>{toArabicNumerals(p)}</span>
                      </div>
                      {suraName && <span style={{ fontSize: 9, color: "#8A7A65", marginTop: -3 }}>{suraName}</span>}
                      <StatusPill hex={st.hex} label={st.label} />
                      <div style={{ fontSize: 9, color: "#8A7A65", lineHeight: 1.5 }}>
                        {s.versesRowsLine(ajLearned, ajTotal, redLearned, rpp, keys, loadingKeys)}
                      </div>
                      {(hard || easy) && (
                        <span style={{ fontSize: 8.5, fontWeight: 800, color: hard ? "#993535" : "#0F6E56" }}>{hard ? s.hardPage : s.easyPage}</span>
                      )}
                    </>)}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <PdfPrintStyle />
    </div>
  );
}

const linkBtn = { background: "none", border: "none", padding: 0, color: "#1D9E75", fontWeight: 700, cursor: "pointer", fontSize: 10 };
