// ============================================================================
// Reset progresa - "opasna zona" u postavkama Hifz Trackera
//
// Tri odvojena reseta: (1) sav progres trackera, (2) svi planovi,
// (3) historija ponavljanja. Svaki ide kroz DVOSTRUKU potvrdu:
//   korak 1: "Jeste li sigurni?"
//   korak 2: "Ovo se NE MOŽE povratiti - sve će biti vraćeno na početne
//             postavke i morat ćete ponovo unositi podatke."
// Tek nakon druge potvrde se briše.
// ============================================================================

import { useState } from "react";
import { useLang } from "../../../../context/LanguageContext";
import { useAuth } from "../../../../context/AuthContext";
import { supabase } from "../../../../services/SupaBaseClient";

const STR = {
  bs: {
    title: "Opasna zona — resetovanje",
    desc: "Brisanje je trajno. Prije brisanja tražimo potvrdu dva puta.",
    tracker: "Resetuj sav progres trackera",
    trackerDesc: "Statusi svih stranica, sura i ajeta, sigurnost, greške i bilješke",
    plans: "Resetuj sve planove",
    plansDesc: "Planovi učenja, mjesečni planovi, rasporedi i sedmične raspodjele",
    history: "Resetuj historiju ponavljanja",
    historyDesc: "Blokovi ponavljanja, SRS stanja, historija i evidencija grešaka",
    confirm1Title: "Jeste li sigurni?",
    confirm1Body: (what) => `Želite resetovati: ${what}. Nastaviti?`,
    confirm2Title: "Posljednje upozorenje!",
    confirm2Body:
      "Ovo se NE MOŽE povratiti. Svi podaci ovog dijela bit će trajno obrisani i vraćeni na početne postavke — morat ćete ih ponovo unositi ispočetka.",
    yes: "Da, nastavi",
    yesFinal: "Razumijem — obriši trajno",
    cancel: "Odustani",
    working: "Brišem…",
    done: "Obrisano. Osvježite stranicu.",
    error: "Greška pri brisanju — pokušajte ponovo.",
  },
  en: {
    title: "Danger zone — reset",
    desc: "Deletion is permanent. We ask for confirmation twice before deleting.",
    tracker: "Reset all tracker progress",
    trackerDesc: "Statuses of all pages, surahs and ayahs, confidence, errors and notes",
    plans: "Reset all plans",
    plansDesc: "Learning plans, monthly plans, schedules and weekly distributions",
    history: "Reset repetition history",
    historyDesc: "Review blocks, SRS states, history and error records",
    confirm1Title: "Are you sure?",
    confirm1Body: (what) => `You are about to reset: ${what}. Continue?`,
    confirm2Title: "Final warning!",
    confirm2Body:
      "This CANNOT be undone. All data in this section will be permanently deleted and reset to defaults — you will have to enter it again from scratch.",
    yes: "Yes, continue",
    yesFinal: "I understand — delete permanently",
    cancel: "Cancel",
    working: "Deleting…",
    done: "Deleted. Please refresh the page.",
    error: "Error while deleting — please try again.",
  },
};

// koje tabele briše koji reset (redoslijed poštuje strane ključeve)
const TARGETS = {
  tracker: ["verse_progress", "page_progress", "surah_progress"],
  plans: ["hifz_plan_schedule*", "hifz_plans", "talim_plans", "monthly_plans", "femi_state", "rotation_state"],
  history: ["review_blocks", "srs_state", "ayah_memory", "error_tracking"],
};

export function ResetProgressSection({ cardSubCls = "", mutedCls = "", tBorderCls = "" }) {
  const { lang } = useLang();
  const { user } = useAuth();
  const s = STR[lang] || STR.bs;

  const [modal, setModal] = useState(null); // { kind, step: 1|2 }
  const [status, setStatus] = useState(null); // "working" | "done" | "error"

  const doReset = async (kind) => {
    setStatus("working");
    try {
      for (const table of TARGETS[kind]) {
        if (table.endsWith("*")) continue; // briše se kaskadno preko roditelja
        await supabase.from(table).delete().eq("user_id", user.id);
      }
      // lokalni keš trackera
      if (kind === "tracker") {
        try {
          localStorage.removeItem("tmizan_streak");
          localStorage.removeItem("tmizan_last_activity");
          sessionStorage.clear();
        } catch { /* ignorisano */ }
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
    setModal(null);
  };

  const ITEMS = [
    { kind: "tracker", label: s.tracker, desc: s.trackerDesc },
    { kind: "plans", label: s.plans, desc: s.plansDesc },
    { kind: "history", label: s.history, desc: s.historyDesc },
  ];

  return (
    <div className={`pt-4 border-t ${tBorderCls}`}>
      <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-red-500">⚠ {s.title}</h3>
      <p className={`text-[10px] mb-3 ${mutedCls} opacity-60`}>{s.desc}</p>

      <div className="flex flex-col gap-2">
        {ITEMS.map((it) => (
          <button
            key={it.kind}
            onClick={() => { setStatus(null); setModal({ kind: it.kind, step: 1 }); }}
            className={`flex flex-col items-start px-4 py-2.5 rounded-xl border border-red-500/30 text-left hover:bg-red-500/10 transition ${cardSubCls}`}
          >
            <span className="text-sm font-semibold text-red-500">{it.label}</span>
            <span className={`text-[10px] opacity-60 mt-0.5 ${mutedCls}`}>{it.desc}</span>
          </button>
        ))}
      </div>

      {status === "working" && <p className={`text-xs mt-2 ${mutedCls}`}>{s.working}</p>}
      {status === "done" && <p className="text-xs mt-2 text-green-500">{s.done}</p>}
      {status === "error" && <p className="text-xs mt-2 text-red-500">{s.error}</p>}

      {/* ── Dvokoračni modal potvrde ── */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            {modal.step === 1 ? (
              <>
                <h4 className="font-bold text-lg mb-2">{s.confirm1Title}</h4>
                <p className="text-sm text-gray-600 mb-5">
                  {s.confirm1Body(ITEMS.find((i) => i.kind === modal.kind)?.label)}
                </p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm bg-gray-100 hover:bg-gray-200">
                    {s.cancel}
                  </button>
                  <button onClick={() => setModal({ ...modal, step: 2 })} className="px-4 py-2 rounded-xl text-sm bg-amber-500 text-white hover:bg-amber-600">
                    {s.yes}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h4 className="font-bold text-lg mb-2 text-red-600">🛑 {s.confirm2Title}</h4>
                <p className="text-sm text-gray-600 mb-5">{s.confirm2Body}</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm bg-gray-100 hover:bg-gray-200">
                    {s.cancel}
                  </button>
                  <button onClick={() => doReset(modal.kind)} className="px-4 py-2 rounded-xl text-sm bg-red-600 text-white hover:bg-red-700">
                    {s.yesFinal}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
