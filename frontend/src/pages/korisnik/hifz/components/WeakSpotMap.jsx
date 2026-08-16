// ============================================================================
// Mapa slabih mjesta - vizuelni prikaz gdje korisnik najviše griješi
// Boja po broju grešaka (crveno 3+, žuto 1–2, sivo stabilno); ručno
// označavanje nesigurnog mjesta; kritične stranice idu u dnevni plan.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import { useLang } from "../../../../context/LanguageContext";
import { useAuth } from "../../../../context/AuthContext";
import { fetchWeakSpotMap, fetchErrorDailyPlan, flagUncertain } from "../../../../features/murajaah/greskeService";
import { todayStr } from "../../../../constants/hifz/helpers";
import HelpTip from "../../../../components/shared/HelpTip";

const STR = {
  bs: {
    title: "Mapa slabih mjesta", none: "Nema zabilježenih grešaka — bravo!",
    todayPlan: "Danas (prioritet): kritične stranice", flag: "Označi nesigurno mjesto",
    ref: "Stranica ili ajet (npr. 255 ili 2:255)", note: "Bilješka (npr. miješam s 2:255)",
    add: "Dodaj", critical: "Kritično", unsure: "Nesigurno", stable: "Stabilno",
    errors: "grešaka", forMualim: "za muallima", page: "Str.", noTodayPlan: "Trenutno nema kritičnih mjesta za danas.",
    mapHelp: "Puni se automatski iz grešaka koje označiš pri učenju/ponavljanju: crveno = 3+ grešaka (ide u dnevni prioritet ispod), žuto = 1-2, sivo = stabilno. 👁 znači da to vidi i tvoj muallim. Ispod možeš i ručno označiti mjesto koje ti je nesigurno, bez da si tu napravio/la grešku.",
  },
  en: {
    title: "Weak spots map", none: "No mistakes recorded — well done!",
    todayPlan: "Today (priority): critical pages", flag: "Flag an uncertain spot",
    ref: "Page or ayah (e.g. 255 or 2:255)", note: "Note (e.g. I mix it with 2:255)",
    add: "Add", critical: "Critical", unsure: "Unsure", stable: "Stable",
    errors: "mistakes", forMualim: "for muallim", page: "P.", noTodayPlan: "No critical spots for today right now.",
    mapHelp: "Fills in automatically from mistakes you flag while learning/reviewing: red = 3+ mistakes (goes into today's priority below), yellow = 1-2, gray = stable. 👁 means your muallim can see it too. Below, you can also manually flag a spot you feel unsure about, even without a recorded mistake.",
  },
};

const KAT_BOJA = { kriticno: "bg-red-600", nesigurno: "bg-yellow-600", stabilno: "bg-gray-500" };

export default function WeakSpotMap() {
  const { theme, sectionAccents: SECTION_ACCENTS } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const s = STR[lang] || STR.bs;
  const userId = user?.id;
  const today = todayStr();
  // placeholder na obojenoj (item) pozadini se gubio (browser default siva
  // se ne vidi na bež temama) - eksplicitno postavi na theme.text boju
  const placeholderCls = theme.text.replace("text-", "placeholder:text-");

  const [map, setMap] = useState([]);
  const [plan, setPlan] = useState({ jutro: [], vecer: [] });
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const safe = async (fn, fb) => { try { return await fn(); } catch { return fb; } };
    const [m, p] = await Promise.all([safe(() => fetchWeakSpotMap(userId), []), safe(() => fetchErrorDailyPlan(userId, today), { jutro: [], vecer: [] })]);
    setMap(m); setPlan(p); setLoading(false);
  }, [userId, today]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!ref.trim()) return;
    const refType = ref.includes(":") ? "verse" : "page";
    try { await flagUncertain(userId, { ref: ref.trim(), refType, note, date: today }); setRef(""); setNote(""); load(); } catch { /* */ }
  };

  if (loading) return null;

  return (
    <div className={`${SECTION_ACCENTS.alert.wash} rounded-2xl p-4 space-y-3 border-l-4 ${SECTION_ACCENTS.alert.border}`}>
      <h2 className="font-semibold flex items-center">
        ⚠️ {s.title}
        <HelpTip text={s.mapHelp} />
      </h2>

      {/* prioritet danas */}
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-2.5">
        <div className="text-xs font-semibold text-red-500 mb-1">{s.todayPlan}</div>
        {plan.jutro.filter((i) => i.recentErrors >= 3).length === 0 ? (
          <p className="text-xs text-red-500/70">{s.noTodayPlan}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {plan.jutro.filter((i) => i.recentErrors >= 3).map((i, k) => (
              <span key={k} className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                {i.refType === "page" ? `${s.page} ${i.ref}` : i.ref}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* mapa */}
      {map.length === 0 ? (
        <p className={`text-sm ${theme.muted}`}>{s.none}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {map.map((w, k) => (
            <span key={k} title={w.note || ""}
              className={`text-xs px-2.5 py-1 rounded-full text-white ${KAT_BOJA[w.kategorija] || "bg-gray-500"}`}>
              {w.refType === "page" ? `${s.page} ${w.ref}` : w.ref} · {w.errors} {w.zaMualima ? "👁" : ""}
            </span>
          ))}
          {/* greške po džuzu/dijelu (kružne metode) dolaze s ref već kao "Džuz X" / "Dio X" */}
        </div>
      )}

      {/* legenda */}
      <div className={`flex gap-3 text-[10px] font-medium ${theme.text}`}>
        <span>🔴 {s.critical}</span><span>🟡 {s.unsure}</span><span>⚪ {s.stable}</span>
      </div>

      {/* ručno označavanje */}
      <div className="flex gap-2 flex-wrap pt-1">
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={s.ref}
          className={`w-32 ${SECTION_ACCENTS.alert.item} ${placeholderCls} rounded-xl px-3 py-2 text-sm outline-none`} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={s.note}
          className={`flex-1 min-w-[140px] ${SECTION_ACCENTS.alert.item} ${placeholderCls} rounded-xl px-3 py-2 text-sm outline-none`} />
        <button onClick={add} className={`${theme.button} rounded-xl px-4 py-2 text-sm`}>{s.add}</button>
      </div>
    </div>
  );
}
