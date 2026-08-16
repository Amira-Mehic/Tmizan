// ============================================================================
// Model višestruke pohrane - servis (ayah_memory ↔ pohrana.js)
// Automatsko prebacivanje po nivoima 6→0: engine računa, servis čuva.
// ============================================================================

import { supabase } from "../../services/SupaBaseClient";
import { reviewNivo } from "./pohrana.js";

function rowToState(row) {
  return { nivo: row.nivo, subStep: row.sub_step, nextDueAt: row.next_due_at, lastResult: row.last_result };
}

// ── Dodaj ajete u vatrenu zonu (tek naučeni blok) ───────────────────────────
export async function addToFireZone(userId, verseKeys, { at = new Date().toISOString(), blockId = null } = {}) {
  const rows = verseKeys.map((k) => ({
    user_id: userId, verse_key: k, block_id: blockId,
    nivo: 6, sub_step: 0, next_due_at: at, last_result: null,
    updated_at: at,
  }));
  const { error } = await supabase.from("ayah_memory").upsert(rows, { onConflict: "user_id,verse_key" });
  if (error) throw error;
}

// ── Šta je na redu (svi nivoi) ──────────────────────────────────────────────
export async function fetchDueAyahs(userId, { nowIso = new Date().toISOString(), limit = 20 } = {}) {
  const { data, error } = await supabase
    .from("ayah_memory").select("*")
    .eq("user_id", userId)
    .lte("next_due_at", nowIso)
    .order("next_due_at")
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ── Zabilježi rezultat: engine odredi novi nivo/termin, servis upiše ────────
export async function recordAyahReview(userId, row, { correct, at = new Date().toISOString() }) {
  const next = reviewNivo(rowToState(row), { correct, at });
  const { error } = await supabase
    .from("ayah_memory")
    .update({
      nivo: next.nivo, sub_step: next.subStep,
      next_due_at: next.nextDueAt, last_result: next.lastResult,
      updated_at: at,
    })
    .eq("id", row.id);
  if (error) throw error;
  return next;
}

// ── Most: prethodni/sljedeći ajet iz verse_key ("2:255" → 2:254 / 2:256) ────
export function bridgeFromKey(verseKey) {
  const [s, a] = verseKey.split(":").map(Number);
  return {
    prethodni: a > 1 ? `${s}:${a - 1}` : null,
    trazeni: verseKey,
    sljedeci: `${s}:${a + 1}`, // zadnji ajet sure: UI ignoriše ako ne postoji
  };
}
