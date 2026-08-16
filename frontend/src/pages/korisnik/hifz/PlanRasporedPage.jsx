// ============================================================================
// Puni raspored plana učenja - dan-po-dan pregled do kraja, mjesec po mjesec.
// Koristi isti motor (monthlyPlanService/mjesecniPlan.js) kao dashboard, tako
// da je "danas" na ovoj stranici uvijek identično onome na dashboardu.
// ============================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useTheme } from "../../../context/ThemeContext";
import { useLang } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../services/SupaBaseClient";
import { scopeToPages, getEdition } from "../../../features/talim/mushaf";
import { recalcPlan, progressStatus, countWorkingDays } from "../../../features/talim/planner";
import { fetchActiveTalimPlans, ensureMonthlyPlan, regenerateMonthlyPlan, invalidateFutureMonths, markDayDone } from "../../../features/talim/monthlyPlanService";
import { updateDay, toggleRestDay as toggleSpecificRestDay, toggleAyahRestDay } from "../../../features/talim/mjesecniPlan";
import { ayahsInPages } from "../../../features/talim/hifzSync";
import { describeScope } from "../../../features/talim/scopeLabel";
import { METHOD_INFO, METHOD_BLOG_SLUG } from "../../../features/talim/methodInfo";
import { todayStr, parsePageRanges } from "../../../constants/hifz/helpers";
import { SURA_DATA } from "../../../constants/hifz/SURA_DATA";
import BackButton from "../../../components/shared/BackButton";
import GuidedTour from "../../../components/shared/GuidedTour";
import { PageTourButton } from "../../../components/shared/PageTourButton";
import { usePageTour } from "../../../hooks/usePageTour";
import HelpTip from "../../../components/shared/HelpTip";
import { PLAN_RASPORED_TOUR } from "../../../constants/tours/planRasporedTour";

const STR = {
  bs: {
    title: "📅 Puni raspored učenja",
    subtitle: "Tačno šta uz danas do procijenjenog završetka",
    noPlan: "Nemaš aktivan plan učenja.",
    createPlan: "Napravi plan →",
    prevMonth: "← Prethodni",
    nextMonth: "Sljedeći →",
    restDay: "Slobodan dan",
    doneLabel: "✓ Naučeno",
    todayLabel: "DANAS",
    monthNames: ["Januar", "Februar", "Mart", "April", "Maj", "Juni", "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar"],
    weekdayShort: ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"],
    progress: "Napredak",
    end: "Plan završen 🎉",
    totalLines: "Ukupno redova",
    linesLearned: "Naučeno redova",
    editTempo: "Uredi tempo",
    newTempo: "Novi tempo (redova/dan)",
    keepDate: "Zadrži isti datum (novi tempo)",
    keepTempo: "Zadrži novi tempo (pomjeri datum)",
    applied: "Preračunato ✓",
    recalcFail: "⚠ Nije moguće s ovim tempom — pokušaj drugi.",
    scopeLabel: "Cilj", learnPrefix: "Naučiti", dailyGoalLabel: "Dnevni cilj", timeNeededLabel: "Dnevno vrijeme potrebno",
    targetLabel: "Planirani završetak", methodLabel: "Metoda", minutesUnit: "minuta", perDayUnit: "red/dan",
    unitRedovi: "redova", unitStranice: "stranica", unitAjeti: "ajeta", perDaySuffix: "dan",
    readMore: "Pročitaj više →",
    editGoals: "Uredi cilj (ručno)", saveGoalsBtn: "Sačuvaj",
    editRestDays: "Slobodni dani", restDaysHint: "Klikni dan da ga uključiš/isključiš kao pauzu — raspored se odmah preračuna.",
    cancel: "Otkaži",
    editDay: "✏️ Uredi", dayEditorTitle: "Uredi dan", otherDaysLabel: "Svi dani ovog mjeseca",
    toggleToLearn: "Pretvori u radni dan", toggleToRest: "Prolongiraj (pretvori u slobodan dan)",
    updateWholePlan: "🔄 Ažuriraj trenutni plan", updateWholePlanBtn: "Ažuriraj",
    updateWholePlanHint: "Preraspoređuje preostale (još neodučene) dane prema tvom stvarnom napretku.",
    todayEntryLabel: "Šta se uči / naučeno (sura, ajeti)", todayEntryPh: "npr. Al-Fatiha 1–4",
    todayNoteLabel: "Bilješka", todayActualLabel: "Stvarno naučeno redova (opcionalno)",
    todayActualHint: "Upiši samo ako želiš da se to i zvanično upiše u napredak plana.",
    aheadTitle: "Ispred si plana 🎉", aheadBody: "Naučio/la si {n} redova više nego što je plan predviđao za danas.",
    behindTitle: "Iza si plana", behindBody: "Trenutno zaostaješ {n} redova za planom.",
    deviationQuestion: "Želiš li zadržati trenutni raspored ili ga ažurirati prema stvarnom napretku?",
    deviationKeep: "Zadrži raspored", deviationUpdate: "Ažuriraj raspored",
    trackerSyncHint: "Ako si danas naučio/la nešto novo, unesi to ovdje ('Stvarno naučeno redova') da bi se plan automatski ažurirao — ovo NE upisuje status u Hifz Tracker, to je posebno.",
    dayPlannedLabel: "Planirano za ovaj dan", dayPlannedRange: "Stranica:red {a} → {b}", dayPlannedLines: "{n} redova",
    dayPlannedNone: "Nema planiranog gradiva (slobodan dan ili van opsega).",
    dayActualLabel: "Stvarno upisano (zvanično u planu)", dayActualLines: "✓ {n} redova upisano kao naučeno",
    dayActualNone: "Još nije upisano kao naučeno — koristi polje ispod da upišeš.",
    dayFrozenNote: "⚠ Ovaj dan je već prošao ili je označen kao naučen, pa se njegov raspon ne mijenja automatski kad se plan ažurira (čuva se historija).",
    pageLinePrefix: "Str.",
    pageLineHint: "ℹ️ Brojevi ispod su stranica:red (npr. Str. 24:13 = stranica 24, red 13) — NIJE sura:ajet.",
    ajetPrefix: "Ajet", dayPlannedAyahCount: "{n} ajeta",
    statusLabel: "Status plana",
    status_active: "Aktivan", status_paused: "Pauziran", status_archived: "Arhiviran",
    status_done: "Završen", status_scheduled: "Zakazan",
    pauseBtn: "⏸ Pauziraj", reactivateBtn: "▶ Reaktiviraj",
    archiveBtn: "🗄 Arhiviraj", unarchiveBtn: "Vrati iz arhive", deleteBtn: "Obriši",
    confirmDeleteMsg: "Sigurno obrisati ovaj plan? Ne može se vratiti.",
    confirmYes: "Da, obriši", confirmNo: "Otkaži",
    reactivateBlockedCijeli: "Ovo je plan za cijeli Kur'an — reaktiviranjem će se pauzirati trenutni aktivni plan za cijeli Kur'an (ako postoji).",
    editScopeBtn: "Uredi opseg", editScopeTitle: "Uredi šta se uči",
    editScopeHint: "Možeš odabrati više opcija istovremeno — kombinuju se u jedan opseg. Promjena opsega ponovo generiše preostali (još neodučen) raspored.",
    scope_cijeli: "Cijeli Kur'an", scope_dzuzevi: "Džuzevi", scope_sure: "Sure", scope_stranice: "Raspon stranica",
    dzuzeviPh: "npr. 30 ili 1,2,3", suraSearchPh: "🔍 Pretraži suru po imenu ili broju…",
    extraPagesLabel: "Ili dodaj pojedinačne stranice / raspone", extraPagesPh: "npr. 5, 12, 40-45",
    fromPageLabel: "Od stranice", toPageLabel: "Do stranice",
    saveScopeBtn: "Sačuvaj opseg", scopeEmptyMsg: "Odaberi bar jednu opciju gore.",
  },
  en: {
    title: "📅 Full learning schedule",
    subtitle: "Exactly what's due each day until the estimated finish",
    noPlan: "You have no active learning plan.",
    createPlan: "Create a plan →",
    prevMonth: "← Previous",
    nextMonth: "Next →",
    restDay: "Rest day",
    doneLabel: "✓ Learned",
    todayLabel: "TODAY",
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    weekdayShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    progress: "Progress",
    end: "Plan complete 🎉",
    totalLines: "Total lines",
    linesLearned: "Lines learned",
    editTempo: "Edit pace",
    newTempo: "New pace (lines/day)",
    keepDate: "Keep the date (new pace)",
    keepTempo: "Keep the new pace (move the date)",
    applied: "Recalculated ✓",
    recalcFail: "⚠ Not possible at this pace — try another.",
    scopeLabel: "Goal", learnPrefix: "Learn", dailyGoalLabel: "Daily goal", timeNeededLabel: "Daily time needed",
    targetLabel: "Planned finish", methodLabel: "Method", minutesUnit: "minutes", perDayUnit: "lines/day",
    unitRedovi: "lines", unitStranice: "pages", unitAjeti: "ayahs", perDaySuffix: "day",
    readMore: "Read more →",
    editGoals: "Edit goal (manual)", saveGoalsBtn: "Save",
    editRestDays: "Rest days", restDaysHint: "Click a day to toggle it as a pause — the schedule recalculates immediately.",
    cancel: "Cancel",
    editDay: "✏️ Edit", dayEditorTitle: "Edit day", otherDaysLabel: "All days this month",
    toggleToLearn: "Turn into a working day", toggleToRest: "Postpone (turn into a rest day)",
    updateWholePlan: "🔄 Update current plan", updateWholePlanBtn: "Update",
    updateWholePlanHint: "Redistributes the remaining (not yet learned) days based on your actual progress.",
    todayEntryLabel: "What's being learned (surah, ayahs)", todayEntryPh: "e.g. Al-Fatiha 1–4",
    todayNoteLabel: "Note", todayActualLabel: "Actually learned (lines, optional)",
    todayActualHint: "Only fill this in if you want it officially counted toward the plan's progress.",
    aheadTitle: "You're ahead of the plan 🎉", aheadBody: "You've learned {n} more lines than the plan expected for today.",
    behindTitle: "You're behind the plan", behindBody: "You're currently {n} lines behind the plan.",
    deviationQuestion: "Keep the current schedule, or update it based on your actual progress?",
    deviationKeep: "Keep schedule", deviationUpdate: "Update schedule",
    trackerSyncHint: "If you learned something new today, enter it here ('Actually learned lines') so the plan updates automatically — this does NOT update the Hifz Tracker status, that's separate.",
    dayPlannedLabel: "Planned for this day", dayPlannedRange: "Page:line {a} → {b}", dayPlannedLines: "{n} lines",
    dayPlannedNone: "No material planned (rest day or out of scope).",
    dayActualLabel: "Actually logged (official in the plan)", dayActualLines: "✓ {n} lines logged as learned",
    dayActualNone: "Not yet marked as learned — use the field below to log it.",
    dayFrozenNote: "⚠ This day has already passed or is marked as learned, so its range doesn't change automatically when the plan updates (history is preserved).",
    pageLinePrefix: "P.",
    pageLineHint: "ℹ️ The numbers below are page:line (e.g. P. 24:13 = page 24, line 13) — NOT surah:ayah.",
    ajetPrefix: "Ayah", dayPlannedAyahCount: "{n} ayahs",
    statusLabel: "Plan status",
    status_active: "Active", status_paused: "Paused", status_archived: "Archived",
    status_done: "Completed", status_scheduled: "Scheduled",
    pauseBtn: "⏸ Pause", reactivateBtn: "▶ Reactivate",
    archiveBtn: "🗄 Archive", unarchiveBtn: "Restore from archive", deleteBtn: "Delete",
    confirmDeleteMsg: "Delete this plan for good? This can't be undone.",
    confirmYes: "Yes, delete", confirmNo: "Cancel",
    reactivateBlockedCijeli: "This is a whole-Qur'an plan — reactivating it will pause your current active whole-Qur'an plan (if any).",
    editScopeBtn: "Edit scope", editScopeTitle: "Edit what's being learned",
    editScopeHint: "You can pick more than one option at once — they combine into one scope. Changing the scope regenerates the remaining (not yet learned) schedule.",
    scope_cijeli: "Whole Qur'an", scope_dzuzevi: "Ajza", scope_sure: "Surahs", scope_stranice: "Page range",
    dzuzeviPh: "e.g. 30 or 1,2,3", suraSearchPh: "🔍 Search surah by name or number…",
    extraPagesLabel: "Or add individual pages / ranges", extraPagesPh: "e.g. 5, 12, 40-45",
    fromPageLabel: "From page", toPageLabel: "To page",
    saveScopeBtn: "Save scope", scopeEmptyMsg: "Pick at least one option above.",
  },
};

// Isti princip kao dailyGoalText u TalimWizard.jsx - dnevni cilj prikazan na
// jedinici koju je korisnik STVARNO odabrao (ajeti/stranice/redovi), ne uvijek
// interno preračunati lines_per_day.
function dailyGoalText(plan, s) {
  const unit = plan?.state?.tempoUnit || "redovi";
  if (unit === "ajeti") {
    const n = plan?.state?.ajetiPerDay || 0;
    return `${Math.round(n * 10) / 10} ${s.unitAjeti}/${s.perDaySuffix}`;
  }
  if (unit === "stranice") {
    const lpp = getEdition(plan?.mushaf_edition).linesPerPage || 15;
    const pagesPerDay = (plan?.lines_per_day || 0) / lpp;
    return `${Math.round(pagesPerDay * 100) / 100} ${s.unitStranice}/${s.perDaySuffix}`;
  }
  return `${Math.round((plan?.lines_per_day || 0) * 10) / 10} ${s.unitRedovi}/${s.perDaySuffix}`;
}

export default function PlanRasporedPage() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const s = STR[lang] || STR.bs;
  const today = todayStr();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedPlanId = searchParams.get("plan");
  const tour = usePageTour("plan-raspored", PLAN_RASPORED_TOUR);

  const [plan, setPlan] = useState(null);
  const [ym, setYm] = useState(null); // { year, month }
  const [monthlyPlan, setMonthlyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTempo, setNewTempo] = useState("");
  const [recalcMsg, setRecalcMsg] = useState("");
  // Jedinica tempa (redovi/stranice/ajeti) - može se promijeniti direktno ovdje,
  // isto kao broj; učitava se iz plan.state.tempoUnit u loadPlan().
  const [editTempoUnit, setEditTempoUnit] = useState("redovi");
  // Status plana (aktivan/pauziran/arhiviran) - mijenja se DIREKTNO ovdje,
  // bez prolaska kroz wizard (isti plan.id se čuva, ne pravi se novi red).
  const [statusMsg, setStatusMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  // Uređivanje opsega (šta se uči) - direktno na ISTOM planu, bez wizarda.
  // Isti obrazac unosa kao u čarobnjaku (korak "Šta učiš"), samo ovdje čuva
  // izmjenu na postojeći plan.id umjesto da pravi novi red.
  const [scopeEditorOpen, setScopeEditorOpen] = useState(false);
  const [editScopeTypes, setEditScopeTypes] = useState([]);
  const [editDzuzeviText, setEditDzuzeviText] = useState("");
  const [editSure, setEditSure] = useState([]);
  const [editSuraSearch, setEditSuraSearch] = useState("");
  const [editFromPage, setEditFromPage] = useState(1);
  const [editToPage, setEditToPage] = useState(20);
  const [editExtraPagesText, setEditExtraPagesText] = useState("");
  const [scopeMsg, setScopeMsg] = useState("");
  // Direktno uređivanje cilja - odvojeno od "Uredi tempo" (koji preračunava
  // datum/tempo jedno iz drugog). Ovdje korisnik može ručno prepisati datum
  // završetka i/ili vrijeme potrebno, bez ikakvog preračuna (npr. ako je
  // muallim predložio drugačiji rok pa ga korisnik želi ručno zadržati/izmijeniti).
  const [editTargetDate, setEditTargetDate] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [goalsMsg, setGoalsMsg] = useState("");
  // Slobodni dani u sedmici - mijenjaju se direktno klikom (bez posebnog
  // "Sačuvaj" dugmeta), plan i raspored se odmah automatski regenerišu.
  const [editRestWeekdays, setEditRestWeekdays] = useState([]);
  const [restMsg, setRestMsg] = useState("");
  // ── Uređivač POJEDINAČNOG dana (bilo koji dan, ne samo danas) - bočni panel
  // koji ostaje otvoren dok korisnik lista i mijenja druge dane; svaki dan se
  // može: (a) prebaciti slobodan↔radni (sistem sam preračuna sadržaj), i/ili
  // (b) dobiti slobodan tekst (šta se uči/bilješka) + opcioni broj stvarno
  // naučenih redova, koji preko iste markDayDone funkcije (kao Dashboard)
  // ažurira zvanični napredak plana. ──
  const [editorDate, setEditorDate] = useState(null); // "YYYY-MM-DD" | null
  const activeChipRef = useRef(null);
  const [editorEntryText, setEditorEntryText] = useState("");
  const [editorNoteText, setEditorNoteText] = useState("");
  const [editorActualLines, setEditorActualLines] = useState("");
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorMsg, setEditorMsg] = useState("");
  // Ako ručni unos gurne korisnika ISPRED ili IZA plana - pitaj želi li
  // zadržati trenutni raspored ili ga ažurirati prema stvarnom napretku
  // (sistem preračunava, korisnik ne dira raspored ručno).
  const [deviationPrompt, setDeviationPrompt] = useState(null); // { type: "ahead"|"behind", lines } | null
  const [updatePlanMsg, setUpdatePlanMsg] = useState("");

  // Ako više planova može biti aktivno istovremeno, ova stranica prikazuje
  // TAČNO JEDAN - onaj naveden u URL-u (?plan=<id>, iz "Vidi detalje" kartice
  // u čarobnjaku ili sa Dashboarda); bez tog parametra pada nazad na prvi
  // aktivni (npr. direktan dolazak na stranicu bez konteksta).
  const loadPlan = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    let tp = null;
    if (requestedPlanId) {
      // Konkretan plan iz URL-a (?plan=<id>) - učitaj GA BEZ obzira da li je
      // trenutno aktivan, pauziran ili arhiviran, jer ova stranica sad služi i
      // kao "Uredi" (status/tempo/opseg), ne samo pregled aktivnog rasporeda.
      try {
        const { data } = await supabase.from("talim_plans").select("*")
          .eq("id", requestedPlanId).eq("user_id", user.id).maybeSingle();
        tp = data || null;
      } catch { tp = null; }
    } else {
      const activePlans = await fetchActiveTalimPlans(user.id);
      tp = activePlans[0] || null;
    }
    setPlan(tp);
    setEditRestWeekdays(tp?.state?.restWeekdays || []);
    setEditTempoUnit(tp?.state?.tempoUnit || "redovi");
    if (tp) {
      const [y, m] = tp.start_date.split("-").map(Number);
      setYm({ year: y, month: m });
    }
    setLoading(false);
  }, [user, requestedPlanId]);

  // loadPlan() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadPlan(); }, [loadPlan]);

  useEffect(() => {
    if (!user?.id || !plan || !ym) return;
    let alive = true;
    (async () => {
      const mp = await ensureMonthlyPlan(user.id, plan, ym.year, ym.month);
      if (alive) setMonthlyPlan(mp);
    })();
    return () => { alive = false; };
  }, [user?.id, plan, ym]);

  // Kad se otvori uređivač (ili korisnik u panelu klikne na drugi dan), polja
  // se popune podacima TOG dana. Čisto sinhrona prilagodba stanja prema
  // editorDate - prilagođava se tokom rendera uz poređenje s prethodnom
  // vrijednosti (isti okidač kao stari dependency niz [editorDate]).
  const [prevEditorDate, setPrevEditorDate] = useState(editorDate);
  if (editorDate !== prevEditorDate) {
    setPrevEditorDate(editorDate);
    if (editorDate) {
      const d = monthlyPlan?.days?.find((x) => x.date === editorDate);
      setEditorEntryText(d?.upisNaucenog || "");
      setEditorNoteText(d?.biljeska || "");
      const plannedAmount = d?.learning?.lineCount ?? d?.learning?.amount;
      setEditorActualLines(plannedAmount != null ? String(plannedAmount) : "");
      setEditorMsg("");
    }
  }

  // Kad se promijeni dan koji se uređuje, dovuci taj "chip" do sredine
  // horizontalne trake dana (glatko skrolanje), da korisnik uvijek vidi
  // gdje se nalazi u odnosu na ostale dane.
  useEffect(() => {
    if (editorDate && activeChipRef.current) {
      activeChipRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [editorDate]);

  if (loading) return <div className={`min-h-screen ${theme.text} px-4 py-6`}><p className={theme.muted}>…</p></div>;

  if (!plan) {
    return (
      <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
        <div className="max-w-3xl mx-auto space-y-4">
          <BackButton />
          <h1 className="text-2xl font-bold">{s.title}</h1>
          <p className={theme.muted}>{s.noPlan}</p>
          <a href="/korisnik/hifz/planner" className={`${theme.accent} underline text-sm`}>{s.createPlan}</a>
        </div>
      </div>
    );
  }

  let totalLines = 0;
  let pages = [];
  try {
    pages = scopeToPages(plan.scope_data);
    totalLines = pages.length * getEdition(plan.mushaf_edition).linesPerPage;
  } catch { totalLines = 0; }

  const learnedLines = plan.learned_lines || 0;
  const percent = totalLines > 0 ? Math.min(100, Math.round((learnedLines / totalLines) * 100)) : 0;
  const finished = !monthlyPlan; // ensureMonthlyPlan vraća null kad je startLine >= totalLines
  const editorDay = monthlyPlan?.days?.find((d) => d.date === editorDate) || null;

  // ── Status plana - isti prioritet kao u čarobnjaku (Arhiviran > Završen >
  // Aktivan > Zakazan > Pauziran), ali sad sa PRAVIM dugmadima za promjenu
  // statusa direktno ovdje (bez novog reda/wizarda). ──
  const isArchived = !!plan.state?.archived;
  const isDonePlan = totalLines > 0 && learnedLines >= totalLines;
  const isScheduled = plan.start_date > today;
  const statusKey = isArchived ? "archived" : isDonePlan ? "done" : plan.active ? "active" : isScheduled ? "scheduled" : "paused";
  const statusCls = {
    active: "bg-green-600", paused: "bg-amber-500", archived: "bg-gray-500",
    done: "bg-green-600", scheduled: "bg-sky-500",
  }[statusKey];

  const pausePlan = async () => {
    try {
      await supabase.from("talim_plans").update({ active: false, updated_at: new Date().toISOString() }).eq("id", plan.id);
      setStatusMsg(s.applied);
      loadPlan();
    } catch { setStatusMsg(s.recalcFail); }
  };

  const reactivatePlan = async () => {
    try {
      // Pravilo: samo JEDAN "cijeli Kur'an" plan smije biti aktivan odjednom -
      // reaktiviranjem ovog (ako je "cijeli") pauziraj eventualni drugi aktivni.
      // Sura/džuz planovi se ne diraju.
      if (plan.scope_type === "cijeli") {
        await supabase.from("talim_plans").update({ active: false })
          .eq("user_id", user.id).eq("active", true).eq("scope_type", "cijeli");
      }
      await supabase.from("talim_plans").update({ active: true, updated_at: new Date().toISOString() }).eq("id", plan.id);
      setStatusMsg(s.applied);
      loadPlan();
    } catch { setStatusMsg(s.recalcFail); }
  };

  const toggleArchivePlan = async () => {
    try {
      const nextState = { ...(plan.state || {}), archived: !isArchived };
      await supabase.from("talim_plans").update({ state: nextState, updated_at: new Date().toISOString() }).eq("id", plan.id);
      setStatusMsg(s.applied);
      loadPlan();
    } catch { setStatusMsg(s.recalcFail); }
  };

  const deletePlanNow = async () => {
    try {
      await supabase.from("talim_plans").delete().eq("id", plan.id);
      navigate("/korisnik/hifz/planner");
    } catch { setStatusMsg(s.recalcFail); setConfirmDelete(false); }
  };

  // ── ručno uređivanje tempa (svjesna promjena kapaciteta, za razliku od
  //    automatskog pomjeranja datuma koje se dešava pri svakom "označi naučeno") ──
  // Jedinica (redovi/stranice/ajeti) se može promijeniti ovdje isto kao broj -
  // baza uvijek čuva lines_per_day kao "izvor istine" za procjenu datuma, pa se
  // stranice/ajeti pretvaraju u ekvivalentan broj redova (ista formula kao u
  // čarobnjaku: prosjek cijelog mushafa, 604 str. / 6236 ajeta).
  const applyRecalc = async (keep) => {
    const lpp = getEdition(plan.mushaf_edition).linesPerPage || 15;
    const AVG_AYAHS_TOTAL = 6236;
    const avgLinesPerAyah = (604 * lpp) / AVG_AYAHS_TOTAL;
    const rawAmount = Number(newTempo);
    let nt = plan.lines_per_day;
    let ajetiPerDay = plan.state?.ajetiPerDay || null;
    if (rawAmount > 0) {
      if (editTempoUnit === "ajeti") { ajetiPerDay = rawAmount; nt = rawAmount * avgLinesPerAyah; }
      else if (editTempoUnit === "stranice") { nt = rawAmount * lpp; }
      else { nt = rawAmount; }
    }
    const res = recalcPlan({
      totalLines, learnedLines: plan.learned_lines || 0,
      startDate: plan.start_date, targetDate: plan.target_date,
      today, keep, newLinesPerDay: nt, editionId: plan.mushaf_edition,
      restWeekdays: plan.state?.restWeekdays || [],
    });
    if (res.done || res.feasible === false) { setRecalcMsg(s.recalcFail); return; }
    const nextState = {
      ...(plan.state || {}), tempoUnit: editTempoUnit,
      ajetiPerDay: editTempoUnit === "ajeti" ? ajetiPerDay : null,
    };
    try {
      await supabase.from("talim_plans").update({
        lines_per_day: res.linesPerDay, target_date: res.targetDate,
        state: nextState, updated_at: new Date().toISOString(),
      }).eq("id", plan.id);
      // Bez ovoga bi "Dnevni cilj" pokazivao novi tempo, ali raspored ispod
      // (dan-po-dan) bi ostao keširan sa starim tempom/jedinicom - regeneriši ga odmah.
      if (ym) {
        const updatedPlan = { ...plan, lines_per_day: res.linesPerDay, state: nextState };
        await regenerateMonthlyPlan(user.id, updatedPlan, ym.year, ym.month);
        await invalidateFutureMonths(user.id, plan.id, ym.year, ym.month);
      }
      setRecalcMsg(s.applied);
      loadPlan();
    } catch { /* ignorisano */ }
  };

  // ── Uređivanje opsega (šta se uči) - isti obrazac kao u čarobnjaku, ali
  // ovdje se čuva na POSTOJEĆI plan.id (ne pravi se novi red). ──
  const applyScopePart = (part) => {
    if (!part) return;
    if (part.type === "dzuzevi") setEditDzuzeviText((part.dzuzevi || []).join(", "));
    else if (part.type === "sure") setEditSure(part.sure || []);
    else if (part.type === "stranice") {
      setEditFromPage(part.from ?? 1);
      setEditToPage(part.to ?? 20);
      setEditExtraPagesText((part.extra || []).join(", "));
    }
  };

  const openScopeEditor = () => {
    const sd = plan.scope_data;
    if (sd?.type === "kombinovano") {
      setEditScopeTypes((sd.parts || []).map((pt) => pt.type));
      (sd.parts || []).forEach(applyScopePart);
    } else if (sd?.type) {
      setEditScopeTypes([sd.type]);
      applyScopePart(sd);
    } else {
      setEditScopeTypes([]);
    }
    setScopeMsg("");
    setScopeEditorOpen(true);
  };

  const toggleEditScopeType = (t) => {
    setEditScopeTypes((prev) => {
      if (t === "cijeli") return prev.includes("cijeli") ? [] : ["cijeli"];
      const bezCijelog = prev.filter((x) => x !== "cijeli");
      return bezCijelog.includes(t) ? bezCijelog.filter((x) => x !== t) : [...bezCijelog, t];
    });
  };

  // Isti oblik kao scope u TalimWizard.jsx - jedan tip ostaje jednostavan, više
  // tipova se spaja u { type: "kombinovano", parts: [...] }.
  const editScope = (() => {
    try {
      if (editScopeTypes.includes("cijeli")) return { type: "cijeli" };
      const parts = [];
      if (editScopeTypes.includes("dzuzevi")) {
        const dz = [...new Set(editDzuzeviText.split(/[,\s]+/).filter(Boolean).map(Number))].sort((a, b) => a - b);
        if (dz.length) parts.push({ type: "dzuzevi", dzuzevi: dz });
      }
      if (editScopeTypes.includes("sure") && editSure.length) {
        parts.push({ type: "sure", sure: editSure });
      }
      if (editScopeTypes.includes("stranice")) {
        const from = Number(editFromPage), to = Number(editToPage);
        if (from && to) parts.push({ type: "stranice", from, to, extra: parsePageRanges(editExtraPagesText) });
      }
      if (!parts.length) return null;
      return parts.length === 1 ? parts[0] : { type: "kombinovano", parts };
    } catch { return null; }
  })();

  const saveScope = async () => {
    if (!editScope) { setScopeMsg(s.scopeEmptyMsg); return; }
    const scopeTypeCol = editScope.type === "kombinovano" ? (editScopeTypes[0] || "stranice") : editScope.type;
    try {
      await supabase.from("talim_plans").update({
        scope_type: scopeTypeCol, scope_data: editScope, updated_at: new Date().toISOString(),
      }).eq("id", plan.id);
      if (ym) {
        const updatedPlan = { ...plan, scope_type: scopeTypeCol, scope_data: editScope };
        await regenerateMonthlyPlan(user.id, updatedPlan, ym.year, ym.month);
        await invalidateFutureMonths(user.id, plan.id, ym.year, ym.month);
      }
      setScopeMsg(s.applied);
      setScopeEditorOpen(false);
      loadPlan();
    } catch { setScopeMsg(s.recalcFail); }
  };

  // Ručno prepisivanje datuma završetka i/ili vremena potrebnog - bez preračuna
  // tempa (za razliku od applyRecalc iznad). Prazno polje = ta vrijednost se ne dira.
  const saveGoals = async () => {
    if (!editTargetDate && !editMinutes) return;
    const patch = { updated_at: new Date().toISOString() };
    if (editTargetDate) patch.target_date = editTargetDate;
    if (editMinutes) patch.state = { ...(plan.state || {}), minutesNeeded: Number(editMinutes) };
    try {
      await supabase.from("talim_plans").update(patch).eq("id", plan.id);
      setEditTargetDate(""); setEditMinutes("");
      setGoalsMsg(s.applied);
      setTimeout(() => setGoalsMsg(""), 3000);
      loadPlan();
    } catch { setGoalsMsg(s.recalcFail); }
  };

  // Klik na dan odmah uključi/isključi pauzu i regeneriše raspored (tekući i
  // budući mjeseci) - bez posebnog "Sačuvaj" koraka, kako je i traženo.
  const toggleRestWeekday = async (idx) => {
    const next = editRestWeekdays.includes(idx)
      ? editRestWeekdays.filter((x) => x !== idx)
      : [...editRestWeekdays, idx].sort((a, b) => a - b);
    setEditRestWeekdays(next);
    const newState = { ...(plan.state || {}), restWeekdays: next };
    try {
      await supabase.from("talim_plans").update({
        state: newState, updated_at: new Date().toISOString(),
      }).eq("id", plan.id);
      if (ym) {
        await regenerateMonthlyPlan(user.id, { ...plan, state: newState }, ym.year, ym.month);
        await invalidateFutureMonths(user.id, plan.id, ym.year, ym.month);
      }
      setRestMsg(s.applied);
      setTimeout(() => setRestMsg(""), 2500);
      loadPlan();
    } catch { setRestMsg(s.recalcFail); }
  };

  // Prebaci BILO KOJI dan slobodan↔radni (npr. "prolongiraj" - pretvori
  // današnji/budući dan koji nisi stigao/la naučiti u slobodan, sadržaj se
  // automatski pomjeri na naredni dan; ili obrnuto, uzmi slobodan dan za
  // učenje). Isti generator kao "Uredi tempo" - korisnik ništa ne bira ručno,
  // samo kaže KOJI dan i sistem sam preračuna šta se uči.
  const toggleDayRest = async (date) => {
    if (!monthlyPlan || !ym) return;
    try {
      let updated;
      if (plan.state?.tempoUnit === "ajeti") {
        const ayahKeys = await ayahsInPages(pages);
        updated = toggleAyahRestDay(monthlyPlan, date, {
          ayahKeys, ayahsPerDay: plan.state?.ajetiPerDay || 1, today,
        });
      } else {
        updated = toggleSpecificRestDay(monthlyPlan, date, {
          pages, editionId: plan.mushaf_edition, linesPerDay: plan.lines_per_day, today,
        });
      }
      await supabase.from("monthly_plans").update({
        days: updated.days, end_line: updated.endLine ?? updated.endIndex, updated_at: new Date().toISOString(),
      }).eq("id", monthlyPlan.id);
      setMonthlyPlan(updated);
    } catch { /* ostaje kako je bilo */ }
  };

  const openDayEditor = (date) => setEditorDate(date);

  // Sačuvaj slobodan tekst (uvijek) + opcioni broj stvarno naučenih redova za
  // BILO KOJI dan. Sam generisani raspored (ostali dani) se ovdje NE dira -
  // samo se, preko markDayDone (ista funkcija koju koristi i "Danas učiš"),
  // ažurira zvanični napredak plana (talim_plans.learned_lines/target_date).
  const saveEditorDay = async () => {
    if (!editorDay || !ym) return;
    setEditorSaving(true);
    try {
      let mp = updateDay(monthlyPlan, editorDay.date, { upisNaucenog: editorEntryText, biljeska: editorNoteText });
      await supabase.from("monthly_plans").update({
        days: mp.days, updated_at: new Date().toISOString(),
      }).eq("id", monthlyPlan.id);
      setMonthlyPlan(mp);

      const actual = Number(editorActualLines);
      if (actual > 0 && !editorDay.done) {
        const res = await markDayDone(user.id, plan, mp, editorDay.date, actual);
        if (res) {
          mp = { ...mp, days: res.days };
          setMonthlyPlan(mp);
          setPlan((p) => ({ ...p, learned_lines: res.learned_lines, target_date: res.target_date }));

          // Da li je korisnik sad ISPRED ili IZA plana? Ako jeste (u bilo kom
          // smjeru) - pitaj: zadrži raspored ili ga ažuriraj prema napretku.
          const restWeekdays = plan.state?.restWeekdays || [];
          const plannedToDate = Math.min(totalLines, plan.lines_per_day * countWorkingDays(plan.start_date, today, restWeekdays));
          const status = progressStatus({
            totalLines, learnedLines: res.learned_lines, plannedLinesToDate: plannedToDate,
            linesPerDay: plan.lines_per_day, today, restWeekdays,
          });
          if (status.aheadLines > 0) setDeviationPrompt({ type: "ahead", lines: status.aheadLines });
          else if (status.backlogLines > 0) setDeviationPrompt({ type: "behind", lines: status.backlogLines });
        }
      }
      setEditorMsg(s.applied);
    } catch { setEditorMsg(s.recalcFail); }
    setEditorSaving(false);
  };

  // Odgovor na "ispred/iza si plana" - "zadrži" ne dira ništa (raspored
  // ostaje tačno kako je generisan); "ažuriraj" prerasporedi PREOSTALE (još
  // neodučene) dane od trenutnog napretka - isti mehanizam kao "Uredi tempo".
  const resolveDeviationPrompt = async (wantsUpdate) => {
    if (wantsUpdate && ym) {
      await regenerateMonthlyPlan(user.id, plan, ym.year, ym.month);
      await invalidateFutureMonths(user.id, plan.id, ym.year, ym.month);
      loadPlan();
    }
    setDeviationPrompt(null);
  };

  // Zaseban, uvijek dostupan "Ažuriraj trenutni plan" - ista radnja kao
  // "ažuriraj" gore, samo bez čekanja na dijalog (korisnik je sam traži).
  const updatePlanNow = async () => {
    if (!ym) return;
    try {
      await regenerateMonthlyPlan(user.id, plan, ym.year, ym.month);
      await invalidateFutureMonths(user.id, plan.id, ym.year, ym.month);
      setUpdatePlanMsg(s.applied);
      setTimeout(() => setUpdatePlanMsg(""), 2500);
      loadPlan();
    } catch { setUpdatePlanMsg(s.recalcFail); }
  };

  const goMonth = (delta) => {
    setYm((cur) => {
      let month = cur.month + delta, year = cur.year;
      if (month < 1) { month = 12; year -= 1; }
      if (month > 12) { month = 1; year += 1; }
      return { year, month };
    });
  };

  const [startY, startM] = plan.start_date.split("-").map(Number);
  const canGoPrev = ym && (ym.year > startY || (ym.year === startY && ym.month > startM));
  const methodInfo = (METHOD_INFO[lang] || METHOD_INFO.bs)[plan.method];

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <GuidedTour steps={tour.steps} active={tour.active} onFinish={tour.finish} theme={theme} lang={tour.lang} dismissible />
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton />
        <div data-tour="tour-plan-raspored-page">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
            {s.title}
            <PageTourButton onClick={tour.start} />
          </h1>
          <p className={`${theme.muted} text-sm mt-1`}>{s.subtitle}</p>
        </div>

        {/* ── Status plana - mijenja se OVDJE, direktno na ISTOM planu (bez wizarda) ── */}
        <div className={`${theme.card} rounded-2xl p-4 space-y-2`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wide text-white px-2.5 py-1 rounded-full ${statusCls}`}>
                {s[`status_${statusKey}`]}
              </span>
              <span className={`text-xs ${theme.muted}`}>{s.statusLabel}</span>
            </div>
            {statusMsg && <span className="text-xs text-green-500">{statusMsg}</span>}
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {statusKey === "active" && (
              <button onClick={pausePlan} className={`text-xs uppercase font-semibold tracking-wide ${theme.muted}`}>{s.pauseBtn}</button>
            )}
            {(statusKey === "paused" || statusKey === "scheduled") && (
              <button onClick={reactivatePlan} className={`text-xs uppercase font-semibold tracking-wide ${theme.accent}`}>{s.reactivateBtn}</button>
            )}
            {statusKey !== "archived" ? (
              <button onClick={toggleArchivePlan} className={`text-xs uppercase font-semibold tracking-wide ${theme.muted}`}>{s.archiveBtn}</button>
            ) : (
              <button onClick={toggleArchivePlan} className={`text-xs uppercase font-semibold tracking-wide ${theme.accent}`}>{s.unarchiveBtn}</button>
            )}
            {confirmDelete ? (
              <>
                <span className={`text-xs ${theme.muted}`}>{s.confirmDeleteMsg}</span>
                <button onClick={deletePlanNow} className="text-xs font-semibold text-red-500">{s.confirmYes}</button>
                <button onClick={() => setConfirmDelete(false)} className={`text-xs ${theme.muted}`}>{s.confirmNo}</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-xs uppercase font-semibold tracking-wide text-red-500">{s.deleteBtn}</button>
            )}
          </div>
          {plan.scope_type === "cijeli" && (statusKey === "paused" || statusKey === "scheduled") && (
            <p className={`text-[11px] ${theme.muted} opacity-80`}>{s.reactivateBlockedCijeli}</p>
          )}
        </div>

        <div className={`${theme.card} rounded-2xl p-4 space-y-3`}>
          <div className="flex items-start justify-between gap-2 flex-wrap text-sm">
            <div className="min-w-0">
              <span className={`text-xs ${theme.muted}`}>{s.scopeLabel}: </span>
              <span className="break-words">{plan.scope_data ? `${s.learnPrefix} ${describeScope(plan.scope_data, lang)}` : "—"}</span>
            </div>
            {!finished && (
              <button onClick={scopeEditorOpen ? () => setScopeEditorOpen(false) : openScopeEditor}
                className={`text-xs uppercase font-semibold tracking-wide shrink-0 ${theme.accent}`}>
                {s.editScopeBtn}
              </button>
            )}
          </div>

          {scopeEditorOpen && (
            <div className={`${theme.cardSub} rounded-xl p-3 space-y-3`}>
              <p className={`text-xs ${theme.muted}`}>{s.editScopeHint}</p>
              <div className="flex gap-2 flex-wrap">
                {["cijeli", "dzuzevi", "sure", "stranice"].map((t) => (
                  <button key={t} type="button" onClick={() => toggleEditScopeType(t)}
                    className={`rounded-xl px-3.5 py-2 text-sm transition ${editScopeTypes.includes(t) ? theme.button : `${theme.card} ${theme.muted}`}`}>
                    {s[`scope_${t}`]}
                  </button>
                ))}
              </div>

              {editScopeTypes.includes("dzuzevi") && (
                <input value={editDzuzeviText} onChange={(e) => setEditDzuzeviText(e.target.value)}
                  placeholder={s.dzuzeviPh} className={`w-full ${theme.card} rounded-xl px-3 py-2 text-sm outline-none`} />
              )}

              {editScopeTypes.includes("sure") && (
                <>
                  <input value={editSuraSearch} onChange={(e) => setEditSuraSearch(e.target.value)}
                    placeholder={s.suraSearchPh} className={`w-full ${theme.card} rounded-xl px-3 py-2 text-sm outline-none`} />
                  <div className="max-h-52 overflow-y-auto space-y-1 pr-1 rounded-xl [&::-webkit-scrollbar]:hidden">
                    {SURA_DATA
                      .filter((su) => {
                        const q = editSuraSearch.trim().toLowerCase();
                        if (!q) return true;
                        return su.name.toLowerCase().includes(q) || String(su.id) === q;
                      })
                      .map((su) => {
                        const active = editSure.includes(su.id);
                        return (
                          <button key={su.id} type="button"
                            onClick={() => setEditSure((prev) => active ? prev.filter((id) => id !== su.id) : [...prev, su.id])}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150
                              ${active ? theme.button : `${theme.card} ${theme.muted} hover:opacity-80`}`}>
                            <span className="font-medium">{su.id}. {su.name}</span>
                          </button>
                        );
                      })}
                  </div>
                </>
              )}

              {editScopeTypes.includes("stranice") && (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center flex-wrap">
                    <label className="text-xs">
                      <span className={theme.muted}>{s.fromPageLabel}</span>
                      <input type="number" min="1" max="604" value={editFromPage}
                        onChange={(e) => setEditFromPage(Number(e.target.value))}
                        className={`block mt-1 w-24 ${theme.card} rounded-xl px-3 py-2 text-sm outline-none`} />
                    </label>
                    <label className="text-xs">
                      <span className={theme.muted}>{s.toPageLabel}</span>
                      <input type="number" min="1" max="604" value={editToPage}
                        onChange={(e) => setEditToPage(Number(e.target.value))}
                        className={`block mt-1 w-24 ${theme.card} rounded-xl px-3 py-2 text-sm outline-none`} />
                    </label>
                  </div>
                  <label className="text-xs block">
                    <span className={theme.muted}>{s.extraPagesLabel}</span>
                    <input value={editExtraPagesText} onChange={(e) => setEditExtraPagesText(e.target.value)}
                      placeholder={s.extraPagesPh}
                      className={`block w-full mt-1 ${theme.card} rounded-xl px-3 py-2 text-sm outline-none`} />
                  </label>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button onClick={saveScope} className={`${theme.button} rounded-xl px-4 py-2 text-xs font-semibold`}>
                  {s.saveScopeBtn}
                </button>
                <button onClick={() => setScopeEditorOpen(false)} className={`${theme.card} ${theme.muted} rounded-xl px-4 py-2 text-xs`}>
                  {s.cancel}
                </button>
                {scopeMsg && <span className="text-xs text-green-500">{scopeMsg}</span>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div><span className={`text-xs ${theme.muted}`}>{s.dailyGoalLabel}: </span>{dailyGoalText(plan, s)}</div>
            {plan.state?.minutesNeeded ? (
              <div><span className={`text-xs ${theme.muted}`}>{s.timeNeededLabel}: </span>{plan.state.minutesNeeded} {s.minutesUnit}</div>
            ) : null}
            <div><span className={`text-xs ${theme.muted}`}>{s.targetLabel}: </span>{plan.target_date || "?"}</div>
          </div>

          {/* Objašnjenje odabrane metode - otvara/zatvara se klikom */}
          <div className={`${theme.cardSub} rounded-xl p-3`}>
            <button onClick={() => setMethodOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 text-left">
              <span className="text-sm font-semibold">{s.methodLabel}: {methodInfo?.naziv || plan.method}</span>
              <span className={`text-xs shrink-0 transition-transform duration-200 ${methodOpen ? "rotate-180" : ""} ${theme.muted}`}>⌄</span>
            </button>
            {methodOpen && methodInfo && (
              <>
                <p className={`text-xs mt-2 leading-relaxed ${theme.muted}`}>{methodInfo.opis}</p>
                {METHOD_BLOG_SLUG[plan.method] && (
                  <Link to={`/blog/${METHOD_BLOG_SLUG[plan.method]}`} className={`text-xs font-semibold mt-2 inline-block ${theme.accent}`}>
                    {s.readMore}
                  </Link>
                )}
              </>
            )}
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>{s.progress}</span>
              <span className={theme.accent}>{learnedLines}/{totalLines} · {percent}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-black/10 overflow-hidden">
              <div className={`h-full ${theme.logo} transition-all`} style={{ width: `${percent}%` }} />
            </div>
          </div>

          {!finished && (
            <div className={`${theme.cardSub} rounded-xl p-3 space-y-2`}>
              <p className={`text-xs font-semibold flex items-center ${theme.muted}`}>
                {s.editTempo}
                <HelpTip text="'Zadrži datum' preračunava tempo tako da i dalje završiš na isti datum. 'Zadrži tempo' preračunava datum završetka prema novom tempu koji upišeš." />
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {["redovi", "stranice", "ajeti"].map((u) => (
                  <button key={u} type="button" onClick={() => setEditTempoUnit(u)}
                    className={`rounded-xl px-3 py-1.5 text-xs transition ${editTempoUnit === u ? theme.button : `${theme.card} ${theme.muted}`}`}>
                    {s[`unit${u.charAt(0).toUpperCase()}${u.slice(1)}`]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <input type="number" min="1" placeholder={`${s.newTempo} (${s[`unit${editTempoUnit.charAt(0).toUpperCase()}${editTempoUnit.slice(1)}`]}/${s.perDaySuffix})`}
                  value={newTempo} onChange={(e) => setNewTempo(e.target.value)}
                  className={`w-56 ${theme.card} rounded-xl px-3 py-2 text-sm outline-none`} />
                <button onClick={() => applyRecalc("datum")} className={`${theme.button} rounded-xl px-3 py-1.5 text-xs`}>{s.keepDate}</button>
                <button onClick={() => applyRecalc("tempo")} className={`${theme.button} rounded-xl px-3 py-1.5 text-xs`}>{s.keepTempo}</button>
              </div>
              {recalcMsg && <span className="text-xs text-green-500">{recalcMsg}</span>}
            </div>
          )}

          {!finished && (
            <div className={`${theme.cardSub} rounded-xl p-3 space-y-2`}>
              <p className={`text-xs font-semibold ${theme.muted}`}>{s.editGoals}</p>
              <div className="flex gap-2 items-center flex-wrap">
                <label className="text-xs">
                  <span className={theme.muted}>{s.targetLabel}</span>
                  <input type="date" value={editTargetDate} onChange={(e) => setEditTargetDate(e.target.value)}
                    className={`block mt-1 ${theme.card} rounded-xl px-3 py-2 text-sm outline-none`} />
                </label>
                <label className="text-xs">
                  <span className={theme.muted}>{s.timeNeededLabel}</span>
                  <input type="number" min="1" step="1" value={editMinutes} onChange={(e) => setEditMinutes(e.target.value)}
                    className={`block mt-1 w-32 ${theme.card} rounded-xl px-3 py-2 text-sm outline-none`} />
                </label>
                <button onClick={saveGoals} className={`${theme.button} rounded-xl px-3 py-1.5 text-xs self-end`}>{s.saveGoalsBtn}</button>
              </div>
              {goalsMsg && <span className="text-xs text-green-500">{goalsMsg}</span>}
            </div>
          )}

          {!finished && (
            <div className={`${theme.cardSub} rounded-xl p-3 space-y-2`}>
              <p className={`text-xs font-semibold ${theme.muted}`}>{s.editRestDays}</p>
              <p className={`text-xs ${theme.muted}`}>{s.restDaysHint}</p>
              <div className="flex gap-1.5 flex-wrap">
                {s.weekdayShort.map((label, idx) => {
                  const active = editRestWeekdays.includes(idx);
                  return (
                    <button key={idx} type="button" onClick={() => toggleRestWeekday(idx)}
                      className={`rounded-xl px-3.5 py-2 text-sm transition ${active ? theme.button : `${theme.card} ${theme.muted}`}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
              {restMsg && <span className="text-xs text-green-500">{restMsg}</span>}
            </div>
          )}

          {!finished && (
            <div className={`${theme.cardSub} rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap`}>
              <div>
                <p className="text-xs font-semibold">{s.updateWholePlan}</p>
                <p className={`text-[11px] ${theme.muted}`}>{s.updateWholePlanHint}</p>
              </div>
              <div className="flex items-center gap-2">
                {updatePlanMsg && <span className="text-xs text-green-500">{updatePlanMsg}</span>}
                <button onClick={updatePlanNow} className={`${theme.button} rounded-xl px-3 py-1.5 text-xs shrink-0`}>
                  {s.updateWholePlanBtn}
                </button>
              </div>
            </div>
          )}
        </div>

        {deviationPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className={`${theme.card} rounded-2xl p-5 max-w-sm w-full space-y-3`}>
              <p className="font-semibold">{deviationPrompt.type === "ahead" ? s.aheadTitle : s.behindTitle}</p>
              <p className={`text-sm ${theme.muted}`}>
                {(deviationPrompt.type === "ahead" ? s.aheadBody : s.behindBody).replace("{n}", Math.round(deviationPrompt.lines))}
                {" "}{s.deviationQuestion}
              </p>
              <div className="flex gap-2 justify-end flex-wrap">
                <button onClick={() => resolveDeviationPrompt(false)} className={`${theme.cardSub} ${theme.muted} rounded-xl px-4 py-2 text-sm`}>
                  {s.deviationKeep}
                </button>
                <button onClick={() => resolveDeviationPrompt(true)} className={`${theme.button} rounded-xl px-4 py-2 text-sm`}>
                  {s.deviationUpdate}
                </button>
              </div>
            </div>
          </div>
        )}

        {editorDate && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setEditorDate(null)}>
            <div className={`${theme.card} h-full w-full sm:w-[420px] overflow-y-auto p-4 space-y-4`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <p className="font-semibold flex items-center">
                  {s.dayEditorTitle}
                  <HelpTip text="Ovdje možeš ručno prilagoditi šta je planirano baš za ovaj dan, bez da mijenjaš cijeli plan — korisno za jednokratni izuzetak (npr. manje vremena taj dan)." />
                </p>
                <button onClick={() => setEditorDate(null)} className={`${theme.muted} text-2xl leading-none`}>×</button>
              </div>

              {/* traka svih dana ovog mjeseca - skrola se VODORAVNO (prstom/mišem),
                  klik na dan prebacuje koji se dan uređuje, panel ostaje otvoren */}
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${theme.muted}`}>{s.otherDaysLabel}</p>
                <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1"
                  style={{ scrollbarWidth: "thin" }}>
                  {monthlyPlan?.days?.map((d) => {
                    const wdIdx = new Date(d.date).getDay();
                    const active = d.date === editorDate;
                    const isToday = d.date === today;
                    return (
                      <button key={d.date} ref={active ? activeChipRef : null}
                        onClick={() => setEditorDate(d.date)}
                        className={`shrink-0 snap-center w-16 rounded-xl px-1.5 py-2 text-center text-[11px] transition ${active ? theme.button : theme.cardSub}`}>
                        <div className="font-semibold">{s.weekdayShort[wdIdx]}</div>
                        <div>{d.date.slice(8, 10)}.{d.date.slice(5, 7)}.</div>
                        <div className={`mt-1 text-sm ${active ? "" : theme.muted}`}>
                          {d.isRest ? "💤" : d.done ? "✓" : d.learning ? "•" : "—"}
                        </div>
                        {isToday && (
                          <div className={`mt-0.5 text-[9px] font-bold ${active ? "" : theme.accent}`}>{s.todayLabel}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {editorDay && (
                <div className="space-y-3">
                  <button onClick={() => toggleDayRest(editorDay.date)} className={`${theme.button} rounded-xl px-3 py-1.5 text-xs`}>
                    {editorDay.isRest ? s.toggleToLearn : s.toggleToRest}
                  </button>

                  {/* ── Planirano vs stvarno naučeno - čist, jasan pregled prije
                      slobodnog teksta ispod, tako da se odmah vidi šta je sistem
                      dodijelio za taj dan (stranica:red) i šta je zvanično upisano. ── */}
                  <div className={`${theme.cardSub} rounded-xl p-3 space-y-2 text-xs`}>
                    <div>
                      <p className={`font-semibold uppercase tracking-wider text-[10px] mb-1 ${theme.muted}`}>{s.dayPlannedLabel}</p>
                      {editorDay.isRest ? (
                        <p className={theme.muted}>{s.restDay}</p>
                      ) : editorDay.learning ? (
                        editorDay.learning.unit === "ajeti" ? (
                          <p className="font-mono">
                            {s.ajetPrefix} {editorDay.learning.fromKey} → {editorDay.learning.toKey}
                            {" · "}{s.dayPlannedAyahCount.replace("{n}", editorDay.learning.amount)}
                          </p>
                        ) : (
                          <p className="font-mono">
                            {s.dayPlannedRange
                              .replace("{a}", `${editorDay.learning.from.page}:${editorDay.learning.from.line}`)
                              .replace("{b}", `${editorDay.learning.to.page}:${editorDay.learning.to.line}`)}
                            {" · "}{s.dayPlannedLines.replace("{n}", editorDay.learning.lineCount)}
                          </p>
                        )
                      ) : (
                        <p className={theme.muted}>{s.dayPlannedNone}</p>
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold uppercase tracking-wider text-[10px] mb-1 ${theme.muted}`}>{s.dayActualLabel}</p>
                      {editorDay.done ? (
                        <p className="text-green-500 font-semibold">
                          {s.dayActualLines.replace("{n}", editorDay.actualLines ?? editorDay.learning?.lineCount ?? editorDay.learning?.amount ?? 0)}
                        </p>
                      ) : (
                        <p className={theme.muted}>{s.dayActualNone}</p>
                      )}
                    </div>
                    {(editorDay.done || editorDay.date < today) && !editorDay.isRest && (
                      <p className={`${theme.muted} opacity-80 leading-relaxed`}>{s.dayFrozenNote}</p>
                    )}
                  </div>

                  <label className="text-xs block">
                    <span className={theme.muted}>{s.todayEntryLabel}</span>
                    <input value={editorEntryText} onChange={(e) => setEditorEntryText(e.target.value)}
                      placeholder={s.todayEntryPh}
                      className={`block w-full mt-1 ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
                  </label>
                  <label className="text-xs block">
                    <span className={theme.muted}>{s.todayNoteLabel}</span>
                    <input value={editorNoteText} onChange={(e) => setEditorNoteText(e.target.value)}
                      className={`block w-full mt-1 ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
                  </label>
                  {!editorDay.done && (
                    <label className="text-xs block">
                      <span className={theme.muted}>{s.todayActualLabel}</span>
                      <input type="number" min="0" value={editorActualLines} onChange={(e) => setEditorActualLines(e.target.value)}
                        className={`block w-32 mt-1 ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
                      <span className={`block mt-1 ${theme.muted}`}>{s.todayActualHint}</span>
                    </label>
                  )}
                  <div className="flex gap-2">
                    <button onClick={saveEditorDay} disabled={editorSaving}
                      className={`${theme.button} rounded-xl px-4 py-2 text-xs font-semibold ${editorSaving ? "opacity-60" : ""}`}>
                      {editorSaving ? "…" : s.saveGoalsBtn}
                    </button>
                    <button onClick={() => setEditorDate(null)} className={`${theme.cardSub} ${theme.muted} rounded-xl px-4 py-2 text-xs`}>
                      {s.cancel}
                    </button>
                  </div>
                  {editorMsg && <p className="text-xs text-green-500">{editorMsg}</p>}
                  <p className={`text-[11px] leading-relaxed ${theme.muted} opacity-80`}>{s.trackerSyncHint}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {ym && (
          <div className="flex items-center justify-between">
            <button onClick={() => goMonth(-1)} disabled={!canGoPrev}
              className={`${theme.cardSub} ${theme.muted} rounded-xl px-3 py-1.5 text-sm disabled:opacity-40`}>
              {s.prevMonth}
            </button>
            <span className="font-semibold">{s.monthNames[ym.month - 1]} {ym.year}</span>
            <button onClick={() => goMonth(1)} disabled={finished}
              className={`${theme.cardSub} ${theme.muted} rounded-xl px-3 py-1.5 text-sm disabled:opacity-40`}>
              {s.nextMonth}
            </button>
          </div>
        )}

        {!finished && plan.state?.tempoUnit !== "ajeti" && (
          <p className={`text-[11px] leading-relaxed ${theme.muted} opacity-80 -mt-2`}>{s.pageLineHint}</p>
        )}

        {finished ? (
          <div className="rounded-xl bg-green-600/15 border border-green-600/40 text-green-500 text-sm font-semibold text-center py-4">
            {s.end}
          </div>
        ) : (
          <div className={`${theme.card} rounded-2xl divide-y ${theme.id === "beige_white" || theme.id === "pink_soft" ? "divide-black/10" : "divide-white/8"}`}>
            {monthlyPlan?.days?.map((d) => {
              const isToday = d.date === today;
              const wdIdx = new Date(d.date).getDay();
              return (
                <div key={d.date} className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${isToday ? theme.cardSub : ""}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs ${theme.muted} w-16 shrink-0`}>{s.weekdayShort[wdIdx]} {d.date.slice(8, 10)}.{d.date.slice(5, 7)}.</span>
                    {isToday && <span className={`text-[10px] font-bold ${theme.accent}`}>{s.todayLabel}</span>}
                  </div>
                  <div className="flex items-center gap-2 min-w-0 shrink-0">
                    <div className="text-right min-w-0">
                      {d.isRest ? (
                        <span className={theme.muted}>{s.restDay}</span>
                      ) : d.learning ? (
                        <span>
                          {d.learning.unit === "ajeti" ? (
                            <>
                              <span className={`text-[10px] mr-1 ${theme.muted}`}>{s.ajetPrefix}</span>
                              {d.learning.fromKey} → {d.learning.toKey}
                            </>
                          ) : (
                            <>
                              <span className={`text-[10px] mr-1 ${theme.muted}`}>{s.pageLinePrefix}</span>
                              {d.learning.from.page}:{d.learning.from.line} → {d.learning.to.page}:{d.learning.to.line}
                            </>
                          )}
                          {d.done && <span className="ml-2 text-green-500">{s.doneLabel}</span>}
                        </span>
                      ) : (
                        <span className={theme.muted}>—</span>
                      )}
                    </div>
                    <button onClick={() => openDayEditor(d.date)} className={`${theme.muted} text-xs shrink-0`}>
                      {s.editDay}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
