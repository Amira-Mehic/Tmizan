// ============================================================================
// Omotač oko ruta koje smije vidjeti samo prijavljeni korisnik. Neprijavljenog
// preusmjerava na stranicu za prijavu, a dok se sesija još učitava ne prikazuje
// ništa - bez toga bi se stranica za prijavu nakratko bljesnula i korisniku
// koji je prijavljen. Provjeru uloge radi RequireRole, ovdje se gleda samo je
// li korisnik uopšte prijavljen.
// ============================================================================

import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Sesija se još provjerava - ni preusmjeravanje ni sadržaj.
  if (loading) return null

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
