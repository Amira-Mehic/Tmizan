// ============================================================================
// Muallim panel - servis (veze, sesije, poruke, oglasna ploča, zadaci)
// Tabele iz migracije 0009. Sva pravila pristupa čuva RLS u bazi.
// ============================================================================

import { supabase } from "./SupaBaseClient";
import { seedMethodEngine } from "../features/murajaah/seedMethodEngine";
import { computeTempo } from "../features/murajaah/planTempo";
import { todayStr } from "../constants/hifz/helpers";

// ── VEZE MUALLIM ↔ UČENIK ───────────────────────────────────────────────────
export async function fetchStudents(mualimId) {
  const { data, error } = await supabase
    .from("mualim_students")
    .select("*, student:profiles!mualim_students_student_id_fkey(id, full_name)")
    .eq("mualim_id", mualimId);
  if (error) throw error;
  return data || [];
}

export async function requestConnection(studentId, mualimId) {
  const { error } = await supabase
    .from("mualim_students")
    .insert({ student_id: studentId, mualim_id: mualimId, status: "na_cekanju" });
  if (error) throw error;
}

export async function decideConnection(connectionId, accept) {
  const { error } = await supabase
    .from("mualim_students")
    .update({ status: accept ? "prihvacen" : "odbijen", decided_at: new Date().toISOString() })
    .eq("id", connectionId);
  if (error) throw error;
}

// ── NAPREDAK I GREŠKE UČENIKA (read-only preko RLS-a) ───────────────────────
export async function fetchStudentProgress(studentId) {
  const [pages, weak] = await Promise.all([
    supabase.from("page_progress").select("page_number,status,errors,confidence,last_repeat").eq("user_id", studentId),
    supabase.from("error_tracking").select("*").eq("user_id", studentId).order("errors", { ascending: false }),
  ]);
  if (pages.error) throw pages.error;
  if (weak.error) throw weak.error;
  return { pages: pages.data || [], weakSpots: weak.data || [] };
}

// ── SESIJE (preslušavanja / časovi) ──────────────────────────────────────────
export async function fetchSessions(mualimId, { fromDate } = {}) {
  let q = supabase.from("sessions").select("*").eq("mualim_id", mualimId).order("starts_at");
  if (fromDate) q = q.gte("starts_at", fromDate);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function fetchStudentSessions(studentId, { fromDate } = {}) {
  // RLS propušta učenikove individualne sesije
  let q = supabase.from("sessions").select("*").order("starts_at");
  if (fromDate) q = q.gte("starts_at", fromDate);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createSession(mualimId, {
  naslov, startsAt, link = "", smjernice = "", studentId = null,
  nacin = "online", lokacija = "", vanredni = false,
}) {
  // Kolone termin_id i halka_id više ne postoje: termin_id je obrisan
  // migracijom 0038, a halka_id migracijom 0039 (halke se nigdje u aplikaciji
  // ne koriste kao grupa učenika). Slanje nepostojeće kolone bi srušilo insert.
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      mualim_id: mualimId, naslov, starts_at: startsAt, link, smjernice,
      student_id: studentId, nacin, lokacija, vanredni,
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateSession(sessionId, changes) {
  const { error } = await supabase
    .from("sessions")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function saveAttendance(sessionId, studentId, { prisutan, biljeske }) {
  const { error } = await supabase
    .from("session_attendance")
    .upsert({ session_id: sessionId, student_id: studentId, prisutan, biljeske }, { onConflict: "session_id,student_id" });
  if (error) throw error;
}

export async function fetchSessionAttendance(sessionId) {
  const { data, error } = await supabase
    .from("session_attendance")
    .select("*, student:profiles!session_attendance_student_id_fkey(full_name)")
    .eq("session_id", sessionId);
  if (error) throw error;
  return data || [];
}

// ── PORUKE ──────────────────────────────────────────────────────────────────
export async function fetchConversation(userId, otherId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`)
    .order("created_at");
  if (error) throw error;
  return data || [];
}

export async function sendMessage(senderId, recipientId, body, { contextType = "opcenito", contextRef = null } = {}) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: senderId, recipient_id: recipientId, body, context_type: contextType, context_ref: contextRef })
    .select().single();
  if (error) throw error;
  return data;
}

// izmjena teksta VEĆ poslane poruke (npr. mualim ispravlja svoj odgovor) -
// pošiljalac smije, vidi RLS "msg_sender_update" (migracija 0033)
export async function updateMessageBody(messageId, body) {
  const { error } = await supabase.from("messages").update({ body }).eq("id", messageId);
  if (error) throw error;
}

export async function markRead(messageId) {
  const { error } = await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", messageId);
  if (error) throw error;
}

// Zahtjevi za preslušavanje - svi upiti učenika mualimu s context_type
// 'preslusavanje_zahtjev', s imenom pošiljaoca (za MualimReviewInbox).
export async function fetchReviewRequests(mualimId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*, sender:profiles!messages_sender_id_fkey(full_name)")
    .eq("recipient_id", mualimId)
    .eq("context_type", "preslusavanje_zahtjev")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Mualimovi (već poslani) odgovori na zahtjeve iz gornje liste - koristi se
// da se zna koji zahtjev je već dobio odgovor (pa forma pređe u "uredi" umjesto
// "pošalji"). context_ref = id originalne zahtjev-poruke.
export async function fetchRepliesByRefs(mualimId, contextRefs) {
  if (!contextRefs?.length) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("id, body, context_ref")
    .eq("sender_id", mualimId)
    .in("context_ref", contextRefs)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// ── OGLASNA PLOČA ───────────────────────────────────────────────────────────
export async function fetchAnnouncements(mualimId) {
  const { data, error } = await supabase
    .from("announcements").select("*").eq("mualim_id", mualimId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchStudentAnnouncements() {
  // RLS: učenik vidi samo objave svojih (prihvaćenih) muallima
  const { data, error } = await supabase
    .from("announcements").select("*").order("created_at", { ascending: false }).limit(10);
  if (error) throw error;
  return data || [];
}

// Cilj MORA biti odabran učenik (provjerava pozivatelj - UI ne dozvoljava
// slanje bez odabira, vidi AnnouncementsTab).
export async function postAnnouncement(mualimId, { body, vrsta = "obavijest", studentId = null }) {
  if (!studentId) throw new Error("Mora se odabrati učenik.");
  const { error } = await supabase
    .from("announcements").insert({ mualim_id: mualimId, body, vrsta, student_id: studentId });
  if (error) throw error;
}

// ── ZADACI ──────────────────────────────────────────────────────────────────
export async function fetchTasks(mualimId, studentId = null) {
  let q = supabase.from("mualim_tasks").select("*").eq("mualim_id", mualimId).order("created_at", { ascending: false });
  if (studentId) q = q.eq("student_id", studentId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function fetchStudentTasks(studentId) {
  const { data, error } = await supabase
    .from("mualim_tasks").select("*").eq("student_id", studentId)
    .order("rok", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createTask(mualimId, studentId, { opis, komentar = "", rok = null }) {
  const { error } = await supabase
    .from("mualim_tasks").insert({ mualim_id: mualimId, student_id: studentId, opis, komentar, rok });
  if (error) throw error;
}

export async function completeTask(taskId) {
  const { error } = await supabase
    .from("mualim_tasks")
    .update({ status: "zavrsen", completed_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw error;
}

// ── MUALIMOV PLAN (prioritetni personalizovani plan za učenika) ─────────────
// dailyGoalLines/minutesNeeded/targetDate su OPCIONALNI prijedlozi muallima za
// učenikov glavni plan učenja (talim_plans) - vidi i pushGoalsToTalimPlan ispod,
// koje ih stvarno primjenjuje na učenikov aktivni plan (talim_plans.state ostaje
// izvor istine za dashboard/raspored; ovdje se samo bilježi šta je predloženo).
export async function createReviewPlan(mualimId, studentId, {
  naslov, komentar = "", days = [], dailyGoalLines = null, minutesNeeded = null, targetDate = null,
}) {
  const { data: plan, error } = await supabase
    .from("mualim_review_plans")
    .insert({
      mualim_id: mualimId, student_id: studentId, naslov, komentar, active: true,
      daily_goal_lines: dailyGoalLines, minutes_needed: minutesNeeded, target_date: targetDate,
    })
    .select().single();
  if (error) throw error;
  if (days.length) {
    const rows = days.map((d) => ({ plan_id: plan.id, dan_datum: d.datum, vrsta: d.vrsta || "ponavljanje", opis: d.opis }));
    const { error: dErr } = await supabase.from("mualim_review_plan_days").insert(rows);
    if (dErr) throw dErr;
  }
  return plan;
}

// izmjena postojećeg muallimovog plana (samo glavna polja, ne dane)
export async function updateReviewPlan(planId, { naslov, komentar, dailyGoalLines, minutesNeeded, targetDate }) {
  const patch = {};
  if (naslov !== undefined) patch.naslov = naslov;
  if (komentar !== undefined) patch.komentar = komentar;
  if (dailyGoalLines !== undefined) patch.daily_goal_lines = dailyGoalLines;
  if (minutesNeeded !== undefined) patch.minutes_needed = minutesNeeded;
  if (targetDate !== undefined) patch.target_date = targetDate;
  const { error } = await supabase.from("mualim_review_plans").update(patch).eq("id", planId);
  if (error) throw error;
}

// aktivni muallimov plan za učenika (+ dani) - prioritetni prikaz
export async function fetchActiveReviewPlan(studentId, { fromDate } = {}) {
  const { data: plan } = await supabase
    .from("mualim_review_plans").select("*")
    .eq("student_id", studentId).eq("active", true)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!plan) return null;
  let q = supabase.from("mualim_review_plan_days").select("*").eq("plan_id", plan.id).order("dan_datum");
  if (fromDate) q = q.gte("dan_datum", fromDate);
  const { data: days } = await q;
  return { ...plan, days: days || [] };
}

export async function markPlanDayDone(dayId, done = true) {
  const { error } = await supabase.from("mualim_review_plan_days").update({ done }).eq("id", dayId);
  if (error) throw error;
}

// ── GURANJE MUALLIMOVOG PRIJEDLOGA NA UČENIKOV STVARNI talim_plans ──────────
// Radi SAMO ako muallim ima PRIHVAĆENU vezu s učenikom (RLS "talim_plans_mualim_update",
// migracija 0014) - bez toga baza tiho odbija upis (0 izmijenjenih redova).
// Mijenja samo polja koja su stvarno proslijeđena (undefined = ne diraj).
export async function pushGoalsToTalimPlan(studentId, { targetDate, minutesNeeded, linesPerDay } = {}) {
  const { data: plan, error: fErr } = await supabase
    .from("talim_plans").select("*").eq("user_id", studentId).eq("active", true).maybeSingle();
  if (fErr) throw fErr;
  if (!plan) return null;

  const patch = { updated_at: new Date().toISOString() };
  if (targetDate !== undefined && targetDate !== null) patch.target_date = targetDate;
  if (linesPerDay !== undefined && linesPerDay !== null) patch.lines_per_day = linesPerDay;
  if (minutesNeeded !== undefined && minutesNeeded !== null) {
    patch.state = { ...(plan.state || {}), minutesNeeded };
  }

  const { data: updated, error } = await supabase
    .from("talim_plans").update(patch).eq("id", plan.id).select().maybeSingle();
  if (error) throw error;
  // RLS tiho vrati 0 redova (bez greške) ako veza nije "prihvacen" - javi to pozivatelju
  if (!updated) throw new Error("Nema dozvolu za izmjenu ovog plana (veza s učenikom nije prihvaćena).");
  return updated;
}

// ── GENERISANJE PRAVOG PLANA PONAVLJANJA (isti motor kao samostalni wizard) ─
// Muallim bira metodu + dnevnu kvotu (stranica/dan), opseg je učenikove VEĆ
// naučene stranice (learnedPages - mualim ih ne bira ručno, uzimaju se iz
// trackera preko fetchStudentProgress). Radi SAMO ako mualim ima PRIHVAĆENU
// vezu s učenikom (RLS iz 0027_mualim_generise_plan.sql) - bez toga baza
// odbija upis grantom/RLS greškom, koju ova funkcija propušta pozivatelju.
export async function assignReviewPlan(mualimId, studentId, { method, dailyQtyPages, learnedPages }) {
  if (!learnedPages?.length) throw new Error("Učenik još nema nijednu naučenu stranicu u trackeru.");
  const tempo = computeTempo({ unit: "stranice", mode: "broj", quantity: dailyQtyPages, totalPagesInScope: learnedPages.length });

  // ugasi prethodni aktivan plan ISTE metode (isto pravilo kao aktivirajPlan
  // u wizardu - rotation_state/femi_state čuvaju stanje jedinstveno po metodi)
  const { data: aktivni } = await supabase.from("hifz_plans")
    .select("id").eq("user_id", studentId).eq("method", method).eq("active", true);
  if (aktivni?.length) {
    await supabase.from("hifz_plans").update({ active: false }).in("id", aktivni.map((p) => p.id));
  }

  const { data: plan, error } = await supabase.from("hifz_plans").insert({
    user_id: studentId, method, scope_type: "hafiz", scope_data: { tempo },
    active: true, assigned_by: mualimId,
  }).select().single();
  if (error) throw error;

  await seedMethodEngine(method, {
    userId: studentId, pagesArr: [...learnedPages].sort((a, b) => a - b),
    dzuzArr: [], ajetiArr: [], today: todayStr(), tempo,
  });

  return plan;
}

// ── MILESTONE OBAVIJEST: učenik završi stranicu/džuz/cilj → poruka muallimu ──
// Šalje poruku svim prihvaćenim muallimima učenika. Tiho ne radi ništa ako
// učenik nema muallima. Dedupe (da ne šalje dvaput) radi pozivatelj.
export async function notifyMyMualim(studentId, body, { contextType = "opcenito", contextRef = null } = {}) {
  const { data: veze } = await supabase
    .from("mualim_students").select("mualim_id")
    .eq("student_id", studentId).eq("status", "prihvacen");
  if (!veze?.length) return;
  const rows = veze.map((v) => ({
    sender_id: studentId, recipient_id: v.mualim_id, body,
    context_type: contextType, context_ref: contextRef,
  }));
  await supabase.from("messages").insert(rows);
}
