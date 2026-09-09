-- Rollback for 20260909090000_usa_246_booking_write_path.sql.
-- Drops the two functions, the new indexes and constraints, and the new
-- columns. Historical rows are untouched by both directions; new bookings
-- lose their operation key, host and match metadata but keep every column
-- that existed before (they remain valid bookings).
drop function if exists public.dos_resolve_table_booking_person(jsonb);
drop function if exists public.dos_create_table_booking(jsonb);

drop index if exists public.dos_table_invitation_bookings_table_id_idx;
drop index if exists public.dos_table_invitation_bookings_review_idx;
drop index if exists public.dos_table_invitation_bookings_host_slot_unique;
drop index if exists public.dos_table_invitation_bookings_operation_key_unique;

alter table public.dos_table_invitation_bookings
  drop constraint if exists dos_table_invitation_bookings_person_match_status_check,
  drop constraint if exists dos_table_invitation_bookings_operation_key_check;

alter table public.dos_table_invitation_bookings
  drop column if exists calendar_sync_error,
  drop column if exists person_match_resolved_by,
  drop column if exists person_match_resolved_at,
  drop column if exists person_match_candidates,
  drop column if exists person_match_status,
  drop column if exists host_user_id,
  drop column if exists host_member_id,
  drop column if exists operation_key;
