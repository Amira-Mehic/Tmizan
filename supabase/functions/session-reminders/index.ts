// ============================================================================
// HTTP ulazna tačka za podsjetnike na predstojeće časove. Poziva se izvana, po
// rasporedu, i pokreće funkciju baze send_session_reminders iz migracije 0012
// koja upisuje obavijesti korisnicima. Postoji kao zasebna funkcija zato što
// se poziva preko HTTP-a, pa raspored može doći i izvan baze, a ne samo iz
// pg_cron rasporeda.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Odabir korisnika i sastavljanje teksta obavijesti rade se u bazi, jer se
  // tamo već nalaze i podaci o časovima i podešene sigurnosne provjere.
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
