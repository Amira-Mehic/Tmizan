import { useState } from "react"
import { useTheme } from "../../../context/ThemeContext"
import { SURA_DATA } from "../../../constants/hifz/SURA_DATA"
import { useNavigate } from "react-router-dom"

// 30 džuzova s opsegom stranica (Medinski mushaf)
const JUZOVI = Array.from({ length: 30 }, (_, i) => {
  const startPage = i === 0 ? 1 : Math.round(1 + i * (604 / 30))
  const endPage = i === 29 ? 604 : Math.round((i + 1) * (604 / 30))
  return { id: i + 1, startPage, endPage, pageCount: endPage - startPage + 1 }
})

const METODE = [
  { id: "fibonacci",   naziv: "Fibonacci",           opis: "1→2→3→5→8 dana — postepeno udaljavanje" },
  { id: "tri_dana",    naziv: "Tri dana",             opis: "3 uzastopna dana konsolidacije" },
  { id: "sedam_dana",  naziv: "Sedam dana",           opis: "7 dana zaredom, pa pauza 14 dana" },
  { id: "dzuzevi",     naziv: "Sistem džuzeva",       opis: "Jedan džuz dnevno, 30 dana = hatma" },
  { id: "stranice",    naziv: "Po stranicama",        opis: "Dnevna kvota stranica, kružno" },
  { id: "seton",       naziv: "Šetonova (8 dijelova)","opis": "Hifz u 8 jednakih dijelova, svaki dan 1/8" },
  { id: "novo_staro",  naziv: "Novo i staro",         opis: "Jutro: nedavno naučeno | Veče: stariji hifz" },
  { id: "greske",      naziv: "Na osnovu grešaka",    opis: "Prioritet ajeti s greškama iz Trackera" },
  { id: "ramazan",     naziv: "Ramazanska metoda",    opis: "1 džuz dnevno, cijeli Kur'an za 30 dana" },
  { id: "nivo",        naziv: "Po hafizovom nivou",   opis: "Plan prilagođen tvom trenutnom nivou" },
  { id: "slobodan",    naziv: "Slobodan raspored",    opis: "Bez automatike — samo bilježi šta uradiš" },
  { id: "mualim",      naziv: "Muallimov plan",       opis: "Muallim kreira i dodjeljuje plan" },
  { id: "femi",        naziv: "Femi bi Ševk",         opis: "Kur'an u 7 dana po tradicionalnoj podjeli" },
  { id: "dzuz_sedmica",naziv: "Džuz kroz sedmicu",    opis: "Jedan džuz raspoređen na 7 dana intenzivno" },
  { id: "dinamicna",   naziv: "Dinamična raspodjela", opis: "Auto-rebalans svakim danom po stvarnom tempu" },
  { id: "srs",         naziv: "SRS (Naučni model)",   opis: "Pametno ponavljanje — rjeđe ono što znaš dobro" },
]

// Koliko stranica pokriva svaki džuz (aproksimacija Medinskog mushafa)
const JUZ_PAGES = [
  [1,20],[21,41],[42,61],[62,81],[82,101],[102,121],[122,141],[142,161],[162,181],[182,201],
  [202,221],[222,241],[242,261],[262,281],[282,301],[302,321],[322,341],[342,361],[362,381],[382,401],
  [402,421],[422,441],[442,461],[462,481],[482,501],[502,521],[522,541],[542,561],[562,581],[582,604]
]

function getPagesForJuzs(juzIds) {
  const pages = new Set()
  juzIds.forEach(id => {
    const [start, end] = JUZ_PAGES[id - 1]
    for (let p = start; p <= end; p++) pages.add(p)
  })
  return pages
}

function getPagesForSuras(suraIds) {
  const pages = new Set()
  suraIds.forEach(id => {
    const sura = SURA_DATA.find(s => s.id === id)
    if (sura) for (let p = sura.startPage; p <= sura.endPage; p++) pages.add(p)
  })
  return pages
}

export default function HifzPlannerPage() {
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState("ponavljanje") // "ponavljanje" | "ucenje"

  // Plan ponavljanja state
  const [korak, setKorak] = useState(1) // 1=unos šta znaš, 2=metoda, 3=pregled
  const [nacin, setNacin] = useState(null) // "dzuzovi" | "sure" | "hafiz" | "rucno"

  // Džuzovi
  const [odabraniDzuzovi, setOdabraniDzuzovi] = useState([])
  const [brziDzuz, setBrziDzuz] = useState("")

  // Sure
  const [odabraneSure, setOdabraneSure] = useState([])
  const [suraPretrazivanje, setSuraPretrazivanje] = useState("")

  // Odabrana metoda
  const [odabranaMetoda, setOdabranaMetoda] = useState(null)

  const isLight = theme?.id === "beige_white" || theme?.id === "pink_soft"
  const border  = isLight ? "border-black/10" : "border-white/8"
  const mutedCls = theme?.muted || "text-gray-400"
  const textCls  = theme?.text  || "text-white"
  const cardCls  = theme?.card  || "bg-gray-800"
  const btnCls   = theme?.button || "bg-indigo-600 text-white"
  const accentCls = theme?.accent || "text-indigo-400"

  // Izračun naučenih stranica
  const naučeneStr = (() => {
    if (nacin === "hafiz") return new Set(Array.from({ length: 604 }, (_, i) => i + 1))
    if (nacin === "dzuzovi") return getPagesForJuzs(odabraniDzuzovi)
    if (nacin === "sure")    return getPagesForSuras(odabraneSure)
    return new Set()
  })()

  const ukupnoStr = naučeneStr.size

  // Toggle džuz
  const toggleDzuz = (id) => {
    setOdabraniDzuzovi(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  // Brzi unos "znam prvih X džuzova"
  const primijeniBreziDzuz = () => {
    const n = parseInt(brziDzuz)
    if (!n || n < 1 || n > 30) return
    setOdabraniDzuzovi(Array.from({ length: n }, (_, i) => i + 1))
  }

  // Toggle sura
  const toggleSura = (id) => {
    setOdabraneSure(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const filtrovaneSure = SURA_DATA.filter(s =>
    s.name.toLowerCase().includes(suraPretrazivanje.toLowerCase()) ||
    s.id.toString().includes(suraPretrazivanje)
  )

  // ── RENDER ──

  return (
    <div className="max-w-3xl mx-auto py-6 px-2">

      {/* Naslov */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${textCls}`}>Hifz Planner</h1>
        <p className={`text-sm mt-1 ${mutedCls}`}>
          Generiši personalni plan učenja i ponavljanja Kur'ana
        </p>
      </div>

      {/* Tab selektor */}
      <div className={`flex rounded-2xl p-1 mb-8 ${cardCls} border ${border}`}>
        {[
          { id: "ponavljanje", label: "Plan ponavljanja" },
          { id: "ucenje",      label: "Plan učenja" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
              ${activeTab === tab.id ? btnCls : `${mutedCls} hover:opacity-80`}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: PLAN PONAVLJANJA ── */}
      {activeTab === "ponavljanje" && (
        <div className="space-y-6">

          {/* Korak indikator */}
          <div className="flex items-center gap-2 mb-2">
            {["Šta znaš", "Metoda", "Plan"].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${korak > i + 1 ? btnCls : korak === i + 1 ? btnCls + " ring-2 ring-offset-1 ring-offset-transparent" : `border ${border} ${mutedCls}`}`}>
                  {korak > i + 1 ? "✓" : i + 1}
                </div>
                <span className={`text-xs font-medium ${korak === i + 1 ? textCls : mutedCls}`}>{s}</span>
                {i < 2 && <div className={`w-8 h-px ${border} border-t`} />}
              </div>
            ))}
          </div>

          {/* ── KORAK 1: ŠTA ZNAŠ ── */}
          {korak === 1 && (
            <div className="space-y-4">
              <h2 className={`text-base font-semibold ${textCls}`}>Šta si do sada naučio/la?</h2>

              {/* 4 opcije */}
              <div className="grid grid-cols-2 gap-3">

                {/* Džuzovi */}
                <button
                  onClick={() => setNacin(nacin === "dzuzovi" ? null : "dzuzovi")}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200
                    ${nacin === "dzuzovi" ? `${btnCls} border-transparent` : `${cardCls} border-${border} hover:border-opacity-50`}`}
                >
                  <div className="text-xl mb-1">📖</div>
                  <div className={`text-sm font-semibold ${nacin === "dzuzovi" ? "text-white" : textCls}`}>Po džuzovima</div>
                  <div className={`text-xs mt-0.5 ${nacin === "dzuzovi" ? "text-white/70" : mutedCls}`}>Odaberi džuzove koje znaš</div>
                </button>

                {/* Sure */}
                <button
                  onClick={() => setNacin(nacin === "sure" ? null : "sure")}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200
                    ${nacin === "sure" ? `${btnCls} border-transparent` : `${cardCls} border ${border} hover:opacity-80`}`}
                >
                  <div className="text-xl mb-1">🕌</div>
                  <div className={`text-sm font-semibold ${nacin === "sure" ? "text-white" : textCls}`}>Po surama</div>
                  <div className={`text-xs mt-0.5 ${nacin === "sure" ? "text-white/70" : mutedCls}`}>Označi sure koje znaš</div>
                </button>

                {/* Hafiz */}
                <button
                  onClick={() => setNacin(nacin === "hafiz" ? null : "hafiz")}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200
                    ${nacin === "hafiz" ? `${btnCls} border-transparent` : `${cardCls} border ${border} hover:opacity-80`}`}
                >
                  <div className="text-xl mb-1">🌟</div>
                  <div className={`text-sm font-semibold ${nacin === "hafiz" ? "text-white" : textCls}`}>Ja sam hafiz/hafiza</div>
                  <div className={`text-xs mt-0.5 ${nacin === "hafiz" ? "text-white/70" : mutedCls}`}>Znam svih 604 stranica</div>
                </button>

                {/* Ručno */}
                <button
                  onClick={() => navigate("/korisnik/hifz/planer")}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 ${cardCls} border ${border} hover:opacity-80`}
                >
                  <div className="text-xl mb-1">✏️</div>
                  <div className={`text-sm font-semibold ${textCls}`}>Unesi ručno</div>
                  <div className={`text-xs mt-0.5 ${mutedCls}`}>Otvori Hifz Tracker i označi stranice</div>
                </button>
              </div>

              {/* ── DŽUZOVI ekspanzija ── */}
              {nacin === "dzuzovi" && (
                <div className={`rounded-2xl border ${border} ${cardCls} p-4 space-y-4`}>

                  {/* Brzi unos */}
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${mutedCls}`}>Brzi unos</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1} max={30}
                        value={brziDzuz}
                        onChange={e => setBrziDzuz(e.target.value)}
                        placeholder="Znam prvih X džuzova"
                        className={`flex-1 px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} placeholder:${mutedCls} outline-none`}
                      />
                      <button
                        onClick={primijeniBreziDzuz}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold ${btnCls}`}
                      >
                        Primijeni
                      </button>
                    </div>
                  </div>

                  {/* Grid džuzova */}
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${mutedCls}`}>Ili odaberi ručno</p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(id => (
                        <button
                          key={id}
                          onClick={() => toggleDzuz(id)}
                          className={`aspect-square rounded-xl text-xs font-bold transition-all duration-150
                            ${odabraniDzuzovi.includes(id)
                              ? btnCls
                              : `border ${border} ${mutedCls} hover:opacity-80`}`}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sažetak */}
                  {odabraniDzuzovi.length > 0 && (
                    <div className={`text-xs ${accentCls} font-medium`}>
                      ✓ Odabrano {odabraniDzuzovi.length} džuz{odabraniDzuzovi.length === 1 ? "" : "a"} — ukupno ~{ukupnoStr} stranica
                    </div>
                  )}
                </div>
              )}

              {/* ── SURE ekspanzija ── */}
              {nacin === "sure" && (
                <div className={`rounded-2xl border ${border} ${cardCls} p-4 space-y-3`}>
                  <input
                    type="text"
                    value={suraPretrazivanje}
                    onChange={e => setSuraPretrazivanje(e.target.value)}
                    placeholder="Pretraži suru (npr. Al-Kahf ili 18)..."
                    className={`w-full px-3 py-2 rounded-xl text-sm border ${border} bg-black/10 ${textCls} placeholder:opacity-40 outline-none`}
                  />

                  <div className="max-h-52 overflow-y-auto space-y-1 pr-1 [&::-webkit-scrollbar]:hidden">
                    {filtrovaneSure.map(sura => (
                      <button
                        key={sura.id}
                        onClick={() => toggleSura(sura.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150
                          ${odabraneSure.includes(sura.id)
                            ? btnCls
                            : `border ${border} ${mutedCls} hover:opacity-80`}`}
                      >
                        <span className="font-medium">
                          {sura.id}. {sura.name}
                        </span>
                        <span className={`text-xs ${odabraneSure.includes(sura.id) ? "text-white/70" : mutedCls}`}>
                          str. {sura.startPage}–{sura.endPage}
                        </span>
                      </button>
                    ))}
                  </div>

                  {odabraneSure.length > 0 && (
                    <div className={`text-xs ${accentCls} font-medium`}>
                      ✓ Odabrano {odabraneSure.length} sura — ukupno ~{ukupnoStr} stranica
                    </div>
                  )}
                </div>
              )}

              {/* Hafiz poruka */}
              {nacin === "hafiz" && (
                <div className={`rounded-2xl border ${border} p-4 ${cardCls}`}>
                  <p className={`text-sm ${textCls}`}>
                    ما شاء الله — Svih <span className="font-bold">604 stranice</span> će biti uključene u plan ponavljanja.
                  </p>
                </div>
              )}

              {/* Dugme dalje */}
              {(nacin === "hafiz" || (nacin === "dzuzovi" && odabraniDzuzovi.length > 0) || (nacin === "sure" && odabraneSure.length > 0)) && (
                <button
                  onClick={() => setKorak(2)}
                  className={`w-full py-3 rounded-2xl font-semibold text-sm ${btnCls} transition-all`}
                >
                  Dalje — Odaberi metodu ponavljanja →
                </button>
              )}
            </div>
          )}

          {/* ── KORAK 2: METODA ── */}
          {korak === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-semibold ${textCls}`}>Odaberi metodu ponavljanja</h2>
                <button onClick={() => setKorak(1)} className={`text-xs ${mutedCls} hover:opacity-70`}>← Nazad</button>
              </div>

              <p className={`text-xs ${mutedCls}`}>
                Sistem će na osnovu <span className="font-semibold">{ukupnoStr} stranica</span> koje znaš i odabrane metode generisati tvoj raspored.
              </p>

              <div className="space-y-2">
                {METODE.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setOdabranaMetoda(m.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-2xl border text-left transition-all duration-150
                      ${odabranaMetoda === m.id
                        ? `${btnCls} border-transparent`
                        : `${cardCls} border ${border} hover:opacity-80`}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
                      ${odabranaMetoda === m.id ? "border-white bg-white" : `border-current ${mutedCls}`}`}>
                      {odabranaMetoda === m.id && <div className="w-2 h-2 rounded-full bg-current" style={{ background: "var(--btn-color, #4f46e5)" }} />}
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${odabranaMetoda === m.id ? "text-white" : textCls}`}>{m.naziv}</div>
                      <div className={`text-xs mt-0.5 ${odabranaMetoda === m.id ? "text-white/70" : mutedCls}`}>{m.opis}</div>
                    </div>
                  </button>
                ))}
              </div>

              {odabranaMetoda && (
                <button
                  onClick={() => setKorak(3)}
                  className={`w-full py-3 rounded-2xl font-semibold text-sm ${btnCls}`}
                >
                  Generiši plan ponavljanja →
                </button>
              )}
            </div>
          )}

          {/* ── KORAK 3: PREGLED (placeholder) ── */}
          {korak === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-semibold ${textCls}`}>Tvoj plan ponavljanja</h2>
                <button onClick={() => setKorak(2)} className={`text-xs ${mutedCls} hover:opacity-70`}>← Nazad</button>
              </div>

              <div className={`rounded-2xl border ${border} ${cardCls} p-5 space-y-3`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${btnCls} flex items-center justify-center text-white font-bold`}>
                    {odabranaMetoda ? METODE.find(m => m.id === odabranaMetoda)?.naziv[0] : "?"}
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${textCls}`}>
                      {METODE.find(m => m.id === odabranaMetoda)?.naziv}
                    </div>
                    <div className={`text-xs ${mutedCls}`}>{ukupnoStr} stranica u sistemu</div>
                  </div>
                </div>

                <div className={`h-px ${border} border-t`} />

                <p className={`text-xs ${mutedCls} italic`}>
                  Logika generisanja plana za ovu metodu dolazi u sljedećem koraku. Ovdje će biti prikazan raspored po danima, sedmicama i mjesecima.
                </p>
              </div>

              <button className={`w-full py-3 rounded-2xl font-semibold text-sm ${btnCls}`}>
                Aktiviraj plan →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PLAN UČENJA (placeholder) ── */}
      {activeTab === "ucenje" && (
        <div className={`rounded-2xl border ${border} ${cardCls} p-8 text-center`}>
          <div className="text-3xl mb-3">📚</div>
          <h2 className={`text-base font-semibold mb-1 ${textCls}`}>Plan učenja</h2>
          <p className={`text-sm ${mutedCls}`}>Uskoro — wizard za postavljanje plana novog učenja</p>
        </div>
      )}
    </div>
  )
}
