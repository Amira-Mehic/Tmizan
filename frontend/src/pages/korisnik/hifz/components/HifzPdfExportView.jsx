// ============================================================================
// Prikaz izvještaja pripremljen za štampu. Sadržaj se slaže tako da se prelomi
// stranica poklope s cjelinama, pa se džuz ili sura ne prelamaju nasred ispisa.
// Štampa se pokreće preglednikom, bez dodatne biblioteke za PDF.
// ============================================================================

import { useState } from "react";
import { SURA_DATA } from "../../../../constants/hifz/SURA_DATA";
import { ALL_JUZ } from "../../../../constants/hifz/helpers";
import { HifzPdfExportOptions } from "./HifzPdfExportOptions";
import { HifzPdfExportReport } from "./HifzPdfExportReport";
import { HifzPdfExportSummary } from "./HifzPdfExportSummary";

/*
  Dvokoračni export: prvo "options" (format izvještaja - Detaljno ili Sažetak,
  sakrij prazne stranice, i/ili ručno odaberi tačno koje džuzeve/sure), pa tek
  onda sam printable prikaz. Default (Detaljno, hideEmpty=true, sve uključeno)
  rješava glavni problem - izvještaj od 604 stranice - automatski.
*/
export function HifzPdfExportView({ pageStatuses, verseStatuses, pageVerseKeys, loadingKeys, rowsPerPage, theme, onClose }) {
  const [step, setStep] = useState("options"); // "options" | "report"

  const [reportFormat,  setReportFormat]  = useState("detailed"); // "detailed" | "summary"
  const [hideEmpty,     setHideEmpty]     = useState(true);
  const [includeJuz,    setIncludeJuz]    = useState(true);
  const [includeSurah,  setIncludeSurah]  = useState(true);
  const [selectedJuz,   setSelectedJuz]   = useState(() => new Set(ALL_JUZ));
  const [selectedSurah, setSelectedSurah] = useState(() => new Set(SURA_DATA.map(su => su.id)));

  if (step === "options") {
    return (
      <HifzPdfExportOptions
        theme={theme}
        pageStatuses={pageStatuses}
        reportFormat={reportFormat} setReportFormat={setReportFormat}
        hideEmpty={hideEmpty} setHideEmpty={setHideEmpty}
        includeJuz={includeJuz} setIncludeJuz={setIncludeJuz}
        includeSurah={includeSurah} setIncludeSurah={setIncludeSurah}
        selectedJuz={selectedJuz} setSelectedJuz={setSelectedJuz}
        selectedSurah={selectedSurah} setSelectedSurah={setSelectedSurah}
        onClose={onClose}
        onGenerate={() => setStep("report")}
      />
    );
  }

  if (reportFormat === "summary") {
    return (
      <HifzPdfExportSummary
        pageStatuses={pageStatuses}
        verseStatuses={verseStatuses}
        pageVerseKeys={pageVerseKeys}
        loadingKeys={loadingKeys}
        rowsPerPage={rowsPerPage}
        includeJuz={includeJuz}
        includeSurah={includeSurah}
        selectedJuz={selectedJuz}
        selectedSurah={selectedSurah}
        onBack={() => setStep("options")}
        onClose={onClose}
      />
    );
  }

  return (
    <HifzPdfExportReport
      pageStatuses={pageStatuses}
      verseStatuses={verseStatuses}
      pageVerseKeys={pageVerseKeys}
      loadingKeys={loadingKeys}
      hideEmpty={hideEmpty}
      includeJuz={includeJuz}
      includeSurah={includeSurah}
      selectedJuz={selectedJuz}
      selectedSurah={selectedSurah}
      onBack={() => setStep("options")}
      onClose={onClose}
    />
  );
}
