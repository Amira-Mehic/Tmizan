// ============================================================================
// Mjesečni plan - pregled, uređivanje i PRINT / PDF izvoz
//
// Korisnik: bira mjesec, opseg i tempo → generiše plan s datumima;
// označi SLOBODNE DANE (tada nema novog učenja - fokus na ponavljanju);
// upisuje naučene sure/ajete i bilješke (npr. "greška na 36:9 -
// samopreslušavanje") PRIJE printanja; pa printa ili snimi kao PDF
// (dugme Print → "Save as PDF" u browseru).
//
// Plan se čuva u bazi (monthly_plans) - može se uređivati i pratiti i poslije.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../context/ThemeContext";
import { useLang } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../services/SupaBaseClient";
import { generateMonthlyPlan, updateDay, monthStats } from "../../../features/talim/mjesecniPlan";
import { scopeToPages } from "../../../features/talim/mushaf";
import { SURA_DATA } from "../../../constants/hifz/SURA_DATA";
import BackButton from "../../../components/shared/BackButton";
import { downloadPlanAsWord } from "../../../utils/wordExport";
import GuidedTour from "../../../components/shared/GuidedTour";
import { PageTourButton } from "../../../components/shared/PageTourButton";
import { usePageTour } from "../../../hooks/usePageTour";
import { PLAN_PRINT_TOUR } from "../../../constants/tours/planPrintTour";

export default function PlanPrintPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const userId = user?.id;
  const tour = usePageTour("plan-print", PLAN_PRINT_TOUR);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [suraId, setSuraId] = useState(36);
  const [linesPerDay, setLinesPerDay] = useState(3);
  const [restDaysText, setRestDaysText] = useState(""); // npr. "5, 12, 19"
  const [plan, setPlan] = useState(null);
  const [saved, setSaved] = useState(false);

  // učitaj postojeći plan iz baze ako postoji
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("monthly_plans").select("*")
          .eq("user_id", userId).eq("year", year).eq("month", month).maybeSingle();
        if (data?.days?.length) setPlan({ year: data.year, month: data.month, days: data.days, endLine: data.end_line });
        else setPlan(null);
      } catch { setPlan(null); }
    })();
  }, [userId, year, month]);

  const generate = () => {
    const mm = String(month).padStart(2, "0");
    const restDays = restDaysText
      .split(/[,\s]+/).filter(Boolean)
      .map((d) => `${year}-${mm}-${String(parseInt(d)).padStart(2, "0")}`);
    const pages = scopeToPages({ type: "sure", sure: [suraId] });
    const p = generateMonthlyPlan({
      year, month, pages, editionId: "medina_15", linesPerDay: Number(linesPerDay),
      restDays,
    });
    setPlan(p);
    setSaved(false);
  };

  const save = useCallback(async () => {
    if (!plan || !userId) return;
    try {
      await supabase.from("monthly_plans").upsert({
        user_id: userId, year: plan.year, month: plan.month,
        days: plan.days, end_line: plan.endLine || 0,
        rest_days: plan.days.filter((d) => d.isRest).map((d) => d.date),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,year,month" });
      setSaved(true);
    } catch { /* offline - plan ostaje lokalno */ }
  }, [plan, userId]);

  const edit = (date, field, value) => {
    setPlan((p) => updateDay(p, date, { [field]: value }));
    setSaved(false);
  };

  const stats = plan ? monthStats(plan) : null;
  const monthNames = lang === "en"
    ? ["January","February","March","April","May","June","July","August","September","October","November","December"]
    : ["Januar","Februar","Mart","April","Maj","Juni","Juli","August","Septembar","Oktobar","Novembar","Decembar"];

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      {/* Print stilovi: printa se SAMO tabela plana, crno na bijelo */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #plan-print-area, #plan-print-area * { visibility: visible; }
          #plan-print-area { position: absolute; left: 0; top: 0; width: 100%;
            color: #000 !important; background: #fff !important; }
          #plan-print-area .no-print { display: none !important; }
          #plan-print-area table { border-collapse: collapse; width: 100%; }
          #plan-print-area th, #plan-print-area td { border: 1px solid #999; padding: 6px; font-size: 11px; color: #000; }
        }
      `}</style>

      <GuidedTour steps={tour.steps} active={tour.active} onFinish={tour.finish} theme={theme} lang={tour.lang} dismissible />
      <div className="max-w-5xl mx-auto space-y-5">
        <BackButton className="no-print" />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div data-tour="tour-plan-print-page">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
              🖨️ {t("planPrint.title")}
              <PageTourButton onClick={tour.start} />
            </h1>
            <p className={`${theme.muted} text-sm mt-1`}>{t("planPrint.subtitle")}</p>
          </div>
        </div>

        {/* ── Postavke generisanja ── */}
        <div className={`${theme.card} rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3`}>
          <label className="text-sm space-y-1">
            <span className={theme.muted}>{t("planPrint.year")}</span>
            <input type="number" value={year} onChange={(e) => setYear(+e.target.value)}
              className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 outline-none`} />
          </label>
          <label className="text-sm space-y-1">
            <span className={theme.muted}>{t("planPrint.month")}</span>
            <select value={month} onChange={(e) => setMonth(+e.target.value)}
              className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 outline-none`}>
              {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className={theme.muted}>{t("planPrint.sura")}</span>
            <select value={suraId} onChange={(e) => setSuraId(+e.target.value)}
              className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 outline-none`}>
              {SURA_DATA.map((su) => <option key={su.id} value={su.id}>{su.id}. {su.name}</option>)}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className={theme.muted}>{t("planPrint.linesPerDay")}</span>
            <input type="number" min="1" max="45" value={linesPerDay} onChange={(e) => setLinesPerDay(e.target.value)}
              className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 outline-none`} />
          </label>
          <label className="text-sm space-y-1 col-span-2">
            <span className={theme.muted}>{t("planPrint.restDays")}</span>
            <input value={restDaysText} onChange={(e) => setRestDaysText(e.target.value)} placeholder="5, 12, 19, 26"
              className={`w-full ${theme.cardSub} rounded-xl px-3 py-2 outline-none`} />
          </label>
          <div className="col-span-2 sm:col-span-3 lg:col-span-6 flex gap-2 flex-wrap">
            <button onClick={generate} className={`${theme.button} rounded-xl px-5 py-2 text-sm`}>
              ⚙️ {t("planPrint.generate")}
            </button>
            {plan && (
              <>
                <button onClick={save} className={`${theme.button} rounded-xl px-5 py-2 text-sm`}>
                  💾 {saved ? t("planPrint.saved") : t("planPrint.save")}
                </button>
                <button onClick={() => window.print()} className={`${theme.button} rounded-xl px-5 py-2 text-sm`}>
                  🖨️ {t("planPrint.print")}
                </button>
                <button
                  onClick={() => downloadPlanAsWord(plan, { language: lang, monthName: monthNames[plan.month - 1] })}
                  className={`${theme.button} rounded-xl px-5 py-2 text-sm`}
                >
                  📄 Word (.doc)
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Plan (uređivanje + print zona) ── */}
        {plan && (
          <div id="plan-print-area" className={`${theme.card} rounded-2xl p-4 overflow-x-auto`}>
            <div className="mb-3">
              <h2 className="font-bold text-lg">
                Tmizan — {t("planPrint.planFor")} {monthNames[plan.month - 1]} {plan.year}.
              </h2>
              {stats && (
                <p className={`text-xs ${theme.muted} no-print`}>
                  {t("planPrint.stats", { lines: stats.planiranoRedova, filled: stats.danaPopunjeno, errors: stats.danaSaGreskom })}
                </p>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left ${theme.muted}`}>
                  <th className="py-2 pr-2">{t("planPrint.colDate")}</th>
                  <th className="py-2 pr-2">{t("planPrint.colLearning")}</th>
                  <th className="py-2 pr-2">{t("planPrint.colReview")}</th>
                  <th className="py-2 pr-2">{t("planPrint.colEntry")}</th>
                  <th className="py-2 pr-2">{t("planPrint.colNotes")}</th>
                  <th className="py-2 no-print">⚠</th>
                </tr>
              </thead>
              <tbody>
                {plan.days.map((d) => (
                  <tr key={d.date} className={`border-t border-black/10 align-top ${d.isRest ? "opacity-80" : ""}`}>
                    <td className="py-2 pr-2 whitespace-nowrap font-medium">
                      {d.date.slice(8)}. {d.oznakaGreske && "⚠"}
                    </td>
                    <td className="py-2 pr-2">
                      {d.isRest
                        ? <em>{t("planPrint.restFocus")}</em>
                        : d.learning
                          ? `${t("planPrint.pageShort")} ${d.learning.from.page}:${d.learning.from.line} → ${d.learning.to.page}:${d.learning.to.line}`
                          : "—"}
                    </td>
                    <td className="py-2 pr-2">
                      {d.isRest ? <strong>{t("planPrint.extraReview")}</strong> : (typeof d.review === "string" ? d.review : d.review?.label || t("planPrint.regularReview"))}
                    </td>
                    <td className="py-2 pr-2">
                      {/* upis naučenog: input na ekranu, ispisani tekst (ili prazna linija za ručni upis) na papiru */}
                      <input
                        value={d.upisNaucenog}
                        onChange={(e) => edit(d.date, "upisNaucenog", e.target.value)}
                        placeholder="__________"
                        className={`no-print w-full min-w-28 ${theme.cardSub} rounded-lg px-2 py-1 outline-none`}
                      />
                      <span className="hidden print:inline">{d.upisNaucenog || "____________________"}</span>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        value={d.biljeska}
                        onChange={(e) => edit(d.date, "biljeska", e.target.value)}
                        placeholder={t("planPrint.notePlaceholder")}
                        className={`no-print w-full min-w-32 ${theme.cardSub} rounded-lg px-2 py-1 outline-none`}
                      />
                      <span className="hidden print:inline">{d.biljeska || "____________________"}</span>
                    </td>
                    <td className="py-2 no-print">
                      <button
                        title={t("planPrint.markError")}
                        onClick={() => edit(d.date, "oznakaGreske", !d.oznakaGreske)}
                        className={`rounded-lg px-2 py-1 text-xs ${d.oznakaGreske ? "bg-red-600 text-white" : theme.cardSub}`}
                      >
                        ⚠
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className={`text-xs mt-3 ${theme.muted}`}>
              {t("planPrint.footer")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
