// ============================================================================
// Zaštita ruta koje traže određenu ulogu, sloj iznad obične provjere prijave.
// Uloga se čita iz baze pri svakom ulasku na rutu, a ne iz stanja u pregledniku,
// pa se oduzimanje uloge odmah primjenjuje. Konačnu zaštitu podataka ionako
// nose sigurnosna pravila baze - ovo je zaštita na nivou navigacije.
// ============================================================================

import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../services/SupaBaseClient"

// Uloga se traži na dva mjesta, kao i u SidebarLayout-u: u koloni profiles.role
// prijave koju već provjerava ProtectedRoute. Uloga se čita iz profiles.role
// I app_user_roles (isti izvor kao u SidebarLayout.jsx, gdje se spajaju u
// dbRoles) - jer korisnik može imati dodatnu ulogu upisanu preko
// app_user_roles a da mu profiles.role ostane primarni "korisnik".
// Admin uvijek prolazi (vidi rolesForNav u SidebarLayout.jsx - admin vidi sve
// sekcije), ostali moraju stvarno imati traženu ulogu.
//
// Dok se uloga ne provjeri, ne prikazuje ništa (isto ponašanje kao
// ProtectedRoute-ov "loading"). Ako korisnik nema traženu ulogu (npr. čeka
// odobrenje admina/moderatora za mualim), ostaje prijavljen ali se vraća na
// redirectTo - NE odjavljuje se.
export default function RequireRole({ role, redirectTo = "/korisnik/dashboard", children }) {
  const { user } = useAuth()
  const [status, setStatus] = useState("loading") // loading | allowed | denied

  useEffect(() => {
    let alive = true
    if (!user?.id) return

    ;(async () => {
      try {
        const [{ data: prof }, { data: ur }] = await Promise.all([
          supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
          supabase.from("app_user_roles").select("role").eq("user_id", user.id),
        ])
        if (!alive) return
        const roles = new Set((ur || []).map((r) => r.role))
        if (prof?.role) roles.add(prof.role)
        setStatus(roles.has("admin") || roles.has(role) ? "allowed" : "denied")
      } catch {
        // Ako provjera ne uspije (npr. mrežna greška), pristup se ne odobrava
        if (alive) setStatus("denied")
      }
    })()

    return () => { alive = false }
  }, [user?.id, role])

  if (status === "loading") return null
  if (status === "denied") return <Navigate to={redirectTo} replace />
  return children
}
