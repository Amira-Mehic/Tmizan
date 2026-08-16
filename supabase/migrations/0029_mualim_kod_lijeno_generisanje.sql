-- ==========================================================================
-- Naknadno generisanje muallim koda.
--
-- Okidač iz migracije 0018 dodjeljuje kod samo u trenutku upisa nove uloge. Ako
-- je zapis o ulozi već postojao pa je samo izmijenjen, ili je uloga dodijeljena
-- prije uvođenja te mehanike, kod bi ostao trajno prazan.
--
-- Funkcija ispod poziva se iz aplikacije kad muallim otvori profil bez koda i
-- generiše ga tada, umjesto da se čeka novi upis koji se možda nikad neće desiti.
-- ==========================================================================

create or replace function public.ensure_my_mualim_code()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  code       text;
  tries      int := 0;
  is_mualim  boolean;
begin
  if auth.uid() is null then
    return null;
  end if;

  select
    exists(select 1 from app_user_roles where user_id = auth.uid() and role = 'mualim')
    or exists(select 1 from profiles where id = auth.uid() and role = 'mualim')
  into is_mualim;

  if not is_mualim then
    return null;
  end if;

  select mualim_code into code from profiles where id = auth.uid();
  if code is not null then
    return code;
  end if;

  loop
    code := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
    begin
      update profiles set mualim_code = code where id = auth.uid() and mualim_code is null;
      exit;
    exception when unique_violation then
      tries := tries + 1;
      exit when tries > 10;
    end;
  end loop;

  return code;
end;
$$;

grant execute on function public.ensure_my_mualim_code() to authenticated;
