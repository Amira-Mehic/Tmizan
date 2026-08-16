// ============================================================================
// Ta'lim - Mjesečni plan (za praćenje, uređivanje i PRINT)
//
// Gradi plan za cijeli mjesec s datumima, gdje svaki dan ima:
//   - blok UČENJA (šta se uči - iz generatora plana)
//   - blok PONAVLJANJA (odvojen - iz murajaa motora)
//   - polje za upis stvarno naučenog (sure/ajeti/stranice)
//   - bilješke (uređuju se i prije printanja - npr. oznaka greške,
//     samopreslušavanje)
//
// SLOBODNI DANI: korisnik unaprijed označi dane kad ne uči novo (posao,
// putovanje...) - tim danima se NE dodjeljuje novo gradivo, nego je fokus
// na većem broju ponavljanja; gradivo se raspodijeli na radne dane.
// ============================================================================

import { getEdition, lineToPosition } from "./mushaf.js";

// ── Kalendar mjeseca ────────────────────────────────────────────────────────
export function monthDates(year, month /* 1–12 */) {
  const days = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  return Array.from({ length: days }, (_, i) => `${year}-${mm}-${String(i + 1).padStart(2, "0")}`);
}

// ── Generisanje mjesečnog plana ─────────────────────────────────────────────
// pages/editionId/linesPerDay: kao u planner.js
// restDays: ["YYYY-MM-DD", ...] - slobodni dani (bez novog učenja)
// reviewProvider: (date) => opis ponavljanja za taj dan (iz murajaa motora),
//                 može biti null - tada se polje ostavlja prazno za ručni upis
export function generateMonthlyPlan({
  year, month, pages, editionId, linesPerDay,
  restDays = [], startLine = 0, reviewProvider = null,
}) {
  const dates = monthDates(year, month);
  const restSet = new Set(restDays);
  const { linesPerPage } = getEdition(editionId);
  const totalLines = pages.length * linesPerPage;

  // radni dani dobijaju učenje; slobodni dani samo (pojačano) ponavljanje
  const workDates = dates.filter((d) => !restSet.has(d));

  // ukupno redova koje ovaj mjesec pokriva - raspoređeno SAMO na radne dane
  const monthLines = Math.min(totalLines - startLine, Math.round(linesPerDay * workDates.length));
  const perWorkDay = workDates.length ? monthLines / workDates.length : 0;

  let globalLine = startLine;
  let carry = 0;

  const days = dates.map((date) => {
    const isRest = restSet.has(date);
    let learning = null;

    if (!isRest && globalLine < startLine + monthLines) {
      carry += perWorkDay;
      const todayLines = Math.floor(carry);
      carry -= todayLines;
      if (todayLines >= 1) {
        const from = lineToPosition(globalLine, pages, editionId);
        const toIdx = Math.min(globalLine + todayLines, totalLines) - 1;
        const to = lineToPosition(toIdx, pages, editionId);
        learning = { from, to, lineCount: toIdx - globalLine + 1 };
        globalLine = toIdx + 1;
      }
    }

    return {
      date,
      isRest,                                  // slobodan dan → fokus na ponavljanje
      learning,                                // null na slobodne dane
      review: reviewProvider ? reviewProvider(date) : null,
      pojacanoPonavljanje: isRest,             // oznaka: taj dan više ponavljanja
      // polja koja korisnik popunjava (u aplikaciji ili na papiru poslije printa):
      upisNaucenog: "",                        // npr. "Ja-Sin 1–12"
      biljeska: "",                            // npr. "greška na 36:9 - samopreslušavanje"
      oznakaGreske: false,                     // brzi marker da je bilo greške
    };
  });

  return {
    year, month, days,
    endLine: globalLine,                       // dokle se stiglo (za sljedeći mjesec)
    radnihDana: workDates.length,
    slobodnihDana: restDays.length,
  };
}

// ── AJETI-generator (nezavisan od redova/stranica) ──────────────────────────
// Za planove čija je tempo-jedinica "ajeti" (talim_plans.state.tempoUnit ===
// "ajeti") - dan se sječe po BROJU AJETA, potpuno neovisno o tome koliko koji
// ajet ima redova. `ayahKeys`: uređena lista "sura:ajet" ključeva za CIJELI
// opseg plana (mushaf redoslijed - poziva ih monthlyPlanService preko
// hifzSync.ayahsInPages prije poziva ove funkcije, ista podjela odgovornosti
// kao kod generateMonthlyPlan/pages iznad).
export function parseVerseKey(vk) {
  const [surah, ayah] = String(vk || "").split(":").map(Number);
  return { surah, ayah };
}

export function generateMonthlyPlanByAyahs({
  year, month, ayahKeys = [],
  restDays = [], ayahsPerDay = 0, startIndex = 0,
}) {
  const dates = monthDates(year, month);
  const restSet = new Set(restDays);
  const totalAyahs = ayahKeys.length;

  const workDates = dates.filter((d) => !restSet.has(d));
  const monthAyahs = Math.min(totalAyahs - startIndex, Math.round(ayahsPerDay * workDates.length));
  const perWorkDay = workDates.length ? monthAyahs / workDates.length : 0;

  let globalIdx = startIndex;
  let carry = 0;

  const days = dates.map((date) => {
    const isRest = restSet.has(date);
    let learning = null;

    if (!isRest && globalIdx < startIndex + monthAyahs) {
      carry += perWorkDay;
      const todayCount = Math.floor(carry);
      carry -= todayCount;
      if (todayCount >= 1) {
        const toIdx = Math.min(globalIdx + todayCount, totalAyahs) - 1;
        const fromKey = ayahKeys[globalIdx];
        const toKey = ayahKeys[toIdx];
        learning = {
          unit: "ajeti",
          from: parseVerseKey(fromKey), to: parseVerseKey(toKey),
          fromKey, toKey, amount: toIdx - globalIdx + 1,
        };
        globalIdx = toIdx + 1;
      }
    }

    return {
      date, isRest, learning, review: null, pojacanoPonavljanje: isRest,
      upisNaucenog: "", biljeska: "", oznakaGreske: false,
    };
  });

  return {
    year, month, days,
    endIndex: globalIdx,
    radnihDana: workDates.length,
    slobodnihDana: restDays.length,
  };
}

// Isti princip zaštite kao regenerateFromTempo (redovi) - done i prošli-
// -neodučeni dani se ne prepisuju retroaktivno. `ayahKeys` mora biti ista
// uređena lista za cijeli opseg (poziva se svaki put iznova jer je jeftino -
// samo select po page_number iz lokalne baze, bez ograničenja brzine).
export function regenerateAyahPlanFromTempo(plan, { ayahKeys, ayahsPerDay, restDays, startIndex, today }) {
  const doneDates = plan.days.filter((d) => d.done).map((d) => d.date);
  const pastUndoneDates = today
    ? plan.days.filter((d) => !d.done && d.date < today).map((d) => d.date)
    : [];
  const effectiveRestDays = Array.from(new Set([...(restDays || []), ...doneDates, ...pastUndoneDates]));

  const regen = generateMonthlyPlanByAyahs({
    year: plan.year, month: plan.month, ayahKeys, ayahsPerDay, startIndex,
    restDays: effectiveRestDays,
  });

  const frozenDates = new Set([...doneDates, ...pastUndoneDates]);
  const merged = regen.days.map((nd) => {
    const old = plan.days.find((d) => d.date === nd.date);
    if (old && frozenDates.has(nd.date)) return old;
    return old ? { ...nd, upisNaucenog: old.upisNaucenog, biljeska: old.biljeska, oznakaGreske: old.oznakaGreske } : nd;
  });

  return { ...regen, days: merged };
}

export function toggleAyahRestDay(plan, date, { ayahKeys, ayahsPerDay, today }) {
  const target = plan.days.find((d) => d.date === date);
  if (!target) return plan;

  const doneDates = plan.days.filter((d) => d.done).map((d) => d.date);
  const doneAyahs = plan.days
    .filter((d) => d.done)
    .reduce((acc, d) => acc + (Number(d.actualLines) || d.learning?.amount || 0), 0);
  const pastUndoneDates = today
    ? plan.days.filter((d) => !d.done && d.date < today && d.date !== date).map((d) => d.date)
    : [];

  const newRestDays = Array.from(new Set([
    ...plan.days
      .filter((d) => !d.done && (d.date === date ? !d.isRest : d.isRest))
      .map((d) => d.date),
    ...doneDates,
    ...pastUndoneDates,
  ]));

  const regen = generateMonthlyPlanByAyahs({
    year: plan.year, month: plan.month, ayahKeys, ayahsPerDay,
    restDays: newRestDays, startIndex: doneAyahs,
  });

  const frozenDates = new Set([...doneDates, ...pastUndoneDates]);
  const merged = regen.days.map((nd) => {
    const old = plan.days.find((d) => d.date === nd.date);
    if (old && frozenDates.has(nd.date)) return old;
    return old ? { ...nd, upisNaucenog: old.upisNaucenog, biljeska: old.biljeska, oznakaGreske: old.oznakaGreske } : nd;
  });

  return { ...regen, days: merged };
}

// ── Uređivanje plana (sve je izmjenjivo prije printa i tokom mjeseca) ───────
export function updateDay(plan, date, changes) {
  return {
    ...plan,
    days: plan.days.map((d) => (d.date === date ? { ...d, ...changes } : d)),
  };
}

// Ručna promjena tempa (nakon "Uredi tempo") → regeneriši JOŠ NEODUČENE dane
// ovog mjeseca novim tempom. Dani koji su već označeni kao naučeni (d.done)
// se NE diraju - to je historija koja se ne mijenja retroaktivno.
//
// `today` (opciono, "YYYY-MM-DD"): ako je dat, dani čiji je datum VEĆ PROŠAO
// a NISU označeni kao naučeni se TAKOĐER ne prepisuju - njihov prikazani
// raspon ostaje zamrznut kako je bio, umjesto da se tiho zamijeni novim
// (drugačijim) rasponom svaki put kad se raspored ažurira zbog nekog drugog
// dana. Bez `today` ponašanje je kao ranije (samo done dani su zaštićeni).
export function regenerateFromTempo(plan, { pages, editionId, linesPerDay, restDays, startLine, today }) {
  // Već naučeni dani ne smiju "trošiti" redove u regeneraciji (ta linija je već
  // potrošena u startLine) - privremeno ih tretiramo kao slobodne dane samo za
  // potrebe raspodjele, da bi novi tempo ispravno krenuo TAČNO od startLine na
  // prvom sljedećem neodučenom danu. Isto vrijedi i za prošle-a-neodučene dane.
  const doneDates = plan.days.filter((d) => d.done).map((d) => d.date);
  const pastUndoneDates = today
    ? plan.days.filter((d) => !d.done && d.date < today).map((d) => d.date)
    : [];
  const effectiveRestDays = Array.from(new Set([...(restDays || []), ...doneDates, ...pastUndoneDates]));

  const regen = generateMonthlyPlan({
    year: plan.year, month: plan.month, pages, editionId, linesPerDay,
    restDays: effectiveRestDays, startLine,
  });

  const frozenDates = new Set([...doneDates, ...pastUndoneDates]);
  const merged = regen.days.map((nd) => {
    const old = plan.days.find((d) => d.date === nd.date);
    if (old && frozenDates.has(nd.date)) return old; // već naučeno ili već prošlo - zadrži kako jeste
    return old ? { ...nd, upisNaucenog: old.upisNaucenog, biljeska: old.biljeska, oznakaGreske: old.oznakaGreske } : nd;
  });

  return { ...regen, days: merged };
}

// Naknadno dodavanje/uklanjanje slobodnog dana (ili "prolongiranje" jednog
// dana) → preraspodjela OSTATKA. Već naučeni (done) dani se NIKAD ne diraju
// retroaktivno - isti princip zaštite kao u regenerateFromTempo iznad: done
// dani se, samo radi računa raspodjele, tretiraju kao "potrošeni" (rest), a
// njihov stvarni sadržaj/oznaka "naučeno" se ispod potpuno zadržava netaknut.
// `today` (opciono) - isti princip zaštite kao u regenerateFromTempo: prošli
// dani koji nisu naučeni se ne prepisuju (osim samog dana koji se upravo
// prebacuje - taj se uvijek mijenja, to je svrha ove funkcije).
export function toggleRestDay(plan, date, { pages, editionId, linesPerDay, today }) {
  const target = plan.days.find((d) => d.date === date);
  if (!target) return plan;

  const doneDates = plan.days.filter((d) => d.done).map((d) => d.date);
  const doneLines = plan.days
    .filter((d) => d.done)
    .reduce((acc, d) => acc + (Number(d.actualLines) || d.learning?.lineCount || 0), 0);
  const pastUndoneDates = today
    ? plan.days.filter((d) => !d.done && d.date < today && d.date !== date).map((d) => d.date)
    : [];

  const newRestDays = Array.from(new Set([
    ...plan.days
      .filter((d) => !d.done && (d.date === date ? !d.isRest : d.isRest))
      .map((d) => d.date),
    ...doneDates,
    ...pastUndoneDates,
  ]));

  const regen = generateMonthlyPlan({
    year: plan.year, month: plan.month, pages, editionId, linesPerDay,
    restDays: newRestDays, startLine: doneLines,
  });

  const frozenDates = new Set([...doneDates, ...pastUndoneDates]);
  // sačuvaj upise/bilješke postojećih dana; već naučeni i prošli-neodučeni dani ostaju POTPUNO netaknuti
  const merged = regen.days.map((nd) => {
    const old = plan.days.find((d) => d.date === nd.date);
    if (old && frozenDates.has(nd.date)) return old;
    return old ? { ...nd, upisNaucenog: old.upisNaucenog, biljeska: old.biljeska, oznakaGreske: old.oznakaGreske } : nd;
  });

  return { ...regen, days: merged };
}

// ── Format za print (čist model - PlanPrintView ga samo renderuje) ──────────
export function printableModel(plan, { language = "bs" } = {}) {
  const L = language === "en"
    ? { rest: "Rest day — extra review", learn: "Learn", review: "Review", notes: "Notes", entry: "Learned (fill in)" }
    : { rest: "Slobodan dan — pojačano ponavljanje", learn: "Učenje", review: "Ponavljanje", notes: "Bilješke", entry: "Naučeno (upiši)" };

  return plan.days.map((d) => ({
    date: d.date,
    dayLabel: d.isRest ? L.rest : null,
    learning: d.learning
      ? `${d.learning.from.page}:${d.learning.from.line} → ${d.learning.to.page}:${d.learning.to.line} (${d.learning.lineCount})`
      : "",
    review: typeof d.review === "string" ? d.review : d.review?.label || "",
    upisNaucenog: d.upisNaucenog,
    biljeska: d.biljeska + (d.oznakaGreske ? " ⚠" : ""),
    labels: L,
  }));
}

// ── Statistika mjeseca ──────────────────────────────────────────────────────
export function monthStats(plan) {
  const planirano = plan.days.reduce((s, d) => s + (d.learning?.lineCount || 0), 0);
  const popunjeno = plan.days.filter((d) => d.upisNaucenog).length;
  const greske = plan.days.filter((d) => d.oznakaGreske).length;
  return { planiranoRedova: planirano, danaPopunjeno: popunjeno, danaSaGreskom: greske };
}
