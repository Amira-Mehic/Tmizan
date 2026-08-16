// ============================================================================
// Broj ajeta na svakoj od 604 stranice mushafa, potreban trackeru za prikaz
// napretka po stranici. Vrijednost je ista za sve korisnike i ne mijenja se, pa
// se nakon prvog računanja pamti u localStorage i sljedeći put učitava odmah.
// Upit ide u dijelovima jer PostgREST vraća najviše 1000 redova odjednom.
// ============================================================================

import { useState, useEffect } from "react";
import { supabase } from "../../services/SupaBaseClient";
const CACHE_KEY = "tmizan_page_verse_counts_v2";
const PAGE = 1000; // PostgREST vraća max 1000 redova po upitu → povlačimo u dijelovima

export function usePageVerseCounts() {
  const [counts, setCounts] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    // Ako je već keširano, ne diramo bazu.
    const cached = (() => { try { return localStorage.getItem(CACHE_KEY); } catch { return null; } })();
    if (cached) return;

    let cancelled = false;

    (async () => {
      const next = {};
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("ayahs")
          .select("page_number")
          .range(from, from + PAGE - 1);

        if (error) { console.error("usePageVerseCounts:", error); break; }
        for (const row of data || []) {
          if (row.page_number != null) next[row.page_number] = (next[row.page_number] || 0) + 1;
        }
        if (!data || data.length < PAGE) break;
      }

      if (cancelled) return;
      setCounts(next);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* localStorage nedostupan */ }
    })();

    return () => { cancelled = true; };
  }, []); // samo jednom

  return counts;
}
