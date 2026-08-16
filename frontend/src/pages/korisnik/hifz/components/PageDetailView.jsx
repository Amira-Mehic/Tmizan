// ============================================================================
// Detaljan prikaz jedne stranice mushafa - njeni ajeti, status i historija
// ponavljanja, uz mogućnost uređivanja. Otvara se klikom na stranicu u trackeru,
// mrežnom prikazu ili detaljima džuza.
// ============================================================================

import { useState } from "react";
import { usePageVerses } from "../../../../hooks/hifz/usePageVerses";
import { todayStr } from "../../../../constants/hifz/helpers";
import { PageInfoPanel } from "./PageInfoPanel";
import { EditForm } from "./EditForm";
import { AyahBrowser } from "../../../../components/hifz/shared/AyahBrowser";
import { FirstTimeHint } from "../../../../components/shared/FirstTimeHint";

const HIDE_WARNING_KEY = "tmizan_hide_memorize_warning";

export function PageDetailView({ pageNum, pageData, onSave, onQuickPageStatus, onResetPage, onBack, verseStatuses, onSaveVerse, onOpenVerse, rowsPerPage, theme, lang, s, userId }) {
  const { verses, loading } = usePageVerses(pageNum);
  const [localData, setLocalData] = useState(pageData);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(null); // status koji čeka potvrdu (samo "naucen")
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetFinalOpen, setResetFinalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  // "Vidi detalje" na redu ajeta - otvara prošireni prikaz (traka svih ajeta
  // + puni prikaz izabranog) u bočnom panelu, s ručnim Sačuvaj + leave-guard.
  const [browserVerseKey, setBrowserVerseKey] = useState(null);
  const isLight = theme?.id === "beige_white" || theme?.id === "pink_soft";

  const handleResetConfirm = async () => {
    if (!onResetPage || resetting) return;
    setResetting(true);
    try {
      const verseKeys = (verses || []).map(v => v.verse_key);
      await onResetPage(pageNum, verseKeys);
      setLocalData({});
    } finally {
      setResetting(false);
      setResetFinalOpen(false);
    }
  };

  // Prvi klik samo prebacuje na FINALNU potvrdu (eksplicitno podsjeti koja
  // stranica se briše) - stvarno brisanje se dešava tek nakon drugog klika.
  const proceedToFinalReset = () => {
    setResetConfirmOpen(false);
    setResetFinalOpen(true);
  };
  const cancelReset = () => { setResetConfirmOpen(false); setResetFinalOpen(false); };

  const handleSave = (pn, data) => {
    setLocalData(data);
    onSave(pn, data);
  };

  // Brza promjena statusa cijele stranice (klik na hero). Samo status "Naučen"
  // kaskadno postavlja i sve ajete na toj stranici - svaki drugi status mijenja
  // isključivo status stranice, ajeti ostaju netaknuti.
  const applyQuickStatus = async (newStatus) => {
    setLocalData(prev => ({
      ...(prev || {}),
      status: newStatus,
      startDate: (!prev?.startDate && newStatus !== "prazna") ? todayStr() : prev?.startDate,
    }));

    if (onQuickPageStatus) {
      setBulkSaving(true);
      const verseKeys = newStatus === "naucen" ? (verses || []).map(v => v.verse_key) : [];
      try {
        await onQuickPageStatus(pageNum, newStatus, verseKeys);
      } finally {
        setBulkSaving(false);
      }
    } else {
      // fallback ako parent ne proslijedi bulk handler - samo status stranice
      onSave(pageNum, { ...(localData || {}), status: newStatus });
    }
  };

  const handleQuickStatus = (newStatus) => {
    if (bulkSaving) return;
    const warningHidden = (() => {
      try { return localStorage.getItem(HIDE_WARNING_KEY) === "true"; } catch { return false; }
    })();
    if (newStatus === "naucen" && !warningHidden) {
      setDontShowAgain(false);
      setConfirmStatus(newStatus);
      return;
    }
    applyQuickStatus(newStatus);
  };

  const confirmProceed = () => {
    if (dontShowAgain) {
      try { localStorage.setItem(HIDE_WARNING_KEY, "true"); } catch { /* localStorage nedostupan */ }
    }
    const status = confirmStatus;
    setConfirmStatus(null);
    applyQuickStatus(status);
  };

  const confirmCancel = () => setConfirmStatus(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-[#1D9E75] hover:opacity-80 transition-all w-fit">
          {s?.nav?.backToJuz || "← Nazad na džuz"}
        </button>
        {onResetPage && (
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#EF6F6F] hover:opacity-80 transition-all px-3 py-1.5 rounded-lg border border-[#EF6F6F]/30"
          >
            {s?.page?.resetData || "Obriši podatke stranice"}
          </button>
        )}
      </div>

      <FirstTimeHint
        storageKey={`tmizan_hint_pagedetail_${userId || "anon"}`}
        theme={theme}
        text={lang === "en"
          ? "Tap a status button (Not started / In progress / Learned / Review) to mark this page's progress — 'Learned' automatically marks every ayah on the page too. To flag individual mistakes or edit a single ayah, open 'Edit' below."
          : "Klikni na dugme statusa (Nije počeo / U toku / Naučeno / Ponavljanje) da označiš napredak stranice — 'Naučeno' automatski označava i sve ajete na njoj. Za pojedinačne greške ili uređivanje jednog ajeta, otvori 'Uredi' ispod."}
      />

      {/* Hero + read-only podaci */}
      <PageInfoPanel
        pageNum={pageNum}
        data={localData}
        verses={verses}
        loadingVerses={loading}
        onOpenVerse={onOpenVerse}
        onSaveVerse={onSaveVerse}
        onQuickStatus={handleQuickStatus}
        quickStatusSaving={bulkSaving}
        verseStatuses={verseStatuses}
        rowsPerPage={rowsPerPage || 15}
        theme={theme}
        s={s}
        onViewVerseDetails={setBrowserVerseKey}
        editSlot={
          <EditForm
            pageNum={pageNum}
            pageData={localData}
            onSave={handleSave}
            theme={theme}
            s={s}
            userId={userId}
            verseStatuses={verseStatuses}
            onSaveVerse={(verseKey, data) => onSaveVerse?.(verseKey, data, pageNum)}
          />
        }
      />

      {/* ── "Vidi detalje" - bočni panel s trakom svih ajeta stranice + puni
          prošireni prikaz izabranog. Ručno Sačuvaj + potvrda pri izlasku s
          nespremljenim izmjenama (autoSave=false, isti guard kao EditForm). ── */}
      {browserVerseKey && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className={`${theme?.card || "bg-[#1a1a1a] border-white/10"} h-full w-full sm:w-[520px] overflow-y-auto p-4`}>
            <AyahBrowser
              verses={verses}
              verseStatuses={verseStatuses}
              onSaveVerse={(verseKey, data) => onSaveVerse?.(verseKey, data, pageNum)}
              userId={userId}
              initialVerseKey={browserVerseKey}
              autoSave={false}
              onClose={() => setBrowserVerseKey(null)}
              theme={theme} s={s} isLight={isLight}
            />
          </div>
        </div>
      )}

      {/* Upozorenje: označavanje kao "Naučen" kaskadno mijenja i sve ajete */}
      {confirmStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl border p-6 sm:p-7 max-w-sm w-full flex flex-col gap-4 ${theme?.card || "bg-[#1a1a1a] border-white/10"}`}>
            <h3 className={`text-base font-bold ${theme?.text || "text-white"}`}>
              {s?.page?.memorizeWarningTitle || "Označiti cijelu stranicu kao Naučeno?"}
            </h3>
            <p className={`text-sm leading-relaxed ${theme?.muted || "text-white/50"}`}>
              {s?.page?.memorizeWarningBody
                || "Svi ajeti na ovoj stranici će automatski biti označeni kao Naučeno, bez obzira šta je prije pisalo. Bilo koji drugi status mijenja samo status stranice — ajeti ostaju netaknuti."}
            </p>
            <label className={`flex items-center gap-2 text-xs cursor-pointer select-none ${theme?.muted || "text-white/50"}`}>
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={e => setDontShowAgain(e.target.checked)}
                className="accent-[#1D9E75] w-3.5 h-3.5"
              />
              {s?.page?.dontShowAgain || "Ne prikazuj ovo ponovo (može se vratiti u Postavkama)"}
            </label>
            <div className="flex gap-3 pt-1">
              <button
                onClick={confirmCancel}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${theme?.id === "beige_white" || theme?.id === "pink_soft" ? "bg-black/8 text-black/60 hover:opacity-70" : "bg-white/8 text-white/60 hover:opacity-70"}`}
              >
                {s?.page?.cancel || "Odustani"}
              </button>
              <button
                onClick={confirmProceed}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#1D9E75] text-white hover:bg-[#1A8E68] transition"
              >
                {s?.page?.confirmMemorize || "Da, označi sve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brisanje podataka stranice - upozorenje se NE MOŽE ugasiti/preskočiti */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl border p-6 sm:p-7 max-w-sm w-full flex flex-col gap-4 ${theme?.card || "bg-[#1a1a1a] border-white/10"}`}>
            <h3 className={`text-base font-bold ${theme?.text || "text-white"}`}>
              {s?.page?.resetWarningTitle || "Obrisati sve podatke ove stranice?"}
            </h3>
            <p className={`text-sm leading-relaxed ${theme?.muted || "text-white/50"}`}>
              {s?.page?.resetWarningBody
                || "Status, historija ponavljanja, bilješke i sav napredak ajeta na ovoj stranici bit će trajno obrisani. Ova radnja se ne može poništiti."}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={cancelReset}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${theme?.id === "beige_white" || theme?.id === "pink_soft" ? "bg-black/8 text-black/60 hover:opacity-70" : "bg-white/8 text-white/60 hover:opacity-70"}`}
              >
                {s?.page?.cancel || "Odustani"}
              </button>
              <button
                onClick={proceedToFinalReset}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#EF6F6F] text-white hover:bg-[#e05a5a] transition"
              >
                {s?.page?.confirmReset || "Da, obriši podatke"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalna, druga potvrda - eksplicitno podsjeti koja stranica se briše
          prije nego što se brisanje stvarno izvrši. Ne može se preskočiti. */}
      {resetFinalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl border p-6 sm:p-7 max-w-sm w-full flex flex-col gap-4 ${theme?.card || "bg-[#1a1a1a] border-white/10"}`}>
            <h3 className={`text-base font-bold ${theme?.text || "text-white"}`}>
              {s?.page?.resetFinalTitle || "Jeste li sigurni?"}
            </h3>
            <p className={`text-sm leading-relaxed ${theme?.muted || "text-white/50"}`}>
              {(s?.page?.resetFinalBody
                ? s.page.resetFinalBody(pageNum)
                : `Provjeri još jednom — ovo je stranica ${pageNum}. Klikom na "Da, siguran/na sam" njena historija i napredak bit će trajno obrisani.`)}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={cancelReset}
                disabled={resetting}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${theme?.id === "beige_white" || theme?.id === "pink_soft" ? "bg-black/8 text-black/60 hover:opacity-70" : "bg-white/8 text-white/60 hover:opacity-70"}`}
              >
                {s?.page?.cancel || "Odustani"}
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#EF6F6F] text-white hover:bg-[#e05a5a] transition disabled:opacity-50"
              >
                {resetting ? (s?.page?.deleting || "Brisanje...") : (s?.page?.confirmResetFinal || "Da, siguran/na sam")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
