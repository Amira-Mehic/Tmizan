-- ==========================================================================
-- Muallim upisuje ciljeve učenika: dnevnu količinu, procijenjeno vrijeme i rok.
--
-- Vrijednosti se ne bilježe sa strane nego se upisuju u sam plan učenika, pa
-- učenik odmah vidi promjenu u svojoj aplikaciji. Pravo na to ima samo muallim
-- kojem je učenik prihvatio vezu.
-- ==========================================================================

-- (A) Nova polja na mualim_review_plans
alter table mualim_review_plans
  add column if not exists daily_goal_lines numeric,   -- redova/dan koji muallim predlaže
  add column if not exists minutes_needed   int,        -- procijenjeno vrijeme dnevno (min)
  add column if not exists target_date      date;       -- predloženi rok završetka

-- (B) Muallim smije UPDATE-ovati talim_plans učenika s kojim ima PRIHVAĆENU
--     vezu (mualim_students.status = 'prihvacen'). Postojeća politika
--     "talim_plans_all_own" ostaje netaknuta - ovo je DODATNA (permisivna)
--     politika, Postgres RLS ih spaja sa OR.
drop policy if exists "talim_plans_mualim_update" on talim_plans;
create policy "talim_plans_mualim_update" on talim_plans for update
  using (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = talim_plans.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  )
  with check (
    exists (
      select 1 from mualim_students ms
      where ms.student_id = talim_plans.user_id
        and ms.mualim_id = auth.uid()
        and ms.status = 'prihvacen'
    )
  );
