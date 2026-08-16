// ============================================================================
// Osnovni raspored ekrana za prijavljene korisnike: bočna navigacija i prostor
// za sadržaj rute. Stavke u navigaciji se sastavljaju prema ulogama korisnika,
// pa svako vidi samo ono što smije otvoriti. Korisnik s više uloga dobija
// grupisane sekcije umjesto jedne duge liste.
//
// Raspored se prilagođava veličini ekrana: na desktopu se navigacija može
// suziti na same ikone, a na telefonu se otvara preko sadržaja i zatvara pri
// svakoj promjeni stranice. Odabrana širina se pamti između posjeta.
// ============================================================================

import { useState, useEffect, useMemo } from "react"
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom"
import { useTheme, THEMES } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"
import { useLang } from "../../context/LanguageContext"
import { useTranslation } from "react-i18next"
import { supabase } from "../../services/SupaBaseClient"
import BanerSlot from "../ui/BanerSlot"
import ParticleBackground from "../shared/ParticleBackground"
import GuidedTour from "../shared/GuidedTour"
import HelpTip from "../shared/HelpTip"
import { useSessionReminders } from "../../hooks/useSessionReminders"
import { KORISNIK_TOUR } from "../../constants/tours/korisnikTour"
import { MUALIM_TOUR } from "../../constants/tours/mualimTour"
import { hasSeenTour, markTourSeen } from "../../lib/tourStorage"
import { areHelpTipsEnabled, onHelpTipsChanged } from "../../lib/helpTipsPref"
import { usePWAInstall } from "../../hooks/usePWAInstall"

// Izvlači "gdje šta vodi" tekst iz koraka vodiča (po data-tour selektoru), da se
// ne duplira isti opis na dva mjesta (tour i HelpTip pored linka koriste isti tekst).
function tourTextMap(steps) {
  const map = {}
  ;(steps || []).forEach((st) => {
    if (!st.selector) return
    const m = st.selector.match(/data-tour="([^"]+)"/)
    if (m) map[m[1]] = st.description
  })
  return map
}

const Icons = {
  Home: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>),
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
  ChevronDown: () => (<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>),
  Crown: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 18 2-11 5 4 3-6 3 6 5-4 2 11z" /><path d="M4 22h16" /></svg>),
  Menu: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="18" x2="20" y2="18" /></svg>),
  X: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>),
  Download: () => (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>),
}

// Redoslijed sekcija u sidebaru: prvo napredne role, na kraju obična korisnička sekcija
const GROUP_ORDER = ["admin", "moderator", "blogger", "mualim", "korisnik"]

export default function SidebarLayout() {
  const { theme, setTheme, particlesEnabled } = useTheme()
  const { user } = useAuth()
  const { t } = useTranslation()
  const { lang } = useLang()
  const navigate = useNavigate()
  const location = useLocation()

  // Stanje sidebara se pamti (localStorage) - mijenja se samo ručnim klikom, ne pri promjeni stranice
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem("tmizan-sidebar-open") !== "false" } catch { return true }
  })
  useEffect(() => {
    try { localStorage.setItem("tmizan-sidebar-open", sidebarOpen ? "true" : "false") } catch { /* ignore */ }
  }, [sidebarOpen])
  // Hover-expand: kad je sidebar ručno suženo, prelaz mišem preko njega ga privremeno
  // proširi; kad miš ode, vraća se na suženo. Ne mijenja i ne pamti "sidebarOpen" (pinovano).
  const [hovering, setHovering] = useState(false)
  const effectiveOpen = sidebarOpen || hovering
  const [mobileOpen, setMobileOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)

  // ── VIŠE ULOGA PO KORISNIKU ──
  // Primarna uloga iz profila + dodatne iz app_user_roles (admin ih dodjeljuje).
  // Sidebar spaja linkove SVIH uloga; admin automatski vidi sve.
  const [dbRoles, setDbRoles] = useState([])
  useEffect(() => {
    if (!user?.id) return
    let alive = true
    ;(async () => {
      try {
        const [{ data: prof }, { data: ur }] = await Promise.all([
          supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
          supabase.from("app_user_roles").select("role").eq("user_id", user.id),
        ])
        if (!alive) return
        const set = new Set([...(ur || []).map((r) => r.role)])
        if (prof?.role) set.add(prof.role)
        setDbRoles([...set])
      } catch { /* fallback na metadata */ }
    })()
    return () => { alive = false }
  }, [user?.id])

  const role = dbRoles[0] || user?.user_metadata?.role || "korisnik"
  // Memoizirano da allRoles ne bude nov niz svaki render (koristi se kao
  // dependency efekta ispod, koji bi se inače beskorisno ponavljao).
  const allRoles = useMemo(() => (dbRoles.length ? dbRoles : [role]), [dbRoles, role])

  // podsjetnici 60/30 min prije zakazanih časova (dok je aplikacija otvorena)
  useSessionReminders(user?.id)

  // ── VODIČ KROZ APLIKACIJU ──
  // Ovdje (ne po pojedinačnoj stranici) jer sidebar - a time i tour koji ga
  // koristi za mete - postoji na SVAKOJ stranici. Tako se tour prvi put
  // pokrene čim korisnik uđe bilo gdje u /korisnik/* ili /mualim/*, ne samo
  // ako slučajno prvo posjeti baš Dashboard.
  const [tourRole, setTourRole] = useState(null) // null | "korisnik" | "mualim"
  // Provjerava treba li prvi put pokrenuti vodič - reagira na promjenu rute
  // (react-router `location`), pa se ne može bez rizika prebaciti na
  // "prilagodi tokom rendera" pattern (zavisi i od `tourRole` kao guard-a).
  useEffect(() => {
    if (!user?.id || window.innerWidth < 768 || tourRole) return
    if (location.pathname.startsWith("/korisnik") && !hasSeenTour(user.id, "korisnik")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTourRole("korisnik")
    } else if (location.pathname.startsWith("/mualim") && allRoles.includes("mualim") && !hasSeenTour(user.id, "mualim")) {
      setTourRole("mualim")
    }
  }, [location.pathname, user?.id, allRoles, tourRole])
  const finishTour = () => {
    if (tourRole) markTourSeen(user.id, tourRole)
    setTourRole(null)
  }
  const TOUR_BY_ROLE = { korisnik: KORISNIK_TOUR, mualim: MUALIM_TOUR }
  const activeTourSteps = tourRole ? (TOUR_BY_ROLE[tourRole][lang] || TOUR_BY_ROLE[tourRole].bs) : []
  // Ručno pokretanje iz Postavki šalje navigate(path, { state: { manualTour: true } })
  // - tad se vodič smije preskočiti. Organsko prvo pojavljivanje (bez tog state-a)
  // mora se proći do kraja.
  const dismissibleTour = !!location.state?.manualTour

  // ── HELPTIP TEKSTOVI (isti opisi kao u vodiču, prikazani i trajno pored linka) ──
  const helpTextMap = {
    ...tourTextMap(KORISNIK_TOUR[lang] || KORISNIK_TOUR.bs),
    ...tourTextMap(MUALIM_TOUR[lang] || MUALIM_TOUR.bs),
  }
  const [helpTipsOn, setHelpTipsOn] = useState(() => areHelpTipsEnabled())
  useEffect(() => onHelpTipsChanged(() => setHelpTipsOn(areHelpTipsEnabled())), [])

  // ── INSTALIRAJ APLIKACIJU (PWA) - trajno dugme, ne banner koji nestaje
  // nakon jednog zatvaranja. Vidljivo kad god browser ponudi instalaciju
  // (Android/desktop Chrome/Edge) ili na iOS-u gdje browser to nikad sam ne
  // nudi (tamo ide preko Safari Share → "Dodaj na Home ekran"). ──
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const [iosHintOpen, setIosHintOpen] = useState(false)
  const showInstallItem = !isInstalled && (isInstallable || isIOS)

  // ── GRUPE PO ULOGAMA ──
  // Svaka uloga ima svoju sekciju (naslov + dropdown) umjesto jedne nabacane liste.
  // Moderatorska uloga vodi na moderatorski panel, u kojem su sve njegove funkcije.
  const navGroups = {
    admin: {
      label: t("sidebar.groups.admin", "Admin"),
      icon: Icons.Crown,
      links: [
        { label: t("sidebar.nav.dashboard"), path: "/admin/dashboard", icon: Icons.LayoutDashboard },
        { label: t("sidebar.nav.moderators"), path: "/admin/moderatori", icon: Icons.ShieldAlert },
        { label: t("sidebar.nav.content"), path: "/admin/sadrzaj", icon: Icons.Settings },
        { label: t("sidebar.nav.ads"), path: "/admin/oglasi", icon: Icons.FileText },
      ],
    },
    moderator: {
      label: t("sidebar.groups.moderator", "Moderator"),
      icon: Icons.ShieldAlert,
      // Sve što je ranije bilo 4 zasebne stavke (Spajanje, Zahtjevi, Mualimi,
      // Tiketi) sad je jedna stranica sa tabovima (ModeratorDashboard.jsx) -
      // pa i sidebar ima samo JEDAN link umjesto 4 koje vode na isto.
      links: [
        { label: t("sidebar.nav.moderator_panel", "Moderator panel"), path: "/moderator/dashboard", icon: Icons.LayoutDashboard },
      ],
    },
    blogger: {
      label: t("sidebar.groups.blogger", "Blogger"),
      icon: Icons.Newspaper,
      links: [
        { label: t("sidebar.nav.dashboard"), path: "/blogger/dashboard", icon: Icons.LayoutDashboard },
        { label: t("sidebar.nav.posts"), path: "/blogger/objave", icon: Icons.FileText },
      ],
    },
    mualim: {
      label: t("sidebar.groups.mualim", "Mualim"),
      icon: Icons.Users,
      links: [
        { label: t("sidebar.nav.dashboard"), path: "/mualim/dashboard", icon: Icons.LayoutDashboard, tourId: "tour-mualim-dashboard" },
        { label: t("sidebar.nav.reviews"), path: "/mualim/preslušavanja", icon: Icons.Headphones, tourId: "tour-mualim-reviews" },
      ],
    },
    korisnik: {
      label: t("sidebar.groups.korisnik", "Korisnik"),
      icon: Icons.BookOpen,
      links: [
        { label: t("sidebar.nav.daily_hub"), path: "/korisnik/dashboard", icon: Icons.Sun, tourId: "tour-daily-hub" },
        { label: t("sidebar.nav.mualim_hub"), path: "/korisnik/mualim", icon: Icons.MessageSquare, tourId: "tour-mualim-hub" },
        { label: t("sidebar.nav.foundations"), path: "/korisnik/temelji", icon: Icons.BookOpen, tourId: "tour-foundations" },
        { label: t("sidebar.nav.hifz_planner_page", "Hifz Planner"), path: "/korisnik/hifz/planner", icon: Icons.HifzPlanner, tourId: "tour-hifz-planner-page" },
        { label: t("sidebar.nav.hifz_planner"), path: "/korisnik/hifz/planer", icon: Icons.ClipboardList, tourId: "tour-hifz-tracker" },
        { label: t("sidebar.nav.ucenje", "Učenje"), path: "/korisnik/hifz/ucenje", icon: Icons.BookOpen, tourId: "tour-ucenje" },
        { label: t("sidebar.nav.ponavljanje", "Ponavljanje"), path: "/korisnik/hifz/ponavljanje", icon: Icons.Sun, tourId: "tour-ponavljanje" },
        { label: t("sidebar.nav.mualims"), path: "/korisnik/mualimi", icon: Icons.Users, tourId: "tour-mualimi" },
        { label: t("sidebar.nav.support"), path: "/korisnik/podrska", icon: Icons.MessageSquare, tourId: "tour-support" },
        { label: "Blog", path: "/blog", icon: Icons.Newspaper, tourId: "tour-blog" },
      ],
    },
  }

  // admin automatski vidi sve sekcije; mualim UVIJEK vidi i "Korisnik" sekciju
  // (mualim je i sam često hifz učenik i ponavlja preko iste platforme), ostali
  // samo svoje dodijeljene uloge
  const rolesForNav = allRoles.includes("admin")
    ? GROUP_ORDER
    : allRoles.includes("mualim") && !allRoles.includes("korisnik")
      ? [...allRoles, "korisnik"]
      : allRoles
  const visibleGroups = GROUP_ORDER
    .filter((key) => rolesForNav.includes(key))
    .map((key) => ({ key, ...navGroups[key] }))
  const groups = visibleGroups.length ? visibleGroups : [{ key: "korisnik", ...navGroups.korisnik }]

  // flat lista (bez grupa) - koristi se samo kad je sidebar suzen na desktopu (ikone bez naslova)
  const seen = new Set()
  const flatLinks = groups
    .flatMap((g) => g.links)
    .filter((l) => (seen.has(l.path) ? false : (seen.add(l.path), true)))

  // ── SVIRANJE/SKUPLJANJE SEKCIJA ──
  // Grupa koja odgovara trenutnoj ruti je uvijek otvorena; ostatak stanja se pamti.
  const activeGroupKey = groups.find((g) => g.links.some((l) => location.pathname.startsWith(l.path)))?.key
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tmizan-sidebar-collapsed") || "{}") } catch { return {} }
  })
  useEffect(() => {
    try { localStorage.setItem("tmizan-sidebar-collapsed", JSON.stringify(collapsedGroups)) } catch { /* ignore */ }
  }, [collapsedGroups])
  const toggleGroup = (key) => setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  // Ako korisnik nije ručno diralo grupu, aktivna (trenutna ruta) je otvorena po defaultu.
  // Ali ako je ručno kliknuo da je zatvori, to se poštuje čak i za aktivnu grupu.
  const isGroupOpen = (key) => (key in collapsedGroups ? !collapsedGroups[key] : key === activeGroupKey)

  // detekcija desktop širine - na mobitelu se sekcije uvijek prikazuju puno (s naslovima),
  // na desktopu se pri suženom sidebaru prikazuje samo ravna lista ikona
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 768 : true))
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  const showGrouped = mobileOpen || !isDesktop || effectiveOpen

  // Zatvori mobilni meni pri svakoj promjeni rute - prilagođava se tokom
  // rendera (ne u useEffect) uz poređenje s prethodnom lokacijom.
  const [prevLocation, setPrevLocation] = useState(location)
  if (location !== prevLocation) {
    setPrevLocation(location)
    setMobileOpen(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const isLightTheme = theme?.id === "beige_white" || theme?.id === "pink_soft"
  const borderClass = isLightTheme ? "border-black/10" : "border-white/5"
  const hoverClass = isLightTheme
    ? "hover:text-slate-900 hover:bg-black/5"
    : "hover:text-white hover:bg-white/5"

  // pojedinačan link - koristi se i u ravnoj listi (sužen sidebar) i unutar grupa
  const renderNavLink = (link, { indented = false } = {}) => {
    const IconComponent = link.icon
    return (
      <NavLink
        key={link.path}
        to={link.path}
        data-tour={link.tourId}
        className={({ isActive }) =>
          `flex items-center gap-3.5 py-2.5 rounded-xl transition-all duration-150 group relative
          ${indented && effectiveOpen ? "pl-9 pr-3" : "px-3"}
          ${isActive ? `${theme?.button} font-semibold` : `${theme?.muted} ${hoverClass}`}`
        }
      >
        <span className="flex-shrink-0"><IconComponent /></span>
        <span className={`text-[13px] font-medium truncate ${effectiveOpen ? "block" : "block md:hidden"}`}>
          {link.label}
        </span>
        {effectiveOpen && helpTipsOn && link.tourId && helpTextMap[link.tourId] && (
          // onClickCapture (capture faza, prije bubble-a) sprječava da klik na "?"
          // navigira na link - HelpTip sam radi samo stopPropagation, što ovdje
          // nije dovoljno jer je NavLink <a> element sa svojim href-om.
          <span onClickCapture={(e) => e.preventDefault()}>
            <HelpTip text={helpTextMap[link.tourId]} />
          </span>
        )}
        {!effectiveOpen && (
          <div className={`hidden md:block absolute left-16 scale-0 group-hover:scale-100 transition-all duration-150 text-white text-xs font-semibold rounded-lg px-3 py-1.5 shadow-xl pointer-events-none whitespace-nowrap z-30 ${isLightTheme ? "bg-gray-800" : "bg-gray-950 border border-white/10"}`}>
            {link.label}
          </div>
        )}
      </NavLink>
    )
  }

  return (
    <div className={`min-h-screen ${theme?.bgGradient || "bg-gray-900"} font-sans antialiased relative`}>
      <GuidedTour steps={activeTourSteps} active={!!tourRole} onFinish={finishTour} theme={theme} lang={lang} dismissible={dismissibleTour} />

      {/* ── MOBILNI HEADER ── */}
      <header className={`md:hidden flex items-center justify-between h-16 px-4 border-b ${borderClass} ${theme?.card} backdrop-blur-md sticky top-0 z-30`}>
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5" title={t("sidebar.nav.home", "Početna")}>
          <div className={`w-7 h-7 rounded-lg ${theme?.logo} flex items-center justify-center text-white font-extrabold text-sm`}>T</div>
          <span className={`font-black text-lg tracking-tight ${theme?.text}`}>Tmizan</span>
        </button>
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
        onMouseEnter={() => isDesktop && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`
          fixed top-0 bottom-0 left-0 z-50
          ${effectiveOpen ? "w-64" : "md:w-16 w-64"}
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

        {/* LOGO - raspored i dugme za "zakači otvoreno" prate ISKLJUČIVO pinovano
            sidebarOpen, ne i hover (effectiveOpen). Da dugme ne mijenja poziciju
            samim prelaskom miša preko sidebara - inače "bježi" dok ga korisnik
            pokušava kliknuti. Pozicija se mijenja samo na stvaran klik. */}
        <div className={`hidden md:flex ${sidebarOpen ? "flex-row justify-between items-center" : "flex-col items-center gap-3"} p-5 border-b ${borderClass}`}>
          {sidebarOpen ? (
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5" title={t("sidebar.nav.home", "Početna")}>
              <div className={`w-7 h-7 rounded-lg ${theme?.logo} flex items-center justify-center text-white font-extrabold text-sm shadow-md`}>T</div>
              <span className={`font-bold text-lg tracking-tight ${theme?.text}`}>Tmizan</span>
            </button>
          ) : (
            <button onClick={() => navigate("/")} title={t("sidebar.nav.home", "Početna")} className={`w-7 h-7 rounded-lg ${theme?.logo} flex items-center justify-center text-white font-extrabold text-sm shadow-md`}>T</button>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`${theme?.muted} p-1.5 rounded-lg hover:bg-black/5 transition-all relative group`}
          >
            <div className={`transition-transform duration-300 ${!sidebarOpen ? "rotate-180" : ""}`}>
              <Icons.ChevronLeft />
            </div>
            {/* Objašnjenje šta dugme radi - vidi se samo dok je miš na dugmetu */}
            <div className={`hidden md:block absolute ${sidebarOpen ? "right-0" : "left-1/2 -translate-x-1/2"} top-full mt-2 scale-0 group-hover:scale-100 transition-all duration-150 origin-top text-white text-xs font-semibold rounded-lg px-3 py-1.5 shadow-xl pointer-events-none whitespace-nowrap z-30 ${isLightTheme ? "bg-gray-800" : "bg-gray-950 border border-white/10"}`}>
              {sidebarOpen ? t("sidebar.collapseHint", "Suzi sidebar") : t("sidebar.keepOpenHint", "Ostavi otvoreno")}
            </div>
          </button>
        </div>

        {/* NAV LINKS */}
        <nav className="flex-1 py-6 space-y-1.5 px-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Početna - povratak na javnu landing stranicu */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
              ${isActive ? `${theme?.button} font-semibold` : `${theme?.muted} ${hoverClass}`}`
            }
          >
            <span className="flex-shrink-0"><Icons.Home /></span>
            <span className={`text-[13px] font-medium truncate ${effectiveOpen ? "block" : "block md:hidden"}`}>
              {t("sidebar.nav.home", "Početna")}
            </span>
            {!effectiveOpen && (
              <div className={`hidden md:block absolute left-16 scale-0 group-hover:scale-100 transition-all duration-150 text-white text-xs font-semibold rounded-lg px-3 py-1.5 shadow-xl pointer-events-none whitespace-nowrap z-30 ${isLightTheme ? "bg-gray-800" : "bg-gray-950 border border-white/10"}`}>
                {t("sidebar.nav.home", "Početna")}
              </div>
            )}
          </NavLink>

          {showGrouped ? (
            // ── GRUPISANO PO ULOZI: naslov sekcije (klik = otvori/zatvori) + njeni linkovi ──
            groups.map((group) => {
              const GroupIcon = group.icon
              const open = isGroupOpen(group.key)
              return (
                <div key={group.key} className="pt-2 first:pt-0">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 ${theme?.muted} ${hoverClass}`}
                  >
                    <span className="flex-shrink-0 opacity-80"><GroupIcon /></span>
                    <span className="text-[11px] font-bold uppercase tracking-wider truncate">{group.label}</span>
                    <span className={`ml-auto flex-shrink-0 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}>
                      <Icons.ChevronDown />
                    </span>
                  </button>
                  {open && (
                    <div className="mt-1 space-y-1">
                      {group.links.map((link) => renderNavLink(link, { indented: true }))}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            // ── SUŽEN SIDEBAR NA DESKTOPU: ravna lista ikona (bez naslova sekcija) ──
            flatLinks.map((link) => renderNavLink(link))
          )}
        </nav>

        {/* BOTTOM */}
        <div className={`p-3 border-t ${borderClass} bg-black/5 space-y-1`} style={{ borderRadius: "0 0 16px 0" }}>
          {/* Instaliraj aplikaciju - trajno vidljivo dugme (ne banner koji
              nestaje nakon jednog zatvaranja). Na iOS-u klik otvara kratko
              uputstvo umjesto pokretanja instalacije, jer Safari to ne dozvoljava programski. */}
          {showInstallItem && (
            <div className="relative">
              <button
                onClick={() => (isIOS && !isInstallable ? setIosHintOpen((v) => !v) : promptInstall())}
                className={`w-full flex items-center gap-3.5 px-3 py-2 rounded-xl ${theme?.muted} ${hoverClass} transition-all`}
              >
                <Icons.Download />
                <span className={`text-[13px] font-medium truncate ${effectiveOpen ? "block" : "block md:hidden"}`}>
                  {lang === "en" ? "Install app" : "Instaliraj aplikaciju"}
                </span>
              </button>
              {iosHintOpen && (
                <div className={`absolute bottom-12 left-0 w-64 rounded-2xl p-3 z-50 ${theme?.card} border ${borderClass} shadow-2xl backdrop-blur-md text-xs leading-relaxed ${theme?.muted}`}>
                  {lang === "en"
                    ? "Safari → tap the Share icon → \"Add to Home Screen\"."
                    : "Safari → tapni na ikonu Podijeli (Share) → \"Dodaj na Home ekran\"."}
                </div>
              )}
            </div>
          )}

          {/* Razgovori koje pokrene admin/moderator direktno s korisnikom (0036)
              - namjerno OVDJE (ispod linije, iznad "Moj profil"), ne unutar
              "Podrška" stranice, da se lakše nađe. */}
          <NavLink to="/korisnik/poruke-podrske" className={`flex items-center gap-3.5 px-3 py-2 rounded-xl ${theme?.muted} ${hoverClass} transition-all`}>
            <Icons.MessageSquare />
            <span className={`text-[13px] font-medium ${effectiveOpen ? "block" : "block md:hidden"}`}>{t("staffMessages.title")}</span>
          </NavLink>
          <NavLink to="/profil" className={`flex items-center gap-3.5 px-3 py-2 rounded-xl ${theme?.muted} ${hoverClass} transition-all`}>
            <Icons.User />
            <span className={`text-[13px] font-medium ${effectiveOpen ? "block" : "block md:hidden"}`}>{t("sidebar.profile")}</span>
          </NavLink>
          <NavLink to="/postavke" className={`flex items-center gap-3.5 px-3 py-2 rounded-xl ${theme?.muted} ${hoverClass} transition-all`}>
            <Icons.Settings />
            <span className={`text-[13px] font-medium ${effectiveOpen ? "block" : "block md:hidden"}`}>{t("sidebar.settings")}</span>
          </NavLink>

          {/* THEME PICKER */}
          <div className="relative">
            <button
              onClick={() => setThemePickerOpen(!themePickerOpen)}
              className={`w-full flex items-center gap-3.5 px-3 py-2 rounded-xl ${theme?.muted} ${hoverClass} transition-all`}
            >
              <Icons.Palette />
              {(effectiveOpen || mobileOpen) && (
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
            <span className={`text-[13px] font-medium ${effectiveOpen ? "block" : "block md:hidden"}`}>{t("sidebar.logout")}</span>
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

        {/* Rezervisan prostor za sidebar (širina prati otvoreno/zatvoreno stanje) - od md naviše,
            da sadržaj bude pomjeren, a ne ispod fiksnog sidebara */}
        <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${sidebarOpen ? "w-64" : "w-16"}`} />

        {/* LIJEVI BANER - probali smo "sticky" ali to zavisi od toga da je
            scroll kontekst prozora nedirnut do posljednjeg pixela (bilo koji
            overflow bilo gdje u stablu predaka ga tiho pokvari), pa je na
            nekim stranicama i dalje ostajao "zaglavljen" na vrhu. FIXED je
            pouzdaniji - isti pristup kao <aside> sidebar iznad (uvijek fixed,
            uz spacer div koji rezerviše prostor) i kao SideAds.jsx na Home
            stranici, koja je oduvijek radila ispravno jer koristi fixed. */}
        <div className="hidden xl:block flex-shrink-0" style={{ width: "160px" }} />
        <div
          className="hidden xl:flex fixed top-0 bottom-0 z-20 flex-col items-center pt-8 px-2 gap-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{
            left: sidebarOpen ? "256px" : "64px",
            width: "160px",
            backgroundColor: isLightTheme ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.20)",
            borderRight: `1px solid ${isLightTheme ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"}`,
          }}
        >
          <BanerSlot pozicija="lijevo" borderClass={borderClass} theme={theme} />
        </div>

        {/* GLAVNI SADRŽAJ - čestice ograničene SAMO na ovaj unutrašnji dio
            (relative + fixed=false - ParticleBackground je "absolute inset-0"
            unutar ovog "relative" diva, pa se već sam po sebi ne širi izvan
            njega, bez potrebe za overflow-x-hidden ovdje).
            VAŽNO: NEMA overflow-x/y NIGDJE u ovom layoutu (ni ovdje ni na
            main-u) - namjerno, iz DVA razloga: (1) na mobitelu (dinamička
            adresna traka) unutrašnji scroll kontejner bi bio pogrešne visine
            i dio vrha stranice bi postao nedostižan skrolanjem, jer se
            min-h-screen/100vh računa preko stvarno vidljivog viewporta; (2)
            CSS quirk - kad je overflow-x nešto drugo osim visible a
            overflow-y nije eksplicitno postavljen, browser overflow-y "tiho"
            pretvori u auto, pa bi ovaj div postao SVOJ zaseban scroll
            kontejner odvojen od prozora - upravo to je razlog zašto baneri
            (sticky, izvan ovog diva) ranije nisu pratili skrol na dugim
            stranicama (npr. Hifz Tracker). Neka skrola isključivo prirodna
            stranica (window) - svi elementi (baneri i sadržaj) dijele isti
            scroll kontekst pa sticky ispravno radi. */}
        {/* NAPOMENA: NEMA eksplicitnog z-index-a ovdje (samo "relative") - namjerno.
            "z-0" bi ovaj div učinio novim stacking kontekstom, što bi ZAROBILO
            SVE fixed/z-50 elemente unutar njega (AyahBrowser bočni panel,
            VerseDetailView modali, GuidedTour na pojedinačnim stranicama) ispod
            desnog/lijevog oglasnog banera (z-20, koji je SIBLING ovog diva, van
            njega) - upravo je to uzrokovalo da reklama "prekrije" panel "Vidi
            detalje" na Hifz Trackeru. Bez z-indexa ovdje, ti unutrašnji z-50
            elementi normalno probijaju do vanjskog stacking konteksta i
            ispravno se prikazuju IZNAD bannera. */}
        {/* min-w-0 je KLJUČAN ovdje: bez njega je ovaj flex-1 item shrink-resistant
            (default min-width:auto na flex djeci), pa čim BILO KOJA stranica ima
            nešto što se ne stisne (širok red tabova, kod s tracking-widest, tabela)
            cijeli layout se gura šire od ekrana umjesto da se sadržaj prilagodi. */}
        <div className="relative flex-1 flex justify-center min-h-screen min-w-0">
          {particlesEnabled && <ParticleBackground colors={theme?.particleColors} fixed={false} />}
          <main className={`w-full min-w-0 p-4 md:p-8 ${theme?.text}`}>
            <Outlet />
          </main>
        </div>

        {/* DESNI BANER - fixed iz istog razloga kao lijevi (vidi komentar gore).
            Nema šta rezervisati na desnoj strani (ništa iza njega), pa je
            samo docked na right-0. */}
        <div className="hidden xl:block flex-shrink-0" style={{ width: "160px" }} />
        <div
          className="hidden xl:flex fixed top-0 bottom-0 right-0 z-20 flex-col items-center pt-8 px-2 gap-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
