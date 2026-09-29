-- USA-246 — planned versus actual meeting time (additive, backward compatible).
--
-- Today `missionary_tables` has one pair of time columns serving both the plan
-- and the actual, so logging a scheduled meeting overwrites the time it was
-- scheduled for. This migration adds a planned snapshot beside the existing
-- columns. The existing columns keep their meaning and stay canonical for the
-- UI and reporting: after logging they hold what actually happened.
--
-- Every column is nullable and nothing existing is altered or rewritten, so a
-- client that knows nothing about these columns keeps working unchanged.

alter table public.missionary_tables
  add column if not exists planned_start_at timestamptz,
  add column if not exists planned_end_at timestamptz,
  add column if not exists planned_date date,
  add column if not exists planned_duration_minutes integer,
  add column if not exists planned_timezone text,
  -- Stable across the scheduled -> logged transition, so the lifecycle can be
  -- followed even if a future reschedule ever replaces the row.
  add column if not exists lifecycle_id uuid,
  -- When logging completed. Null means never logged; it is never inferred.
  add column if not exists logged_at timestamptz,
  -- Idempotency for the logging write: a retried or double-tapped Log carrying
  -- the same key cannot apply twice.
  add column if not exists log_operation_key text;

-- Ranges and durations must be sane when present; null stays allowed.
alter table public.missionary_tables
  drop constraint if exists missionary_tables_planned_range_check;
alter table public.missionary_tables
  add constraint missionary_tables_planned_range_check
  check (planned_start_at is null or planned_end_at is null or planned_end_at > planned_start_at);

alter table public.missionary_tables
  drop constraint if exists missionary_tables_planned_duration_check;
alter table public.missionary_tables
  add constraint missionary_tables_planned_duration_check
  check (planned_duration_minutes is null or planned_duration_minutes > 0);

create unique index if not exists missionary_tables_log_operation_key_unique
  on public.missionary_tables (log_operation_key)
  where log_operation_key is not null;

create index if not exists missionary_tables_lifecycle_id_idx
  on public.missionary_tables (lifecycle_id);

-- Backfill 1: the lifecycle identifier is the row's own id for everything that
-- already exists. Deterministic, and it invents nothing.
update public.missionary_tables
set lifecycle_id = id
where lifecycle_id is null;

-- Backfill 2: only meetings that are still scheduled have a plan we actually
-- know, and it is exactly what is already stored. Logged and canceled rows keep
-- a null plan rather than a fabricated one; their existing date, time and
-- duration remain the canonical recorded values.
update public.missionary_tables
set planned_start_at = scheduled_start_at,
    planned_end_at = scheduled_end_at,
    planned_date = table_date,
    planned_timezone = timezone,
    planned_duration_minutes = case
      when scheduled_start_at is not null and scheduled_end_at is not null
        then greatest(1, round(extract(epoch from (scheduled_end_at - scheduled_start_at)) / 60)::int)
      else null
    end
where meeting_status = 'scheduled'
  and planned_start_at is null;
