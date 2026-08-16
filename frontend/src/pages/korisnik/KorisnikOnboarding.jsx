// ============================================================================
// Onboarding - uvodna postava novog korisnika (5 koraka)
// 1. Koji nivo si?  2. Šta si do sada naučio? (brzi unos džuzeva)
// 3. Koliko vremena imaš dnevno?  4. Imaš li muallima?  5. Metoda ponavljanja
// Na kraju: AUTOMATSKO popunjavanje početnog statusa (stranice odabranih
// džuzeva → "naučeno") i prijedlog plana za prve sedmice.
// ============================================================================

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/SupaBaseClient";
import { getJuzPages } from "../../constants/hifz/helpers";
import { recommendation, PROFILES } from "../../features/murajaah/nivo";

const STR = {
  bs: {
    title: "Dobro došao/la u Tmizan!", subtitle: "5 kratkih koraka i sve je spremno",
    q1: "Koji je tvoj nivo?",
    lvl_pocetnik: "Početnik — tek krećem", lvl_ucim: "Učim hifz", lvl_dosta: "Imam dosta naučeno", lvl_hafiz: "Hafiz sam",
    q2: "Šta si do sada naučio/la?",
    q2hint: "Označi džuzeve koje znaš (možeš preskočiti i unijeti kasnije u Trackeru)",
    q3: "Koliko vremena imaš dnevno?",
    t15: "do 15 min", t30: "oko 30 min", t60: "sat i više",
    q4: "Imaš li muallima?",
    yes: "Imam — želim se povezati", no: "Nemam / kasnije",
    q5: "Preporučena metoda ponavljanja",
    q5hint: "Na osnovu tvog nivoa — možeš je promijeniti bilo kada.",
    finish: "Završi postavu", saving: "Postavljam…",
    done: "Sve je spremno! 🎉", doneHint: "Početni status je popunjen — stranice označenih džuzeva su postavljene kao naučene.",
    goDash: "Idi na dashboard", goMualim: "Pronađi muallima",
    next: "Dalje →", back: "← Nazad", skip: "Preskoči",
    firstWeeks: "Prijedlog za prve sedmice",
  },
  en: {
    title: "Welcome to Tmizan!", subtitle: "5 short steps and you're all set",
    q1: "What is your level?",
    lvl_pocetnik: "Beginner — just starting", lvl_ucim: "Learning hifz", lvl_dosta: "I know quite a bit", lvl_hafiz: "I am a hafiz",
    q2: "What have you learned so far?",
    q2hint: "Mark the ajza you know (you can skip and enter later in the Tracker)",
    q3: "How much time do you have daily?",
    t15: "up to 15 min", t30: "about 30 min", t60: "an hour or more",
    q4: "Do you have a muallim?",
    yes: "Yes — I want to connect", no: "No / later",
    q5: "Recommended review method",
    q5hint: "Based on your level — you can change it any time.",
    finish: "Finish setup", saving: "Setting up…",
    done: "All set! 🎉", doneHint: "Initial status filled — pages of the marked ajza are set as learned.",
    goDash: "Go to dashboard", goMualim: "Find a muallim",
    next: "Next →", back: "← Back", skip: "Skip",
    firstWeeks: "Suggestion for the first weeks",
  },
};

const NIVO_MAP = { pocetnik: "pocetnik", ucim: "pocetnik", dosta: "srednji", hafiz: "napredni" };

export default function KorisnikOnboarding() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const s = STR[lang] || STR.bs;

  const [step, setStep] = useState(1);
  const [nivo, setNivo] = useState("pocetnik");
  const [znamDzuzeve, setZnamDzuzeve] = useState([]);
  const [vrijeme, setVrijeme] = useState("30");
  const [imaMualima, setImaMualima] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const profil = NIVO_MAP[nivo];
  const rec = recommendation(profil);

  const toggleJuz = (j) =>
    setZnamDzuzeve((p) => (p.includes(j) ? p.filter((x) => x !== j) : [...p, j]));

  const finish = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // 1) automatsko popunjavanje početnog statusa: stranice džuzeva → naučeno
      if (znamDzuzeve.length) {
        const rows = [];
        for (const j of znamDzuzeve) {
          for (const p of getJuzPages(j)) {
            rows.push({ user_id: user.id, page_number: p, status: "naucen" });
          }
        }
        // upsert u komadima od 200 (Supabase limit prijateljski)
        for (let i = 0; i < rows.length; i += 200) {
          await supabase.from("page_progress").upsert(rows.slice(i, i + 200), { onConflict: "user_id,page_number" });
        }
      }
      // 2) sačuvaj postavke onboardinga (lokalno - nivo koristi cijela aplikacija)
      localStorage.setItem("tmizan_nivo", profil);
      localStorage.setItem("tmizan_vrijeme_dnevno", vrijeme);
      localStorage.setItem("tmizan_metoda", rec.metoda);
      localStorage.setItem("tmizan_onboarded", "1");
      setDone(true);
    } catch (e) { console.error("onboarding:", e); }
    setSaving(false);
  };

  const pill = (active) => `rounded-xl px-4 py-2.5 text-sm transition ${active ? theme.button : `${theme.cardSub} ${theme.muted}`}`;
  const P = PROFILES[profil];

  if (done) {
    return (
      <div className={`min-h-screen ${theme.text} flex items-center justify-center px-4`}>
        <div className={`${theme.card} rounded-3xl p-8 max-w-md w-full text-center space-y-4`}>
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold">{s.done}</h1>
          <p className={`text-sm ${theme.muted}`}>{s.doneHint}</p>
          <div className={`${theme.cardSub} rounded-xl p-3 text-sm text-left`}>
            <div className={`text-[10px] uppercase tracking-wider mb-1 ${theme.muted}`}>{s.firstWeeks}</div>
            {P.savjet}
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={() => navigate("/korisnik/dashboard")} className={`${theme.button} rounded-xl px-6 py-2.5 text-sm font-semibold`}>
              {s.goDash}
            </button>
            {imaMualima && (
              <Link to="/korisnik/mualimi" className={`${theme.cardSub} rounded-xl px-6 py-2.5 text-sm`}>
                {s.goMualim}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.text} px-4 py-8`}>
      <div className="max-w-xl mx-auto space-y-5">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold">{s.title}</h1>
          <p className={`${theme.muted} text-sm mt-1`}>{s.subtitle}</p>
        </div>

        {/* korak indikator */}
        <div className="flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`w-2.5 h-2.5 rounded-full ${i <= step ? theme.logo : "bg-gray-400/40"}`} />
          ))}
        </div>

        <div className={`${theme.card} rounded-2xl p-5 space-y-4`}>
          {step === 1 && (
            <>
              <h2 className="font-semibold">{s.q1}</h2>
              <div className="grid grid-cols-2 gap-2">
                {["pocetnik", "ucim", "dosta", "hafiz"].map((n) => (
                  <button key={n} onClick={() => setNivo(n)} className={pill(nivo === n)}>{s[`lvl_${n}`]}</button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-semibold">{s.q2}</h2>
              <p className={`text-xs ${theme.muted}`}>{s.q2hint}</p>
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                  <button key={j} onClick={() => toggleJuz(j)}
                    className={`rounded-lg py-1.5 text-xs font-semibold ${znamDzuzeve.includes(j) ? theme.button : `${theme.cardSub} ${theme.muted}`}`}>
                    {j}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-semibold">{s.q3}</h2>
              <div className="flex gap-2 flex-wrap">
                {[["15", s.t15], ["30", s.t30], ["60", s.t60]].map(([v, label]) => (
                  <button key={v} onClick={() => setVrijeme(v)} className={pill(vrijeme === v)}>{label}</button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="font-semibold">{s.q4}</h2>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setImaMualima(true)} className={pill(imaMualima)}>{s.yes}</button>
                <button onClick={() => setImaMualima(false)} className={pill(!imaMualima)}>{s.no}</button>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="font-semibold">{s.q5}</h2>
              <p className={`text-xs ${theme.muted}`}>{s.q5hint}</p>
              <div className={`${theme.cardSub} rounded-xl p-4`}>
                <div className={`font-bold ${theme.accent}`}>{rec.metoda}</div>
                <p className={`text-sm mt-1 ${theme.muted}`}>{rec.savjet}</p>
              </div>
              <button onClick={finish} disabled={saving}
                className={`w-full ${theme.button} rounded-xl py-3 text-sm font-semibold disabled:opacity-50`}>
                {saving ? s.saving : s.finish}
              </button>
            </>
          )}

          <div className="flex justify-between pt-1">
            <button onClick={() => setStep((x) => Math.max(1, x - 1))} disabled={step === 1}
              className={`${theme.cardSub} ${theme.muted} rounded-xl px-4 py-2 text-sm disabled:opacity-40`}>
              {s.back}
            </button>
            {step < 5 && (
              <button onClick={() => setStep((x) => x + 1)} className={`${theme.button} rounded-xl px-4 py-2 text-sm`}>
                {s.next}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
