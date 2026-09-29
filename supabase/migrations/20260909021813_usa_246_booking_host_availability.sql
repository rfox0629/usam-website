-- USA-246 booking write path, founder correction (2026-09-09): host
-- availability is decided inside the transaction, under the per-workspace
-- lock, so no two overlapping bookings can ever share a host.
--
-- The caller passes an ordered candidate list (`host_candidates`):
--   team or single link with configured hosts -> those hosts, in the order
--     they are listed on the link;
--   link with no configured hosts -> the workspace owner only.
-- The function assigns the FIRST candidate who is free for the buffered
-- window (no live booking as that host, no scheduled meeting they own).
-- If every candidate is busy, or there is no candidate at all, the slot is
-- refused ('host_unavailable') and nothing is written.

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
  v_host_candidates jsonb := coalesce(p_input->'host_candidates', '[]'::jsonb);
  v_host_member_id uuid := null;
  v_host_user_id uuid := null;
  v_candidate jsonb;
  v_candidate_member uuid;
  v_candidate_user uuid;
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
  v_window_start timestamptz;
  v_window_end timestamptz;
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

  v_window_start := v_start_at - make_interval(mins => v_buffer_minutes);
  v_window_end := v_end_at + make_interval(mins => v_buffer_minutes);

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
      'person_id', v_existing.field_person_id,
      'host_member_id', null
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

  -- Bookings that block everyone: live bookings without a host (legacy rows).
  select count(*) into v_conflicts
    from public.dos_table_invitation_bookings b
   where b.workspace_id = v_workspace_id
     and b.status = 'booked'
     and b.host_member_id is null
     and b.start_at < v_window_end
     and b.end_at > v_window_start;

  if v_conflicts > 0 then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  -- Scheduled DOS meetings in the workspace, when the link blocks them.
  if v_block_dos_meetings then
    select count(*) into v_conflicts
      from public.missionary_tables t
     where (t.workspace_id = v_workspace_id or t.household_id = v_workspace_id)
       and t.meeting_status = 'scheduled'
       and t.scheduled_start_at is not null
       and t.scheduled_end_at is not null
       and t.scheduled_start_at < v_window_end
       and t.scheduled_end_at > v_window_start;

    if v_conflicts > 0 then
      raise exception 'slot_unavailable' using errcode = 'P0001';
    end if;
  end if;

  -- Host: the first candidate, in the caller's order, who is free. A host is
  -- busy when they already hold a live booking for an overlapping window, or
  -- own a scheduled meeting in it. Under the lock, so two concurrent
  -- requests can never both be given the same host for overlapping times.
  for v_candidate in select value from jsonb_array_elements(v_host_candidates) loop
    v_candidate_member := nullif(v_candidate->>'member_id', '')::uuid;
    v_candidate_user := nullif(v_candidate->>'user_id', '')::uuid;

    if v_candidate_member is null then
      continue;
    end if;

    select count(*) into v_conflicts
      from public.dos_table_invitation_bookings b
     where b.workspace_id = v_workspace_id
       and b.status = 'booked'
       and b.host_member_id = v_candidate_member
       and b.start_at < v_window_end
       and b.end_at > v_window_start;

    if v_conflicts = 0 and v_candidate_user is not null then
      select count(*) into v_conflicts
        from public.missionary_tables t
       where (t.workspace_id = v_workspace_id or t.household_id = v_workspace_id)
         and t.meeting_status = 'scheduled'
         and t.created_by = v_candidate_user
         and t.scheduled_start_at is not null
         and t.scheduled_end_at is not null
         and t.scheduled_start_at < v_window_end
         and t.scheduled_end_at > v_window_start;
    end if;

    if v_conflicts = 0 then
      v_host_member_id := v_candidate_member;
      v_host_user_id := v_candidate_user;
      exit;
    end if;
  end loop;

  if v_host_member_id is null then
    raise exception 'host_unavailable' using errcode = 'P0001';
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

  -- The scheduled meeting, with the complete planned snapshot. Notes hold
  -- only what the caller put in meeting.notes (never the phone or prayer
  -- request, which stay on the booking).
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
    'person_id', v_person_id,
    'host_member_id', v_host_member_id
  );
end;
$$;
