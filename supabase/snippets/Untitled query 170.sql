-- ============================================================================
-- Kreiranje demonstracijskih naloga, po jedan za svaku ulogu u sistemu.
-- Pokreće se u Supabase SQL Editoru. Skripta se smije pokrenuti više puta:
-- postojeći nalozi se ne dupliraju, nego im se osvježe lozinka, rod i uloge.
--
-- Nalozi se kreiraju s već potvrđenom e-mail adresom, da prijava radi odmah,
-- bez koraka potvrde poštom.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  r               record;
  v_uid           uuid;
  ima_provider_id boolean;
begin
  -- Struktura tabele auth.identities razlikuje se između verzija Supabasea,
  -- pa se prisustvo kolone provider_id provjerava prije upisa.
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'auth'
      and table_name   = 'identities'
      and column_name  = 'provider_id'
  ) into ima_provider_id;

  for r in
    select * from (values
      ('admin123@gmail.com',     'Admin.1234',     'Testni administrator', 'zensko', 'admin',
        array['korisnik','ucenik','mualim','blogger','moderator','admin']),
      ('mualim123@gmail.com',    'Mualim.1234',    'Testni muallim',       'musko',  'mualim',
        array['korisnik','mualim']),
      ('ucenik123@gmail.com',    'Ucenik.1234',    'Testni ucenik',        'musko',  'ucenik',
        array['korisnik','ucenik']),
      ('blogger123@gmail.com',   'Blogger.1234',   'Testni blogger',       'zensko', 'blogger',
        array['korisnik','blogger']),
      ('moderator123@gmail.com', 'Moderator.1234', 'Testni moderator',     'musko',  'moderator',
        array['korisnik','moderator'])
    ) as t(email, lozinka, ime, rod, glavna_uloga, sve_uloge)
  loop

    select id into v_uid from auth.users where email = r.email;

    if v_uid is null then
      v_uid := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000',
        v_uid,
        'authenticated',
        'authenticated',
        r.email,
        extensions.crypt(r.lozinka, extensions.gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object('full_name', r.ime, 'gender', r.rod),
        now(), now()
      );

      -- Bez zapisa u auth.identities prijava lozinkom ne prolazi, jer
      -- Supabase preko njega veže način prijave za korisnika.
      if ima_provider_id then
        insert into auth.identities (
          id, user_id, provider_id, identity_data, provider,
          last_sign_in_at, created_at, updated_at
        ) values (
          gen_random_uuid(), v_uid, v_uid::text,
          jsonb_build_object('sub', v_uid::text, 'email', r.email),
          'email', now(), now(), now()
        );
      else
        insert into auth.identities (
          id, user_id, identity_data, provider,
          last_sign_in_at, created_at, updated_at
        ) values (
          gen_random_uuid(), v_uid,
          jsonb_build_object('sub', v_uid::text, 'email', r.email),
          'email', now(), now(), now()
        );
      end if;

    else
      -- Nalog već postoji, pa se samo usklađuju lozinka, rod i ime.
      update auth.users
         set encrypted_password = extensions.crypt(r.lozinka, extensions.gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             raw_user_meta_data = jsonb_build_object('full_name', r.ime, 'gender', r.rod),
             updated_at         = now()
       where id = v_uid;
    end if;

    -- Okidač handle_new_user već je napravio red u profiles, ovdje se dopunjava.
    insert into public.profiles (id, full_name, email, gender, role)
    values (v_uid, r.ime, r.email, r.rod, r.glavna_uloga)
    on conflict (id) do update
      set full_name = excluded.full_name,
          email     = excluded.email,
          gender    = excluded.gender,
          role      = excluded.role;

    -- Višestruke uloge idu u zasebnu tabelu, jer profiles.role nosi samo
    -- glavnu ulogu koja određuje početnu stranicu nakon prijave.
    insert into public.app_user_roles (user_id, role)
    select v_uid, u from unnest(r.sve_uloge) as u
    on conflict (user_id, role) do nothing;

  end loop;
end $$;

-- ============================================================================
-- Provjera. Ispisuje kreirane naloge s njihovim ulogama.
-- ============================================================================
select
  p.email,
  p.full_name                        as ime,
  p.gender                           as rod,
  p.role                             as glavna_uloga,
  string_agg(aur.role, ', '
             order by aur.role)      as sve_uloge
from public.profiles p
left join public.app_user_roles aur on aur.user_id = p.id
where p.email in (
  'admin123@gmail.com', 'mualim123@gmail.com', 'ucenik123@gmail.com',
  'blogger123@gmail.com', 'moderator123@gmail.com'
)
group by p.email, p.full_name, p.gender, p.role
order by p.role;
