// ============================================================================
// Prebacivanje jezika između bosanskog i engleskog. Odabir se upisuje u
// localStorage pod istim ključem koji čita i LanguageContext, pa se oba sistema
// prijevoda drže istog jezika.
// ============================================================================

import { useTranslation } from "react-i18next"

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const changeLang = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem("lang", lng)
  }

  const currentLang = i18n.language

  return (
    <div className="flex gap-2">
      <button
        onClick={() => changeLang("bs")}
        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
          ${currentLang === "bs"
            ? "bg-[#10B981] text-white"
            : "bg-black/10 hover:bg-black/20"
          }`}
      >
        Bosanski
      </button>
      <button
        onClick={() => changeLang("en")}
        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
          ${currentLang === "en"
            ? "bg-[#10B981] text-white"
            : "bg-black/10 hover:bg-black/20"
          }`}
      >
        English
      </button>
    </div>
  )
}