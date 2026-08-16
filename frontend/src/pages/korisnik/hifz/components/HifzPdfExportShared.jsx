// ============================================================================
// Zajednički dijelovi svih PDF izvještaja - naslovna strana i red sa statusima.
// Postoje ovdje da se isti elementi ne pišu ponovo u detaljnom i u sažetom
// izvještaju.
// ============================================================================

import { STATUS } from "../../../../constants/hifz/STATUS";
import { TOTAL_PAGES, countStatuses } from "../../../../constants/hifz/helpers";
import { useLang } from "../../../../context/LanguageContext";

// Zajedničke komponente za sve PDF izvještaje (Detaljno + Sažetak) - da se ne
// duplira ista naslovna strana / status-red u više fajlova.
// (Konstante i čiste funkcije - ALL_JUZ, isStarted, countStatuses, itd. - žive u
// constants/hifz/helpers.js, ne ovdje, jer Fast Refresh traži da fajl sa
// komponentama izvozi samo komponente.)

/* ── Red statusa (kolo boje + labela + broj), koristi se u Sažetku ── */
export function StatusBreakdown({ counts }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 16px" }}>
      {Object.entries(STATUS).map(([key, st]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: st.hex, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: "#5A4A38" }}>{st.label}:</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#2b2b2b" }}>{counts[key] || 0}</span>
        </div>
      ))}
    </div>
  );
}

const BS_MJESECI = ["januar","februar","mart","april","maj","juni","juli","august","septembar","oktobar","novembar","decembar"];
const EN_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const bsDatum = (d) => `${d.getDate()}. ${BS_MJESECI[d.getMonth()]} ${d.getFullYear()}.`;
const enDatum = (d) => `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

/* ── Naslovna strana - ista za oba formata izvještaja ── */
export function CoverSection({ pageStatuses }) {
  const { lang } = useLang();
  const counts = countStatuses(pageStatuses, Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1));
  const donePct = Math.round(((counts.naucen + counts.savladano) / TOTAL_PAGES) * 100);
  const dateStr = lang === "en" ? enDatum(new Date()) : bsDatum(new Date());

  return (
    <div style={{ marginBottom: 40 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#1D9E75", marginBottom: 4 }}>
        Tmizan
      </p>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "#2b2b2b", margin: 0 }}>
        {lang === "en" ? "Quran Memorization Progress Report" : "Izvještaj napretka učenja Kur'ana"}
      </h1>
      <p style={{ fontSize: 11, color: "#8A7A65", marginTop: 4 }}>{lang === "en" ? "Exported" : "Izvezeno"} {dateStr}</p>

      <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 26, marginBottom: 22 }}>
        <div style={{
          width: 96, height: 96, borderRadius: "50%", flexShrink: 0,
          border: "7px solid #1D9E75", display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column",
        }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: "#1D9E75", lineHeight: 1 }}>{donePct}%</span>
          <span style={{ fontSize: 7, color: "#8A7A65", marginTop: 2 }}>{lang === "en" ? "LEARNED" : "NAUČENO"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 24, rowGap: 8, flex: 1 }}>
          {Object.entries(STATUS).map(([key, st]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: st.hex, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#5A4A38", flex: 1 }}>{st.label}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#2b2b2b" }}>{counts[key]} <span style={{ fontWeight: 400, color: "#8A7A65" }}>{lang === "en" ? "pg." : "str."}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Zajednički print CSS blok ──
   Prikaz izvještaja je overlay u `position: fixed` kontejneru - a fixed element
   se pri štampi ne prelama kroz stranice (browser uhvati samo prvi ekran). Zato
   pri štampi: sakrijemo SVE osim `.pdf-root`, a njega postavimo kao normalan
   (static) tok da sadržaj prirodno teče kroz sve stranice. */
export function PdfPrintStyle() {
  return (
    <style>{`
      /* Polje za bilješke - editabilno na ekranu (contenteditable) */
      .pdf-note {
        min-height: 34px; border: 1px dashed #D8CBB5; border-radius: 5px;
        padding: 5px 7px; font-size: 10px; color: #3A2E22; line-height: 1.55;
        outline: none; white-space: pre-wrap; word-break: break-word;
      }
      .pdf-note:focus { border-color: #1D9E75; background: #F4FBF7; }
      .pdf-note[data-ph]:empty:before { content: attr(data-ph); color: #B8AA95; }
      .pdf-card-off { opacity: 0.4; }

      @media print {
        @page { size: A4; margin: 14mm 12mm; }
        html, body { background: #fff !important; height: auto !important; }

        /* sakrij cijelu aplikaciju iza overlay-a */
        body * { visibility: hidden !important; }
        .pdf-root, .pdf-root * { visibility: visible !important; }

        /* izvještaj u normalan tok da se prelama kroz stranice */
        .pdf-root {
          position: absolute !important;
          left: 0 !important; top: 0 !important;
          width: 100% !important; height: auto !important;
          overflow: visible !important;
          background: #fff !important;
        }

        .print\\:hidden { display: none !important; }
        .print\\:p-0 { padding: 0 !important; }
        .print\\:max-w-none { max-width: none !important; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .pdf-section-break { break-before: page; }

        /* neoznačene kartice se ne printaju; bilješke bez isprekidane linije/placeholdera */
        .pdf-excluded { display: none !important; }
        .pdf-card-off { opacity: 1 !important; }
        .pdf-note { border: 1px solid #E3D9C6 !important; background: #fff !important; }
        .pdf-note[data-ph]:empty:before { content: "" !important; }
      }
    `}</style>
  );
}
