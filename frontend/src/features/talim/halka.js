// ============================================================================
// Ta'lim - Halka / mentorska metoda
//
// Mentor (muallim) zadaje dio; učenik ga pripremi; mentor presluša.
// Kad je čisto - mentor OTKLJUČAVA sljedeći dio. Jedinica: rub' ili stranica.
// Tempo zavisi od mentora → datum završetka je OKVIRAN.
//
// Mašina stanja jednog zadatka:
//   zadano → pripremljeno → (preslušano čisto → odobreno) | (nije čisto → zadano ponovo)
// ============================================================================

export const UNIT_RUB_PAGES = 2.5; // rub' = četvrtina hizba ≈ 2,5 stranice

export const TASK_STATES = ["zadano", "pripremljeno", "odobreno"];

// ── Kreiranje plana: lista dijelova redoslijedom kojim ih mentor zadaje ─────
// parts: [{ id, label, pages: [...] }] - npr. rubovi ili pojedinačne stranice
export function createPlan(parts) {
  if (!parts?.length) throw new Error("Plan mora imati bar jedan dio");
  return {
    parts: parts.map((p, i) => ({
      ...p,
      index: i,
      state: i === 0 ? "zadano" : "zakljucano",
      deadline: null,
      mentorNote: "",
      preslusavanja: 0, // broj pokušaja pred mentorom
    })),
    currentIndex: 0,
    finished: false,
  };
}

export function currentPart(plan) {
  return plan.finished ? null : plan.parts[plan.currentIndex];
}

// ── Mentor zadaje dio (rok + smjernice) ─────────────────────────────────────
export function assign(plan, { deadline = null, mentorNote = "" } = {}) {
  const part = currentPart(plan);
  if (!part || part.state !== "zadano") return plan;
  return updatePart(plan, plan.currentIndex, { deadline, mentorNote });
}

// ── Učenik je sam pripremio dio ─────────────────────────────────────────────
export function markPrepared(plan) {
  const part = currentPart(plan);
  if (!part || part.state !== "zadano") return plan;
  return updatePart(plan, plan.currentIndex, { state: "pripremljeno" });
}

// ── Mentor preslušava ───────────────────────────────────────────────────────
// clean = true  → dio odobren, OTKLJUČAVA se sljedeći
// clean = false → nazad na pripremu (isti dio)
export function mentorReview(plan, { clean }) {
  const part = currentPart(plan);
  if (!part || part.state !== "pripremljeno") return plan;

  let next = updatePart(plan, plan.currentIndex, {
    preslusavanja: part.preslusavanja + 1,
  });

  if (!clean) {
    return updatePart(next, plan.currentIndex, { state: "zadano" });
  }

  next = updatePart(next, plan.currentIndex, { state: "odobreno" });
  const nextIndex = plan.currentIndex + 1;

  if (nextIndex >= plan.parts.length) {
    return { ...next, finished: true };
  }
  next = updatePart(next, nextIndex, { state: "zadano" });
  return { ...next, currentIndex: nextIndex };
}

function updatePart(plan, index, changes) {
  const parts = plan.parts.map((p, i) => (i === index ? { ...p, ...changes } : p));
  return { ...plan, parts };
}

// ── Okvirni datum završetka ─────────────────────────────────────────────────
// Iz prosjeka: koliko dana u prosjeku prođe između dva odobrenja.
// approvalDates: datumi dosadašnjih odobrenja ("YYYY-MM-DD")
export function estimateDaysLeft(plan, approvalDates) {
  const remaining = plan.parts.filter((p) => p.state !== "odobreno").length;
  if (remaining === 0) return 0;
  if (!approvalDates || approvalDates.length < 2) return null; // premalo podataka - okvirno nepoznato

  const first = approvalDates[0];
  const last = approvalDates[approvalDates.length - 1];
  const spanDays = Math.max(
    1,
    Math.round((new Date(last) - new Date(first)) / 86400000)
  );
  const avgDaysPerPart = spanDays / (approvalDates.length - 1);
  return Math.ceil(remaining * avgDaysPerPart);
}

export function progressPercent(plan) {
  const done = plan.parts.filter((p) => p.state === "odobreno").length;
  return Math.round((done / plan.parts.length) * 100);
}
