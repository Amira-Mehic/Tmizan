// ============================================================================
// Ta'lim čarobnjak - plan UČENJA novog gradiva (spojen na talim/planner.js)
//
// Korak 1: mushaf (13/15/16 redova)      Korak 2: opseg (Kur'an/džuz/sura/str.)
// Korak 3: kapacitet (redovi/stranice)   Korak 4: zaključaj datum ILI tempo
// Korak 5: metoda + smjer → PREGLED: raspored, ETA s oznakom tačnosti,
// vizuelni put do cilja, aktivacija (talim_plans + mjesečni plan za dashboard).
// Postojeći plan: promjena količine s preračunom (isti datum / isti tempo)
// i nadoknadom zaostatka.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import { useLang } from "../../../../context/LanguageContext";
import { useAuth } from "../../../../context/AuthContext";
import { supabase } from "../../../../services/SupaBaseClient";
import { useNavigate, Link } from "react-router-dom";
import { MUSHAF_EDITIONS, scopeToPages, tempoToLinesPerDay } from "../../../../features/talim/mushaf";
import { tempoForDate, dateForTempo, generateSchedule, dateCertainty } from "../../../../features/talim/planner";
import { ensureMonthlyPlan } from "../../../../features/talim/monthlyPlanService";
import { describeScope } from "../../../../features/talim/scopeLabel";
import { METHOD_INFO, METHOD_BLOG_SLUG } from "../../../../features/talim/methodInfo";
import { getEdition } from "../../../../features/talim/mushaf";
import { DIRECTIONS } from "../../../../features/talim/redom";
import { addDays } from "../../../../features/murajaah/engine";
import { todayStr, fmtDateTime, parsePageRanges } from "../../../../constants/hifz/helpers";
import { SURA_DATA } from "../../../../constants/hifz/SURA_DATA";
import HelpTip from "../../../../components/shared/HelpTip";

const WEEKDAYS = {
  bs: ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"], // indeks = Date.getDay()
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

// Parsira slobodan unos stranica: "5, 12, 40-45" → [5, 12, 40, 41, 42, 43, 44, 45]
const STR = {
  bs: {
    steps: ["Mushaf", "Šta učiš", "Cilj", "Kapacitet", "Vrijeme", "Metoda"],
    s1: "Korak 1 — Koje izdanje mushafa koristiš?",
    s1hint: "Broj redova po stranici određuje cijeli izračun plana.",
    s2: "Korak 2 — Šta se uči?",
    s2hint: "Možeš odabrati više opcija istovremeno (npr. 2 džuza + suru + raspon stranica) — kombinuju se u jedan opseg.",
    scope_cijeli: "Cijeli Kur'an", scope_dzuzevi: "Džuzevi", scope_sure: "Sure", scope_stranice: "Raspon stranica",
    dzuzeviPh: "npr. 30 ili 1,2,3", from: "Od stranice", to: "Do stranice", suraLabel: "Sura",
    suraSearchPh: "🔍 Pretraži suru po imenu ili broju…", suraSearchNoResults: "Nema sure koja odgovara pretrazi.",
    extraPagesLabel: "Ili dodaj pojedinačne stranice / raspone",
    extraPagesPh: "npr. 5, 12, 40-45",
    sCilj: "Korak 3 — Šta se zaključava?",
    lockTempo: "Znam tempo → izračunaj datum", lockDatum: "Znam datum → izračunaj tempo",
    lockDatumAjetiNote: "Kod ovog izbora tempo se uvijek računa u redovima/stranicama — ajeti nisu isti po dužini, pa se datum→tempo ne može pouzdano računati po broju ajeta.",
    targetDate: "Željeni datum završetka",
    unreal: "⚠ Nerealno za preporučeni maksimum ({max} redova/dan ≈ hizb).",
    suggestion: "Prijedlog: pomjeri datum na {date} ILI povećaj tempo na {tempo} red/dan — odluka je tvoja.",
    sKapacitet: "Korak 4 — Koliko realno možeš naučiti?",
    sKapacitetHint: "Ne u minutama — u redovima ili stranicama (red je svima ista mjera).",
    sKapacitetPeriodLabel: "1. Za koji period unosiš količinu?",
    sKapacitetAmountLabel: "2. Koliko možeš naučiti u tom periodu?",
    sKapacitetExample: "Npr.: sedmično mogu naučiti pola stranice → unesi 0,5 i odaberi „stranica“ i „sedmično“. Ili jednostavno izbroji redove i upiši taj broj.",
    sKapacitetFromDate: "Tempo se automatski računa iz datuma koji si odabrala/o u prethodnom koraku — ovdje nema šta da se unosi.",
    sKapacitetFromDateCaption: "Ovaj broj je izračunat na osnovu datuma koji si odabrala/o u prethodnom koraku.",
    unit_redovi: "redova", unit_stranice: "stranica", unit_ajeti: "ajeta", per_dan: "dnevno", per_sedmica: "sedmično", per_mjesec: "mjesečno",
    ajetiTempoNote: "Napredak i raspored idu TAČNO po broju ajeta, neovisno o tome koliko koji ajet ima redova. Procijenjeni datum završetka je i dalje samo okviran.",
    sVrijeme: "Korak 5 — Koliko vremena ti treba da naučiš tu količinu?",
    sVrijemeHint: "Ukoliko ne znaš tačno vrijeme, bilo bi dobro izmjeriti radi lakšeg planiranja.",
    sVrijemeUsageNote: "Ovo vrijeme se koristi isključivo za tajmer u dnevnoj sesiji učenja — kad počneš učiti, tajmer odbrojava tačno ovoliko minuta, da možeš pratiti trajanje svoje sesije. Ne utiče ni na šta drugo (ni na tempo, ni na datum završetka). Kasnije ga možeš promijeniti u Rasporedu, bez potrebe da praviš novi plan.",
    minutesUnit: "minuta",
    sMetoda: "Korak 6 — Metoda i smjer učenja",
    directionNotApplicable: "Jednostavno učiš redom, stranicu po stranicu, od početka do kraja odabranog dijela.",
    m_postepeno: "Postepeno nadograđivanje (20×)", m_redom: "Redom kroz mushaf",
    m_krugovi: "Bosanska metoda krugova", m_halka: "Halka / uz muallima",
    reps: "Broj ponavljanja po ajetu",
    restDaysLabel: "Kojim danima u sedmici NE učiš (pauza)?",
    restDaysHint: "Ti dani se preskaču za novo učenje — gradivo se raspoređuje samo na preostale dane. Ovo važi za svaki mjesec dok ne promijeniš. Ponavljanje (murajaa) se planira neovisno od učenja — nastavlja se po svom rasporedu i na dane pauze.",
    preview: "Pregled plana", totalLines: "Ukupno redova", perDay: "Tempo", eta: "Procijenjeni završetak",
    cert_tacan: "TAČAN datum", cert_procjena: "PROCJENA", cert_okviran: "OKVIRAN",
    certHelp: "Oznaka pouzdanosti datuma završetka: TAČAN (ti kontrolišeš tempo — najsigurnije), PROCJENA (zavisi od tvog napretka kroz potvrde), OKVIRAN (zavisi najviše od drugih — npr. muallima kod Halke).",
    lockHelp: "Biraš šta je fiksno: 'Znam tempo' — ti određuješ koliko učiš dnevno, sistem izračuna kad ćeš završiti. 'Znam datum' — ti određuješ do kad želiš završiti, sistem izračuna potreban tempo.",
    path: "Put do cilja", firstDays: "Prvih 7 dana",
    fullSchedule: "📅 Pogledaj puni raspored dan-po-dan →",
    activate: "Aktiviraj plan učenja", activated: "✓ Plan aktiviran — vidi ga na dashboardu i u mjesečnom planu",
    next: "Dalje →", back: "← Nazad",
    existing: "Aktivni plan učenja", change: "Promijeni dnevnu količinu",
    viewDetails: "Vidi detalje →",
    scopeLabel: "Cilj", learnPrefix: "Naučiti", dailyGoalLabel: "Dnevni cilj", timeNeededLabel: "Dnevno vrijeme potrebno", perDayUnit: "red/dan",
    principleLabel: "Uči se po", perDaySuffix: "dan",
    createdLabel: "Datum kreiranja", createdShort: "kreiran",
    pastPlansTitle: "Prošli planovi učenja",
    statusDone: "Završen", statusScheduled: "Zakazan", statusPaused: "Pauziran / zamijenjen",
    keepDate: "Zadrži isti datum (novi tempo)", keepTempo: "Zadrži novi tempo (pomjeri datum)",
    newTempo: "Novi tempo (redova/dan)", applied: "Preračunato ✓",
    catchup: "Zaostatak: {n} redova — raspoređeno na sljedećih {d} dana: +{e} red/dan",
    deactivate: "Deaktiviraj plan",
    readMore: "Pročitaj više →",
    editPlanBtn: "Uredi", archiveBtn: "Arhiviraj", unarchiveBtn: "Vrati iz arhive", deleteBtn: "Obriši",
    confirmDeleteMsg: "Sigurno obrisati? Ne može se vratiti.", confirmYes: "Da, obriši", confirmNo: "Odustani",
    showArchivedToggle: "Prikaži arhivirane", showActiveToggle: "← Nazad na historiju",
    noArchived: "Nema arhiviranih planova.",
    noPastPlans: "Nema prošlih planova učenja.",
    archiveHeading: "Arhiva planova učenja",
    generateNewPlan: "+ Generiši novi plan", backToList: "← Nazad na listu planova",
    editingPlanLabel: "Uređuješ", newPlanLabel: "Novi plan", planWord: "Plan",
  },
  en: {
    steps: ["Mushaf", "Scope", "Goal", "Capacity", "Time", "Method"],
    s1: "Step 1 — Which mushaf edition do you use?",
    s1hint: "Lines per page determine the entire plan calculation.",
    s2: "Step 2 — What are you learning?",
    s2hint: "You can select more than one at the same time (e.g. 2 juz + a surah + a page range) — they combine into one scope.",
    scope_cijeli: "Whole Qur'an", scope_dzuzevi: "Ajza", scope_sure: "Surahs", scope_stranice: "Page range",
    dzuzeviPh: "e.g. 30 or 1,2,3", from: "From page", to: "To page", suraLabel: "Surah",
    suraSearchPh: "🔍 Search surah by name or number…", suraSearchNoResults: "No matching surahs.",
    extraPagesLabel: "Or add individual pages / ranges",
    extraPagesPh: "e.g. 5, 12, 40-45",
    sCilj: "Step 3 — What is locked?",
    lockTempo: "I know my pace → compute the date", lockDatum: "I know the date → compute the pace",
    lockDatumAjetiNote: "With this option the pace is always computed in lines/pages — ayahs aren't equal in length, so date→pace can't be reliably computed by ayah count.",
    targetDate: "Desired finish date",
    unreal: "⚠ Unrealistic vs. recommended max ({max} lines/day ≈ one hizb).",
    suggestion: "Suggestion: move the date to {date} OR raise the pace to {tempo} lines/day — your call.",
    sKapacitet: "Step 4 — How much can you realistically learn?",
    sKapacitetHint: "Not in minutes — in lines or pages (a line is the same measure for everyone).",
    sKapacitetPeriodLabel: "1. Which period are you entering the amount for?",
    sKapacitetAmountLabel: "2. How much can you learn in that period?",
    sKapacitetExample: "E.g.: I can learn half a page per week → enter 0.5 and choose “pages” and “per week”. Or just count the lines and type that number.",
    sKapacitetFromDate: "The pace is computed automatically from the date you picked in the previous step — nothing to enter here.",
    sKapacitetFromDateCaption: "This number is calculated based on the date you picked in the previous step.",
    unit_redovi: "lines", unit_stranice: "pages", unit_ajeti: "ayahs", per_dan: "per day", per_sedmica: "per week", per_mjesec: "per month",
    ajetiTempoNote: "Progress and the schedule follow the EXACT ayah count, regardless of how many lines each ayah takes. The estimated finish date is still just a rough estimate.",
    sVrijeme: "Step 5 — How much time do you need to learn that amount?",
    sVrijemeHint: "If you don't know the exact time, it would help to measure it for easier planning.",
    sVrijemeUsageNote: "This time is used only for the timer in your daily learning session — once you start learning, the timer counts down exactly this many minutes, so you can track how long your session lasts. It doesn't affect anything else (not the pace, not the finish date). You can change it later in the Schedule, no need to make a new plan.",
    minutesUnit: "minutes",
    sMetoda: "Step 6 — Learning method and direction",
    directionNotApplicable: "You simply go page by page, from the start to the end of what you selected.",
    m_postepeno: "Gradual building (20×)", m_redom: "In order through the mushaf",
    m_krugovi: "Bosnian circles method", m_halka: "Halaqa / with a muallim",
    reps: "Repetitions per ayah",
    restDaysLabel: "Which days of the week do you NOT study (rest)?",
    restDaysHint: "Those days are skipped for new learning — material is spread only across the remaining days. This applies every month until you change it. Review (murajaa) is planned independently of new learning — it keeps its own schedule, even on rest days.",
    preview: "Plan preview", totalLines: "Total lines", perDay: "Pace", eta: "Estimated finish",
    cert_tacan: "EXACT date", cert_procjena: "ESTIMATE", cert_okviran: "APPROXIMATE",
    certHelp: "How reliable the finish date is: EXACT (you control the pace — most reliable), ESTIMATE (depends on how fast you pass confirmations), APPROXIMATE (depends mostly on someone else — e.g. the muallim with Halaqa).",
    lockHelp: "Choose what's fixed: 'I know my pace' — you set how much you learn daily, the system computes when you'll finish. 'I know the date' — you set the target date, the system computes the needed pace.",
    path: "Path to the goal", firstDays: "First 7 days",
    fullSchedule: "📅 View the full day-by-day schedule →",
    activate: "Activate learning plan", activated: "✓ Plan activated — see it on the dashboard and monthly plan",
    next: "Next →", back: "← Back",
    existing: "Active learning plan", change: "Change daily amount",
    viewDetails: "View details →",
    scopeLabel: "Goal", learnPrefix: "Learn", dailyGoalLabel: "Daily goal", timeNeededLabel: "Daily time needed", perDayUnit: "lines/day",
    principleLabel: "Learning by", perDaySuffix: "day",
    createdLabel: "Created on", createdShort: "created",
    pastPlansTitle: "Past learning plans",
    statusDone: "Completed", statusScheduled: "Scheduled", statusPaused: "Paused / replaced",
    keepDate: "Keep the date (new pace)", keepTempo: "Keep the new pace (move the date)",
    newTempo: "New pace (lines/day)", applied: "Recalculated ✓",
    catchup: "Backlog: {n} lines — spread over the next {d} days: +{e} lines/day",
    deactivate: "Deactivate plan",
    readMore: "Read more →",
    editPlanBtn: "Edit", archiveBtn: "Archive", unarchiveBtn: "Restore from archive", deleteBtn: "Delete",
    confirmDeleteMsg: "Delete for good? This can't be undone.", confirmYes: "Yes, delete", confirmNo: "Cancel",
    showArchivedToggle: "Show archived", showActiveToggle: "← Back to history",
    noArchived: "No archived plans.",
    noPastPlans: "No past learning plans.",
    archiveHeading: "Learning plan archive",
    generateNewPlan: "+ Generate new plan", backToList: "← Back to plan list",
    editingPlanLabel: "Editing", newPlanLabel: "New plan", planWord: "Plan",
  },
};

const CERT_STIL = { tacan: "bg-green-600", procjena: "bg-amber-500", okviran: "bg-sky-500" };

// Čitljiv opis dnevnog cilja NA JEDINICI KOJU JE KORISNIK STVARNO ODABRAO -
// "5 ajeta/dan", "1 stranica/dan" ili "12 redova/dan" - umjesto da se uvijek
// prikazuje interno preračunati lines_per_day (koji za ajete/stranice ne
// odgovara direktno onome što je korisnik unio). Koristi se i u sažetku prije
// aktivacije i u prikazu već aktivnog/prošlih planova, da princip učenja bude
// vidljiv na jednom mjestu, ne samo dok se sam bira u koraku "Kapacitet".
function dailyGoalText(planLike, s) {
  const unit = planLike?.state?.tempoUnit || "redovi";
  if (unit === "ajeti") {
    const n = planLike?.state?.ajetiPerDay || 0;
    return `${Math.round(n * 10) / 10} ${s.unit_ajeti}/${s.perDaySuffix}`;
  }
  if (unit === "stranice") {
    const lpp = MUSHAF_EDITIONS[planLike?.mushaf_edition]?.linesPerPage || 15;
    const pagesPerDay = (planLike?.lines_per_day || 0) / lpp;
    return `${Math.round(pagesPerDay * 100) / 100} ${s.unit_stranice}/${s.perDaySuffix}`;
  }
  return `${Math.round((planLike?.lines_per_day || 0) * 10) / 10} ${s.unit_redovi}/${s.perDaySuffix}`;
}

export default function TalimWizard() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const s = STR[lang] || STR.bs;
  const wd = WEEKDAYS[lang] || WEEKDAYS.bs;
  const today = todayStr();

  const [step, setStep] = useState(1);
  const [edition, setEdition] = useState("");        // korak 1: ništa nije unaprijed odabrano
  const [scopeTypes, setScopeTypes] = useState([]);  // korak 2: može biti više odjednom (dzuzevi+sure+stranice)
  const [dzuzeviText, setDzuzeviText] = useState("");
  const [sure, setSure] = useState([]);
  const [suraSearch, setSuraSearch] = useState("");
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(20);
  const [extraPagesText, setExtraPagesText] = useState("");
  const [amount, setAmount] = useState("");          // korak 3: mora se unijeti
  const [tempoUnit, setTempoUnit] = useState("redovi");
  const [per, setPer] = useState("dan");
  const [minutesNeeded, setMinutesNeeded] = useState(""); // koliko vremena treba za tu količinu (informativno)
  const [lock, setLock] = useState("tempo");
  const [targetDate, setTargetDate] = useState(addDays(todayStr(), 30));
  const [method, setMethod] = useState("postepeno");
  const [direction, setDirection] = useState("od_pocetka");
  const [reps, setReps] = useState(20);
  const [restWeekdays, setRestWeekdays] = useState([]); // dani pauze, Date.getDay() indeksi
  const [activated, setActivated] = useState(false);
  const [saving, setSaving] = useState(false);

  // SVI trenutno aktivni planovi (može ih biti više - pravila su opisana uz activate()
  // niže: "cijeli" plan je uvijek sam, sura/džuz/raspon planovi mogu koegzistirati)
  // + historija neaktivnih planova (završeni / zakazani za budući datum / pauzirani)
  const [activePlans, setActivePlans] = useState([]);
  const [pastPlans, setPastPlans] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Wizard je podrazumijevano zatvoren - vidi se samo lista aktivnog plana i
  // historija ispod. Otvara se klikom na "Generiši novi plan" (novi, prazan
  // plan) ili "Uredi" (postojeći plan, editingPlanId prati koji tačno).
  const [wizardMode, setWizardMode] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);

  const loadExisting = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from("talim_plans").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      const rows = data || [];
      setActivePlans(rows.filter((r) => r.active));
      setPastPlans(rows.filter((r) => !r.active));
    } catch { setActivePlans([]); setPastPlans([]); }
  }, [user]);

  // Status prošlog plana - schema nema poseban "status" stub, pa se izvodi iz
  // postojećih polja: završen (dostigao ukupan broj redova), zakazan (start_date
  // je u budućnosti) ili pauziran/zamijenjen (sve ostalo neaktivno).
  const planStatus = (p) => {
    let totalLinesP = 0;
    try {
      const pagesP = scopeToPages(p.scope_data);
      totalLinesP = pagesP.length * getEdition(p.mushaf_edition).linesPerPage;
    } catch { totalLinesP = 0; }
    if (totalLinesP > 0 && (p.learned_lines || 0) >= totalLinesP) return { label: s.statusDone, cls: "bg-green-600" };
    if (p.start_date > today) return { label: s.statusScheduled, cls: "bg-sky-500" };
    return { label: s.statusPaused, cls: "bg-amber-500" };
  };

  // loadExisting() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadExisting(); }, [loadExisting]);

  // "Generiši novi plan" - otvara čarobnjak praznog stanja (ne uređivanje
  // postojećeg), koristi iste podrazumijevane vrijednosti kao početni useState.
  const startNewPlan = () => {
    setEdition("");
    setScopeTypes([]);
    setDzuzeviText("");
    setSure([]);
    setFromPage(1);
    setToPage(20);
    setExtraPagesText("");
    setAmount("");
    setTempoUnit("redovi");
    setPer("dan");
    setMinutesNeeded("");
    setLock("tempo");
    setTargetDate(addDays(todayStr(), 30));
    setMethod("postepeno");
    setDirection("od_pocetka");
    setReps(20);
    setRestWeekdays([]);
    setActivated(false);
    setStep(1);
    setEditingPlanId(null);
    setWizardMode(true);
  };

  const closeWizard = () => setWizardMode(false);

  const archivePlan = async (p) => {
    try {
      await supabase.from("talim_plans").update({
        state: { ...(p.state || {}), archived: true }, updated_at: new Date().toISOString(),
      }).eq("id", p.id);
      loadExisting();
    } catch { /* ignorisano */ }
  };

  const unarchivePlan = async (p) => {
    try {
      const newState = { ...(p.state || {}) };
      delete newState.archived;
      await supabase.from("talim_plans").update({
        state: newState, updated_at: new Date().toISOString(),
      }).eq("id", p.id);
      loadExisting();
    } catch { /* ignorisano */ }
  };

  const deletePlan = async (id) => {
    try {
      await supabase.from("talim_plans").delete().eq("id", id);
      setConfirmDeleteId(null);
      loadExisting();
    } catch { /* ignorisano */ }
  };

  // "Cijeli Kur'an" je isključiv (pokriva sve); ostala tri se mogu kombinovati
  const toggleScopeType = (t) => {
    setScopeTypes((prev) => {
      if (t === "cijeli") return prev.includes("cijeli") ? [] : ["cijeli"];
      const bezCijelog = prev.filter((x) => x !== "cijeli");
      return bezCijelog.includes(t) ? bezCijelog.filter((x) => x !== t) : [...bezCijelog, t];
    });
  };

  // ── izračuni ──
  const scope = (() => {
    try {
      if (scopeTypes.includes("cijeli")) return { type: "cijeli" };

      const parts = [];
      if (scopeTypes.includes("dzuzevi")) {
        // dedup + sortiraj - tekstualni unos (ili ponovno popunjavanje pri
        // uređivanju) lako proizvede duple brojeve (npr. "3, 4, 3")
        const dz = [...new Set(dzuzeviText.split(/[,\s]+/).filter(Boolean).map(Number))].sort((a, b) => a - b);
        if (dz.length) parts.push({ type: "dzuzevi", dzuzevi: dz });
      }
      if (scopeTypes.includes("sure") && sure.length) {
        parts.push({ type: "sure", sure });
      }
      if (scopeTypes.includes("stranice")) {
        const from = Number(fromPage), to = Number(toPage);
        if (from && to) parts.push({ type: "stranice", from, to, extra: parsePageRanges(extraPagesText) });
      }
      if (!parts.length) return null;
      // jedan tip → zadrži jednostavan (stari) oblik; više tipova → kombinovano
      return parts.length === 1 ? parts[0] : { type: "kombinovano", parts };
    } catch { return null; }
  })();

  let pages = [];
  try { pages = scope ? scopeToPages(scope) : []; } catch { pages = []; }
  const linesPerPage = MUSHAF_EDITIONS[edition]?.linesPerPage || 0;
  const totalLines = pages.length * linesPerPage;

  // "ajeti" je jedinica kojom STVARNI raspored/napredak ide (generateMonthlyPlanByAyahs
  // broji tačno po ajetu) - ali lines_per_day kolona u bazi je NOT NULL (koristi je
  // procjena datuma i ostatak wizard-a), pa se ovdje samo GRUBO procjenjuje ekvivalent
  // u redovima preko prosjeka cijelog mushafa (9060 redova / 6236 ajeta ≈ 1.45 r/ajet
  // za 15-redno izdanje) - ne utiče na tačnost stvarnog rasporeda, samo na estimate.
  const AVG_AYAHS_TOTAL = 6236;
  const totalLinesWholeQuran = 604 * (MUSHAF_EDITIONS[edition]?.linesPerPage || 15);
  const avgLinesPerAyah = totalLinesWholeQuran / AVG_AYAHS_TOTAL;

  let linesPerDay = 0;
  let ajetiPerDay = 0;
  if (tempoUnit === "ajeti") {
    ajetiPerDay = Number(amount) || 0;
    const perDayAyahs = per === "sedmica" ? ajetiPerDay / 7 : per === "mjesec" ? ajetiPerDay / 30 : ajetiPerDay;
    linesPerDay = perDayAyahs * avgLinesPerAyah;
  } else {
    try { linesPerDay = tempoToLinesPerDay({ amount: Number(amount), unit: tempoUnit, per }, edition); } catch { linesPerDay = 0; }
  }

  // korak 4: datum→tempo ili tempo→datum
  let lockInfo = null;
  try {
    if (lock === "datum") {
      lockInfo = tempoForDate({ totalLines, startDate: today, targetDate, editionId: edition, restWeekdays });
      linesPerDay = lockInfo.linesPerDay;
    } else if (linesPerDay > 0) {
      lockInfo = dateForTempo({ totalLines, linesPerDay, startDate: today, restWeekdays });
    }
  } catch { lockInfo = null; }

  const endDate = lock === "datum" ? targetDate : lockInfo?.endDate;

  // Sigurnosna kočnica (ne oslanjati se samo na UI/reset u koraku 3): "znam
  // datum → izračunaj tempo" NIKAD ne smije spasiti plan kao "ajeti" tempo -
  // linesPerDay je u toj grani uvijek izračunat iz PRAVOG datuma (tempoForDate),
  // ne iz ajetiPerDay, pa bi "ajeti" oznaka ovdje bila lažna/nedosljedna.
  const effectiveTempoUnit = lock === "datum" && tempoUnit === "ajeti" ? "redovi" : tempoUnit;

  // "Bosanska metoda krugova" motor (krugovi.js) uvijek radi sa svih 30 džuzeva
  // cijelog mushafa - nema pojma o odabranom opsegu. Zato ima smisla SAMO kad je
  // opseg cijeli Kur'an; za suru/džuz/raspon bi "krug" bio besmislen (učenje bi
  // se odnosilo na cijeli Kur'an, ne na ono što je korisnik zapravo odabrao).
  const methodOptions = scope?.type === "cijeli"
    ? ["postepeno", "redom", "krugovi", "halka"]
    : ["postepeno", "redom", "halka"];
  const effectiveMethod = methodOptions.includes(method) ? method : "postepeno";
  const selectedMethodInfo = (METHOD_INFO[lang] || METHOD_INFO.bs)[effectiveMethod];
  const cert = dateCertainty(effectiveMethod);
  // Smjer ima smisla samo za cijeli Kur'an (bira se redoslijed kroz CIJELI
  // mushaf) - za bilo koji uži opseg (sura, džuz, raspon) učenje ide prirodnim
  // redoslijedom stranica tog opsega, bez obzira šta je ranije ostalo odabrano.
  const effectiveDirection = scope?.type === "cijeli" ? direction : "od_pocetka";

  // pregled: prvih 7 dana rasporeda
  let firstWeek = [];
  try {
    if (pages.length && linesPerDay > 0) {
      firstWeek = generateSchedule({ pages, editionId: edition, linesPerDay, startDate: today, restWeekdays }).schedule.slice(0, 7);
    }
  } catch { firstWeek = []; }

  // ── aktivacija ──
  const activate = async () => {
    if (!user?.id || !pages.length || linesPerDay <= 0) return;
    setSaving(true);
    try {
      // DB kolona scope_type dozvoljava samo 'cijeli'/'dzuzevi'/'sure'/'stranice' (CHECK
      // constraint) - kad je opseg kombinovan, kolona nosi prvi odabrani tip kao
      // orijentir, a stvarna (kombinovana) struktura je u scope_data.type = "kombinovano"
      const scopeTypeCol = scope?.type === "kombinovano" ? (scopeTypes[0] || "stranice") : scope?.type;

      // Više planova može biti istovremeno aktivno - I "cijeli Kur'an" plan stoji
      // zajedno sa sura/džuz/stranice planovima. Jedino pravilo: među "cijeli"
      // planovima smije postojati SAMO JEDAN aktivan odjednom (cijeli Kur'an se ne
      // uči dva puta paralelno) - zato NOVI "cijeli" plan gasi STARI "cijeli" plan,
      // ali nikad ne dira sura/džuz planove. Novi sura/džuz plan ne gasi ništa tuđe.
      // Ako se ovim postupkom UREĐUJE postojeći plan (editingPlanId), taj konkretan
      // (stari) red se uvijek gasi - uređivanje ne smije ostaviti dva paralelna
      // zapisa iste namjere.
      if (scopeTypeCol === "cijeli") {
        await supabase.from("talim_plans").update({ active: false })
          .eq("user_id", user.id).eq("active", true).eq("scope_type", "cijeli");
      }
      if (editingPlanId) {
        await supabase.from("talim_plans").update({ active: false }).eq("id", editingPlanId);
      }

      const { data: inserted } = await supabase.from("talim_plans").insert({
        user_id: user.id, mushaf_edition: edition,
        scope_type: scopeTypeCol, scope_data: scope,
        lines_per_day: linesPerDay, lock_type: lock,
        start_date: today, target_date: endDate || null,
        date_certainty: cert, method: effectiveMethod, direction: effectiveDirection, reps_target: reps,
        state: {
          restWeekdays, minutesNeeded: Number(minutesNeeded) || null,
          tempoUnit: effectiveTempoUnit, ajetiPerDay: effectiveTempoUnit === "ajeti" ? ajetiPerDay : null,
        }, learned_lines: 0, active: true,
      }).select().single();

      // mjesečni plan tekućeg mjeseca → dashboard "danas učiš"; naredni mjeseci
      // se generišu automatski (rollover) kad dashboard/hub dođe do njih
      if (inserted) {
        const d = new Date();
        await ensureMonthlyPlan(user.id, inserted, d.getFullYear(), d.getMonth() + 1);
      }
      setActivated(true);
      loadExisting();
    } catch (e) { console.error("talim activate:", e); }
    setSaving(false);
  };

  const stepOk = [
    true,
    !!edition,                                       // 1→2: mora biti odabran mushaf
    pages.length > 0,                                 // 2→3: mora biti odabran i validan opseg
    lock === "tempo" || (lock === "datum" && !!targetDate), // 3→4: cilj mora biti odabran (i datum ako je "znam datum")
    lock === "datum" || linesPerDay > 0,               // 4→5: ako je tempo zaključan, mora biti unesena količina/period
    true,                                              // Korak 5 na 6: vrijeme je informativan podatak, plan se pravi i bez njega.
  ];

  // Najdalji korak do kojeg se smije doći - sve prije mora biti popunjeno.
  // Blokira i "Dalje" i preskakanje klikom na kasniji korak.
  let maxReachable = 6;
  for (let i = 1; i <= 5; i++) {
    if (!stepOk[i]) { maxReachable = i; break; }
  }

  const inp = `${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`;
  const pill = (active) => `rounded-xl px-3.5 py-2 text-sm transition ${active ? theme.button : `${theme.cardSub} ${theme.muted}`}`;

  // "Prikaži arhivirane" prebacuje listu historije: podrazumijevano se vide
  // samo NEarhivirani planovi (arhivirani se sklone s puta), toggle prikaže
  // isključivo arhivirane.
  const visiblePastPlans = pastPlans.filter((p) => !!p.state?.archived === showArchived);
  const archivedCount = pastPlans.filter((p) => p.state?.archived).length;

  // Redni broj plana (#1, #2…) - po redoslijedu kreiranja, računato preko SVIH
  // planova (aktivni + historija), da broj ostane isti bez obzira da li je
  // plan trenutno aktivan, arhiviran ili pauziran.
  const planNumberMap = (() => {
    const all = [...pastPlans, ...activePlans]
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const map = {};
    all.forEach((p, i) => { map[p.id] = i + 1; });
    return map;
  })();
  const totalPlanCount = pastPlans.length + activePlans.length;

  return (
    <div className="space-y-5">

      {/* ── Podrazumijevani prikaz (wizard zatvoren): aktivni plan + dugme za
          novi + historija ispod. Wizard se otvara SAMO klikom na "Generiši
          novi plan" ili "Uredi" - ne stoji uvijek otvoren. ── */}
      {!wizardMode && (
        <>
          {/* ── Aktivni planovi (može ih biti više - svaki sura/džuz plan svoja
              kartica; "cijeli Kur'an" je uvijek sam) - uređivanje je na "Vidi detalje" ── */}
          {activePlans.map((plan) => {
            const isLightCard = theme?.id === "beige_white";
            const dividerClass = isLightCard ? "divide-black/10" : "divide-white/10";
            const borderClass = isLightCard ? "border-black/10" : "border-white/10";
            // Cilj (opis opsega) izdvojen iz reda statistika - može biti dugačak
            // (kombinovani opseg: džuzevi + sure + stranice), pa ide u svoj red
            // PREKO cijele širine, bez skraćivanja (bez "truncate").
            const goalStat = { label: s.scopeLabel, value: plan.scope_data ? `${s.learnPrefix} ${describeScope(plan.scope_data, lang)}` : "—" };
            const stats = [
              { label: s.dailyGoalLabel, value: dailyGoalText(plan, s) },
              ...(plan.state?.minutesNeeded ? [{ label: s.timeNeededLabel, value: `${plan.state.minutesNeeded} ${s.minutesUnit}` }] : []),
              { label: s.eta, value: plan.target_date || "?" },
              ...(plan.created_at ? [{ label: s.createdLabel, value: fmtDateTime(plan.created_at) }] : []),
            ];
            return (
              <div key={plan.id} className={`${theme.cardSub} rounded-2xl overflow-hidden`}>
                {/* Traka u zaglavlju - kontrastna nijansa u odnosu na tijelo kartice */}
                <div className={`flex items-center justify-between gap-2 px-5 py-3.5 ${theme.card}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">📖</span>
                    <h3 className="font-semibold text-sm">{s.existing}</h3>
                    <span className={`font-mono text-[11px] ${theme.muted}`}>#{planNumberMap[plan.id]}</span>
                  </div>
                  <span className="inline-flex items-center">
                    <span className={`text-[10px] font-bold uppercase tracking-wide text-white px-2.5 py-1 rounded-full flex-shrink-0 ${CERT_STIL[plan.date_certainty] || "bg-gray-500"}`}>
                      {s[`cert_${plan.date_certainty}`]}
                    </span>
                    <HelpTip text={s.certHelp} />
                  </span>
                </div>

                {/* Cilj - puna širina, bez skraćivanja, da se cijeli (i kombinovani) opis vidi */}
                <div className={`px-5 pt-4 pb-3 border-b ${borderClass}`}>
                  <p className={`text-[10px] uppercase tracking-wide mb-1 ${theme.muted}`}>{goalStat.label}</p>
                  <p className="text-sm font-semibold break-words">{goalStat.value}</p>
                </div>

                {/* Ostale statistike - odvojene vertikalnim linijama, u nizu (bez pločica) */}
                <div className={`flex flex-wrap divide-x ${dividerClass} px-5 py-4`}>
                  {stats.map((st, i) => (
                    <div key={i} className={`flex-1 min-w-[45%] sm:min-w-[120px] ${i > 0 ? "pl-4" : ""} ${i < stats.length - 1 ? "pr-4" : ""} mb-2 sm:mb-0`}>
                      <p className={`text-[10px] uppercase tracking-wide mb-1 ${theme.muted}`}>{st.label}</p>
                      <p className="text-sm font-semibold truncate">{st.value}</p>
                    </div>
                  ))}
                </div>

                <div className="px-5 pb-4">
                  <button onClick={() => navigate(`/korisnik/hifz/raspored?plan=${plan.id}`)}
                    className={`group text-xs font-semibold inline-flex items-center gap-1 ${theme.accent}`}>
                    {s.viewDetails.replace(/\s*→\s*$/, "")}
                    <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
                  </button>
                </div>
              </div>
            );
          })}

          <button onClick={startNewPlan}
            className={`${theme.card} ${theme.accent} rounded-2xl px-4 py-3 text-sm font-semibold w-full sm:w-auto`}>
            {s.generateNewPlan}
          </button>
        </>
      )}

      {/* ── Koraci (wizard) - vidljivo samo dok je wizardMode uključen ── */}
      {/* Kad je zaključan datum (znam datum → izračunaj tempo), korak "Vrijeme"
          (5) se preskače: tempo tada nije nešto što je korisnik sam procijenio,
          nego ga sistem računa iz datuma, pa pitanje "koliko vremena ti treba
          za tu količinu" nema smisla. Redni brojevi na pilulama se prilagode
          da ne postoji rupa (1,2,3,4,5 umjesto 1,2,3,4,6). */}
      {wizardMode && (
      <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className={`text-sm font-semibold ${theme.accent}`}>
          {editingPlanId ? `${s.editingPlanLabel} — ${s.planWord} #${planNumberMap[editingPlanId] ?? "?"}` : `${s.newPlanLabel} — ${s.planWord} #${totalPlanCount + 1}`}
        </span>
        <button onClick={closeWizard} className={`text-xs ${theme.muted}`}>{s.backToList}</button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {s.steps
          .map((label, i) => ({ label, num: i + 1 }))
          .filter(({ num }) => !(num === 5 && lock === "datum"))
          .map(({ label, num }, idx) => {
            const zakljucan = num > maxReachable;
            return (
              <button key={num} onClick={() => !zakljucan && setStep(num)} disabled={zakljucan}
                className={`text-xs px-3 py-1.5 rounded-full transition
                  ${step === num ? theme.button : `${theme.cardSub} ${theme.muted}`}
                  ${zakljucan ? "opacity-40 cursor-not-allowed" : ""}`}>
                {idx + 1}. {label}
              </button>
            );
          })}
      </div>

      <div className={`${theme.card} rounded-2xl p-4 space-y-4`}>
        {step === 1 && (
          <>
            <h3 className="font-semibold">{s.s1}</h3>
            <p className={`text-xs ${theme.muted}`}>{s.s1hint}</p>
            <div className="flex gap-2 flex-wrap">
              {Object.values(MUSHAF_EDITIONS).map((e) => (
                <button key={e.id} onClick={() => setEdition(e.id)} className={pill(edition === e.id)}>
                  {e.naziv}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="font-semibold">{s.s2}</h3>
            <p className={`text-xs ${theme.muted}`}>{s.s2hint}</p>
            <div className="flex gap-2 flex-wrap">
              {["cijeli", "dzuzevi", "sure", "stranice"].map((t) => (
                <button key={t} onClick={() => toggleScopeType(t)} className={pill(scopeTypes.includes(t))}>
                  {s[`scope_${t}`]}
                </button>
              ))}
            </div>
            {scopeTypes.includes("dzuzevi") && (
              <input value={dzuzeviText} onChange={(e) => setDzuzeviText(e.target.value)} placeholder={s.dzuzeviPh} className={`w-full ${inp}`} />
            )}
            {scopeTypes.includes("sure") && (
              <>
                <input value={suraSearch} onChange={(e) => setSuraSearch(e.target.value)}
                  placeholder={s.suraSearchPh} className={`w-full ${inp}`} />
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 rounded-xl [&::-webkit-scrollbar]:hidden">
                  {SURA_DATA
                    .filter((su) => {
                      const q = suraSearch.trim().toLowerCase();
                      if (!q) return true;
                      return su.name.toLowerCase().includes(q) || String(su.id) === q;
                    })
                    .map((su) => {
                      const active = sure.includes(su.id);
                      return (
                        <button key={su.id} type="button"
                          onClick={() => setSure((prev) => active ? prev.filter((id) => id !== su.id) : [...prev, su.id])}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150
                            ${active ? theme.button : `${theme.cardSub} ${theme.muted} hover:opacity-80`}`}>
                          <span className="font-medium">{su.id}. {su.name}</span>
                          {active && <span>✓</span>}
                        </button>
                      );
                    })}
                  {SURA_DATA.filter((su) => {
                    const q = suraSearch.trim().toLowerCase();
                    if (!q) return true;
                    return su.name.toLowerCase().includes(q) || String(su.id) === q;
                  }).length === 0 && (
                    <p className={`text-xs text-center py-3 ${theme.muted}`}>{s.suraSearchNoResults}</p>
                  )}
                </div>
              </>
            )}
            {scopeTypes.includes("stranice") && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <label className="text-xs flex-1"><span className={theme.muted}>{s.from}</span>
                    <input type="number" min="1" max="604" value={fromPage} onChange={(e) => setFromPage(e.target.value)} className={`w-full mt-1 ${inp}`} /></label>
                  <label className="text-xs flex-1"><span className={theme.muted}>{s.to}</span>
                    <input type="number" min="1" max="604" value={toPage} onChange={(e) => setToPage(e.target.value)} className={`w-full mt-1 ${inp}`} /></label>
                </div>
                <label className="text-xs block">
                  <span className={theme.muted}>{s.extraPagesLabel}</span>
                  <input value={extraPagesText} onChange={(e) => setExtraPagesText(e.target.value)}
                    placeholder={s.extraPagesPh} className={`w-full mt-1 ${inp}`} />
                </label>
              </div>
            )}
            <p className={`text-xs ${theme.muted}`}>{pages.length} str. · {totalLines} {s.unit_redovi}</p>
          </>
        )}

        {/* Korak 3 - Cilj: BIRA SE PRIJE kapaciteta, jer ako korisnik zna datum,
            kapacitet se ne pita (tempo se računa iz datuma), a ako zna tempo,
            kapacitet je sljedeći korak koji zaključava datum. */}
        {step === 3 && (
          <>
            <h3 className="font-semibold flex items-center">
              {s.sCilj}
              <HelpTip text={s.lockHelp} />
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setLock("tempo")} className={pill(lock === "tempo")}>{s.lockTempo}</button>
              <button onClick={() => {
                setLock("datum");
                // "Znam datum, izračunaj tempo" ima smisla SAMO po redovima/stranicama -
                // to je fizička, tačno poznata jedinica (ukupno redova ÷ dostupni dani).
                // Za ajete bi trebalo tačan ukupan broj ajeta u opsegu (poseban upit,
                // trenutno wizard sve računa sinhrono preko stranica/redova), pa "ajeti"
                // ovdje namjerno nije opcija - vraća se na "redovi" ako je ostalo iz ranije.
                if (tempoUnit === "ajeti") setTempoUnit("redovi");
              }} className={pill(lock === "datum")}>{s.lockDatum}</button>
            </div>
            {lock === "datum" && (
              <p className={`text-xs ${theme.muted}`}>{s.lockDatumAjetiNote}</p>
            )}
            {lock === "datum" && (
              <label className="block text-sm">
                <span className={`text-xs ${theme.muted}`}>{s.targetDate}</span>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={`mt-1 ${inp}`} />
              </label>
            )}
            {lock === "datum" && lockInfo && !lockInfo.realistic && lockInfo.suggestion && (
              <div className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-3 text-xs space-y-1">
                <p className="font-semibold text-amber-500">{s.unreal.replace("{max}", Math.round(lockInfo.suggestion.maksimalnoPreporuceno))}</p>
                <p>{s.suggestion
                  .replace("{date}", lockInfo.suggestion.predlozeniDatum)
                  .replace("{tempo}", Math.ceil(lockInfo.suggestion.potrebniRedoviDnevno))}</p>
              </div>
            )}
            {endDate && (
              <p className="text-sm">
                {s.eta}: <strong>{endDate}</strong>{" "}
                {lock === "datum" && lockInfo && <span className={theme.accent}>({Math.round(lockInfo.linesPerDay * 10) / 10} {s.perDayUnit})</span>}
              </p>
            )}
          </>
        )}

        {/* Korak 4 - Kapacitet: samo ako je korisnik odabrao "znam tempo" u
            prethodnom koraku. Ako je odabrao "znam datum", tempo je već
            izračunat iz datuma - ovdje se samo prikazuje, ne unosi ponovo. */}
        {step === 4 && (
          <>
            <h3 className="font-semibold">{s.sKapacitet}</h3>
            {lock === "datum" ? (
              <div className={`${theme.cardSub} rounded-xl p-3 space-y-1`}>
                <p className={`text-xs ${theme.muted}`}>{s.sKapacitetFromDate}</p>
                {lockInfo && (
                  <>
                    <p className={`text-sm font-semibold ${theme.accent}`}>{Math.round(lockInfo.linesPerDay * 10) / 10} {s.perDayUnit}</p>
                    <p className={`text-[11px] ${theme.muted} opacity-70`}>{s.sKapacitetFromDateCaption}</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <p className={`text-xs ${theme.muted}`}>{s.sKapacitetHint}</p>

                {/* 1) prvo period */}
                <div>
                  <p className={`text-xs font-semibold mb-1.5 ${theme.muted}`}>{s.sKapacitetPeriodLabel}</p>
                  <div className="flex gap-2 flex-wrap">
                    {["dan", "sedmica", "mjesec"].map((p) => (
                      <button key={p} onClick={() => setPer(p)} className={pill(per === p)}>{s[`per_${p}`]}</button>
                    ))}
                  </div>
                </div>

                {/* 2) zatim količina i jedinica */}
                <div>
                  <p className={`text-xs font-semibold mb-1.5 ${theme.muted}`}>{s.sKapacitetAmountLabel}</p>
                  <div className="flex gap-2 items-center flex-wrap">
                    <input type="number" min="0.5" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-24 ${inp}`} />
                    {["redovi", "stranice", "ajeti"].map((u) => (
                      <button key={u} onClick={() => setTempoUnit(u)} className={pill(tempoUnit === u)}>{s[`unit_${u}`]}</button>
                    ))}
                  </div>
                </div>

                <p className={`text-xs italic ${theme.muted}`}>{s.sKapacitetExample}</p>

                {tempoUnit === "ajeti" ? (
                  ajetiPerDay > 0 && <p className={`text-xs ${theme.muted}`}>{s.ajetiTempoNote}</p>
                ) : (
                  linesPerDay > 0 && <p className={`text-sm ${theme.accent}`}>= {Math.round(linesPerDay * 100) / 100} {s.perDayUnit}</p>
                )}
              </>
            )}
          </>
        )}

        {step === 5 && lock === "tempo" && (
          <>
            <h3 className="font-semibold">{s.sVrijeme}</h3>
            <div className="flex items-center gap-2">
              <input type="number" min="1" step="1" value={minutesNeeded} onChange={(e) => setMinutesNeeded(e.target.value)} className={`w-24 ${inp}`} />
              <span className={`text-sm ${theme.muted}`}>{s.minutesUnit}</span>
            </div>
            <p className={`text-xs italic ${theme.muted}`}>{s.sVrijemeHint}</p>
            <p className={`text-xs ${theme.muted} opacity-80`}>{s.sVrijemeUsageNote}</p>
          </>
        )}

        {step === 6 && (
          <>
            <h3 className="font-semibold">{s.sMetoda}</h3>
            <div className="flex gap-2 flex-wrap">
              {methodOptions.map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={pill(effectiveMethod === m)}>{s[`m_${m}`]}</button>
              ))}
            </div>
            {selectedMethodInfo && (
              <div className={`${theme.cardSub} rounded-xl p-3 space-y-1`}>
                <p className={`text-xs leading-relaxed ${theme.muted}`}>{selectedMethodInfo.opis}</p>
                {METHOD_BLOG_SLUG[effectiveMethod] && (
                  <Link to={`/blog/${METHOD_BLOG_SLUG[effectiveMethod]}`} className={`text-xs font-semibold inline-block ${theme.accent}`}>
                    {s.readMore}
                  </Link>
                )}
              </div>
            )}
            {effectiveMethod === "redom" && scope?.type === "cijeli" && (
              <div className="flex gap-2 flex-wrap">
                {Object.entries(DIRECTIONS).map(([id, label]) => (
                  <button key={id} onClick={() => setDirection(id)} className={pill(direction === id)}>{label}</button>
                ))}
              </div>
            )}
            {effectiveMethod === "redom" && scope?.type !== "cijeli" && (
              <p className={`text-xs italic ${theme.muted}`}>{s.directionNotApplicable}</p>
            )}
            {effectiveMethod === "postepeno" && (
              <label className="text-sm flex items-center gap-2">
                <span className={theme.muted}>{s.reps}:</span>
                <input type="number" min="1" max="50" value={reps} onChange={(e) => setReps(Number(e.target.value))} className={`w-20 ${inp}`} />
              </label>
            )}

            {/* ── Slobodni dani u sedmici ── */}
            <div>
              <p className="text-sm font-medium mb-1">{s.restDaysLabel}</p>
              <p className={`text-xs mb-2 ${theme.muted}`}>{s.restDaysHint}</p>
              <div className="flex gap-1.5 flex-wrap">
                {wd.map((label, idx) => (
                  <button key={idx} type="button"
                    onClick={() => setRestWeekdays((prev) => prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx])}
                    className={pill(restWeekdays.includes(idx))}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── PREGLED ── */}
            <div className={`${theme.cardSub} rounded-xl p-4 space-y-3`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-semibold text-sm">{s.preview}</h4>
                <span className={`text-[10px] text-white px-2 py-0.5 rounded-full ${CERT_STIL[cert]}`}>{s[`cert_${cert}`]}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div><div className={`font-black ${theme.accent}`}>{totalLines}</div><div className={`text-[10px] ${theme.muted}`}>{s.totalLines}</div></div>
                <div><div className={`font-black ${theme.accent} text-lg`}>{dailyGoalText({ state: { tempoUnit: effectiveTempoUnit, ajetiPerDay }, lines_per_day: linesPerDay, mushaf_edition: edition }, s)}</div><div className={`text-[10px] ${theme.muted}`}>{s.perDay}</div></div>
                <div><div className={`font-black ${theme.accent}`}>{endDate || "—"}</div><div className={`text-[10px] ${theme.muted}`}>{s.eta}</div></div>
              </div>

              {/* vizuelni put do cilja */}
              <div>
                <div className={`text-[10px] uppercase tracking-wider mb-1 ${theme.muted}`}>{s.path}</div>
                <div className="w-full h-3 rounded-full bg-black/10 overflow-hidden flex">
                  {firstWeek.length > 0 && <div className={`h-full ${theme.logo}`} style={{ width: "2%" }} />}
                </div>
                <div className={`flex justify-between text-[10px] mt-0.5 ${theme.muted}`}>
                  <span>{today}</span><span>🎯 {endDate || "?"}</span>
                </div>
              </div>

              {tempoUnit === "ajeti" ? (
                ajetiPerDay > 0 && (
                  <div>
                    <div className={`text-[10px] uppercase tracking-wider mb-1 ${theme.muted}`}>{s.firstDays}</div>
                    <p className={`text-xs ${theme.muted}`}>≈ {ajetiPerDay} {s.unit_ajeti} {s.per_dan} — {s.ajetiTempoNote}</p>
                  </div>
                )
              ) : firstWeek.length > 0 && (
                <div>
                  <div className={`text-[10px] uppercase tracking-wider mb-1 ${theme.muted}`}>{s.firstDays}</div>
                  <ul className="text-xs space-y-0.5">
                    {firstWeek.map((d) => (
                      <li key={d.date}>
                        {d.date}: str. {d.from.page}:{d.from.line} → {d.to.page}:{d.to.line} ({d.lineCount})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {activated ? (
              <div className="space-y-2">
                <div className="rounded-xl bg-green-600/15 border border-green-600/40 text-green-500 text-sm font-semibold text-center py-3">
                  {s.activated}
                </div>
                <button onClick={() => navigate("/korisnik/hifz/raspored")}
                  className={`w-full ${theme.cardSub} ${theme.accent} rounded-xl py-2.5 text-sm font-semibold`}>
                  {s.fullSchedule}
                </button>
                <button onClick={closeWizard}
                  className={`w-full ${theme.muted} rounded-xl py-2 text-xs`}>
                  {s.backToList}
                </button>
              </div>
            ) : (
              <button onClick={activate} disabled={saving || !pages.length || linesPerDay <= 0}
                className={`w-full ${theme.button} rounded-xl py-3 text-sm font-semibold disabled:opacity-50`}>
                {saving ? "…" : s.activate}
              </button>
            )}
          </>
        )}

        {/* navigacija koraka - preskače korak 5 (Vrijeme) kad je datum zaključan */}
        <div className="flex justify-between pt-2">
          <button onClick={() => setStep((x) => {
            let n = x - 1;
            if (n === 5 && lock === "datum") n = 4;
            return Math.max(1, n);
          })} disabled={step === 1}
            className={`${theme.cardSub} ${theme.muted} rounded-xl px-4 py-2 text-sm disabled:opacity-40`}>
            {s.back}
          </button>
          {step < 6 && (
            <button onClick={() => setStep((x) => {
              let n = x + 1;
              if (n === 5 && lock === "datum") n = 6;
              return Math.min(6, n);
            })} disabled={!stepOk[step]}
              className={`${theme.button} rounded-xl px-4 py-2 text-sm disabled:opacity-40`}>
              {s.next}
            </button>
          )}
        </div>
      </div>
      </>
      )}

      {/* ── Historija: završeni / zakazani / pauzirani planovi - UVIJEK
          prikazano da se zna gdje tražiti, čak i kad još nema ničega. ── */}
      {!wizardMode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className={`text-sm font-semibold ${theme.muted}`}>{s.pastPlansTitle}</h3>
            {(archivedCount > 0 || showArchived) && (
              <button onClick={() => setShowArchived((v) => !v)} className={`text-xs ${theme.accent}`}>
                {showArchived ? s.showActiveToggle : s.showArchivedToggle}
              </button>
            )}
          </div>
          {showArchived && (
            <p className={`text-center text-xs font-bold uppercase tracking-widest mt-4 mb-1 ${theme.accent}`}>
              {s.archiveHeading}
            </p>
          )}
          <div className="space-y-2">
            {pastPlans.length === 0 && (
              <p className={`text-xs ${theme.muted}`}>{s.noPastPlans}</p>
            )}
            {pastPlans.length > 0 && visiblePastPlans.length === 0 && showArchived && (
              <p className={`text-xs ${theme.muted}`}>{s.noArchived}</p>
            )}
            {visiblePastPlans.map((p) => {
              const st = planStatus(p);
              return (
                <div key={p.id} className={`${theme.cardSub} rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap`}>
                  <div className="min-w-0 text-sm">
                    <div className="font-medium truncate">
                      <span className={`font-mono text-xs mr-1.5 ${theme.muted}`}>#{planNumberMap[p.id]}</span>
                      {describeScope(p.scope_data, lang) || p.method}
                    </div>
                    <div className={`text-xs ${theme.muted}`}>
                      {p.method} · {dailyGoalText(p, s)} · {p.start_date} → {p.target_date || "?"}
                      {p.created_at && <> · {s.createdShort} {fmtDateTime(p.created_at)}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                    <span className={`text-[10px] text-white px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    {confirmDeleteId === p.id ? (
                      <>
                        <span className={`text-xs ${theme.muted}`}>{s.confirmDeleteMsg}</span>
                        <button onClick={() => deletePlan(p.id)} className="text-xs font-semibold text-red-500">{s.confirmYes}</button>
                        <button onClick={() => setConfirmDeleteId(null)} className={`text-xs ${theme.muted}`}>{s.confirmNo}</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => navigate(`/korisnik/hifz/raspored?plan=${p.id}`)} className={`text-xs uppercase font-semibold tracking-wide ${theme.accent}`}>{s.editPlanBtn}</button>
                        <span className={`text-xs opacity-30 ${theme.muted}`}>|</span>
                        {showArchived ? (
                          <button onClick={() => unarchivePlan(p)} className={`text-xs uppercase font-semibold tracking-wide ${theme.accent}`}>{s.unarchiveBtn}</button>
                        ) : (
                          <button onClick={() => archivePlan(p)} className={`text-xs uppercase font-semibold tracking-wide ${theme.muted}`}>{s.archiveBtn}</button>
                        )}
                        <span className={`text-xs opacity-30 ${theme.muted}`}>|</span>
                        <button onClick={() => setConfirmDeleteId(p.id)} className="text-xs uppercase font-semibold tracking-wide text-red-500">{s.deleteBtn}</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
