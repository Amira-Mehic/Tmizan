import { useTheme, THEMES } from "../../context/ThemeContext"
import LanguageSwitcher from "../../components/LanguageSwitcher"
import { useTranslation } from "react-i18next"
import { useArabicSize } from "../../context/ArabicSizeContext"
import { useState, useEffect } from "react"
import { supabase } from "../../services/SupaBaseClient"
import { useAuth } from "../../context/AuthContext"

// ─── Lista zemalja (ISO 3166-1 alpha-2) ─────────────────────────────────────
const COUNTRIES = [
  { code: "BA", name: "Bosna i Hercegovina" },
  { code: "DE", name: "Njemačka" },
  { code: "AT", name: "Austrija" },
  { code: "CH", name: "Švicarska" },
  { code: "SE", name: "Švedska" },
  { code: "NO", name: "Norveška" },
  { code: "DK", name: "Danska" },
  { code: "NL", name: "Holandija" },
  { code: "BE", name: "Belgija" },
  { code: "FR", name: "Francuska" },
  { code: "GB", name: "Velika Britanija" },
  { code: "US", name: "SAD" },
  { code: "CA", name: "Kanada" },
  { code: "AU", name: "Australija" },
  { code: "TR", name: "Turska" },
  { code: "SA", name: "Saudijska Arabija" },
  { code: "AE", name: "Ujedinjeni Arapski Emirati" },
  { code: "OTHER", name: "Ostalo" },
]

// ─── IP geolocation ──────────────────────────────────────────────────────────
async function fetchIpLocation() {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) })
    const d   = await res.json()
    return { country: d.country_code || null, city: d.city || null }
  } catch { return null }
}

// ─── Browser geolocation (reverzni geocoding) ────────────────────────────────
async function fetchGeoCountry() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        const data = await res.json()
        resolve(data?.address?.country_code?.toUpperCase() || null)
      } catch { resolve(null) }
    }, () => resolve(null), { timeout: 6000 })
  })
}

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const { arabicSize, setArabicSize } = useArabicSize()
  const { user } = useAuth()

  const isLightTheme = theme?.id === "beige_white" || theme?.id === "pink_soft"
  const borderClass  = isLightTheme ? "border-black/10" : "border-white/10"

  // ─── Lokacija state ─────────────────────────────────────────────────────────
  const [country,      setCountry]      = useState("")
  const [city,         setCity]         = useState("")
  const [locSaving,    setLocSaving]    = useState(false)
  const [locSaved,     setLocSaved]     = useState(false)
  const [verifyStatus, setVerifyStatus] = useState(null) // null | "verifying" | "match" | "mismatch" | "no_profile"
  const [ipInfo,       setIpInfo]       = useState(null)

  // Učitaj postojeće podatke iz profila
  useEffect(() => {
    if (!user) return
    supabase.from("profiles").select("country, city").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setCountry(data.country || "")
          setCity(data.city    || "")
        }
      })
  }, [user])

  const handleSaveLocation = async () => {
    if (!user || !country) return
    setLocSaving(true)
    await supabase.from("profiles").upsert({ id: user.id, country, city }, { onConflict: "id" })
    setLocSaving(false)
    setLocSaved(true)
    setVerifyStatus(null)
    setTimeout(() => setLocSaved(false), 2500)
  }

  const handleVerify = async () => {
    if (!country) { setVerifyStatus("no_profile"); return }
    setVerifyStatus("verifying")
    const [ipLoc, geoCountry] = await Promise.all([fetchIpLocation(), fetchGeoCountry()])
    setIpInfo(ipLoc)
    const ipMatch  = ipLoc?.country === country
    const geoMatch = geoCountry === country
    setVerifyStatus(ipMatch || geoMatch ? "match" : "mismatch")
  }

  return (
    <div key={i18n.language} className="max-w-xl mx-auto space-y-6">

      {/* NASLOV */}
      <div>
        <h1 className={`text-xl font-bold ${theme?.text}`}>
          {t('settings_page.title')}
        </h1>
        <p className={`text-sm mt-1 ${theme?.muted}`}>
          {t('settings_page.subtitle')}
        </p>
      </div>

      {/* TEMA */}
      <div className={`p-5 rounded-2xl border ${borderClass} ${theme?.card}`}>
        <h2 className={`text-sm font-semibold mb-1 ${theme?.text}`}>
          {t('settings_page.theme_title')}
        </h2>
        <p className={`text-xs mb-4 ${theme?.muted}`}>
          {t('settings_page.theme_subtitle')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(THEMES).map((tTheme) => (
            <button
              key={tTheme.id}
              onClick={() => setTheme(tTheme)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border
                ${theme?.id === tTheme.id
                  ? `${theme?.button} border-transparent`
                  : `${theme?.muted} border-transparent hover:bg-black/10`
                }`}
            >
              <div className={`w-4 h-4 rounded-full ${tTheme.logo}`} />
              {t(`themes.${tTheme.name}`)}
            </button>
          ))}
        </div>
      </div>

      {/* VELIČINA ARAPSKOG TEKSTA */}
      <div className={`p-5 rounded-2xl border ${borderClass} ${theme?.card}`}>
        <h2 className={`text-sm font-semibold mb-1 ${theme?.text}`}>
          {t('settings_page.arabic_size_title')}
        </h2>
        <p className={`text-xs mb-4 ${theme?.muted}`}>
          {t('settings_page.arabic_size_subtitle')}
        </p>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setArabicSize(v => Math.max(16, v - 2))}
            className={`w-8 h-8 rounded-lg border text-sm font-bold flex items-center justify-center transition-all ${borderClass} ${theme?.muted} hover:opacity-70`}
          >−</button>

          <input
            type="range" min="16" max="48" step="2"
            value={arabicSize}
            onChange={e => setArabicSize(Number(e.target.value))}
            className="flex-1 accent-[#1D9E75] h-1.5 rounded-full cursor-pointer"
          />

          <button
            onClick={() => setArabicSize(v => Math.min(48, v + 2))}
            className={`w-8 h-8 rounded-lg border text-sm font-bold flex items-center justify-center transition-all ${borderClass} ${theme?.muted} hover:opacity-70`}
          >+</button>

          <span className={`text-sm font-bold min-w-[3rem] text-right ${theme?.text}`}>
            {arabicSize}px
          </span>
        </div>

        <button
          onClick={() => setArabicSize(28)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${borderClass} ${theme?.muted} hover:opacity-70`}
        >
          {t('settings_page.arabic_size_reset')}
        </button>

        {/* Preview */}
        <div className={`mt-4 p-4 rounded-xl border ${borderClass} ${isLightTheme ? "bg-black/5" : "bg-black/20"}`}>
          <p className={`text-[10px] uppercase tracking-wider mb-2 ${theme?.muted}`}>{t('settings_page.preview')}</p>
          <p
            className="text-right leading-[2.2]"
            style={{
              fontFamily: "'Amiri', 'Scheherazade New', serif",
              fontSize: `${arabicSize}px`,
              direction: "rtl",
              color: "#F5C842",
            }}
          >
            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            <span style={{ marginRight: "0.5rem", opacity: 0.6, fontSize: `${Math.max(16, arabicSize - 4)}px` }}>
              {' '}﴿١﴾
            </span>
          </p>
        </div>
      </div>

      {/* JEZIK */}
      <div className={`p-5 rounded-2xl border ${borderClass} ${theme?.card}`}>
        <h2 className={`text-sm font-semibold mb-1 ${theme?.text}`}>
          {t('settings_page.lang_title')}
        </h2>
        <p className={`text-xs mb-4 ${theme?.muted}`}>
          {t('settings_page.lang_subtitle')}
        </p>
        <LanguageSwitcher />
      </div>

      {/* LOKACIJA */}
      <div className={`p-5 rounded-2xl border ${borderClass} ${theme?.card}`}>
        <h2 className={`text-sm font-semibold mb-1 ${theme?.text}`}>
          Lokacija
        </h2>
        <p className={`text-xs mb-4 ${theme?.muted}`}>
          Koristi se za prikaz relevantnih oglasa za tvoju regiju. Neće biti javno prikazano.
        </p>

        {/* Zemlja */}
        <div className="flex flex-col gap-3">
          <div>
            <label className={`text-xs font-semibold block mb-1.5 ${theme?.muted}`}>Zemlja</label>
            <select
              value={country}
              onChange={e => { setCountry(e.target.value); setVerifyStatus(null) }}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none
                ${borderClass} ${theme?.card} ${theme?.text}
                focus:border-[#1D9E75]/50`}
            >
              <option value="">— Odaberi zemlju —</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Grad */}
          <div>
            <label className={`text-xs font-semibold block mb-1.5 ${theme?.muted}`}>Grad (opcionalno)</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="npr. Sarajevo"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none
                ${borderClass} ${theme?.card} ${theme?.text} placeholder:opacity-30
                focus:border-[#1D9E75]/50`}
            />
          </div>

          {/* Gumbi */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSaveLocation}
              disabled={!country || locSaving}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all
                ${!country || locSaving ? "opacity-40 cursor-not-allowed" : "hover:opacity-80"}
                bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/25`}
            >
              {locSaving ? "Čuvanje…" : locSaved ? "✓ Sačuvano" : "Sačuvaj"}
            </button>
            <button
              onClick={handleVerify}
              disabled={verifyStatus === "verifying"}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80
                ${isLightTheme ? "bg-black/6 text-black/50 border border-black/10" : "bg-white/6 text-white/50 border border-white/10"}`}
            >
              {verifyStatus === "verifying" ? "Provjera…" : "Verificiraj IP-om"}
            </button>
          </div>

          {/* Verify status */}
          {verifyStatus === "match" && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/20">
              <span className="text-[#1D9E75] text-sm">✓</span>
              <div>
                <p className="text-xs font-bold text-[#1D9E75]">Lokacija potvrđena</p>
                <p className={`text-[11px] mt-0.5 ${theme?.muted}`}>IP adresa pokazuje: {ipInfo?.country}{ipInfo?.city ? `, ${ipInfo.city}` : ""}</p>
              </div>
            </div>
          )}
          {verifyStatus === "mismatch" && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#EF9F27]/10 border border-[#EF9F27]/20">
              <span className="text-[#EF9F27] text-sm">⚠</span>
              <div>
                <p className="text-xs font-bold text-[#EF9F27]">Nije podudaranje</p>
                <p className={`text-[11px] mt-0.5 ${theme?.muted}`}>
                  IP adresa pokazuje: {ipInfo?.country}{ipInfo?.city ? `, ${ipInfo.city}` : ""}. Možeš svejedno sačuvati ako si npr. na VPN-u.
                </p>
              </div>
            </div>
          )}
          {verifyStatus === "no_profile" && (
            <p className="text-xs text-[#F58C8C]">Prvo odaberi zemlju i sačuvaj.</p>
          )}
        </div>
      </div>

    </div>
  )
}

