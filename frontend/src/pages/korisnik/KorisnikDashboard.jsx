// ============================================================================
// Dnevni hub - lični dashboard (mobile-first, prati aktivnu temu)
//
// Spojene su bivše dvije odvojene stranice (Dashboard + Dnevni hub) u JEDNU:
// streak, šta je danas za UČENJE, šta je danas za PONAVLJANJE (uvijek
// odvojeno!) s dugmadima tačno/netačno direktno ovdje, vatrena zona s Most
// (Bridge) prikazom [prethodni → trenutni → sljedeći ajet] i bojom tajmera,
// stranice/ajeti s greškama, napredak prema cilju, muallimove zadatke i
// obavijesti, nadolazeće sesije, motivacijski ajet, odvojeni tajmeri.
// ============================================================================

import { Fragment, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/SupaBaseClient";
import { getStreak, getLastActivity } from "../../hooks/hifz/useHifzState";
import { fetchDueBlocks, recordReview } from "../../features/murajaah/murajaahService";
import { fetchDueAyahs, recordAyahReview, bridgeFromKey } from "../../features/murajaah/pohranaService";
import { fetchPagesWithErrorAyahs, fetchRedSlabihUzivo, recordPageReviewQuick } from "../../features/murajaah/greskeService";
import { kategorija } from "../../features/murajaah/greske";
import { fetchMotorAStavkeToday, estimateDnevnaKvota } from "../../features/murajaah/rotationService";
import { generisiDan, poredajStavke, podijeliNaSesije, seedOdStringa } from "../../features/murajaah/generisiDan";
import { strogostParametri } from "../../features/murajaah/wizardKoraci";
import { efektivnaMetoda } from "../../features/murajaah/hifzPlansService";
import { danaOdZadnjeg, trebaLaganiPovratakEkran, laganiPovratakKvota, zaostatakStatus, LAGANI_POVRATAK_DANA } from "../../features/murajaah/zaostatak";
import { describeState, daysOverdue } from "../../features/murajaah/engine";
import { timerColor } from "../../features/murajaah/pohrana";
import { fetchStudentTasks, fetchStudentAnnouncements, fetchStudentSessions, fetchActiveReviewPlan, markPlanDayDone, saveAttendance } from "../../services/mualimService";
import { todaysMotivation } from "../../constants/motivacija";
import { todayStr } from "../../constants/hifz/helpers";
import { useActiveLearningPlans } from "../../hooks/hifz/useTodayLearning";
import BackButton from "../../components/shared/BackButton";
import TodayLearningPanel from "../../components/shared/TodayLearningPanel";
import GrowthChart from "./hifz/components/GrowthChart";
import HelpTip from "../../components/shared/HelpTip";
import GuidedTour from "../../components/shared/GuidedTour";
import { PageTourButton } from "../../components/shared/PageTourButton";
import { KORISNIK_TOUR } from "../../constants/tours/korisnikTour";

const TIMER_BOJE = {
  ceka:   "bg-gray-400",
  zeleno: "bg-green-500",
  zuto:   "bg-yellow-500",
  crveno: "bg-red-600 animate-pulse",
};

// Motor A stavke (fetchMotorAStavkeToday) nose ".kind" iz rotationToday/
// femiWeekToday, koje se ne zove uvijek isto kao hifz_plans.method (vidi
// FEMI_METHOD_MAP komentar u hifzPlansService.js) - ovo je obrnuto mapiranje
// da znamo KOJI aktivni plan "vlasnik" stavke je (za redoslijed/slobodni dan).
const KIND_TO_METODA = {
  dzuzevi: "dzuzevi", stranice: "stranice", seton: "seton", dinamicna: "dinamicna",
  femi: "femi", dzuz_sedmicno: "dzuz_sedmica",
};

export default function KorisnikDashboard() {
  const { t } = useTranslation();
  const { theme, sectionAccents: SECTION_ACCENTS } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const userId = user?.id;
  const today = todayStr();
  // Ručno ponovno pokretanje CIJELOG vodiča kroz sidebar (isti kao prvi put
  // i kao dugme u Postavkama) - lokalna instanca, neovisna od one u
  // SidebarLayout.jsx koja hvata organsko prvo pojavljivanje.
  const [manualTour, setManualTour] = useState(false);

  const [dueBlocks, setDueBlocks] = useState([]);
  const [fireZone, setFireZone] = useState([]);
  const [progress, setProgress] = useState({ learned: 0, total: 604 });
  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [mualimRequest, setMualimRequest] = useState(null); // zahtjev za muallim ulogu
  const [mualimPlan, setMualimPlan] = useState(null);       // prioritetni muallimov plan
  const [showAllMualimDays, setShowAllMualimDays] = useState(false); // prikaži samo danas, ili proširi na cijeli plan
  const [errorPages, setErrorPages] = useState([]);         // stranice/ajeti s greškama, grupisano
  const [redSlabihUzivo, setRedSlabihUzivo] = useState([]); // Sloj 2 - skor_slabosti uživo (sekcija 4.11)
  const [motorAStavke, setMotorAStavke] = useState([]);     // Sloj 3 - Motor A, danas na redu (svi ciklusi spojeni)
  const [aktivniPlanovi, setAktivniPlanovi] = useState([]); // SVI aktivni hifz_plans redovi (za strogost/slobodniDani) - može ih biti više, najviše jedan po (efektivnoj) metodi
  const [motorAKvota, setMotorAKvota] = useState(null);     // procjena dnevne kvote (kapa protiv lavine)
  const [doneToday, setDoneToday] = useState(0);            // koliko ponavljanja odrađeno OVDJE danas (za progres traku)
  const [slabiStatus, setSlabiStatus] = useState({});        // { [ref]: "correct" | "incorrect" } - akcija OVDJE danas, lokalno (skor formula ne ukloni odmah)
  const [loading, setLoading] = useState(true);
  const [povratakZatvoren, setPovratakZatvoren] = useState(false); // "Dobro došao nazad" zatvoren OVU posjetu

  const motivation = useMemo(() => todaysMotivation(lang), [lang]);
  const streak = getStreak();
  const activeLearning = useActiveLearningPlans();

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    // svaki upit zasebno - jedan neuspjeh ne ruši ostatak dashboarda
    const safe = async (fn, fallback) => { try { return await fn(); } catch { return fallback; } };
    const now = new Date().toISOString();

    const [due, fz, pp, tk, ann, ses, mrp, ep, rsu, mas, ap, mak] = await Promise.all([
      safe(() => fetchDueBlocks(userId, now), []),
      safe(() => fetchDueAyahs(userId), []),
      safe(async () => {
        const { data } = await supabase
          .from("page_progress").select("status").eq("user_id", userId)
          .in("status", ["naucen", "savladano", "ponavljanje"]);
        return { learned: data?.length || 0, total: 604 };
      }, { learned: 0, total: 604 }),
      safe(() => fetchStudentTasks(userId), []),
      safe(() => fetchStudentAnnouncements(), []),
      safe(() => fetchStudentSessions(userId, { fromDate: now }), []),
      safe(() => fetchActiveReviewPlan(userId, { fromDate: today }), null),
      safe(() => fetchPagesWithErrorAyahs(userId), []),
      safe(() => fetchRedSlabihUzivo(userId, today), []),
      safe(() => fetchMotorAStavkeToday(userId, today), []),
      safe(async () => {
        const { data } = await supabase.from("hifz_plans").select("*")
          .eq("user_id", userId).eq("active", true)
          .order("created_at", { ascending: false });
        return data || [];
      }, []),
      safe(() => estimateDnevnaKvota(userId, today), null),
    ]);

    // zahtjev za muallim ulogu: dopiši ako je ostao iz registracije, pa provjeri status
    const rr = await safe(async () => {
      if (localStorage.getItem("tmizan_zeli_mualim") === "1") {
        await supabase.from("role_requests").upsert(
          { user_id: userId, role: "mualim" }, { onConflict: "user_id,role", ignoreDuplicates: true }
        );
        localStorage.removeItem("tmizan_zeli_mualim");
      }
      const { data } = await supabase.from("role_requests").select("*")
        .eq("user_id", userId).eq("role", "mualim").maybeSingle();
      return data;
    }, null);

    setMualimRequest(rr);
    setMualimPlan(mrp);
    setDueBlocks(due); setFireZone(fz); setProgress(pp);
    setTasks(tk.filter((x) => x.status === "otvoren"));
    setAnnouncements(ann.slice(0, 3)); setSessions(ses.slice(0, 3));
    setErrorPages(ep);
    setRedSlabihUzivo(rsu); setMotorAStavke(mas);
    setAktivniPlanovi(ap);
    setMotorAKvota(mak);
    setLoading(false);
  }, [userId, today]);

  // load() je asinhron fetch sa servera - mora ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // ponavljanje (blokovi) odrađeno direktno odavde - bez odlaska na drugu stranicu
  const oznaciBlok = async (block, result) => {
    try {
      await recordReview(userId, block, { result, at: new Date().toISOString() });
      setDueBlocks((d) => d.filter((b) => b.id !== block.id));
      setDoneToday((c) => c + 1);
    } catch { /* ostaje u listi */ }
  };

  // pojedinačan ajet iz vatrene zone - tačno/netačno, pa osvježi listu
  const oznaciAjet = async (ayah, correct) => {
    try { await recordAyahReview(userId, ayah, { correct }); load(); } catch { /* */ }
  };

  // stavka iz reda slabih (Sloj 2, skor_slabosti uživo) - tačno/netačno.
  // Skor formula ne izbaci stavku iz reda odmah (računa prosjek zadnja 3
  // ponavljanja), pa se lokalno pamti šta je OVDJE danas odrađeno: "tačno"
  // sklanja stavku sa liste, "greška" je ostavlja ali bez dugmadi (ponavlja
  // se opet sutra kad se lista ponovo izračuna).
  const oznaciSlabu = async (item, correct) => {
    try {
      await recordPageReviewQuick(userId, item.ref, { correct, date: today });
      setDoneToday((c) => c + 1);
      setSlabiStatus((s) => ({ ...s, [item.ref]: correct ? "correct" : "incorrect" }));
    } catch { /* ostaje u listi */ }
  };

  // mualimov nalog za PONAVLJANJE danas (Sloj 1) - samo današnji, neodrađeni
  const mualimDanas = useMemo(
    () => (mualimPlan?.days || []).filter((d) => d.vrsta === "ponavljanje" && d.dan_datum === today && !d.done),
    [mualimPlan, today]
  );

  // Postavke aktivnih planova (wizard koraci "Raspored"/"Strogost", sekcija
  // 4.11 i 8) - čitaju se iz hifz_plans.scope_data. Više planova može biti
  // aktivno ISTOVREMENO (najviše jedan po efektivnoj metodi - vidi komentar
  // u hifzPlansService.js), pa se postavke koje su suštinski "po metodi"
  // (redoslijed, slobodni dan) primjenjuju PO STAVCI prema planu koji je
  // njen vlasnik, dok se opće postavke (strogost, broj sesija) spajaju preko
  // svih aktivnih planova - vidi objašnjenja niže.
  const planByMetoda = useMemo(
    () => new Map(aktivniPlanovi.map((p) => [efektivnaMetoda(p), p])),
    [aktivniPlanovi]
  );

  // Strogost - koliko slabih stranica dnevno (sekcija 4.11). Kad ima više
  // aktivnih planova s različitom strogošću, uzima se NAJSTROŽIJA (min) -
  // sigurnije od preopterećenja nego najblaža.
  const maxSlabihDnevno = useMemo(() => {
    if (!aktivniPlanovi.length) return strogostParametri("normalno").maxDnevno;
    return Math.min(...aktivniPlanovi.map((p) => strogostParametri(p.scope_data?.strogost || "normalno").maxDnevno));
  }, [aktivniPlanovi]);

  // Slobodan dan - svojstvo POJEDINOG plana (njegovog Motor A/B rasporeda),
  // ne cijelog dana: ako "džuzevi" plan miruje subotom, to ne znači da i
  // plan za "sure" miruje. Mualim nalozi i red slabih (Sloj 1/2) nisu
  // vezani ni za jedan plan pa se na njih slobodan dan ne primjenjuje.
  const DAN_KEY = ["ned", "pon", "uto", "sri", "cet", "pet", "sub"];
  const danasKey = DAN_KEY[new Date().getDay()];
  const metodeNaOdmoru = useMemo(() => {
    const s = new Set();
    for (const p of aktivniPlanovi) {
      if ((p.scope_data?.slobodniDani || []).includes(danasKey)) s.add(efektivnaMetoda(p));
    }
    return s;
  }, [aktivniPlanovi, danasKey]);

  // Skor po stranici (iz reda slabih uživo) - koristi se za redoslijed
  // "najslabiji" i na Motor A i na Motor B stavkama, ne samo na Sloju 2.
  const skorMap = useMemo(() => {
    const m = new Map();
    for (const s of redSlabihUzivo) m.set(s.ref, s.skor);
    return m;
  }, [redSlabihUzivo]);

  // Broj sesija dnevno - uzima se NAJVEĆI (max) među aktivnim planovima:
  // dijeljenje na više sesija ne gubi nijednu stavku, samo ih raspoređuje.
  const podjelaDanaPostavka = useMemo(
    () => (aktivniPlanovi.length ? Math.max(1, ...aktivniPlanovi.map((p) => p.scope_data?.podjelaDana || 1)) : 1),
    [aktivniPlanovi]
  );

  // ── Procjena dnevne kvote za "kapu protiv lavine" (dokument, sekcija 8:
  // max = kvota × 1.5) - zbir procijenjene Motor A kvote (rotationService,
  // koja već sumira SVE aktivne rotation_state/femi_state redove) i tempa
  // iz SVIH aktivnih planova koji ga imaju postavljenog (wizard korak
  // "Tempo"), ili null ako nema NIJEDNOG poznatog izvora (tad generisiDan
  // ne postavlja kapu). Dok je "lagani povratak" aktivan (5 dana nakon duže
  // pauze), kvota se prepolovi. ─────────────────────────────────────────────
  const tempoDailyQty = useMemo(
    () => aktivniPlanovi.reduce((sum, p) => sum + (p.scope_data?.tempo?.dailyQtyPages || 0), 0),
    [aktivniPlanovi]
  );
  const kvotaBaza = (motorAKvota || 0) + tempoDailyQty;
  const laganiPovratakDo = (() => { try { return localStorage.getItem("tmizan_lagani_povratak_do"); } catch { return null; } })();
  const laganiPovratakAktivan = !!laganiPovratakDo && today <= laganiPovratakDo;
  const kvota = kvotaBaza > 0 ? (laganiPovratakAktivan ? laganiPovratakKvota(kvotaBaza) : kvotaBaza) : null;

  // Poređaj stavke GRUPISANO po metodi kojoj pripadaju, svaku grupu po
  // redoslijedu NJENOG plana (od_pocetka/od_kraja/najslabiji/nasumicno) -
  // stavke bez vlasničkog plana idu podrazumijevanim "od_pocetka".
  const poredajPoPlanu = (stavke, metodaOf, poredajOpts) => {
    const grupe = new Map();
    for (const s of stavke) {
      const m = metodaOf(s);
      if (!grupe.has(m)) grupe.set(m, []);
      grupe.get(m).push(s);
    }
    const out = [];
    for (const [m, grupa] of grupe) {
      const redoslijed = planByMetoda.get(m)?.scope_data?.redoslijed || "od_pocetka";
      out.push(...poredajStavke(grupa, redoslijed, poredajOpts));
    }
    return out;
  };

  // Stavke reda slabih koje su OVDJE danas odrađene kao "tačno" se sklanjaju
  // s liste odmah (ne čekaju sutrašnji ponovni izračun skora).
  const redSlabihVisible = useMemo(
    () => redSlabihUzivo.filter((x) => slabiStatus[x.ref] !== "correct"),
    [redSlabihUzivo, slabiStatus]
  );

  // ── JEDINSTVEN DNEVNI PLAN (dokument, "generisi_dan" - Sloj 1+2+3) ────────
  // Prioritet: mualimov nalog → red slabih (max po najstrožoj strogosti) →
  // Motor A/B ciklus, POREDANO unutar svake metode po njenom planu. Motor A
  // stavke su OVDJE samo za prikaz prioriteta (ravan spisak stranica iz svih
  // aktivnih ciklusa) - stvarno odrađivanje ide dalje na Ponavljanje. Na
  // slobodan dan SVOJE metode, stavke tog plana se izostavljaju - "upozori,
  // ne blokiraj": korisnik i dalje može otvoriti Ponavljanje ručno ako želi
  // učiti na slobodan dan.
  const dnevniPlan = useMemo(() => {
    const seed = seedOdStringa(today);
    const poredajOpts = {
      pageOf: (x) => (x.items ? Math.min(...x.items) : x.ref),
      skorOf: (x) => (x.items ? Math.max(0, ...x.items.map((p) => skorMap.get(p) || 0)) : skorMap.get(x.ref) || 0),
      seed,
    };
    const motorBAktivan = dueBlocks.filter((b) => !metodeNaOdmoru.has(b.method));
    const motorAAktivan = motorAStavke.filter((x) => !metodeNaOdmoru.has(KIND_TO_METODA[x.kind] || x.kind));
    return generisiDan({
      mualimNalozi: mualimDanas,
      motorBDospjeli: poredajPoPlanu(motorBAktivan, (b) => b.method, poredajOpts),
      redSlabih: redSlabihVisible,
      motorAStavke: poredajPoPlanu(motorAAktivan, (x) => KIND_TO_METODA[x.kind] || x.kind, poredajOpts),
      maxSlabihDnevno,
      kvota,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mualimDanas, dueBlocks, redSlabihVisible, motorAStavke, maxSlabihDnevno, metodeNaOdmoru, planByMetoda, skorMap, today, kvota]);

  // ── Podjela na sesije (dokument, wizard korak "Raspored" - koliko puta
  // dnevno). Prikaz se ograničava na razuman broj stavki PRIJE dijeljenja,
  // da naslovi sesija ne budu prazni/nasumično odsječeni. ────────────────────
  const DNEVNI_PRIKAZ_MAX = 12;
  const dnevniPlanPrikaz = dnevniPlan.slice(0, DNEVNI_PRIKAZ_MAX);
  const sesije = useMemo(
    () => podijeliNaSesije(dnevniPlanPrikaz, podjelaDanaPostavka),
    [dnevniPlanPrikaz, podjelaDanaPostavka]
  );
  const SESIJA_LABEL = { 2: ["🌅", "🌙"], 3: ["🌅", "☀️", "🌙"] };

  const MOTOR_A_LABEL = {
    dzuzevi: "Sistem džuzeva", stranice: "Po stranicama", seton: "Šetonova",
    dinamicna: "Dinamična", femi: "Femi bi-ševk", dzuz_sedmicno: "Džuz kroz sedmicu",
  };

  const UNIT_LABEL_KEY = {
    red: "dashboard.unitRed", ajet: "dashboard.unitAjet", stranica: "dashboard.unitStranica",
    sura: "dashboard.unitSura", dzuz: "dashboard.unitDzuz",
  };

  const percent = Math.round((progress.learned / progress.total) * 100);

  // ── Zaostatak (dokument, sekcija 8): "Dobro došao nazad" nakon duže pauze,
  // i informativna napomena kad je zaostatak Motora B/A prevelik u odnosu na
  // dnevnu kvotu. Samo prikaz/blagi prijedlog - "upozori, ne blokiraj". ────
  const lastActivity = getLastActivity();
  const trebaPovratakBanner = !loading && trebaLaganiPovratakEkran(lastActivity, today) && !povratakZatvoren;
  const danaPauze = danaOdZadnjeg(lastActivity, today);
  const zaostatakInfo = zaostatakStatus(dueBlocks.length + motorAStavke.length, kvota || 0);

  const zapocniLaganiPovratak = () => {
    try {
      const doDatuma = new Date();
      doDatuma.setDate(doDatuma.getDate() + LAGANI_POVRATAK_DANA);
      localStorage.setItem("tmizan_lagani_povratak_do", doDatuma.toISOString().slice(0, 10));
    } catch { /* localStorage nedostupan - bonus funkcija, ne kritično */ }
    setPovratakZatvoren(true);
  };

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-6 sm:px-6 lg:px-10`}>
      <GuidedTour steps={KORISNIK_TOUR[lang] || KORISNIK_TOUR.bs} active={manualTour} onFinish={() => setManualTour(false)} theme={theme} lang={lang} dismissible />
      <div className="max-w-5xl mx-auto space-y-5">

        <BackButton />

        {/* ── Zaglavlje: pozdrav + streak ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold flex items-center">
              ☀️ {t("dashboard.title")}
              <HelpTip text={lang === "en"
                ? "This is your home page after login: today's plan from your muallim (if any), your learning/review streak, and quick links to the planner and tracker."
                : "Ovo je tvoja početna stranica nakon prijave: današnji plan od mualima (ako ga imaš), tvoj niz dana učenja/ponavljanja, i brzi linkovi do planera i trackera."} />
              <PageTourButton onClick={() => setManualTour(true)} />
            </h1>
            <p className={`${theme.muted} text-sm mt-1`}>{t("dashboard.subtitle")}</p>
          </div>
          <div data-tour="tour-streak" className={`${theme.card} rounded-2xl px-5 py-3 text-center`}>
            <div className={`text-2xl font-bold ${theme.accent}`}>🔥 {streak}</div>
            <div className={`text-xs ${theme.muted}`}>{t("dashboard.streak")}</div>
          </div>
        </div>

        {/* ── "Dobro došao nazad" - nakon duže pauze (dokument, sekcija 8) ── */}
        {trebaPovratakBanner && (
          <div className={`${theme.card} rounded-2xl p-4 border-l-4 ${SECTION_ACCENTS.review.border} space-y-2`}>
            <p className="text-sm font-semibold">👋 {t("dashboard.welcomeBackTitle")}</p>
            <p className={`text-sm ${theme.muted}`}>{t("dashboard.welcomeBackBody", { count: danaPauze })}</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setPovratakZatvoren(true)} className={`${theme.button} rounded-lg px-3 py-1.5 text-xs`}>
                {t("dashboard.welcomeBackNormal")}
              </button>
              <button onClick={zapocniLaganiPovratak} className={`${theme.cardSub} rounded-lg px-3 py-1.5 text-xs`}>
                {t("dashboard.welcomeBackLagani", { count: LAGANI_POVRATAK_DANA })}
              </button>
            </div>
          </div>
        )}

        {/* ── Status muallim zahtjeva ── */}
        {mualimRequest?.status === "na_cekanju" && (
          <div className={`${theme.card} rounded-2xl p-4 border-l-4 border-amber-500`}>
            <p className="text-sm">⏳ {t("dashboard.mualimPending")}</p>
          </div>
        )}
        {mualimRequest?.status === "odbijen" && (
          <div className={`${theme.card} rounded-2xl p-4 border-l-4 border-red-500`}>
            <p className="text-sm">{t("dashboard.mualimRejected")}</p>
          </div>
        )}

        {/* ── MUALIMOV PLAN - prioritetni, iznad svih automatskih rasporeda.
            UVIJEK prikazano (i kad nema plana) da se odmah zna gdje gledati. ── */}
        <div data-tour="tour-mualim-plan" className={`${SECTION_ACCENTS.mualim.wash} border-l-4 ${SECTION_ACCENTS.mualim.border} rounded-2xl p-4`}>
          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${SECTION_ACCENTS.mualim.chip}`}>
            {t("dashboard.mualimSectionChip")}
          </span>
          {mualimPlan ? (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <h2 className="font-heading font-bold">🧑‍🏫 {t("dashboard.mualimPlan")}: {mualimPlan.naslov}</h2>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${SECTION_ACCENTS.mualim.chip}`}>
                  {t("dashboard.priority")}
                </span>
              </div>
              {mualimPlan.komentar && <p className={`text-xs mb-2 ${theme.accent}`}>💬 {mualimPlan.komentar}</p>}
              {(() => {
                const allDays = mualimPlan.days || [];
                const todayDays = allDays.filter((d) => d.dan_datum === today);
                const visibleDays = showAllMualimDays ? allDays : todayDays;
                return (
                  <>
                    {visibleDays.length === 0 && !showAllMualimDays && (
                      <p className={`text-xs mb-1.5 ${theme.muted}`}>{t("dashboard.noMualimPlanToday")}</p>
                    )}
                    <ul className="space-y-1.5">
                      {visibleDays.map((d) => (
                        <li key={d.id} className={`${SECTION_ACCENTS.mualim.item} rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-2`}>
                          <span>
                            <span className={`text-[10px] uppercase mr-2 px-1.5 py-0.5 rounded-full ${d.vrsta === "ucenje" ? SECTION_ACCENTS.personal.chip : SECTION_ACCENTS.review.chip}`}>
                              {d.vrsta === "ucenje" ? t("dashboard.todayLearning").replace("📖 ", "") : t("dashboard.todayReview").replace("🔁 ", "")}
                            </span>
                            {d.opis} <span className={`text-xs ${theme.muted}`}>· {d.dan_datum}</span>
                          </span>
                          <button
                            onClick={async () => {
                              try {
                                await markPlanDayDone(d.id, !d.done);
                                setMualimPlan((p) => ({ ...p, days: p.days.map((x) => (x.id === d.id ? { ...x, done: !x.done } : x)) }));
                              } catch { /* */ }
                            }}
                            className={`shrink-0 rounded-lg px-2.5 py-1 text-xs ${d.done ? "bg-green-600 text-white" : `${theme.card} ${theme.muted}`}`}>
                            {d.done ? "✓" : t("dashboard.markDone")}
                          </button>
                        </li>
                      ))}
                    </ul>
                    {allDays.length > todayDays.length && (
                      <button
                        onClick={() => setShowAllMualimDays((v) => !v)}
                        className={`mt-2 text-xs font-medium ${theme.accent}`}>
                        {showAllMualimDays ? `▲ ${t("dashboard.mualimPlanCollapse")}` : `▼ ${t("dashboard.mualimPlanExpand")}`}
                      </button>
                    )}
                  </>
                );
              })()}
            </>
          ) : (
            <>
              <h2 className="font-heading font-bold mb-1">🧑‍🏫 {t("dashboard.mualimPlan")}</h2>
              <p className={`text-sm ${theme.muted}`}>{t("dashboard.noMualimPlan")}</p>
            </>
          )}
        </div>

        {/* ── Vatrena zona - svi nivoi (5–0), Most (Bridge) prikaz:
            [prethodni ajet] → [trenutni, obojen prema tajmeru] → [sljedeći] ── */}
        {fireZone.length > 0 && (
          <div className={`${theme.card} rounded-2xl p-4 border-l-4 border-red-500`}>
            <h2 className="font-semibold mb-2">🔥 {t("dashboard.fireZone")}</h2>
            <p className={`text-xs ${theme.muted} mb-3`}>{t("dashboard.fireZoneHint")}</p>
            <ul className="space-y-2">
              {fireZone.map((a) => {
                const most = bridgeFromKey(a.verse_key);
                const boja = timerColor({ nextDueAt: a.next_due_at }, new Date().toISOString());
                const bojaCls = { ceka: "bg-gray-400", zeleno: "bg-green-500", zuto: "bg-yellow-500", crveno: "bg-red-600 animate-pulse" }[boja] || "bg-gray-400";
                return (
                  <li key={a.id} className={`${theme.cardSub} rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap`}>
                    <div className="min-w-0 text-sm">
                      <span className={theme.muted}>{most.prethodni || "▪"} → </span>
                      <span className={`${bojaCls} text-white px-2 py-0.5 rounded-full font-semibold`}>
                        {a.verse_key}{a.nivo === 6 ? ` · ${a.sub_step + 1}/3` : ` · N${a.nivo}`}
                      </span>
                      <span className={theme.muted}> → {most.sljedeci || "▪"}</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => oznaciAjet(a, true)} className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-3 py-1.5 text-sm">
                        ✓ {t("dailyHub.correct")}
                      </button>
                      <button onClick={() => oznaciAjet(a, false)} className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-3 py-1.5 text-sm">
                        ✕ {t("dailyHub.incorrect")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* ── Stranice i ajeti s greškama - grupisano po stranici (error_tracking,
            ajeti flagovani na Učenje danas / Hifz Trackeru) ── */}
        {errorPages.length > 0 && (
          <div className={`${theme.card} rounded-2xl p-4 border-l-4 border-orange-500`}>
            <h2 className="font-semibold mb-3 flex items-center">
              📍 {t("dashboard.errorPagesTitle")}
              <HelpTip text={lang === "en"
                ? "Pages with ayahs you've flagged as mistakes (on Today's Learning or Hifz Tracker), grouped by page. Tap 'Repeat' to work through them on the Review page."
                : "Stranice s ajetima koje si označio/la kao greške (na Učenju danas ili Hifz Trackeru), grupisano po stranici. Klikni 'Ponovi' da ih proradiš na stranici Ponavljanje."} />
            </h2>
            <ul className="space-y-2">
              {errorPages.map((p) => (
                <li key={p.page} className={`${theme.cardSub} rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap`}>
                  <div className="min-w-0 text-sm">
                    <span className={`font-semibold ${p.hasCritical ? "text-red-500" : ""}`}>
                      {t("dashboard.pageLabel")} {p.page}
                    </span>
                    <span className={`block text-xs mt-0.5 font-mono ${theme.muted}`}>
                      {t("dashboard.ayahsLabel")}: {p.verses.join(", ")}
                    </span>
                  </div>
                  <Link to="/korisnik/hifz/ponavljanje" className={`${theme.button} rounded-xl px-3 py-1.5 text-xs shrink-0`}>
                    {t("dashboard.repeatBtn")} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Danas: učenje i ponavljanje - UVIJEK ODVOJENI ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* UČENJE - kartica po SVAKOM aktivnom planu (može ih biti više) */}
          <div className={`${SECTION_ACCENTS.personal.wash} border-l-4 ${SECTION_ACCENTS.personal.border} rounded-2xl p-4`}>
            <h2 className="font-heading font-bold mb-2">📖 {t("dashboard.todayLearning")}</h2>
            <TodayLearningPanel theme={theme} t={t} lang={lang} activeLearning={activeLearning} cardCls={SECTION_ACCENTS.personal.item} />
          </div>

          {/* PONAVLJANJE - jedinstven dnevni plan (Sloj 1 mualim → Sloj 2 red
              slabih → Sloj 3 Motor A/B), uvijek istim redom prioriteta */}
          <div className={`${SECTION_ACCENTS.review.wash} border-l-4 ${SECTION_ACCENTS.review.border} rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-heading font-bold flex items-center">
                🔁 {t("dashboard.todayReview")}
                <HelpTip text={lang === "en"
                  ? "Priority order: your muallim's plan first, then your weakest spots, then your regular cyclic/SRS methods (Motor A/B) — always in that order."
                  : "Redoslijed prioriteta: prvo mualimov plan, zatim tvoja najslabija mjesta, pa tek onda tvoje redovne kružne/SRS metode (Motor A/B) — uvijek tim redom."} />
              </h2>
              <SessionTimer label={t("dashboard.timerReview")} theme={theme} />
            </div>
            {loading ? (
              <p className={`${theme.muted} text-sm`}>…</p>
            ) : dnevniPlan.length === 0 ? (
              <p className={`${theme.muted} text-sm`}>{t("dashboard.nothingDue")}</p>
            ) : (
              <ul className="space-y-2">
                {sesije.map((sesijaStavke, si) => (
                <Fragment key={`sesija-${si}`}>
                {sesije.length > 1 && (
                  <li className={`text-[10px] uppercase tracking-wider ${theme.muted} pt-1 first:pt-0`}>
                    {SESIJA_LABEL[sesije.length]?.[si] || ""} {t("dashboard.sessionLabel", { n: si + 1 })}
                  </li>
                )}
                {sesijaStavke.map((stavka, i) => {
                  if (stavka.sloj === "mualim") {
                    return (
                      <li key={`mualim-${stavka.id}`} className={`${SECTION_ACCENTS.review.item} rounded-xl px-3 py-2 text-sm flex justify-between items-center gap-2 flex-wrap`}>
                        <div className="min-w-0">
                          <span className={`text-[10px] uppercase mr-2 px-1.5 py-0.5 rounded-full ${SECTION_ACCENTS.mualim.chip}`}>🧑‍🏫 {t("dashboard.mualimPlan")}</span>
                          <span className="truncate">{stavka.opis}</span>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await markPlanDayDone(stavka.id, true);
                              setMualimPlan((p) => ({ ...p, days: p.days.map((x) => (x.id === stavka.id ? { ...x, done: true } : x)) }));
                              setDoneToday((c) => c + 1);
                            } catch { /* */ }
                          }}
                          className={`${SECTION_ACCENTS.mualim.chip} hover:opacity-90 rounded-lg px-2.5 py-1 text-xs shrink-0`}
                        >
                          {t("dashboard.markDone")}
                        </button>
                      </li>
                    );
                  }
                  if (stavka.sloj === "slabi") {
                    const gotovoNetacno = slabiStatus[stavka.ref] === "incorrect";
                    return (
                      <li key={`slabi-${stavka._id || `${stavka.refType}-${stavka.ref}`}`} className={`${SECTION_ACCENTS.review.item} rounded-xl px-3 py-2 text-sm flex justify-between items-center gap-2 flex-wrap`}>
                        <div className="min-w-0">
                          <span className={`text-[10px] uppercase mr-2 px-1.5 py-0.5 rounded-full ${SECTION_ACCENTS.alert.chip}`}>⚠️ {t("dashboard.errorPagesTitle")}</span>
                          <span className="truncate">{stavka.refType === "page" ? `${t("dashboard.pageLabel")} ${stavka.ref}` : stavka.ref}</span>
                          <span className={`block text-xs mt-0.5 ${theme.muted}`}>{kategorija(stavka.recentErrors)}</span>
                        </div>
                        {gotovoNetacno ? (
                          <span className="text-xs text-red-400 font-medium shrink-0">🔁 {t("dashboard.repeatAgainTomorrow")}</span>
                        ) : (
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => oznaciSlabu(stavka, true)} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-2.5 py-1 text-xs">
                              ✓ {t("dailyHub.correct")}
                            </button>
                            <button onClick={() => oznaciSlabu(stavka, false)} className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-2.5 py-1 text-xs">
                              ✕ {t("dailyHub.incorrect")}
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  }
                  if (stavka.sloj === "motorA") {
                    return (
                      <li key={`motorA-${stavka.kind}-${stavka.ref}-${i}`} className={`${SECTION_ACCENTS.review.item} rounded-xl px-3 py-2 text-sm flex justify-between items-center gap-2 flex-wrap`}>
                        <div className="min-w-0">
                          <span className={`text-[10px] uppercase mr-2 px-1.5 py-0.5 rounded-full ${SECTION_ACCENTS.progress.chip}`}>🔄 {MOTOR_A_LABEL[stavka.kind] || stavka.kind}</span>
                          <span className="truncate">{t("dashboard.pageLabel")} {stavka.ref}</span>
                        </div>
                        <Link to="/korisnik/hifz/ponavljanje" className={`${theme.button} rounded-lg px-2.5 py-1 text-xs shrink-0`}>
                          {t("dashboard.repeatBtn")} →
                        </Link>
                      </li>
                    );
                  }
                  // sloj === "motorB"
                  const late = daysOverdue(stavka, new Date().toISOString());
                  return (
                    <li key={`motorB-${stavka.id}`} className={`${SECTION_ACCENTS.review.item} rounded-xl px-3 py-2 text-sm flex justify-between items-center gap-2 flex-wrap`}>
                      <div className="min-w-0">
                        <div className="truncate">
                        {stavka.label || (UNIT_LABEL_KEY[stavka.unitType] ? `${t(UNIT_LABEL_KEY[stavka.unitType])} ${stavka.items.join(", ")}` : stavka.items.join(", "))}
                      </div>
                        <div className={`text-xs ${late > 0 ? "text-red-500 font-semibold" : theme.muted}`}>
                          {late > 0 ? t("dashboard.daysLate", { count: late }) : describeState(stavka)}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => oznaciBlok(stavka, "correct")} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-2.5 py-1 text-xs">
                          ✓ {t("dailyHub.correct")}
                        </button>
                        <button onClick={() => oznaciBlok(stavka, "incorrect")} className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-2.5 py-1 text-xs">
                          ✕ {t("dailyHub.incorrect")}
                        </button>
                      </div>
                    </li>
                  );
                })}
                </Fragment>
                ))}
                {dnevniPlan.length > DNEVNI_PRIKAZ_MAX && (
                  <li className={`text-xs ${theme.muted}`}>+ {dnevniPlan.length - DNEVNI_PRIKAZ_MAX} {t("dashboard.more")}</li>
                )}
              </ul>
            )}
            {zaostatakInfo.prekoracen && (
              <p className={`text-xs mt-2 ${theme.muted} italic`}>ℹ️ {t("dashboard.backlogNote")}</p>
            )}
            {doneToday > 0 && (
              <p className={`text-xs mt-2 ${theme.accent}`}>✓ {t("dashboard.doneToday", { count: doneToday })}</p>
            )}
          </div>
        </div>

        {/* ── Napredak prema cilju ── */}
        <div className={`${SECTION_ACCENTS.progress.wash} border-l-4 ${SECTION_ACCENTS.progress.border} rounded-2xl p-4`}>
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="font-heading font-bold">🎯 {t("dashboard.progress")}</h2>
            <span className={`text-sm ${theme.muted}`}>
              {t("dashboard.progressPages", { learned: progress.learned, total: progress.total })}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-black/10 overflow-hidden">
            <div className={`h-full rounded-full ${theme.logo} transition-all duration-500`} style={{ width: `${percent}%` }} />
          </div>
          <div className={`text-right text-sm mt-1 ${theme.accent} font-semibold`}>{percent}%</div>
        </div>

        {/* ── Graf rasta kroz vrijeme ── */}
        <GrowthChart />

        {/* ── Mualim: kompaktan link-banner - zadaci, oglasna ploča, časovi i
            poruke su premješteni u Mualim hub (posebna stranica) da se ne
            miješaju s ličnim dijelom dashboarda ── */}
        <Link
          to="/korisnik/mualim"
          className={`${SECTION_ACCENTS.mualim.wash} border-l-4 ${SECTION_ACCENTS.mualim.border} rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap hover:opacity-90 transition-all`}
        >
          <div className="min-w-0">
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${SECTION_ACCENTS.mualim.chip}`}>
              {t("dashboard.mualimSectionChip")}
            </span>
            <h2 className="font-heading font-bold">🧑‍🏫 {t("dashboard.mualimHubBanner")}</h2>
            <p className={`text-sm mt-1 ${theme.muted}`}>
              {t("dashboard.mualimHubSummary", { tasks: tasks.length, announcements: announcements.length, sessions: sessions.length })}
            </p>
          </div>
          <span className={`${theme.button} rounded-xl px-4 py-2 text-sm font-semibold shrink-0`}>
            {t("dashboard.openMualimHub")} →
          </span>
        </Link>

        {/* ── Brzi linkovi ── */}
        <div data-tour="tour-quick-links" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { to: "/korisnik/hifz/planner", icon: "🗺️", label: t("dashboard.linkPlanner") },
            { to: "/korisnik/hifz/planer", icon: "📚", label: t("dashboard.linkTracker") },
            { to: "/korisnik/hifz/plan-print", icon: "🖨️", label: t("dashboard.linkPrint") },
          ].map((l) => (
            <Link key={l.to} to={l.to} className={`${theme.card} rounded-2xl p-4 text-center hover:opacity-80 transition`}>
              <div className="text-2xl mb-1">{l.icon}</div>
              <div className="text-sm font-medium">{l.label}</div>
            </Link>
          ))}
        </div>

        {/* ── Motivacijski ajet ── */}
        <div className={`${theme.cardAlt} rounded-2xl p-6 text-center`}>
          <p className="text-2xl leading-relaxed mb-3" dir="rtl" style={{ fontFamily: "'Amiri','Scheherazade New',serif" }}>
            {motivation.ar}
          </p>
          <p className={`italic text-sm ${theme.muted}`}>"{motivation.text}"</p>
          <p className={`text-xs mt-1 ${theme.accent}`}>{motivation.ref}</p>
        </div>
      </div>
    </div>
  );
}

// ── Kartica časa za učenika: link, smjernice i POLJE ZA BILJEŠKE tokom časa ─
// Izvezeno - koristi ga i KorisnikMualimHub.jsx (tab "Poruke").
export function SessionCardStudent({ sn, theme, t, lang, userId }) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await supabase.from("session_attendance")
          .select("biljeske")
          .eq("session_id", sn.id).eq("student_id", userId).maybeSingle();
        if (data?.biljeske) setNote(data.biljeske);
      } catch { /* */ }
    })();
  }, [userId, sn.id]);

  const save = async () => {
    try {
      await saveAttendance(sn.id, userId, { prisutan: true, biljeske: note });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { /* */ }
  };

  return (
    <li className={`${theme.cardSub} rounded-xl p-3 text-sm`}>
      <div className="font-medium">{sn.naslov}</div>
      <div className={`text-xs ${theme.muted}`}>{new Date(sn.starts_at).toLocaleString(lang === "en" ? "en-GB" : "bs-BA")}</div>
      <div className="flex items-center gap-2 flex-wrap text-xs mt-1">
        <span className={`${theme.card} rounded-full px-2 py-0.5`}>
          {sn.nacin === "uzivo" ? `📍 ${t("mualim.uzivo")}` : `💻 ${t("mualim.online")}`}
        </span>
        {sn.nacin === "uzivo" && sn.lokacija && <span className={theme.muted}>{sn.lokacija}</span>}
      </div>
      {sn.smjernice && <div className={`text-xs mt-1 ${theme.muted}`}>{sn.smjernice}</div>}
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        {sn.link && (
          <a href={sn.link} target="_blank" rel="noreferrer" className={`${theme.accent} text-xs underline`}>
            {t("dashboard.joinSession")}
          </a>
        )}
        <button onClick={() => setOpen((o) => !o)} className={`text-xs underline ${theme.muted}`}>
          📝 {t("dashboard.myNotes")}
        </button>
      </div>
      {open && (
        <div className="mt-2 space-y-1.5">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder={t("dashboard.notesPlaceholder")}
            className={`w-full ${theme.card} rounded-lg px-2.5 py-1.5 text-sm outline-none resize-none`} />
          <div className="flex items-center gap-2">
            <button onClick={save} className={`${theme.button} rounded-lg px-3 py-1 text-xs`}>{t("dashboard.saveNotes")}</button>
            {saved && <span className="text-xs text-green-500">✓</span>}
          </div>
        </div>
      )}
    </li>
  );
}

// ── Odvojeni tajmer (učenje / ponavljanje - svaki svoj) ─────────────────────
// targetMinutes (opciono) - kad postoji (iz talim_plans.state.minutesNeeded),
// tajmer POSTAJE ODBROJAVANJE od tog broja minuta do 0, umjesto obične štoperice
// koja broji gore. Bez tog polja (npr. tajmer za ponavljanje) ponaša se kao prije.
function SessionTimer({ label, theme, targetMinutes }) {
  const isCountdown = !!targetMinutes && targetMinutes > 0;
  const [seconds, setSeconds] = useState(isCountdown ? targetMinutes * 60 : 0);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  // ako se ciljano vrijeme naknadno učita/promijeni (npr. korisnik ili muallim
  // izmijene "vrijeme potrebno"), osvježi odbrojavanje dok tajmer nije pokrenut.
  // Prilagođava se tokom rendera (ne u useEffect) uz poređenje s prethodnim
  // vrijednostima - isti okidači kao stari dependency niz.
  const [prevTargetMinutes, setPrevTargetMinutes] = useState(targetMinutes);
  const [prevRunning, setPrevRunning] = useState(running);
  if (targetMinutes !== prevTargetMinutes || running !== prevRunning) {
    setPrevTargetMinutes(targetMinutes);
    setPrevRunning(running);
    if (isCountdown && !running) setSeconds(targetMinutes * 60);
  }

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setSeconds((s) => (isCountdown ? Math.max(0, s - 1) : s + 1));
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running, isCountdown]);

  const expired = isCountdown && seconds === 0;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <button
      onClick={() => setRunning((r) => !r)}
      title={label}
      className={`${theme.cardSub} rounded-xl px-3 py-1 text-xs font-mono flex items-center gap-1.5 ${expired ? "text-red-500" : ""}`}
    >
      <span>{expired ? "⏰" : running ? "⏸" : "▶️"}</span>
      <span>{mm}:{ss}</span>
    </button>
  );
}
