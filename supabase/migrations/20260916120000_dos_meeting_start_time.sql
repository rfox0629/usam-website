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
--   3. Clears the synthetic start on the logged rows that provably carry one,
--      recording each previous value first so the change is auditable and
--      exactly reversible.
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

-- Step 3. Record, then clear.
--
-- The scope is deliberately narrow and evidence-based. A row qualifies only
-- when ALL of these hold:
--
--   * it is logged -- a scheduled meeting's time was typed by a person;
--   * it carries no planned snapshot, so it never went through the
--     scheduled -> logged path that preserves a real planned time;
--   * it records the time zone it was written in, so "local noon" is a fact
--     rather than an assumption;
--   * its start is EXACTLY 12:00 in that zone -- the stamp the old code wrote.
--
-- A logged meeting at 10:00, 13:00 or 15:00 local was entered by a person and
-- is left exactly as it is. Times are never shifted, only either kept or, when
-- provably invented, recorded as unknown.
insert into public.dos_meeting_start_time_repair (meeting_id, previous_scheduled_start_at, previous_scheduled_end_at, previous_timezone)
select id, scheduled_start_at, scheduled_end_at, timezone
from public.missionary_tables
where meeting_status = 'logged'
  and planned_start_at is null
  and timezone is not null
  and scheduled_start_at is not null
  and to_char(scheduled_start_at at time zone timezone, 'HH24:MI') = '12:00'
on conflict (meeting_id) do nothing;

update public.missionary_tables
set scheduled_start_at = null,
    scheduled_end_at = null
where id in (select meeting_id from public.dos_meeting_start_time_repair);
