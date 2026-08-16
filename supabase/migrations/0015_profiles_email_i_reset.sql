-- ==========================================================================
-- E-mail adresa na profilu.
--
-- Adresa postoji u Supabase sistemu prijave, ali aplikacija nema pravo čitati te
-- tabele. Bez kopije na profilu administrator ne bi mogao pokrenuti obnovu
-- lozinke za korisnika. Kolona se popunjava pri registraciji, a postojeći nalozi
-- se dopunjuju jednokratno.
-- ==========================================================================

alter table profiles add column if not exists email text;

-- Dopuna za naloge nastale prije ove izmjene.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Okidač iz migracije 0003 se proširuje da upisuje i adresu.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
