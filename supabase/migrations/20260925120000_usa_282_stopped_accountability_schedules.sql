-- USA-282: "Stop reminding me about this."
--
-- A leader needs to end a reminder without ending what it is about. Until now
-- an accountability schedule could only be 'active' or 'paused', and 'paused'
-- is not free: the Journey sync uses it as its own working state --
-- pauseResourceAssignmentFollowUpSchedules pauses a follow-up when its
-- assignment is paused, and syncResourceAssignmentFollowUpSchedules sets the
-- row back to 'active' whenever the assignment is touched.
--
-- So a stop expressed as 'paused' would be undone by the next sync, which is
-- exactly what "persist the stopped state so synchronization cannot recreate
-- that reminder" forbids. 'stopped' is its own state, and the sync leaves it
-- alone.
--
-- Nothing is deleted and no existing row changes: this only widens what the
-- column may hold. Rollback is 20260925120000_usa_282_stopped_accountability_schedules_rollback.sql,
-- which is safe only while no row is 'stopped'.

alter table public.dos_accountability_schedules
  drop constraint if exists dos_accountability_schedules_status_check;

alter table public.dos_accountability_schedules
  add constraint dos_accountability_schedules_status_check
    check (status in ('active', 'paused', 'stopped'));
