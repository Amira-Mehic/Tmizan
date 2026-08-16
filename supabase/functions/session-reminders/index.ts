// ============================================================================
// Tmizan - Edge Function: podsjetnici za časove (OPCIJA za pravi web-push)
//
// SQL funkcija public.send_session_reminders() (migracija 0012) + pg_cron već
// šalju IN-APP obavijesti bez ikakvog deploya. Ova Edge Function je za PRAVI
// browser push (obavijest i kad je aplikacija zatvorena) - traži VAPID ključeve
// i tabelu push_subscriptions (nije obavezno za osnovni rad).
//
// Deploy:  supabase functions deploy session-reminders
// Cron:    u SQL-u zakazati http poziv na ovu funkciju svakih 5 min
//          (ili pozvati send_session_reminders() direktno kroz pg_cron - lakše).
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Najjednostavnije: pozovi SQL funkciju koja pravi in-app poruke.
  // (Za pravi web-push ovdje bi se dohvatile push_subscriptions i slao
  //  payload preko web-push biblioteke s VAPID ključevima.)
  const { error } = await supabase.rpc("send_session_reminders");

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
