-- ==========================================================================
-- Automatsko kreiranje profila pri registraciji.
--
-- Profil se mora pojaviti u istom trenutku kad i nalog, jer se na njega vežu svi
-- zapisi o napretku. Bez toga bi prvi upis u praćenje stranica ili ajeta pao na
-- nepostojeću referencu.
-- ==========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nalozi registrovani prije uvođenja ovog okidača nemaju profil, pa se ovdje
-- dopunjuju unazad. Postojeći zapisi se preskaču.
insert into public.profiles (id, full_name)
select id, raw_user_meta_data->>'full_name'
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;
