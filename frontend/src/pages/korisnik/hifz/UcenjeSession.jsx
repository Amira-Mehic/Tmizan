// ============================================================================
// Sesija učenja - vođenje korak-po-korak
//
// Stranica sama prepoznaje AKTIVNI plan učenja (talim_plans, active=true) i
// prikazuje SAMO onu metodu koju je taj plan zadao (postepeno / redom / krugovi
// / halka) - korisnik ništa ne bira ručno, ni metodu ni koji ajet/stranicu uči.
//
// POSTEPENO (20×): današnji raspon (iz mjesečnog plana) se automatski pretvori
// u ajete; aplikacija vodi: koji ajet/spoj je na redu i koliko puta; veliki
// taster broji; kad se blok sastavi → ide u sistem ponavljanja I u zvanični
// napredak plana (isto kao "Danas učiš" na Dashboardu).
//
// REDOM KROZ MUSHAF: lista stranica aktivnog plana; novi dio se otključava
// tek kad je prethodni potvrđen BEZ greške; stanje se čuva u talim_plans.
//
// KRUGOVI: dnevni zadatak (učenje + ponavljanje ranijih krugova) iz bosanske
// metode krugova; potvrda dana pomjera na sljedeći korak.
//
// HALKA: šta je muallim zadao, korisnik označava pripremljeno.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTheme } from "../../../context/ThemeContext";
import { useLang } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../services/SupaBaseClient";
import { createSession, tick, currentStep, counterDisplay, progress as sessionProgress } from "../../../features/talim/postepeno";
import { createProgress as redomCreate, confirm as redomConfirm, currentUnit, estimateDaysLeft, progressPercent } from "../../../features/talim/redom";
import { markPrepared as halkaMarkPrepared, currentPart as halkaCurrentPart, progressPercent as halkaPercent } from "../../../features/talim/halka";
import { createProgress as krugoviCreate, todayTask as krugoviTodayTask, completeDay as krugoviCompleteDay, progressInfo as krugoviProgressInfo, estimateDaysLeft as krugoviEta } from "../../../features/talim/krugovi";
import { scopeToPages } from "../../../features/talim/mushaf";
import { describeScope } from "../../../features/talim/scopeLabel";
import { METHOD_INFO } from "../../../features/talim/methodInfo";
import { createReviewBlock } from "../../../features/murajaah/murajaahService";
import { addToFireZone } from "../../../features/murajaah/pohranaService";
import { syncLearnedPages, ayahKeysForPageRange, ayahKeysBetween } from "../../../features/talim/hifzSync";
import { todayStr, nowDateTimeLocal, fmtDateTime, fmtFullDate } from "../../../constants/hifz/helpers";
import { useHifzState } from "../../../hooks/hifz/useHifzState";
import { useLearningForPlanId } from "../../../hooks/hifz/useTodayLearning";
import { StatusPicker } from "../../../components/hifz/shared/StatusPicker";
import { ConfidencePicker } from "../../../components/hifz/shared/ConfidencePicker";
import { Counter } from "../../../components/hifz/shared/Counter";
import { RepeatHistoryInput } from "../../../components/hifz/shared/RepeatHistoryInput";
import { RepSquares } from "../../../components/hifz/shared/RepSquares";
import { ErrorAyahPicker } from "../../../components/hifz/shared/ErrorAyahPicker";
import { AyahBrowser } from "../../../components/hifz/shared/AyahBrowser";
import { SessionTimer } from "../../../components/hifz/shared/SessionTimer";
import { usePageVerses } from "../../../hooks/hifz/usePageVerses";
import { recordError, clearError, fetchFlaggedRefs } from "../../../features/murajaah/greskeService";
import { EditForm } from "./components/EditForm";
import BackButton from "../../../components/shared/BackButton";
import GuidedTour from "../../../components/shared/GuidedTour";
import { PageTourButton } from "../../../components/shared/PageTourButton";
import { UCENJE_TOUR } from "../../../constants/tours/ucenjeTour";
import HelpTip from "../../../components/shared/HelpTip";
import { hasSeenTour, markTourSeen } from "../../../lib/tourStorage";

const STR = {
  bs: {
    title: "Učenje danas", subtitle: "Vođena sesija — korak po korak",
    activePlan: "Aktivan plan", goToPlanner: "Napravi plan u Planneru →",
    noActivePlan: "Nemaš aktivan plan učenja.",
    restToday: "😌 Danas je, prema tvom planu, slobodan dan.",
    stillWantToday: "Ipak želim učiti i danas →",
    alreadyDoneToday: "✓ Već si danas označio/la ovo kao odrađeno — možeš dalje vježbati ako želiš.",
    noTaskToday: "🎉 Nema više planiranog gradiva — sav opseg je pokriven!",
    halkaNoPlan: "Muallim ti još nije zadao halka plan.",
    halkaCurrent: "Muallim ti je zadao", halkaPrepared: "✋ Pripremio/la sam — spreman/na za preslušavanje",
    halkaWaiting: "Čeka se muallimovo preslušavanje…", halkaDone: "🎉 Sav halka plan odobren!",
    reps: "Ponavljanja", stepOf: "Korak {a} od {b}",
    tapHint: "Dodirni nakon svakog proučavanja",
    finished: "🎉 Stranica sastavljena! Blok automatski ide u sistem ponavljanja.",
    toReview: "Dodano u ponavljanje (Tri dana) i vatrenu zonu ✓",
    noPlan: "Nema aktivnog plana metodom 'Redom' — napravi ga u Planneru.",
    current: "Trenutno učiš", confirmClean: "✓ Proučeno BEZ greške — otključaj sljedeće",
    confirmError: "✕ Bilo je grešaka — ostajem na ovoj stranici",
    confirmErrorHint: "Produžuje jedan dan na ovoj stranici — procjena preostalih dana će se automatski ažurirati.",
    nextPage: "Sljedeća stranica →",
    nextPageLockedHint: "Označi status svakog ajeta ove stranice (bar \"U toku\") prije nego pređeš dalje.",
    unlocked: "Otključano", locked: "Zaključano", done: "Savladano",
    eta: "Procjena preostalog: ~{d} dana", allDone: "🎉 Sav opseg savladan!",
    krugNoPlan: "Nema aktivnog plana metodom 'Krugovi' — napravi ga u Planneru.",
    krugCurrent: "Krug {k} — danas učiš", krugJuz: "Džuz", krugReview: "Ponovi uz to (raniji krugovi)", krugReviewNone: "nema",
    krugConfirm: "✓ Odradio/la sam danas",
    pageRepsTitle: "Koliko puta želiš ponoviti ovu stranicu?", pageRepsPh: "npr. 5", pageRepsUnit: "ponavljanja",
    pageRepsHint: "Označavanjem broja ponavljanja kao gotovih lakše evidentiraš broj učenja — svaki klik upisuje tačan datum i vrijeme u Tracker.",
    pageRepsSaved: "{n}× sačuvano u Tracker — svako s tačnim datumom i vremenom",
    pageLastUpdated: "Zadnje ažurirano",
    detTitle: "📝 Detalji ovog učenja", detFor: "Za ajet(e)", detLastUpdated: "Zadnje ažurirano", detSaved: "✓ Sačuvano u Hifz Tracker",
    detStatusLabel: "Status ajeta", detConfidenceLabel: "Nivo sigurnosti (1–5)",
    detDifficulty: "Težina ajeta", detEasy: "Lak", detMed: "Srednji", detHard: "Težak",
    detErrors: "Broj grešaka", detRepeatHistory: "Historija ponavljanja",
    detSimilar: "Slični ajeti", detSimilarPh: "npr. 2:255", detAdd: "Dodaj", detSimilarNone: "Nema sličnih ajeta.",
    detSave: "Sačuvaj u Tracker",
    errorAyahsLabel: "Koji ajeti su imali grešku?",
    errorAyahsHint: "Klikni ajet da ga označiš/odznačiš — ide u \"Stranice i ajeti s greškama\" na Dashboardu.",
    learnModePage: "📄 Uči cijelu stranicu", learnModeAyah: "📖 Uči ajet po ajet",
    timerStart: "Pokreni tajmer", timerPause: "Pauziraj tajmer", timerRestart: "Restartuj tajmer", timerStop: "Zaustavi tajmer",
    allStepsLabel: "Svi koraci",
    stepLocked: "Zaključano — nauči prethodne korake prvo",
    reviewingStep: "👀 Pregledaš već završen korak — brojanje i tapkanje ostaju na trenutnom koraku.",
    backToCurrent: "← Nazad na trenutni korak",
    redoviCurrentLabel: "Danas učiš (redovi)",
    redoviLinesCount: "{n} redova",
    choosePlanTitle: "Koji plan želiš danas učiti?",
    choosePlanMinutes: "{n} min/dan",
    prevPlan: "Prethodni plan",
    nextPlan: "Sljedeći plan",
    backToPlans: "← Nazad na planove",
    progressSavedNote: "Napredak se čuva — možeš se vratiti na ovaj plan kad god želiš.",
  },
  en: {
    title: "Learning today", subtitle: "Guided session — step by step",
    activePlan: "Active plan", goToPlanner: "Create a plan in the Planner →",
    noActivePlan: "You don't have an active learning plan.",
    restToday: "😌 According to your plan, today is a rest day.",
    stillWantToday: "I still want to learn today →",
    alreadyDoneToday: "✓ You've already marked this as done today — you can keep practicing if you'd like.",
    noTaskToday: "🎉 No more material planned — the whole scope is covered!",
    halkaNoPlan: "Your muallim hasn't assigned a halaqa plan yet.",
    halkaCurrent: "Your muallim assigned", halkaPrepared: "✋ I've prepared — ready for recitation",
    halkaWaiting: "Waiting for the muallim's review…", halkaDone: "🎉 Entire halaqa plan approved!",
    reps: "Repetitions", stepOf: "Step {a} of {b}",
    tapHint: "Tap after each recitation",
    finished: "🎉 Page assembled! The block automatically enters the review system.",
    toReview: "Added to review (Three days) and the fire zone ✓",
    noPlan: "No active 'In order' plan — create one in the Planner.",
    current: "Currently learning", confirmClean: "✓ Recited with NO mistakes — unlock next",
    confirmError: "✕ There were mistakes — staying on this page",
    confirmErrorHint: "Extends one more day on this page — the estimated days remaining updates automatically.",
    nextPage: "Next page →",
    nextPageLockedHint: "Mark a status for every ayah on this page (at least \"In progress\") before moving on.",
    unlocked: "Unlocked", locked: "Locked", done: "Mastered",
    eta: "Estimated remaining: ~{d} days", allDone: "🎉 Entire scope mastered!",
    krugNoPlan: "No active 'Circles' plan — create one in the Planner.",
    krugCurrent: "Circle {k} — learning today", krugJuz: "Juz", krugReview: "Also repeat (earlier circles)", krugReviewNone: "none",
    krugConfirm: "✓ Done for today",
    pageRepsTitle: "How many times do you want to repeat this page?", pageRepsPh: "e.g. 5", pageRepsUnit: "repetitions",
    pageRepsHint: "Marking repetitions as done makes it easier to log how much you've studied — each tap saves the exact date and time to the Tracker.",
    pageRepsSaved: "{n}× saved to Tracker — each with exact date and time",
    pageLastUpdated: "Last updated",
    detTitle: "📝 Session details", detFor: "For ayah(s)", detLastUpdated: "Last updated", detSaved: "✓ Saved to Hifz Tracker",
    detStatusLabel: "Verse status", detConfidenceLabel: "Confidence level (1–5)",
    detDifficulty: "Verse difficulty", detEasy: "Easy", detMed: "Medium", detHard: "Hard",
    detErrors: "Number of mistakes", detRepeatHistory: "Repeat history",
    detSimilar: "Similar verses", detSimilarPh: "e.g. 2:255", detAdd: "Add", detSimilarNone: "No similar verses.",
    detSave: "Save to Tracker",
    errorAyahsLabel: "Which ayahs had a mistake?",
    errorAyahsHint: "Click an ayah to flag/unflag it — feeds into \"Pages & ayahs with mistakes\" on the Dashboard.",
    learnModePage: "📄 Learn the whole page", learnModeAyah: "📖 Learn ayah by ayah",
    timerStart: "Start timer", timerPause: "Pause timer", timerRestart: "Restart timer", timerStop: "Stop timer",
    allStepsLabel: "All steps",
    stepLocked: "Locked — finish the previous steps first",
    reviewingStep: "👀 You're reviewing an already-finished step — counting and tapping stay on the current step.",
    backToCurrent: "← Back to current step",
    redoviCurrentLabel: "Learning today (lines)",
    redoviLinesCount: "{n} lines",
    choosePlanTitle: "Which plan do you want to learn today?",
    choosePlanMinutes: "{n} min/day",
    prevPlan: "Previous plan",
    nextPlan: "Next plan",
    backToPlans: "← Back to plans",
    progressSavedNote: "Progress is saved — you can come back to this plan anytime.",
  },
};

export default function UcenjeSession() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const s = STR[lang] || STR.bs;

  // ── Kratak vodič, prvi put kad korisnik uđe na ovu stranicu ──
  // Čisto sinhrona provjera (localStorage) - prilagođava se tokom rendera uz
  // poređenje s prethodnim user?.id (isti okidač kao stari dependency niz).
  const [showTour, setShowTour] = useState(false);
  const [prevUserIdTour, setPrevUserIdTour] = useState(user?.id);
  if (user?.id !== prevUserIdTour) {
    setPrevUserIdTour(user?.id);
    if (user?.id && !hasSeenTour(user.id, "ucenje")) setShowTour(true);
  }
  const finishTour = () => { if (user?.id) markTourSeen(user.id, "ucenje"); setShowTour(false); };
  // Isti hook koji napaja Hifz Tracker - tako se detalji unešeni ovdje (greške,
  // slični ajeti, težina, ponavljanja) ODMAH pojave i tamo, bez duplog unosa.
  const { pageStatuses, verseStatuses, saveVerseDetail, savePageDetail } = useHifzState();
  // Korisnik može imati VIŠE istovremeno aktivnih planova - koji je "fokusiran"
  // ovdje bira se preko ?plan=<id> u URL-u (isti obrazac kao PlanRasporedPage).
  // Bez izbora (ili kad postoji samo jedan aktivan plan) automatski se uzima prvi.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPlanId = searchParams.get("plan");
  const { loading: loadingToday, talimPlan, learning, isRest, doneToday, markDone, allPlans } = useLearningForPlanId(requestedPlanId);

  const methodInfo = talimPlan ? (METHOD_INFO[lang] || METHOD_INFO.bs)[talimPlan.method] : null;
  // Traka za biranje se prikazuje samo kad ima VIŠE aktivnih planova I korisnik
  // još nije fokusirao nijedan (nema ?plan= u URL-u) - inače idemo pravo na sesiju.
  const showPicker = !loadingToday && allPlans.length > 1 && !requestedPlanId;
  const choosePlan = (id) => setSearchParams({ plan: id });
  const backToPlans = () => setSearchParams({});

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <GuidedTour steps={UCENJE_TOUR[lang] || UCENJE_TOUR.bs} active={showTour} onFinish={finishTour} theme={theme} lang={lang} dismissible />
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton />
        <div data-tour="tour-ucenje-page">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
            📖 {s.title}
            <PageTourButton onClick={() => setShowTour(true)} />
          </h1>
          <p className={`${theme.muted} text-sm mt-1`}>{s.subtitle}</p>
          <p className={`${theme.accent} text-xs font-semibold mt-1.5`}>
            {fmtFullDate(new Date(), lang)}
          </p>
        </div>

        {loadingToday ? (
          <p className={theme.muted}>…</p>
        ) : !talimPlan ? (
          <div className={`${theme.card} rounded-2xl p-6 text-center space-y-3`}>
            <p className={theme.muted}>{s.noActivePlan}</p>
            <Link to="/korisnik/hifz/planner" className={`inline-block ${theme.button} rounded-xl px-5 py-2 text-sm font-semibold`}>
              {s.goToPlanner}
            </Link>
          </div>
        ) : showPicker ? (
          <PlanPickerStrip theme={theme} s={s} lang={lang} plans={allPlans} onChoose={choosePlan} />
        ) : (
          <>
            {allPlans.length > 1 && (
              <div>
                <button onClick={backToPlans} className={`text-sm font-semibold ${theme.accent}`}>
                  {s.backToPlans}
                </button>
                <p className={`text-[11px] ${theme.muted} mt-0.5`}>{s.progressSavedNote}</p>
              </div>
            )}

            <div className={`${theme.card} rounded-2xl px-4 py-3`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${theme.muted}`}>{s.activePlan}</p>
              <p className="font-semibold">{methodInfo?.naziv}</p>
              {talimPlan.scope_data && (
                <p className={`text-xs mt-0.5 ${theme.muted}`}>{describeScope(talimPlan.scope_data, lang)}</p>
              )}
            </div>

            {isRest ? (
              <div className={`${theme.card} rounded-2xl p-6 text-center space-y-3`}>
                <p className={theme.muted}>{s.restToday}</p>
                <Link to="/korisnik/hifz/raspored" className={`inline-block ${theme.button} rounded-xl px-5 py-2 text-sm font-semibold`}>
                  {s.stillWantToday}
                </Link>
              </div>
            ) : (
              <>
                {doneToday && (
                  <p className={`text-sm ${theme.accent} px-1`}>{s.alreadyDoneToday}</p>
                )}
                {talimPlan.method === "postepeno" && talimPlan.state?.tempoUnit === "redovi" && (
                  <RedoviTab theme={theme} s={s} learning={learning} markDone={markDone}
                    targetMinutes={talimPlan.state?.minutesNeeded} />
                )}
                {talimPlan.method === "postepeno" && talimPlan.state?.tempoUnit !== "redovi" && (
                  <PostepenoTab theme={theme} s={s} lang={lang} userId={user?.id}
                    verseStatuses={verseStatuses} saveVerseDetail={saveVerseDetail}
                    learning={learning} markDone={markDone}
                    targetMinutes={talimPlan.state?.minutesNeeded} />
                )}
                {talimPlan.method === "redom" && (
                  <RedomTab theme={theme} s={s} userId={user?.id} planId={talimPlan.id}
                    pageStatuses={pageStatuses} savePageDetail={savePageDetail}
                    verseStatuses={verseStatuses} saveVerseDetail={saveVerseDetail} />
                )}
                {talimPlan.method === "halka" && <HalkaTab theme={theme} s={s} userId={user?.id} planId={talimPlan.id} />}
                {talimPlan.method === "krugovi" && (
                  <KrugoviTab theme={theme} s={s} userId={user?.id} planId={talimPlan.id}
                    pageStatuses={pageStatuses} savePageDetail={savePageDetail} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Biranje aktivnog plana (kad ih ima više) - JEDNA kartica koja uvijek
    stane na širinu ekrana (pun naziv, bez rezanja), sa dvije strelice za
    listanje kroz planove umjesto horizontalnog scrolla više kartica. ── */
function PlanPickerStrip({ theme, s, lang, plans, onChoose }) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, plans.length - 1);
  const p = plans[safeIndex];
  const mi = (METHOD_INFO[lang] || METHOD_INFO.bs)[p.method];
  const scopeLabel = describeScope(p.scope_data, lang) || mi?.naziv || "";
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < plans.length - 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-semibold ${theme.muted}`}>{s.choosePlanTitle}</p>
        <p className={`text-xs shrink-0 ${theme.muted}`}>{safeIndex + 1} / {plans.length}</p>
      </div>
      <div className="flex items-stretch gap-2">
        <button type="button" onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={!canPrev}
          aria-label={s.prevPlan || "←"}
          className={`shrink-0 w-11 rounded-2xl flex items-center justify-center text-lg font-bold transition-opacity
            ${theme.card} ${canPrev ? "hover:opacity-80" : "opacity-30 cursor-not-allowed"}`}>
          ←
        </button>

        <button type="button" onClick={() => onChoose(p.id)}
          className={`${theme.card} flex-1 min-w-0 text-left rounded-2xl p-4 space-y-1 hover:opacity-90 transition-opacity`}>
          <p className="font-bold text-base leading-snug break-words">{scopeLabel}</p>
          {mi?.naziv && <p className={`text-xs ${theme.muted}`}>{mi.naziv}</p>}
          {!!p.state?.minutesNeeded && (
            <p className={`text-xs font-semibold ${theme.accent}`}>
              ⏱ {s.choosePlanMinutes.replace("{n}", p.state.minutesNeeded)}
            </p>
          )}
        </button>

        <button type="button" onClick={() => setIndex(i => Math.min(plans.length - 1, i + 1))} disabled={!canNext}
          aria-label={s.nextPlan || "→"}
          className={`shrink-0 w-11 rounded-2xl flex items-center justify-center text-lg font-bold transition-opacity
            ${theme.card} ${canNext ? "hover:opacity-80" : "opacity-30 cursor-not-allowed"}`}>
          →
        </button>
      </div>
    </div>
  );
}

/* ── POSTEPENO NADOGRAĐIVANJE (20×) - gradivo automatski iz aktivnog plana ── */
function PostepenoTab({ theme, s, lang, userId, verseStatuses, saveVerseDetail, learning, markDone, targetMinutes }) {
  const isLight = theme?.id === "beige_white";
  const [keys, setKeys] = useState(null);   // null = učitava se; [] = ništa nađeno
  const [reps, setReps] = useState(20);
  const [session, setSession] = useState(null);
  const [savedToReview, setSavedToReview] = useState(false);
  // Pregled RANIJEG (već završenog) koraka - null = gledaš trenutni aktivni
  // korak. Klik na završen blok u traci "svi koraci" postavlja ovo, da se
  // mogu urediti Tracker detalji za taj blok bez diranja stvarnog napretka
  // (brojanje/tapkanje ostaje zaključano samo na stvarno trenutnom koraku).
  const [reviewIndex, setReviewIndex] = useState(null);

  // ── Detalji ajeta za Hifz Tracker - ISTA polja/komponente kao EditForm i
  // VerseDetailView na samom Trackeru (StatusPicker, ConfidencePicker, Counter,
  // RepeatHistoryInput, slični ajeti), primijenjena na sve ajete iz bloka. ──
  const [detStatus, setDetStatus] = useState("naucen");
  const [detDifficulty, setDetDifficulty] = useState("srednja");
  const [detConfidence, setDetConfidence] = useState(0);
  const [detErrors, setDetErrors] = useState(0);
  const [detLastRepeat, setDetLastRepeat] = useState(todayStr());
  const [detHistory, setDetHistory] = useState([]);      // nova ponavljanja unesena OVE sesije
  const [detSimilarNew, setDetSimilarNew] = useState([]); // slični ajeti dodani OVE sesije
  const [newSimilar, setNewSimilar] = useState("");
  const [detSaved, setDetSaved] = useState(false);
  const [detSaving, setDetSaving] = useState(false);
  const [flaggedAyahs, setFlaggedAyahs] = useState([]); // ajeti trenutnog koraka označeni kao greška

  const resetDetForm = () => {
    setDetStatus("naucen"); setDetDifficulty("srednja"); setDetConfidence(0); setDetErrors(0);
    setDetLastRepeat(todayStr()); setDetHistory([]); setDetSimilarNew([]); setNewSimilar("");
    setDetSaved(false);
  };

  const addDetSimilar = () => {
    const trimmed = newSimilar.trim();
    if (!trimmed) return;
    setDetSimilarNew(prev => [...prev, { id: Date.now() + Math.random(), key: trimmed }]);
    setNewSimilar("");
  };

  // Koji ajet(i) tačno primaju unesene detalje - TAČNO onaj koji je trenutno
  // na redu za brojanje (jedan ajet, spoj dva ili više, ili cijeli današnji blok).
  const keysForStep = (st) => {
    if (!st) return [];
    if (st.type === "ajet") return [st.key];
    if (st.type === "spoj") {
      const [sFrom, aFrom] = st.from.split(":").map(Number);
      const [, aTo] = st.to.split(":").map(Number);
      const out = [];
      for (let a = aFrom; a <= aTo; a++) out.push(`${sFrom}:${a}`);
      return out;
    }
    return keys || [];
  };

  // Kratka oznaka koraka za chip u traci "svi koraci" (bez punog labela).
  const shortStepLabel = (st) => {
    if (!st) return "";
    if (st.type === "ajet") return st.key.split(":")[1];
    if (st.type === "spoj") return `${st.from.split(":")[1]}-${st.to.split(":")[1]}`;
    if (st.type === "stranica") return "📄";
    if (st.type === "utvrdi_prethodnu") return "↺";
    return "?";
  };

  // Današnji raspon iz aktivnog plana → automatski povuci ajete koji mu
  // odgovaraju (bez ručnog unosa sure/ajeta). "ajeti"-tempo planovi već znaju
  // TAČAN ajet-raspon (fromKey/toKey) - koristi se direktan, precizan upit
  // (ayahKeysBetween), ne povlačenje cijele stranice kao za redovi/stranice-tempo.
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!learning) { setKeys([]); return; }
    setKeys(null);
    const fetchKeys = learning.unit === "ajeti"
      ? ayahKeysBetween(learning.from, learning.to)
      : ayahKeysForPageRange(learning.from.page, learning.to.page);
    fetchKeys.then((ks) => {
      if (!cancelled) setKeys(ks);
    });
    return () => { cancelled = true; };
    // pratimo samo primitivne granice raspona - `learning` mijenja referencu
    // na svaki render pa bi kao zavisnost izazvao beskonačnu petlju.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    learning?.unit,
    learning?.from?.page, learning?.from?.line, learning?.to?.page, learning?.to?.line,
    learning?.fromKey, learning?.toKey,
  ]);

  // Čim su ajeti poznati (ili se promijeni broj ponavljanja) → sesija kreće
  // sama, bez posebnog "Počni" koraka. Čisto sinhrona izvedba iz keys/reps -
  // prilagođava se tokom rendera uz poređenje s prethodnim vrijednostima
  // (isti okidači kao stari dependency niz [keys, reps]).
  const [prevKeysForSession, setPrevKeysForSession] = useState(keys);
  const [prevRepsForSession, setPrevRepsForSession] = useState(reps);
  if (keys !== prevKeysForSession || reps !== prevRepsForSession) {
    setPrevKeysForSession(keys);
    setPrevRepsForSession(reps);
    if (!keys || !keys.length) {
      setSession(null);
    } else {
      setSavedToReview(false);
      resetDetForm();
      setSession(createSession(keys, { reps: Number(reps), counterMode: "up" }));
    }
  }

  // Svaki put kad se pređe na novi korak (novi ajet/spoj/stranica) ILI kad se
  // korisnik prebaci na pregled nekog ranijeg koraka, detalji se resetuju -
  // panel uvijek prikazuje formu za korak KOJI SE TRENUTNO PROMATRA. Čisto
  // sinhrona prilagodba - prilagođava se tokom rendera uz poređenje s
  // prethodnim vrijednostima (isti okidači kao stari dependency niz).
  const [prevStepIndexDet, setPrevStepIndexDet] = useState(session?.stepIndex);
  const [prevFinishedDet, setPrevFinishedDet] = useState(session?.finished);
  const [prevReviewIndexDet, setPrevReviewIndexDet] = useState(reviewIndex);
  if (
    session?.stepIndex !== prevStepIndexDet ||
    session?.finished !== prevFinishedDet ||
    reviewIndex !== prevReviewIndexDet
  ) {
    setPrevStepIndexDet(session?.stepIndex);
    setPrevFinishedDet(session?.finished);
    setPrevReviewIndexDet(reviewIndex);
    if (session) resetDetForm();
  }

  // Učitaj koji su ajeti PROMATRANOG koraka (trenutni ili onaj u pregledu)
  // već označeni kao greška - isti error_tracking izvor kao za stranice.
  useEffect(() => {
    let cancelled = false;
    const viewSt = session ? (reviewIndex != null ? session.steps[reviewIndex] : currentStep(session)) : null;
    const stepKeys = keysForStep(viewSt);
    if (!userId || !stepKeys.length) {
      Promise.resolve().then(() => { if (!cancelled) setFlaggedAyahs([]); });
      return () => { cancelled = true; };
    }
    fetchFlaggedRefs(userId, stepKeys, "verse").then((refs) => {
      if (!cancelled) setFlaggedAyahs(refs);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, session?.stepIndex, session?.finished, reviewIndex]);

  // Toggle: klik na ajet-chip odmah upisuje/briše grešku za TAJ ajet u
  // error_tracking - isto ponašanje kao na EditForm-u za stranice.
  const toggleErrorAyah = async (verseKey) => {
    if (!userId) return;
    const isFlagged = flaggedAyahs.includes(verseKey);
    setFlaggedAyahs(prev => isFlagged ? prev.filter(v => v !== verseKey) : [...prev, verseKey]);
    try {
      if (isFlagged) await clearError(userId, { ref: verseKey, refType: "verse" });
      else await recordError(userId, { ref: verseKey, refType: "verse", errors: 1, date: todayStr() });
    } catch { /* ostaje lokalno, sync kasnije */ }
  };

  // Snimi unesene detalje za SVAKI ajet iz upravo završenog bloka direktno u
  // Hifz Tracker (verse_progress) - isti put (saveVerseDetail) kojim ide i ručni
  // unos na Trackeru, pa se sve odmah vidi tamo (status, historija, slični ajeti, težina, greške).
  const saveDetails = async () => {
    if (!userId || !saveVerseDetail || !session) return;
    setDetSaving(true);
    const viewSt = reviewIndex != null ? session.steps[reviewIndex] : currentStep(session);
    const stepKeys = keysForStep(viewSt);
    const today = todayStr();

    for (const key of stepKeys) {
      const existing = verseStatuses?.[key] || {};
      await saveVerseDetail(key, {
        status: detStatus,
        startDate: existing.startDate || today,
        lastRepeat: detLastRepeat || today,
        repeatCount: (existing.repeatCount || 0) + detHistory.length,
        confidence: detConfidence || existing.confidence || 0,
        difficulty: detDifficulty,
        errors: detErrors,
        shortNote: existing.shortNote || "",
        notes: existing.notes || "",
        personalTefsir: existing.personalTefsir || "",
        history: [...(existing.history || []), ...detHistory],
        similarAyahs: [...(existing.similarAyahs || []), ...detSimilarNew],
      });
    }
    setDetSaving(false);
    setDetSaved(true);
  };

  const onTap = async () => {
    if (!session || session.finished) return;
    const next = tick(session);
    setSession(next);
    // blok sastavljen → ide u sistem ponavljanja + vatrena zona + zvanični
    // napredak plana (isto što "Danas učiš" radi na Dashboardu).
    if (next.finished && !savedToReview && userId) {
      try {
        await createReviewBlock(userId, {
          unitType: "ajet", items: keys, label: learning ? `Str. ${learning.from.page}–${learning.to.page}` : "",
          learnedOn: todayStr(), methodId: "tri_dana",
        });
        await addToFireZone(userId, keys);
        setSavedToReview(true);
        if (learning) await markDone(learning.lineCount);
      } catch { /* offline */ }
    }
  };

  if (keys === null) return <p className={theme.muted}>…</p>;
  if (!keys.length) return <div className={`${theme.card} rounded-2xl p-6 text-center`}><p className={theme.muted}>{s.noTaskToday}</p></div>;
  if (!session) return <p className={theme.muted}>…</p>;

  const step = currentStep(session);
  const viewStep = reviewIndex != null ? session.steps[reviewIndex] : step;
  const isReviewing = reviewIndex != null && reviewIndex !== session.stepIndex;
  const prog = sessionProgress(session);

  return (
    <div className={`${theme.card} rounded-2xl p-5 space-y-4 text-center`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className={`text-xs ${theme.muted}`}>{s.stepOf.replace("{a}", prog.step).replace("{b}", prog.totalSteps)}</div>
        <div className={`flex items-center gap-1.5 text-xs rounded-xl border px-3 py-1.5 ${isLight ? "bg-black/[0.02] border-black/6" : "bg-white/[0.02] border-white/6"}`}>
          <span className={theme.muted}>{s.reps}:</span>
          <button onClick={() => setReps((r) => Math.max(1, r - 1))} className={`${theme.cardSub} rounded-lg w-6 h-6 leading-none`}>−</button>
          <span className="font-semibold w-5 text-center">{reps}</span>
          <button onClick={() => setReps((r) => Math.min(50, r + 1))} className={`${theme.cardSub} rounded-lg w-6 h-6 leading-none`}>+</button>
        </div>
        <SessionTimer theme={theme} isLight={isLight} targetMinutes={targetMinutes}
          labels={{ start: s.timerStart, pause: s.timerPause, restart: s.timerRestart, stop: s.timerStop }} />
      </div>
      <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
        <div className={`h-full ${theme.logo} transition-all`} style={{ width: `${prog.percent}%` }} />
      </div>

      {/* ── Svi koraci - cijeli proces (ajeti/spojevi/stranica) u nizu. Završeni
          i trenutni korak su klikabilni za pregled Tracker detalja; budući
          koraci ostaju pod katancem dok se ne dođe do njih tapkanjem. ── */}
      <div className="text-left">
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${theme.muted}`}>{s.allStepsLabel}</p>
        <div className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1">
          {session.steps.map((st, idx) => {
            const isDone = idx < session.stepIndex || (session.finished && idx <= session.stepIndex);
            const isCurrent = !session.finished && idx === session.stepIndex;
            const isLocked = !isDone && !isCurrent;
            const isSelected = reviewIndex != null ? reviewIndex === idx : isCurrent;
            return (
              <button key={idx} type="button" disabled={isLocked}
                onClick={() => {
                  if (isLocked) return;
                  setReviewIndex(idx === session.stepIndex && !session.finished ? null : idx);
                }}
                title={isLocked ? s.stepLocked : shortStepLabel(st)}
                className={`shrink-0 snap-start min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                  isLocked
                    ? `opacity-40 cursor-not-allowed ${theme.cardSub} border-transparent`
                    : isSelected
                    ? `${theme.button} border-transparent`
                    : isDone
                    ? `${isLight ? "bg-green-50 border-green-200 text-green-700" : "bg-green-500/10 border-green-500/25 text-green-400"}`
                    : `${theme.cardSub} ${theme.muted} border-transparent`
                }`}>
                {isLocked ? "🔒" : isDone && !isCurrent ? "✓" : shortStepLabel(st)}
              </button>
            );
          })}
        </div>
      </div>

      {isReviewing && (
        <div className={`rounded-xl border px-3 py-2 text-xs flex items-center justify-between gap-2 flex-wrap ${isLight ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-amber-500/10 border-amber-500/25 text-amber-300"}`}>
          <span>{s.reviewingStep}</span>
          <button onClick={() => setReviewIndex(null)} className="font-semibold underline whitespace-nowrap">{s.backToCurrent}</button>
        </div>
      )}

      {session.finished ? (
        <>
          <p className="text-lg font-semibold text-green-500">{s.finished}</p>
          {savedToReview && <p className={`text-sm ${theme.accent}`}>{s.toReview}</p>}
        </>
      ) : isReviewing ? (
        <h2 className="text-xl font-bold opacity-70">{viewStep.label}</h2>
      ) : (
        <>
          <h2 className="text-xl font-bold flex items-center justify-center">
            {step.label}
            <HelpTip text={lang === "en"
              ? "Tap the big circle once per repetition — the squares below fill in as you go. When you reach the target, the app automatically moves to the next step."
              : "Tapni veliki krug jednom po ponavljanju — kvadratići ispod se pune kako napreduješ. Kad dostigneš cilj, aplikacija automatski prelazi na sljedeći korak."} />
          </h2>
          <button onClick={onTap}
            className={`${theme.button} w-40 h-40 rounded-full text-4xl font-black mx-auto shadow-xl active:scale-95 transition`}>
            {counterDisplay(session)}
          </button>
          <p className={`text-xs ${theme.muted}`}>{s.tapHint} · {counterDisplay(session)}/{session.counterMode === "down" ? "0" : step.reps}</p>

          {/* ── Kvadratići - svaki predstavlja jedno ponavljanje, popuni se kako tapkaš ── */}
          <div className="flex justify-center">
            <RepSquares total={step.reps} done={session.count} onTap={onTap} theme={theme} isLight={isLight} />
          </div>
        </>
      )}

      {/* ── Detalji za Hifz Tracker - iste komponente/polja kao na Trackeru.
          Vidljivo cijelo vrijeme dok traje sesija (i prije i poslije završetka),
          uvijek ispod gumba za odbrojavanje. ── */}
      <div className={`${theme.cardSub} rounded-2xl p-4 text-left space-y-4`}>
        <div>
          <p className="text-sm font-semibold flex items-center">
            {s.detTitle}
            <HelpTip text={lang === "en"
              ? "Same fields as Hifz Tracker, saved directly to it — no need to go there separately after this session."
              : "Isti podaci kao na Hifz Trackeru, spremaju se direktno tamo — ne moraš posebno odlaziti nakon ove sesije."} />
          </p>
          <p className={`text-[11px] font-mono mt-0.5 ${theme.accent}`}>{s.detFor}: {keysForStep(viewStep).join(", ")}</p>
          {(() => {
            const lastUpdated = keysForStep(viewStep)
              .map((k) => verseStatuses?.[k]?.updatedAt)
              .filter(Boolean)
              .sort()
              .at(-1);
            return lastUpdated ? (
              <p className={`text-[11px] mt-0.5 ${theme.muted}`}>{s.detLastUpdated}: {fmtDateTime(lastUpdated)}</p>
            ) : null;
          })()}
        </div>
        {detSaved ? (
          <p className="text-xs text-green-500">{s.detSaved}</p>
        ) : (
          <>
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${theme.muted}`}>
                {s.detStatusLabel}
              </p>
              <StatusPicker value={detStatus} onChange={setDetStatus} s={s} isLight={isLight} layout="pills" />
            </div>

            <div>
              <p className={`text-xs mb-1.5 ${theme.muted}`}>{s.detDifficulty}</p>
              <div className="flex gap-1.5">
                {[["laka", s.detEasy], ["srednja", s.detMed], ["teska", s.detHard]].map(([id, label]) => (
                  <button key={id} onClick={() => setDetDifficulty(id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${detDifficulty === id ? theme.button : `${theme.cardSub} ${theme.muted}`}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className={`text-xs mb-1.5 ${theme.muted}`}>{s.detConfidenceLabel}</p>
              <ConfidencePicker value={detConfidence} onChange={setDetConfidence} isLight={isLight} />
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-xs ${theme.muted}`}>{s.detErrors}</span>
              <Counter value={detErrors} setter={setDetErrors} small isLight={isLight} />
            </div>

            {userId && keysForStep(viewStep).length > 0 && (
              <ErrorAyahPicker
                verseKeys={keysForStep(viewStep)}
                flagged={flaggedAyahs}
                onToggle={toggleErrorAyah}
                isLight={isLight}
                label={s.errorAyahsLabel}
                hint={s.errorAyahsHint}
              />
            )}

            <div className={`pt-3 border-t ${isLight ? "border-black/10" : "border-white/10"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${theme.muted}`}>
                {s.detRepeatHistory}{detHistory.length > 0 && <span className="ml-1.5 text-[#378ADD] normal-case">({detHistory.length})</span>}
              </p>
              <RepeatHistoryInput
                history={detHistory}
                setHistory={setDetHistory}
                setRepeatCount={() => {}}
                setLastRepeat={setDetLastRepeat}
                setErrors={setDetErrors}
                isLight={isLight} s={s}
              />
            </div>

            <div className={`pt-3 border-t ${isLight ? "border-black/10" : "border-white/10"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${theme.muted}`}>{s.detSimilar}</p>
              <div className="flex gap-2">
                <input value={newSimilar} onChange={(e) => setNewSimilar(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDetSimilar()}
                  placeholder={s.detSimilarPh}
                  className={`flex-1 ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none font-mono`} />
                <button onClick={addDetSimilar}
                  className="px-3 py-2 rounded-xl bg-[#378ADD]/15 border border-[#378ADD]/30 text-[#378ADD] text-xs font-bold hover:bg-[#378ADD]/25 transition-all whitespace-nowrap">
                  + {s.detAdd}
                </button>
              </div>
              {detSimilarNew.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {detSimilarNew.map(sa => (
                    <span key={sa.id} className="px-3 py-1 rounded-full border border-[#378ADD]/30 bg-[#378ADD]/8 text-xs font-semibold text-[#378ADD] font-mono">
                      {sa.key}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={`text-xs mt-2 ${theme.muted}`}>{s.detSimilarNone || "Nema sličnih ajeta."}</p>
              )}
            </div>

            <button onClick={saveDetails} disabled={detSaving}
              className={`${theme.button} rounded-xl px-4 py-2 text-xs font-semibold ${detSaving ? "opacity-60" : ""}`}>
              {detSaving ? "…" : s.detSave}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── REDOVI (minimalan prikaz - samo trenutni raspon redova, bez ajet detalja) ──
   Za "postepeno" plan čija je tempo-jedinica "redovi" (talim_plans.state.tempoUnit
   === "redovi") - namjerno JEDNOSTAVNIJI od PostepenoTab: fokus je isključivo na
   TAČAN raspon redova koji je danas na redu (str.:red → str.:red), bez punog
   ajet-po-ajet vođenja/Tracker forme (za to nemamo dovoljno precizne podatke o
   tome gdje tačno koji ajet počinje unutar reda - vidi napomenu u hifzSync.js). ── */
function RedoviTab({ theme, s, learning, markDone, targetMinutes }) {
  const isLight = theme?.id === "beige_white";
  const [reps, setReps] = useState(20);
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  // Novi dan → resetuj brojač (ne diraj ako je isti raspon, npr. re-render).
  useEffect(() => {
    Promise.resolve().then(() => { setCount(0); setFinished(false); });
  }, [learning?.from?.page, learning?.from?.line, learning?.to?.page, learning?.to?.line]);

  const onTap = async () => {
    if (finished || !learning) return;
    const next = count + 1;
    setCount(next);
    if (next >= reps) {
      setFinished(true);
      setSaving(true);
      try { await markDone(learning.lineCount); } catch { /* offline - pokušaj kasnije */ }
      setSaving(false);
    }
  };

  if (!learning) {
    return <div className={`${theme.card} rounded-2xl p-6 text-center`}><p className={theme.muted}>{s.noTaskToday}</p></div>;
  }

  return (
    <div className={`${theme.card} rounded-2xl p-5 space-y-4 text-center`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className={`flex items-center gap-1.5 text-xs rounded-xl border px-3 py-1.5 ${isLight ? "bg-black/[0.02] border-black/6" : "bg-white/[0.02] border-white/6"}`}>
          <span className={theme.muted}>{s.reps}:</span>
          <button onClick={() => setReps((r) => Math.max(1, r - 1))} className={`${theme.cardSub} rounded-lg w-6 h-6 leading-none`}>−</button>
          <span className="font-semibold w-5 text-center">{reps}</span>
          <button onClick={() => setReps((r) => Math.min(50, r + 1))} className={`${theme.cardSub} rounded-lg w-6 h-6 leading-none`}>+</button>
        </div>
        <SessionTimer theme={theme} isLight={isLight} targetMinutes={targetMinutes}
          labels={{ start: s.timerStart, pause: s.timerPause, restart: s.timerRestart, stop: s.timerStop }} />
      </div>

      <div className={`${theme.cardSub} rounded-2xl p-4`}>
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${theme.muted}`}>{s.redoviCurrentLabel}</p>
        <p className="text-2xl font-black font-mono">
          {learning.from.page}:{learning.from.line} → {learning.to.page}:{learning.to.line}
        </p>
        <p className={`text-xs mt-1 ${theme.muted}`}>{s.redoviLinesCount.replace("{n}", learning.lineCount)}</p>
      </div>

      {finished ? (
        <p className="text-lg font-semibold text-green-500">{saving ? "…" : s.finished}</p>
      ) : (
        <>
          <button onClick={onTap}
            className={`${theme.button} w-40 h-40 rounded-full text-4xl font-black mx-auto shadow-xl active:scale-95 transition`}>
            {count}
          </button>
          <p className={`text-xs ${theme.muted}`}>{s.tapHint} · {count}/{reps}</p>
          <div className="flex justify-center">
            <RepSquares total={reps} done={count} onTap={onTap} theme={theme} isLight={isLight} />
          </div>
        </>
      )}
    </div>
  );
}

/* ── REDOM KROZ MUSHAF (zaključani napredak) ────────────────────────────── */
function RedomTab({ theme, s, userId, planId, pageStatuses, savePageDetail, verseStatuses, saveVerseDetail }) {
  const isLight = theme?.id === "beige_white";
  const [plan, setPlan] = useState(null);      // talim_plans red
  const [state, setState] = useState(null);    // redom.js stanje
  const [loading, setLoading] = useState(true);
  // "page" = uči cijelu stranicu (zadano), "ayah" = uči ajet po ajet - traka
  // ajet-chipova + prošireni prikaz izabranog, dok broj stranice ostaje vidljiv iznad.
  const [learnMode, setLearnMode] = useState("page");
  const [flaggedAyahs, setFlaggedAyahs] = useState([]);

  // ── Kvadratići za broj ponavljanja TRENUTNE stranice - svaki tap odmah
  // upisuje vremenski označeno ponavljanje u Hifz Tracker (page_repeat_history),
  // tako da je stranica jednako interaktivna kao i brojač na ajetu. ──
  const currentUnitNow = state ? currentUnit(state) : null;
  const [pageRepGoal, setPageRepGoal] = useState(0);
  const [pageRepDone, setPageRepDone] = useState(0);
  const [_localHistory, setLocalHistory] = useState([]);

  // Čisto sinhrono resetovanje brojača kad se promijeni trenutna stranica -
  // prilagođava se tokom rendera uz poređenje s prethodnim currentUnitNow
  // (isti okidač kao stari dependency niz).
  const [prevCurrentUnitNow, setPrevCurrentUnitNow] = useState(currentUnitNow);
  if (currentUnitNow !== prevCurrentUnitNow) {
    setPrevCurrentUnitNow(currentUnitNow);
    setPageRepGoal(0);
    setPageRepDone(0);
    setLocalHistory(pageStatuses?.[currentUnitNow]?.history || []);
  }

  const savePageRepHistory = (nextHist) => {
    if (!currentUnitNow || !savePageDetail) return;
    const existing = pageStatuses?.[currentUnitNow] || {};
    savePageDetail(currentUnitNow, {
      status: existing.status || "u_toku",
      startDate: existing.startDate || todayStr(),
      lastRepeat: nextHist.at(-1)?.date || existing.lastRepeat || "",
      repeatCount: nextHist.length,
      newLessonReps: existing.newLessonReps || 0,
      postLearnReps: existing.postLearnReps || 0,
      confidence: existing.confidence || 0,
      difficulty: existing.difficulty || "srednja",
      errors: existing.errors || 0,
      shortNote: existing.shortNote || "",
      notes: existing.notes || "",
      history: nextHist,
    });
  };

  const tapPageRep = () => {
    setLocalHistory((prev) => {
      const next = [...prev, { id: Date.now() + Math.random(), date: nowDateTimeLocal(), note: "", errors: 0 }];
      savePageRepHistory(next);
      return next;
    });
    setPageRepDone((v) => v + 1);
  };

  const undoPageRep = () => {
    setLocalHistory((prev) => {
      if (!prev.length) return prev;
      const next = prev.slice(0, -1);
      savePageRepHistory(next);
      return next;
    });
    setPageRepDone((v) => Math.max(0, v - 1));
  };

  const load = useCallback(async () => {
    if (!userId || !planId) { setLoading(false); return; }
    try {
      // Konkretan plan (id) - ne "prvi po metodi", jer korisnik može imati
      // više istovremeno aktivnih planova (npr. dvije sure metodom "redom").
      const { data } = await supabase.from("talim_plans").select("*")
        .eq("id", planId).eq("user_id", userId).eq("active", true).maybeSingle();
      if (data) {
        setPlan(data);
        if (data.state?.order?.length) {
          setState(data.state);
        } else {
          const pages = scopeToPages(data.scope_data);
          setState(redomCreate(pages, data.direction || "od_pocetka"));
        }
      }
    } catch { /* nema plana */ }
    setLoading(false);
  }, [userId, planId]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const confirm = async (errorFree) => {
    // Ne dozvoljavamo prelazak na sljedeću stranicu dok bilo koji ajet ove
    // stranice stoji potpuno neoznačen ("Nije počeo") - mora se bar dotaći
    // svaki ajet prije nego se ide dalje. "Bilo je grešaka" (errorFree=false)
    // ostaje uvijek dostupno, jer to svjesno produžava boravak na stranici.
    if (errorFree && !sviAjetiOznaceni) return;
    const pageJustConfirmed = errorFree ? currentUnit(state) : null;
    const next = redomConfirm(state, { errorFree });
    setState(next);
    try {
      await supabase.from("talim_plans").update({ state: next, updated_at: new Date().toISOString() }).eq("id", plan.id);
    } catch { /* lokalno ostaje */ }
    // Stranica potvrđena BEZ greške → Hifz Tracker je automatski prati kao "Naučen".
    if (pageJustConfirmed) syncLearnedPages(userId, [pageJustConfirmed]);
  };

  // Hook mora biti pozvan bezuslovno (prije mogućih ranih return-a) - otud
  // sigurna verzija broja stranice čak i dok se plan tek učitava.
  const unitForVerses = state && !state.finished ? currentUnit(state) : null;
  const { verses: pageVerses } = usePageVerses(unitForVerses);

  // Da li je SVAKI ajet ove stranice bar započet (status različit od "prazna")
  // - dok pageVerses tek učitava, ne blokiramo (fallback true) da korisnik
  // ne ostane zaglavljen ako podaci zakasne.
  const sviAjetiOznaceni = !pageVerses?.length || pageVerses.every(
    (v) => (verseStatuses?.[v.verse_key]?.status || "prazna") !== "prazna"
  );

  // Koji su ajeti OVE stranice već označeni kao greška - za AyahBrowser u
  // "ajet po ajet" modu (isti error_tracking mehanizam kao na EditFormu).
  useEffect(() => {
    let cancelled = false;
    if (!userId || !pageVerses?.length) {
      Promise.resolve().then(() => { if (!cancelled) setFlaggedAyahs([]); });
      return () => { cancelled = true; };
    }
    fetchFlaggedRefs(userId, pageVerses.map(v => v.verse_key), "verse").then((refs) => {
      if (!cancelled) setFlaggedAyahs(refs);
    });
    return () => { cancelled = true; };
  }, [userId, pageVerses]);

  const toggleErrorAyah = async (verseKey) => {
    if (!userId) return;
    const isFlagged = flaggedAyahs.includes(verseKey);
    setFlaggedAyahs(prev => isFlagged ? prev.filter(v => v !== verseKey) : [...prev, verseKey]);
    try {
      if (isFlagged) await clearError(userId, { ref: verseKey, refType: "verse" });
      else await recordError(userId, { ref: verseKey, refType: "verse", errors: 1, date: todayStr() });
    } catch { /* ostaje lokalno, sync kasnije */ }
  };

  if (loading) return <p className={theme.muted}>…</p>;
  if (!plan || !state) return <div className={`${theme.card} rounded-2xl p-6 text-center`}><p className={theme.muted}>{s.noPlan}</p></div>;

  const unit = currentUnit(state);
  const eta = estimateDaysLeft(state);

  return (
    <div className="space-y-4">
      <div className={`${theme.card} rounded-2xl p-5 space-y-4`}>
        {state.finished ? (
          <p className="text-lg font-semibold text-green-500 text-center">{s.allDone}</p>
        ) : (
          <>
            {/* Broj stranice - veliko, uvijek na vrhu */}
            <div className="text-center space-y-1">
              <div className={`text-xs uppercase tracking-wider ${theme.muted}`}>{s.current}</div>
              <div className={`text-4xl font-black ${theme.accent}`}>Str. {unit}</div>
              <p className={`text-xs ${theme.muted}`}>{s.eta.replace("{d}", eta)}</p>
              {pageStatuses?.[unit]?.updatedAt && (
                <p className={`text-[11px] ${theme.muted}`}>{s.pageLastUpdated}: {fmtDateTime(pageStatuses[unit].updatedAt)}</p>
              )}
            </div>
            <div className="w-full h-2.5 rounded-full bg-black/10 overflow-hidden">
              <div className={`h-full ${theme.logo} transition-all`} style={{ width: `${progressPercent(state)}%` }} />
            </div>

            {/* ── Mod učenja - cijela stranica (zadano) ili ajet po ajet. Broj
                stranice/ETA iznad ostaje vidljiv u oba moda. ── */}
            <div className="flex gap-2">
              {[
                { id: "page", label: s.learnModePage },
                { id: "ayah", label: s.learnModeAyah },
              ].map(m => (
                <button key={m.id} onClick={() => setLearnMode(m.id)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${learnMode === m.id ? theme.button : `${theme.cardSub} ${theme.muted}`}`}>
                  {m.label}
                </button>
              ))}
            </div>

            {learnMode === "ayah" && pageVerses?.length > 0 && (
              <AyahBrowser
                verses={pageVerses}
                verseStatuses={verseStatuses || {}}
                onSaveVerse={(verseKey, data) => saveVerseDetail?.(verseKey, data, unit)}
                userId={userId}
                flaggedAyahs={flaggedAyahs}
                onToggleError={toggleErrorAyah}
                autoSave
                theme={theme} s={s} isLight={isLight}
              />
            )}

            {learnMode === "page" && (
              <>
                {/* ── Kvadratići - koliko puta želiš ponoviti OVU stranicu, svaki tap
                    odmah upisuje ponavljanje s tačnim datumom i vremenom u Tracker. ── */}
                {unit && savePageDetail && (
                  <div className={`${theme.cardSub} rounded-xl p-4 space-y-3`}>
                    <p className={`text-xs font-semibold ${theme.muted}`}>{s.pageRepsTitle}</p>
                    <p className={`text-[11px] ${theme.muted} opacity-70 -mt-1.5`}>{s.pageRepsHint}</p>
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" max="50" value={pageRepGoal || ""}
                        onChange={(e) => setPageRepGoal(Math.max(0, Number(e.target.value) || 0))}
                        placeholder={s.pageRepsPh}
                        className={`w-20 ${theme.card} rounded-xl px-3 py-2 text-sm outline-none`} />
                      <span className={`text-xs ${theme.muted}`}>{s.pageRepsUnit}</span>
                    </div>
                    {pageRepGoal > 0 && (
                      <RepSquares total={pageRepGoal} done={pageRepDone} onTap={tapPageRep} onUndo={undoPageRep} theme={theme} isLight={isLight} />
                    )}
                    {pageRepDone > 0 && (
                      <p className={`text-[11px] ${theme.accent}`}>{s.pageRepsSaved.replace("{n}", pageRepDone)}</p>
                    )}
                  </div>
                )}

                {/* ── Detalji stranice - uvijek otvoreno (bez klika), auto-čuva se;
                    uključuje i traku ajeta ove stranice (kompaktno, proširi na klik). ── */}
                {unit && savePageDetail && (
                  <EditForm
                    pageNum={unit}
                    pageData={pageStatuses?.[unit] || {}}
                    onSave={savePageDetail}
                    theme={theme}
                    s={s}
                    userId={userId}
                    verseStatuses={verseStatuses}
                    onSaveVerse={(verseKey, data) => saveVerseDetail?.(verseKey, data, unit)}
                    alwaysOpen
                    autoSave
                    footer={
                      <div className="flex flex-col items-center gap-2 w-full">
                        <button onClick={() => confirm(true)} disabled={!sviAjetiOznaceni}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-600 text-white rounded-xl px-6 py-3 text-sm font-semibold shadow-lg w-full sm:w-auto">
                          {s.nextPage}
                        </button>
                        {!sviAjetiOznaceni && (
                          <p className={`text-[10px] text-center max-w-xs ${theme.accent}`}>{s.nextPageLockedHint}</p>
                        )}
                        <button onClick={() => confirm(false)}
                          className={`text-xs ${theme.muted} underline hover:opacity-80`}>
                          {s.confirmError}
                        </button>
                        <p className={`text-[10px] text-center max-w-xs ${theme.muted} opacity-70`}>{s.confirmErrorHint}</p>
                      </div>
                    }
                  />
                )}
              </>
            )}

            {/* ── U ajet-po-ajet modu EditForm se ne prikazuje, ali potvrda
                stranice (Sljedeća stranica / Bilo je grešaka) ostaje dostupna. ── */}
            {learnMode === "ayah" && unit && savePageDetail && (
              <div className={`flex flex-col items-center gap-2 w-full pt-2 border-t ${isLight ? "border-black/8" : "border-white/8"}`}>
                <button onClick={() => confirm(true)} disabled={!sviAjetiOznaceni}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-600 text-white rounded-xl px-6 py-3 text-sm font-semibold shadow-lg w-full sm:w-auto">
                  {s.nextPage}
                </button>
                {!sviAjetiOznaceni && (
                  <p className={`text-[10px] text-center max-w-xs ${theme.accent}`}>{s.nextPageLockedHint}</p>
                )}
                <button onClick={() => confirm(false)}
                  className={`text-xs ${theme.muted} underline hover:opacity-80`}>
                  {s.confirmError}
                </button>
                <p className={`text-[10px] text-center max-w-xs ${theme.muted} opacity-70`}>{s.confirmErrorHint}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* vizuelni niz: savladano / trenutno / zaključano */}
      <div className={`${theme.card} rounded-2xl p-4`}>
        <div className="flex flex-wrap gap-1.5">
          {state.order.slice(Math.max(0, state.currentIndex - 5), state.currentIndex + 15).map((u, i) => {
            const idx = Math.max(0, state.currentIndex - 5) + i;
            const status = idx < state.currentIndex ? "done" : idx === state.currentIndex ? "current" : "locked";
            return (
              <span key={u} title={status === "done" ? s.done : status === "current" ? s.unlocked : s.locked}
                className={`text-xs px-2 py-1 rounded-lg ${
                  status === "done" ? "bg-green-600 text-white"
                  : status === "current" ? theme.button
                  : `${theme.cardSub} ${theme.muted} opacity-50`}`}>
                {status === "locked" ? "🔒" : ""}{u}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── KRUGOVI (bosanska metoda 20 krugova) ───────────────────────────────── */
function KrugoviTab({ theme, s, userId, planId, pageStatuses, savePageDetail }) {
  const isLight = theme?.id === "beige_white";
  const [plan, setPlan] = useState(null);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !planId) { setLoading(false); return; }
    try {
      // Konkretan plan (id) - ne "prvi po metodi", isti razlog kao u RedomTab.
      const { data } = await supabase.from("talim_plans").select("*")
        .eq("id", planId).eq("user_id", userId).eq("active", true).maybeSingle();
      if (data) {
        setPlan(data);
        setState(data.state?.krug ? data.state : krugoviCreate());
      }
    } catch { /* nema plana */ }
    setLoading(false);
  }, [userId, planId]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const task = state ? krugoviTodayTask(state) : null;
  const currentUnitNow = task?.learn?.page || null;

  // ── Kvadratići za broj ponavljanja TRENUTNE stranice - isti mehanizam kao
  // na "Redom kroz mushaf". ──
  const [pageRepGoal, setPageRepGoal] = useState(0);
  const [pageRepDone, setPageRepDone] = useState(0);
  const [_localHistory, setLocalHistory] = useState([]);

  // Čisto sinhrono resetovanje brojača kad se promijeni trenutna stranica -
  // prilagođava se tokom rendera uz poređenje s prethodnim currentUnitNow
  // (isti okidač kao stari dependency niz).
  const [prevCurrentUnitNow, setPrevCurrentUnitNow] = useState(currentUnitNow);
  if (currentUnitNow !== prevCurrentUnitNow) {
    setPrevCurrentUnitNow(currentUnitNow);
    setPageRepGoal(0);
    setPageRepDone(0);
    setLocalHistory(pageStatuses?.[currentUnitNow]?.history || []);
  }

  const savePageRepHistory = (nextHist) => {
    if (!currentUnitNow || !savePageDetail) return;
    const existing = pageStatuses?.[currentUnitNow] || {};
    savePageDetail(currentUnitNow, {
      status: existing.status || "u_toku",
      startDate: existing.startDate || todayStr(),
      lastRepeat: nextHist.at(-1)?.date || existing.lastRepeat || "",
      repeatCount: nextHist.length,
      newLessonReps: existing.newLessonReps || 0,
      postLearnReps: existing.postLearnReps || 0,
      confidence: existing.confidence || 0,
      difficulty: existing.difficulty || "srednja",
      errors: existing.errors || 0,
      shortNote: existing.shortNote || "",
      notes: existing.notes || "",
      history: nextHist,
    });
  };

  const tapPageRep = () => {
    setLocalHistory((prev) => {
      const next = [...prev, { id: Date.now() + Math.random(), date: nowDateTimeLocal(), note: "", errors: 0 }];
      savePageRepHistory(next);
      return next;
    });
    setPageRepDone((v) => v + 1);
  };

  const undoPageRep = () => {
    setLocalHistory((prev) => {
      if (!prev.length) return prev;
      const next = prev.slice(0, -1);
      savePageRepHistory(next);
      return next;
    });
    setPageRepDone((v) => Math.max(0, v - 1));
  };

  const complete = async () => {
    if (!state || !task) return;
    const learnedPage = task.learn?.page;
    const next = krugoviCompleteDay(state);
    setState(next);
    try {
      await supabase.from("talim_plans").update({ state: next, updated_at: new Date().toISOString() }).eq("id", plan.id);
    } catch { /* lokalno ostaje */ }
    if (learnedPage) syncLearnedPages(userId, [learnedPage]);
  };

  if (loading) return <p className={theme.muted}>…</p>;
  if (!plan || !state) return <div className={`${theme.card} rounded-2xl p-6 text-center`}><p className={theme.muted}>{s.krugNoPlan}</p></div>;

  const info = krugoviProgressInfo(state);
  const eta = krugoviEta(state);

  return (
    <div className="space-y-4">
      <div className={`${theme.card} rounded-2xl p-5 text-center space-y-3`}>
        {state.finished ? (
          <p className="text-lg font-semibold text-green-500">{s.allDone}</p>
        ) : task ? (
          <>
            <div className={`text-xs uppercase tracking-wider ${theme.muted}`}>{s.krugCurrent.replace("{k}", info.krug)}</div>
            <div className={`text-4xl font-black ${theme.accent}`}>Str. {task.learn.page}</div>
            <p className={`text-xs ${theme.muted}`}>{s.krugJuz} {task.learn.juz}</p>
            <p className={`text-xs ${theme.muted}`}>
              {s.krugReview}: {task.review.length > 0 ? task.review.map((r) => `str. ${r.page} (krug ${r.krug})`).join(", ") : (s.krugReviewNone || "nema")}
            </p>
            <button onClick={complete} className={`${theme.button} rounded-xl px-6 py-2.5 text-sm`}>
              {s.krugConfirm}
            </button>
            <p className={`text-xs ${theme.muted}`}>{s.eta.replace("{d}", eta)}</p>
            {pageStatuses?.[task.learn.page]?.updatedAt && (
              <p className={`text-[11px] ${theme.muted}`}>{s.pageLastUpdated}: {fmtDateTime(pageStatuses[task.learn.page].updatedAt)}</p>
            )}
          </>
        ) : null}
        <div className="w-full h-2.5 rounded-full bg-black/10 overflow-hidden">
          <div className={`h-full ${theme.logo} transition-all`} style={{ width: `${info.percent}%` }} />
        </div>
      </div>

      {!state.finished && task && savePageDetail && (
        <div className={`${theme.card} rounded-2xl p-4 space-y-3`}>
          <p className={`text-xs font-semibold ${theme.muted}`}>{s.pageRepsTitle}</p>
          <p className={`text-[11px] ${theme.muted} opacity-70 -mt-1.5`}>{s.pageRepsHint}</p>
          <div className="flex items-center gap-2">
            <input type="number" min="1" max="50" value={pageRepGoal || ""}
              onChange={(e) => setPageRepGoal(Math.max(0, Number(e.target.value) || 0))}
              placeholder={s.pageRepsPh}
              className={`w-20 ${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`} />
            <span className={`text-xs ${theme.muted}`}>{s.pageRepsUnit}</span>
          </div>
          {pageRepGoal > 0 && (
            <RepSquares total={pageRepGoal} done={pageRepDone} onTap={tapPageRep} onUndo={undoPageRep} theme={theme} isLight={isLight} />
          )}
          {pageRepDone > 0 && (
            <p className={`text-[11px] ${theme.accent}`}>{s.pageRepsSaved.replace("{n}", pageRepDone)}</p>
          )}
        </div>
      )}

      {!state.finished && task && savePageDetail && (
        <div className={`${theme.card} rounded-2xl px-4`}>
          <EditForm
            pageNum={task.learn.page}
            pageData={pageStatuses?.[task.learn.page] || {}}
            onSave={savePageDetail}
            theme={theme}
            s={s}
            userId={userId}
          />
        </div>
      )}
    </div>
  );
}

/* ── HALKA (učenik) - vidi šta je muallim zadao, označi pripremljeno ─────── */
function HalkaTab({ theme, s, userId, planId }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !planId) { setLoading(false); return; }
    try {
      // Konkretan plan (id) - ne "prvi po metodi", isti razlog kao u RedomTab
      // (korisnik može imati više istovremeno aktivnih halka planova, npr. po suri).
      const { data } = await supabase.from("talim_plans").select("id, state")
        .eq("id", planId).eq("user_id", userId).eq("active", true).maybeSingle();
      if (data?.state?.parts) { setPlan(data.state); }
    } catch { /* nema */ }
    setLoading(false);
  }, [userId, planId]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const markPrepared = async () => {
    const next = halkaMarkPrepared(plan);
    setPlan(next);
    try { await supabase.from("talim_plans").update({ state: next, updated_at: new Date().toISOString() }).eq("id", planId); } catch { /* */ }
  };

  if (loading) return <p className={theme.muted}>…</p>;
  if (!plan) return <div className={`${theme.card} rounded-2xl p-6 text-center`}><p className={theme.muted}>{s.halkaNoPlan}</p></div>;

  const part = halkaCurrentPart(plan);

  return (
    <div className="space-y-4">
      <div className={`${theme.card} rounded-2xl p-5 text-center space-y-3`}>
        <div className={`text-sm font-bold ${theme.accent}`}>{halkaPercent(plan)}%</div>
        <div className="w-full h-2.5 rounded-full bg-black/10 overflow-hidden">
          <div className={`h-full ${theme.logo} transition-all`} style={{ width: `${halkaPercent(plan)}%` }} />
        </div>
        {plan.finished ? (
          <p className="text-lg font-semibold text-green-500">{s.halkaDone}</p>
        ) : part && (
          <>
            <div className={`text-xs uppercase tracking-wider ${theme.muted}`}>{s.halkaCurrent}</div>
            <div className="text-xl font-bold">{part.label}</div>
            {part.mentorNote && <p className={`text-sm ${theme.accent}`}>💬 {part.mentorNote}</p>}
            {part.deadline && <p className={`text-xs ${theme.muted}`}>⏰ {part.deadline}</p>}
            {part.state === "zadano" ? (
              <button onClick={markPrepared} className={`${theme.button} rounded-xl px-6 py-2.5 text-sm`}>
                {s.halkaPrepared}
              </button>
            ) : (
              <p className={`text-sm ${theme.muted}`}>{s.halkaWaiting}</p>
            )}
          </>
        )}
      </div>

      <div className={`${theme.card} rounded-2xl p-4`}>
        <ul className="space-y-1">
          {plan.parts.map((p) => (
            <li key={p.id} className="text-sm flex items-center gap-2">
              <span>{p.state === "odobreno" ? "✅" : p.state === "pripremljeno" ? "📖" : p.state === "zadano" ? "▶️" : "🔒"}</span>
              <span className={p.state === "zakljucano" ? `${theme.muted} opacity-50` : ""}>{p.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
