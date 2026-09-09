-- Rollback for 20260908180000_usa_246_planned_vs_actual_meeting_time.sql.
-- Additive only, so the reverse is a clean drop. No pre-existing column, value
-- or row is touched by either direction.
drop index if exists public.missionary_tables_lifecycle_id_idx;
drop index if exists public.missionary_tables_log_operation_key_unique;

alter table public.missionary_tables
  drop constraint if exists missionary_tables_planned_duration_check,
  drop constraint if exists missionary_tables_planned_range_check;

alter table public.missionary_tables
  drop column if exists log_operation_key,
  drop column if exists logged_at,
  drop column if exists lifecycle_id,
  drop column if exists planned_timezone,
  drop column if exists planned_duration_minutes,
  drop column if exists planned_date,
  drop column if exists planned_end_at,
  drop column if exists planned_start_at;
