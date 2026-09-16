-- Rollback for 20260916120000_dos_meeting_start_time.sql.
--
-- The repair recorded every previous value before clearing it, so the reverse
-- restores the exact timestamps rather than recomputing a noon. Only rows the
-- migration actually touched are restored; a meeting saved with an unknown
-- start time after the fix shipped has no audit row and is left alone.
update public.missionary_tables as meetings
set scheduled_start_at = repair.previous_scheduled_start_at,
    scheduled_end_at = repair.previous_scheduled_end_at
from public.dos_meeting_start_time_repair as repair
where meetings.id = repair.meeting_id
  and meetings.scheduled_start_at is null;

drop table if exists public.dos_meeting_start_time_repair;

alter table public.missionary_tables
  drop constraint if exists missionary_tables_duration_minutes_check;

alter table public.missionary_tables
  drop column if exists duration_minutes;
