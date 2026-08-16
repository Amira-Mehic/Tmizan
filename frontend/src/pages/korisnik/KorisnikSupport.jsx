// ============================================================================
// Podrška - prijava greške, pitanje ili prijedlog
// Tiket ide u tabelu support_tickets (migracija 0010); korisnik vidi
// svoje tikete i njihov status. Mobile-first, prati temu, bs/en.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/SupaBaseClient";
import BackButton from "../../components/shared/BackButton";
import GuidedTour from "../../components/shared/GuidedTour";
import { PageTourButton } from "../../components/shared/PageTourButton";
import { usePageTour } from "../../hooks/usePageTour";
import { SUPPORT_TOUR } from "../../constants/tours/supportTour";
import HelpTip from "../../components/shared/HelpTip";

const VRSTE = ["greska", "pitanje", "prijedlog"];
const VRSTA_ICON = { greska: "🐛", pitanje: "❓", prijedlog: "💡" };
const STATUS_BOJA = { otvoren: "bg-amber-500", u_obradi: "bg-sky-500", rijesen: "bg-green-600" };

export default function KorisnikSupport() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [vrsta, setVrsta] = useState("greska");
  const [naslov, setNaslov] = useState("");
  const [opis, setOpis] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [tickets, setTickets] = useState([]);
  const tour = usePageTour("support", SUPPORT_TOUR);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from("support_tickets").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      setTickets(data || []);
    } catch { /* tabela možda još ne postoji */ }
  }, [user]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!naslov.trim() || !opis.trim()) return;
    setError(false);
    try {
      const { error: e } = await supabase.from("support_tickets").insert({
        user_id: user.id, vrsta, naslov, opis,
      });
      if (e) throw e;
      setSent(true); setNaslov(""); setOpis("");
      load();
    } catch { setError(true); }
  };

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <GuidedTour steps={tour.steps} active={tour.active} onFinish={tour.finish} theme={theme} lang={tour.lang} dismissible />
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton />
        <div data-tour="tour-support-page">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
            🛟 {t("support.title")}
            <PageTourButton onClick={tour.start} />
          </h1>
          <p className={`${theme.muted} text-sm mt-1`}>{t("support.subtitle")}</p>
        </div>

        {/* ── Forma ── */}
        <div className={`${theme.card} rounded-2xl p-5 space-y-3`}>
          <div className="flex gap-2 flex-wrap">
            {VRSTE.map((v) => (
              <button
                key={v}
                onClick={() => setVrsta(v)}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  vrsta === v ? theme.button : `${theme.cardSub} ${theme.muted}`
                }`}
              >
                {VRSTA_ICON[v]} {t(`support.vrsta_${v}`)}
              </button>
            ))}
          </div>
          <input
            value={naslov} onChange={(e) => setNaslov(e.target.value)}
            placeholder={t("support.titlePlaceholder")}
            className={`w-full ${theme.cardSub} rounded-xl px-3 py-2.5 text-sm outline-none`}
          />
          <textarea
            value={opis} onChange={(e) => setOpis(e.target.value)} rows={5}
            placeholder={t("support.descPlaceholder")}
            className={`w-full ${theme.cardSub} rounded-xl px-3 py-2.5 text-sm outline-none resize-none`}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={submit} className={`${theme.button} rounded-xl px-6 py-2.5 text-sm font-semibold`}>
              {t("support.send")}
            </button>
            {sent && <span className="text-sm text-green-500">✓ {t("support.sent")}</span>}
            {error && <span className="text-sm text-red-500">{t("support.error")}</span>}
          </div>
        </div>

        {/* ── Moji tiketi - UVIJEK prikazano ── */}
        <div className="space-y-2">
          <h2 className="font-semibold flex items-center">
            {t("support.myTickets")}
            <HelpTip text="Žuto = otvoreno (još nije pregledano), plavo = u obradi (tim radi na tome), zeleno = riješeno. Ako administrator odgovori, odgovor se pojavljuje ispod tvog opisa." />
          </h2>
          {tickets.length === 0 ? (
            <p className={`text-sm ${theme.muted}`}>{t("support.noTickets")}</p>
          ) : (
            tickets.map((tk) => (
              <div key={tk.id} className={`${theme.card} rounded-2xl p-4 flex items-start justify-between gap-3`}>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{VRSTA_ICON[tk.vrsta]} {tk.naslov}</div>
                  <div className={`text-xs mt-1 ${theme.muted} line-clamp-2`}>{tk.opis}</div>
                  {tk.odgovor && <div className={`text-xs mt-2 ${theme.accent}`}>↳ {tk.odgovor}</div>}
                </div>
                <span className={`shrink-0 text-[10px] text-white px-2 py-1 rounded-full ${STATUS_BOJA[tk.status] || "bg-gray-500"}`}>
                  {t(`support.status_${tk.status}`)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
