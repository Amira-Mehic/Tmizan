// ============================================================================
// Jedno mjesto za prikaz oglasa. Oglas se bira prema lokaciji posjetioca, a ona
// se uzima prvenstveno iz profila jer ju je korisnik sam potvrdio; procjena po
// IP adresi služi samo kad profil nema upisanu lokaciju. Ako lokacija nije
// poznata ni na jedan način, prikazuju se samo globalni oglasi.
// ============================================================================

import { useEffect, useState, useCallback } from "react"
import { supabase } from "../../services/SupaBaseClient"
import { useAuth } from "../../context/AuthContext"
import { odaberiOglas, isteVrijednosti } from "../../constants/lokacija"

// ─── Procjena lokacije po IP adresi ─────────────────────────────────────────
// Dijeljen (modul-level) rezultat: ako na stranici ima više BanerSlot oglasa
// odjednom, svi dijele isti poziv umjesto da svaki zasebno pogađa ipapi.co
// (koji ima ograničenje broja poziva - više istovremenih poziva brže dovede
// do 429/CORS odbijanja).
let ipLocationPromise = null
async function fetchIpLocation() {
  if (!ipLocationPromise) {
    ipLocationPromise = (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) })
        const d   = await res.json()
        return {
          country: d.country_code || null,   // "BA", "DE", "US"
          city:    d.city         || null,   // "Sarajevo"
          region:  d.region       || null,   // "Federation of BiH"
        }
      } catch {
        return null
      }
    })()
  }
  return ipLocationPromise
}

// ─── Poređenje lokacija, vraća pouzdanost od 0 do 2 ─────────────────────────
// 0 = profil ima lokaciju, ali IP kaže drugu državu (nepouzdano)
// 1 = postoji samo profil (IP nedostupan)
// 2 = IP potvrđuje ono što piše u profilu
function locationMatch(profile, ip) {
  if (!profile?.country) return 0
  if (!ip) return 1
  if (isteVrijednosti(profile.country, ip.country)) return 2
  return 0
}

// ─── Glavni komponent ────────────────────────────────────────────────────────
export default function BanerSlot({ pozicija, borderClass, theme, mini = false }) {
  const { user }  = useAuth()
  const [oglas, setOglas] = useState(null)
  const [_locStatus, setLocStatus] = useState(null) // "verified" | "mismatch" | "pending" - trenutno se samo postavlja, ne prikazuje

  const ucitajOglas = useCallback(async () => {
    // 1. Lokacija iz Supabase profila
    let profileLoc = null
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("country, city, region")
        .eq("id", user.id)
        .single()
      profileLoc = profile || null
    }

    // 2. IP geolocation provjera
    const ipLoc = await fetchIpLocation()

    // 3. Provjeri poklapanje
    const confidence = locationMatch(profileLoc, ipLoc)
    if (confidence === 0 && profileLoc?.country) {
      // IP kaže drugačija zemlja - označi neskladnost, ali svejedno pokušaj s IP lokacijom
      setLocStatus("mismatch")
    } else if (confidence >= 2) {
      setLocStatus("verified")
    } else {
      setLocStatus("pending")
    }

    // 4. Odaberi efektivnu lokaciju. Profil je izvor istine kad ga ima, jer ga
    //    je korisnik sam potvrdio; IP služi kao zamjena samo ako profil nema
    //    lokaciju (npr. stariji nalozi koji je nikad nisu popunili).
    const effectiveLoc = profileLoc?.country
      ? profileLoc
      : { country: ipLoc?.country || null, city: ipLoc?.city || null, region: ipLoc?.region || null }

    // 5. Dovuci kandidate: oglase za ovu državu i one bez ciljanja (globalne).
    let query = supabase
      .from("advertisements")
      .select("*")
      .eq("position", pozicija)
      .eq("is_active", true)

    if (effectiveLoc?.country) {
      query = query.or(
        `target_country.eq.${effectiveLoc.country},target_country.is.null`
      )
    } else {
      // Bez ikakve lokacije smiju se prikazati samo globalni oglasi.
      query = query.is("target_country", null)
    }

    const { data } = await query.limit(20)

    // 6. Odabir pobjednika: stvarno poređenje vrijednosti (grad > regija >
    //    država > globalno), a kod izjednačenja odlučuje prioritet. Ranije se
    //    bodovalo samo po tome da li je kolona popunjena, pa je oglas za drugi
    //    grad imao istu težinu kao oglas za korisnikov grad.
    setOglas(odaberiOglas(effectiveLoc, data) || null)
  }, [pozicija, user])

  // ucitajOglas() je asinhron fetch (profil + IP lokacija + oglasi) - mora
  // ostati u useEffect-u.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { ucitajOglas() }, [ucitajOglas])

  // Nema oglasa
  if (!oglas) {
    if (pozicija === "mobitel" || mini) return null
    return (
      <div className={`w-full h-[350px] rounded-2xl border ${borderClass} bg-black/5 flex items-center justify-center opacity-30`}>
        <span className={`text-xs ${theme?.muted} rotate-90 whitespace-nowrap`}>Oglas</span>
      </div>
    )
  }

  return (
    <a href={oglas.target_url} target="_blank" rel="noopener noreferrer" className="w-full block">
      <img
        src={oglas.image_url}
        alt={oglas.title || "Oglas"}
        className={`w-full rounded-2xl object-cover shadow-lg hover:opacity-90 transition-opacity ${
          pozicija === "mobitel" || mini ? "h-9 max-w-[120px]" : "h-auto"
        }`}
      />
    </a>
  )
}
