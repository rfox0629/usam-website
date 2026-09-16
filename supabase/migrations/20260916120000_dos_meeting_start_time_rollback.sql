-- Rollback for 20260916120000_dos_meeting_start_time.sql.
--
-- Additive only, so the reverse is a clean drop. Run
-- 20260916121000_dos_meeting_start_time_repair_rollback.sql FIRST if the
-- repair was applied: it restores the cleared timestamps from the audit table
-- this drops, and once the table is gone those values cannot be recovered.
drop table if exists public.dos_meeting_start_time_repair;

alter table public.missionary_tables
  drop constraint if exists missionary_tables_duration_minutes_check;

alter table public.missionary_tables
  drop column if exists duration_minutes;
