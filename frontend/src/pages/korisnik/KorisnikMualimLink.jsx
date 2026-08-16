// ============================================================================
// Mualimi - pronalazak muallima i slanje zahtjeva za praćenje
// Učenik vidi listu muallima (profiles.role = 'mualim'), šalje zahtjev,
// prati status (na čekanju / prihvaćen / odbijen) i vidi svog muallima.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/SupaBaseClient";
import BackButton from "../../components/shared/BackButton";
import GuidedTour from "../../components/shared/GuidedTour";
import { PageTourButton } from "../../components/shared/PageTourButton";
import { MUALIMI_TOUR } from "../../constants/tours/mualimiTour";
import { hasSeenTour, markTourSeen } from "../../lib/tourStorage";
import { useLang } from "../../context/LanguageContext";

const STATUS_STIL = {
  na_cekanju: "bg-amber-500",
  prihvacen: "bg-green-600",
  odbijen: "bg-red-500",
};

export default function KorisnikMualimLink() {
  const { t } = useTranslation();
  const { theme, sectionAccents: SECTION_ACCENTS } = useTheme();
  const { user } = useAuth();
  const { lang } = useLang();

  // ── Kratak vodič, prvi put kad korisnik uđe na ovu stranicu ──
  // Čisto sinhrona provjera (localStorage) - prilagođava se tokom rendera uz
  // poređenje s prethodnim user?.id (isti okidač kao stari dependency niz).
  const [showTour, setShowTour] = useState(false);
  const [prevUserIdTour, setPrevUserIdTour] = useState(user?.id);
  if (user?.id !== prevUserIdTour) {
    setPrevUserIdTour(user?.id);
    if (user?.id && !hasSeenTour(user.id, "mualimi")) setShowTour(true);
  }
  const finishTour = () => { if (user?.id) markTourSeen(user.id, "mualimi"); setShowTour(false); };

  const [mualimi, setMualimi] = useState([]);
  const [veze, setVeze] = useState([]);
  const [myGender, setMyGender] = useState(null);
  const [myCity, setMyCity] = useState(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // ── ručno uparivanje suprotnog roda (email + privatni mualim kod) ──
  const [manualEmail, setManualEmail] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [manualMsg, setManualMsg] = useState("");
  const [manualSending, setManualSending] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const safe = async (fn, fb) => { try { return await fn(); } catch { return fb; } };
    const [me, m, v] = await Promise.all([
      safe(async () => {
        const { data } = await supabase.from("profiles").select("gender, city").eq("id", user.id).maybeSingle();
        return data;
      }, null),
      safe(async () => {
        const { data } = await supabase.rpc("list_mualimi");
        return data || [];
      }, []),
      safe(async () => {
        const { data } = await supabase.from("mualim_students").select("*").eq("student_id", user.id);
        return data || [];
      }, []),
    ]);
    setMyGender(me?.gender || null);
    setMyCity(me?.city || null);
    setMualimi(m); setVeze(v); setLoading(false);
  }, [user]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const requestManual = async () => {
    if (!manualEmail.trim() || !manualCode.trim()) return;
    setManualSending(true); setManualMsg("");
    try {
      const { data, error } = await supabase.rpc("request_mualim_manual", {
        p_email: manualEmail.trim(), p_code: manualCode.trim(),
      });
      if (error) throw error;
      if (data === "ok") {
        setManualMsg(t("mualimLink.manualSent"));
        setManualEmail(""); setManualCode("");
        load();
      } else {
        setManualMsg(t("mualimLink.manualNotFound"));
      }
    } catch {
      setManualMsg(t("mualimLink.manualNotFound"));
    }
    setManualSending(false);
  };

  const vezaZa = (mualimId) => veze.find((v) => v.mualim_id === mualimId);
  const mojMualim = veze.find((v) => v.status === "prihvacen");

  const [sendError, setSendError] = useState("");
  const [sendingTo, setSendingTo] = useState(null);

  const posaljiZahtjev = async (mualimId) => {
    setSendError(""); setSendingTo(mualimId);
    try {
      const { error } = await supabase.from("mualim_students").insert({ student_id: user.id, mualim_id: mualimId, status: "na_cekanju" });
      if (error) throw error;
      load();
    } catch (e) {
      setSendError(e?.message || e?.hint || e?.details || t("mualimLink.sendFailed"));
    }
    setSendingTo(null);
  };

  const cities = [...new Set(mualimi.map((m) => m.city).filter(Boolean))].sort();

  // Podrazumijevano: prikazuju se SAMO mualimi istog roda kao učenik (rodna
  // segregacija). Suprotni rod se ne prikazuje ovdje uopšte - za to postoji
  // "Ručno uparivanje" ispod (traži tačan email + privatni kod muallima).
  // Kad filter grada nije postavljen, mualimi iz istog grada kao učenik idu
  // na vrh liste (olakšano traženje lokalnog mualima), bez da ih sakriva.
  const filtrirani = mualimi
    .filter((m) => !myGender || !m.gender || m.gender === myGender)
    .filter((m) => (m.full_name || "").toLowerCase().includes(search.toLowerCase()))
    .filter((m) => !cityFilter || m.city === cityFilter)
    .sort((a, b) => {
      if (cityFilter || !myCity) return 0;
      return (b.city === myCity ? 1 : 0) - (a.city === myCity ? 1 : 0);
    });

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <GuidedTour steps={MUALIMI_TOUR[lang] || MUALIMI_TOUR.bs} active={showTour} onFinish={finishTour} theme={theme} lang={lang} dismissible />
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
            🧑‍🏫 {t("mualimLink.title")}
            <PageTourButton onClick={() => setShowTour(true)} />
          </h1>
          <p className={`${theme.muted} text-sm mt-1`}>{t("mualimLink.subtitle")}</p>
        </div>

        {/* Moj muallim */}
        {mojMualim && (
          <div className={`${theme.card} rounded-2xl p-4 border-l-4 border-green-500`}>
            <h2 className="font-semibold mb-1">✓ {t("mualimLink.myMualim")}</h2>
            <p className="text-sm">
              {mualimi.find((m) => m.id === mojMualim.mualim_id)?.full_name || t("mualimLink.mualim")}
            </p>
            <p className={`text-xs mt-1 ${theme.muted}`}>{t("mualimLink.myMualimHint")}</p>
            <Link to="/korisnik/mualim" className={`${theme.button} inline-block mt-3 rounded-xl px-4 py-2 text-sm font-semibold`}>
              💬 {t("mualimLink.goToHub")}
            </Link>
          </div>
        )}

        {/* Pretraga + filter lokacije */}
        <input
          data-tour="tour-mualimi-search"
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("mualimLink.searchPlaceholder")}
          className={`w-full ${theme.card} rounded-2xl px-4 py-3 text-sm outline-none`}
        />
        {cities.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
              className={`${theme.card} rounded-xl px-3 py-2 text-sm outline-none`}>
              <option value="">{t("mualimLink.allCities")}</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {myCity && (
              <button onClick={() => setCityFilter((c) => (c === myCity ? "" : myCity))}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all
                  ${cityFilter === myCity ? `${theme.button} border-transparent` : `${theme.cardSub} ${theme.muted} hover:opacity-80`}`}>
                📍 {t("mualimLink.myCity", { grad: myCity })}
              </button>
            )}
          </div>
        )}
        {sendError && <p className="text-sm text-red-500">{sendError}</p>}

        {/* Ručno uparivanje - jedini način da se zatraži mualim SUPROTNOG roda.
            Mualim mora lično podijeliti svoj email i privatni kod (vidi ga
            samo on u svom profilu) - ovdje se ne pretražuje lista, samo
            provjerava tačan par email+kod. */}
        <div data-tour="tour-mualimi-manual" className={`${theme.card} rounded-2xl p-4 space-y-2`}>
          <p className="text-sm font-semibold">{t("mualimLink.manualTitle")}</p>
          <p className={`text-xs ${theme.muted}`}>{t("mualimLink.manualHint")}</p>
          <div className="flex gap-2 flex-wrap">
            <input value={manualEmail} onChange={(e) => setManualEmail(e.target.value)}
              placeholder={t("mualimLink.manualEmailPh")}
              className={`flex-1 min-w-[160px] ${theme.cardSub || theme.card} rounded-xl px-3 py-2 text-sm outline-none`} />
            <input value={manualCode} onChange={(e) => setManualCode(e.target.value)}
              placeholder={t("mualimLink.manualCodePh")}
              className={`w-32 ${theme.cardSub || theme.card} rounded-xl px-3 py-2 text-sm outline-none`} />
            <button onClick={requestManual} disabled={manualSending}
              className={`${theme.button} rounded-xl px-4 py-2 text-sm disabled:opacity-50`}>
              {manualSending ? "…" : t("mualimLink.manualSend")}
            </button>
          </div>
          {manualMsg && (
            <p className={`text-xs ${manualMsg === t("mualimLink.manualSent") ? "text-green-500" : "text-red-500"}`}>
              {manualMsg}
            </p>
          )}
        </div>

        {/* Rodna segregacija - transparentno objašnjenje umjesto tihog filtriranja */}
        {!loading && mualimi.length > 0 && (
          <p className={`text-xs ${theme.muted}`}>🔒 {t("mualimLink.genderSegregationNote")}</p>
        )}

        {/* Lista muallima - lijevi border akcent (plavi = isti grad kao ti)
            umjesto jednolične kartice, radi jasnijeg vizualnog razdvajanja */}
        {loading ? (
          <p className={theme.muted}>…</p>
        ) : filtrirani.length === 0 ? (
          <div className={`${theme.card} rounded-2xl p-6 text-center`}>
            <p className={theme.muted}>{t("mualimLink.noMualims")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrirani.map((m) => {
              const veza = vezaZa(m.id);
              const isMyCity = !!(myCity && m.city === myCity);
              return (
                <div key={m.id}
                  className={`${theme.card} rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap border-l-4 ${isMyCity ? SECTION_ACCENTS.halka.border : "border-transparent"}`}>
                  <div className="min-w-0">
                    <div className="font-medium">{m.full_name || t("mualimLink.mualim")}</div>
                    {(m.city || m.country) && (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`text-xs ${theme.cardSub} rounded-full px-2 py-0.5 ${theme.muted}`}>
                          📍 {[m.city, m.country].filter(Boolean).join(", ")}
                        </span>
                        {isMyCity && (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${SECTION_ACCENTS.halka.chip}`}>{t("mualimLink.sameCityBadge")}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {veza ? (
                    <span className={`text-xs text-white px-3 py-1.5 rounded-full ${STATUS_STIL[veza.status] || "bg-gray-500"}`}>
                      {t(`mualimLink.status_${veza.status}`)}
                    </span>
                  ) : (
                    <button onClick={() => posaljiZahtjev(m.id)} disabled={sendingTo === m.id}
                      className={`${theme.button} rounded-xl px-4 py-2 text-sm disabled:opacity-50`}>
                      {sendingTo === m.id ? "…" : t("mualimLink.sendRequest")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
