// ============================================================================
// Ranija verzija ekrana postavki, zamijenjena onom u pages/shared/Settings.jsx.
// Nije uvezana ni na jednu rutu.
// ============================================================================

import { useTheme, THEMES } from "../../context/ThemeContext"
import LanguageSwitcher from "../../components/LanguageSwitcher"
import { useTranslation } from "react-i18next"
import { useArabicSize } from "../../context/ArabicSizeContext" // dodaj ovaj context u projekat

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const { arabicSize, setArabicSize } = useArabicSize()   // globalni font size za arapski tekst

  const isLightTheme = theme?.id === "beige_white" || theme?.id === "pink_soft"
  const borderClass  = isLightTheme ? "border-black/10" : "border-white/10"

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
          Veličina arapskog teksta
        </h2>
        <p className={`text-xs mb-4 ${theme?.muted}`}>
          Podesi veličinu harfova u prikazima ajeta — primjenjuje se na sve stranice i ajete
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
          Vrati na zadano (28px)
        </button>

        {/* Preview */}
        <div className={`mt-4 p-4 rounded-xl border ${borderClass} ${isLightTheme ? "bg-black/5" : "bg-black/20"}`}>
          <p className={`text-[10px] uppercase tracking-wider mb-2 ${theme?.muted}`}>Preview:</p>
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

    </div>
  )
}

/*
  NAPOMENA ZA IMPLEMENTACIJU:
  Kreiraj context/ArabicSizeContext.jsx:

  import { createContext, useContext, useState } from "react"
  const ArabicSizeCtx = createContext({ arabicSize: 28, setArabicSize: () => {} })
  export const ArabicSizeProvider = ({ children }) => {
    const [arabicSize, setArabicSize] = useState(28)
    return <ArabicSizeCtx.Provider value={{ arabicSize, setArabicSize }}>{children}</ArabicSizeCtx.Provider>
  }
  export const useArabicSize = () => useContext(ArabicSizeCtx)

  Omotaj <ArabicSizeProvider> u App.jsx/root wrapper.
  U HifzPlanner.jsx koristi useArabicSize() umjesto lokalnog state-a.
*/
