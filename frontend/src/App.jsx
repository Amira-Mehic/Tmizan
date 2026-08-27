// ============================================================================
// Rutiranje cijele aplikacije. Rute su podijeljene u tri sloja: javne stranice
// dostupne bez prijave, korisničke koje traže prijavu (ProtectedRoute), i one
// vezane za ulogu (RequireRole). Prijavljeni korisnik dobija sidebar raspored,
// dok javne stranice imaju vlastito zaglavlje.
//
// Nakon prijave korisnik se preusmjerava na dashboard prema ulozi, redoslijedom
// admin, moderator, blogger, mualim, korisnik - ako neko ima više uloga, vodi
// ga se na onu s najširim ovlastima.
// ============================================================================

import React, { useEffect } from "react"
import { BrowserRouter, Routes, Route, Outlet, useNavigate } from "react-router-dom"

import { AuthProvider, useAuth } from "./context/AuthContext"
import { supabase } from "./services/SupaBaseClient"

import ProtectedRoute from "./components/ProtectedRoute"
import RequireRole from "./components/RequireRole"
import SidebarLayout from "./components/layout/SidebarLayout"
import BackgroundTexture from "./components/BackgroundTexture"
import PWAInstallBanner from "./components/PWAInstallBanner"

// PUBLIC
import Home from "./pages/public/Home"
import Login from "./pages/public/Login"
import Register from "./pages/public/Register"
import ResetPassword from "./pages/public/ResetPassword"
import Blog from "./pages/public/Blog"
import BlogPost from "./pages/public/BlogPost"
import NotFound from "./pages/public/NotFound"

// SHARED
import Settings from "./pages/shared/Settings"
import Profil from "./pages/shared/Profil"

// KORISNIK
import KorisnikDashboard from "./pages/korisnik/KorisnikDashboard"
import KorisnikOnboarding from "./pages/korisnik/KorisnikOnboarding"
import KorisnikFoundations from "./pages/korisnik/KorisnikFoundations"
import KorisnikMualimLink from "./pages/korisnik/KorisnikMualimLink"
import KorisnikMualimHub from "./pages/korisnik/KorisnikMualimHub"
import KorisnikSupport from "./pages/korisnik/KorisnikSupport"
import KorisnikStaffMessages from "./pages/korisnik/KorisnikStaffMessages"
import HifzPlanner from "./pages/korisnik/hifz/HifzTracker"
import HifzPlannerPage from "./pages/korisnik/hifz/HifzPlannerPage"
import PlanPrintPage from "./pages/korisnik/hifz/PlanPrintPage"
import PlanRasporedPage from "./pages/korisnik/hifz/PlanRasporedPage"
import MurajaaPage from "./pages/korisnik/hifz/MurajaaPage"
import UcenjeSession from "./pages/korisnik/hifz/UcenjeSession"

// MUALIM
import MualimDashboard from "./pages/mualim/MualimDashboard"
import MualimKorisnikList from "./pages/mualim/MualimKorisnikList"
import MualimKorisnikDetail from "./pages/mualim/MualimKorisnikDetail"
import MualimReviewInbox from "./pages/mualim/MualimReviewInbox"

// BLOGGER
import BloggerDashboard from "./pages/blogger/BloggerDashboard"
import BloggerPostsList from "./pages/blogger/BloggerPostsList"
import BloggerPostEditor from "./pages/blogger/BloggerPostEditor"

// MODERATOR
import ModeratorDashboard from "./pages/moderator/ModeratorDashboard"

// ADMIN
import AdminDashboard from "./pages/admin/AdminDashboard"
import AdminAdsManager from "./pages/admin/AdminAdsManager"

// Blog je javan, ali prijavljeni korisnik ga vidi UNUTAR sidebara -
// tako se dashboard/navigacija ne gube kad se ode na blog.
function BlogLayout() {
  const { user } = useAuth()
  return user ? <SidebarLayout /> : <Outlet />
}

// Redoslijed prioriteta uloga za preusmjeravanje nakon prijave - ista logika
// kao raspored sekcija u SidebarLayout.jsx (GROUP_ORDER).
const ROLE_DASHBOARD_ORDER = ["admin", "moderator", "blogger", "mualim", "korisnik"]
const ROLE_DASHBOARD_PATH = {
  admin: "/admin/dashboard",
  moderator: "/moderator/dashboard",
  blogger: "/blogger/dashboard",
  mualim: "/mualim/dashboard",
  korisnik: "/korisnik/dashboard",
}

async function resolveDashboardPath(userId) {
  try {
    const [{ data: prof }, { data: ur }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
      supabase.from("app_user_roles").select("role").eq("user_id", userId),
    ])
    const set = new Set([...(ur || []).map((r) => r.role)])
    if (prof?.role) set.add(prof.role)
    const primary = ROLE_DASHBOARD_ORDER.find((r) => set.has(r))
    return ROLE_DASHBOARD_PATH[primary] || "/korisnik/dashboard"
  } catch {
    return "/korisnik/dashboard"
  }
}

function AppContent() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session && window.location.pathname === "/login") {
          resolveDashboardPath(session.user.id).then((path) => navigate(path))
        }
        if (event === "SIGNED_OUT") {
          navigate("/login")
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="relative min-h-screen transition-colors duration-1000 overflow-x-hidden">
      <BackgroundTexture />
      <div className="relative z-10">
        <Routes>

          {/* ── PUBLIC RUTE ── */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-lozinke" element={<ResetPassword />} />
          <Route element={<BlogLayout />}>
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
          </Route>
          <Route path="*" element={<NotFound />} />

          {/* ── ZAŠTIĆENE RUTE SA SIDEBAROM ── */}
          <Route element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }>
            {/* SHARED */}
            <Route path="/postavke" element={<Settings />} />
            <Route path="/profil" element={<Profil />} />

            {/* KORISNIK */}
            <Route path="/korisnik/dashboard" element={<KorisnikDashboard />} />
            <Route path="/korisnik/onboarding" element={<KorisnikOnboarding />} />
            <Route path="/korisnik/temelji" element={<KorisnikFoundations />} />
            <Route path="/korisnik/mualimi" element={<KorisnikMualimLink />} />
            <Route path="/korisnik/mualim" element={<KorisnikMualimHub />} />
            <Route path="/korisnik/podrska" element={<KorisnikSupport />} />
            <Route path="/korisnik/poruke-podrske" element={<KorisnikStaffMessages />} />
            <Route path="/korisnik/hifz/planer" element={<HifzPlanner />} />
            <Route path="/korisnik/hifz/planner" element={<HifzPlannerPage />} />
            <Route path="/korisnik/hifz/plan-print" element={<PlanPrintPage />} />
            <Route path="/korisnik/hifz/raspored" element={<PlanRasporedPage />} />
            <Route path="/korisnik/hifz/ponavljanje" element={<MurajaaPage />} />
            <Route path="/korisnik/hifz/ucenje" element={<UcenjeSession />} />

            {/* MUALIM - role="mualim" jer neodobreni korisnik (čeka odobrenje
                admina/moderatora preko role_requests) ne smije vidjeti ni
                praznu školjku panela, samo se vraća na korisnički dashboard */}
            <Route path="/mualim/dashboard" element={<RequireRole role="mualim"><MualimDashboard /></RequireRole>} />
            <Route path="/mualim/korisnici" element={<RequireRole role="mualim"><MualimKorisnikList /></RequireRole>} />
            <Route path="/mualim/korisnici/:id" element={<RequireRole role="mualim"><MualimKorisnikDetail /></RequireRole>} />
            <Route path="/mualim/preslušavanja" element={<RequireRole role="mualim"><MualimReviewInbox /></RequireRole>} />

            {/* BLOGGER */}
            <Route path="/blogger/dashboard" element={<BloggerDashboard />} />
            <Route path="/blogger/objave" element={<BloggerPostsList />} />
            <Route path="/blogger/objave/nova" element={<BloggerPostEditor />} />
            <Route path="/blogger/objave/edit/:id" element={<BloggerPostEditor />} />

            {/* ADMIN */}
            <Route path="/moderator/dashboard" element={<ModeratorDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/oglasi" element={<AdminAdsManager />} />
          </Route>
        </Routes>
      </div>
      <PWAInstallBanner />
    </div>
  )
}

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App