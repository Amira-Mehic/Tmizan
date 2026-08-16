-- ==========================================================================
-- Muallim kod za ručno povezivanje.
--
-- Jedinstven šestocifreni broj, vidljiv samo muallimu kojem pripada. Koristi se
-- kad učenik traži muallima suprotnog roda, koji se u direktoriju ne prikazuje.
--
-- Za povezivanje učenik mora znati i tačnu e-mail adresu i kod. Provjera se
-- izvršava kroz funkciju s povlaštenim ovlastima, pa se kod ne može pročitati
-- običnim uvidom u profil.
-- ==========================================================================

alter table profiles add column if not exists mualim_code text unique;

-- Kod se dodjeljuje čim korisnik dobije muallim ulogu, ako ga već nema.
create or replace function public.assign_mualim_code()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  code  text;
  tries int := 0;
begin
  if new.role = 'mualim' then
    loop
      code := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
      begin
        update profiles set mualim_code = code
        where id = new.user_id and mualim_code is null;
        exit;
      exception when unique_violation then
        tries := tries + 1;
        exit when tries > 10;
      end;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_mualim_code on app_user_roles;
create trigger trg_assign_mualim_code
  after insert on app_user_roles
  for each row execute function public.assign_mualim_code();

-- Popuni kod za mualime koji već postoje (odobreni prije ove migracije)
update profiles set mualim_code = lpad((floor(random() * 900000) + 100000)::int::text, 6, '0')
where role = 'mualim' and mualim_code is null;

-- Ručni zahtjev suprotnom rodu - provjerava email+kod BEZ da ih ikad izloži
-- klijentu. Vraća samo 'ok' / 'not_found', nikad koji dio nije tačan.
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
  where email = p_email and mualim_code = p_code and role = 'mualim'
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
