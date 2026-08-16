// ============================================================================
// Murajaa - servis: veza engine.js ↔ Supabase (tabele review_blocks / history)
// Sva logika je u engine.js; ovdje samo čitanje/pisanje i mapiranje kolona.
// ============================================================================

import { supabase } from "../../services/SupaBaseClient";
import { createBlock, applyReview } from "./engine";
import { justFinished, mergeIntoPool } from "./motorTransition.js";
import { todayStr } from "../../constants/hifz/helpers.js";

// ── Mapiranje: DB red (snake_case) → engine oblik (camelCase) ───────────────
function rowToBlock(row) {
  return {
    id: row.id,
    unitType: row.unit_type,
    items: row.items || [],
    label: row.label || "",
    learnedOn: row.learned_on,
    learnedAt: row.learned_at,
    method: row.method,
    step: row.step ?? 0,
    srsLevel: row.srs_level,
    nextReviewOn: row.next_review_on,
    lastResult: row.last_result,
    finished: row.finished,
  };
}

function blockToRow(block, userId) {
  return {
    user_id: userId,
    unit_type: block.unitType,
    items: block.items,
    label: block.label,
    learned_on: block.learnedOn,
    learned_at: block.learnedAt,
    method: block.method,
    step: block.step,
    srs_level: block.srsLevel,
    next_review_on: block.nextReviewOn,
    last_result: block.lastResult,
    finished: block.finished,
    updated_at: new Date().toISOString(),
  };
}

// ── Kreiraj novi blok (nakon što je korisnik danas nešto naučio) ────────────
export async function createReviewBlock(userId, { unitType, items, label, learnedOn, methodId }) {
  const block = createBlock({ unitType, items, label, learnedOn, methodId });
  const { data, error } = await supabase
    .from("review_blocks")
    .insert(blockToRow(block, userId))
    .select()
    .single();
  if (error) throw error;
  return rowToBlock(data);
}

// ── Kreiraj VIŠE blokova odjednom (bulk insert) - koristi se kad se veći
//    opseg dijeli na manje, razmaknute blokove umjesto jednog ogromnog
//    (vidi seedMethodEngine u HifzPlannerPage.jsx - tempo ponavljanja). ─────
export async function createReviewBlocksBulk(userId, blocksInput) {
  const blocks = blocksInput.map((b) => createBlock(b));
  const { data, error } = await supabase
    .from("review_blocks")
    .insert(blocks.map((b) => blockToRow(b, userId)))
    .select();
  if (error) throw error;
  return (data || []).map(rowToBlock);
}

// ── Svi blokovi korisnika ───────────────────────────────────────────────────
export async function fetchBlocks(userId) {
  const { data, error } = await supabase
    .from("review_blocks")
    .select("*")
    .eq("user_id", userId)
    .order("next_review_on", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToBlock);
}

// ── Blokovi koji su na redu (dospjeli ili kasne) ────────────────────────────
// nowIso: puni ISO timestamp "sad" (satna preciznost - ne samo datum).
export async function fetchDueBlocks(userId, nowIso) {
  const { data, error } = await supabase
    .from("review_blocks")
    .select("*")
    .eq("user_id", userId)
    .lte("next_review_on", nowIso)
    .order("next_review_on", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToBlock);
}

// ── Zabilježi odrađeno ponavljanje: engine računa novo stanje, mi ga upišemo ─
// `at`: ISO timestamp trenutka kad je ponavljanje stvarno odrađeno (satna
// preciznost - vidi engine.js/methods.js, sekcija 1.2/4.6-4.10 dokumenta).
// Ako blok TEK SADA pređe u trajno održavanje (finished false→true), njegove
// stranice automatski ulaze u bazen Motora A - pravilo B→A, dokument
// arhitekture sekcija 1.4 ("kičma sistema"). Vidi graduateToMotorA ispod.
export async function recordReview(userId, block, { result, at, errors = 0, note = "" }) {
  const updated = applyReview(block, { result, at });

  const { error: updError } = await supabase
    .from("review_blocks")
    .update(blockToRow(updated, userId))
    .eq("id", block.id);
  if (updError) throw updError;

  const { error: histError } = await supabase.from("review_block_history").insert({
    block_id: block.id,
    review_date: at.slice(0, 10),
    result,
    errors,
    note,
  });
  if (histError) throw histError;

  if (justFinished(block, updated) && updated.unitType === "stranica") {
    try { await graduateToMotorA(userId, updated); } catch { /* Motor A graduacija je bonus, ne ruši ponavljanje */ }
  }

  return { ...updated, id: block.id };
}

// ── B→A: blok koji je upravo završio Motor B (finished) ulazi u bazen
//    Motora A. Fallback bazen je uvijek "stranice" (univerzalni fallback,
//    dokument 3.3) - ako korisnik nema aktivan "stranice" rotation_state,
//    kreira se nov (quota=1, tek jedna stranica dnevno dok bazen ne naraste).
//    Ako već postoji, nove stranice se samo dodaju u postojeći bazen - ciklus
//    se sam produži (dužina ciklusa = veličina bazena / kvota), ništa se ne
//    ažurira ručno. ────────────────────────────────────────────────────────
export async function graduateToMotorA(userId, block) {
  const newPages = (block.items || []).map(Number).filter(Number.isFinite);
  if (!newPages.length) return;

  const { data: existing, error: selError } = await supabase
    .from("rotation_state").select("*")
    .eq("user_id", userId).eq("method", "stranice").maybeSingle();
  if (selError) throw selError;

  const mergedItems = mergeIntoPool(existing?.items || [], newPages);

  if (existing) {
    const { error } = await supabase.from("rotation_state")
      .update({ items: mergedItems, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("rotation_state")
      .insert({ user_id: userId, method: "stranice", items: mergedItems, quota: 1, cycles_done: 0 });
    if (error) throw error;
  }

  // nove stranice ulaze u ciklus ODMAH (danas na redu), umjesto da čekaju
  // puno "zasijavanje" - dosljedno s "gradivo koje je upravo utvrđeno ne
  // treba ponovo čekati".
  const { error: ppError } = await supabase.from("page_progress")
    .update({ sljedece_ponavljanje: todayStr() })
    .eq("user_id", userId).in("page_number", newPages);
  if (ppError) throw ppError;
}

// ── Historija jednog bloka ──────────────────────────────────────────────────
export async function fetchBlockHistory(blockId) {
  const { data, error } = await supabase
    .from("review_block_history")
    .select("*")
    .eq("block_id", blockId)
    .order("review_date", { ascending: false });
  if (error) throw error;
  return data || [];
}
