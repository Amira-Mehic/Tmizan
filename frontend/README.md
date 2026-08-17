# Tmizan

Informacioni sistem za evidenciju i planiranje hifza Kur'ana. Progresivna web
aplikacija izrađena u Reactu, s Vite alatom za gradnju i Supabase platformom kao
bazom podataka i aplikacijskim slojem.

Diplomski rad, Univerzitet u Zenici, Politehnički fakultet.

## Pokretanje

Potreban je Node.js verzije 20 ili novije.

```
npm install
npm run dev
```

Aplikacija se otvara na `http://localhost:5173`.

Prije pokretanja prekopirati `.env.example` u `.env` i upisati podatke Supabase
projekta:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Pokretanje kroz Docker

Iz korijena projekta, jednom komandom:

```
docker compose up --build
```

Aplikacija se otvara na `http://localhost:8080`.

## Testovi

```
node scripts/run-tests.js
```

Pokreće sve jedinične testove i ispisuje zbirni rezultat. Testovi pokrivaju
motore ponavljanja i generisanje plana učenja.

Statička provjera koda:

```
npx eslint src
```

## Arhitektura

Sistem nema vlastiti aplikacijski poslužitelj. Poslovna logika smještena je u
klijentskoj aplikaciji, a Supabase istovremeno služi kao baza podataka i
aplikacijski sloj: autentifikacija, sigurnosna pravila na nivou reda (RLS),
funkcije baze i zakazani poslovi izvršavaju se unutar same baze.

## Struktura

| Putanja | Sadržaj |
|---|---|
| `src/features/murajaah` | motori ponavljanja, metode i modifikatori |
| `src/features/talim` | generisanje plana učenja i mjesečnog rasporeda |
| `src/pages` | ekrani, razdvojeni po ulogama |
| `src/components` | zajedničke komponente sučelja |
| `src/context` | globalno stanje: prijava, tema, jezik |
| `src/hooks` | dohvat i obrada podataka |
| `../supabase/migrations` | migracije baze podataka |
| `../supabase/seed` | punjenje referentnog kur'anskog sadržaja |
