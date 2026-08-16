-- ==========================================================================
-- Uklanjanje halki kao grupa učenika.
--
-- Nastavak migracije 0038, koja je obrisala samo raspored i dodjelu moderatora.
-- Ovdje se uklanjaju i same tabele halki i članova, te sve preostale kolone koje
-- na njih pokazuju.
--
-- Zamisao grupnog časa postavljena je u migraciji 0009, ali je razvoj usmjeren na
-- individualni rad sa svakim učenikom, pa halka kao grupa nikad nije dobila svoj
-- ekran. Provjerom kroz izvorni kod aplikacije utvrđeno je da nema nijednog
-- poziva prema tim tabelama ni kolonama - jedine dvije pojave te riječi su u
-- komentaru i u marketinškom tekstu. Ono što se u aplikaciji naziva halkom je
-- metoda učenja, s ovim tabelama nepovezana.
--
-- Redoslijed brisanja nije proizvoljan. Prvo se uklanjaju pravila i funkcije koje
-- se pozivaju na halke, tek onda same tabele. Obrnutim redom bi lančano brisanje
-- tiho odnijelo i pravila nad sesijama, objavama, zadacima i evidencijom
-- prisustva, koje su i dalje u upotrebi.
--
-- Prije pokretanja provjerava se da tabele nemaju podataka. Ako neki upit vrati
-- zapis, znači da je unos rađen izvan aplikacije i migraciju ne treba nastavljati
-- bez provjere:
--     select count(*) from halke;
--     select count(*) from halka_members;
-- ==========================================================================

-- ── Pravila na tabelama koje ostaju, a spominju halke ───────────────────────
-- Brišu se bez zamjene, jer su pokrivala samo slučaj u kojem sesija, objava ili
-- zadatak pripadaju halki - a taj slučaj nakon uklanjanja halki ne postoji.
drop policy if exists "sessions_halka_staff_all"  on sessions;
drop policy if exists "ann_halka_staff_all"       on announcements;
drop policy if exists "mt_halka_staff_all"        on mualim_tasks;
drop policy if exists "sa_halka_staff_select"     on session_attendance;
drop policy if exists "sa_halka_staff_update"     on session_attendance;

-- Ovo pravilo se mijenja, a ne briše: učenik i dalje mora vidjeti svoje
-- sesije, samo otpada grana koja je vodila preko halke.
drop policy if exists "sessions_student_select" on sessions;
create policy "sessions_student_select" on sessions for select
  using (auth.uid() = student_id);

-- ── Funkcija za provjeru ovlasti nad halkom ─────────────────────────────────
-- Pozivala se iz pravila obrisanih iznad, ali i iz pravila nad samim halkama,
-- od kojih neka nisu prošla kroz migracije nego su dodana direktno u bazi.
-- Zato se briše lančano: jedino što time može biti povučeno su pravila nad
-- tabelama koje se ionako uklanjaju na kraju ove migracije.
drop function if exists public.is_halka_staff(uuid) cascade;

-- ── Podsjetnici prije sesije ────────────────────────────────────────────────
-- Funkcija je čitala tabelu članova halke. PostgreSQL ne provjerava tijelo
-- funkcije pri brisanju tabele, pa bi ona formalno opstala, ali bi pukla pri
-- prvom sljedećem zakazanom pokretanju. Zato se ovdje redefiniše tako da
-- podsjetnik ide samo učeniku vezanom za sesiju.
create or replace function public.send_session_reminders()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  off int;
  sess record;
begin
  foreach off in array array[60, 30] loop
    for sess in
      select s.* from sessions s
      where s.starts_at between now() + (off || ' minutes')::interval
                            and now() + ((off + 5) || ' minutes')::interval
        and not exists (
          select 1 from session_reminders_sent r
          where r.session_id = s.id and r.offset_min = off
        )
    loop
      if sess.student_id is not null then
        insert into messages (sender_id, recipient_id, body, context_type, context_ref)
        values (sess.mualim_id, sess.student_id,
                '⏰ Čas "' || sess.naslov || '" počinje za ' || off || ' min.',
                'sesija', sess.id::text);
      end if;
      insert into session_reminders_sent (session_id, offset_min) values (sess.id, off)
      on conflict (session_id, offset_min) do nothing;
    end loop;
  end loop;
end;
$$;

-- ── Kolone koje su pokazivale na halku ──────────────────────────────────────
-- Sve tri su bile opcione, a prazna vrijednost je značila individualni rad
-- odnosno sve učenike. Brisanjem se stoga ne gubi nijedan stvarni podatak.
alter table sessions      drop column if exists halka_id;
alter table announcements drop column if exists halka_id;
alter table mualim_tasks  drop column if exists halka_id;

-- ── Same tabele ─────────────────────────────────────────────────────────────
-- Sve vanjske veze uklonjene su u koracima iznad, pa lančano brisanje ovdje
-- povlači još samo vlastita pravila i indekse ove dvije tabele.
drop table if exists halka_members cascade;
drop table if exists halke         cascade;

-- ── Provjera nakon izvršavanja ──────────────────────────────────────────────
-- Sljedeći upiti treba da vrate nula redova. Ako neki vrati zapis, ostala je
-- referenca koju treba pogledati ručno.
--
--   select tablename, policyname from pg_policies
--   where schemaname = 'public' and qual ilike '%halka%';
--
--   select table_name, column_name from information_schema.columns
--   where table_schema = 'public' and column_name like '%halka%';
--
--   select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and prosrc ilike '%halka%';
