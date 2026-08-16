// ============================================================================
// Pokreće sve *.test.js fajlove pod src/ jedan po jedan (svaki je samostalan
// Node skript, ne koristi test framework - vidi header komentare u samim
// test fajlovima). Ovaj runner ih samo redom izvršava i sabira rezultate,
// da postoji jedan "npm test" umjesto ručnog pokretanja svakog fajla.
// ============================================================================


import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Putanju do src/ računam iz lokacije samog ovog skripta, a ne iz trenutnog
// foldera, da "npm test" radi isto bez obzira odakle je pokrenut.
const ROOT = new URL("../src", import.meta.url).pathname;

// ── Pronalaženje test fajlova ───────────────────────────────────────────────
// Testovi stoje uz kod koji testiraju, a ne u zasebnom test folderu, pa ih
// moram tražiti kroz cijelo stablo src/. Funkcija se rekurzivno spušta kroz
// podfoldere i skuplja sve što se završava na .test.js.
function findTestFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...findTestFiles(full));
    } else if (entry.endsWith(".test.js")) {
      out.push(full);
    }
  }
  return out;
}

// Sortira da redoslijed ispisa bude uvijek isti - inače zavisi od toga kako
// operativni sistem vraća sadržaj foldera, pa se ispisi teško porede.
const files = findTestFiles(ROOT).sort();

// Ako testova nema, to nije greška nego samo prazan rezultat, pa izlazi s
// kodom 0 da ne oborim build bez razloga.
if (!files.length) {
  console.log("Nema pronađenih *.test.js fajlova pod src/.");
  process.exit(0);
}

let failedFiles = [];
let totalPassed = 0;
let totalFailed = 0;

// ── Pokretanje ──────────────────────────────────────────────────────────────
// Svaki test pokreće se kao zaseban Node proces, a ne tako što se uveze u
// ovaj fajl. Razlog je što test fajlovi na kraju zovu process.exit(1) kad neka
// provjera padne - da se uvoze, prvi pali test bi ugasio i sam runner i
// ostali testovi se nikad ne bi pokrenuli. Ovako pad jednog fajla ostaje
// ograničen na njegov proces, a ovde se samo zabilježi da je pao i ide se dalje.
for (const file of files) {
  const label = relative(process.cwd(), file);
  process.stdout.write(`\n── ${label} ──\n`);
  try {
    const output = execFileSync("node", [file], { encoding: "utf8" });
    process.stdout.write(output);

    // Svaki test fajl na kraju ispiše red oblika "N testova prošlo, M palo".
    // Odavde se čita kako bi se mogao sabrati ukupan broj kroz sve fajlove.
    // Obrazac hvata i "test/testova" i "palo/pali", te varijantu bez kvačica,
    // jer se ispisi kroz fajlove ne pišu potpuno jednako.
    const m = output.match(/(\d+)\s+testova?\s+pro[šs]lo,\s+(\d+)\s+pal[oi]/i);
    if (m) {
      totalPassed += parseInt(m[1], 10);
      totalFailed += parseInt(m[2], 10);
    }
  } catch (e) {
    // execFileSync baca grešku čim proces izađe s kodom različitim od nule,
    // dakle upravo kad je test pao. Ispis koji je proces stigao proizvesti
    // prije pada i dalje stoji na objektu greške, pa se prosljeđuje dalje da
    // se u konzoli vidi koja je tačno provjera pukla.
    failedFiles.push(label);
    process.stdout.write(e.stdout || "");
    process.stderr.write(e.stderr || String(e));
  }
}

// ── Zbirni ispis ────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(60));
console.log(`Fajlova: ${files.length} — palih fajlova: ${failedFiles.length}`);
if (totalPassed || totalFailed) {
  console.log(`Ukupno testova: ${totalPassed + totalFailed} — prošlo ${totalPassed}, palo ${totalFailed}`);
}

// Ako je ijedan fajl pao, i sam runner izlazi s kodom 1. Time "npm test"
// vraća neuspjeh, što je bitno ako se ovo ikad veže na automatsku provjeru
// prije objave.
if (failedFiles.length) {
  console.log("Fajlovi s greškom:");
  failedFiles.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("Svi testovi prošli. ✓");
