-- DOS meeting start times, step 2 of 2: clear the synthetic noon stamps.
--
-- Runs only AFTER 20260916120000_dos_meeting_start_time.sql and after the code
-- that reads `duration_minutes` is live. That ordering is the point: until the
-- new code is deployed, a meeting's length is derived from the start/end pair
-- alone, so clearing those first would make these 68 meetings report no
-- duration and drop the Master Ministry Report totals until the gap closed.
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
-- provably invented, recorded as unknown. Every previous value is recorded
-- first, so the change is auditable and the rollback is exact.
--
-- Re-running is a no-op: the insert skips rows already recorded, and the
-- update only touches rows the insert has recorded.

-- Step 0. Re-sync `duration_minutes` with the start/end pair.
--
-- Between the schema step and this one, the OLD code is still live and still
-- writes `scheduled_start_at`/`scheduled_end_at` without knowing about
-- `duration_minutes`. A meeting logged in that window has no duration
-- recorded, and a meeting EDITED in that window has a stale one -- its length
-- changed while the column kept the value the backfill gave it. Either way the
-- start/end pair is the truth: the old code wrote `end = start + the duration
-- the person entered`, so the span IS what they entered.
--
-- Clearing the start without doing this first would either destroy a duration
-- (the null case) or freeze a wrong one (the stale case). It is idempotent and
-- a no-op once the new code is the only writer, because the new code keeps the
-- two in agreement by construction.
update public.missionary_tables
set duration_minutes = greatest(1, round(extract(epoch from (scheduled_end_at - scheduled_start_at)) / 60)::int)
where scheduled_start_at is not null
  and scheduled_end_at is not null
  and scheduled_end_at > scheduled_start_at
  and duration_minutes is distinct from greatest(1, round(extract(epoch from (scheduled_end_at - scheduled_start_at)) / 60)::int);

insert into public.dos_meeting_start_time_repair (meeting_id, previous_scheduled_start_at, previous_scheduled_end_at, previous_timezone)
select id, scheduled_start_at, scheduled_end_at, timezone
from public.missionary_tables
where meeting_status = 'logged'
  and planned_start_at is null
  and timezone is not null
  and scheduled_start_at is not null
  and to_char(scheduled_start_at at time zone timezone, 'HH24:MI') = '12:00'
on conflict (meeting_id) do nothing;

-- Duration must already be recorded, or this would destroy it. A row that
-- somehow has no duration keeps its start time rather than losing both.
update public.missionary_tables
set scheduled_start_at = null,
    scheduled_end_at = null
where id in (select meeting_id from public.dos_meeting_start_time_repair)
  and duration_minutes is not null;
