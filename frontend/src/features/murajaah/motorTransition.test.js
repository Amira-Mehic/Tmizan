// ============================================================================
// motorTransition.js - testovi
// Pokretanje:  node src/features/murajaah/motorTransition.test.js   (iz frontend/)
// ============================================================================

import { justFinished, mergeIntoPool, shouldDemote, removeFromPool } from "./motorTransition.js";

let passed = 0, failed = 0;
function assert(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; console.error(`✗ ${name}\n    očekivano: ${e}\n    dobijeno:  ${a}`); }
}

// ── justFinished ─────────────────────────────────────────────────────────
{
  assert("justFinished: prelaz false→true", justFinished({ finished: false }, { finished: true }), true);
  assert("justFinished: već finished prije → nema novog prelaza", justFinished({ finished: true }, { finished: true }), false);
  assert("justFinished: i dalje nije finished", justFinished({ finished: false }, { finished: false }), false);
}

// ── mergeIntoPool ────────────────────────────────────────────────────────
{
  assert("merge: dodaje nove, dedup, sortirano", mergeIntoPool([5, 1, 3], [3, 2]), [1, 2, 3, 5]);
  assert("merge: prazan postojeći bazen", mergeIntoPool([], [10, 2]), [2, 10]);
  assert("merge: prazne nove stranice", mergeIntoPool([1, 2], []), [1, 2]);
}

// ── shouldDemote ─────────────────────────────────────────────────────────
{
  assert("demote: 2 greške → ne", shouldDemote(2), false);
  assert("demote: 3 greške → da", shouldDemote(3), true);
  assert("demote: 5 grešaka → da", shouldDemote(5), true);
  assert("demote: prilagođen prag", shouldDemote(2, 2), true);
}

// ── removeFromPool ───────────────────────────────────────────────────────
{
  assert("remove: uklanja stranicu", removeFromPool([1, 2, 3], 2), [1, 3]);
  assert("remove: stranica koje nema — nema promjene", removeFromPool([1, 3], 2), [1, 3]);
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
