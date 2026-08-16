// ============================================================================
// Središnje stanje Hifz Trackera - status i napredak po stranicama, surama i
// pojedinačnim ajetima. Učitava napredak prijavljenog korisnika iz baze, drži
// ga u memoriji dok traje sesija i upisuje izmjene nazad, pa ekrani trackera
// ne pristupaju bazi direktno nego rade nad ovim stanjem.
//
// Uz upis napretka šalje i obavijest muallimu kad stranica ili cijeli džuz budu
// savladani. Da se ista obavijest ne pošalje dvaput, poslano se bilježi u
// localStorage.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/SupaBaseClient";
import { useAuth } from "../../context/AuthContext";
import { todayStr, getJuzPages } from "../../constants/hifz/helpers";
import { notifyMyMualim } from "../../services/mualimService";

// Milestone-obavijesti muallimu (dedupe u localStorage da se šalje jednom).
// Poziva se kad stranica postane "savladano": javi stranicu, pa ako je time
// zaokružen cijeli džuz - javi i džuz.
async function maybeNotifyMilestone(userId, pageNum, status, pageStatuses) {
  if (status !== "savladano") return;
  try {
    const pk = `tmizan_ms_page_${userId}_${pageNum}`;
    if (!localStorage.getItem(pk)) {
      localStorage.setItem(pk, "1");
      await notifyMyMualim(userId, `📄 Učenik je savladao stranicu ${pageNum}.`, { contextType: "stranica", contextRef: String(pageNum) });
    }
    // koji džuz sadrži ovu stranicu?
    for (let j = 1; j <= 30; j++) {
      const pages = getJuzPages(j);
      if (!pages.includes(pageNum)) continue;
      const svePotpuno = pages.every((p) => (p === pageNum ? true : pageStatuses[p]?.status === "savladano"));
      const jk = `tmizan_ms_juz_${userId}_${j}`;
      if (svePotpuno && !localStorage.getItem(jk)) {
        localStorage.setItem(jk, "1");
        await notifyMyMualim(userId, `🏆 Učenik je savladao cijeli ${j}. džuz!`, { contextType: "opcenito", contextRef: `juz:${j}` });
      }
      break;
    }
  } catch { /* obavijest je bonus */ }
}

const STREAK_KEY        = "tmizan_streak";
const LAST_ACTIVITY_KEY = "tmizan_last_activity";

// ── Streak i dalje živi lokalno (nije vezan za bazu, samo prati aktivnost u browseru) ──
function tickStreak() {
  try {
    const today = todayStr();
    const last  = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (last === today) return;

    const prev      = parseInt(localStorage.getItem(STREAK_KEY) || "0");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yd = yesterday.toISOString().split("T")[0];

    localStorage.setItem(STREAK_KEY, last === yd ? prev + 1 : 1);
    localStorage.setItem(LAST_ACTIVITY_KEY, today);
  } catch {
    // localStorage nedostupan - streak jednostavno neće biti zapamćen
  }
}

export function getStreak() {
  try { return parseInt(localStorage.getItem(STREAK_KEY) || "0"); } catch { return 0; }
}

// Zadnji dan kad je korisnik nešto stvarno uradio (Hifz Tracker izmjena) -
// koristi se za "Dobro došao nazad" ekran (zaostatak.js, sekcija 8).
export function getLastActivity() {
  try { return localStorage.getItem(LAST_ACTIVITY_KEY); } catch { return null; }
}

// ── Mapiranje: DB red (snake_case) → oblik koji komponente očekuju (camelCase) ──
function pageRowToState(row, history) {
  return {
    status: row.status, startDate: row.start_date || "", lastRepeat: row.last_repeat || "",
    repeatCount: row.repeat_count || 0, newLessonReps: row.new_lesson_reps || 0,
    postLearnReps: row.post_learn_reps || 0, confidence: row.confidence || 0,
    difficulty: row.difficulty || "srednja", errors: row.errors || 0,
    shortNote: row.short_note || "", notes: row.notes || "",
    history: history || [], updatedAt: row.updated_at || null, _dbId: row.id,
  };
}

function verseRowToState(row, history, similar) {
  return {
    status: row.status, startDate: row.start_date || "", lastRepeat: row.last_repeat || "",
    repeatCount: row.repeat_count || 0, confidence: row.confidence || 0,
    difficulty: row.difficulty || "srednja", errors: row.errors || 0,
    shortNote: row.short_note || "", notes: row.notes || "",
    personalTefsir: row.personal_tefsir || "",
    history: history || [], similarAyahs: similar || [], updatedAt: row.updated_at || null, _dbId: row.id,
  };
}

export function useHifzState() {
  const { user } = useAuth();
  const userId = user?.id;

  const [pageStatuses,  setPageStatuses]  = useState({});
  const [verseStatuses, setVerseStatuses] = useState({});
  const [surahStatuses, setSurahStatuses] = useState({});
  const [loading, setLoading] = useState(true);

  // ── Početno učitavanje svega za trenutnog korisnika ──────────────────────
  useEffect(() => {
    // Dio istog asinhronog učitavanja ispod (grananje: bez korisnika vs. fetch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!userId) { setLoading(false); return; }

    (async () => {
      setLoading(true);

      const [{ data: pages }, { data: verses }, { data: surahs }] = await Promise.all([
        supabase.from("page_progress").select("*").eq("user_id", userId),
        supabase.from("verse_progress").select("*").eq("user_id", userId),
        supabase.from("surah_progress").select("*").eq("user_id", userId),
      ]);

      const pageIds  = (pages  || []).map(p => p.id);
      const verseIds = (verses || []).map(v => v.id);

      const [{ data: pageHist }, { data: verseHist }, { data: similar }] = await Promise.all([
        pageIds.length  ? supabase.from("page_repeat_history").select("*").in("page_progress_id", pageIds)   : { data: [] },
        verseIds.length ? supabase.from("verse_repeat_history").select("*").in("verse_progress_id", verseIds) : { data: [] },
        verseIds.length ? supabase.from("similar_ayahs").select("*").in("verse_progress_id", verseIds)        : { data: [] },
      ]);

      const histByPage = {};
      (pageHist || []).forEach(h => {
        (histByPage[h.page_progress_id] ||= []).push({ id: h.id, date: h.repeat_date, note: h.note, errors: h.errors });
      });
      const histByVerse = {};
      (verseHist || []).forEach(h => {
        (histByVerse[h.verse_progress_id] ||= []).push({ id: h.id, date: h.repeat_date, note: h.note, errors: h.errors });
      });
      const similarByVerse = {};
      (similar || []).forEach(sa => {
        (similarByVerse[sa.verse_progress_id] ||= []).push({ id: sa.id, key: sa.similar_verse_key });
      });

      const pageMap = {};
      (pages || []).forEach(p => { pageMap[p.page_number] = pageRowToState(p, histByPage[p.id]); });

      const verseMap = {};
      (verses || []).forEach(v => { verseMap[v.verse_key] = verseRowToState(v, histByVerse[v.id], similarByVerse[v.id]); });

      const surahMap = {};
      (surahs || []).forEach(su => { surahMap[su.surah_id] = { ...(su.data || {}), notes: su.notes || "", _dbId: su.id }; });

      setPageStatuses(pageMap);
      setVerseStatuses(verseMap);
      setSurahStatuses(surahMap);
      setLoading(false);
    })();
  }, [userId]);

  // ── Zamjena cijele historije za jednu stranicu/ajet (jednostavno i sigurno: obriši pa upiši) ──
  async function replaceHistory(table, fkColumn, fkValue, history) {
    await supabase.from(table).delete().eq(fkColumn, fkValue);
    if (history?.length) {
      await supabase.from(table).insert(
        history.map(h => ({ [fkColumn]: fkValue, repeat_date: h.date, note: h.note || null, errors: h.errors || 0 }))
      );
    }
  }

  // ── Brza promjena statusa stranice (klik na karticu) ─────────────────────
  const setPageStatus = useCallback(async (pageNum, status) => {
    if (!userId) return;
    const existing = pageStatuses[pageNum];
    // "prazna" (reset) uvijek briše start_date - inače stranica ostaje
    // zauvijek zabilježena kao "danas naučena" i nakon što je vraćena na
    // Nije počet (todayPagesCount je filtrira po startDate === today).
    const startDate = status === "prazna" ? null : (existing?.startDate || todayStr());

    const { data, error } = await supabase.from("page_progress")
      .upsert({ user_id: userId, page_number: pageNum, status, start_date: startDate }, { onConflict: "user_id,page_number" })
      .select().single();

    if (error) { console.error("setPageStatus:", error); return; }

    tickStreak();
    setPageStatuses(prev => ({ ...prev, [pageNum]: pageRowToState(data, existing?.history) }));
    maybeNotifyMilestone(userId, pageNum, status, pageStatuses);
  }, [userId, pageStatuses]);

  // ── Brzo označavanje CIJELE stranice: stranica + svi njeni ajeti odjednom ──
  const setPageStatusBulk = useCallback(async (pageNum, status, verseKeys) => {
    if (!userId) return;
    const existing  = pageStatuses[pageNum];
    const startDate = status === "prazna" ? null : (existing?.startDate || todayStr());

    const verseRows = (verseKeys || []).map(verseKey => ({
      user_id: userId, verse_key: verseKey, status,
      start_date: status === "prazna" ? null : (verseStatuses[verseKey]?.startDate || todayStr()),
    }));

    const [pageRes, verseRes] = await Promise.all([
      supabase.from("page_progress")
        .upsert({ user_id: userId, page_number: pageNum, status, start_date: startDate }, { onConflict: "user_id,page_number" })
        .select().single(),
      verseRows.length
        ? supabase.from("verse_progress").upsert(verseRows, { onConflict: "user_id,verse_key" }).select()
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (pageRes.error)  console.error("setPageStatusBulk (stranica):", pageRes.error);
    if (verseRes.error) console.error("setPageStatusBulk (ajeti):", verseRes.error);

    tickStreak();

    if (pageRes.data) {
      setPageStatuses(prev => ({ ...prev, [pageNum]: pageRowToState(pageRes.data, existing?.history) }));
      maybeNotifyMilestone(userId, pageNum, status, pageStatuses);
    }
    if (verseRes.data?.length) {
      setVerseStatuses(prev => {
        const next = { ...prev };
        verseRes.data.forEach(row => {
          next[row.verse_key] = verseRowToState(row, prev[row.verse_key]?.history, prev[row.verse_key]?.similarAyahs);
        });
        return next;
      });
    }
  }, [userId, pageStatuses, verseStatuses]);

  // ── Brzo označavanje VIŠE stranica odjednom (npr. cijeli džuz) + opcionalno ajeti ──
  const setPagesStatusBulk = useCallback(async (pageNumbers, status, verseKeys) => {
    if (!userId || !pageNumbers?.length) return;

    const pageRows = pageNumbers.map(pageNum => ({
      user_id: userId, page_number: pageNum, status,
      start_date: status === "prazna" ? null : (pageStatuses[pageNum]?.startDate || todayStr()),
    }));
    const verseRows = (verseKeys || []).map(verseKey => ({
      user_id: userId, verse_key: verseKey, status,
      start_date: status === "prazna" ? null : (verseStatuses[verseKey]?.startDate || todayStr()),
    }));

    const [pageRes, verseRes] = await Promise.all([
      supabase.from("page_progress").upsert(pageRows, { onConflict: "user_id,page_number" }).select(),
      verseRows.length
        ? supabase.from("verse_progress").upsert(verseRows, { onConflict: "user_id,verse_key" }).select()
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (pageRes.error)  console.error("setPagesStatusBulk (stranice):", pageRes.error);
    if (verseRes.error) console.error("setPagesStatusBulk (ajeti):", verseRes.error);

    tickStreak();

    if (pageRes.data?.length) {
      setPageStatuses(prev => {
        const next = { ...prev };
        pageRes.data.forEach(row => { next[row.page_number] = pageRowToState(row, prev[row.page_number]?.history); });
        return next;
      });
    }
    if (verseRes.data?.length) {
      setVerseStatuses(prev => {
        const next = { ...prev };
        verseRes.data.forEach(row => {
          next[row.verse_key] = verseRowToState(row, prev[row.verse_key]?.history, prev[row.verse_key]?.similarAyahs);
        });
        return next;
      });
    }
  }, [userId, pageStatuses, verseStatuses]);

  // ── Snimanje detalja stranice (EditForm) ─────────────────────────────────
  const savePageDetail = useCallback(async (pageNum, formData) => {
    if (!userId) return;
    const { history, ...rest } = formData;

    const { data, error } = await supabase.from("page_progress")
      .upsert({
        user_id: userId, page_number: pageNum,
        status: rest.status, start_date: rest.startDate || null, last_repeat: rest.lastRepeat || null,
        repeat_count: rest.repeatCount || 0, new_lesson_reps: rest.newLessonReps || 0,
        post_learn_reps: rest.postLearnReps || 0, confidence: rest.confidence || 0,
        difficulty: rest.difficulty || "srednja", errors: rest.errors || 0,
        short_note: rest.shortNote || null, notes: rest.notes || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,page_number" })
      .select().single();

    if (error) { console.error("savePageDetail:", error); return; }

    await replaceHistory("page_repeat_history", "page_progress_id", data.id, history);
    tickStreak();
    setPageStatuses(prev => ({ ...prev, [pageNum]: pageRowToState(data, history) }));
  }, [userId]);

  // ── Snimanje detalja ajeta (VerseDetailView) ─────────────────────────────
  // Opcionalni 3. argument (pageNum) - ako je poznat i stranica je još uvijek
  // "Nije počet", a ajet upravo prestaje biti prazan, stranica automatski
  // postaje "U toku" (ne diramo stranicu ako već ima neki drugi status).
  const saveVerseDetail = useCallback(async (verseKey, formData, pageNum) => {
    if (!userId) return;
    const { history, similarAyahs, ...rest } = formData;

    const { data, error } = await supabase.from("verse_progress")
      .upsert({
        user_id: userId, verse_key: verseKey,
        status: rest.status, start_date: rest.startDate || null, last_repeat: rest.lastRepeat || null,
        repeat_count: rest.repeatCount || 0, confidence: rest.confidence || 0,
        difficulty: rest.difficulty || "srednja", errors: rest.errors || 0,
        short_note: rest.shortNote || null, notes: rest.notes || null,
        personal_tefsir: rest.personalTefsir || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,verse_key" })
      .select().single();

    if (error) { console.error("saveVerseDetail:", error); return; }

    await replaceHistory("verse_repeat_history", "verse_progress_id", data.id, history);

    await supabase.from("similar_ayahs").delete().eq("verse_progress_id", data.id);
    if (similarAyahs?.length) {
      await supabase.from("similar_ayahs").insert(
        similarAyahs.map(sa => ({ verse_progress_id: data.id, similar_verse_key: sa.key }))
      );
    }

    tickStreak();
    setVerseStatuses(prev => ({ ...prev, [verseKey]: verseRowToState(data, history, similarAyahs) }));

    // Auto-bump: ajet je upravo postao ne-prazan, a stranica je još "Nije počet" → "U toku"
    if (pageNum && rest.status && rest.status !== "prazna") {
      const currentPageStatus = pageStatuses[pageNum]?.status || "prazna";
      if (currentPageStatus === "prazna") {
        setPageStatus(pageNum, "u_toku");
      }
    }
  }, [userId, pageStatuses, setPageStatus]);

  // ── Brzo označavanje CIJELE sure: sve stranice + svi ajeti odjednom ──────
  // (redovi na stranici se ne čuvaju posebno - automatski se preračunaju iz
  //  omjera naučenih ajeta, pa se sami ažuriraju čim se ajeti postave)
  const setSurahStatusBulk = useCallback(async (surah, status) => {
    if (!userId || !surah) return;

    const pages     = Array.from({ length: surah.endPage - surah.startPage + 1 }, (_, i) => surah.startPage + i);
    const verseKeys = Array.from({ length: surah.verses }, (_, i) => `${surah.id}:${i + 1}`);

    const pageRows = pages.map(pageNum => ({
      user_id: userId, page_number: pageNum, status,
      start_date: status === "prazna" ? null : (pageStatuses[pageNum]?.startDate || todayStr()),
    }));
    const verseRows = verseKeys.map(verseKey => ({
      user_id: userId, verse_key: verseKey, status,
      start_date: status === "prazna" ? null : (verseStatuses[verseKey]?.startDate || todayStr()),
    }));

    const [{ data: pData, error: pErr }, { data: vData, error: vErr }] = await Promise.all([
      supabase.from("page_progress").upsert(pageRows, { onConflict: "user_id,page_number" }).select(),
      supabase.from("verse_progress").upsert(verseRows, { onConflict: "user_id,verse_key" }).select(),
    ]);

    if (pErr) console.error("setSurahStatusBulk (stranice):", pErr);
    if (vErr) console.error("setSurahStatusBulk (ajeti):", vErr);

    tickStreak();

    setPageStatuses(prev => {
      const next = { ...prev };
      (pData || []).forEach(row => {
        next[row.page_number] = pageRowToState(row, prev[row.page_number]?.history);
      });
      return next;
    });
    setVerseStatuses(prev => {
      const next = { ...prev };
      (vData || []).forEach(row => {
        next[row.verse_key] = verseRowToState(row, prev[row.verse_key]?.history, prev[row.verse_key]?.similarAyahs);
      });
      return next;
    });
  }, [userId, pageStatuses, verseStatuses]);

  // ── Snimanje detalja sure (SurahDetailView) ──────────────────────────────
  const saveSurahDetail = useCallback(async (surahId, formData) => {
    if (!userId) return;
    const { notes, ...rest } = formData || {};

    const { data, error } = await supabase.from("surah_progress")
      .upsert({ user_id: userId, surah_id: surahId, notes: notes || null, data: rest, updated_at: new Date().toISOString() },
        { onConflict: "user_id,surah_id" })
      .select().single();

    if (error) { console.error("saveSurahDetail:", error); return; }

    tickStreak();
    setSurahStatuses(prev => ({ ...prev, [surahId]: { ...rest, notes: notes || "", _dbId: data.id } }));
  }, [userId]);

  // ── Brisanje/reset podataka - vraća na "Nije počet" i briše SVE zapise ──────
  // (historija/slični ajeti brišu se automatski preko on delete cascade u bazi)

  // Jedna stranica + njeni ajeti
  const resetPageData = useCallback(async (pageNum, verseKeys) => {
    if (!userId) return;
    const results = await Promise.all([
      supabase.from("page_progress").delete().eq("user_id", userId).eq("page_number", pageNum),
      verseKeys?.length
        ? supabase.from("verse_progress").delete().eq("user_id", userId).in("verse_key", verseKeys)
        : Promise.resolve({ error: null }),
    ]);
    results.forEach(r => { if (r?.error) console.error("resetPageData:", r.error); });

    setPageStatuses(prev => { const next = { ...prev }; delete next[pageNum]; return next; });
    if (verseKeys?.length) {
      setVerseStatuses(prev => {
        const next = { ...prev };
        verseKeys.forEach(k => delete next[k]);
        return next;
      });
    }
  }, [userId]);

  // Cijela sura: sve njene stranice + ajeti + surah_progress zapis
  const resetSurahData = useCallback(async (surah) => {
    if (!userId || !surah) return;
    const pages     = Array.from({ length: surah.endPage - surah.startPage + 1 }, (_, i) => surah.startPage + i);
    const verseKeys = Array.from({ length: surah.verses }, (_, i) => `${surah.id}:${i + 1}`);

    const results = await Promise.all([
      supabase.from("page_progress").delete().eq("user_id", userId).in("page_number", pages),
      supabase.from("verse_progress").delete().eq("user_id", userId).in("verse_key", verseKeys),
      supabase.from("surah_progress").delete().eq("user_id", userId).eq("surah_id", surah.id),
    ]);
    results.forEach(r => { if (r?.error) console.error("resetSurahData:", r.error); });

    setPageStatuses(prev => { const next = { ...prev }; pages.forEach(p => delete next[p]); return next; });
    setVerseStatuses(prev => { const next = { ...prev }; verseKeys.forEach(k => delete next[k]); return next; });
    setSurahStatuses(prev => { const next = { ...prev }; delete next[surah.id]; return next; });
  }, [userId]);

  // Cijeli džuz: sve njegove stranice + ajeti (verseKeys se dohvate izvana, isto
  // kao kod kaskadnog označavanja džuza - verse_key se ne može izračunati lokalno)
  const resetPagesData = useCallback(async (pageNumbers, verseKeys) => {
    if (!userId || !pageNumbers?.length) return;
    const results = await Promise.all([
      supabase.from("page_progress").delete().eq("user_id", userId).in("page_number", pageNumbers),
      verseKeys?.length
        ? supabase.from("verse_progress").delete().eq("user_id", userId).in("verse_key", verseKeys)
        : Promise.resolve({ error: null }),
    ]);
    results.forEach(r => { if (r?.error) console.error("resetPagesData:", r.error); });

    setPageStatuses(prev => { const next = { ...prev }; pageNumbers.forEach(p => delete next[p]); return next; });
    if (verseKeys?.length) {
      setVerseStatuses(prev => {
        const next = { ...prev };
        verseKeys.forEach(k => delete next[k]);
        return next;
      });
    }
  }, [userId]);

  return {
    loading,
    pageStatuses, verseStatuses, surahStatuses,
    setPageStatus, setPageStatusBulk, setPagesStatusBulk, savePageDetail, saveVerseDetail, saveSurahDetail, setSurahStatusBulk,
    resetPageData, resetSurahData, resetPagesData,
  };
}
