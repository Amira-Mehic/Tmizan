// ============================================================================
// Ponuda za instalaciju aplikacije na uređaj. Prikazuje se samo kad preglednik
// javi da je instalacija moguća i kad aplikacija već nije instalirana. Na iOS
// Safariju se umjesto dugmeta prikazuje uputstvo, jer tamo instalacija ide
// isključivo kroz izbornik za dijeljenje i ne može se pokrenuti iz koda.
// ============================================================================

import React, { useState } from "react"
import { Download, X, Share } from "lucide-react"
import { usePWAInstall } from "../hooks/usePWAInstall"
import { useLang } from "../context/LanguageContext"

const STR = {
  bs: {
    title: "Instaliraj Tmizan",
    subtitle: "Brži pristup, radi i offline",
    installBtn: "Dodaj na početni ekran",
    iosTitle: "Dodaj Tmizan na početni ekran",
    iosSubtitle: "Safari → Podijeli (Share) ikona → \"Dodaj na Home ekran\"",
    close: "Zatvori",
  },
  en: {
    title: "Install Tmizan",
    subtitle: "Faster access, works offline too",
    installBtn: "Add to home screen",
    iosTitle: "Add Tmizan to your Home Screen",
    iosSubtitle: "Safari → Share icon → \"Add to Home Screen\"",
    close: "Close",
  },
}

// Zatvaranje bannera je namjerno ČISTO lokalno (useState, ne localStorage) -
// nestaje samo za ovu posjetu i ne gasi trajno mogućnost instalacije. Za
// trajno dostupnu opciju vidi i dugme u sidebaru (SidebarLayout).
const PWAInstallBanner = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall()
  const { lang } = useLang()
  const s = STR[lang] || STR.bs
  const [dismissed, setDismissed] = useState(false)

  if (isInstalled || dismissed) return null
  if (!isInstallable && !isIOS) return null

  const handleInstall = async () => {
    await promptInstall()
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-[200] px-4 pb-4 sm:pb-6 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a1210]/95 backdrop-blur-md shadow-2xl px-4 py-3">
        <div
          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "#1D9E75" }}
        >
          {isIOS && !isInstallable ? <Share className="w-5 h-5 text-white" /> : <Download className="w-5 h-5 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {isIOS && !isInstallable ? s.iosTitle : s.title}
          </p>
          <p className="text-xs text-white/60 truncate">
            {isIOS && !isInstallable ? s.iosSubtitle : s.subtitle}
          </p>
        </div>

        {!(isIOS && !isInstallable) && (
          <button
            onClick={handleInstall}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1D9E75" }}
          >
            {s.installBtn}
          </button>
        )}

        <button
          onClick={() => setDismissed(true)}
          aria-label={s.close}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default PWAInstallBanner
