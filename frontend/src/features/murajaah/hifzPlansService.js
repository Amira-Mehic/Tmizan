// ============================================================================
// Murajaa - upravljanje planovima ponavljanja (hifz_plans): lista, deaktivacija/
// reaktivacija, brisanje, reset rasporeda, i izračun statistika za prikaz
// (Hifz Planner - lista SVIH planova, ne samo trenutno aktivnog).
//
// VAŽNO - više aktivnih planova: dozvoljeno je da više planova bude aktivno
// ISTOVREMENO, ali NAJVIŠE JEDAN po (efektivnoj) metodi - rotation_state i
// femi_state čuvaju stanje jedinstveno po (user_id, method), a review_blocks
// nema plan_id kolonu da razlikuje kojem planu blok pripada. Zato se "na
// redu"/"ponovljeno do sad" računaju SAMO za aktivne planove - za neaktivne
// (historijske) planove ta dva polja se ne mogu pouzdano rekonstruisati (stanje
// je odavno prepisano planom koji ga je naslijedio), pa se prikazuju kao null.
// ============================================================================

import { supabase } from "../../services/SupaBaseClient";
import { fetchBlocks } from "./murajaahService.js";
import { fetchRotationStates, fetchFemiStates, rotationToday, femiWeekToday } from "./rotationService.js";
import { proceniPlan } from "./planStats.js";
import { todayStr } from "../../constants/hifz/helpers.js";
import { addDays } from "./engine.js";

// femi_state.method se zove "dzuz_sedmicno" u bazi, ali metoda u wizardu/
// hifz_plans.method zove se "dzuz_sedmica" - ovo je jedino mjesto koje to
// mapira (isto što i seedMethodEngine u HifzPlannerPage.jsx radi pri seedu).
const FEMI_METHOD_MAP = { femi: "femi", dzuz_sedmica: "dzuz_sedmicno" };
const ROTACIJA_METODE = new Set(["dzuzevi", "stranice", "seton", "dinamicna"]);
const FEMI_METODE = new Set(["femi", "dzuz_sedmica"]);
const INTERVALNE_METODE = new Set(["fibonacci", "tri_dana", "sedam_dana", "srs", "novo_staro"]);

export function efektivnaMetoda(plan) {
  return plan.method === "nivo" ? (plan.scope_data?.baseMethod || plan.method) : plan.method;
}

// ── Svi planovi ponavljanja korisnika, najnoviji prvi ───────────────────────
export async function fetchAllReviewPlans(userId) {
  const { data, error } = await supabase
    .from("hifz_plans").select("*")
    .eq("user_id", userId)
    .order("active", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deactivatePlan(planId) {
  const { error } = await supabase.from("hifz_plans").update({ active: false }).eq("id", planId);
  if (error) throw error;
}

// Reaktivacija - gasi prethodni aktivan plan ISTE metode (isto pravilo kao
// aktivirajPlan u wizardu), pa pali ovaj.
export async function reactivatePlan(userId, plan) {
  const metoda = efektivnaMetoda(plan);
  const { data: aktivni } = await supabase.from("hifz_plans")
    .select("id, method, scope_data").eq("user_id", userId).eq("active", true);
  const zaGasiti = (aktivni || [])
    .filter((p) => p.id !== plan.id && efektivnaMetoda(p) === metoda)
    .map((p) => p.id);
  if (zaGasiti.length) await supabase.from("hifz_plans").update({ active: false }).in("id", zaGasiti);
  const { error } = await supabase.from("hifz_plans").update({ active: true }).eq("id", plan.id);
  if (error) throw error;
}

// ── Brisanje plana. Ako je bio aktivan, best-effort čisti rotation_state/
//    femi_state red za tu metodu (jer je bio jedini vlasnik tog reda po
//    pravilu "jedan aktivan po metodi") - review_blocks se NE briše (nema
//    plan_id da se izoluje samo "njegovih" blokova; ostaju u historiji
//    ponavljanja, bezopasno). ─────────────────────────────────────────────
export async function deletePlan(userId, plan) {
  const metoda = efektivnaMetoda(plan);
  if (plan.active) {
    try {
      if (ROTACIJA_METODE.has(metoda)) {
        await supabase.from("rotation_state").delete().eq("user_id", userId).eq("method", metoda);
      } else if (FEMI_METODE.has(metoda)) {
        await supabase.from("femi_state").delete().eq("user_id", userId).eq("method", FEMI_METHOD_MAP[metoda]);
      }
    } catch { /* čišćenje je bonus, ne kritično - plan se ipak briše ispod */ }
  }
  const { error } = await supabase.from("hifz_plans").delete().eq("id", plan.id);
  if (error) throw error;
}

// ── Statistike za jedan plan (za listu na Hifz Planneru) ───────────────────
// ukupnoStr: veličina opsega (UI je prosljeđuje jer za "sure" treba SURA_DATA
//   koji već ima wizard-stranica, izbjegavamo duplirati tu tabelu ovdje).
export async function fetchPlanStats(userId, plan, ukupnoStr, today = todayStr()) {
  const metoda = efektivnaMetoda(plan);
  const tempo = plan.scope_data?.tempo || null;
  const dzuzArrLen = (plan.scope_data?.odabraniDzuzovi || []).length;

  let rotationQuota = null;
  let dinamicnaQuotaDays = null;
  let ponovljenoDo = null;
  let naReduOpis = null;

  if (plan.active && ROTACIJA_METODE.has(metoda)) {
    try {
      const states = await fetchRotationStates(userId);
      const state = states.find((s) => s.type === metoda);
      if (state) {
        ponovljenoDo = state.cyclesDone || 0;
        if (metoda === "stranice") rotationQuota = state.quota || null;
        if (metoda === "dinamicna") dinamicnaQuotaDays = state.quota || null;
        const rezultatDanas = rotationToday(state, today);
        naReduOpis = rezultatDanas
          ? { kind: rezultatDanas.kind, pages: rezultatDanas.pages || [] }
          : { kind: metoda, pages: [] };
      }
    } catch { /* stanje nije dostupno - ostaje null, UI prikazuje "-" */ }
  } else if (plan.active && FEMI_METODE.has(metoda)) {
    try {
      const states = await fetchFemiStates(userId);
      const state = states.find((s) => s.method === FEMI_METHOD_MAP[metoda]);
      if (state) {
        ponovljenoDo = state.cyclesDone || 0;
        const rezultatDanas = femiWeekToday(state, today);
        naReduOpis = rezultatDanas ? { kind: rezultatDanas.kind, pages: rezultatDanas.planned || [] } : { kind: metoda, pages: [] };
      }
    } catch { /* isto - bonus polje */ }
  } else if (plan.active && INTERVALNE_METODE.has(metoda)) {
    try {
      const blocks = await fetchBlocks(userId);
      const moji = blocks.filter((b) => b.method === metoda);
      ponovljenoDo = moji.filter((b) => b.finished).length;
      const dospjeli = moji.filter((b) => b.nextReviewOn && b.nextReviewOn <= new Date().toISOString());
      naReduOpis = dospjeli.length ? { kind: "blokovi", pages: dospjeli.flatMap((b) => b.items) } : { kind: "blokovi", pages: [] };
    } catch { /* isto */ }
  }

  const { dnevnaKolicina, trajanjeDana } = proceniPlan({
    method: metoda, ukupnoStr: ukupnoStr || 0, tempo, dzuzArrLen, rotationQuota, dinamicnaQuotaDays,
  });

  const startDatum = (plan.created_at || "").slice(0, 10) || null;
  const krajDatum = startDatum && trajanjeDana ? addDays(startDatum, trajanjeDana) : null;
  const slobodniDani = plan.scope_data?.slobodniDani || [];
  const daniPonavljanjaBroj = 7 - slobodniDani.length;

  return {
    metoda, dnevnaKolicina, trajanjeDana, startDatum, krajDatum,
    ciljStr: ukupnoStr || null, ponovljenoDo, naReduOpis,
    daniPonavljanjaBroj, slobodniDani,
  };
}
