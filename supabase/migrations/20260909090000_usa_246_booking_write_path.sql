-- USA-246 booking write path (founder-approved 2026-09-08).
-- Additive and backward compatible. Historical bookings are not modified:
-- every new column is nullable with no default, so the four existing rows
-- keep exactly the values they have today (new columns read as null).
--
-- 1. Idempotency: a client-supplied operation key, unique per link.
-- 2. Host attribution on the booking.
-- 3. Person-resolution outcome (linked / created / review / resolved) with
--    the candidates preserved for review.
-- 4. Sync outcome detail.
-- 5. One transactional function that creates a booking and its scheduled
--    meeting (and, when there is no credible match, the Person) atomically,
--    serialized per workspace, with the slot re-checked inside the lock.
-- 6. One transactional function that resolves a flagged Person match.

alter table public.dos_table_invitation_bookings
  add column if not exists operation_key text,
  add column if not exists host_member_id uuid references public.missionary_team_members(id) on delete set null,
  add column if not exists host_user_id uuid,
  add column if not exists person_match_status text,
  add column if not exists person_match_candidates jsonb,
  add column if not exists person_match_resolved_at timestamptz,
  add column if not exists person_match_resolved_by uuid,
  add column if not exists calendar_sync_error text;

alter table public.dos_table_invitation_bookings
  drop constraint if exists dos_table_invitation_bookings_operation_key_check,
  add constraint dos_table_invitation_bookings_operation_key_check
    check (operation_key is null or length(operation_key) between 8 and 128);

alter table public.dos_table_invitation_bookings
  drop constraint if exists dos_table_invitation_bookings_person_match_status_check,
  add constraint dos_table_invitation_bookings_person_match_status_check
    check (person_match_status is null or person_match_status in ('linked', 'created', 'review', 'resolved'));

-- Idempotency: the same operation key on the same link is the same booking.
create unique index if not exists dos_table_invitation_bookings_operation_key_unique
  on public.dos_table_invitation_bookings (invitation_id, operation_key)
  where operation_key is not null;

-- Hard backstop against two live bookings for the same host at the same start.
-- Overlaps that are not the same instant are rejected inside the function,
-- under the per-workspace lock; this index only guards the exact case.
create unique index if not exists dos_table_invitation_bookings_host_slot_unique
  on public.dos_table_invitation_bookings (workspace_id, host_member_id, start_at)
  where status = 'booked' and host_member_id is not null;

create index if not exists dos_table_invitation_bookings_review_idx
  on public.dos_table_invitation_bookings (workspace_id, person_match_status)
  where person_match_status = 'review';

create index if not exists dos_table_invitation_bookings_table_id_idx
  on public.dos_table_invitation_bookings (table_id)
  where table_id is not null;

-- Creates one booking and, when the link asks for it, one scheduled meeting,
-- in one transaction. Runs under a per-workspace advisory lock so concurrent
-- requests for the same workspace are applied one at a time and the slot is
-- re-checked after the lock is held. Raises on any rule failure, which rolls
-- everything back. Returns jsonb.
create or replace function public.dos_create_table_booking(p_input jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_invitation_id uuid := (p_input->>'invitation_id')::uuid;
  v_workspace_id uuid := (p_input->>'workspace_id')::uuid;
  v_operation_key text := nullif(trim(p_input->>'operation_key'), '');
  v_start_at timestamptz := (p_input->>'start_at')::timestamptz;
  v_end_at timestamptz := (p_input->>'end_at')::timestamptz;
  v_timezone text := coalesce(nullif(trim(p_input->>'timezone'), ''), 'America/Chicago');
  v_buffer_minutes integer := coalesce((p_input->>'buffer_minutes')::integer, 0);
  v_max_per_day integer := nullif((p_input->>'max_per_day')::integer, 0);
  v_max_per_week integer := nullif((p_input->>'max_per_week')::integer, 0);
  v_block_dos_meetings boolean := coalesce((p_input->>'block_dos_meetings')::boolean, true);
  v_host_member_id uuid := nullif(p_input->>'host_member_id', '')::uuid;
  v_host_user_id uuid := nullif(p_input->>'host_user_id', '')::uuid;
  v_person_id uuid := nullif(p_input->>'person_id', '')::uuid;
  v_create_person boolean := coalesce((p_input->>'create_person')::boolean, false);
  v_person_match_status text := coalesce(nullif(p_input->>'person_match_status', ''), 'created');
  v_person_match_candidates jsonb := coalesce(p_input->'person_match_candidates', '[]'::jsonb);
  v_create_meeting boolean := coalesce((p_input->>'create_meeting')::boolean, true);
  v_requester jsonb := coalesce(p_input->'requester', '{}'::jsonb);
  v_meeting jsonb := coalesce(p_input->'meeting', '{}'::jsonb);
  v_name text := nullif(trim(v_requester->>'name'), '');
  v_email text := lower(nullif(trim(v_requester->>'email'), ''));
  v_phone text := nullif(trim(v_requester->>'phone'), '');
  v_notes text := nullif(trim(v_requester->>'notes'), '');
  v_prayer text := nullif(trim(v_requester->>'prayer_request'), '');
  v_existing record;
  v_invitation record;
  v_conflicts integer;
  v_day_count integer;
  v_week_count integer;
  v_local_date date;
  v_table_id uuid;
  v_booking_id uuid;
begin
  if v_invitation_id is null or v_workspace_id is null or v_operation_key is null or v_start_at is null or v_end_at is null then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  if v_end_at <= v_start_at then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  if v_name is null or v_email is null or position('@' in v_email) <= 1 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  -- One booking at a time per workspace. Released at commit or rollback.
  perform pg_advisory_xact_lock(hashtext('dos_table_booking:' || v_workspace_id::text));

  -- Idempotency: a retry with the same key is the same booking.
  select b.id, b.table_id, b.field_person_id, b.status
    into v_existing
    from public.dos_table_invitation_bookings b
   where b.invitation_id = v_invitation_id
     and b.operation_key = v_operation_key
   limit 1;

  if found then
    return jsonb_build_object(
      'status', 'already_booked',
      'booking_id', v_existing.id,
      'table_id', v_existing.table_id,
      'person_id', v_existing.field_person_id
    );
  end if;

  -- The link must still be live.
  select i.id, i.status, i.public_enabled, i.workspace_id
    into v_invitation
    from public.dos_table_invitations i
   where i.id = v_invitation_id
     for share;

  if not found or v_invitation.workspace_id <> v_workspace_id or v_invitation.status <> 'active' or v_invitation.public_enabled is not true then
    raise exception 'invitation_unavailable' using errcode = 'P0001';
  end if;

  -- Slot re-check inside the lock: other live bookings (this host, or any
  -- booking without a host) within the buffered window.
  select count(*) into v_conflicts
    from public.dos_table_invitation_bookings b
   where b.workspace_id = v_workspace_id
     and b.status = 'booked'
     and (v_host_member_id is null or b.host_member_id is null or b.host_member_id = v_host_member_id)
     and b.start_at < v_end_at + make_interval(mins => v_buffer_minutes)
     and b.end_at > v_start_at - make_interval(mins => v_buffer_minutes);

  if v_conflicts > 0 then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  -- And scheduled DOS meetings in the workspace, when the link blocks them.
  if v_block_dos_meetings then
    select count(*) into v_conflicts
      from public.missionary_tables t
     where (t.workspace_id = v_workspace_id or t.household_id = v_workspace_id)
       and t.meeting_status = 'scheduled'
       and t.scheduled_start_at is not null
       and t.scheduled_end_at is not null
       and t.scheduled_start_at < v_end_at + make_interval(mins => v_buffer_minutes)
       and t.scheduled_end_at > v_start_at - make_interval(mins => v_buffer_minutes);

    if v_conflicts > 0 then
      raise exception 'slot_unavailable' using errcode = 'P0001';
    end if;
  end if;

  -- Per-link daily and weekly limits, counted in the link's timezone.
  v_local_date := (v_start_at at time zone v_timezone)::date;

  if v_max_per_day is not null then
    select count(*) into v_day_count
      from public.dos_table_invitation_bookings b
     where b.invitation_id = v_invitation_id
       and b.status = 'booked'
       and (b.start_at at time zone v_timezone)::date = v_local_date;

    if v_day_count >= v_max_per_day then
      raise exception 'limit_reached' using errcode = 'P0001';
    end if;
  end if;

  if v_max_per_week is not null then
    select count(*) into v_week_count
      from public.dos_table_invitation_bookings b
     where b.invitation_id = v_invitation_id
       and b.status = 'booked'
       and date_trunc('week', (b.start_at at time zone v_timezone)::date::timestamp) = date_trunc('week', v_local_date::timestamp);

    if v_week_count >= v_max_per_week then
      raise exception 'limit_reached' using errcode = 'P0001';
    end if;
  end if;

  -- A Person is created only when the caller found no credible match.
  if v_person_id is null and v_create_person then
    insert into public.missionary_field_people (household_id, workspace_id, name, email, phone, source, status, last_activity_at)
    values (v_workspace_id, v_workspace_id, v_name, v_email, v_phone, 'field', 'active', now())
    returning id into v_person_id;
  end if;

  if v_person_id is not null then
    update public.missionary_field_people
       set last_activity_at = greatest(coalesce(last_activity_at, now()), now())
     where id = v_person_id;
  end if;

  -- The scheduled meeting, with the complete planned snapshot.
  if v_create_meeting then
    insert into public.missionary_tables (
      household_id, workspace_id, table_date, table_type, participant_names, field_person_ids,
      notes, source, created_by, meeting_status, scheduled_start_at, scheduled_end_at, timezone,
      google_sync_enabled, planned_start_at, planned_end_at, planned_date, planned_duration_minutes, planned_timezone
    )
    values (
      v_workspace_id,
      v_workspace_id,
      v_local_date,
      coalesce(nullif(v_meeting->>'table_type', ''), 'kitchen_table'),
      array[v_name],
      case when v_person_id is null then '{}'::uuid[] else array[v_person_id] end,
      nullif(v_meeting->>'notes', ''),
      'field',
      v_host_user_id,
      'scheduled',
      v_start_at,
      v_end_at,
      v_timezone,
      coalesce((v_meeting->>'google_sync_enabled')::boolean, false),
      v_start_at,
      v_end_at,
      v_local_date,
      greatest(1, round(extract(epoch from (v_end_at - v_start_at)) / 60)::integer),
      v_timezone
    )
    returning id into v_table_id;

    update public.missionary_tables set lifecycle_id = v_table_id where id = v_table_id and lifecycle_id is null;
  end if;

  insert into public.dos_table_invitation_bookings (
    invitation_id, workspace_id, field_person_id, table_id, requester_name, requester_email, requester_phone,
    requester_notes, prayer_request, status, start_at, end_at, timezone, calendar_event_synced,
    operation_key, host_member_id, host_user_id, person_match_status, person_match_candidates
  )
  values (
    v_invitation_id, v_workspace_id, v_person_id, v_table_id, v_name, v_email, v_phone,
    v_notes, v_prayer, 'booked', v_start_at, v_end_at, v_timezone, false,
    v_operation_key, v_host_member_id, v_host_user_id, v_person_match_status, v_person_match_candidates
  )
  returning id into v_booking_id;

  return jsonb_build_object(
    'status', 'booked',
    'booking_id', v_booking_id,
    'table_id', v_table_id,
    'person_id', v_person_id
  );
end;
$$;

-- Resolves a booking flagged for Person review: link to a chosen existing
-- Person, or create one from the preserved guest details. Also attaches the
-- Person to the booking's meeting when that meeting has no people yet.
create or replace function public.dos_resolve_table_booking_person(p_input jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_booking_id uuid := (p_input->>'booking_id')::uuid;
  v_workspace_id uuid := (p_input->>'workspace_id')::uuid;
  v_person_id uuid := nullif(p_input->>'person_id', '')::uuid;
  v_action text := coalesce(p_input->>'action', 'link');
  v_resolved_by uuid := nullif(p_input->>'resolved_by', '')::uuid;
  v_booking record;
begin
  select b.id, b.workspace_id, b.table_id, b.requester_name, b.requester_email, b.requester_phone, b.person_match_status
    into v_booking
    from public.dos_table_invitation_bookings b
   where b.id = v_booking_id and b.workspace_id = v_workspace_id
     for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if v_action = 'create' then
    insert into public.missionary_field_people (household_id, workspace_id, name, email, phone, source, status, last_activity_at)
    values (v_workspace_id, v_workspace_id, v_booking.requester_name, lower(v_booking.requester_email), v_booking.requester_phone, 'field', 'active', now())
    returning id into v_person_id;
  elsif v_person_id is null then
    raise exception 'invalid_input' using errcode = 'P0001';
  else
    perform 1 from public.missionary_field_people p
      where p.id = v_person_id and (p.workspace_id = v_workspace_id or p.household_id = v_workspace_id);

    if not found then
      raise exception 'person_not_found' using errcode = 'P0001';
    end if;
  end if;

  update public.dos_table_invitation_bookings
     set field_person_id = v_person_id,
         person_match_status = 'resolved',
         person_match_resolved_at = now(),
         person_match_resolved_by = v_resolved_by
   where id = v_booking_id;

  if v_booking.table_id is not null then
    update public.missionary_tables
       set field_person_ids = array[v_person_id]
     where id = v_booking.table_id
       and coalesce(array_length(field_person_ids, 1), 0) = 0;
  end if;

  update public.missionary_field_people
     set last_activity_at = greatest(coalesce(last_activity_at, now()), now())
   where id = v_person_id;

  return jsonb_build_object('status', 'resolved', 'booking_id', v_booking_id, 'person_id', v_person_id, 'table_id', v_booking.table_id);
end;
$$;
