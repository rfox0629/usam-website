-- DOS meeting start times — a separate, optional start time, and the removal
-- of the synthetic noon stamp that stood in for one.
--
-- What was wrong
-- --------------
-- Log Meeting never asked for a start time. It posted `localDateTimeIso(date,
-- "12:00")`, so every logged meeting was stamped noon in whatever time zone
-- the person's browser happened to be in. Production shows exactly that: 68 of
-- the 72 logged rows sit at precisely 12:00 local -- 17:00Z for the
-- America/Chicago rows, 19:00Z for the America/Phoenix ones -- and none of
-- those times was ever entered by anybody.
--
-- Duration had nowhere else to live: it was only derivable from
-- `scheduled_end_at - scheduled_start_at`. So the invented start could not
-- simply be dropped without destroying every recorded duration and every
-- report total built on them.
--
-- What this migration does
-- ------------------------
--   1. Adds `duration_minutes`, so a meeting's LENGTH is recorded
--      independently of WHEN it started. A meeting may now honestly have a
--      duration and no known start time.
--   2. Backfills `duration_minutes` from the existing start/end pair for every
--      row that has one. Every duration currently readable stays readable and
--      identical; no report total moves.
--   3. Creates the audit table the repair writes to.
--
-- It is additive on purpose, and it is safe to apply BEFORE the application
-- code that reads the new column: nothing existing changes value, and code
-- that knows nothing about `duration_minutes` keeps working unchanged.
--
-- Clearing the synthetic start times is a SEPARATE migration
-- (20260916121000_dos_meeting_start_time_repair.sql) that must run only AFTER
-- the new code is live. Until then the application derives a meeting's length
-- from the start/end pair alone, so clearing those first would make 68 logged
-- meetings report no duration at all and the Master Ministry Report totals
-- would drop for as long as the gap lasted.
--
-- Nothing else is touched: no date, no participant, no note, no duration, no
-- row that carries a time a person actually entered.

alter table public.missionary_tables
  add column if not exists duration_minutes integer;

alter table public.missionary_tables
  drop constraint if exists missionary_tables_duration_minutes_check;
alter table public.missionary_tables
  add constraint missionary_tables_duration_minutes_check
  check (duration_minutes is null or duration_minutes > 0);

-- Step 2. Every duration that exists today, preserved in its own column
-- before anything is cleared. Rounded the same way the application derives it.
update public.missionary_tables
set duration_minutes = greatest(1, round(extract(epoch from (scheduled_end_at - scheduled_start_at)) / 60)::int)
where duration_minutes is null
  and scheduled_start_at is not null
  and scheduled_end_at is not null
  and scheduled_end_at > scheduled_start_at;

-- The audit trail for step 3. It exists so that "which meetings did we touch,
-- and what did they say before?" has an answer that is not a guess, and so the
-- rollback restores the exact previous values rather than recomputing them.
create table if not exists public.dos_meeting_start_time_repair (
  meeting_id uuid primary key references public.missionary_tables (id) on delete cascade,
  previous_scheduled_start_at timestamptz not null,
  previous_scheduled_end_at timestamptz,
  previous_timezone text,
  repaired_at timestamptz not null default now()
);

comment on table public.dos_meeting_start_time_repair is
  'Logged meetings whose start time was a synthetic local noon written by Log Meeting before a start-time field existed. One row per repaired meeting, holding the exact previous values.';

alter table public.dos_meeting_start_time_repair enable row level security;
