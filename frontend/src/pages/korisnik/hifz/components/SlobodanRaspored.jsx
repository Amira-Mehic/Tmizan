// ============================================================================
// Metoda slobodnog rasporeda - ručno bilježenje bez automatike
// Korisnik sam otvori stranicu/suru/ajet, označi da je ponovio, unese greške
// i bilješku. Aplikacija samo čuva historiju i prikazuje statistike.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import { useLang } from "../../../../context/LanguageContext";
import { useAuth } from "../../../../context/AuthContext";
import { supabase } from "../../../../services/SupaBaseClient";
import { stats as slobodanStats } from "../../../../features/murajaah/slobodan";
import { todayStr } from "../../../../constants/hifz/helpers";
import HelpTip from "../../../../components/shared/HelpTip";

const STR = {
  bs: {
    title: "Slobodni raspored", subtitle: "Ti vodiš — aplikacija samo bilježi i računa statistiku",
    ref: "Šta si ponovio/la (npr. 255 ili 2:255 ili sura 36)", refType: "Tip",
    page: "Stranica", verse: "Ajet", surah: "Sura", juz: "Džuz",
    errors: "Greške", note: "Bilješka", record: "Zabilježi ponavljanje", recorded: "Zabilježeno ✓",
    statsTitle: "Statistika", total: "Ukupno ponavljanja", activeDays: "Aktivnih dana",
    avg: "Prosjek/dan", errSum: "Ukupno grešaka",
    history: "Historija", noHistory: "Još nema unosa.", noErr: "bez greške",
  },
  en: {
    title: "Free schedule", subtitle: "You lead — the app only records and computes stats",
    ref: "What you reviewed (e.g. 255 or 2:255 or surah 36)", refType: "Type",
    page: "Page", verse: "Ayah", surah: "Surah", juz: "Juz",
    errors: "Mistakes", note: "Note", record: "Record review", recorded: "Recorded ✓",
    statsTitle: "Statistics", total: "Total reviews", activeDays: "Active days",
    avg: "Avg/day", errSum: "Total mistakes",
    history: "History", noHistory: "No entries yet.", noErr: "no mistakes",
  },
};

export default function SlobodanRaspored() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const s = STR[lang] || STR.bs;
  const userId = user?.id;
  const today = todayStr();

  const [log, setLog] = useState([]);
  const [ref, setRef] = useState("");
  const [refType, setRefType] = useState("page");
  const [errors, setErrors] = useState(0);
  const [note, setNote] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const { data } = await supabase.from("free_review_log").select("*")
        .eq("user_id", userId).order("review_date", { ascending: false }).limit(100);
      setLog((data || []).map((r) => ({ ref: r.ref, refType: r.ref_type, date: r.review_date, errors: r.errors, note: r.note })));
    } catch { setLog([]); }
    setLoading(false);
  }, [userId]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const record = async () => {
    if (!ref.trim()) return;
    try {
      await supabase.from("free_review_log").insert({
        user_id: userId, ref: ref.trim(), ref_type: refType,
        review_date: today, errors: Number(errors) || 0, note,
      });
      setRef(""); setErrors(0); setNote(""); setOk(true); setTimeout(() => setOk(false), 2000);
      load();
    } catch { /* */ }
  };

  const st = slobodanStats(log, today);
  const inp = `${theme.cardSub} rounded-xl px-3 py-2 text-sm outline-none`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold flex items-center">
          🕊 {s.title}
          <HelpTip text={lang === "en"
            ? "No automatic schedule here — you decide what to review. Type what you covered, pick its type (page/ayah/surah/juz), optionally log mistakes, and record it. Stats and history below update automatically."
            : "Ovdje nema automatskog rasporeda — ti biraš šta ćeš ponoviti. Upiši šta si prošao/la, izaberi tip (stranica/ajet/sura/džuz), po potrebi upiši greške i zabilježi. Statistika i historija ispod se ažuriraju automatski."} />
        </h2>
        <p className={`text-sm ${theme.muted}`}>{s.subtitle}</p>
      </div>

      {/* unos */}
      <div className={`${theme.card} rounded-2xl p-4 space-y-2`}>
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={s.ref} className={`w-full ${inp}`} />
        <div className="flex gap-2 flex-wrap">
          {["page", "verse", "surah", "juz"].map((r) => (
            <button key={r} onClick={() => setRefType(r)} className={`rounded-xl px-3 py-1.5 text-sm ${refType === r ? theme.button : `${theme.cardSub} ${theme.muted}`}`}>
              {s[r]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <label className="text-xs flex items-center gap-1.5">
            <span className={theme.muted}>{s.errors}:</span>
            <input type="number" min="0" value={errors} onChange={(e) => setErrors(e.target.value)} className={`w-16 ${inp}`} />
          </label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={s.note} className={`flex-1 min-w-[120px] ${inp}`} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={record} className={`${theme.button} rounded-xl px-5 py-2 text-sm`}>✓ {s.record}</button>
          {ok && <span className="text-sm text-green-500">{s.recorded}</span>}
        </div>
      </div>

      {/* statistika */}
      <div className={`${theme.card} rounded-2xl p-4`}>
        <h3 className="font-semibold text-sm mb-3">📊 {s.statsTitle}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[[st.ukupno, s.total], [st.aktivnihDana, s.activeDays], [st.prosjekDnevno, s.avg], [st.greskeUkupno, s.errSum]].map(([v, label], i) => (
            <div key={i} className={`${theme.cardSub} rounded-xl p-3`}>
              <div className={`text-xl font-black ${theme.accent}`}>{v}</div>
              <div className={`text-[10px] ${theme.muted}`}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* historija */}
      <div className={`${theme.card} rounded-2xl p-4`}>
        <h3 className="font-semibold text-sm mb-2">🕘 {s.history}</h3>
        {loading ? <p className={theme.muted}>…</p> : log.length === 0 ? (
          <p className={`text-sm ${theme.muted}`}>{s.noHistory}</p>
        ) : (
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {log.slice(0, 30).map((e, i) => (
              <li key={i} className={`${theme.cardSub} rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-2`}>
                <span>{e.ref} <span className={`text-xs ${theme.muted}`}>({s[e.refType]})</span></span>
                <span className={`text-xs shrink-0 ${e.errors > 0 ? "text-red-500" : theme.muted}`}>
                  {e.date} · {e.errors > 0 ? `${e.errors} ${s.errors.toLowerCase()}` : s.noErr}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
