# Tmizan

Informacioni sistem za evidenciju i planiranje hifza Kur'ana. Progresivna web
aplikacija (PWA) izrađena u Reactu, s Vite alatom za gradnju i Supabase
platformom kao bazom podataka i aplikacijskim slojem.

Diplomski rad, Univerzitet u Zenici, Politehnički fakultet, odsjek Softversko
inženjerstvo.

## Pokretanje kroz Docker

Najjednostavniji način, ne zahtijeva instaliran Node.js. Iz korijena projekta:

```
docker compose up --build
```

Aplikacija se otvara na `http://localhost:8080`.

Prije pokretanja prekopirati `.env.example` u `.env` i upisati podatke Supabase
projekta. Varijable se ugrađuju u aplikaciju u trenutku gradnje, pa moraju
postojati prije pokretanja komande.

## Pokretanje bez Dockera

Potreban je Node.js verzije 20.19 ili novije.

```
cd frontend
npm install
npm run dev
```

Aplikacija se otvara na `http://localhost:5173`. Komanda `npm install` pokreće
se jednom, poslije toga je dovoljno `npm run dev`.

## Konfiguracija

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Anonimni ključ smije biti javno vidljiv jer pristup podacima ograničavaju
sigurnosna pravila baze (Row Level Security), a ne tajnost ključa.

## Baza podataka

Shema se postavlja migracijama iz `supabase/migrations`, redom po broju.
Referentni kur'anski sadržaj puni se skriptama iz `supabase/seed`.

## Testovi

```
cd frontend
npm test
```

Pokreće sve jedinične testove i ispisuje zbirni rezultat. Testovi pokrivaju
motore ponavljanja, metode učenja i generisanje mjesečnog plana.

Statička provjera koda:

```
npx eslint src
```

## Arhitektura

Sistem nema vlastiti aplikacijski poslužitelj. Poslovna logika smještena je u
klijentskoj aplikaciji, a Supabase istovremeno služi kao baza podataka i
aplikacijski sloj: autentifikacija, sigurnosna pravila na nivou reda, funkcije
baze i zakazani poslovi izvršavaju se unutar same baze.

## Struktura

| Putanja | Sadržaj |
|---|---|
| `frontend/src/features/murajaah` | motori ponavljanja, metode i modifikatori |
| `frontend/src/features/talim` | generisanje plana učenja i mjesečnog rasporeda |
| `frontend/src/pages` | ekrani, razdvojeni po ulogama |
| `frontend/src/components` | zajedničke komponente sučelja |
| `frontend/src/context` | globalno stanje: prijava, tema, jezik |
| `frontend/src/hooks` | dohvat i obrada podataka |
| `supabase/migrations` | migracije baze podataka |
| `supabase/seed` | punjenje referentnog kur'anskog sadržaja |
| `supabase/functions` | funkcija za podsjetnike na časove |
