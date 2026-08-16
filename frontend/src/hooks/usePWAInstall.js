// ============================================================================
// Instalacija aplikacije na uređaj (PWA). Preglednik javlja da je instalacija
// moguća posebnim događajem, koji se ovdje presreće i zadržava, da bi se ponuda
// mogla prikazati u trenutku koji odgovara aplikaciji umjesto odmah. Hook vraća
// je li instalacija moguća, je li već obavljena, i funkciju koja pokreće ponudu.
//
// Stanje „instalacija je moguća" prati stvarno stanje preglednika i ne pamti se
// trajno. Zatvaranje ponude vrijedi samo za tu posjetu, jer bi trajno gašenje
// jednim klikom uklonilo mogućnost instalacije sa svih mjesta u aplikaciji.
// ============================================================================

import { useEffect, useState, useCallback } from "react"
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)

  // Provjeri je li app već pokrenut kao instalirani PWA (standalone mod) -
  // čisto sinhrona provjera browser globala, pa ide u lazy initializer
  // umjesto u useEffect (identičan rezultat, bez dodatnog rendera).
  const [isInstalled, setIsInstalled] = useState(() => {
    return (
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true
    )
  })

  // iOS Safari (i iPadOS) nikad ne šalje "beforeinstallprompt" - instalacija
  // ide isključivo preko Share → "Dodaj na Home Screen". Detekcija služi da
  // UI (banner/dugme) tamo prikaže uputstvo umjesto dugmeta koje ne bi ništa
  // uradilo. Isto - čisto sinhrona provjera, lazy initializer.
  const [isIOS] = useState(() => {
    const ua = window.navigator.userAgent || ""
    const iOSDevice = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
    return iOSDevice && isSafari
  })

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      // Preglednikova zadana traka se sprječava jer se ponuda prikazuje
      // svoj UI umjesto njega, na više mjesta (banner + dugme u sidebaru).
      event.preventDefault()
      setDeferredPrompt(event)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null

    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    setDeferredPrompt(null)
    setIsInstallable(false)

    return choice.outcome // "accepted" | "dismissed"
  }, [deferredPrompt])

  return {
    isInstallable,
    isInstalled,
    isIOS,
    promptInstall,
  }
}

export default usePWAInstall
