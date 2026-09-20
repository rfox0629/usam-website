/* Rollback for 20260702194002_dos_table_discipleship_roles.sql (USA-278).
 *
 * Like the ministry-event model, this migration had never reached production
 * and was applied on 2026-09-20. Until then `table_role`, every `growth_*` and
 * every `planning_*` value a missionary entered was dropped on save, because
 * the columns the loader selects did not exist.
 *
 * Purely additive in both directions: the columns, their two check constraints
 * and the one index are created by this migration alone, so dropping them
 * restores the exact prior schema.
 *
 * What a rollback DOES lose: table role and all growth/planning reflection text
 * captured after the apply. There is no other home for that content, so export
 * it first if any has been entered.
 */
drop index if exists public.missionary_tables_workspace_role_date_idx;

alter table public.missionary_tables
  drop constraint if exists missionary_tables_table_role_check,
  drop column if exists table_role,
  drop column if exists growth_what_god_taught,
  drop column if exists growth_scriptures,
  drop column if exists growth_action_step,
  drop column if exists growth_mentor_assignment,
  drop column if exists growth_follow_up_needed,
  drop column if exists planning_decisions,
  drop column if exists planning_action_items,
  drop column if exists planning_follow_up;

alter table public.missionary_field_people
  drop constraint if exists missionary_field_people_discipleship_relationship_check,
  drop column if exists discipleship_relationship;

notify pgrst, 'reload schema';
