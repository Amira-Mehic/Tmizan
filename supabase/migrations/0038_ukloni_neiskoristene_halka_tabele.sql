-- ==========================================================================
-- Uklanjanje neiskorištenog dijela infrastrukture za halke.
--
-- Halka je zamišljena kao grupa učenika kod jednog muallima, s vlastitim
-- rasporedom i moderatorima. Razvoj je usmjeren na individualni rad s učenikom,
-- pa ta zamisao nikad nije dobila korisničko sučelje.
--
-- Ovom migracijom uklanjaju se samo dijelovi uvedeni migracijom 0030: sedmični
-- raspored po halki, dodjela moderatora halki, i strani ključ na sesijama koji
-- je u praksi uvijek ostao prazan.
--
-- Tabele halke i halka_members, te kolone koje na njih pokazuju, potiču iz
-- migracije 0009 i pojavljuju se u većem broju pravila pristupa. Zato se čiste
-- odvojeno, u migraciji 0039, kako bi se svaki korak mogao provjeriti prije
-- nepovratnog brisanja.
-- ==========================================================================

-- Funkcija za provjeru ovlasti nad halkom prvo se mijenja da više ne čita
-- tabelu koja se briše. Poziva se iz većeg broja pravila nad halkama,
-- sesijama, objavama i zadacima, pa bi svaki takav upit pukao istog trenutka
-- kad tabela nestane. Nakon izmjene provjerava samo vlasnika halke i
-- administratora.
create or replace function public.is_halka_staff(_halka_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    exists (select 1 from halke h where h.id = _halka_id and h.mualim_id = auth.uid())
    or public.tmizan_has_role('admin');
$$;

-- Brisanje tabela. Lančano uklanjanje povlači i strani ključ sa sesija, te
-- pravila pristupa i indekse koji pripadaju ovim dvjema tabelama.
drop table if exists halka_termini cascade;
drop table if exists halka_moderators cascade;

-- Kolona se uklanja tek sada, kad je strano ograničenje već nestalo i kad
-- više nema značenje.
alter table sessions drop column if exists termin_id;
