-- Rollback for 20260916121000_dos_meeting_start_time_repair.sql.
--
-- The repair recorded every previous value before clearing it, so the reverse
-- restores the exact timestamps rather than recomputing a noon. Only rows the
-- repair actually cleared are restored; a meeting saved with an unknown start
-- time after the fix shipped has no audit row and is left alone.
update public.missionary_tables as meetings
set scheduled_start_at = repair.previous_scheduled_start_at,
    scheduled_end_at = repair.previous_scheduled_end_at
from public.dos_meeting_start_time_repair as repair
where meetings.id = repair.meeting_id
  and meetings.scheduled_start_at is null;

delete from public.dos_meeting_start_time_repair;
