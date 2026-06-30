import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../services/SupaBaseClient"

const AuthContext = createContext()

// 🛠️ DEV BYPASS — postavi na true kad Supabase ne radi
const DEV_MODE = true
const DEV_USER = {
  id: "dev-user-001",
  email: "amira@tmizan.dev",
  user_metadata: { full_name: "Amira Dev", role: "korisnik" }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEV_MODE ? DEV_USER : null)
  const [loading, setLoading] = useState(!DEV_MODE)

  useEffect(() => {
    if (DEV_MODE) return

    // 🔥 učitaj session na startu
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // 🔥 slušaj promjene login/logout
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
export const useAuth = () => useContext(AuthContext)