// ============================================================================
// Vizuelni pregled narednih ~30 dana za AKTIVAN plan ponavljanja - "šta me
// čeka i kada", isti duh kao mjesečni kalendar na planu učenja, ali za
// ponavljanje. Traka dana (klik mijenja koji je dan prikazan ispod), isti
// obrazac kao AyahBrowser / PlanRasporedPage dan-traka.
//
// Za metode koje NEMAJU fiksni raspored (greske, novo_staro, nivo, slobodan,
// mualim) prikazuje samo kratko objašnjenje zašto kalendara nema.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { fetchRotationStates, fetchFemiStates } from "../../../../features/murajaah/rotationService";
import { fetchBlocks } from "../../../../features/murajaah/murajaahService";
import { forecastReviewPlan, DEFAULT_FORECAST_DAYS } from "../../../../features/murajaah/monthlyForecast";
import { todayStr, fmtDate } from "../../../../constants/hifz/helpers";
import HelpTip from "../../../../components/shared/HelpTip";

const NO_FORECAST_METHODS = new Set(["greske", "novo_staro", "nivo", "slobodan", "mualim"]);
const OPTIMISTIC_METHODS = new Set(["fibonacci", "tri_dana", "sedam_dana", "srs"]);

const STR = {
  bs: {
    title: "Pregled narednih 30 dana",
    loading: "Učitavanje…",
    empty: "Projekcija još nije spremna — pokušaj ponovo za koji trenutak.",
    todayLabel: "Danas",
    noneToday: "Ništa nije planirano za ovaj dan.",
    noFixedSchedule: "Ova metoda nema fiksni raspored unaprijed — prati se u hodu na Murajaa stranici.",
    optimisticNote: "Projekcija pretpostavlja da će svako ponavljanje proći uspješno (bez greške) — čim stvarno označiš 'Tačno' ili 'Greška' na Murajaa stranici, raspored ispod se prilagođava.",
    pages: "Str.", juzLabel: "Džuz", part: "Dio", blocksCount: (n) => `${n} blok${n === 1 ? "" : "a"} na redu`,
  },
  en: {
    title: "Next 30 days",
    loading: "Loading…",
    empty: "The projection isn't ready yet — try again in a moment.",
    todayLabel: "Today",
    noneToday: "Nothing planned for this day.",
    noFixedSchedule: "This method has no fixed schedule ahead of time — it's tracked live on the Review page.",
    optimisticNote: "This projection assumes every review goes well (no mistakes) — as soon as you actually mark 'Correct' or 'Mistake' on the Review page, the schedule below adjusts.",
    pages: "Page", juzLabel: "Juz", part: "Part", blocksCount: (n) => `${n} block${n === 1 ? "" : "s"} due`,
  },
};

function describeDay(entry, t) {
  const { kind, data } = entry;
  if (!data) return null;
  if (kind === "dzuzevi") return `${t.juzLabel} ${data.juz} (${t.pages.toLowerCase()} ${data.pages[0]}–${data.pages.at(-1)})`;
  if (kind === "stranice" || kind === "dinamicna") return data.pages?.length ? `${t.pages} ${data.pages.join(", ")}` : null;
  if (kind === "seton") return `${t.part} ${data.dio} (${t.pages.toLowerCase()} ${data.pages[0]}–${data.pages.at(-1)})`;
  if (kind === "femi" || kind === "dzuz_sedmica") return data.planned?.length ? `${t.pages} ${data.planned.join(", ")}` : null;
  if (kind === "blocks") return data.length ? t.blocksCount(data.length) : null;
  return null;
}

export function MonthlyReviewForecast({ plan, userId, theme, lang }) {
  const t = STR[lang] || STR.bs;
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  const noFixed = plan?.method && NO_FORECAST_METHODS.has(plan.method);

  const load = useCallback(async () => {
    if (!userId || !plan?.method || noFixed) { setLoading(false); return; }
    setLoading(true);
    setActiveIdx(0);
    try {
      const start = todayStr();
      const sources = {};

      if (["dzuzevi", "stranice", "seton", "dinamicna"].includes(plan.method)) {
        const rows = await fetchRotationStates(userId);
        sources.rotationState = rows.find((r) => r.type === plan.method) || null;
      } else if (plan.method === "femi" || plan.method === "dzuz_sedmica") {
        const rows = await fetchFemiStates(userId);
        const wanted = plan.method === "femi" ? "femi" : "dzuz_sedmicno";
        sources.femiRow = rows.find((r) => r.method === wanted) || null;
      } else if (["fibonacci", "tri_dana", "sedam_dana", "srs"].includes(plan.method)) {
        const all = await fetchBlocks(userId);
        sources.reviewBlocks = all.filter((b) => b.method === plan.method);
      }

      setForecast(forecastReviewPlan(plan.method, sources, { days: DEFAULT_FORECAST_DAYS, startDate: start }));
    } catch {
      setForecast(null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, plan?.method, plan?.id, noFixed]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (noFixed) {
    return <p className={`text-xs italic ${theme?.muted}`}>{t.noFixedSchedule}</p>;
  }
  if (loading) return <p className={`text-xs ${theme?.muted}`}>{t.loading}</p>;
  if (!forecast || !forecast.length) return <p className={`text-xs ${theme?.muted}`}>{t.empty}</p>;

  const today = todayStr();
  const active = forecast[Math.min(activeIdx, forecast.length - 1)];

  return (
    <div className="space-y-2">
      <p className={`text-xs font-semibold uppercase tracking-wider ${theme?.muted} flex items-center`}>
        {t.title}
        <HelpTip text={lang === "en"
          ? "Click a day in the strip below to see what's due that day. Methods without a fixed schedule show a short note instead."
          : "Klikni dan u traci ispod da vidiš šta je na redu tog dana. Metode bez fiksnog rasporeda umjesto toga prikazuju kratku napomenu."} />
      </p>

      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1.5 -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
        {forecast.map((d, i) => {
          const label = describeDay(d, t);
          const isToday = d.date === today;
          const isActive = i === activeIdx;
          return (
            <button key={d.date} type="button" onClick={() => setActiveIdx(i)}
              className={`shrink-0 snap-center w-16 rounded-xl px-1.5 py-2 text-center text-[11px] transition
                ${isActive ? theme?.button : theme?.cardSub}`}>
              <div className="font-semibold">{d.date.slice(8, 10)}.{d.date.slice(5, 7)}.</div>
              <div className={`mt-1 text-sm ${isActive ? "" : theme?.muted}`}>{label ? "•" : "—"}</div>
              {isToday && (
                <div className={`mt-0.5 text-[9px] font-bold ${isActive ? "" : theme?.accent}`}>{t.todayLabel}</div>
              )}
            </button>
          );
        })}
      </div>

      {active && (
        <div className={`${theme?.cardSub} rounded-xl p-3 text-sm`}>
          <p className={`text-xs font-semibold mb-1 ${theme?.muted}`}>{fmtDate(active.date)}</p>
          <p>{describeDay(active, t) || t.noneToday}</p>
        </div>
      )}

      {OPTIMISTIC_METHODS.has(plan.method) && (
        <p className={`text-[10px] italic ${theme?.muted} opacity-75`}>{t.optimisticNote}</p>
      )}
    </div>
  );
}
