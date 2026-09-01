// ============================================================================
// Postavke naloga: lični podaci, lokacija, jezik sučelja, tema prikaza i
// veličina arapskog teksta. Odavde se mijenja i nivo znanja koji podešava
// zadane vrijednosti metoda ponavljanja, te se šalje zahtjev za mualim ulogu.
// ============================================================================

import { useTheme, THEMES } from "../../context/ThemeContext"
import LanguageSwitcher from "../../components/LanguageSwitcher"
import { useTranslation } from "react-i18next"
import { useArabicSize } from "../../context/ArabicSizeContext"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../services/SupaBaseClient"
import { useAuth } from "../../context/AuthContext"
import { PROFILES, recommendation } from "../../features/murajaah/nivo"
import { resetTourSeen } from "../../lib/tourStorage"
import { areHelpTipsEnabled, setHelpTipsEnabled } from "../../lib/helpTipsPref"
import LokacijaPicker from "../../components/shared/LokacijaPicker"
import { regijaZaGrad, isteVrijednosti, imaSpisakGradova } from "../../constants/lokacija"

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
  const { theme, setTheme, particlesEnabled, setParticlesEnabled } = useTheme()
  const { t, i18n } = useTranslation()
  const { arabicSize, setArabicSize } = useArabicSize()
  const { user } = useAuth()
  const navigate = useNavigate()

  const isLightTheme = theme?.id === "beige_white" || theme?.id === "pink_soft"
  const borderClass  = isLightTheme ? "border-black/10" : "border-white/10"

  // ─── Uloge (za "pokreni vodič ponovo" - samo za uloge koje korisnik ima) ───
  const [myRoles, setMyRoles] = useState([])
  useEffect(() => {
    if (!user) return
    let alive = true
    ;(async () => {
      const [{ data: prof }, { data: ur }] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase.from("app_user_roles").select("role").eq("user_id", user.id),
      ])
      if (!alive) return
      const set = new Set([...(ur || []).map(r => r.role)])
      if (prof?.role) set.add(prof.role)
      setMyRoles([...set])
    })()
    return () => { alive = false }
  }, [user])

  const restartTour = (role, path) => {
    resetTourSeen(user.id, role)
    navigate(path, { state: { manualTour: true } })
  }

  // ─── Upitnici (?) pored sidebar stavki - može se sakriti ───────────────────
  const [helpTipsOn, setHelpTipsOn] = useState(() => areHelpTipsEnabled())
  const toggleHelpTips = () => {
    const next = !helpTipsOn
    setHelpTipsOn(next)
    setHelpTipsEnabled(next)
  }

  // ─── Lokacija state ─────────────────────────────────────────────────────────
  // Regija se ne unosi ručno, nego se izvodi iz odabranog grada (vidi
  // constants/lokacija.js). Ranije je ta kolona ostajala prazna, pa ciljanje
  // oglasa po regiji nikad nije moglo pogoditi.
  const [country,      setCountry]      = useState("")
  const [city,         setCity]         = useState("")
  const [locSaving,    setLocSaving]    = useState(false)
  const [locSaved,     setLocSaved]     = useState(false)
  const [verifyStatus, setVerifyStatus] = useState(null) // null | "verifying" | "match" | "mismatch" | "no_profile"
  const [ipInfo,       setIpInfo]       = useState(null)
  const [ipPrijedlog,  setIpPrijedlog]  = useState(null)

  const region = regijaZaGrad(country, city)

  // Učitaj postojeće podatke iz profila
  useEffect(() => {
    if (!user) return
    let alive = true
    supabase.from("profiles").select("country, city").eq("id", user.id).single()
      .then(({ data }) => {
        if (!alive || !data) return
        setCountry(data.country || "")
        setCity(data.city    || "")
        // Ako profil još nema lokaciju, ponudi onu iz IP adrese kao prijedlog.
        // Ne upisuje se sama - IP na mobilnoj mreži zna pokazati pogrešan grad.
        if (!data.country) {
          fetchIpLocation().then((ip) => {
            if (alive && ip?.country) setIpPrijedlog(ip)
          })
        }
      })
    return () => { alive = false }
  }, [user])

  const handleSaveLocation = async () => {
    if (!user || !country) return
    setLocSaving(true)
    await supabase.from("profiles").upsert(
      { id: user.id, country, city: city || null, region: region || null },
      { onConflict: "id" }
    )
    setLocSaving(false)
    setLocSaved(true)
    setVerifyStatus(null)
    setTimeout(() => setLocSaved(false), 2500)
  }

  const prihvatiPrijedlog = () => {
    if (!ipPrijedlog) return
    const grad = imaSpisakGradova(ipPrijedlog.country) && !regijaZaGrad(ipPrijedlog.country, ipPrijedlog.city)
      ? ""            // grad iz IP-a nije na spisku, neka ga korisnik odabere
      : ipPrijedlog.city || ""
    setCountry(ipPrijedlog.country)
    setCity(grad)
    setIpPrijedlog(null)
  }

  const handleVerify = async () => {
    if (!country) { setVerifyStatus("no_profile"); return }
    setVerifyStatus("verifying")
    const [ipLoc, geoCountry] = await Promise.all([fetchIpLocation(), fetchGeoCountry()])
    setIpInfo(ipLoc)
    const ipMatch  = isteVrijednosti(ipLoc?.country, country)
    const geoMatch = isteVrijednosti(geoCountry, country)
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

      {/* HAFIZOV NIVO */}
      <NivoSetting theme={theme} borderClass={borderClass} t={t} />

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
              <div className={`w-4 h-4 rounded-full ${tTheme.swatch}`} />
              {t(`themes.${tTheme.name}`)}
            </button>
          ))}
        </div>
      </div>

      {/* POZADINSKE ČESTICE */}
      <div className={`p-5 rounded-2xl border ${borderClass} ${theme?.card}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className={`text-sm font-semibold mb-1 ${theme?.text}`}>
              {t('settings_page.particles_title', 'Animirane čestice u pozadini')}
            </h2>
            <p className={`text-xs ${theme?.muted}`}>
              {t('settings_page.particles_subtitle', 'Uključi ili isključi lebdeće čestice na pozadini stranica (na Početnoj ostaju uvijek uključene).')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={particlesEnabled}
            onClick={() => setParticlesEnabled(v => !v)}
            className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
              particlesEnabled ? (theme?.button?.split(" ")[0] || "bg-[#1D9E75]") : (isLightTheme ? "bg-black/15" : "bg-white/15")
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                particlesEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
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

        <div className="flex flex-col gap-3">
          {/* Prijedlog iz IP adrese - samo popuni polja, ne sprema sam */}
          {ipPrijedlog && (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/20">
              <p className={`text-[11px] ${theme?.muted}`}>
                Izgleda da si u: {ipPrijedlog.city ? `${ipPrijedlog.city}, ` : ""}{ipPrijedlog.country}
              </p>
              <button
                onClick={prihvatiPrijedlog}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/25 hover:opacity-80"
              >
                Popuni
              </button>
            </div>
          )}

          <LokacijaPicker
            country={country}
            city={city}
            onChange={({ country: c, city: g }) => {
              setCountry(c); setCity(g); setVerifyStatus(null)
            }}
            countryLabel="Zemlja"
            cityLabel="Grad (opcionalno)"
            labelClass={`text-xs font-semibold block mb-1.5 ${theme?.muted}`}
            inputClass={`w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none
              ${borderClass} ${theme?.card} ${theme?.text} focus:border-[#1D9E75]/50`}
          />

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
                <p className="text-xs font-bold text-[#1D9E75]">{t('settings_page.loc_match', 'Lokacija potvrđena')}</p>
                <p className={`text-[11px] mt-0.5 ${theme?.muted}`}>{t('settings_page.loc_ip_shows', 'IP adresa pokazuje:')} {ipInfo?.country}{ipInfo?.city ? `, ${ipInfo.city}` : ""}</p>
              </div>
            </div>
          )}
          {verifyStatus === "mismatch" && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#EF9F27]/10 border border-[#EF9F27]/20">
              <span className="text-[#EF9F27] text-sm">⚠</span>
              <div>
                <p className="text-xs font-bold text-[#EF9F27]">{t('settings_page.loc_mismatch', 'Nije podudaranje')}</p>
                <p className={`text-[11px] mt-0.5 ${theme?.muted}`}>
                  {t('settings_page.loc_ip_shows', 'IP adresa pokazuje:')} {ipInfo?.country}{ipInfo?.city ? `, ${ipInfo.city}` : ""}. {t('settings_page.loc_vpn_note', 'Možeš svejedno sačuvati ako si npr. na VPN-u.')}
                </p>
              </div>
            </div>
          )}
          {verifyStatus === "no_profile" && (
            <p className="text-xs text-[#F58C8C]">{t('settings_page.loc_no_profile', 'Prvo odaberi zemlju i sačuvaj.')}</p>
          )}
        </div>
      </div>

      {/* VODIČ KROZ APLIKACIJU - ponovo pokreni tour koji se automatski
          prikazao prvi put kad je korisnik ušao (samo za uloge koje ima) */}
      <div className={`p-5 rounded-2xl border ${borderClass} ${theme?.card}`}>
        <h2 className={`text-sm font-semibold mb-1 ${theme?.text}`}>
          Vodič kroz aplikaciju
        </h2>
        <p className={`text-xs mb-4 ${theme?.muted}`}>
          Ponovo pokreni objašnjenje osnovnih funkcionalnosti, korak po korak.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => restartTour("korisnik", "/korisnik/dashboard")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 ${theme?.cardSub} ${theme?.muted}`}
          >
            🎓 Pokreni vodič za korisnika
          </button>
          {myRoles.includes("mualim") && (
            <button
              onClick={() => restartTour("mualim", "/mualim/dashboard")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 ${theme?.cardSub} ${theme?.muted}`}
            >
              🧑‍🏫 Pokreni vodič za mualima
            </button>
          )}
        </div>

        <div className={`flex items-center justify-between gap-4 mt-4 pt-4 border-t ${borderClass}`}>
          <div>
            <h3 className={`text-xs font-semibold mb-0.5 ${theme?.text}`}>
              Upitnici (?) pored stavki u sidebaru
            </h3>
            <p className={`text-[11px] ${theme?.muted}`}>
              Mali crveni upitnici koji objašnjavaju gdje koja stavka vodi.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={helpTipsOn}
            onClick={toggleHelpTips}
            className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
              helpTipsOn ? (theme?.button?.split(" ")[0] || "bg-[#1D9E75]") : (isLightTheme ? "bg-black/15" : "bg-white/15")
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                helpTipsOn ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

    </div>
  )
}

// ── Hafizov nivo - mijenja se u postavkama, utiče na preporuke metoda ───────
function NivoSetting({ theme, borderClass, t }) {
  const [nivo, setNivo] = useState(() => {
    try { return localStorage.getItem("tmizan_nivo") || "pocetnik"; } catch { return "pocetnik"; }
  });
  const promijeni = (id) => {
    setNivo(id);
    try { localStorage.setItem("tmizan_nivo", id); localStorage.setItem("tmizan_metoda", recommendation(id).metoda); } catch { /* */ }
  };
  const P = PROFILES[nivo];
  return (
    <div className={`p-5 rounded-2xl border ${borderClass} ${theme?.card}`}>
      <h2 className={`text-sm font-semibold mb-1 ${theme?.text}`}>{t('settings_page.nivo_title', 'Hafizov nivo')}</h2>
      <p className={`text-xs mb-3 ${theme?.muted}`}>{t('settings_page.nivo_subtitle', 'Prilagođava preporuke i zadane vrijednosti svih metoda.')}</p>
      <div className="flex gap-2 flex-wrap">
        {Object.values(PROFILES).map((p) => (
          <button key={p.id} onClick={() => promijeni(p.id)}
            className={`rounded-xl px-4 py-2 text-sm transition ${nivo === p.id ? `${theme?.button}` : `${theme?.cardSub} ${theme?.muted}`}`}>
            {t(`settings_page.nivo_${p.id}`, p.naziv)}
          </button>
        ))}
      </div>
      {P && <p className={`text-xs mt-3 ${theme?.muted}`}>💡 {t(`settings_page.savjet_${nivo}`, P.savjet)}</p>}
    </div>
  );
}

