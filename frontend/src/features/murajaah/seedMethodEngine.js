// ============================================================================
// Inicijalizuje stvarni motor za odabranu metodu ponavljanja (rotation_state
// / femi_state / review_blocks / page_progress.sljedece_ponavljanje), tako
// da "šta je danas na redu" radi ODMAH nakon aktivacije plana. Prima
// eksplicitan userId - poziva ga i učenik za sebe (HifzPlannerPage.jsx
// aktivirajPlan/resetujPlan) i muallim za povezanog učenika
// (mualimService.js assignReviewPlan - vidi RLS u 0027_mualim_generise_plan.sql).
//
// Metode koje ovdje NEMAJU granu namjerno je ne trebaju:
//  - greske:   prati POSTOJEĆE greške iz error_tracking, uvijek je aktivno
//  - slobodan: namjerno bez automatike, samo ručno bilježenje
//  - mualim:   raspored ručno zadaje muallim kroz "mualim_review_plans", ne ovaj motor
// ============================================================================

import { supabase } from "../../services/SupaBaseClient";
import { getJuzPages } from "../../constants/hifz/helpers";
import { partitionPages } from "./motorA";
import { seedRotationPages } from "./rotationService";
import { createReviewBlock, createReviewBlocksBulk } from "./murajaahService";
import { addDays } from "./engine";

export async function seedMethodEngine(methodId, { userId, pagesArr, dzuzArr, ajetiArr = [], today, tempo }) {
  // ── Kružne metode (rotation_state = SAMO parametri; raspored po stranici
  //    ide u page_progress.sljedece_ponavljanje preko seedRotationPages) ──
  if (methodId === "dzuzevi" && dzuzArr.length) {
    await supabase.from("rotation_state").upsert({
      user_id: userId, method: "dzuzevi", items: dzuzArr, cycles_done: 0, cycle_start: null,
    }, { onConflict: "user_id,method" })
    const units = dzuzArr.map((juz) => getJuzPages(juz))
    await seedRotationPages(userId, "dzuzevi", units, { startDate: today })
    return
  }
  if (methodId === "stranice" && pagesArr.length) {
    // Kvota dolazi iz odabranog tempa ako postoji (za sad samo "hafiz"),
    // inače podrazumijevanih 5 str/dan kao i do sad.
    const quota = tempo?.dailyQtyPages || 5
    await supabase.from("rotation_state").upsert({
      user_id: userId, method: "stranice", items: pagesArr,
      quota, cycles_done: 0, cycle_start: null,
    }, { onConflict: "user_id,method" })
    const units = partitionPages(pagesArr, Math.max(1, Math.ceil(pagesArr.length / quota)))
    await seedRotationPages(userId, "stranice", units, { startDate: today })
    return
  }
  if (methodId === "seton" && pagesArr.length) {
    await supabase.from("rotation_state").upsert({
      user_id: userId, method: "seton", items: pagesArr, parts: 8, cycles_done: 0, cycle_start: null,
    }, { onConflict: "user_id,method" })
    const units = partitionPages(pagesArr, 8)
    await seedRotationPages(userId, "seton", units, { startDate: today })
    return
  }
  // Dinamična raspodjela - SVOJA logika (dinamicna.js), radi nad last_repeat
  // (ne treba nikakvo posebno zasijavanje stranica - "nikad ponovljeno" je
  // već ispravan početni izvor istine). Dužina ciklusa dolazi iz odabranog
  // tempa ako postoji, inače podrazumijevanih 30 dana.
  if (methodId === "dinamicna" && pagesArr.length) {
    await supabase.from("rotation_state").upsert({
      user_id: userId, method: "dinamicna", items: pagesArr,
      quota: tempo?.totalDays || 30, cycles_done: 0, cycle_start: null,
    }, { onConflict: "user_id,method" })
    return
  }

  // ── Sedmične metode (femi_state = SAMO parametri; Femi je Dinamična sa
  //    ciklusom od 7 dana - vidi femi.js - pa ni njoj ne treba zasijavanje) ──
  if (methodId === "femi" && pagesArr.length) {
    await supabase.from("femi_state").upsert({
      user_id: userId, method: "femi", items: pagesArr, juz_index: 0, cycles_done: 0, week_start: today,
    }, { onConflict: "user_id,method" })
    return
  }
  if (methodId === "dzuz_sedmica" && dzuzArr.length) {
    await supabase.from("femi_state").upsert({
      user_id: userId, method: "dzuz_sedmicno", items: dzuzArr, juz_index: 0, cycles_done: 0, week_start: today,
    }, { onConflict: "user_id,method" })
    return
  }

  // ── Intervalne metode (review_blocks - isti motor kao ručni blokovi na
  //    Murajaa stranici).
  //    Opseg se dijeli na VIŠE manjih blokova veličine tempa (ili
  //    podrazumijevanih 5 str/dan ako tempo nije zadan - isti podrazumijevani
  //    broj koji koristi i metoda "Po stranicama"), koji kreću RAZMAKNUTO
  //    (dan po dan) - umjesto da se svih 604 (ili koliko god) stranica strpa
  //    u JEDAN blok koji bi tražio da se sve ponovi odjednom istog dana. Svaki
  //    mali blok ide kroz isti intervalni ritam metode (fibonacci/tri_dana/...)
  //    sam za sebe, pa se njihovi termini ponavljanja prirodno raspoređuju
  //    kroz vrijeme. ──
  if (["fibonacci", "tri_dana", "sedam_dana", "srs"].includes(methodId) && (pagesArr.length || ajetiArr.length)) {
    // "ajeti" opseg (unitType "ajet") ima prednost kad je zadan - engine.js
    // je potpuno neovisan o jedinici (UNIT_TYPES već uključuje "ajet"), samo
    // dijeli "items" na blokove, pa je ista logika ispod ispravna za oba.
    const jeAjeti = ajetiArr.length > 0
    const unitType = jeAjeti ? "ajet" : "stranica"
    const itemsArr = jeAjeti ? ajetiArr : pagesArr
    const chunkSize = tempo?.dailyQtyPages || 5
    if (itemsArr.length > chunkSize) {
      const blocksInput = []
      for (let i = 0; i * chunkSize < itemsArr.length; i++) {
        blocksInput.push({
          unitType,
          items: itemsArr.slice(i * chunkSize, (i + 1) * chunkSize),
          label: "",
          learnedOn: addDays(today, i),
          methodId,
        })
      }
      await createReviewBlocksBulk(userId, blocksInput)
    } else {
      await createReviewBlock(userId, { unitType, items: itemsArr, label: "", learnedOn: today, methodId })
    }
    return
  }

  // "Novo i staro" nije samostalan raspoređivač - to je dnevna sesija koja
  // POSTOJEĆE blokove dijeli po starosti (vidi novoStaro.js). Seed-ujemo
  // početni blok (motor "tri_dana") da sesija odmah ima sadržaj za podjelu.
  if (methodId === "novo_staro" && pagesArr.length) {
    await createReviewBlock(userId, { unitType: "stranica", items: pagesArr, label: "", learnedOn: today, methodId: "tri_dana" })
    return
  }
}
