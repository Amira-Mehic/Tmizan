// ============================================================================
// Home - javna početna (landing) stranica.
// Hero video, brojke, "Šta je Tmizan", showcase funkcija, metode i footer.
// Radi na svih 6 tema; header: gost vidi Prijavu/Registraciju, prijavljeni Moj panel.
// ============================================================================

import React from "react"
import { useNavigate, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"
import PublicHeader from "../../components/layout/PublicHeader"
import SideAds from "../../components/ui/SideAds"
import ParticleBackground from "../../components/shared/ParticleBackground"
import { Reveal, Counter } from "../../components/shared/Reveal"
import ApplyMualimSection from "../../components/shared/ApplyMualimSection"

// Uklanja border klase iz theme stringa (kutije bez ivica)
const nb = (c) => (c || "").replace(/border(-\[[^\]]+\])?/g, "").replace(/\s{2,}/g, " ").trim()

// Bullet prednosti po funkciji (bs/en)
const FBULLETS = {
  bs: {
    tracker: ["Praćenje po stranici i po ajetu", "Statusi, sigurnost i greške", "Prijevod i tefsir uz svaki ajet", "Historija ponavljanja s datumima"],
    planner: ["Biraš mushaf i opseg učenja", "Mjeri se u redovima, ne minutama", "Tačan procijenjeni datum završetka", "Vizuelni put do cilja"],
    murajaah: ["Preko 15 priznatih metoda", "Intervalne i kružne metode", "Naučni SRS i originalni Tmizan model", "Metode se mogu kombinovati"],
    mualim: ["Prati napredak svakog učenika", "Mapa slabih mjesta i greške", "Sesije, halke i poruke", "Zadaci i prioritetni planovi"],
    print: ["Mjesečni plan s datumima", "Print ili izvoz u PDF/Word", "Slobodni dani i pojačano ponavljanje", "Uređivanje bilješki prije printa"],
    test: ["Testiraj baš slabe ajete", "Most: prethodni — ??? — sljedeći", "Historija i trend, privatno", "Označavanje riječi s greškom"],
  },
  en: {
    tracker: ["Track by page and by ayah", "Statuses, confidence and mistakes", "Translation and tafsir per ayah", "Repetition history with dates"],
    planner: ["Choose mushaf and scope", "Measured in lines, not minutes", "Exact estimated finish date", "Visual path to your goal"],
    murajaah: ["Over 15 recognized methods", "Interval and cyclic methods", "Scientific SRS and original Tmizan model", "Methods can be combined"],
    mualim: ["Track each student's progress", "Weak-spots map and mistakes", "Sessions, halaqas and messages", "Tasks and priority plans"],
    print: ["Monthly plan with dates", "Print or export to PDF/Word", "Rest days and extra review", "Edit notes before printing"],
    test: ["Test exactly the weak ayahs", "Bridge: previous — ??? — next", "History and trend, private", "Word-level mistake marking"],
  },
}

export default function Home() {
  const { theme } = useTheme()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const lang = (i18n.language || "bs").startsWith("en") ? "en" : "bs"

  // Površine teme bez border-ivica
  const cardNB = nb(theme.card)
  const cardAltNB = nb(theme.cardAlt)

  // Funkcije prikazane u showcase sekciji
  const FEATURES = [
    { icon: "📖",   key: "tracker",  img: "tracker",  ext: "png" },
    { icon: "🗺️",   key: "planner",  img: "planner",  ext: "png" },
    { icon: "🔁",   key: "murajaah", img: "review",   ext: "png" },
    { icon: "🧑‍🏫", key: "mualim",   img: "mualim",   ext: "png" },
    { icon: "🖨️",   key: "print",    img: "print",    ext: "png" },
    { icon: "✍️",   key: "test",     img: "test",     ext: "png" },
  ]
  const METODE = ["m20", "mFibonacci", "mKrugovi", "mSrs", "mFemi"]

  // Video pozadine po temi. Broj se odnosi na fajl public/tmizanN.mp4, pa svaka
  // tema mora imati unos - neupisana tema pada na podrazumijevani video.
  const HERO_MEDIA = {
    beige_white:       { n: 1 },
    dark_beige_orange: { n: 2 },
    purple_blue:       { n: 3 },
    emerald_dark:      { n: 4 },
    black_slate:       { n: 5 },
    warm_peach:        { n: 2 },
    pink_soft:         { n: 6 },
  }
  const n = HERO_MEDIA[theme?.id]?.n
  const heroVideo = `/tmizan${n || 1}.mp4`
  const heroPoster = "/hero.jpg"
  const STATS = [
    { to: 604, suffix: "", label: t("home.statPages") },
    { to: 30, suffix: "", label: t("home.statJuz") },
    { to: 19, suffix: "+", label: t("home.statMethods") },
  ]

  return (
    <div className={`relative z-0 min-h-screen ${theme.bgGradient} ${theme.text} transition-all duration-500 overflow-x-hidden`}>

      {/* Keyframes ulaznih animacija */}
      <style>{`
        @keyframes tmz-up { from { opacity:0; transform:translateY(26px);} to {opacity:1; transform:none;} }
        @keyframes tmz-float1 { 0%,100%{ transform:translate(0,0) scale(1);} 50%{ transform:translate(28px,-34px) scale(1.08);} }
        @keyframes tmz-float2 { 0%,100%{ transform:translate(0,0) scale(1);} 50%{ transform:translate(-30px,26px) scale(1.12);} }
        @keyframes tmz-imgin { from { opacity:0; transform:translateY(30px) scale(.96);} to {opacity:1; transform:none;} }
        .tmz-enter { opacity:0; animation: tmz-up .8s cubic-bezier(.2,.7,.2,1) forwards; }
        @media (prefers-reduced-motion: reduce){ .tmz-enter{ animation:none; opacity:1;} }
      `}</style>

      {/* Animirana "prašina" čestica iza cijele stranice, obojena po temi */}
      <ParticleBackground colors={theme.particleColors} />

      <PublicHeader />
      {/* Bočni oglasi (2xl+ ekrani) */}
      <SideAds theme={theme} />

      {/* ══════════ HERO - fullscreen video pozadina ══════════ */}
      <section className="relative min-h-[88vh] sm:min-h-screen flex items-center justify-center overflow-hidden -mt-[64px] pt-[64px]">
        {/* Pozadinski video (mijenja se s temom) */}
        <video
          key={theme?.id}
          autoPlay muted loop playsInline poster={heroPoster}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>

        {/* Tamni sloj - čitljivost teksta */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/75" />

        {/* Hero sadržaj */}
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center text-white py-20">
          <span className="tmz-enter inline-block border border-white/25 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest backdrop-blur-sm"
                style={{ animationDelay: "60ms" }}>
            {t("home.badge")}
          </span>

          <p className="tmz-enter text-2xl sm:text-3xl mt-6 mb-4 leading-relaxed" dir="rtl"
             style={{ animationDelay: "140ms", fontFamily: "'Amiri','Scheherazade New',serif", textShadow: "0 2px 20px rgba(0,0,0,.5)" }}>
            وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا
          </p>

          <h1 className="tmz-enter text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]"
              style={{ animationDelay: "220ms", fontFamily: "Georgia, 'Times New Roman', serif", textShadow: "0 4px 30px rgba(0,0,0,.55)" }}>
            {t("home.heroTitle")}
          </h1>

          <p className="tmz-enter mt-6 text-base sm:text-xl leading-relaxed text-white/85 max-w-2xl mx-auto"
             style={{ animationDelay: "320ms", textShadow: "0 2px 16px rgba(0,0,0,.5)" }}>
            {t("home.heroSubtitle")}
          </p>

          <div className="tmz-enter flex gap-3 mt-9 flex-wrap justify-center"
               style={{ animationDelay: "420ms" }}>
            <button onClick={() => navigate(user ? "/korisnik/dashboard" : "/register")}
                    className={`${theme.button} rounded-xl px-8 py-3.5 text-base font-semibold shadow-2xl hover:scale-[1.04] active:scale-95 transition-transform`}>
              {user ? t("home.myPanel") : t("home.ctaStart")}
            </button>
            <a href="#sta-je" className="rounded-xl px-8 py-3.5 text-base font-medium border border-white/40 text-white hover:bg-white/10 transition-colors">
              {t("home.ctaLearn")}
            </a>
          </div>
        </div>

        {/* Strelica za skrol */}
        <a href="#brojke" className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/70 hover:text-white"
           style={{ animation: "tmz-float2 2.4s ease-in-out infinite" }} aria-label="scroll">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
        </a>
      </section>

      {/* ══════════ BROJKE ══════════ */}
      <section id="brojke" className="max-w-4xl mx-auto px-4 sm:px-6 -mt-10 sm:-mt-14 relative z-20">
        <Reveal className="grid grid-cols-3 gap-3 sm:gap-4">
          {STATS.map((st) => (
            <div key={st.label} className={`${cardNB} rounded-2xl p-4 sm:p-6 text-center shadow-xl hover:-translate-y-1 transition-transform`}>
              <div className={`text-2xl sm:text-4xl font-black ${theme.accent}`}>
                <Counter to={st.to} suffix={st.suffix} />
              </div>
              <div className={`text-xs sm:text-sm mt-1 ${theme.muted}`}>{st.label}</div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ══════════ ŠTA JE TMIZAN ══════════ */}
      <section id="sta-je" className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <Reveal>
          <div className={`${cardNB} rounded-3xl p-6 sm:p-10 grid md:grid-cols-2 gap-8 items-center`}>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black mb-4">{t("home.aboutTitle")}</h2>
              <p className={`${theme.muted} leading-relaxed mb-3`}>{t("home.aboutP1")}</p>
              <p className={`${theme.muted} leading-relaxed`}>{t("home.aboutP2")}</p>
            </div>
            <Reveal delay={150} className={`${cardAltNB} rounded-2xl p-6 text-center`}>
              <p className="text-xl mb-2" dir="rtl" style={{ fontFamily: "'Amiri',serif" }}>تعليم + ميزان</p>
              <p className="font-bold text-lg mb-1">Ta'lim + Mizan = Tmizan</p>
              <p className={`text-sm ${theme.muted}`}>{t("home.nameMeaning")}</p>
            </Reveal>
          </div>
        </Reveal>
      </section>

      {/* ══════════ FUNKCIJE (showcase) ══════════ */}
      <section id="funkcije" className="py-16">
        <Reveal className="text-center mb-4 max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-black mb-2">{t("home.featuresTitle")}</h2>
          <p className={theme.muted}>{t("home.featuresSubtitle")}</p>
        </Reveal>

        {FEATURES.map((f, i) => {
          const flip = i % 2 === 1
          // Panel pozadine: mobitel = centriran card; md+ = bije do ruba, zaobljen na strani simbola
          const panelBg = flip
            ? "inset-x-3 rounded-[28px] md:inset-x-auto md:right-0 md:w-[calc(50%_+_460px)] md:rounded-r-none md:rounded-l-[210px]"
            : "inset-x-3 rounded-[28px] md:inset-x-auto md:left-0 md:w-[calc(50%_+_460px)] md:rounded-l-none md:rounded-r-[210px]"
          return (
            <Reveal as="div" key={f.key} x={flip ? 90 : -90} y={24} className={`relative ${i > 0 ? "mt-8 md:mt-16" : ""}`}>
              {/* Panel u pozadini */}
              <div className={`absolute inset-y-0 ${cardNB} ${panelBg}`} />
              {/* Sadržaj: tekst + simbol, centriran */}
              <div className="relative max-w-6xl mx-auto px-6 sm:px-10 py-14 md:py-20">
                <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
                    {/* Tekst */}
                    <div className={flip ? "md:order-2" : ""}>
                      <div className={`inline-flex items-center justify-center w-11 h-11 rounded-full ${theme.button} text-2xl mb-4 shadow-lg`}>{f.icon}</div>
                      <h3 className="text-2xl sm:text-4xl font-black mb-3" style={{ fontFamily: "Georgia, serif" }}>
                        {t(`home.f_${f.key}_title`)}
                      </h3>
                      <p className={`${theme.muted} leading-relaxed mb-5 max-w-lg`}>{t(`home.f_${f.key}_desc`)}</p>
                      <ul className="space-y-2.5 mb-6">
                        {(FBULLETS[lang][f.key] || []).map((b, k) => (
                          <li key={k} className="flex items-start gap-3">
                            <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${theme.logo}`} />
                            <span className="text-sm sm:text-[15px] font-medium">{b}</span>
                          </li>
                        ))}
                      </ul>
                      <button onClick={() => navigate(user ? "/korisnik/dashboard" : "/register")}
                              className={`${theme.button} rounded-full px-6 py-3 text-sm font-semibold hover:scale-[1.03] active:scale-95 transition-transform shadow-lg`}>
                        {t("home.ctaLearn")}
                      </button>
                    </div>

                    {/* Simbol */}
                    <div className={`relative flex justify-center ${flip ? "md:order-1" : "md:order-2"}`}>
                      <FeaturePreview kind={f.key} theme={theme} />
                    </div>
                </div>
              </div>
              {/* Redni broj koraka (dekor, veliki ekrani) */}
              <div
                className={`hidden xl:block absolute top-1/2 -translate-y-1/2 z-0 pointer-events-none select-none ${theme.accent} ${flip ? "left-[4%]" : "right-[4%]"}`}
                style={{ fontSize: "230px", lineHeight: 1, fontFamily: "Georgia, serif", fontWeight: 800, opacity: 0.08 }}
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </div>
            </Reveal>
          )
        })}
      </section>

      {/* ══════════ METODE ══════════ */}
      <section id="metode" className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <Reveal className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black mb-2">{t("home.methodsTitle")}</h2>
          <p className={`${theme.muted} max-w-2xl mx-auto`}>{t("home.methodsSubtitle")}</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {METODE.map((m, i) => (
            <Reveal key={m} delay={i * 70}>
              <div className={`${cardAltNB} rounded-2xl p-6 h-full border-l-4 border-current/20 hover:border-current/50 hover:-translate-y-1 transition-all duration-300`}>
                <h3 className={`font-bold mb-1.5 ${theme.accent}`}>{t(`home.${m}_title`)}</h3>
                <p className={`text-sm ${theme.muted}`}>{t(`home.${m}_desc`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <p className={`text-center text-sm mt-8 ${theme.muted}`}>{t("home.methodsMore")}</p>
        </Reveal>
      </section>

      {/* ══════════ ZA KOGA ══════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid sm:grid-cols-3 gap-4">
          {["beginner", "hafiz", "diaspora"].map((who, i) => (
            <Reveal key={who} delay={i * 100}>
              <div className={`${cardNB} shadow-xl rounded-2xl p-8 text-center h-full hover:-translate-y-1.5 transition-transform duration-300`}>
                <div className="text-4xl mb-3">{who === "beginner" ? "🌱" : who === "hafiz" ? "🌳" : "🌍"}</div>
                <h3 className="font-bold mb-2">{t(`home.who_${who}_title`)}</h3>
                <p className={`text-sm ${theme.muted}`}>{t(`home.who_${who}_desc`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════ MUALIM PITCH (kratka poruka o povezivanju s mualimom) ══════════ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-14">
        <Reveal>
          <div className={`${cardNB} rounded-2xl p-6 sm:p-8`}>
            <p className={`text-center text-lg sm:text-xl leading-relaxed ${theme.accent}`}>
              {t("home.mualimPitch")}
            </p>
          </div>
        </Reveal>
      </section>

      {/* ══════════ POSTANI MUALIM ══════════ */}
      <Reveal>
        <ApplyMualimSection cardNB={cardNB} />
      </Reveal>

      {/* ══════════ ZAVRŠNI CTA ══════════ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <Reveal>
          <p className="text-2xl leading-relaxed mb-4" dir="rtl" style={{ fontFamily: "'Amiri','Scheherazade New',serif" }}>
            وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ
          </p>
          <p className={`italic mb-8 ${theme.muted}`}>"{t("home.quoteText")}" — Al-Qamar, 17</p>
          {!user && (
            <button onClick={() => navigate("/register")}
                    className={`${theme.button} rounded-xl px-10 py-4 text-lg font-semibold shadow-lg hover:scale-[1.04] active:scale-95 transition-transform`}>
              {t("home.ctaFinal")}
            </button>
          )}
        </Reveal>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className={`${cardAltNB} mt-8`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-8 h-8 rounded-lg ${theme.logo} flex items-center justify-center text-white font-black`}>T</span>
              <span className="font-black text-lg">Tmizan</span>
            </div>
            <p className={`text-sm ${theme.muted}`}>{t("home.footerTagline")}</p>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-3">{t("home.footerLinks")}</h4>
            <ul className={`space-y-2 text-sm ${theme.muted}`}>
              <li><a href="#sta-je" className="hover:opacity-70">{t("home.navAbout")}</a></li>
              <li><a href="#funkcije" className="hover:opacity-70">{t("home.navFeatures")}</a></li>
              <li><a href="#metode" className="hover:opacity-70">{t("home.navMethods")}</a></li>
              <li><Link to="/blog" className="hover:opacity-70">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-3">{t("home.footerAccount")}</h4>
            <ul className={`space-y-2 text-sm ${theme.muted}`}>
              {user ? (
                <li><Link to="/korisnik/dashboard" className="hover:opacity-70">{t("home.myPanel")}</Link></li>
              ) : (
                <>
                  <li><Link to="/login" className="hover:opacity-70">{t("auth.login")}</Link></li>
                  <li><Link to="/register" className="hover:opacity-70">{t("auth.register")}</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>
        <div className={`text-center text-xs py-4 border-t border-current/10 ${theme.muted}`}>
          © {new Date().getFullYear()} Tmizan — {t("home.footerRights")}
        </div>
      </footer>
    </div>
  )
}

// ============================================================================
// FeaturePreview - line-ikona funkcije u krugu, u boji teme.
// ============================================================================
const FEATURE_ICON = {
  tracker: (<><path d="M12 7c-2.2-1.6-5.5-1.6-8-1.5v13c2.5-.1 5.8-.1 8 1.5 2.2-1.6 5.5-1.6 8-1.5v-13c-2.5-.1-5.8-.1-8 1.5z" /><path d="M12 7v13" /></>),
  planner: (<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /><path d="M8 15h3M14 15h2" /></>),
  murajaah: (<><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>),
  mualim: (<><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1.3 3 3 6 3s6-1.7 6-3v-5" /></>),
  print: (<><path d="M6 9V2h12v7" /><rect x="6" y="14" width="12" height="8" /><path d="M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" /></>),
  test: (<><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" /><path d="m9 14 2 2 4-4" /></>),
}

function FeaturePreview({ kind, theme }) {
  return (
    <div className="relative flex items-center justify-center shrink-0">
      {/* Sjaj iza kruga */}
      <div className={`absolute w-40 h-40 sm:w-60 sm:h-60 rounded-full blur-2xl opacity-25 ${theme.logo}`} />
      {/* Krug sa simbolom */}
      <div className={`relative w-36 h-36 sm:w-56 sm:h-56 rounded-full ${nb(theme.cardSub)} shadow-2xl flex items-center justify-center`}>
        {/* Unutrašnji ton teme */}
        <div className={`absolute inset-0 rounded-full opacity-10 ${theme.logo}`} />
        <svg className={`relative w-16 h-16 sm:w-24 sm:h-24 ${theme.accent}`} viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {FEATURE_ICON[kind] || FEATURE_ICON.tracker}
        </svg>
      </div>
    </div>
  )
}
