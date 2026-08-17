-- ============================================================================
-- Prva migracija - temelj sistema: profili korisnika, uloge i dozvole (RBAC),
-- te evidencija izmjena. Postavlja i sigurnosna pravila na nivou reda (RLS),
-- pa svaki korisnik od početka vidi samo ono što smije.
--
-- Shema uloga postavljena ovdje (roles, permissions,
-- role_permissions, user_roles) kasnije je zamijenjena jednostavnijom tabelom
-- app_user_roles u migraciji 0011. Ove tabele ostaju u historiji jer se na njih
-- oslanjaju migracije koje dolaze prije 0011.
-- ============================================================================

-- ── Proširenja ──────────────────────────────────────────────────────────────
-- pgcrypto daje gen_random_uuid(), koji generiše nasumične identifikatore.
-- Nasumični UUID se koristi umjesto rednog broja da se iz identifikatora ne
-- može zaključiti koliko zapisa sistem ima ni kojim redom su nastali.
create extension if not exists pgcrypto;


-- ── Osnovne tabele ──────────────────────────────────────────────────────────

-- Uloge koje sistem poznaje (korisnik, administrator i slično).
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

-- Pojedinačne dozvole, sitnije od uloge. Uloga se sastavlja od dozvola, pa se
-- ovlasti mogu mijenjati bez diranja koda aplikacije.
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- Veza uloga i dozvola. Jedna uloga ima više dozvola, a ista dozvola može
-- pripadati većem broju uloga, pa je potrebna zasebna vezna tabela.
create table if not exists public.role_permissions (
  role_id uuid references public.roles(id) on delete cascade,
  permission_id uuid references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Veza korisnika i uloga. Korisnik može imati više uloga istovremeno.
-- Brisanjem korisnika iz sistema prijave brišu se i njegove dodijeljene uloge.
create table if not exists public.user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role_id uuid references public.roles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, role_id)
);

-- Profil korisnika. Podaci o prijavi (e-mail, lozinka) ostaju u Supabase
-- sistemu autentifikacije, a ovdje stoje podaci same aplikacije, povezani s
-- istim identifikatorom.
--
-- Nalog se ne briše nego se označava kao neaktivan, da povezani zapisi o
-- napretku ne ostanu bez vlasnika. Ograničenje ispod čuva to pravilo: datum
-- brisanja smije postojati samo ako je nalog istovremeno i deaktiviran.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_active boolean default true,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint chk_soft_delete check (
    deleted_at is null or is_active = false
  )
);

-- Evidencija izmjena. Zapisi se samo dodaju, nikad ne mijenjaju ni brišu, pa
-- historija ostaje vjerodostojna. Stanje prije i poslije čuva se kao JSON, čime
-- jedna tabela pokriva izmjene bilo koje druge tabele bez posebne strukture.
create table if not exists public.audit_logs (
  id bigserial primary key,
  user_id uuid,
  action text,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  request_id text,
  created_at timestamptz default now()
);


-- ── Indeksi ─────────────────────────────────────────────────────────────────
-- Provjera ovlasti se izvršava pri gotovo svakom upitu, pa se kolone po kojima
-- se ta provjera vrši indeksiraju da pretraga ne prolazi kroz cijelu tabelu.
create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_role_permissions_role on public.role_permissions(role_id);


-- ── Funkcije ────────────────────────────────────────────────────────────────

-- Datum posljednje izmjene se postavlja u bazi, a ne u aplikaciji, pa je tačan
-- bez obzira odakle izmjena dolazi.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated
before update on public.profiles
for each row execute function public.set_updated_at();

-- Provjera ima li prijavljeni korisnik traženu ulogu.
--
-- Funkcija se izvršava s ovlastima vlasnika (security definer) jer čita tabele
-- do kojih obični korisnik nema direktan pristup. Zaključana pretraga shema
-- sprječava da se podmetne tabela istog naziva iz druge sheme.
create or replace function public.has_role(role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = role_name
    limit 1
  );
$$;

-- Provjera pojedinačne dozvole. Preciznija od provjere uloge: pravila pristupa
-- se pišu prema tome šta korisnik smije uraditi, a ne prema tome kako se
-- njegova uloga zove.
create or replace function public.has_permission(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and p.name = p_name
  );
$$;


-- ── Bilježenje izmjena ──────────────────────────────────────────────────────
-- Jedna funkcija pokriva unos, izmjenu i brisanje. Kod unosa se bilježi samo
-- novo stanje, kod brisanja samo staro, a kod izmjene oba - pa se iz zapisa
-- vidi tačno šta se promijenilo.
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs(
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    request_id
  )
  values (
    -- Izmjenu može pokrenuti i sistemski proces, bez prijavljenog korisnika;
    -- tada se upisuje prazan identifikator umjesto da zapis ostane nepotpun.
    coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    current_setting('request.headers', true)::jsonb->>'x-request-id'
  );

  return coalesce(new, old);
end;
$$;

create trigger audit_profiles
after insert or update or delete on public.profiles
for each row execute function public.audit_trigger();


-- ── Početni podaci ──────────────────────────────────────────────────────────
-- Uloge i dozvole se upisuju odmah da sistem bude upotrebljiv čim se migracija
-- izvrši. Preskakanje postojećih zapisa omogućava da se migracija pokrene više
-- puta bez greške i bez duplikata.
insert into public.roles (name)
values ('user'), ('admin')
on conflict do nothing;

insert into public.permissions (name)
values ('profiles.read'), ('profiles.update'), ('users.manage')
on conflict do nothing;

-- Administrator dobija sve postojeće dozvole, bez nabrajanja pojedinačno.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'admin'
on conflict do nothing;


-- ── Kreiranje profila pri registraciji ──────────────────────────────────────
-- Profil i osnovna uloga se dodjeljuju automatski, u istoj transakciji u kojoj
-- nastaje nalog. Time nalog nikad ne ostane bez profila, čak i ako aplikacija
-- pukne odmah nakon registracije.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_role_id uuid;
begin
  -- Ime se preuzima iz podataka unesenih pri registraciji; ako ga nema,
  -- upisuje se zamjenska vrijednost da polje ne ostane prazno.
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User')
  )
  on conflict do nothing;

  insert into public.roles (name)
  values ('user')
  on conflict do nothing;

  select id into default_role_id
  from public.roles
  where name = 'user'
  limit 1;

  if default_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.id, default_role_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();


-- ── Sigurnost na nivou reda ─────────────────────────────────────────────────
-- Uključivanjem RLS-a tabele postaju zatvorene po pravilu: bez izričitog
-- pravila koje dopušta pristup, upit ne vraća nijedan red. Zaštita tako radi u
-- bazi, a ne u aplikaciji - i vrijedi jednako i kad se upit šalje mimo nje.
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_logs enable row level security;

-- Prvo se oduzimaju sve zatečene ovlasti, pa se dodjeljuju samo one koje
-- stvarno trebaju. Sigurnije je krenuti od zatvorenog stanja nego zatvarati
-- ono što je već otvoreno.
revoke all on public.profiles from anon, authenticated;
revoke all on public.roles from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;
revoke all on public.permissions from anon, authenticated;
revoke all on public.role_permissions from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;


-- ── Pravila pristupa ────────────────────────────────────────────────────────

-- Korisnik vidi i mijenja isključivo vlastiti profil.
create policy "profiles self"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles update self"
on public.profiles
for update
using (auth.uid() = id);

-- Pregled tuđih profila vezan je za dozvolu upravljanja korisnicima, a ne za
-- naziv uloge - tako se ovlast može dodijeliti i bez administratorske uloge.
create policy "profiles admin"
on public.profiles
for select
using (public.has_permission('users.manage'));

-- Popis uloga i dozvola vidi samo administrator; obična aplikacija ga ne treba.
create policy "roles admin only"
on public.roles
for select
using (public.has_role('admin'));

-- Korisnik smije vidjeti koje uloge ima, jer sučelje prema tome odlučuje šta
-- će mu prikazati.
create policy "user_roles self"
on public.user_roles
for select
using (user_id = auth.uid());

create policy "user_roles admin"
on public.user_roles
for select
using (public.has_role('admin'));

create policy "permissions read"
on public.permissions
for select
using (public.has_role('admin'));

create policy "role_permissions admin"
on public.role_permissions
for select
using (public.has_role('admin'));

-- Evidenciju izmjena čita samo onaj ko upravlja korisnicima.
create policy "audit admin"
on public.audit_logs
for select
using (public.has_permission('users.manage'));


-- ── Zaključavanje osjetljivih tabela ────────────────────────────────────────
-- Dodjelu uloga ne smije mijenjati sam korisnik, jer bi time mogao sebi
-- dodijeliti administratorske ovlasti. Zato izmjena ostaje moguća isključivo
-- kroz povlašteni pristup sa servera.
revoke insert, update, delete on public.user_roles from authenticated;
grant insert, update, delete on public.user_roles to service_role;

-- Zapisi u evidenciji se ne smiju mijenjati ni brisati, inače historija gubi
-- svrhu. Dodavanje ostaje dozvoljeno, jer ga obavlja okidač.
revoke update, delete on public.audit_logs from authenticated;

-- Ovlasti nad vlastitim profilom, u granicama pravila postavljenih iznad.
grant insert on public.profiles to authenticated;
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
