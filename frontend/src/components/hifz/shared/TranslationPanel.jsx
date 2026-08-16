// ============================================================================
// Panel s prijevodom ajeta, koji se otvara na zahtjev ispod arapskog teksta.
// Prijevodi se čitaju iz tabele `translations` u vlastitoj bazi, pa prikaz ne
// zavisi od vanjskog servisa. Dohvat se pokreće tek kad se panel otvori, jer bi
// učitavanje prijevoda za svaki ajet na stranici bilo bespotrebno.
// ============================================================================

import { useState, useEffect } from "react"
import { useLang } from "../../../context/LanguageContext"
import { supabase } from "../../../services/SupaBaseClient"

// Već dohvaćeni prijevodi ostaju u memoriji dok traje sesija, pa se isti ajet
// ne traži iz baze više puta.
const CACHE = {}

// Prijevod ajeta iz lokalne baze (tabela `translations`), bez vanjskog API-ja.
async function fetchTranslations(verseKey) {
  if (CACHE[verseKey]) return CACHE[verseKey]
  try {
    const { data, error } = await supabase
      .from("translations")
      .select("language, text")
      .eq("verse_key", verseKey)
      .in("language", ["bs", "en"])
    if (error) throw error
    const result = {
      bs: data?.find(d => d.language === "bs")?.text || "",
      en: data?.find(d => d.language === "en")?.text || "",
    }
    CACHE[verseKey] = result
    return result
  } catch {
    return null   // null = error stanje
  }
}

/**
 * TranslationPanel
 * ─────────────────
 * Prikazuje prijevod ajeta (BS Korkut / EN Sahih International)
 * u collapsible panelu s toggle strelicom.
 *
 * Props:
 *   verseKey  string   "2:255"
 *   isLight   bool
 *   tMuted    string   Tailwind klasa za mutni tekst
 *   accentBg  string   Tailwind klasa boje pozadine accenta (za tab dugmad)
 */
export function TranslationPanel({ verseKey, isLight, tMuted, accentBg = "bg-[#1D9E75]" }) {
  const { lang: globalLang } = useLang()
  const [open, setOpen]           = useState(false)
  const [activeLang, setActiveLang] = useState(globalLang)
  const [loading, setLoading]     = useState(false)
  const [translation, setTranslation] = useState(null)
  const [error, setError]         = useState(false)

  // Sync active tab when global language changes (ali dozvoli ručni odabir taba
  // nezavisno između promjena globalnog jezika - zato se prilagođava tokom
  // rendera, ne u useEffect, uz poređenje s prethodnom vrijednosti).
  const [prevGlobalLang, setPrevGlobalLang] = useState(globalLang)
  if (globalLang !== prevGlobalLang) {
    setPrevGlobalLang(globalLang)
    setActiveLang(globalLang)
  }

  // Fetch prijevoda je asinhron (network poziv) - setLoading/setTranslation/
  // setError se postavljaju TEK kad panel otvoren i nema keš, i to samo jednom
  // po otvaranju (guard preko translation/loading/error). Namjerno se efekat
  // ponovo pokreće samo kad se otvori panel ili promijeni ajet (`open`,
  // `verseKey`), ne kad se promijene ti guard-ovi.
  useEffect(() => {
    if (!open || translation || loading || error) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetchTranslations(verseKey).then(result => {
      if (result) setTranslation(result)
      else        setError(true)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, verseKey])

  const subtle    = isLight ? "text-black/35" : "text-white/30"
  const panelBg   = isLight ? "bg-black/[0.025]" : "bg-white/[0.025]"
  const tabActive = `${accentBg} text-white`
  const tabIdle   = isLight
    ? "bg-black/8 text-black/40 hover:bg-black/14"
    : "bg-white/8 text-white/40 hover:bg-white/14"

  const toggleLabel = activeLang === "en" ? "Translation" : "Prijevod"
  const loadingLabel = activeLang === "en" ? "Loading translation..." : "Učitavanje prijevoda..."
  const errorLabel = activeLang === "en"
    ? "Could not load translation. Check your internet connection."
    : "Nije moguće učitati prijevod. Provjeri internet konekciju."

  return (
    <div>
      {/* ── Toggle dugme ───────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all hover:opacity-70 ${subtle}`}
      >
        <span
          className="text-base leading-none transition-transform duration-200"
          style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ›
        </span>
        <span>{toggleLabel}</span>
      </button>

      {/* ── Collapsible panel ──────────────────────────────────────────────── */}
      <div style={{
        maxHeight: open ? "400px" : "0px",
        overflow:  "hidden",
        transition: "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className={`mt-2.5 rounded-xl p-3.5 ${panelBg}`}>

          {/* BS / EN tabovi */}
          <div className="flex gap-1.5 mb-3">
            {[
              { id: "bs", label: "Bosanski" },
              { id: "en", label: "English"  },
            ].map(l => (
              <button
                key={l.id}
                onClick={() => setActiveLang(l.id)}
                className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full transition-all ${
                  activeLang === l.id ? tabActive : tabIdle
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Stanje: loading */}
          {loading && (
            <div className="flex items-center gap-2 py-1">
              <div className="w-3 h-3 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
              <span className={`text-[10px] ${tMuted}`}>{loadingLabel}</span>
            </div>
          )}

          {/* Stanje: error */}
          {error && !loading && (
            <p className={`text-[10px] ${tMuted} opacity-70`}>{errorLabel}</p>
          )}

          {/* Stanje: prijevod dostupan */}
          {translation && !loading && (
            <div>
              <p className={`text-xs leading-relaxed ${tMuted}`}>
                {translation[activeLang] || "—"}
              </p>
              <p className={`text-[9px] mt-2 opacity-40 ${subtle}`}>
                {activeLang === "bs" ? "Korkut prijevod" : "Sahih International"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
