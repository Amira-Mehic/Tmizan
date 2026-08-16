// ============================================================================
// Postavljanje višejezičnosti. Prijevodi stoje u bs.json i en.json, a jezik se
// čita iz localStorage pri pokretanju da odabir preživi zatvaranje aplikacije.
// Ako traženi ključ ne postoji u odabranom jeziku, prikazuje se bosanska
// vrijednost umjesto praznog polja.
// ============================================================================

import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "./en.json"
import bs from "./bs.json"

const savedLang = localStorage.getItem("lang") || "bs"

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bs: { translation: bs }
    },
    lng: savedLang,
    fallbackLng: "bs",
    interpolation: {
      escapeValue: false
    }
  })

export default i18n