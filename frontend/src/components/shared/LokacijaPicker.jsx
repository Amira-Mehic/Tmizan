// ============================================================================
// Odabir lokacije (država, grad, regija), zajednički za postavke profila i za
// ciljanje oglasa u admin panelu.
// ============================================================================

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { drzaveZaPrikaz, countryName, gradoviZaDrzavu, imaSpisakGradova, regijaZaGrad } from "../../constants/lokacija"

// Postoji kao jedna komponenta da se isti podatak ne unosi na dva načina.
// Koriste ga postavke i profil (korisnikova lokacija) i admin panel za oglase
// (ciljana lokacija). Regija se ne unosi ručno, nego se izvodi iz grada, pa
// pozivalac uvijek dobija sve tri vrijednosti odjednom.
export default function LokacijaPicker({
  country = "",
  city = "",
  onChange,
  disabled = false,
  compact = false,
  inputClass = "",
  labelClass = "",
  countryLabel = "Država",
  cityLabel = "Grad",
  allowEmptyCountry = true,
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language?.startsWith("en") ? "en" : "bs"

  const gradovi = gradoviZaDrzavu(country)
  const region = regijaZaGrad(country, city)

  // 250+ država je previše za jedan ravan spisak, pa se najčešće izdvajaju na
  // vrh. Memoizirano jer sortiranje po jeziku nije besplatno.
  const { ceste, ostale } = useMemo(() => drzaveZaPrikaz(lang), [lang])

  const emit = (nextCountry, nextCity) =>
    onChange?.({
      country: nextCountry || "",
      city: nextCity || "",
      region: regijaZaGrad(nextCountry, nextCity) || "",
    })

  // Promjena države poništava grad, jer spisak gradova više ne odgovara.
  const onCountry = (e) => emit(e.target.value, "")
  const onCity = (e) => emit(country, e.target.value)

  const base = inputClass || "w-full px-3 py-2.5 rounded-xl border text-sm outline-none"

  return (
    <div className={compact ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
      <div>
        <label className={labelClass || "text-xs font-semibold block mb-1.5 opacity-70"}>
          {countryLabel}
        </label>
        <select value={country} onChange={onCountry} disabled={disabled} className={base}>
          {allowEmptyCountry && (
            <option value="">{lang === "en" ? "— Select country —" : "— Odaberi državu —"}</option>
          )}
          <optgroup label={lang === "en" ? "Most common" : "Najčešće"}>
            {ceste.map((c) => (
              <option key={c.code} value={c.code}>{countryName(c.code, lang)}</option>
            ))}
          </optgroup>
          <optgroup label={lang === "en" ? "All countries" : "Sve države"}>
            {ostale.map((c) => (
              <option key={c.code} value={c.code}>{countryName(c.code, lang)}</option>
            ))}
          </optgroup>
        </select>
      </div>

      <div>
        <label className={labelClass || "text-xs font-semibold block mb-1.5 opacity-70"}>
          {cityLabel}
        </label>

        {imaSpisakGradova(country) ? (
          <select value={city} onChange={onCity} disabled={disabled} className={base}>
            <option value="">{lang === "en" ? "— Select city —" : "— Odaberi grad —"}</option>
            {gradovi.map((g) => (
              <option key={g.city} value={g.city}>{g.city}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={city}
            onChange={onCity}
            disabled={disabled || !country}
            placeholder={
              country
                ? (lang === "en" ? "e.g. Vienna" : "npr. Beč")
                : (lang === "en" ? "select a country first" : "prvo odaberi državu")
            }
            className={base}
          />
        )}

        {region && (
          <p className="text-[11px] mt-1 opacity-60">
            {lang === "en" ? "Region" : "Regija"}: {region}
          </p>
        )}
        {imaSpisakGradova(country) && city && !region && (
          <p className="text-[11px] mt-1 opacity-60">
            {lang === "en"
              ? "This city is not on the list, so the region stays empty."
              : "Grad nije na spisku, pa regija ostaje prazna."}
          </p>
        )}
      </div>
    </div>
  )
}
