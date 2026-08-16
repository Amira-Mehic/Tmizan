// ============================================================================
// Odabrani jezik sučelja (bosanski ili engleski). Postoji uz react-i18next, a
// ne umjesto njega: i18next pokriva prijevode kroz cijelu aplikaciju, dok se
// ovaj kontekst koristi za hifz tekstove koji stoje u konstantama. Oba čitaju
// isti ključ u localStorage i sinhronizuju se, pa promjena jezika na jednom
// mjestu mijenja i drugo.
// ============================================================================

import { createContext, useContext, useState, useEffect } from "react";
import { LANG_STRINGS } from "../constants/hifz/i18n";
import i18n from "../i18n/index.js";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // Koristi isti localStorage ključ kao react-i18next ("lang")
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem("lang") || "bs"; } catch { return "bs"; }
  });

  // Sinhronizacija: kad react-i18next promijeni jezik (npr. iz Settings), ažuriraj i naš lang
  useEffect(() => {
    const handler = (lng) => {
      const normalized = lng === "bs" || lng === "en" ? lng : "bs";
      setLangState(normalized);
    };
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);

  const switchLang = (l) => {
    setLangState(l);
    try {
      // Sinhronizacija s react-i18next sistemom
      i18n.changeLanguage(l);
      localStorage.setItem("lang", l);
    } catch {
      // localStorage može biti nedostupan (privatni mod, kvota) - nije kritično
    }
  };

  const s = LANG_STRINGS[lang] || LANG_STRINGS.bs;

  return (
    <LanguageContext.Provider value={{ lang, setLang: switchLang, s }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook uz Provider je standardan Context pattern
export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang mora biti unutar LanguageProvider-a");
  return ctx;
}
