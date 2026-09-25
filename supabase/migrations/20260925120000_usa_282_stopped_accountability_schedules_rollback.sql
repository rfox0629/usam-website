-- Rollback for 20260925120000_usa_282_stopped_accountability_schedules.sql.
--
-- Returns any stopped reminder to 'paused' first, so the narrower constraint
-- can be restored without losing the row. A stopped reminder that comes back
-- as paused stays out of the active lists; the Journey sync may reactivate it,
-- which is the behaviour this migration existed to prevent.

update public.dos_accountability_schedules
   set status = 'paused'
 where status = 'stopped';

alter table public.dos_accountability_schedules
  drop constraint if exists dos_accountability_schedules_status_check;

alter table public.dos_accountability_schedules
  add constraint dos_accountability_schedules_status_check
    check (status in ('active', 'paused'));
