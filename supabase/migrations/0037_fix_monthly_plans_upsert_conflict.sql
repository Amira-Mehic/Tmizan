-- ==========================================================================
-- Ispravka upisa mjesečnog plana.
--
-- Migracija 0021 uvela je djelimično jedinstveno ograničenje, ono koje vrijedi
-- samo za redove s popunjenim planom. Postgres takvo ograničenje prihvata pri
-- upisu preko postojećeg zapisa jedino ako upit ponovi isti uslov, što
-- biblioteka kojom aplikacija pristupa bazi ne radi. Zbog toga je svaki upis
-- mjesečnog rasporeda vraćao grešku.
--
-- Ovdje se djelimično ograničenje zamjenjuje punim. Stariji redovi bez plana
-- ostaju ispravni, jer Postgres prazne vrijednosti u jedinstvenom ograničenju
-- smatra međusobno različitim.
-- ==========================================================================

-- Uklanjanje ide u dva koraka da migracija prođe i pri ponovnom pokretanju.
-- Prvi korak uklanja ograničenje, za slučaj da je migracija već jednom
-- izvršena. Drugi uklanja obični indeks, što je stanje pri prvom pokretanju.
-- Uvijek djeluje tačno jedna od te dvije naredbe, a druga prolazi bez efekta.
alter table monthly_plans drop constraint if exists monthly_plans_plan_year_month_key;
drop index if exists monthly_plans_plan_year_month_key;

alter table monthly_plans
  add constraint monthly_plans_plan_year_month_key unique (plan_id, year, month);
