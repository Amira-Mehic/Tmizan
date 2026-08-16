// ============================================================================
// Ta'lim → Hifz Tracker sinhronizacija.
//
// Kad se dnevno učenje označi kao gotovo - bilo na Dashboardu ("Danas učiš"),
// bilo na /korisnik/hifz/ucenje (metode Redom / Postepeno) - stranice koje su
// time obuhvaćene se AUTOMATSKI upisuju u `page_progress`, isti izvor podataka
// koji čita Hifz Tracker. Korisnik više ne mora ručno duplo označavati napredak
// na dva mjesta.
//
// Nikad se ne prepisuje stranica koja je već u naprednijem/posebnom statusu
// (naucen/savladano/ponavljanje/treba_vjezbe postavljenom kao "naucen" ili jače)
// - te statuse korisnik namjerno postavlja/mijenja ručno u Hifz Trackeru, pa ih
// automatska sinhronizacija ne smije unazad degradirati. Dodiruju se samo
// stranice koje su još "prazna" ili "u_toku".
// ============================================================================

import { supabase } from "../../services/SupaBaseClient";
import { todayStr } from "../../constants/hifz/helpers";
import { getEdition } from "./mushaf";

const AUTO_OVERWRITABLE = new Set(["prazna", "u_toku"]);

// pageStatusMap: { [pageNumber]: "naucen" | "u_toku" }
async function upsertPageStatuses(userId, pageStatusMap) {
  const pages = Object.keys(pageStatusMap).map(Number);
  if (!userId || !pages.length) return;
  try {
    const { data: existing } = await supabase.from("page_progress")
      .select("page_number, status, start_date").eq("user_id", userId).in("page_number", pages);
    const existingMap = {};
    (existing || []).forEach((r) => { existingMap[r.page_number] = r; });

    const today = todayStr();
    const rows = pages
      .filter((p) => {
        const cur = existingMap[p]?.status;
        const wanted = pageStatusMap[p];
        if (cur && !AUTO_OVERWRITABLE.has(cur)) return false;       // naprednije/posebno stanje - ne diraj
        if (cur === "naucen" && wanted === "u_toku") return false;  // ne degradiraj naucen → u_toku
        return true;
      })
      .map((p) => ({
        user_id: userId, page_number: p, status: pageStatusMap[p],
        start_date: existingMap[p]?.start_date || today,
      }));

    if (rows.length) {
      await supabase.from("page_progress").upsert(rows, { onConflict: "user_id,page_number" });
    }
  } catch { /* sinhronizacija je bonus, ne smije blokirati glavni tok učenja */ }
}

// ── Dnevni raspored učenja (linije) → koje stranice su time pokrivene ──────
// from/to: { page, line } iz monthly_plans dnevnog unosa; editionId iz talim_plans.
// Stranica koja je u cjelosti unutar [from,to] → "naucen"; rubna (djelimično
// pokrivena) stranica → "u_toku" (nastavlja se sljedećeg dana).
export async function syncLearnedLineRange(userId, editionId, from, to) {
  if (!userId || !from || !to) return;
  let linesPerPage = 0;
  try { linesPerPage = getEdition(editionId).linesPerPage; } catch { return; }
  if (!linesPerPage) return;

  const map = {};
  for (let page = from.page; page <= to.page; page++) {
    const startLine = page === from.page ? from.line : 1;
    const endLine = page === to.page ? to.line : linesPerPage;
    map[page] = (startLine === 1 && endLine === linesPerPage) ? "naucen" : "u_toku";
  }
  await upsertPageStatuses(userId, map);
}

// ── Direktno poznate stranice (npr. "Redom kroz mushaf" potvrđeno bez greške)
//    → odmah "naucen" (cijela stranica je po definiciji metode proučena) ──────
export async function syncLearnedPages(userId, pageNumbers) {
  if (!userId || !pageNumbers?.length) return;
  const map = {};
  pageNumbers.forEach((p) => { map[p] = "naucen"; });
  await upsertPageStatuses(userId, map);
}

// ── Ajet-raspon (metoda "Postepeno") → stranica/e na kojoj se ti ajeti nalaze,
//    preko lokalne `ayahs` tabele (ista koja napaja Hifz Tracker PDF izvještaj) ──
export async function pagesForAyahRange(surahId, fromAyah, toAyah) {
  try {
    const { data } = await supabase.from("ayahs").select("page_number")
      .eq("surah_id", surahId).gte("ayah_number", fromAyah).lte("ayah_number", toAyah);
    return [...new Set((data || []).map((r) => r.page_number).filter((p) => p != null))];
  } catch { return []; }
}

// ── Obrnuto od pagesForAyahRange: raspon STRANICA → uređena lista ajet-ključeva
// na tim stranicama (mushaf redoslijed: sura pa ajet - sure su strogo uzastopne
// 1→114, pa je sortiranje po (surah_id, ayah_number) uvijek ispravan redoslijed
// čitanja, bez obzira gdje stranica prelazi iz jedne sure u drugu). Koristi ga
// "Postepeno (20×)" na Učenju danas da automatski povuče ajete koji odgovaraju
// današnjem planiranom rasponu (bez ručnog unosa sure/ajeta). ──────────────────
export async function ayahKeysForPageRange(fromPage, toPage) {
  try {
    const { data } = await supabase.from("ayahs")
      .select("verse_key, surah_id, ayah_number")
      .gte("page_number", fromPage).lte("page_number", toPage)
      .order("surah_id", { ascending: true })
      .order("ayah_number", { ascending: true });
    return (data || []).map((r) => r.verse_key).filter(Boolean);
  } catch { return []; }
}

// ── Uređena lista ajet-ključeva za CIJELI opseg plana (ne samo jedan dan) -
// koristi je ta'lim generator plana po ajetima ("ajeti" tempo-jedinica), da
// zna tačan redoslijed ajeta kroz koji dijeli dane, potpuno neovisno o
// redovima/stranicama. `pages`: lista brojeva stranica (iz scopeToPages) -
// ako je kontinuirana (bez rupa), koristi jedan raspon upit (brže i sigurnije
// od URL limita kod .in() sa 604 stavke za "cijeli Kur'an").
export async function ayahsInPages(pages) {
  if (!pages?.length) return [];
  try {
    const min = Math.min(...pages), max = Math.max(...pages);
    const isContiguous = (max - min + 1) === pages.length;
    let query = supabase.from("ayahs").select("verse_key, surah_id, ayah_number, page_number");
    query = isContiguous ? query.gte("page_number", min).lte("page_number", max) : query.in("page_number", pages);
    const { data } = await query.order("surah_id", { ascending: true }).order("ayah_number", { ascending: true });
    return (data || []).map((r) => r.verse_key).filter(Boolean);
  } catch { return []; }
}

// ── Tačan ajet-raspon [from,to] (oba {surah,ayah}) - koristi ga Postepeno
// sesija za dane iz "ajeti" plana, TAČNO onoliko ajeta koliko je taj dan
// dodijeljeno, bez povlačenja cijele stranice (za razliku od ayahKeysForPageRange). ──
export async function ayahKeysBetween(from, to) {
  if (!from?.surah || !to?.surah) return [];
  try {
    if (from.surah === to.surah) {
      const { data } = await supabase.from("ayahs").select("verse_key, ayah_number")
        .eq("surah_id", from.surah).gte("ayah_number", from.ayah).lte("ayah_number", to.ayah)
        .order("ayah_number", { ascending: true });
      return (data || []).map((r) => r.verse_key).filter(Boolean);
    }
    const [{ data: head }, { data: mid }, { data: tail }] = await Promise.all([
      supabase.from("ayahs").select("verse_key, ayah_number")
        .eq("surah_id", from.surah).gte("ayah_number", from.ayah)
        .order("ayah_number", { ascending: true }),
      to.surah - from.surah > 1
        ? supabase.from("ayahs").select("verse_key, surah_id, ayah_number")
            .gt("surah_id", from.surah).lt("surah_id", to.surah)
            .order("surah_id", { ascending: true }).order("ayah_number", { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase.from("ayahs").select("verse_key, ayah_number")
        .eq("surah_id", to.surah).lte("ayah_number", to.ayah)
        .order("ayah_number", { ascending: true }),
    ]);
    return [...(head || []), ...(mid || []), ...(tail || [])].map((r) => r.verse_key).filter(Boolean);
  } catch { return []; }
}
