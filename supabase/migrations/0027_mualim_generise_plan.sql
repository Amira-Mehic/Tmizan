-- ==========================================================================
-- Muallim generiše plan ponavljanja povezanom učeniku.
--
-- Koristi se isti generator kojim učenik pravi plan sam za sebe, pa se ne uvodi
-- druga logika za isti posao. Do sada su pravila pristupa dopuštala upis samo nad
-- vlastitim zapisima, pa muallim nije mogao ništa upisati učeniku.
--
-- Rješenje prati obrazac iz migracije 0014: uz postojeće pravilo dodaje se novo,
-- uslovljeno prihvaćenom vezom između muallima i učenika. Postgres takva pravila
-- spaja logičkim ili, pa učenik ne gubi nijedno svoje pravo.
-- ==========================================================================

alter table hifz_plans add column if not exists assigned_by uuid references profiles(id);

-- hifz_plans: mualim smije upisati novi plan i ugasiti prethodni (isti
-- korak koji aktivirajPlan radi za sebe - gasi plan iste metode prije novog)
drop policy if exists "hifz_plans_mualim_insert" on hifz_plans;
create policy "hifz_plans_mualim_insert" on hifz_plans for insert
  with check (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = hifz_plans.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  );

drop policy if exists "hifz_plans_mualim_update" on hifz_plans;
create policy "hifz_plans_mualim_update" on hifz_plans for update
  using (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = hifz_plans.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  )
  with check (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = hifz_plans.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  );

-- rotation_state / femi_state: seedMethodEngine upisuje preko upsert
-- (insert ili update, zavisno postoji li već red za tu metodu)
drop policy if exists "rotation_state_mualim_insert" on rotation_state;
create policy "rotation_state_mualim_insert" on rotation_state for insert
  with check (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = rotation_state.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  );

drop policy if exists "rotation_state_mualim_update" on rotation_state;
create policy "rotation_state_mualim_update" on rotation_state for update
  using (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = rotation_state.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  )
  with check (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = rotation_state.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  );

drop policy if exists "femi_state_mualim_insert" on femi_state;
create policy "femi_state_mualim_insert" on femi_state for insert
  with check (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = femi_state.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  );

drop policy if exists "femi_state_mualim_update" on femi_state;
create policy "femi_state_mualim_update" on femi_state for update
  using (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = femi_state.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  )
  with check (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = femi_state.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  );

-- review_blocks (fibonacci/tri_dana/sedam_dana/srs): samo insert, novi
-- blokovi se pišu jednom pri generisanju, ne update-uju odavde
drop policy if exists "review_blocks_mualim_insert" on review_blocks;
create policy "review_blocks_mualim_insert" on review_blocks for insert
  with check (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = review_blocks.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  );

-- page_progress: seedRotationPages samo update-uje sljedece_ponavljanje na
-- redovima koji već postoje (bez insert-a)
drop policy if exists "page_progress_mualim_update" on page_progress;
create policy "page_progress_mualim_update" on page_progress for update
  using (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = page_progress.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  )
  with check (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = page_progress.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  );
