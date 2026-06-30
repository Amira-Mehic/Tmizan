import { useState, useEffect } from "react"
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom"
import { useTheme, THEMES } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"
import { useTranslation } from "react-i18next"
import { supabase } from "../../services/SupaBaseClient"
import BanerSlot from "../ui/BanerSlot"

const Icons = {
  LayoutDashboard: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="5" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>),
  Sun: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>),
  BookOpen: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>),
  ArabicLetter: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6h-7.5c-1.5 0-3.5 1-3.5 3.5 0 3.5 4.5 4.5 5.5 5.5s.5 4-2.5 4C7 19 6 17.5 6 17" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  ClipboardList: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6M9 16h6M9 8h6" /></svg>),
  HifzPlanner: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/><path d="M16 16c.5-1 2-1 2 0s-1.5 2-2 3"/></svg>),
  Users: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  MessageSquare: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>),
  Link2: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8" /></svg>),
  Headphones: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>),
  FileText: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" /></svg>),
  Newspaper: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/></svg>),
  CheckSquare: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>),
  ShieldAlert: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>),
  Settings: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9" /></svg>),
  User: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
  Palette: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="1.5" /><circle cx="17.5" cy="10.5" r="1.5" /><circle cx="8.5" cy="7.5" r="1.5" /><circle cx="6.5" cy="12.5" r="1.5" /><path d="M12 2C6.5 2 2 6.5 2 12a10 10 0 0 0 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.042a1.8 1.8 0 0 1 1.8-1.8h2.126c3.027 0 5.476-2.373 5.476-5.3C22 6.965 17.523 2 12 2z" /></svg>),
  LogOut: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>),
  ChevronLeft: () => (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>),
  Menu: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="18" x2="20" y2="18" /></svg>),
  X: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>),
}

export default function SidebarLayout() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)

  const role = user?.user_metadata?.role || "korisnik"

  const navLinks = {
    korisnik: [
      { label: t("sidebar.nav.dashboard"), path: "/korisnik/dashboard", icon: Icons.LayoutDashboard },
      { label: t("sidebar.nav.daily_hub"), path: "/korisnik/daily-hub", icon: Icons.Sun },
      { label: t("sidebar.nav.foundations"), path: "/korisnik/temelji", icon: Icons.BookOpen },
      { label: t("sidebar.nav.hifz_planner_page", "Hifz Planner"), path: "/korisnik/hifz/planner", icon: Icons.HifzPlanner },
      { label: t("sidebar.nav.hifz_planner"), path: "/korisnik/hifz/planer", icon: Icons.ClipboardList },
      { label: t("sidebar.nav.mualims"), path: "/korisnik/mualimi", icon: Icons.Users },
      { label: t("sidebar.nav.support"), path: "/korisnik/podrska", icon: Icons.MessageSquare },
      { label: "Blog", path: "/blog", icon: Icons.Newspaper, external: true },
    ],
    mualim: [
      { label: t("sidebar.nav.dashboard"), path: "/mualim/dashboard", icon: Icons.LayoutDashboard },
      { label: t("sidebar.nav.connections"), path: "/mualim/veze", icon: Icons.Link2 },
      { label: t("sidebar.nav.users"), path: "/mualim/korisnici", icon: Icons.Users },
      { label: t("sidebar.nav.reviews"), path: "/mualim/preslušavanja", icon: Icons.Headphones },
    ],
    blogger: [
      { label: t("sidebar.nav.dashboard"), path: "/blogger/dashboard", icon: Icons.LayoutDashboard },
      { label: t("sidebar.nav.posts"), path: "/blogger/objave", icon: Icons.FileText },
    ],
    moderator: [
      { label: t("sidebar.nav.dashboard"), path: "/management/dashboard", icon: Icons.LayoutDashboard },
      { label: t("sidebar.nav.mualim_requests"), path: "/management/mualim-zahtjevi", icon: Icons.CheckSquare },
      { label: t("sidebar.nav.mualims"), path: "/management/mualimi", icon: Icons.Users },
      { label: t("sidebar.nav.tickets"), path: "/management/tiketi", icon: Icons.ShieldAlert },
    ],
    admin: [
      { label: t("sidebar.nav.dashboard"), path: "/admin/dashboard", icon: Icons.LayoutDashboard },
      { label: t("sidebar.nav.moderators"), path: "/admin/moderatori", icon: Icons.ShieldAlert },
      { label: t("sidebar.nav.content"), path: "/admin/sadrzaj", icon: Icons.Settings },
      { label: t("sidebar.nav.ads"), path: "/admin/oglasi", icon: Icons.FileText },
      { label: t("sidebar.nav.mualim_requests"), path: "/management/mualim-zahtjevi", icon: Icons.CheckSquare },
      { label: t("sidebar.nav.tickets"), path: "/management/tiketi", icon: Icons.ShieldAlert },
    ],
  }

  const links = navLinks[role] || navLinks.korisnik

  useEffect(() => { setMobileOpen(false) }, [location])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const isLightTheme = theme?.id === "beige_white" || theme?.id === "pink_soft"
  const borderClass = isLightTheme ? "border-black/10" : "border-white/5"
  const hoverClass = isLightTheme
    ? "hover:text-slate-900 hover:bg-black/5"
    : "hover:text-white hover:bg-white/5"

  return (
    <div className={`min-h-screen ${theme?.bgGradient || "bg-gray-900"} font-sans antialiased relative`}>

      {/* ── MOBILNI HEADER ── */}
      <header className={`md:hidden flex items-center justify-between h-16 px-4 border-b ${borderClass} ${theme?.card} backdrop-blur-md sticky top-0 z-30`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg ${theme?.logo} flex items-center justify-center text-white font-extrabold text-sm`}>T</div>
          <span className={`font-black text-lg tracking-tight ${theme?.text}`}>Tmizan</span>
        </div>
        <div className="flex-1 max-w-[120px] mx-4">
          <BanerSlot pozicija="mobitel" mini={true} borderClass={borderClass} theme={theme} />
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className={`p-2 rounded-xl border ${borderClass} ${theme?.text}`}>
          {mobileOpen ? <Icons.X /> : <Icons.Menu />}
        </button>
      </header>

      {/* ── OVERLAY MOBITEL ── */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── SIDEBAR ──
          - lijeva ivica: flush uz rub ekrana (0)
          - ostale 3 ivice: 6px razmak + zaobljeni kutovi samo na desnoj strani
          - sidebar je overlay (z-50) i ne pomijera layout ispod
      */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50
          ${sidebarOpen ? "w-64" : "md:w-16 w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          transition-all duration-300 flex flex-col
          ${theme?.card} shadow-2xl
        `}
        style={{
          // Gornja, desna i donja ivica: 6px padding od ruba, lijeva: 0
          top: "4px",
          bottom: "4px",
          left: 0,
          borderRadius: "0 16px 16px 0",
          borderTop: `1px solid ${isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.05)"}`,
          borderRight: `1px solid ${isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.05)"}`,
          borderBottom: `1px solid ${isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.05)"}`,
          borderLeft: "none",
        }}
      >

        {/* LOGO */}
        <div className={`hidden md:flex ${sidebarOpen ? "flex-row justify-between items-center" : "flex-col items-center gap-3"} p-5 border-b ${borderClass}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg ${theme?.logo} flex items-center justify-center text-white font-extrabold text-sm shadow-md`}>T</div>
              <span className={`font-bold text-lg tracking-tight ${theme?.text}`}>Tmizan</span>
            </div>
          ) : (
            <div className={`w-7 h-7 rounded-lg ${theme?.logo} flex items-center justify-center text-white font-extrabold text-sm shadow-md`}>T</div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`${theme?.muted} p-1.5 rounded-lg hover:bg-black/5 transition-all`}
          >
            <div className={`transition-transform duration-300 ${!sidebarOpen ? "rotate-180" : ""}`}>
              <Icons.ChevronLeft />
            </div>
          </button>
        </div>

        {/* ROLE BADGE */}
        {sidebarOpen && (
          <div className={`mx-4 mt-4 px-3 py-2 rounded-xl border ${borderClass} bg-black/5 flex items-center justify-between`}>
            <span className={`text-[10px] uppercase font-bold tracking-wider ${theme?.muted}`}>{t("sidebar.role")}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${theme?.button} uppercase tracking-wider`}>{role}</span>
          </div>
        )}

        {/* NAV LINKS */}
        <nav className="flex-1 py-6 space-y-1.5 px-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {links.map((link) => {
            const IconComponent = link.icon
            const sharedCls = `flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-150 group relative ${theme?.muted} ${hoverClass}`
            if (link.external) return (
              <a
                key={link.path}
                href={link.path}
                target="_blank"
                rel="noopener noreferrer"
                className={sharedCls}
              >
                <span className="flex-shrink-0"><IconComponent /></span>
                <span className={`text-[13px] font-medium truncate ${sidebarOpen ? "block" : "block md:hidden"}`}>
                  {link.label}
                </span>
                {sidebarOpen && <span className="ml-auto text-[10px] opacity-40">↗</span>}
                {!sidebarOpen && (
                  <div className={`hidden md:block absolute left-16 scale-0 group-hover:scale-100 transition-all duration-150 text-white text-xs font-semibold rounded-lg px-3 py-1.5 shadow-xl pointer-events-none whitespace-nowrap z-30 ${isLightTheme ? "bg-gray-800" : "bg-gray-950 border border-white/10"}`}>
                    {link.label}
                  </div>
                )}
              </a>
            )
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
                  ${isActive ? `${theme?.button} font-semibold` : `${theme?.muted} ${hoverClass}`}`
                }
              >
                <span className="flex-shrink-0"><IconComponent /></span>
                <span className={`text-[13px] font-medium truncate ${sidebarOpen ? "block" : "block md:hidden"}`}>
                  {link.label}
                </span>
                {!sidebarOpen && (
                  <div className={`hidden md:block absolute left-16 scale-0 group-hover:scale-100 transition-all duration-150 text-white text-xs font-semibold rounded-lg px-3 py-1.5 shadow-xl pointer-events-none whitespace-nowrap z-30 ${isLightTheme ? "bg-gray-800" : "bg-gray-950 border border-white/10"}`}>
                    {link.label}
                  </div>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* BOTTOM */}
        <div className={`p-3 border-t ${borderClass} bg-black/5 space-y-1`} style={{ borderRadius: "0 0 16px 0" }}>
          <NavLink to="/profil" className={`flex items-center gap-3.5 px-3 py-2 rounded-xl ${theme?.muted} ${hoverClass} transition-all`}>
            <Icons.User />
            <span className={`text-[13px] font-medium ${sidebarOpen ? "block" : "block md:hidden"}`}>{t("sidebar.profile")}</span>
          </NavLink>
          <NavLink to="/postavke" className={`flex items-center gap-3.5 px-3 py-2 rounded-xl ${theme?.muted} ${hoverClass} transition-all`}>
            <Icons.Settings />
            <span className={`text-[13px] font-medium ${sidebarOpen ? "block" : "block md:hidden"}`}>{t("sidebar.settings")}</span>
          </NavLink>

          {/* THEME PICKER */}
          <div className="relative">
            <button
              onClick={() => setThemePickerOpen(!themePickerOpen)}
              className={`w-full flex items-center gap-3.5 px-3 py-2 rounded-xl ${theme?.muted} ${hoverClass} transition-all`}
            >
              <Icons.Palette />
              {(sidebarOpen || mobileOpen) && (
                <span className="text-[13px] font-medium">{t("sidebar.theme")}</span>
              )}
            </button>
            {themePickerOpen && THEMES && (
              <div className={`absolute bottom-12 left-0 w-52 rounded-2xl p-2 z-50 ${theme?.card} border ${borderClass} shadow-2xl backdrop-blur-md`}>
                <div className={`text-[10px] font-bold uppercase tracking-widest px-2.5 pb-2 border-b ${borderClass} ${theme?.muted}`}>
                  {t("sidebar.theme_label")}
                </div>
                {Object.values(THEMES).map((t2) => (
                  <button
                    key={t2.id}
                    onClick={() => { setTheme(t2); setThemePickerOpen(false) }}
                    className={`w-full text-left px-3 py-2.5 mt-1 rounded-xl text-xs font-medium transition-all
                      ${theme?.id === t2.id ? `${theme?.button}` : `${theme?.muted} ${hoverClass}`}`}
                  >
                    {t2.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <Icons.LogOut />
            <span className={`text-[13px] font-medium ${sidebarOpen ? "block" : "block md:hidden"}`}>{t("sidebar.logout")}</span>
          </button>
        </div>
      </aside>

      {/*
        ── GLAVNI LAYOUT ──
        Sidebar je UVIJEK overlay (z-50) i nikad ne pomijera sadržaj ispod.
        Lijevi baner ima fiksnu širinu 64px (= zatvoreni sidebar w-16).
        Kad je sidebar otvoren (256px), on ide PREKO lijevog banera kao overlay.
        Ispod sidbara (ta 64px kolona) ima isti theme?.card background kao sidebar.
      */}
      <div className="flex w-full min-h-screen">

        {/*
          LIJEVA KOLONA — uvijek 64px široka, ne mijenja se.
          Gornji dio (visina sidbara) ima isti card background kao sidebar.
          Ispod sidbara počinje oglas — malo tamniji background.
          Sidebar (z-50) ide PREKO ove kolone kad se otvori.
        */}
        <div
          className="hidden xl:flex flex-shrink-0 flex-col"
          style={{ width: "64px", flexShrink: 0 }}
        >
          {/* Gornji dio — isti background kao sidebar, ispod sidbara */}
          <div
            className={`${theme?.card}`}
            style={{ height: "100vh", width: "64px", position: "relative" }}
          />
        </div>

        {/* LIJEVI BANER — dolazi odmah desno od te 64px kolone, fiksna širina */}
        <div
          className="hidden xl:flex flex-shrink-0 flex-col items-center pt-8 px-2 gap-4"
          style={{
            width: "160px",
            backgroundColor: isLightTheme ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.20)",
            borderRight: `1px solid ${isLightTheme ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"}`,
          }}
        >
          <BanerSlot pozicija="lijevo" borderClass={borderClass} theme={theme} />
        </div>

        {/* GLAVNI SADRŽAJ */}
        <div className="flex-1 flex justify-center min-h-screen overflow-hidden">
          <main className={`w-full max-w-[1280px] overflow-auto p-4 md:p-8 ${theme?.text}`}>
            <Outlet />
          </main>
        </div>

        {/* DESNI BANER */}
        <div
          className="hidden xl:flex flex-shrink-0 flex-col items-center pt-8 px-2 gap-4"
          style={{
            width: "160px",
            backgroundColor: isLightTheme ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.20)",
            borderLeft: `1px solid ${isLightTheme ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"}`,
          }}
        >
          <BanerSlot pozicija="desno" borderClass={borderClass} theme={theme} />
        </div>

      </div>
    </div>
  )
}
