// ============================================================================
// Kružne metode (Motor A) - servis: veže motorA.js / dinamicna.js / femi.js
// na bazu.
//
// Svaka stranica ima svoj datum sljedećeg ponavljanja
// (page_progress.sljedece_ponavljanje), ili za Dinamičnu/Femi - svoje
// zadnje ponavljanje (page_progress.last_repeat) uz mali plan-level
// parametar (cycle_start u rotation_state). rotation_state / femi_state
// čuvaju SAMO parametre plana (koje stranice su u bazenu, kvota, broj
// dijelova, početak ciklusa) - ne i sam raspored po stranici.
//
// Motori (motorA.js/dinamicna.js/femi.js) računaju "šta je danas"; servis
// samo čita/piše.
// ============================================================================

import { supabase } from "../../services/SupaBaseClient";
import { partitionPages, seedCycle, dueGroups, duePages, flattenMotorAToday } from "./motorA.js";
import { dinamicnaToday, completeDinamicnaCycle } from "./dinamicna.js";
import { femiToday, completeFemiWeek, juzWeeklyToday, completeJuzWeek } from "./femi.js";
import { addDays } from "./engine.js";
import { getJuzForPage, getJuzPages, todayStr } from "../../constants/hifz/helpers.js";
import { shouldDemote, removeFromPool } from "./motorTransition.js";
import { createReviewBlock } from "./murajaahService.js";

// ── Koje stranice pokriva jedan plan (rotation_state red) ───────────────────
function pagesForParams(p) {
  if (p.type === "dzuzevi") return p.items.flatMap((juz) => getJuzPages(juz));
  return p.items; // stranice / seton / dinamicna već čuvaju sirove stranice
}

// ── DB red (parametri) → oblik koji motori/UI očekuju ───────────────────────
function rotRowToParams(row) {
  return {
    type: row.method, items: row.items || [], quota: row.quota,
    parts: row.parts, cyclesDone: row.cycles_done || 0, cycleStart: row.cycle_start || null,
  };
}

// ── Dohvati sve kružne metode korisnika + page_progress stanje njihovih
//    stranica (jednim dodatnim upitom, ne po stranici). ─────────────────────
export async function fetchRotationStates(userId) {
  const { data, error } = await supabase.from("rotation_state").select("*").eq("user_id", userId);
  if (error) throw error;
  const params = (data || []).map(rotRowToParams);
  if (!params.length) return [];

  const allPages = [...new Set(params.flatMap(pagesForParams))];
  const { data: ppRows, error: ppErr } = await supabase
    .from("page_progress")
    .select("page_number, sljedece_ponavljanje, last_repeat")
    .eq("user_id", userId)
    .in("page_number", allPages.length ? allPages : [0]);
  if (ppErr) throw ppErr;

  const ppByPage = new Map((ppRows || []).map((r) => [r.page_number, r]));
  return params.map((p) => ({ ...p, pageProgress: ppByPage }));
}

export async function fetchFemiStates(userId) {
  const { data, error } = await supabase.from("femi_state").select("*").eq("user_id", userId);
  if (error) throw error;
  const rows = data || [];
  if (!rows.length) return [];

  const allPages = [...new Set(rows.flatMap((r) => (r.method === "femi" ? (r.items || []) : getJuzPages((r.items || [])[r.juz_index || 0]))))];
  const { data: ppRows, error: ppErr } = await supabase
    .from("page_progress")
    .select("page_number, last_repeat")
    .eq("user_id", userId)
    .in("page_number", allPages.length ? allPages : [0]);
  if (ppErr) throw ppErr;
  const ppByPage = new Map((ppRows || []).map((r) => [r.page_number, r]));

  return rows.map((r) => ({
    method: r.method,
    items: r.items || [],       // "femi": sve stranice bazena. "dzuz_sedmicno": naučeni džuzevi
    juzIndex: r.juz_index || 0,
    cycleStart: r.week_start || null,
    cyclesDone: r.cycles_done || 0,
    pageProgress: ppByPage,
  }));
}

// ── "Šta je danas na redu" za jednu kružnu metodu ───────────────────────────
export function rotationToday(state, today = todayStr()) {
  const lastRepeatOf = (page) => state.pageProgress.get(page)?.last_repeat || null;

  if (state.type === "dzuzevi") {
    const groupOf = (page) => getJuzForPage(page);
    const pageStates = state.items.flatMap((juz) =>
      getJuzPages(juz).map((page) => ({ page, sljedeceP: state.pageProgress.get(page)?.sljedece_ponavljanje || null }))
    );
    const due = dueGroups(pageStates, today, groupOf);
    if (!due.size) return null;
    const sortedDue = [...due.keys()].sort((a, b) => a - b);
    const juz = sortedDue[0];
    return { kind: "dzuzevi", juz, pages: due.get(juz), allDue: sortedDue, total: state.items.length };
  }

  if (state.type === "stranice") {
    const pageStates = state.items.map((page) => ({ page, sljedeceP: state.pageProgress.get(page)?.sljedece_ponavljanje || null }));
    const svePages = duePages(pageStates, today);
    if (!svePages.length) return null;
    // prikaži najviše "kvota" stranica danas - ostatak zaostatka čeka sutra
    const pages = svePages.slice(0, state.quota || svePages.length);
    const half = Math.ceil(pages.length / 2);
    return { kind: "stranice", pages, jutro: pages.slice(0, half), vecer: pages.slice(half), total: state.items.length, zaostatak: Math.max(0, svePages.length - pages.length) };
  }

  if (state.type === "seton") {
    const groups = partitionPages(state.items, state.parts || 8);
    const groupOf = (page) => groups.findIndex((g) => g.includes(page));
    const pageStates = state.items.map((page) => ({ page, sljedeceP: state.pageProgress.get(page)?.sljedece_ponavljanje || null }));
    const due = dueGroups(pageStates, today, groupOf);
    if (!due.size) return null;
    const sortedDue = [...due.keys()].sort((a, b) => a - b);
    const dioIdx = sortedDue[0];
    return { kind: "seton", dio: dioIdx + 1, pages: due.get(dioIdx), total: groups.length, allDue: sortedDue.map((i) => i + 1) };
  }

  if (state.type === "dinamicna") {
    const result = dinamicnaToday(state.items, { cycleStart: state.cycleStart, cycleLengthDays: state.quota }, lastRepeatOf, today);
    if (!result.pages.length) return null;
    return { kind: "dinamicna", ...result };
  }

  return null;
}

// ── Odradi današnji dio → postavi sljedeći datum odrađenim stranicama ───────
export async function advanceRotation(userId, state, todayResult, { date = null } = {}) {
  const today = date || todayStr();
  const pagesDone = todayResult.pages;
  if (!pagesDone?.length) return state;

  if (state.type === "dinamicna") {
    await bulkSetLastRepeat(userId, pagesDone, today);
    const lastRepeatOf = (page) => (pagesDone.includes(page) ? today : state.pageProgress.get(page)?.last_repeat || null);
    const params = completeDinamicnaCycle(
      state.items, { cycleStart: state.cycleStart, cyclesDone: state.cyclesDone, cycleLengthDays: state.quota },
      lastRepeatOf, today, pagesDone
    );
    await supabase.from("rotation_state")
      .update({ cycle_start: params.cycleStart, cycles_done: params.cyclesDone, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("method", "dinamicna");
    return { ...state, cycleStart: params.cycleStart, cyclesDone: params.cyclesDone };
  }

  // dzuzevi / stranice / seton - svim odrađenim stranicama postavi
  // sljedece_ponavljanje = danas + dužina ciklusa (broj jedinica u ciklusu).
  const ciklusDana =
    state.type === "dzuzevi" ? state.items.length :
    state.type === "seton"   ? (state.parts || 8) :
    Math.max(1, Math.ceil(state.items.length / (state.quota || 1))); // stranice

  const nextDate = addDays(today, ciklusDana);
  const { error } = await supabase.from("page_progress")
    .update({ sljedece_ponavljanje: nextDate })
    .eq("user_id", userId).in("page_number", pagesDone);
  if (error) throw error;

  // Statistika ciklusa: kad se odradi ZADNJA jedinica u definisanom
  // redoslijedu, to se broji kao završen ciklus. Aproksimacija je dovoljna
  // dok ne postoje stvarni podaci o zaostacima.
  let wrapped = false;
  if (state.type === "dzuzevi") wrapped = pagesDone.includes(getJuzPages(state.items.at(-1)).at(-1));
  else if (state.type === "stranice" || state.type === "seton") wrapped = pagesDone.includes(state.items.at(-1));

  if (wrapped) {
    await supabase.from("rotation_state")
      .update({ cycles_done: state.cyclesDone + 1, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("method", state.type);
  }

  return { ...state, cyclesDone: state.cyclesDone + (wrapped ? 1 : 0) };
}

// ── Privremena kvota (samo za "Po stranicama") ──────────────────────────────
export async function updateTempQuota(userId, state, tempQuota) {
  const { error } = await supabase.from("rotation_state")
    .update({ quota: tempQuota || state.quota })
    .eq("user_id", userId).eq("method", "stranice");
  if (error) throw error;
  return { ...state, quota: tempQuota || state.quota };
}

// ── FEMI / DŽUZ SEDMIČNO ─────────────────────────────────────────────────
export function femiWeekToday(femiRow, today = todayStr()) {
  const lastRepeatOf = (page) => femiRow.pageProgress.get(page)?.last_repeat || null;
  if (femiRow.method === "femi") {
    const result = femiToday(femiRow.items, { cycleStart: femiRow.cycleStart }, lastRepeatOf, today);
    if (!result.pages.length) return null;
    return { kind: "femi", planned: result.pages, ...result };
  }
  const juzState = { juzs: femiRow.items, juzIndex: femiRow.juzIndex, cycleStart: femiRow.cycleStart, cyclesDone: femiRow.cyclesDone };
  const result = juzWeeklyToday(juzState, lastRepeatOf, today);
  if (!result.pages.length) return null;
  return { kind: "dzuz_sedmicno", planned: result.pages, ...result };
}

export async function advanceFemi(userId, femiRow, donePages, date = null) {
  const today = date || todayStr();
  if (!donePages?.length) return femiRow;
  await bulkSetLastRepeat(userId, donePages, today);
  const lastRepeatOf = (page) => (donePages.includes(page) ? today : femiRow.pageProgress.get(page)?.last_repeat || null);

  if (femiRow.method === "femi") {
    const params = completeFemiWeek(femiRow.items, { cycleStart: femiRow.cycleStart, cyclesDone: femiRow.cyclesDone }, lastRepeatOf, today, donePages);
    await supabase.from("femi_state")
      .update({ week_start: params.cycleStart, cycles_done: params.cyclesDone, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("method", "femi");
    return { ...femiRow, cycleStart: params.cycleStart, cyclesDone: params.cyclesDone };
  }

  const juzState = { juzs: femiRow.items, juzIndex: femiRow.juzIndex, cycleStart: femiRow.cycleStart, cyclesDone: femiRow.cyclesDone };
  const nextState = completeJuzWeek(juzState, lastRepeatOf, today, donePages);
  await supabase.from("femi_state")
    .update({ juz_index: nextState.juzIndex, week_start: nextState.cycleStart, cycles_done: nextState.cyclesDone, updated_at: new Date().toISOString() })
    .eq("user_id", userId).eq("method", "dzuz_sedmicno");
  return { ...femiRow, juzIndex: nextState.juzIndex, cycleStart: nextState.cycleStart, cyclesDone: nextState.cyclesDone };
}

// ── Bulk upis last_repeat (zajedničko za dinamičnu i femi/džuz-sedmično) ───
async function bulkSetLastRepeat(userId, pages, date) {
  if (!pages?.length) return;
  const { error } = await supabase.from("page_progress")
    .update({ last_repeat: date })
    .eq("user_id", userId).in("page_number", pages);
  if (error) throw error;
}

// ── Zasijavanje novog plana (poziva se iz seedMethodEngine u
//    HifzPlannerPage.jsx kod aktivacije plana) - postavlja početne
//    sljedece_ponavljanje datume za dzuzevi/stranice/seton. ─────────────────
export async function seedRotationPages(userId, method, units, { startDate = todayStr() } = {}) {
  const rows = seedCycle(units, { startDate });
  const byDate = new Map();
  for (const r of rows) {
    if (!byDate.has(r.sljedeceP)) byDate.set(r.sljedeceP, []);
    byDate.get(r.sljedeceP).push(r.page);
  }
  await Promise.all(
    [...byDate.entries()].map(([date, pages]) =>
      supabase.from("page_progress").update({ sljedece_ponavljanje: date }).eq("user_id", userId).in("page_number", pages)
    )
  );
}

// ── Sve Motor A metode korisnika, spojene u JEDAN ravan niz "danas na redu"
//    stranica (dokument, generisi_dan/Sloj 3) - Dashboard ovo koristi samo za
//    PRIKAZ prioriteta; stvarno odrađivanje (advanceRotation/advanceFemi, koje
//    traže PUNO stanje po metodi, ne samo broj stranice) i dalje se radi na
//    posvećenom ekranu (RotationToday.jsx), da se ne rizikuje pogrešno
//    zatvaranje ciklusa za samo dio jedinice. ────────────────────────────────
export async function fetchMotorAStavkeToday(userId, today = todayStr()) {
  const [rotStates, femiStates] = await Promise.all([
    fetchRotationStates(userId),
    fetchFemiStates(userId),
  ]);
  const rot = rotStates.flatMap((s) => flattenMotorAToday(rotationToday(s, today)));
  const femi = femiStates.flatMap((s) => flattenMotorAToday(femiWeekToday(s, today)));
  return [...rot, ...femi];
}

// ── Procjena "dnevne kvote" (dokument, sekcija 8 - "kapa protiv lavine",
//    max = kvota × 1.5). Nema JEDNE pouzdane kvote za sve tipove metoda -
//    ovo je NAJBOLJA PROCJENA: zbir poznatih dnevnih kvota iz svih aktivnih
//    Motor A metoda koje imaju taj koncept (Po stranicama ima fiksnu quota
//    kolonu; Dinamična/Femi/Džuz-sedmično računaju dnevnaKvota uživo).
//    Dzuzevi/Šeton nemaju "stranica dnevno" koncept (cijela jedinica
//    odjednom) pa se ne broje. Vraća null ako nema NIJEDNOG poznatog izvora
//    (Dashboard onda ne postavlja kapu - bolje bez kape nego pogrešna kapa). ─
export async function estimateDnevnaKvota(userId, today = todayStr()) {
  const [rotStates, femiStates] = await Promise.all([
    fetchRotationStates(userId),
    fetchFemiStates(userId),
  ]);
  let ukupno = 0;
  let imaIzvor = false;
  for (const s of rotStates) {
    if (s.type === "stranice" && s.quota) { ukupno += s.quota; imaIzvor = true; }
    else if (s.type === "dinamicna") {
      const r = rotationToday(s, today);
      if (r?.dnevnaKvota) { ukupno += r.dnevnaKvota; imaIzvor = true; }
    }
  }
  for (const s of femiStates) {
    const r = femiWeekToday(s, today);
    if (r?.dnevnaKvota) { ukupno += r.dnevnaKvota; imaIzvor = true; }
  }
  return imaIzvor ? ukupno : null;
}

// dan u sedmici 1–7 (ponedjeljak=1) - i dalje korisno za prikaz "koji je dan"
export function danSedmice(date = new Date()) {
  return date.getDay() === 0 ? 7 : date.getDay();
}

// ── A→B: ako stranica u Motoru A dobije 3+ greške u tekućem ciklusu, izlazi
//    iz ciklusa i ulazi u NOVI Motor B blok (SRS - najblaža metoda) dok se
//    ponovo ne utvrdi (dokument arhitekture, sekcija 1.4 i 4.11). Poziva se
//    iz RotationToday.jsx odmah nakon recordError, s brojem NEDAVNIH grešaka
//    (error_tracking.recent_errors) koje je taj poziv vratio. `method` je
//    "stranice"/"dzuzevi"/"seton" - tip trenutnog rotation_state reda iz
//    kojeg se stranica uklanja (bazen ostaje konzistentan). ────────────────
export async function demotePageToMotorB(userId, page, recentErrors, method) {
  if (!shouldDemote(recentErrors)) return false;

  const { data: row, error: selError } = await supabase
    .from("rotation_state").select("*")
    .eq("user_id", userId).eq("method", method).maybeSingle();
  if (selError) throw selError;
  if (!row) return false;

  const nextItems = removeFromPool(row.items || [], page);
  const { error: updError } = await supabase.from("rotation_state")
    .update({ items: nextItems, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (updError) throw updError;

  await createReviewBlock(userId, {
    unitType: "stranica", items: [page], label: "",
    learnedOn: todayStr(), methodId: "srs",
  });
  return true;
}
