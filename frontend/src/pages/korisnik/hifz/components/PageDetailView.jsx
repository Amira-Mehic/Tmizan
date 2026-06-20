import { useState } from "react";
import { usePageVerses } from "../../../../hooks/hifz/usePageVerses";
import { PageInfoPanel } from "./PageInfoPanel";
import { EditForm } from "./EditForm";

export function PageDetailView({ pageNum, pageData, onSave, onBack, verseStatuses, onSaveVerse, onOpenVerse, rowsPerPage, theme, lang, s }) {
  const { verses, loading } = usePageVerses(pageNum);
  const [localData, setLocalData] = useState(pageData);

  const handleSave = (pn, data) => {
    setLocalData(data);
    onSave(pn, data);
  };

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-[#1D9E75] hover:opacity-80 transition-all w-fit">
        {s?.nav?.backToJuz || "← Nazad na džuz"}
      </button>

      {/* Hero + read-only podaci */}
      <PageInfoPanel
        pageNum={pageNum}
        data={localData}
        verses={verses}
        loadingVerses={loading}
        onOpenVerse={onOpenVerse}
        onSaveVerse={onSaveVerse}
        verseStatuses={verseStatuses}
        rowsPerPage={rowsPerPage || 15}
        theme={theme}
        s={s}
        editSlot={
          <EditForm
            pageNum={pageNum}
            pageData={localData}
            onSave={handleSave}
            theme={theme}
            s={s}
          />
        }
      />
    </div>
  );
}
