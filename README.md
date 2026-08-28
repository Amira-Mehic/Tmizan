# Tmizan
Informacioni sistem za evidenciju i planiranje hifza Kur'ana. Progresivna web
aplikacija (PWA) izrađena u Reactu, s Vite alatom za gradnju i Supabase
platformom kao bazom podataka i aplikacijskim slojem.


## Pokretanje
Projekat se može pokrenuti na četiri načina, zavisno od toga da li se koristi
Docker ili Node.js direktno, i da li se baza povezuje lokalno ili na Supabase
projekat u oblaku. Sve četiri varijante su ravnopravne i pokreću istu
aplikaciju - razlika je samo u tome gdje se nalazi baza podataka. Peti
način (produkcija na Vercelu) se ne pokreće ručno - opisan je zasebno
ispod, jer već radi na javnom linku.
U sve četiri varijante dovoljno je iskopirati pripremljeni `.env.example`
fajl, bez ručnog upisivanja bilo čega - za lokalnu bazu je već popunjen
tačnim vrijednostima, a za bazu u oblaku ostaje potrebno upisati stvarnu
adresu i ključ tog projekta (to je jedino što se ne može unaprijed znati).

"Iz korijena projekta" znači unutar foldera koji nastane kloniranjem - taj
korak se radi samo jednom, prije bilo koje od opcija ispod:
```
git clone https://github.com/Amira-Mehic/Tmizan.git
cd Tmizan
```



### 1. Docker + lokalna baza (bez interneta)
Ne zahtijeva ništa osim Dockera i Supabase CLI-a. Iz korijena projekta:
```
npm install -g supabase
supabase start
copy .env.example .env   /   cp .env.example .env
docker compose up --build
```
Aplikacija se otvara na `http://localhost:8080`, povezana na lokalnu bazu kojoj se 
moze pristupiti putem linka `http://127.0.0.1:54323`.



### 2. Docker + Supabase u oblaku
Iz korijena projekta:
```
cp .env.example .env
```
U `.env` upisati adresu i anon ključ pravog Supabase projekta (vidjeti
"Konfiguracija" ispod), pa pokrenuti:
```
docker compose up --build
```
Aplikacija se otvara na `http://localhost:8080`, povezana na bazu u oblaku.



### 3. Bez Dockera (Node) + lokalna baza
Potreban je Node.js verzije 20.19 ili novije, i Supabase CLI. Iz korijena
projekta:
```
npm install -g supabase
supabase start
cp frontend/.env.example frontend/.env.local
cd frontend
npm install
npm run dev
```
Aplikacija se otvara na `http://localhost:5173`, povezana na lokalnu bazu.



### 4. Bez Dockera (Node) + Supabase u oblaku
```
cp frontend/.env.example frontend/.env.local
```
U `frontend/.env.local` upisati adresu i anon ključ pravog Supabase projekta,
pa pokrenuti:
```
cd frontend
npm install
npm run dev
```
Aplikacija se otvara na `http://localhost:5173`, povezana na bazu u oblaku.



### 5. Vercel (produkcija)
Ovo se ne pokreće ručno komandama - to je javna, već postavljena verzija
aplikacije, dostupna na:
```
https://frontend-six-beta-45.vercel.app
```
Repozitorij je na GitHubu (`Amira-Mehic/Tmizan`), povezan s Vercel projektom
tako da se svaki push na granu `main` automatski gradi i objavljuje - nema
ručnog koraka. Korijen projekta za Vercel je `frontend/` (tamo se nalazi
`vercel.json` s pravilom preusmjeravanja svih putanja na `index.html`, jer je
u pitanju jednostranična aplikacija).

Adresa i anon ključ za ovu verziju postavljaju se kroz Vercelove Environment
Variables (Vercel nadzorna tabla, Settings, Environment Variables) i vezani su
za produkcijski Supabase projekat u oblaku, odvojen od lokalne baze koja se
koristi u opcijama 1 i 3. Ako te varijable nisu postavljene, koristi se zadana
vrijednost upisana u `frontend/src/services/SupaBaseClient.js`, da objavljena
verzija ne ostane bez klijenta baze. Riječ je o javnoj adresi i publishable
ključu, koje izgrađena aplikacija ionako sadrži, jer pristup podacima
ograničavaju sigurnosna pravila na nivou reda (RLS), a ne tajnost ključa.

---

Napomene koje važe za opcije 1-4:
- `supabase start` na osnovu postavki u `supabase/config.toml` i migracija iz
  `supabase/migrations` podiže lokalnu PostgreSQL bazu, autentifikaciju
  (GoTrue), REST sloj (PostgREST) i Kong gateway kao odvojene kontejnere, te
  je puni referentnim Kur'anskim sadržajem i demonstracijskim nalozima iz
  `supabase/seed`.
- `supabase db reset` vraća lokalnu bazu u početno stanje, ponovnim
  primjenjivanjem svih migracija i početnih podataka.
- `.env` (u korijenu, za Docker) i `frontend/.env.local` (za Node) su
  potpuno nezavisni jedan od drugog - `docker compose` čita varijable samo iz
  `.env` u korijenu, a Vite dev server samo iz `frontend/.env` ili
  `frontend/.env.local`.



### Konfiguracija (baza u oblaku)
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```
Anonimni ključ smije biti javno vidljiv jer pristup podacima ograničavaju
sigurnosna pravila baze (Row Level Security), a ne tajnost ključa.



## Pristup bazi
Kod lokalnog pokretanja (opcije 1 i 3), Supabase Studio - grafički interfejs za
pregled tabela, podataka i logova — dostupan je na `http://127.0.0.1:54323`,
čim je `supabase start` pokrenut.
Kod baze u oblaku (opcije 2 i 4), pregled je na `https://supabase.com/dashboard`,
u okviru odgovarajućeg projekta, uz prijavu na Supabase nalog koji ga
posjeduje.


## Baza podataka
Shema se postavlja migracijama iz `supabase/migrations`, redom po broju.
Referentni Kur'anski sadržaj puni se skriptama iz `supabase/seed`.


## Testovi
```
cd frontend
npm test
```
Pokreće sve jedinične testove i ispisuje zbirni rezultat. Testovi pokrivaju
motore ponavljanja, metode učenja i generisanje mjesečnog plana.


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
| `frontend/src/services` | komunikacija sa Supabase bazom, po domenu |
| `frontend/src/i18n` | prijevodi sučelja (bosanski, engleski) |
| `frontend/src/constants` | statički sadržaj: vodiči kroz aplikaciju, opisi metoda, lokacije |
| `supabase/migrations` | migracije baze podataka |
| `supabase/seed` | punjenje referentnog kur'anskog sadržaja |
| `supabase/functions` | funkcija za podsjetnike na časove |
