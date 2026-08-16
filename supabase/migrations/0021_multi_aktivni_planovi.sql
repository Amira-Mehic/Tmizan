-- ==========================================================================
-- Više istovremeno aktivnih planova učenja.
--
-- Plan za cijeli Kur'an isključuje sve ostale, dok planovi po surama, džuzevima
-- ili rasponu stranica mogu trajati uporedo. Mjesečni raspored se zato vezuje za
-- pojedinačni plan, a ne za korisnika - inače bi dva aktivna plana upisivala u
-- isti mjesečni zapis.
-- ==========================================================================

-- 1) monthly_plans dobija plan_id, unique ide na (plan_id, year, month)
alter table monthly_plans
  add column if not exists plan_id uuid references talim_plans(id) on delete cascade;

-- Postojeći zapisi se vezuju za trenutno aktivan plan korisnika. Do sada je
-- aktivan mogao biti samo jedan, pa je pridruživanje jednoznačno.
update monthly_plans mp
set plan_id = (
  select tp.id from talim_plans tp
  where tp.user_id = mp.user_id and tp.active = true
  order by tp.created_at desc limit 1
)
where mp.plan_id is null;

alter table monthly_plans drop constraint if exists monthly_plans_user_id_year_month_key;
create unique index if not exists monthly_plans_plan_year_month_key
  on monthly_plans(plan_id, year, month) where plan_id is not null;
create index if not exists idx_monthly_plans_plan on monthly_plans(plan_id);

-- Ograničenje u bazi kao osigurač: najviše jedan aktivan plan za cijeli Kur'an.
create unique index if not exists idx_one_active_cijeli_plan
  on talim_plans(user_id) where active and scope_type = 'cijeli';
