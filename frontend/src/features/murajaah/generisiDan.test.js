// ============================================================================
// generisiDan.js - testovi
// Pokretanje:  node src/features/murajaah/generisiDan.test.js   (iz frontend/)
// ============================================================================

import { generisiDan, podijeliNaSesije, poredajStavke, seedOdStringa } from "./generisiDan.js";

let passed = 0, failed = 0;
function assert(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; console.error(`✗ ${name}\n    očekivano: ${e}\n    dobijeno:  ${a}`); }
}

// ── Prioritet slojeva ────────────────────────────────────────────────────
{
  const out = generisiDan({
    mualimNalozi: [{ id: "m1" }],
    motorBDospjeli: [{ id: "b1" }, { id: "b2" }],
    redSlabih: [{ id: "s1" }],
    motorAStavke: [{ id: "a1" }, { id: "a2" }, { id: "a3" }],
    kvota: 10,
  });
  assert("redoslijed: mualim → motorB → slabi → motorA", out.map((x) => x.id), ["m1", "b1", "b2", "s1", "a1", "a2", "a3"]);
  assert("sloj označen ispravno", out.map((x) => x.sloj), ["mualim", "motorB", "motorB", "slabi", "motorA", "motorA", "motorA"]);
}

// ── Motor A popunjava SAMO ostatak kvote ────────────────────────────────
{
  const out = generisiDan({
    motorBDospjeli: [{ id: "b1" }, { id: "b2" }, { id: "b3" }],
    motorAStavke: [{ id: "a1" }, { id: "a2" }, { id: "a3" }, { id: "a4" }],
    kvota: 5,
  });
  // 3 iz motorB, preostalo = 5-3 = 2 iz motorA
  assert("motorA popunjava ostatak (2 od 4)", out.filter((x) => x.sloj === "motorA").length, 2);
  assert("ukupno = kvota kad ima dovoljno stavki", out.length, 5);
}

// ── dnevniMaxB ograničava Motor B ────────────────────────────────────────
{
  const out = generisiDan({
    motorBDospjeli: [{ id: "b1" }, { id: "b2" }, { id: "b3" }, { id: "b4" }],
    dnevniMaxB: 2,
    kvota: 20,
  });
  assert("dnevniMaxB: samo 2 od 4 motorB stavke", out.filter((x) => x.sloj === "motorB").length, 2);
}

// ── maxSlabihDnevno ograničava red slabih ───────────────────────────────
{
  const out = generisiDan({
    redSlabih: [{ id: "s1" }, { id: "s2" }, { id: "s3" }, { id: "s4" }],
    maxSlabihDnevno: 2,
    kvota: 20,
  });
  assert("maxSlabihDnevno: samo 2 od 4 slabe stavke", out.filter((x) => x.sloj === "slabi").length, 2);
}

// ── Kapa protiv lavine (max = kvota × 1.5) ──────────────────────────────
{
  const out = generisiDan({
    mualimNalozi: Array.from({ length: 10 }, (_, i) => ({ id: `m${i}` })),
    kvota: 4,
  });
  assert("kapa: max 6 stavki (4 × 1.5)", out.length, 6);
}

// ── Bez kvote (null) - nema kape, sve prolazi ───────────────────────────
{
  const out = generisiDan({
    motorAStavke: Array.from({ length: 20 }, (_, i) => ({ id: `a${i}` })),
    kvota: null,
  });
  assert("bez kvote: sve stavke motora A prolaze", out.length, 20);
}

// ── podijeliNaSesije ─────────────────────────────────────────────────────
{
  const stavke = [1, 2, 3, 4, 5, 6, 7];
  assert("sesije: 1 sesija = sve u jednoj", podijeliNaSesije(stavke, 1), [[1, 2, 3, 4, 5, 6, 7]]);
  assert("sesije: 2 sesije (jutro/veče)", podijeliNaSesije(stavke, 2), [[1, 2, 3, 4], [5, 6, 7]]);
  assert("sesije: 3 sesije", podijeliNaSesije(stavke, 3), [[1, 2, 3], [4, 5, 6], [7]]);
}

// ── poredajStavke - redoslijed (dokument, wizard korak "Raspored") ─────────
{
  const stavke = [{ ref: 30 }, { ref: 10 }, { ref: 20 }];
  assert("redoslijed: od_pocetka (rastuće po stranici)",
    poredajStavke(stavke, "od_pocetka").map((x) => x.ref), [10, 20, 30]);
  assert("redoslijed: od_kraja (opadajuće po stranici)",
    poredajStavke(stavke, "od_kraja").map((x) => x.ref), [30, 20, 10]);

  const saSkorom = [{ ref: 1, skor: 3 }, { ref: 2, skor: 9 }, { ref: 3, skor: 5 }];
  assert("redoslijed: najslabiji (opadajuće po skoru)",
    poredajStavke(saSkorom, "najslabiji", { skorOf: (x) => x.skor }).map((x) => x.ref), [2, 3, 1]);

  const promiješano = poredajStavke(stavke, "nasumicno", { seed: 42 });
  assert("redoslijed: nasumicno je permutacija (isti elementi)",
    [...promiješano.map((x) => x.ref)].sort((a, b) => a - b), [10, 20, 30]);
  const opet = poredajStavke(stavke, "nasumicno", { seed: 42 });
  assert("redoslijed: nasumicno je STABILNO za isti seed",
    promiješano.map((x) => x.ref), opet.map((x) => x.ref));

  assert("redoslijed: ne mutira originalni niz", stavke.map((x) => x.ref), [30, 10, 20]);
}

// ── seedOdStringa ────────────────────────────────────────────────────────
{
  assert("seed: isti string uvijek isti seed", seedOdStringa("2026-08-06"), seedOdStringa("2026-08-06"));
  assert("seed: različit string → (skoro sigurno) različit seed",
    seedOdStringa("2026-08-06") !== seedOdStringa("2026-08-07"), true);
}

console.log(`\n${passed} testova prošlo, ${failed} palo.`);
if (failed > 0) process.exit(1);
