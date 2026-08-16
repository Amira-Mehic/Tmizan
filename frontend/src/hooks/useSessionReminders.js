// ============================================================================
// Podsjetnici za časove - 60 i 30 minuta prije početka
// Radi kroz browser Notification API dok je aplikacija otvorena (bez
// servera); traži dozvolu jednom, pa zakazuje tajmere za nadolazeće sesije.
// ============================================================================

import { useEffect } from "react";
import { supabase } from "../services/SupaBaseClient";

const OFFSETS_MIN = [60, 30];

export function useSessionReminders(userId, lang = "bs") {
  useEffect(() => {
    if (!userId || typeof Notification === "undefined") return;
    let timers = [];
    let alive = true;

    (async () => {
      try {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
        if (Notification.permission !== "granted") return;

        // sesije u sljedećih 24h (RLS: individualne + preko halki)
        const now = Date.now();
        const { data } = await supabase
          .from("sessions").select("id, naslov, starts_at, link")
          .gte("starts_at", new Date(now).toISOString())
          .lte("starts_at", new Date(now + 24 * 3600e3).toISOString());
        if (!alive || !data?.length) return;

        for (const sn of data) {
          const startMs = new Date(sn.starts_at).getTime();
          for (const off of OFFSETS_MIN) {
            const fireAt = startMs - off * 60e3;
            if (fireAt <= now) continue;
            // izbjegni duple obavijesti (po sesiji+offsetu, pamti se lokalno)
            const key = `tmizan_notif_${sn.id}_${off}`;
            if (localStorage.getItem(key)) continue;
            timers.push(setTimeout(() => {
              try {
                localStorage.setItem(key, "1");
                new Notification(
                  lang === "en" ? `Class in ${off} min` : `Čas za ${off} min`,
                  { body: sn.naslov, tag: key }
                );
              } catch { /* notifikacija je bonus */ }
            }, fireAt - now));
          }
        }
      } catch { /* bez sesija */ }
    })();

    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [userId, lang]);
}
