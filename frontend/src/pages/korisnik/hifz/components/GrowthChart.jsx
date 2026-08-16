// ============================================================================
// Graf rasta kroz vrijeme - koliko je stranica naučeno kumulativno po datumu
// (iz page_repeat_history / page_progress.start_date). Čist SVG, bez biblioteka.
// ============================================================================

import { useState, useEffect } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import { useLang } from "../../../../context/LanguageContext";
import { useAuth } from "../../../../context/AuthContext";
import { supabase } from "../../../../services/SupaBaseClient";
import HelpTip from "../../../../components/shared/HelpTip";

export default function GrowthChart() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!user?.id) { setLoading(false); return; }
    (async () => {
      try {
        // datum kad je stranica krenula/naučena → kumulativni rast
        const { data } = await supabase.from("page_progress")
          .select("start_date, status")
          .eq("user_id", user.id)
          .in("status", ["naucen", "savladano", "ponavljanje"]);
        const byDate = {};
        (data || []).forEach((r) => {
          const d = r.start_date || "?";
          if (d !== "?") byDate[d] = (byDate[d] || 0) + 1;
        });
        const dates = Object.keys(byDate).sort();
        let cum = 0;
        setPoints(dates.map((d) => ({ date: d, value: (cum += byDate[d]) })));
      } catch { setPoints([]); }
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading || points.length < 2) return null;

  const W = 320, H = 90, pad = 8;
  const maxV = points.at(-1).value;
  const stepX = (W - 2 * pad) / (points.length - 1);
  const coords = points.map((p, i) => ({
    x: pad + i * stepX,
    y: H - pad - (p.value / maxV) * (H - 2 * pad),
    ...p,
  }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const area = `${path} L ${coords.at(-1).x.toFixed(1)} ${H - pad} L ${coords[0].x.toFixed(1)} ${H - pad} Z`;

  return (
    <div className={`${theme.card} rounded-2xl p-4`}>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-semibold flex items-center">
          📈 {lang === "en" ? "Growth over time" : "Rast kroz vrijeme"}
          <HelpTip text={lang === "en"
            ? "Cumulative count of pages you've learned/reviewed, by the date each page started. Only appears once you have at least 2 data points."
            : "Kumulativan broj stranica koje si naučio/la ili ponovio/la, po datumu kad je svaka počela. Prikazuje se tek kad ima bar 2 tačke podataka."} />
        </h2>
        <span className={`text-sm ${theme.accent}`}>{maxV} {lang === "en" ? "pages" : "stranica"}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
        <path d={area} fill="currentColor" opacity="0.12" className={theme.accent} />
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className={theme.accent} strokeLinejoin="round" strokeLinecap="round" />
        {coords.at(-1) && <circle cx={coords.at(-1).x} cy={coords.at(-1).y} r="3" fill="currentColor" className={theme.accent} />}
      </svg>
      <div className={`flex justify-between text-[10px] ${theme.muted}`}>
        <span>{points[0].date}</span><span>{points.at(-1).date}</span>
      </div>
    </div>
  );
}
