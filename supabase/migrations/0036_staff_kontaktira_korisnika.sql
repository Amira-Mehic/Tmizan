-- ==========================================================================
-- Razgovor koji osoblje pokreće s korisnikom.
--
-- Administrator i moderator mogu se obratiti bilo kojem korisniku. Korisnik u
-- takvom razgovoru smije poslati jednu poruku, pa mora sačekati odgovor - time se
-- sprječava zatrpavanje osoblja. Razgovor zatvara osoblje kad procijeni da je
-- tema završena.
--
-- Ovdje se čuva samo zaglavlje razgovora. Sam sadržaj ostaje u postojećoj tabeli
-- poruka iz migracije 0009, povezan preko kolone za kontekst. Tako se izbjegava
-- druga tabela poruka i sve što bi uz nju trebalo održavati.
-- ==========================================================================

create table if not exists staff_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  staff_id    uuid not null references profiles(id) on delete cascade, -- ko je pokrenuo razgovor
  naslov      text,
  status      text not null default 'otvoren' check (status in ('otvoren','zatvoren')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  closed_at   timestamptz,
  closed_by   uuid references profiles(id)
);

create index if not exists idx_staff_conv_user   on staff_conversations(user_id);
create index if not exists idx_staff_conv_staff  on staff_conversations(staff_id);
create index if not exists idx_staff_conv_status on staff_conversations(status);

alter table staff_conversations enable row level security;

-- staff (admin/moderator/management) vidi i upravlja svim razgovorima - isti
-- "svi staff dijele pristup" princip kao ms_staff_all/sessions_staff_all (0011)
drop policy if exists "sc_staff_all" on staff_conversations;
create policy "sc_staff_all" on staff_conversations for all
  using (public.is_staff()) with check (public.is_staff());

-- korisnik vidi SAMO svoje razgovore (ne kreira ih, ne briše, ne zatvara -
-- to radi isključivo staff)
drop policy if exists "sc_user_select" on staff_conversations;
create policy "sc_user_select" on staff_conversations for select
  using (auth.uid() = user_id);

-- Pomoćna funkcija vraća ko je poslao posljednju poruku u razgovoru i koristi
-- se za ograničenje ispod. Prima context_ref kao text, jer je i sama kolona
-- text. Nigdje u ovom fajlu nema pretvaranja u uuid: postoje i druge poruke sa
-- context_type 'opcenito' čiji context_ref nije identifikator razgovora, pa bi
-- takvo pretvaranje izazvalo grešku pri izvršavanju, a ne samo netačan
-- rezultat.
create or replace function public.staff_conv_last_sender(conv_ref text)
returns uuid language sql stable security definer set search_path = public as $$
  select sender_id from messages
  where context_type = 'opcenito' and context_ref = conv_ref
  order by created_at desc limit 1
$$;

-- Ograničenje brzine slanja - ovo je restriktivna politika, znači nadovezuje
-- se na postojeću permisivnu msg_insert iz 0009, ne zamjenjuje je. Staff šalje
-- bez ograničenja. Korisnik smije poslati poruku u razgovor samo ako razgovor
-- postoji, otvoren je, njegov je, i zadnja poruka u njemu nije njegova (znači
-- čeka odgovor od staffa).
drop policy if exists "msg_staff_conv_rate_limit" on messages;
create policy "msg_staff_conv_rate_limit" on messages as restrictive for insert
with check (
  context_type is distinct from 'opcenito'
  or context_ref is null
  or public.is_staff()
  or (
    exists (
      select 1 from staff_conversations sc
      where sc.id::text = context_ref and sc.status = 'otvoren' and sc.user_id = auth.uid()
    )
    and public.staff_conv_last_sender(context_ref) is distinct from auth.uid()
  )
);
