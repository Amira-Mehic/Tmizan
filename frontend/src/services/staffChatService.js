// ============================================================================
// Staff (admin/moderator) ↔ korisnik chat - "staff_conversations" (0036).
// Poruke se čuvaju u POSTOJEĆOJ messages tabeli (context_type='opcenito',
// context_ref=conversation.id), ne u posebnoj tabeli - vidi 0036 za RLS i
// rate-limit (korisnik smije samo 1 poruku dok ne dobije odgovor).
// ============================================================================

import { supabase } from "./SupaBaseClient";

// Sve razgovore vidi STAFF (admin/moderator/management) - is_staff() RLS
export async function fetchAllConversations() {
  const { data, error } = await supabase
    .from("staff_conversations")
    .select("*, korisnik:profiles!staff_conversations_user_id_fkey(full_name, email)")
    .order("updated_at", { ascending: false });
  if (error) { console.error("fetchAllConversations:", error); return []; }
  return data || [];
}

// Razgovori KONKRETNOG korisnika (user-facing stranica)
export async function fetchMyConversations(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("staff_conversations")
    .select("*, pokrenuo:profiles!staff_conversations_staff_id_fkey(full_name)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) { console.error("fetchMyConversations:", error); return []; }
  return data || [];
}

export async function fetchConversationMessages(convId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("context_type", "opcenito")
    .eq("context_ref", convId)
    .order("created_at", { ascending: true });
  if (error) { console.error("fetchConversationMessages:", error); return []; }
  return data || [];
}

// Staff pokreće novi razgovor sa korisnikom (prva poruka odmah ide s njim)
export async function startConversation(staffId, userId, naslov, prvaPoruka) {
  const { data: conv, error } = await supabase
    .from("staff_conversations")
    .insert({ staff_id: staffId, user_id: userId, naslov: naslov || null })
    .select()
    .single();
  if (error || !conv) return { error };
  const { error: msgErr } = await supabase.from("messages").insert({
    sender_id: staffId, recipient_id: userId, body: prvaPoruka,
    context_type: "opcenito", context_ref: conv.id,
  });
  return { data: conv, error: msgErr };
}

// Odgovor u postojećem razgovoru - radi i za staff i za korisnika (RLS 0036
// sam presudi smije li korisnik trenutno slati, rate-limit je na bazi)
export async function sendConversationMessage(conv, senderId, body) {
  const recipientId = senderId === conv.staff_id ? conv.user_id : conv.staff_id;
  const { error } = await supabase.from("messages").insert({
    sender_id: senderId, recipient_id: recipientId, body,
    context_type: "opcenito", context_ref: conv.id,
  });
  if (!error) {
    await supabase.from("staff_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conv.id);
  }
  return { error };
}

export async function closeConversation(convId, staffId) {
  return supabase.from("staff_conversations").update({
    status: "zatvoren", closed_at: new Date().toISOString(), closed_by: staffId,
  }).eq("id", convId);
}

export async function reopenConversation(convId) {
  return supabase.from("staff_conversations").update({
    status: "otvoren", closed_at: null, closed_by: null,
  }).eq("id", convId);
}
