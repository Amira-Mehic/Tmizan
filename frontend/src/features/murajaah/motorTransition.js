// ============================================================================
// Murajaa - pravilo prelaska B→A i A→B ("kičma sistema", dokument
// arhitekture sekcija 1.4).
//
// B→A: kad blok Motora B (tri_dana/sedam_dana/fibonacci/srs) PRVI PUT prođe
// zadnji interval bez greške (block.finished postane true), njegove
// stranice ulaze u bazen Motora A (rotation_state.items tipa "stranice" -
// univerzalni fallback, uvijek dostupan). Ništa se ne ažurira ručno: bazen
// naraste, ciklus se sam produži (ciklusDana = items.length / quota).
//
// A→B: kad stranica u Motoru A dobije 3+ greške u tekućem ciklusu
// (error_tracking.recent_errors, isti prag "kritično" kao greske.js), ta
// stranica izlazi iz Motora A bazena i ulazi u NOVI Motor B blok (SRS -
// najblaža metoda, dokument 4.11) dok se ponovo ne stabilizuje.
//
// Ovaj modul je ČISTA logika (bez baze) - servisni sloj (murajaahService.js
// za B→A, rotationService.js/greskeService.js za A→B) samo poziva ove
// funkcije i upisuje rezultat.
// ============================================================================

export const DEMOTE_ERROR_THRESHOLD = 3;

// ── B→A: da li se blok TEK SADA (ova provjera) prebacuje u Motor A -
//    razlika između stanja PRIJE i POSLIJE ovog ponavljanja, da se svaki
//    naredni "correct" na već-finished bloku ne pokušava ponovo graduirati.
export function justFinished(blockBefore, blockAfter) {
  return !!blockAfter?.finished && !blockBefore?.finished;
}

// ── B→A: spoji nove stranice u postojeći bazen (dedup + sortirano). ────────
export function mergeIntoPool(existingItems, newPages) {
  return [...new Set([...(existingItems || []), ...(newPages || [])])].sort((a, b) => a - b);
}

// ── A→B: da li stranica prelazi u Motor B (dovoljno grešaka u ciklusu). ────
export function shouldDemote(recentErrors, threshold = DEMOTE_ERROR_THRESHOLD) {
  return (recentErrors || 0) >= threshold;
}

// ── A→B: ukloni stranicu iz bazena Motora A (izlazi iz ciklusa dok se ne
//    ponovo utvrdi kroz Motor B). ───────────────────────────────────────────
export function removeFromPool(items, page) {
  return (items || []).filter((p) => p !== page);
}
