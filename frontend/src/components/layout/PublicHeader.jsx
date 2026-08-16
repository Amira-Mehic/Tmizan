// ============================================================================
// Javni header - isti na Home, Blogu i svim javnim stranicama.
// Logo, navigacija, jezik, birač teme; gost vidi Prijavu/Registraciju,
// prijavljeni Moj panel/Odjavu. Tema i jezik se pamte za sve.
// Na mobitelu: jezik, tema i navigacija su u djelomičnom "drawer" meniju
// (hamburger), koji NE prekriva cijeli ekran - samo klizi zdesna.
// ============================================================================

import { useState, Fragment } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/ThemeContext"
import { useLang } from "../../context/LanguageContext"
import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../services/SupaBaseClient"

export default function PublicHeader() {
  const { theme, setTheme, THEMES } = useTheme()
  const { t } = useTranslation()
  const { lang, setLang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [themeOpen, setThemeOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Boja drawera - prozirna nijansa teme (blur preko klase)
  const dHex = (theme.card.match(/#(?:[0-9a-fA-F]{6})/) || ["#141414"])[0]
  const drawerFill = `rgba(${parseInt(dHex.slice(1, 3), 16)}, ${parseInt(dHex.slice(3, 5), 16)}, ${parseInt(dHex.slice(5, 7), 16)}, 0.6)`

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMenuOpen(false)
    navigate("/")
  }

  // navigacijske stavke (dijele desktop nav i mobilni meni)
  const NAV = [
    { href: "/#sta-je",   label: t("home.navAbout") },
    { href: "/#funkcije", label: t("home.navFeatures") },
    { href: "/#metode",   label: t("home.navMethods") },
    { to: "/blog",        label: "Blog" },
  ]

  return (
    <>
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/10">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
          <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${theme.logo} flex items-center justify-center text-white font-black text-base sm:text-lg`}>T</span>
          <span className={`font-black text-lg sm:text-xl tracking-tight ${theme.text}`}>Tmizan</span>
        </Link>

        {/* Centralna navigacija - razmaknuta VELIKA slova (samo desktop) */}
        <nav className={`hidden md:flex items-center ${theme.muted}`}>
          {NAV.map((item, i) => (
            <Fragment key={item.label}>
              {i > 0 && <span aria-hidden className="mx-5 lg:mx-6 h-4 w-px bg-current opacity-25" />}
              {item.to ? (
                <Link to={item.to} className="text-xs font-medium uppercase tracking-[0.18em] whitespace-nowrap hover:opacity-70 transition-opacity">
                  {item.label}
                </Link>
              ) : (
                <a href={item.href} className="text-xs font-medium uppercase tracking-[0.18em] whitespace-nowrap hover:opacity-70 transition-opacity">
                  {item.label}
                </a>
              )}
            </Fragment>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* jezik + tema - SAMO desktop (na mobitelu su u meniju) */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "bs" ? "en" : "bs")}
              className={`${theme.cardSub} rounded-lg px-2 py-1.5 text-xs font-bold ${theme.text}`}
            >
              {lang === "bs" ? "EN" : "BS"}
            </button>

            <div className="relative">
              <button
                onClick={() => setThemeOpen((o) => !o)}
                className={`${theme.cardSub} rounded-lg px-2 py-1.5 text-xs`}
                title={t("home.theme")}
              >
                🎨
              </button>
              {themeOpen && (
                <div className={`absolute right-0 mt-2 ${theme.card} rounded-xl p-2 w-44 space-y-1 shadow-xl`}>
                  {Object.values(THEMES).map((th) => (
                    <button
                      key={th.id}
                      onClick={() => { setTheme(th); setThemeOpen(false) }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs hover:opacity-70 ${theme.text} ${th.id === theme.id ? theme.cardSub : ""}`}
                    >
                      <span className={`w-4 h-4 rounded-full ${th.logo}`} />
                      {th.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* auth - uvijek vidljivo */}
          {user ? (
            <>
              <button onClick={() => navigate("/korisnik/dashboard")} className={`${theme.button} rounded-lg px-2.5 py-1.5 text-xs sm:text-sm whitespace-nowrap`}>
                {t("home.myPanel")}
              </button>
              <button onClick={handleLogout} className={`hidden sm:inline-block ${theme.cardSub} rounded-lg px-2.5 py-1.5 text-xs sm:text-sm whitespace-nowrap ${theme.text}`}>
                {t("home.logout")}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate("/login")} className={`${theme.cardSub} rounded-lg px-2.5 py-1.5 text-xs sm:text-sm whitespace-nowrap ${theme.text}`}>
                {t("auth.login")}
              </button>
              <button onClick={() => navigate("/register")} className={`${theme.button} rounded-lg px-2.5 py-1.5 text-xs sm:text-sm whitespace-nowrap`}>
                {t("auth.register")}
              </button>
            </>
          )}

          {/* hamburger - SAMO mobitel */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Meni"
            className={`md:hidden ${theme.cardSub} rounded-lg p-2 ${theme.text}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      </header>

      {/* ── MOBILNI MENI - drawer (van headera zbog backdrop-blur) ── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* zatamnjena pozadina - klik zatvara */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />

          {/* panel: uska širina (~68%), klizi uz desni rub - PUNA neprozirna boja */}
          <div style={{ backgroundColor: drawerFill }} className={`absolute top-0 right-0 h-full w-64 max-w-[78%] backdrop-blur-xl ${theme.text} shadow-2xl flex flex-col`}>
            <div className="flex items-center justify-between px-4 py-3">
              <span className={`font-black ${theme.text}`}>{lang === "bs" ? "Meni" : "Menu"}</span>
              <button onClick={() => setMenuOpen(false)} aria-label={lang === "bs" ? "Zatvori" : "Close"} className={`${theme.cardSub} rounded-lg p-1.5 ${theme.text}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* navigacija - tanke, prozirne linije između (ne do kraja širine) */}
            <nav className={`px-5 pt-2 flex flex-col ${theme.text}`}>
              {NAV.map((item, idx) => {
                const cls = `block py-3 pr-10 text-sm font-semibold hover:opacity-70 ${idx < NAV.length - 1 ? "border-b border-current/15" : ""}`
                return item.to ? (
                  <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)} className={cls}>{item.label}</Link>
                ) : (
                  <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className={cls}>{item.label}</a>
                )
              })}
            </nav>

            {/* jezik + tema - na dnu drawera */}
            <div className="px-4 py-4 mt-auto space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wider ${theme.muted}`}>{lang === "bs" ? "Jezik" : "Language"}</span>
                <button onClick={() => setLang(lang === "bs" ? "en" : "bs")} className={`${theme.cardSub} rounded-lg px-3 py-1.5 text-xs font-bold ${theme.text}`}>
                  {lang === "bs" ? "Bosanski" : "English"}
                </button>
              </div>

              <div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${theme.muted}`}>{lang === "bs" ? "Tema" : "Theme"}</span>
                <div className="mt-2 flex flex-wrap gap-2.5">
                  {Object.values(THEMES).map((th) => (
                    <button
                      key={th.id}
                      onClick={() => setTheme(th)}
                      title={th.name}
                      aria-label={th.name}
                      className={`w-8 h-8 rounded-full ${th.logo} transition-transform ${th.id === theme.id ? "ring-2 ring-offset-2 ring-offset-transparent ring-current scale-110" : "hover:scale-105"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
