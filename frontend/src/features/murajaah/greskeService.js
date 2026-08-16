// ============================================================================
// Metoda na osnovu grešaka - servis (error_tracking ↔ greske.js)
// ============================================================================

import { supabase } from "../../services/SupaBaseClient";
import { createItem, applyReview, flagManual, weakSpotMap, dailyPlan, kategorija, skorStranice, uReduSlabih } from "./greske.js";

function rowToItem(row) {
  return {
    ref: row.ref, refType: row.ref_type, errors: row.errors,
    recentErrors: row.recent_errors, cleanStreak: row.clean_streak,
    manualFlag: row.manual_flag, note: row.note, zaMualima: row.za_mualima,
    nextReviewOn: row.next_review_on, _id: row.id,
  };
}
function itemToRow(item, userId) {
  return {
    user_id: userId, ref: item.ref, ref_type: item.refType,
    errors: item.errors, recent_errors: item.recentErrors, clean_streak: item.cleanStreak,
    manual_flag: item.manualFlag, note: item.note, za_mualima: item.zaMualima,
    next_review_on: item.nextReviewOn, updated_at: new Date().toISOString(),
  };
}

export async function fetchErrorItems(userId) {
  const { data, error } = await supabase.from("error_tracking").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data || []).map(rowToItem);
}

// mapa slabih mjesta (sortirana od najproblematičnijeg)
export async function fetchWeakSpotMap(userId) {
  return weakSpotMap(await fetchErrorItems(userId));
}

// dnevni plan (kritične stavke ulaze više puta)
export async function fetchErrorDailyPlan(userId, today) {
  return dailyPlan(await fetchErrorItems(userId), today);
}

// zabilježi grešku/uspjeh na stavci
export async function recordError(userId, { ref, refType, errors, date }) {
  const { data } = await supabase.from("error_tracking").select("*")
    .eq("user_id", userId).eq("ref", ref).eq("ref_type", refType).maybeSingle();
  const item = data ? rowToItem(data) : createItem({ ref, refType });
  const next = applyReview(item, { errors, date });
  const { error } = await supabase.from("error_tracking").upsert(itemToRow(next, userId), { onConflict: "user_id,ref,ref_type" });
  if (error) throw error;
  return next;
}

// ručno označi nesigurno mjesto (npr. "miješam s 2:255")
export async function flagUncertain(userId, { ref, refType, note, date }) {
  const { data } = await supabase.from("error_tracking").select("*")
    .eq("user_id", userId).eq("ref", ref).eq("ref_type", refType).maybeSingle();
  const item = data ? rowToItem(data) : createItem({ ref, refType });
  const next = flagManual(item, { note, date });
  const { error } = await supabase.from("error_tracking").upsert(itemToRow(next, userId), { onConflict: "user_id,ref,ref_type" });
  if (error) throw error;
  return next;
}

// ukloni oznaku greške na stavci (npr. korisnik odznači ajet koji je slučajno
// označio, ili je nakon ponavljanja bez greške odlučio da ga skloni s mape)
export async function clearError(userId, { ref, refType }) {
  const { error } = await supabase.from("error_tracking").delete()
    .eq("user_id", userId).eq("ref", ref).eq("ref_type", refType);
  if (error) throw error;
}

// koje su stavke (ref-ovi) trenutno označene za dati skup ref-ova - korisno za
// picker komponente da znaju koji su ajeti/stranice VEĆ flagovani
export async function fetchFlaggedRefs(userId, refs, refType) {
  if (!refs?.length) return [];
  const { data, error } = await supabase.from("error_tracking").select("ref")
    .eq("user_id", userId).eq("ref_type", refType).in("ref", refs)
    .or("recent_errors.gt.0,manual_flag.eq.true");
  if (error) return [];
  return (data || []).map((r) => r.ref);
}

// ── RED SLABIH - UŽIVO (dokument, sekcija 4.11: skor_slabosti se računa iz
// page_progress.confidence/errors/last_repeat + page_repeat_history, NE čuva
// se kao kolona). Vraća stranice čiji skor prelazi prag_ulaska, sortirano od
// najslabije. Ovo je "Sloj 2" ulaz za generisi_dan() na Dashboardu - odvojeno
// od starog error_tracking modela (koji ostaje za pojedinačne ajete/Vatrenu
// zonu i ručno flagovana mjesta, drugačija svrha). ──────────────────────────
export async function fetchRedSlabihUzivo(userId, today) {
  if (!userId) return [];
  const { data: pp, error: ppErr } = await supabase
    .from("page_progress")
    .select("id, page_number, confidence, errors, last_repeat")
    .eq("user_id", userId)
    .in("status", ["naucen", "savladano", "ponavljanje"]);
  if (ppErr || !pp?.length) return [];

  const ppIds = pp.map((r) => r.id);
  const { data: hist } = await supabase
    .from("page_repeat_history")
    .select("page_progress_id, repeat_date, errors")
    .in("page_progress_id", ppIds)
    .order("repeat_date", { ascending: false });

  const historyByPP = new Map();
  for (const h of hist || []) {
    if (!historyByPP.has(h.page_progress_id)) historyByPP.set(h.page_progress_id, []);
    historyByPP.get(h.page_progress_id).push(h.errors || 0);
  }

  const rezultat = pp
    .map((row) => {
      const skor = skorStranice({
        confidence: row.confidence,
        errors: row.errors || 0,
        historyErrorsDesc: historyByPP.get(row.id) || [],
        lastRepeat: row.last_repeat,
        today,
      });
      return { ref: row.page_number, refType: "page", skor, recentErrors: (historyByPP.get(row.id) || [])[0] ?? (row.errors || 0) };
    })
    .filter((x) => uReduSlabih(x.skor))
    .sort((a, b) => b.skor - a.skor);

  return rezultat;
}

// ── Brzo bilježenje ponavljanja stranice iz reda slabih (Dashboard) - upiše
// jedan red u page_repeat_history (ulaz za sljedeći izračun skor_slabosti) i
// pomjeri last_repeat. Namjerno NE dira page_progress.errors (to je polje
// koje korisnik ručno uređuje na Hifz Trackeru - ne prepisuje ga brza akcija
// odavde, samo dodaje novi istorijski unos). ────────────────────────────────
export async function recordPageReviewQuick(userId, pageNumber, { correct, date }) {
  const { data: row, error: selErr } = await supabase.from("page_progress")
    .select("id").eq("user_id", userId).eq("page_number", pageNumber).maybeSingle();
  if (selErr) throw selErr;
  if (!row) throw new Error("Stranica nije pronađena u Tracker-u");

  const { error: histErr } = await supabase.from("page_repeat_history")
    .insert({ page_progress_id: row.id, repeat_date: new Date().toISOString(), errors: correct ? 0 : 1 });
  if (histErr) throw histErr;

  const { error: updErr } = await supabase.from("page_progress")
    .update({ last_repeat: date }).eq("id", row.id);
  if (updErr) throw updErr;
}

// ── Stranice i ajeti s greškama, grupisano po stranici - za Dashboard sekciju
// "Stranice i ajeti s greškama za ponavljanje". Ajeti su označeni pojedinačno
// (ref_type="verse") na EditForm-u (stranica) ili u Postepeno detaljima
// (pojedinačan ajet); ovdje se povezuju sa svojom stranicom preko `ayahs`
// tabele i grupišu, sortirano od najproblematičnije stranice. ──
export async function fetchPagesWithErrorAyahs(userId) {
  if (!userId) return [];
  const { data: rows, error } = await supabase.from("error_tracking").select("*")
    .eq("user_id", userId).eq("ref_type", "verse")
    .or("recent_errors.gt.0,manual_flag.eq.true");
  if (error || !rows?.length) return [];

  const verseKeys = rows.map((r) => r.ref);
  const { data: ayahs } = await supabase.from("ayahs").select("verse_key, page_number").in("verse_key", verseKeys);
  const pageByVerse = new Map((ayahs || []).map((a) => [a.verse_key, a.page_number]));

  const byPage = new Map();
  for (const row of rows) {
    const page = pageByVerse.get(row.ref);
    if (!page) continue; // ajet bez poznate stranice (npr. obrisan iz mushaf tabele) - preskoči
    if (!byPage.has(page)) byPage.set(page, { page, verses: [], totalErrors: 0, hasCritical: false });
    const entry = byPage.get(page);
    entry.verses.push(row.ref);
    entry.totalErrors += row.errors || 0;
    if (kategorija(row.recent_errors) === "kriticno") entry.hasCritical = true;
  }

  return [...byPage.values()].sort((a, b) => (b.hasCritical - a.hasCritical) || (b.totalErrors - a.totalErrors));
}
