-- Rollback for 20260909180000_usa_247_circle_placements.sql
--
-- The forward migration is purely additive, so this rollback is complete: it
-- removes only objects that migration created. Nothing it drops existed before.
--
-- What is NOT touched, because the forward migration never touched it either:
--   * dos_relationship_scores  (121 machine rows, all assignment_source
--     'automatic') is unchanged and stays unchanged.
--   * dos_circle_overrides is unchanged and stays unchanged.
--   * missionary_field_people is unchanged and stays unchanged.
--
-- Cost of rolling back: every human confirmation recorded since the forward
-- migration is destroyed, because it lives only in these two tables. Export
-- them first if any confirmation is worth keeping:
--
--   copy (select * from public.dos_circle_placements) to stdout with csv header;
--   copy (select * from public.dos_circle_placement_batches) to stdout with csv header;
--
-- After this runs, the People counts fall back to zero confirmed placements,
-- which is exactly the state before the feature shipped.

drop function if exists public.dos_confirm_circle_placements(jsonb);
drop function if exists public.dos_circle_capacity_conflicts(jsonb);

drop policy if exists "Admins can manage DOS circle placements" on public.dos_circle_placements;
drop policy if exists "Admins can manage DOS circle placement batches" on public.dos_circle_placement_batches;

alter table if exists public.dos_circle_placements
  drop constraint if exists dos_circle_placements_batch_fk;

drop table if exists public.dos_circle_placements;
drop table if exists public.dos_circle_placement_batches;
