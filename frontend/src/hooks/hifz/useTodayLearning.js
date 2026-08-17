// ============================================================================
// useTodayLearning / useActiveLearningPlans / useLearningForPlanId - jedan
// izvor istine za "šta danas učim", sad svjestan da korisnik MOŽE imati VIŠE
// istovremeno aktivnih planova (jedan "cijeli Kur'an" je uvijek sam; sura/
// džuz/raspon planovi mogu koegzistirati - vidi TalimWizard.jsx activate()).
//
// useActiveLearningPlans() - osnovni hook: učitava SVE aktivne planove i za
//   SVAKI osigurava (auto-generiše) mjesečni raspored tekućeg mjeseca, računa
//   zaostatak/napredak, nudi markDone(planId, actualLines). Koristi ga
//   Dashboard (kartica po planu) i traka planova na Učenju danas.
//
// useTodayLearning() - tanka omotnica oko gornjeg, zadržava STARI (jednostruki)
//   oblik povratne vrijednosti, radi kompatibilnosti sa postojećim pozivima
//   (uvijek PRVI aktivni plan).
//
// useLearningForPlanId(planId) - tanka omotnica koja bira KONKRETAN plan iz
//   liste aktivnih (ili prvi, ako planId nije dat) - koristi je Učenje danas
//   stranica kad se otvori za određeni plan.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { todayStr } from "../../constants/hifz/helpers";
import { scopeToPages, getEdition } from "../../features/talim/mushaf";
import { progressStatus, countWorkingDays } from "../../features/talim/planner";
import { fetchActiveTalimPlans, ensureMonthlyPlan, markDayDone as markDayDoneService } from "../../features/talim/monthlyPlanService";
import { syncLearnedLineRange } from "../../features/talim/hifzSync";
import { createProgress as redomCreate, currentUnit as redomCurrentUnit } from "../../features/talim/redom";
import { createProgress as krugoviCreate, todayTask as krugoviTodayTask } from "../../features/talim/krugovi";
import { currentPart as halkaCurrentPart } from "../../features/talim/halka";

// "Postepeno" je jedina metoda vezana za linearni mjesečni raspored
// (monthly_plans, tempo u redovima/stranicama/ajetima). Redom, Krugovi i
// Halka imaju SVOJU mašinu stanja u talim_plans.state (vidi RedomTab/
// KrugoviTab/HalkaTab u UcenjeSession.jsx) - "šta je danas na redu" se za
// njih računa DIREKTNO iz tog stanja, da Dashboard i Učenje danas uvijek
// pokazuju isto, tačno gradivo (a ne pogrešnu liniju izvedenu iz tempa).
function methodLearningFor(tp) {
  if (tp.method === "redom") {
    const state = tp.state?.order?.length
      ? tp.state
      : redomCreate(scopeToPages(tp.scope_data), tp.direction || "od_pocetka");
    const page = redomCurrentUnit(state);
    return page ? { unit: "redom", page } : null;
  }
  if (tp.method === "krugovi") {
    const state = tp.state?.krug ? tp.state : krugoviCreate();
    const task = krugoviTodayTask(state);
    return task?.learn ? { unit: "krugovi", page: task.learn.page, juz: task.learn.juz, krug: state.krug } : null;
  }
  if (tp.method === "halka") {
    if (!tp.state?.parts) return null;
    const part = halkaCurrentPart(tp.state);
    return part ? { unit: "halka", label: part.label, waitingMualim: part.state === "pripremljeno" } : null;
  }
  return null;
}

export function useActiveLearningPlans() {
  const { user } = useAuth();
  const userId = user?.id;
  const today = todayStr();

  // entries: [{ talimPlan, monthlyPlan, learning, isRest, doneToday, progress }]
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const plans = await fetchActiveTalimPlans(userId);
      const d = new Date();
      const results = await Promise.all(plans.map(async (tp) => {
        let monthlyPlan = null;
        try { monthlyPlan = await ensureMonthlyPlan(userId, tp, d.getFullYear(), d.getMonth() + 1); } catch { monthlyPlan = null; }
        const todayEntry = monthlyPlan?.days?.find((day) => day.date === today) || null;

        // Redom / Krugovi / Halka ne prate linearni mjesečni raspored - "šta
        // je danas na redu" izvodi se direktno iz njihovog vlastitog stanja
        // (isto što će Učenje danas i pokazati), umjesto pogrešnog reda
        // izvedenog iz tempa u redovima/strancama/ajetima.
        if (tp.method !== "postepeno") {
          return {
            talimPlan: tp, monthlyPlan,
            learning: methodLearningFor(tp),
            isRest: false, doneToday: false, progress: null,
          };
        }

        let progress = null;
        try {
          const pages = scopeToPages(tp.scope_data);
          const totalLines = pages.length * getEdition(tp.mushaf_edition).linesPerPage;
          const restWeekdays = tp.state?.restWeekdays || [];
          const workingDays = countWorkingDays(tp.start_date, today, restWeekdays);
          const plannedLinesToDate = Math.min(totalLines, tp.lines_per_day * workingDays);
          progress = progressStatus({
            totalLines, learnedLines: tp.learned_lines || 0,
            plannedLinesToDate, linesPerDay: tp.lines_per_day, today, restWeekdays,
          });
        } catch { progress = null; }

        return {
          talimPlan: tp, monthlyPlan,
          learning: todayEntry?.learning || null,
          isRest: !!todayEntry?.isRest,
          doneToday: !!todayEntry?.done,
          progress,
        };
      }));
      setEntries(results);
    } catch { setEntries([]); }
    setLoading(false);
  }, [userId, today]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const markDone = async (planId, actualLines) => {
    const entry = entries.find((e) => e.talimPlan.id === planId);
    if (!userId || !entry || !entry.monthlyPlan) return;
    setSavingId(planId);
    try {
      const todayEntry = entry.monthlyPlan.days.find((d) => d.date === today);
      const res = await markDayDoneService(userId, entry.talimPlan, entry.monthlyPlan, today, actualLines);
      setEntries((prev) => prev.map((e) => e.talimPlan.id !== planId ? e : {
        ...e,
        monthlyPlan: { ...e.monthlyPlan, days: res.days },
        talimPlan: { ...e.talimPlan, learned_lines: res.learned_lines, target_date: res.target_date },
        doneToday: true,
      }));
      // Hifz Tracker automatski prati isto ovo dnevno učenje - nema potrebe da
      // korisnik ručno duplo označava stranice tamo. Kod "ajeti" tempa from/to
      // su {surah,ayah}, a ne {page,line}, pa se sinhronizacija stranica tu
      // namjerno preskače - syncLearnedLineRange radi samo sa page/line.
      if (todayEntry?.learning && todayEntry.learning.unit !== "ajeti") {
        syncLearnedLineRange(userId, entry.talimPlan.mushaf_edition, todayEntry.learning.from, todayEntry.learning.to);
      }
    } catch { /* ostaje kako je bilo, korisnik može pokušati ponovo */ }
    setSavingId(null);
  };

  return { loading, entries, savingId, markDone, reload: load };
}

// ── Kompatibilna omotnica: STARI (jednostruki) oblik, uvijek prvi aktivni plan ──
export function useTodayLearning() {
  const { loading, entries, savingId, markDone, reload } = useActiveLearningPlans();
  const first = entries[0] || null;
  return {
    loading, saving: first ? savingId === first.talimPlan.id : false,
    talimPlan: first?.talimPlan || null,
    today: todayStr(),
    learning: first?.learning || null,
    isRest: !!first?.isRest,
    doneToday: !!first?.doneToday,
    progress: first?.progress || null,
    markDone: (actualLines) => (first ? markDone(first.talimPlan.id, actualLines) : Promise.resolve()),
    reload,
  };
}

// ── Omotnica za KONKRETAN plan (Učenje danas, otvoreno za jedan plan_id) -
// vraća i `allPlans` (svi aktivni, za traku za biranje) uz podatke za odabrani. ──
export function useLearningForPlanId(planId) {
  const { loading, entries, savingId, markDone, reload } = useActiveLearningPlans();
  const entry = (planId ? entries.find((e) => e.talimPlan.id === planId) : entries[0]) || null;
  return {
    loading, saving: entry ? savingId === entry.talimPlan.id : false,
    talimPlan: entry?.talimPlan || null,
    today: todayStr(),
    learning: entry?.learning || null,
    isRest: !!entry?.isRest,
    doneToday: !!entry?.doneToday,
    progress: entry?.progress || null,
    markDone: (actualLines) => (entry ? markDone(entry.talimPlan.id, actualLines) : Promise.resolve()),
    reload,
    allPlans: entries.map((e) => e.talimPlan),
  };
}
