// ============================================================================
// Popis oznaka ajeta po stranicama (stranica 1 daje "1:1", "1:2" i tako dalje),
// potreban PDF izvještaju da može ispisati napredak po pojedinačnom ajetu.
// Povlači svih 6236 ajeta, pa se pokreće tek kad se izvještaj zaista otvori i
// rezultat pamti u localStorage. Upit ide u dijelovima zbog ograničenja od 1000
// redova po pozivu.
// ============================================================================

import { useState, useEffect } from "react";
import { supabase } from "../../services/SupaBaseClient";
const CACHE_KEY = "tmizan_page_verse_keys_v2";
const PAGE = 1000; // PostgREST max 1000 redova po upitu → paginacija za svih 6236 ajeta

export function useAllPageVerseKeys(enabled = true) {
  const [keys, setKeys] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const cached = (() => { try { return localStorage.getItem(CACHE_KEY); } catch { return null; } })();
    if (cached) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      const map = {};
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("ayahs")
          .select("verse_key, page_number, surah_id, ayah_number")
          .order("surah_id", { ascending: true })
          .order("ayah_number", { ascending: true })
          .range(from, from + PAGE - 1);

        if (error) { console.error("useAllPageVerseKeys:", error); break; }
        for (const row of data || []) {
          if (row.page_number == null) continue;
          (map[row.page_number] ||= []).push(row.verse_key);
        }
        if (!data || data.length < PAGE) break;
      }

      if (cancelled) return;
      setKeys(map);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch { /* localStorage nedostupan */ }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  return { pageVerseKeys: keys, loadingKeys: loading };
}
