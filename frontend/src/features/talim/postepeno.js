// ============================================================================
// Ta'lim - Postepeno nadograđivanje (metoda 20 ponavljanja)
//
// Uči se ajet po ajet: svaki ×20, pa spajanje s prethodnim ×20,
// dok se cijela stranica ne poveže; na kraju cijela stranica ×20.
// Prije nove stranice: jučerašnja stranica ×20 radi utvrđivanja.
// Broj ponavljanja je podesiv (zadano 20); brojač može rasti ili opadati.
// Tempo je pod kontrolom → datum završetka je TAČAN.
// ============================================================================

export const DEFAULT_REPS = 20;
export const HIZB_PAGES = 2.5; // preporuka: dnevno ne preći jedan hizb

// ── Gradnja niza koraka za jednu stranicu ───────────────────────────────────
// ayahKeys: redoslijed ajeta na stranici, npr. ["2:1","2:2","2:3"]
// prevPageDone: ako postoji jučerašnja stranica → prvi korak je utvrđivanje
export function buildSteps(ayahKeys, { reps = DEFAULT_REPS, prevPageDone = false } = {}) {
  if (!ayahKeys?.length) throw new Error("Stranica mora imati bar jedan ajet");
  if (reps < 1) throw new Error("Broj ponavljanja mora biti bar 1");

  const steps = [];

  // 0) utvrđivanje prethodne stranice PRIJE nove
  if (prevPageDone) {
    steps.push({ type: "utvrdi_prethodnu", label: "Jučerašnja stranica — utvrđivanje", reps });
  }

  ayahKeys.forEach((key, i) => {
    // pojedinačni ajet ×reps
    steps.push({ type: "ajet", key, label: `Ajet ${key}`, reps });
    // spajanje: ajeti 1..i zajedno ×reps (tek od drugog ajeta)
    if (i > 0) {
      steps.push({
        type: "spoj",
        from: ayahKeys[0],
        to: key,
        label: `Ajeti ${ayahKeys[0]}–${key} zajedno`,
        reps,
      });
    }
  });

  // cijela stranica u komadu ×reps
  steps.push({ type: "stranica", label: "Cijela stranica u komadu", reps });

  return steps;
}

// ── Stanje sesije učenja ────────────────────────────────────────────────────
export function createSession(ayahKeys, opts = {}) {
  const steps = buildSteps(ayahKeys, opts);
  return {
    steps,
    stepIndex: 0,
    count: 0,                          // koliko puta je trenutni korak proučen
    counterMode: opts.counterMode || "up", // "up" = broji od 0 do reps, "down" = od reps do 0
    finished: false,
  };
}

// ── Jedan klik brojača (jedno proučavanje) ──────────────────────────────────
// Vraća novo stanje; kad korak dosegne reps → automatski sljedeći korak.
export function tick(session) {
  if (session.finished) return session;

  const step = session.steps[session.stepIndex];
  const count = session.count + 1;

  if (count >= step.reps) {
    const nextIndex = session.stepIndex + 1;
    if (nextIndex >= session.steps.length) {
      // stranica potpuno sastavljena → blok automatski ide u sistem ponavljanja
      return { ...session, count: step.reps, finished: true };
    }
    return { ...session, stepIndex: nextIndex, count: 0 };
  }
  return { ...session, count };
}

// Prikaz brojača prema odabranom modu
export function counterDisplay(session) {
  const step = session.steps[session.stepIndex];
  return session.counterMode === "down" ? step.reps - session.count : session.count;
}

export function currentStep(session) {
  return session.steps[session.stepIndex];
}

export function progress(session) {
  return {
    step: session.stepIndex + 1,
    totalSteps: session.steps.length,
    percent: Math.round((session.stepIndex / session.steps.length) * 100),
    finished: session.finished,
  };
}

// ── Provjera dnevne granice ─────────────────────────────────────────────────
export function exceedsDailyLimit(pagesPlannedToday) {
  return pagesPlannedToday > HIZB_PAGES;
}
