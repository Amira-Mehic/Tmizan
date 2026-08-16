// ============================================================================
// Dohvat ajeta jedne stranice mushafa iz tabele `ayahs`. Tekst Kur'ana stoji u
// vlastitoj bazi, a ne iza vanjskog API-ja, pa prikaz stranice ne zavisi od
// dostupnosti tuđeg servisa.
// ============================================================================

import { useState, useEffect } from "react";
import { supabase } from "../../services/SupaBaseClient";
export function usePageVerses(pageNum) {
  const [verses, setVerses]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pageNum) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setVerses(null);
      const { data, error } = await supabase
        .from("ayahs")
        .select("verse_key, ayah_number, text_uthmani")
        .eq("page_number", pageNum)
        .order("surah_id", { ascending: true })
        .order("ayah_number", { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error("usePageVerses:", error);
        setVerses([]);
      } else {
        setVerses((data || []).map(a => ({
          verse_key:    a.verse_key,
          verse_number: a.ayah_number,   // komponente koriste verse_number
          text_uthmani: a.text_uthmani,
        })));
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [pageNum]);

  return { verses, loading };
}
