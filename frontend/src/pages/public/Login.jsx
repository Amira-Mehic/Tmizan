// ============================================================================
// Prijava u sistem. Nakon uspješne prijave korisnik se vodi na dashboard prema
// ulozi. Sadrži i pokretanje postupka za zaboravljenu lozinku.
// ============================================================================

import React, { useState } from "react"
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

// UI komponente
import Container from "../../components/ui/Container";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import BackgroundDecor from "../../components/BackgroundTexture";
import ParticleBackground from "../../components/shared/ParticleBackground";
import { supabase } from "../../services/SupaBaseClient";
import {
  Mail,
  Lock,
  LogIn,
  Loader2,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  CheckCircle2
} from "lucide-react"

export default function LoginPage() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })

  // Samoposlužni "Zaboravili ste lozinku?" tok, odvojen od login forme -
  // isti mehanizam koji admin panel koristi (supabase.auth.resetPasswordForEmail),
  // samo ovdje korisnik sam pokreće slanje, bez posrednika.
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState(null)
  const [forgotSent, setForgotSent] = useState(false)

  // Kad Supabase odbije prijavu jer email nije potvrđen ("Confirm email"
  // uključen u dashboardu, a korisnik još nije kliknuo link) - posebna
  // poruka s opcijom ponovnog slanja potvrde, umjesto generičke greške.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  // Koristimo direktno theme.accent iz contexta
  const accentColor = theme.accent;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError(null)
  }

  const openForgotMode = () => {
    setForgotError(null)
    setForgotSent(false)
    setForgotEmail(formData.email || "")
    setForgotMode(true)
  }

  const backToLogin = () => {
    setForgotMode(false)
    setForgotError(null)
    setForgotSent(false)
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    if (forgotLoading) return

    setForgotLoading(true)
    setForgotError(null)

    try {
      // Supabase namjerno ne otkriva postoji li nalog s ovim emailom ili ne
      // (sprječava enumeraciju korisnika), pa uspješan odgovor prikazujemo
      // bez obzira na to je li email zaista registrovan.
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        forgotEmail.trim(),
        { redirectTo: `${window.location.origin}/reset-lozinke` }
      )
      if (err) { setForgotError(err.message || t("auth.forgotPassword.errorGeneric")); return }
      setForgotSent(true)
    } catch (err) {
      setForgotError(err.message || t("auth.forgotPassword.errorGeneric"))
    } finally {
      setForgotLoading(false)
    }
  }
const handleLogin = async (e) => {
  e.preventDefault()

  if (loading) return

  setLoading(true)
  setError(null)
  setUnconfirmedEmail("")

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email.trim(),
      password: formData.password
    })

    if (error) {
      // Supabase vraća ovu specifičnu poruku kad "Confirm email" podešavanje
      // sprječava prijavu neverifikovanog naloga - prepoznajemo je posebno
      // da bismo ponudili ponovno slanje potvrde umjesto gole greške.
      if (error.message === "Email not confirmed") {
        setUnconfirmedEmail(formData.email.trim())
        setError(t("auth.confirmEmail.loginBlocked"))
        return
      }

      let message = error.message

      if (error.message === "Invalid login credentials") {
        message = "Pogrešan email ili lozinka"
      }

      setError(message)
      return
    }

    if (!data?.session) {
      setError("Login nije uspio")
      return
    }

    navigate("/")

  } catch (err) {
    console.log("LOGIN ERROR:", err)
    setError(err.message || "Greška pri prijavi")
  } finally {
    setLoading(false)
  }
}

  const handleResendConfirmation = async () => {
    if (resendLoading || !unconfirmedEmail) return
    setResendLoading(true)
    try {
      await supabase.auth.resend({ type: "signup", email: unconfirmedEmail })
      setResendSent(true)
    } catch {
      /* Supabase namjerno ne otkriva detalje greške ovdje */
    } finally {
      setResendLoading(false)
    }
  }

  return (
    /* KLJUČ: Koristimo ${theme.bgGradient} isto kao na Registeru da bi se pozadina mijenjala */
    <div className={`min-h-screen ${theme.bgGradient} bg-grain relative z-0 flex items-center justify-center transition-all duration-500 py-12 px-4 overflow-hidden`}>
      <ParticleBackground colors={theme.particleColors} />
      
      {/* Pozadinski efekti (krugovi i tekstura) */}
      

      <Container className="relative z-10">
        <div className="max-w-2xl mx-auto w-full">
          
          <Card className={`p-8 sm:p-10 shadow-2xl border-opacity-20 relative overflow-hidden`}>
            
            <div className="text-center mb-10 relative z-10">
              <div className={`flex justify-center mb-4 ${accentColor}`}>
                {forgotMode ? <KeyRound size={48} strokeWidth={1.5} /> : <LogIn size={48} strokeWidth={1.5} />}
              </div>

              <h1 className={`text-4xl font-black tracking-tight ${theme.text}`}>
                {forgotMode ? t("auth.forgotPassword.title") : t("auth.login_title")}
              </h1>

              <p className={`${theme.muted} mt-2 font-medium`}>
                {forgotMode ? t("auth.forgotPassword.subtitle") : t("auth.login_subtitle")}
              </p>
            </div>

            {!forgotMode && error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl relative z-10">
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} />
                  <span className="text-sm font-semibold">{error}</span>
                </div>
                {unconfirmedEmail && (
                  resendSent ? (
                    <p className="text-xs mt-2 opacity-80">{t("auth.confirmEmail.resendSent")}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      className="text-xs font-bold hover:underline mt-2 flex items-center gap-1"
                    >
                      {resendLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                      {t("auth.confirmEmail.resendBtn")}
                    </button>
                  )
                )}
              </div>
            )}

            {forgotMode ? (
              <>
                {forgotError && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span className="text-sm font-semibold">{forgotError}</span>
                  </div>
                )}

                {forgotSent ? (
                  <div className="text-center space-y-4 relative z-10">
                    <div className="flex justify-center text-green-500">
                      <CheckCircle2 size={48} />
                    </div>
                    <p className={theme.muted}>{t("auth.forgotPassword.successMessage")}</p>
                    <Button onClick={backToLogin} className={`w-full h-12 shadow-lg ${theme.button} !text-white font-bold`}>
                      {t("auth.forgotPassword.backToLogin")}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-5 relative z-10">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 text-gray-400 z-20" size={18} />
                      <Input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => { setForgotEmail(e.target.value); if (forgotError) setForgotError(null) }}
                        placeholder={t("auth.placeholders.email")}
                        className="pl-10 bg-opacity-50"
                        required
                      />
                    </div>

                    <Button type="submit" className={`w-full mt-6 h-12 shadow-lg ${theme.button} !text-white font-bold transition-all transform hover:scale-[1.02]`}>
                      {forgotLoading ? (
                        <Loader2 className="animate-spin mx-auto" />
                      ) : (
                        t("auth.forgotPassword.sendBtn")
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={backToLogin}
                      className={`w-full text-center ${accentColor} font-bold hover:underline transition-all text-sm`}
                    >
                      {t("auth.forgotPassword.backToLogin")}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5 relative z-10">

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

              <div className="text-right -mt-2">
                <button
                  type="button"
                  onClick={openForgotMode}
                  className={`${theme.muted} text-sm font-bold hover:underline transition-all`}
                >
                  {t("auth.forgotPassword.link")}
                </button>
              </div>

              <Button type="submit" className={`w-full mt-2 h-12 shadow-lg ${theme.button} !text-white font-bold transition-all transform hover:scale-[1.02]`}>
                {loading ? (
                  <Loader2 className="animate-spin mx-auto" />
                ) : (
                  t("auth.login")
                )}
              </Button>
            </form>
            )}

            {!forgotMode && (
              <p className={`text-center mt-8 ${theme.muted} text-sm relative z-10`}>
                {t("auth.no_account") || "Nemate nalog?"}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className={`${accentColor} font-bold hover:underline transition-all`}
                >
                  {t("auth.register")}
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