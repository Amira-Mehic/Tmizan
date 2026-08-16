// ============================================================================
// Murajaa - procjena "dnevna količina" + "trajanje" plana ponavljanja, za
// prikaz na listi planova (Hifz Planner). Čista funkcija - ne čita bazu.
// Prioritet: eksplicitan tempo (wizard korak "Tempo") > struktura same
// metode (fiksni ciklus) > kvota iz rotation_state/dinamicna (ako je
// proslijeđena) > nepoznato (null - UI prikazuje "-", ne izmišlja broj).
// ============================================================================

// method: jedan od 16 ID-jeva metoda ponavljanja
// ukupnoStr: veličina opsega u stranicama (scope_size)
// tempo: { dailyQtyPages, totalDays } | null - iz wizard koraka "Tempo"
// dzuzArrLen: broj odabranih džuzeva (za "dzuzevi"/"dzuz_sedmica")
// rotationQuota: rotation_state.quota (samo za "stranice") | null
// dinamicnaQuotaDays: rotation_state.quota (dužina ciklusa u danima, za
//   "dinamicna") | null
export function proceniPlan({
  method, ukupnoStr = 0, tempo = null, dzuzArrLen = 0,
  rotationQuota = null, dinamicnaQuotaDays = null,
}) {
  if (tempo?.dailyQtyPages) {
    return { dnevnaKolicina: tempo.dailyQtyPages, trajanjeDana: tempo.totalDays || null };
  }

  switch (method) {
    case "dzuzevi":
      return {
        dnevnaKolicina: dzuzArrLen > 0 ? Math.round(ukupnoStr / dzuzArrLen) : null,
        trajanjeDana: dzuzArrLen > 0 ? dzuzArrLen : null,
      };
    case "seton":
      return { dnevnaKolicina: Math.round(ukupnoStr / 8), trajanjeDana: 8 };
    case "stranice":
      return {
        dnevnaKolicina: rotationQuota || null,
        trajanjeDana: rotationQuota ? Math.ceil(ukupnoStr / rotationQuota) : null,
      };
    case "dinamicna": {
      const trajanjeDana = dinamicnaQuotaDays || 30;
      return { dnevnaKolicina: Math.ceil(ukupnoStr / trajanjeDana), trajanjeDana };
    }
    case "femi":
      return { dnevnaKolicina: Math.ceil(ukupnoStr / 7), trajanjeDana: 7 };
    case "dzuz_sedmica":
      return {
        dnevnaKolicina: dzuzArrLen > 0 ? Math.ceil((ukupnoStr / dzuzArrLen) / 7) : null,
        trajanjeDana: 7,
      };
    case "fibonacci":
    case "tri_dana":
    case "sedam_dana":
    case "srs": {
      // Bez tempa, seedMethodEngine dijeli opseg na blokove od podrazumijevanih
      // 5 str/dan (isto kao metoda "Po stranicama") umjesto da sve strpa u
      // jedan blok - inače bi npr. hafiz+Fibonacci tražio da se ponovi svih
      // 604 stranice odjednom svaki put kad dođe na red (bag koji je
      // korisnica prijavila).
      const dnevno = tempo?.dailyQtyPages || 5;
      return { dnevnaKolicina: dnevno, trajanjeDana: ukupnoStr ? Math.ceil(ukupnoStr / dnevno) : null };
    }
    case "novo_staro":
      // Nije samostalan raspoređivač - samo dnevna sesija koja postojeće
      // blokove dijeli po starosti; wizard mu samo zasije JEDAN početni blok
      // (motor "tri_dana") da sesija ima šta prikazati, pa nema fiksnu dnevnu
      // količinu ni trajanje.
      return { dnevnaKolicina: ukupnoStr || null, trajanjeDana: null };
    default:
      // greske / slobodan / mualim - nemaju strukturu rasporeda
      return { dnevnaKolicina: null, trajanjeDana: null };
  }
}
