// ============================================================================
// Prikaz "šta je danas na redu" za KRUŽNE metode ponavljanja (Motor A)
// Sistem džuzeva (+ vizuelni krug 30 segmenata), Po stranicama (kvota),
// Šetonova (dio X/Y), Dinamična raspodjela, Femi bi-ševk i Džuz sedmično.
// Čita stanje preko rotationService (page_progress-baziran per-stranica
// model) i pomjera ga na "Odradio danas". Bilježi greške po džuzu/
// stranici/dijelu (error_tracking → mapa slabih mjesta).
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import { useLang } from "../../../../context/LanguageContext";
import { useAuth } from "../../../../context/AuthContext";
import {
  fetchRotationStates, fetchFemiStates, rotationToday, advanceRotation,
  updateTempQuota, femiWeekToday, advanceFemi, demotePageToMotorB,
} from "../../../../features/murajaah/rotationService";
import { recordError } from "../../../../features/murajaah/greskeService";
import { makeBridge } from "../../../../features/murajaah/pohrana";
import { todayStr } from "../../../../constants/hifz/helpers";
import HelpTip from "../../../../components/shared/HelpTip";

const STR = {
  bs: {
    title: "Kružno ponavljanje", none: "Nema aktivnih kružnih metoda. Aktiviraj ih u Planneru.",
    dzuzToday: "Danas: Džuz", pages: "stranice", cycle: "ciklus", done: "Odradio/la danas",
    part: "Dio", of: "od", quota: "Kvota", morning: "Jutro", evening: "Veče",
    tempQuota: "Nova kvota", set: "Postavi",
    femiWeek: "Femi bi-ševk", juzWeek: "Džuz kroz sedmicu",
    todayPages: "Danas ponavljaš", juzLabel: "Džuz",
    errors: "Greške", avgDay: "Prosjek/dan", activeDays: "Aktivnih dana",
    dinamicna: "Dinamična raspodjela", dinamicnaQuota: "Danas ti sistem predlaže",
    daysLeft: "dana ostalo u ciklusu", remaining: "stranica ostalo",
    backlog: (n) => `+ ${n} zaostalo — čeka na sljedeće dane`,
    alsoLate: (list) => `Kasne i: ${list.join(", ")}`,
    bridgeLabel: "Most",
    rotationHelp: "Ovo su tvoje aktivne kružne metode ponavljanja — sistem ti svaki dan pokaže šta je na redu. Klikni 'Odradio/la danas' kad završiš, po potrebi upiši broj grešaka prije toga (3+ greške u ciklusu prebacuje stranicu u sistem ponavljanja umjesto kružne metode).",
    bridgeHelp: "Prethodna → trenutna → sljedeća stranica u cijelom nizu (ne samo unutar današnje kvote) — pomaže da vidiš kontekst prije i poslije, bez obzira na metodu.",
  },
  en: {
    title: "Cyclic review", none: "No active cyclic methods. Activate them in the Planner.",
    dzuzToday: "Today: Juz", pages: "pages", cycle: "cycle", done: "Done for today",
    part: "Part", of: "of", quota: "Quota", morning: "Morning", evening: "Evening",
    tempQuota: "New quota", set: "Set",
    femiWeek: "Femi bi-shawq", juzWeek: "Juz through the week",
    todayPages: "Review today", juzLabel: "Juz",
    errors: "Mistakes", avgDay: "Avg/day", activeDays: "Active days",
    dinamicna: "Dynamic distribution", dinamicnaQuota: "The system suggests today",
    daysLeft: "days left in the cycle", remaining: "pages left",
    backlog: (n) => `+ ${n} backlog — waiting for the next days`,
    alsoLate: (list) => `Also overdue: ${list.join(", ")}`,
    bridgeLabel: "Bridge",
    rotationHelp: "These are your active cyclic review methods — the system shows what's due each day. Tap 'Done for today' when finished; log mistakes first if any (3+ mistakes in a cycle moves the page into the review system instead of the cyclic method).",
    bridgeHelp: "Previous → current → next page across the whole sequence (not just today's quota) — gives you context before and after, regardless of method.",
  },
};

// ── lagana lokalna historija odrađenih dana (za statistiku kvote) ───────────
function logCompletion(userId, method, count) {
  try {
    const key = `tmizan_rot_${userId}_${method}`;
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    arr.push({ date: todayStr(), count });
    localStorage.setItem(key, JSON.stringify(arr.slice(-120)));
  } catch { /* */ }
}
function completionStats(userId, method) {
  try {
    const arr = JSON.parse(localStorage.getItem(`tmizan_rot_${userId}_${method}`) || "[]");
    if (!arr.length) return { avg: 0, days: 0 };
    const dani = new Set(arr.map((x) => x.date));
    const total = arr.reduce((s, x) => s + (x.count || 0), 0);
    return { avg: Math.round((total / dani.size) * 10) / 10, days: dani.size };
  } catch { return { avg: 0, days: 0 }; }
}

export default function RotationToday() {
  const { theme, sectionAccents: SECTION_ACCENTS } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const s = STR[lang] || STR.bs;
  const userId = user?.id;

  const [rotations, setRotations] = useState([]);
  const [femis, setFemis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tempVal, setTempVal] = useState("");
  const [err, setErr] = useState({}); // greške po metodi prije "odradio danas"

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const safe = async (fn, fb) => { try { return await fn(); } catch { return fb; } };
    const [r, f] = await Promise.all([safe(() => fetchRotationStates(userId), []), safe(() => fetchFemiStates(userId), [])]);
    setRotations(r); setFemis(f); setLoading(false);
  }, [userId]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (loading) return null;
  if (rotations.length === 0 && femis.length === 0) return null;

  // odradi dan + zabilježi greške (po džuzu/stranici/dijelu) + statistika
  const advance = async (st, today) => {
    const e = Number(err[st.type]) || 0;
    try {
      if (e > 0) {
        if (st.type === "dzuzevi") await recordError(userId, { ref: `Džuz ${today.juz}`, refType: "juz", errors: e, date: todayStr() });
        else if (st.type === "seton") await recordError(userId, { ref: `Dio ${today.dio}`, refType: "dio", errors: e, date: todayStr() });
        else if (st.type === "stranice") {
          for (const p of today.pages) {
            const item = await recordError(userId, { ref: String(p), refType: "page", errors: 1, date: todayStr() });
            // A→B: 3+ greške u ciklusu → stranica izlazi iz Motora A, ulazi u
            // Motor B (SRS) dok se ponovo ne utvrdi (dokument, sekcija 1.4/4.11)
            await demotePageToMotorB(userId, p, item?.recentErrors, "stranice");
          }
        }
      }
      const count = today.pages?.length || 0;
      logCompletion(userId, st.type, count);
      await advanceRotation(userId, st, today, { date: todayStr() });
      setErr((x) => ({ ...x, [st.type]: 0 }));
      load();
    } catch { /* */ }
  };
  const advFemi = async (row, today) => {
    try { await advanceFemi(userId, row, today.planned || [], todayStr()); load(); } catch { /* */ }
  };

  const ErrStepper = ({ method }) => (
    <label className="flex items-center gap-1.5 text-xs">
      <span className={theme.muted}>{s.errors}:</span>
      <input type="number" min="0" value={err[method] ?? 0}
        onChange={(e) => setErr((x) => ({ ...x, [method]: e.target.value }))}
        className={`w-14 ${SECTION_ACCENTS.progress.item} rounded-lg px-2 py-1 outline-none`} />
    </label>
  );

  return (
    <div className="space-y-4">
      <h2 className="font-semibold flex items-center">
        🔄 {s.title}
        <HelpTip text={s.rotationHelp} />
      </h2>

      {rotations.map((st) => {
        const today = rotationToday(st);
        if (!today) return null;
        const stats = st.type === "stranice" ? completionStats(userId, "stranice") : null;
        // allDue je već u "prikaznom" obliku (dzuzevi: brojevi džuzeva; seton:
        // 1-indeksirani dijelovi, isto kao "dio") - samo izbaci onaj koji je
        // već prikazan kao glavni "danas".
        const currentKey = today.kind === "dzuzevi" ? today.juz : today.kind === "seton" ? today.dio : null;
        const otherDue = (today.allDue || []).filter((x) => x !== currentKey);

        return (
          <div key={st.type} className={`${SECTION_ACCENTS.progress.wash} rounded-2xl p-4 border-l-4 ${SECTION_ACCENTS.progress.border}`}>
            {/* ── SISTEM DŽUZEVA + vizuelni krug 30 segmenata ── */}
            {today.kind === "dzuzevi" && (
              <div className="flex items-center gap-4 flex-wrap">
                <JuzCircle total={30} learned={st.items} todayJuz={today.juz} theme={theme} />
                <div className="flex-1 min-w-[180px] space-y-2">
                  <div className="text-sm font-semibold">{s.dzuzToday} {today.juz}</div>
                  <div className={`text-xs ${theme.muted}`}>
                    {s.pages} {today.pages[0]}–{today.pages.at(-1)} · {s.cycle} {st.cyclesDone + 1}
                  </div>
                  {otherDue.length > 0 && (
                    <div className={`text-xs ${theme.muted} italic`}>{s.alsoLate(otherDue)}</div>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <ErrStepper method="dzuzevi" />
                    <button onClick={() => advance(st, today)} className={`${theme.button} rounded-xl px-4 py-1.5 text-sm`}>✓ {s.done}</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── PO STRANICAMA (dnevna kvota) ── */}
            {today.kind === "stranice" && (
              <div className="space-y-2">
                <div className="text-sm font-semibold">📄 {s.quota}: {st.quota} {s.pages}/dan</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`${SECTION_ACCENTS.progress.item} rounded-xl p-2 text-center text-sm`}>
                    <div className={`text-[10px] ${theme.muted}`}>{s.morning}</div>
                    {today.jutro.join(", ")}
                  </div>
                  <div className={`${SECTION_ACCENTS.progress.item} rounded-xl p-2 text-center text-sm`}>
                    <div className={`text-[10px] ${theme.muted}`}>{s.evening}</div>
                    {today.vecer.join(", ")}
                  </div>
                </div>
                {today.zaostatak > 0 && (
                  <div className={`text-xs ${theme.muted} italic`}>{s.backlog(today.zaostatak)}</div>
                )}
                {/* ── Most (Bridge) - [prethodna → trenutna → sljedeća] stranica u
                    CIJELOM bazenu (ne samo unutar današnje kvote). Isti prikaz
                    kao u modelu višestruke pohrane (pohrana.js), ovdje primijenjen
                    na Motor A: Most nije zaključan za jednu metodu (dokument,
                    sekcija 4.10) - radi svugdje gdje postoji uređen niz stranica. ── */}
                {today.pages.length > 0 && (
                  <div className="space-y-1">
                    <div className={`text-[10px] font-semibold uppercase tracking-wider ${theme.muted} flex items-center`}>
                      {s.bridgeLabel}
                      <HelpTip text={s.bridgeHelp} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {today.pages.map((p) => {
                        const poolSorted = [...st.items].sort((a, b) => a - b);
                        const most = makeBridge(p, poolSorted);
                        return (
                          <span key={p} className={`${SECTION_ACCENTS.progress.item} rounded-lg px-2 py-1 text-xs`}>
                            <span className={theme.muted}>{most.prethodni ?? "▪"} → </span>
                            <b>{p}</b>
                            <span className={theme.muted}> → {most.sljedeci ?? "▪"}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {stats && stats.days > 0 && (
                  <div className={`flex gap-4 text-xs ${theme.muted}`}>
                    <span>📊 {s.avgDay}: <b className={theme.accent}>{stats.avg}</b></span>
                    <span>{s.activeDays}: <b className={theme.accent}>{stats.days}</b></span>
                  </div>
                )}
                <div className="flex gap-2 items-center flex-wrap">
                  <ErrStepper method="stranice" />
                  <button onClick={() => advance(st, today)} className={`${theme.button} rounded-xl px-4 py-1.5 text-sm`}>✓ {s.done}</button>
                  <input type="number" min="1" placeholder={s.tempQuota} value={tempVal} onChange={(e) => setTempVal(e.target.value)}
                    className={`w-28 ${SECTION_ACCENTS.progress.item} rounded-xl px-3 py-1.5 text-sm outline-none`} />
                  <button onClick={async () => { const n = parseInt(tempVal); if (n >= 1) { await updateTempQuota(userId, st, n); setTempVal(""); load(); } }}
                    className={`${SECTION_ACCENTS.progress.item} ${theme.muted} rounded-xl px-3 py-1.5 text-sm`}>{s.set}</button>
                </div>
              </div>
            )}

            {/* ── ŠETONOVA (dio X od Y) ── */}
            {today.kind === "seton" && (
              <div className="space-y-2">
                <div className="text-sm font-semibold">🗂 {s.part} {today.dio} {s.of} {today.total}</div>
                <div className={`text-xs ${theme.muted}`}>{s.pages} {today.pages[0]}–{today.pages.at(-1)}</div>
                {otherDue.length > 0 && (
                  <div className={`text-xs ${theme.muted} italic`}>{s.alsoLate(otherDue)}</div>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  <ErrStepper method="seton" />
                  <button onClick={() => advance(st, today)} className={`${theme.button} rounded-xl px-4 py-1.5 text-sm`}>✓ {s.done}</button>
                </div>
              </div>
            )}

            {/* ── DINAMIČNA RASPODJELA (kvota se svaki dan iznova računa) ── */}
            {today.kind === "dinamicna" && (
              <div className="space-y-2">
                <div className="text-sm font-semibold">⚖️ {s.dinamicna}</div>
                <div className={`text-xs ${theme.muted}`}>
                  {s.dinamicnaQuota} <b className={theme.accent}>{today.dnevnaKvota}</b> {s.pages}
                  {" · "}{today.daysLeft} {s.daysLeft} · {today.remaining} {s.remaining}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`${SECTION_ACCENTS.progress.item} rounded-xl p-2 text-center text-sm`}>
                    <div className={`text-[10px] ${theme.muted}`}>{s.morning}</div>
                    {today.jutro.join(", ")}
                  </div>
                  <div className={`${SECTION_ACCENTS.progress.item} rounded-xl p-2 text-center text-sm`}>
                    <div className={`text-[10px] ${theme.muted}`}>{s.evening}</div>
                    {today.vecer.join(", ")}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <ErrStepper method="dinamicna" />
                  <button onClick={() => advance(st, today)} className={`${theme.button} rounded-xl px-4 py-1.5 text-sm`}>✓ {s.done}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── FEMI / DŽUZ SEDMIČNO - oboje sad rade kao Dinamična (7-dnevni
          ciklus), pa je i prikaz isti oblik (kvota/dana ostalo/preostalo). ── */}
      {femis.map((row) => {
        const today = femiWeekToday(row);
        if (!today) return null;
        return (
          <div key={row.method} className={`${SECTION_ACCENTS.progress.wash} rounded-2xl p-4 space-y-2 border-l-4 ${SECTION_ACCENTS.progress.border}`}>
            <div className="text-sm font-semibold">
              {row.method === "femi" ? `🌙 ${s.femiWeek}` : `📅 ${s.juzWeek}${today.juz ? ` — ${s.juzLabel} ${today.juz}` : ""}`}
            </div>
            <div className={`text-xs ${theme.muted}`}>
              {today.daysLeft} {s.daysLeft} · {today.remaining} {s.remaining}
            </div>
            <div className={`text-xs ${theme.muted}`}>{s.todayPages}:</div>
            <div className={`${SECTION_ACCENTS.progress.item} rounded-xl p-2 text-sm`}>
              {today.planned?.length ? today.planned.join(", ") : "—"}
            </div>
            <button onClick={() => advFemi(row, today)} className={`${theme.button} rounded-xl px-4 py-1.5 text-sm`}>
              ✓ {s.done}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Vizuelni krug: 30 segmenata, popunjeni = naučeni džuzevi, sjaj = danas ──
function JuzCircle({ total, learned, todayJuz }) {
  const { lang } = useLang();
  const s = STR[lang] || STR.bs;
  const R = 46, cx = 54, cy = 54;
  const learnedSet = new Set(learned);
  return (
    <svg width="108" height="108" viewBox="0 0 108 108" className="shrink-0">
      {Array.from({ length: total }, (_, i) => {
        const juz = i + 1;
        const a0 = (i / total) * 2 * Math.PI - Math.PI / 2;
        const a1 = ((i + 1) / total) * 2 * Math.PI - Math.PI / 2 - 0.03;
        const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
        const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        const isToday = juz === todayJuz;
        const isLearned = learnedSet.has(juz);
        const color = isToday ? "#22c55e" : isLearned ? "#38bdf8" : "rgba(150,150,150,0.28)";
        return (
          <path key={juz} d={`M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`}
            stroke={color} strokeWidth={isToday ? 9 : 6} fill="none" strokeLinecap="round" />
        );
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" className="fill-current" style={{ fontSize: 20, fontWeight: 800 }}>
        {todayJuz || "—"}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 9, fill: "rgba(150,150,150,0.9)" }}>{s.juzLabel.toLowerCase()}</text>
    </svg>
  );
}
