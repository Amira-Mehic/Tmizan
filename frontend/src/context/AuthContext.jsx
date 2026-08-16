// ============================================================================
// Globalno stanje prijavljenog korisnika. Sesija se učita jednom pri pokretanju
// aplikacije, a nakon toga se prati kroz Supabase događaje, pa se prijava i
// odjava odražavaju na cijelu aplikaciju bez osvježavanja stranice. Zaštićene
// rute (ProtectedRoute, RequireRole) čitaju stanje odavde.
// ============================================================================

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../services/SupaBaseClient"

const AuthContext = createContext()

// Zaobilaženje prijave za razvoj - kad je uključeno, aplikacija radi s lažnim
// korisnikom bez poziva prema Supabaseu. U isporučenoj verziji stoji na false.
const DEV_MODE = false
const DEV_USER = {
  id: "11111111-1111-1111-1111-111111111111", // mora biti pravi UUID zbog FK na profiles/auth.users
  email: "amira@tmizan.dev",
  user_metadata: { full_name: "Amira Dev", role: "korisnik" }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEV_MODE ? DEV_USER : null)
  const [loading, setLoading] = useState(!DEV_MODE)

  useEffect(() => {
    if (DEV_MODE) return

    // Postojeća sesija se učitava jednom, pri pokretanju aplikacije.
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Nakon toga se prate promjene stanja prijave, pa odjava u jednoj kartici
    // preglednika odmah djeluje i na ostale otvorene.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // DEV: mock logout
  const devLogout = () => DEV_MODE && setUser(null)

  return (
    <AuthContext.Provider value={{ user, loading, devLogout }}>
      {children}
    </AuthContext.Provider>
  )
}

// custom hook (lakše korištenje)
// eslint-disable-next-line react-refresh/only-export-components -- hook uz Provider je standardan Context pattern
export const useAuth = () => useContext(AuthContext)