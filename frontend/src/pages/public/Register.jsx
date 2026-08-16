// ============================================================================
// Registracija novog naloga - e-mail, lozinka, rod i željena uloga. Zahtjev za
// mualim ulogu ne dodjeljuje je odmah nego čeka odobrenje, pa novi korisnik do
// tada ostaje u ulozi korisnika.
// ============================================================================

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
import ParticleBackground from "../../components/shared/ParticleBackground";
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
  const [registerAs, setRegisterAs] = useState("korisnik") // "korisnik" | "mualim"

  // Da li nalog nakon signUp-a čeka potvrdu emaila (Supabase "Confirm email"
  // uključen u dashboardu) ili je odmah aktivan (isključen) - provjerava se
  // iz odgovora signUp-a (data.session postoji SAMO ako potvrda nije potrebna),
  // ne pretpostavlja se unaprijed, jer to zavisi od podešavanja u Supabaseu.
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Popunjava se SAMO ako se registruje kao muallim - zahtjev mora imati
    // iskustvo i motivaciju, ne smije biti prazan/jednoklikni zahtjev.
    mualimIskustvo: "",
    mualimMotivacija: "",
    // Obavezno, postavlja se JEDNOM na registraciju - poslije se ne mijenja
    // direktno (samo preko zahtjeva administraciji za promjenu roda).
    gender: ""
  })

  // Koristimo direktno theme.accent koji je definisan u ThemeContext.jsx
  const accentColor = theme.accent;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError(null)
  }

const handleRegister = async (e) => {
  e.preventDefault()

  // rod je obavezan i postavlja se JEDNOM ovdje - nakon registracije se ne
  // mijenja direktno (vidi gender_change_requests / Profil postavke)
  if (!formData.gender) {
    setError(t("auth.gender_required", "Molimo odaberi rod."))
    return
  }

  // registracija kao muallim MORA imati popunjenu motivaciju - ne dozvoli
  // jednoklikni prazan zahtjev (mora proći kroz "više koraka")
  if (registerAs === "mualim" && !formData.mualimMotivacija.trim()) {
    setError(t("auth.mualim_motivation_required", "Molimo napiši kratku motivaciju za muallim ulogu."))
    return
  }

  setLoading(true)
  setError(null)

  try {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email.trim(),
      password: formData.password,
      options: {
        data: {
          full_name: `${formData.firstName} ${formData.lastName}`,
          // željena uloga: muallim prolazi kroz ODOBRAVANJE administracije
          requested_role: registerAs,
          gender: formData.gender,
        }
      }
    })

    if (error) {
      setError(error.message)
      return
    }

    // registracija kao MUALLIM → zahtjev za odobrenje (profil ostaje korisnik
    // dok admin/moderator ne odobri; korisnik vidi obavijest na dashboardu)
    if (registerAs === "mualim" && data?.user?.id) {
      const poruka = [
        formData.mualimIskustvo.trim() && `Iskustvo: ${formData.mualimIskustvo.trim()}`,
        `Motivacija: ${formData.mualimMotivacija.trim()}`,
      ].filter(Boolean).join("\n")
      try {
        await supabase.from("role_requests").insert({ user_id: data.user.id, role: "mualim", poruka })
      } catch { /* ako sesija još nije aktivna, zahtjev se šalje pri prvoj prijavi */ }
      try { localStorage.setItem("tmizan_zeli_mualim", "1") } catch { /* */ }
    }

    // Supabase ovdje ne garantuje sesiju: ona postoji samo ako potvrda e-maila
    // nije uključena, pa je nalog odmah aktivan. Kad je potvrda uključena,
    // sesija ostaje prazna dok korisnik ne klikne link iz poruke. Po tome se
    // odlučuje koja se poruka prikazuje, umjesto da se pretpostavlja unaprijed.
    setNeedsConfirmation(!data?.session)
    setRegisteredEmail(formData.email.trim())
    setResendSent(false)
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

const handleResendConfirmation = async () => {
  if (resendLoading || !registeredEmail) return
  setResendLoading(true)
  try {
    await supabase.auth.resend({ type: "signup", email: registeredEmail })
    setResendSent(true)
  } catch { /* Supabase namjerno ne otkriva detalje greške ovdje */ }
  finally {
    setResendLoading(false)
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
    <div className={`min-h-screen ${theme.bgGradient} bg-grain relative z-0 flex items-center justify-center transition-all duration-500 py-12 px-4 overflow-hidden`}>
      <ParticleBackground colors={theme.particleColors} />
      
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
                {needsConfirmation ? <Mail size={80} className={`${accentColor} mx-auto`} /> : <CheckCircle2 size={80} className="text-green-500 mx-auto" />}
                <h2 className={`text-2xl font-bold ${theme.text}`}>
                  {needsConfirmation ? t("auth.confirmEmail.title") : t("auth.success_title")}
                </h2>
                <p className={theme.muted}>
                  {needsConfirmation
                    ? t("auth.confirmEmail.message", { email: registeredEmail })
                    : t("auth.success_message")}
                </p>

                {needsConfirmation && (
                  resendSent ? (
                    <p className={`text-sm ${theme.muted}`}>{t("auth.confirmEmail.resendSent")}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      className={`${accentColor} font-bold hover:underline transition-all text-sm flex items-center gap-2 mx-auto`}
                    >
                      {resendLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                      {t("auth.confirmEmail.resendBtn")}
                    </button>
                  )
                )}

                <Button onClick={() => navigate("/login")} className="w-full h-12">
                  {t("auth.login")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5 relative z-10">
                {/* Rod - obavezan, postavlja se JEDNOM (poslije se mijenja samo
                    kroz zahtjev administraciji, ne direktno). */}
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    {[
                      { id: "musko", label: t("auth.gender_male", "Muško") },
                      { id: "zensko", label: t("auth.gender_female", "Žensko") },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setFormData((f) => ({ ...f, gender: g.id }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition border ${
                          formData.gender === g.id
                            ? `${theme.button} border-transparent`
                            : `bg-transparent ${theme.muted} border-current/20`
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                  <p className={`text-xs ${theme.muted}`}>
                    {t("auth.gender_hint", "Ne može se sam(a) mijenjati poslije — samo kroz zahtjev administraciji.")}
                  </p>
                </div>

                {/* Registruj se kao: korisnik ili muallim (muallim čeka odobrenje) */}
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    {[
                      { id: "korisnik", label: t("auth.as_korisnik", "Učim Kur'an") },
                      { id: "mualim", label: t("auth.as_mualim", "Muallim sam") },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRegisterAs(r.id)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition border ${
                          registerAs === r.id
                            ? `${theme.button} border-transparent`
                            : `bg-transparent ${theme.muted} border-current/20`
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {registerAs === "mualim" && (
                    <div className="space-y-2 pt-1">
                      <p className={`text-xs ${theme.muted}`}>
                        {t("auth.mualim_pending_hint", "Vaš muallim profil će biti pregledan i prihvaćen ili odbijen od strane administracije.")}
                      </p>
                      <textarea
                        name="mualimIskustvo"
                        value={formData.mualimIskustvo}
                        onChange={handleChange}
                        placeholder={t("auth.mualim_experience_ph", "Dosadašnje iskustvo u poučavanju/hifzu (opciono)")}
                        rows={2}
                        className={`w-full ${theme.cardSub || ""} rounded-xl px-3 py-2 text-sm outline-none resize-none border border-current/10`}
                      />
                      <textarea
                        name="mualimMotivacija"
                        value={formData.mualimMotivacija}
                        onChange={handleChange}
                        placeholder={t("auth.mualim_motivation_ph", "Zašto želiš biti muallim na Tmizanu? (obavezno)")}
                        rows={3}
                        required={registerAs === "mualim"}
                        className={`w-full ${theme.cardSub || ""} rounded-xl px-3 py-2 text-sm outline-none resize-none border border-current/10`}
                      />
                    </div>
                  )}
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

                <Button type="submit" className={`w-full mt-6 h-12 shadow-lg ${theme.button} !text-white font-bold transition-all transform hover:scale-[1.02]`}>
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