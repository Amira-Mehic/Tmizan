import React, { useState } from "react"
import { useTheme } from "../../context/ThemeContext"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

// UI komponente
import Container from "../../components/ui/Container";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import BackgroundDecor from "../../components/BackgroundTexture";
import { supabase } from "../../services/SupaBaseClient";

import {
  User,
  Mail,
  Lock,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft
} from "lucide-react"

export default function RegisterPage() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

  // Koristimo direktno theme.accent koji je definisan u ThemeContext.jsx
  const accentColor = theme.accent;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError(null)
  }

const handleRegister = async (e) => {
  e.preventDefault()

  setLoading(true)
  setError(null)

  try {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email.trim(),
      password: formData.password,
      options: {
        data: {
          full_name: `${formData.firstName} ${formData.lastName}`
        }
      }
    })

    if (error) {
      setError(error.message)
      return
    }

    // 🔥 KLJUČNO: Supabase NE garantuje session ovdje
    // zato NE provjeravamo data.session

    // 👉 umjesto toga samo čekamo auth state listener
    setSuccess(true)

    // optional UX:
    // navigate("/") -> NE OVDE

  } catch (err) {
    console.log("REGISTER ERROR:", err)
    setError(err.message || "Greška pri registraciji")
  } finally {
    setLoading(false)
  }
}
/*
const handleRegister = async (e) => {
  e.preventDefault()

  if (loading) return

  setLoading(true)
  setError(null)

  // password check
  const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/

  if (!strongPassword.test(formData.password)) {
    setError("Lozinka mora imati veliko, malo slovo, broj i specijalni znak")
    setLoading(false)
    return
  }

  if (formData.password !== formData.confirmPassword) {
    setError(t("auth.errors.password_mismatch"))
    setLoading(false)
    return
  }

  try {
    const { error } = await supabase.auth.signUp({
      email: formData.email.trim(),
      password: formData.password,
      options: {
        data: {
          full_name: `${formData.firstName} ${formData.lastName}`
        }
      }
    })

    if (error) {
      if (error.status === 429) {
        throw new Error("Previše pokušaja, sačekaj 1 minutu")
      }
      throw error
    }

    setSuccess(true)

  } catch (err) {
    console.log("REG ERROR:", err)
    setError(err.message)
  } finally {
    setLoading(false)
  }
}

*/
  return (
    <div className={`min-h-screen ${theme.bgGradient} bg-grain relative flex items-center justify-center transition-all duration-500 py-12 px-4 overflow-hidden`}>
      
      {/* 1. Pozadinski efekti - Zakomentarisano dok ne napraviš fajl ili popraviš putanju */}
      {/* <div className="absolute inset-0 z-0">
          <BackgroundDecor />
      </div> */}

      <Container className="relative z-10">
        <div className="max-w-2xl mx-auto w-full">
          
          <Card className={`p-8 sm:p-10 shadow-2xl border-opacity-20 relative overflow-hidden`}>
            
            <div className="text-center mb-10 relative z-10">
              <div className={`flex justify-center mb-4 ${accentColor}`}>
                <UserPlus size={48} strokeWidth={1.5} />
              </div>

              <h1 className={`text-4xl font-black tracking-tight ${theme.text}`}>
                {t("auth.register_title")}
              </h1>

              <p className={`${theme.muted} mt-2 font-medium`}>
                {t("auth.register_subtitle")}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-2">
                <AlertCircle size={18} />
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}

            {success ? (
              <div className="text-center space-y-6 py-8 relative z-10">
                <CheckCircle2 size={80} className="text-green-500 mx-auto" />
                <h2 className={`text-2xl font-bold ${theme.text}`}>
                  {t("auth.success_title")}
                </h2>
                <p className={theme.muted}>
                  {t("auth.success_message")}
                </p>
                <Button onClick={() => navigate("/login")} className="w-full h-12">
                  {t("auth.login")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5 relative z-10">
                
                <div className="relative">
                  <User className="absolute left-3 top-3.5 text-gray-400 z-20" size={18} />
                  <Input
                    name="username"
                    placeholder={t("auth.placeholders.username")}
                    onChange={handleChange}
                    className="pl-10 bg-opacity-50"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 text-gray-400 z-20" size={18} />
                    <Input
                      name="firstName"
                      placeholder={t("auth.placeholders.first_name")}
                      onChange={handleChange}
                      className="pl-10 bg-opacity-50"
                      required
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 text-gray-400 z-20" size={18} />
                    <Input
                      name="lastName"
                      placeholder={t("auth.placeholders.last_name")}
                      onChange={handleChange}
                      className="pl-10 bg-opacity-50"
                      required
                    />
                  </div>
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-gray-400 z-20" size={18} />
                  <Input
                    name="email"
                    type="email"
                    placeholder={t("auth.placeholders.email")}
                    onChange={handleChange}
                    className="pl-10 bg-opacity-50"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-gray-400 z-20" size={18} />
                    <Input
                      name="password"
                      type="password"
                      placeholder={t("auth.placeholders.password")}
                      onChange={handleChange}
                      className="pl-10 bg-opacity-50"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-gray-400 z-20" size={18} />
                    <Input
                      name="confirmPassword"
                      type="password"
                      placeholder={t("auth.placeholders.confirm_password")}
                      onChange={handleChange}
                      className="pl-10 bg-opacity-50"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className={`w-full mt-6 h-12 shadow-lg ${theme.button} text-white font-bold transition-all transform hover:scale-[1.02]`}>
                  {loading ? (
                    <Loader2 className="animate-spin mx-auto" />
                  ) : (
                    t("auth.register")
                  )}
                </Button>
              </form>
            )}

            {!success && (
              <p className={`text-center mt-8 ${theme.muted} text-sm relative z-10`}>
                {t("auth.already_have_account")}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className={`${accentColor} font-bold hover:underline transition-all`}
                >
                  {t("auth.login")}
                </button>
              </p>
            )}
          </Card>

          <div className="text-center mt-8 relative z-10">
            <button
              onClick={() => navigate("/")}
              className={`${theme.muted} flex items-center gap-2 mx-auto hover:opacity-80 transition-opacity text-sm font-bold`}
            >
              <ArrowLeft size={16} />
              {t("ui_elements.buttons.back_home")}
            </button>
          </div>

        </div>
      </Container>
    </div>
  )
}