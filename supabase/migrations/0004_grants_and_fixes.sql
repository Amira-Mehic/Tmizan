-- ==========================================================================
-- Dodjela osnovnih ovlasti nad tabelama, kolona regije na profilu i dopuna
-- tabele oglasa.
--
-- Sigurnosna pravila i ovlasti su dvije odvojene provjere. Pravila određuju koje
-- redove korisnik smije vidjeti, ali bez dodijeljene ovlasti baza ga ne pušta ni
-- do same tabele - zbog čega su svi upiti prije ove migracije vraćali odbijen
-- pristup.
-- ==========================================================================

-- Ovlasti nad tabelama uvedenim dosadašnjim migracijama.
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  profiles, page_progress, page_repeat_history, verse_progress, verse_repeat_history,
  similar_ayahs, surah_progress, blog_posts, hifz_plans, hifz_plan_schedule, srs_state
to authenticated;

grant select on blog_posts to anon;

-- Tabele koje tek nastanu dobijaju iste ovlasti same, bez posebne naredbe.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- Regija se koristi za ciljanje oglasa prema lokaciji posjetioca.
alter table profiles add column if not exists region text;

-- Tabela oglasa se dopunjuje samo ako postoji. Provjera je potrebna jer je
-- tabela nastala izvan migracija, pa se ne može pretpostaviti da je ima svako
-- okruženje - bez nje bi migracija pala na nepostojećoj tabeli.
do $$
begin
  if to_regclass('public.advertisements') is not null then
    alter table advertisements
      add column if not exists target_country text,
      add column if not exists target_city    text,
      add column if not exists target_region  text;

    create index if not exists idx_ads_country on advertisements(target_country);

    alter table advertisements enable row level security;

    drop policy if exists "advertisements_select_active" on advertisements;
    create policy "advertisements_select_active" on advertisements
      for select using (is_active = true);

    grant select on advertisements to anon, authenticated;
  end if;
end $$;
