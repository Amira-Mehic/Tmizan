// ============================================================================
// Ta'lim - servis koji spaja generator mjesečnog plana (mjesecniPlan.js) s
// bazom: učitava aktivni plan, AUTOMATSKI generiše (rolluje) mjesečni plan
// za mjesec koji još nema red u bazi (nastavljajući od kraja prethodnog),
// i upisuje stvarno naučeno kad korisnik označi dan kao urađen.
//
// Ovo je jedino mjesto koje zna kako "sedmični slobodni dani" (state.restWeekdays,
// npr. [5,6] = petak i subota, JS Date.getDay() 0=nedjelja..6=subota) postaju
// konkretni datumi za dati mjesec - koristi ga i čarobnjak (pri aktivaciji) i
// dashboard/hub (za automatski rollover sljedećeg mjeseca).
// ============================================================================

import { supabase } from "../../services/SupaBaseClient";
import { generateMonthlyPlan, monthDates, regenerateFromTempo, generateMonthlyPlanByAyahs, regenerateAyahPlanFromTempo } from "./mjesecniPlan";
import { scopeToPages, getEdition } from "./mushaf";
import { recalcPlan } from "./planner";
import { todayStr } from "../../constants/hifz/helpers";
import { ayahsInPages } from "./hifzSync";

// Plan čija je tempo-jedinica "ajeti" (talim_plans.state.tempoUnit === "ajeti")
// dijeli dane po BROJU AJETA (generateMonthlyPlanByAyahs), potpuno neovisno od
// redova/stranica - vidi mjesecniPlan.js za detalje. Ostale dvije jedinice
// (redovi/stranice) i dalje idu kroz postojeći linijski generator ispod.
const isAjetiTempo = (talimPlan) => talimPlan?.state?.tempoUnit === "ajeti";

// ── Sedmični obrazac pauze → konkretni datumi mjeseca ───────────────────────
export function weekdaysToRestDates(year, month, restWeekdays) {
  if (!restWeekdays?.length) return [];
  const set = new Set(restWeekdays);
  return monthDates(year, month).filter((d) => {
    const [y, m, dd] = d.split("-").map(Number);
    return set.has(new Date(y, m - 1, dd).getDay());
  });
}

// ── SVI aktivni planovi učenja korisnika (može ih biti više istovremeno -
//    "cijeli Kur'an" je uvijek sam, sura/džuz/raspon planovi mogu koegzistirati,
//    vidi TalimWizard.jsx activate()). Poredano po datumu kreiranja. ──────────
export async function fetchActiveTalimPlans(userId) {
  if (!userId) return [];
  const { data } = await supabase.from("talim_plans").select("*")
    .eq("user_id", userId).eq("active", true).order("created_at", { ascending: true });
  return data || [];
}

// Zadržano radi kompatibilnosti s pozivima koji (još) znaju raditi samo s
// JEDNIM planom - vraća prvi aktivni. Novi kod treba koristiti gornju
// (plural) verziju i raditi eksplicitno po plan.id.
export async function fetchActiveTalimPlan(userId) {
  const plans = await fetchActiveTalimPlans(userId);
  return plans[0] || null;
}

// ── Dohvati mjesečni plan za (year, month) KONKRETNOG plana (plan.id); ako ne
//    postoji, generiši i sačuvaj ga (nastavak od kraja prethodnog mjeseca ISTOG
//    plana) - "auto rollover". monthly_plans je vezan za plan_id (ne samo
//    user_id) da dva istovremeno aktivna plana ne bi kolidirala na istom mjesecu.
export async function ensureMonthlyPlan(userId, talimPlan, year, month) {
  if (!userId || !talimPlan) return null;

  const { data: existing } = await supabase.from("monthly_plans").select("*")
    .eq("plan_id", talimPlan.id).eq("year", year).eq("month", month).maybeSingle();
  if (existing) return existing;

  let startLine = talimPlan.learned_lines || 0;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  try {
    const { data: prev } = await supabase.from("monthly_plans").select("end_line")
      .eq("plan_id", talimPlan.id).eq("year", prevYear).eq("month", prevMonth).maybeSingle();
    if (prev?.end_line != null) startLine = Math.max(startLine, prev.end_line);
  } catch { /* nema prethodnog mjeseca - počni od learned_lines */ }

  let pages = [];
  try { pages = scopeToPages(talimPlan.scope_data); } catch { pages = []; }
  if (!pages.length) return null;

  const restWeekdays = talimPlan.state?.restWeekdays || [];
  const restDays = weekdaysToRestDates(year, month, restWeekdays);

  // ── "ajeti" tempo - potpuno odvojen put, broji ajete, ne redove ──
  if (isAjetiTempo(talimPlan)) {
    const ayahKeys = await ayahsInPages(pages);
    if (!ayahKeys.length || startLine >= ayahKeys.length) return null;
    const ayahsPerDay = talimPlan.state?.ajetiPerDay || 1;
    const plan = generateMonthlyPlanByAyahs({ year, month, ayahKeys, ayahsPerDay, startIndex: startLine, restDays });
    const row = {
      user_id: userId, plan_id: talimPlan.id, year, month, days: plan.days, end_line: plan.endIndex,
      rest_days: restDays, updated_at: new Date().toISOString(),
    };
    const { data: saved } = await supabase.from("monthly_plans")
      .upsert(row, { onConflict: "plan_id,year,month" }).select().maybeSingle();
    return saved || row;
  }

  const totalLines = pages.length * getEdition(talimPlan.mushaf_edition).linesPerPage;
  if (startLine >= totalLines) return null; // plan je već kompletno naučen

  const plan = generateMonthlyPlan({
    year, month, pages, editionId: talimPlan.mushaf_edition,
    linesPerDay: talimPlan.lines_per_day, restDays, startLine,
  });

  const row = {
    user_id: userId, plan_id: talimPlan.id, year, month, days: plan.days, end_line: plan.endLine,
    rest_days: restDays, updated_at: new Date().toISOString(),
  };

  const { data: saved } = await supabase.from("monthly_plans")
    .upsert(row, { onConflict: "plan_id,year,month" }).select().maybeSingle();

  return saved || row;
}

// ── Ručna promjena tempa ("Uredi tempo") → prikazani raspored MORA odražavati
//    novi tempo odmah, ne tek sljedeći mjesec. Regeneriše samo dane koji još
//    nisu naučeni (d.done); već naučeni dani ostaju netaknuti (historija).
export async function regenerateMonthlyPlan(userId, talimPlan, year, month) {
  if (!userId || !talimPlan) return null;

  const { data: existing } = await supabase.from("monthly_plans").select("*")
    .eq("plan_id", talimPlan.id).eq("year", year).eq("month", month).maybeSingle();
  if (!existing) return ensureMonthlyPlan(userId, talimPlan, year, month);

  let pages = [];
  try { pages = scopeToPages(talimPlan.scope_data); } catch { pages = []; }
  if (!pages.length) return existing;

  const restWeekdays = talimPlan.state?.restWeekdays || [];
  const restDays = weekdaysToRestDates(year, month, restWeekdays);

  // ── "ajeti" tempo - potpuno odvojen put, broji ajete, ne redove ──
  if (isAjetiTempo(talimPlan)) {
    const ayahKeys = await ayahsInPages(pages);
    if (!ayahKeys.length) return existing;
    const doneAyahs = existing.days
      .filter((d) => d.done)
      .reduce((sum, d) => sum + (Number(d.actualLines) || d.learning?.amount || 0), 0);
    const startIndex = Math.max(talimPlan.learned_lines || 0, doneAyahs);
    if (startIndex >= ayahKeys.length) return existing;
    const ayahsPerDay = talimPlan.state?.ajetiPerDay || 1;
    const regen = regenerateAyahPlanFromTempo(existing, { ayahKeys, ayahsPerDay, restDays, startIndex, today: todayStr() });
    const row = {
      user_id: userId, plan_id: talimPlan.id, year, month, days: regen.days, end_line: regen.endIndex,
      rest_days: restDays, updated_at: new Date().toISOString(),
    };
    const { data: saved } = await supabase.from("monthly_plans")
      .upsert(row, { onConflict: "plan_id,year,month" }).select().maybeSingle();
    return saved || row;
  }

  const totalLines = pages.length * getEdition(talimPlan.mushaf_edition).linesPerPage;

  // startLine = stvarno naučeno do sada (talim_plans.learned_lines je izvor istine,
  // ali se uzima u obzir i zaostatak iz dana označenih kao odrađeni u ovom mjesecu)
  const doneLines = existing.days
    .filter((d) => d.done)
    .reduce((sum, d) => sum + (Number(d.actualLines) || d.learning?.lineCount || 0), 0);
  const startLine = Math.max(talimPlan.learned_lines || 0, doneLines);
  if (startLine >= totalLines) return existing;

  const regen = regenerateFromTempo(existing, {
    pages, editionId: talimPlan.mushaf_edition, linesPerDay: talimPlan.lines_per_day,
    restDays, startLine, today: todayStr(),
  });

  const row = {
    user_id: userId, plan_id: talimPlan.id, year, month, days: regen.days, end_line: regen.endLine,
    rest_days: restDays, updated_at: new Date().toISOString(),
  };

  const { data: saved } = await supabase.from("monthly_plans")
    .upsert(row, { onConflict: "plan_id,year,month" }).select().maybeSingle();

  return saved || row;
}

// ── Nakon promjene tempa, budući mjeseci (koji su možda već generisani unaprijed
//    a nemaju nijedan "done" dan) su čista projekcija - sigurno ih je obrisati da
//    se ponovo generišu s novim tempom kad ih korisnik otvori (ensureMonthlyPlan).
export async function invalidateFutureMonths(userId, planId, fromYear, fromMonth) {
  if (!userId || !planId) return;
  try {
    const { data: rows } = await supabase.from("monthly_plans")
      .select("year, month").eq("plan_id", planId);
    const stale = (rows || []).filter(
      (r) => r.year > fromYear || (r.year === fromYear && r.month > fromMonth)
    );
    for (const r of stale) {
      await supabase.from("monthly_plans").delete()
        .eq("plan_id", planId).eq("year", r.year).eq("month", r.month);
    }
  } catch { /* nije kritično - najgore je da stari raspored ostane do sljedeće posjete */ }
}

// ── Označi dan kao naučen (sa stvarno unesenom količinom redova) ───────────
// Ažurira monthly_plans.days, talim_plans.learned_lines (kumulativno), AUTOMATSKI
// preračunava procijenjeni datum završetka (isti tempo, novi datum - korisnik ne
// mora ništa ručno kliknuti) i piše u talim_daily_log (evidencija/historija).
export async function markDayDone(userId, talimPlan, monthlyPlan, date, actualLines) {
  if (!userId || !talimPlan || !monthlyPlan) return null;

  const days = monthlyPlan.days.map((d) => (d.date === date ? { ...d, done: true, actualLines } : d));
  const day = days.find((d) => d.date === date);

  await supabase.from("monthly_plans").update({
    days, updated_at: new Date().toISOString(),
  }).eq("id", monthlyPlan.id);

  const newLearned = (talimPlan.learned_lines || 0) + Number(actualLines || 0);

  // automatski preračun datuma završetka (isti tempo - samo se datum pomjera
  // naprijed/nazad zavisno od toga da li je korisnik naučio manje ili više od plana)
  // Preračun je linijski (planner.js), pa se kod "ajeti" tempa
  // u learned_lines zapravo broje AJETI, pa se preciznost datuma tu ne
  // preračunava, nego ostaje postojeći procijenjeni datum. Glavni napredak
  // (learned_lines/talim_daily_log) i dalje ide tačno.
  let newTargetDate = talimPlan.target_date;
  if (!isAjetiTempo(talimPlan)) {
    try {
      const pages = scopeToPages(talimPlan.scope_data);
      const totalLines = pages.length * getEdition(talimPlan.mushaf_edition).linesPerPage;
      const res = recalcPlan({
        totalLines, learnedLines: newLearned,
        startDate: talimPlan.start_date, targetDate: talimPlan.target_date,
        today: date, keep: "tempo", newLinesPerDay: talimPlan.lines_per_day,
        editionId: talimPlan.mushaf_edition, restWeekdays: talimPlan.state?.restWeekdays || [],
      });
      if (!res.done && res.targetDate) newTargetDate = res.targetDate;
    } catch { /* ako preračun ne uspije, zadrži postojeći datum */ }
  }

  await supabase.from("talim_plans").update({
    learned_lines: newLearned, target_date: newTargetDate, updated_at: new Date().toISOString(),
  }).eq("id", talimPlan.id);

  try {
    await supabase.from("talim_daily_log").upsert({
      plan_id: talimPlan.id, log_date: date,
      planned_lines: day?.learning?.lineCount ?? day?.learning?.amount ?? 0, learned_lines: Number(actualLines || 0),
    }, { onConflict: "plan_id,log_date" });
  } catch { /* evidencija je bonus, ne blokira glavni tok */ }

  return { days, learned_lines: newLearned, target_date: newTargetDate };
}
