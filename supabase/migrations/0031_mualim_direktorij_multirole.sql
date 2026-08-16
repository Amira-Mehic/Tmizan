-- ==========================================================================
-- Direktorij muallima i provjera muallim uloge iz oba izvora.
--
-- Uloga korisnika može stajati na dva mjesta: kao primarna uloga na profilu ili
-- kao dodatna u tabeli uloga uvedenoj migracijom 0011. Provjera mora pokriti oba,
-- inače muallim kojem je uloga dodijeljena naknadno ne bi bio vidljiv u
-- direktoriju.
-- ==========================================================================

-- Provjera muallim uloge, neovisno o tome gdje je zapisana.
create or replace function public.is_mualim(_uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    exists (select 1 from profiles p where p.id = _uid and p.role = 'mualim')
    or exists (select 1 from app_user_roles ur where ur.user_id = _uid and ur.role = 'mualim');
$$;

grant execute on function public.is_mualim(uuid) to authenticated;

-- Direktorij muallima za učenike.
create or replace function public.list_mualimi()
returns table (id uuid, full_name text, country text, city text, gender text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.full_name, p.country, p.city, p.gender
  from profiles p
  where public.is_mualim(p.id);
$$;

grant execute on function public.list_mualimi() to authenticated;

-- Ručno uparivanje putem email adrese i privatnog koda.
create or replace function public.request_mualim_manual(p_email text, p_code text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  target_id uuid;
begin
  if auth.uid() is null then
    return 'not_found';
  end if;

  select id into target_id from profiles
  where email = p_email and mualim_code = p_code and public.is_mualim(id)
  limit 1;

  if target_id is null then
    return 'not_found';
  end if;

  insert into mualim_students (mualim_id, student_id, status)
  values (target_id, auth.uid(), 'na_cekanju')
  on conflict (mualim_id, student_id) do update set status = 'na_cekanju', decided_at = null;

  return 'ok';
end;
$$;

grant execute on function public.request_mualim_manual(text, text) to authenticated;
