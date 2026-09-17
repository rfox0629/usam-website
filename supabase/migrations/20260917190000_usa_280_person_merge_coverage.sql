-- USA-280: teach the person-merge tool about the tables added since it was
-- written.
--
-- merge_person_records() dates from 20260806 and predates USA-278's shared
-- Library resources (dos_resource_share_assignments) and USA-275's
-- discipleship connections, among others. Merging a duplicate without them
-- archives the source row while a sent assessment link, a circle placement or
-- a discipleship connection still points at it, which is exactly the broken
-- link the tool exists to prevent.
--
-- preview_person_merge() is replaced outright. merge_person_records() is
-- SPLICED rather than replaced: the body running in production had its
-- comments stripped by an earlier apply, so a wholesale replacement would
-- quietly swap the live definition for a differently-sourced one. Reading the
-- current definition and inserting into it keeps whatever each environment is
-- actually running, and the guards make it idempotent and refuse to splice a
-- body it does not recognise.
--
-- Additive: no schema change, no data change.
-- Rollback: 20260917190000_usa_280_person_merge_coverage_rollback.sql

create or replace function preview_person_merge(p_source_id uuid, p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb := '{}'::jsonb;
begin
  if p_source_id = p_target_id then
    raise exception 'source and target person ids must differ';
  end if;

  select jsonb_build_object(
    'source', to_jsonb(s.*),
    'target', to_jsonb(t.*),
    'row_counts', jsonb_build_object(
      'dos_accountability_check_ins', (select count(*) from dos_accountability_check_ins where person_id in (p_source_id, p_target_id)),
      'dos_accountability_schedules', (select count(*) from dos_accountability_schedules where person_id in (p_source_id, p_target_id)),
      'dos_assessment_results_person', (select count(*) from dos_assessment_results where person_id in (p_source_id, p_target_id)),
      'dos_assessment_results_secondary', (select count(*) from dos_assessment_results where secondary_person_id in (p_source_id, p_target_id)),
      'dos_circle_overrides', (select count(*) from dos_circle_overrides where person_id in (p_source_id, p_target_id)),
      'dos_commitment_updates', (select count(*) from dos_commitment_updates where person_id in (p_source_id, p_target_id)),
      'dos_group_attendance', (select count(*) from dos_group_attendance where person_id in (p_source_id, p_target_id)),
      'dos_group_gatherings_leader', (select count(*) from dos_group_gatherings where acting_leader_person_id in (p_source_id, p_target_id)),
      'dos_group_member_access_tokens', (select count(*) from dos_group_member_access_tokens where created_by_person_id in (p_source_id, p_target_id)),
      'dos_group_member_identities', (select count(*) from dos_group_member_identities where person_id in (p_source_id, p_target_id)),
      'dos_group_member_notification_preferences', (select count(*) from dos_group_member_notification_preferences where person_id in (p_source_id, p_target_id)),
      'dos_group_member_sessions', (select count(*) from dos_group_member_sessions where person_id in (p_source_id, p_target_id)),
      'dos_group_members', (select count(*) from dos_group_members where person_id in (p_source_id, p_target_id)),
      'dos_group_notification_deliveries', (select count(*) from dos_group_notification_deliveries where person_id in (p_source_id, p_target_id)),
      'dos_group_rsvps', (select count(*) from dos_group_rsvps where person_id in (p_source_id, p_target_id)),
      'dos_group_updates', (select count(*) from dos_group_updates where created_by_person_id in (p_source_id, p_target_id)),
      'dos_groups_primary_leader', (select count(*) from dos_groups where primary_leader_person_id in (p_source_id, p_target_id)),
      'dos_groups_leader', (select count(*) from dos_groups where leader_person_id in (p_source_id, p_target_id)),
      'dos_guided_resource_progress', (select count(*) from dos_guided_resource_progress where person_id in (p_source_id, p_target_id)),
      'dos_identity_links', (select count(*) from dos_identity_links where person_id in (p_source_id, p_target_id)),
      'dos_meeting_reviews', (select count(*) from dos_meeting_reviews where reviewer_person_id in (p_source_id, p_target_id)),
      'dos_person_commitments', (select count(*) from dos_person_commitments where person_id in (p_source_id, p_target_id)),
      'dos_relationship_score_history', (select count(*) from dos_relationship_score_history where person_id in (p_source_id, p_target_id)),
      'dos_relationship_scores', (select count(*) from dos_relationship_scores where person_id in (p_source_id, p_target_id)),
      'dos_resource_assignments', (select count(*) from dos_resource_assignments where person_id in (p_source_id, p_target_id)),
      'dos_review_links_recipient', (select count(*) from dos_review_links where recipient_person_id in (p_source_id, p_target_id)),
      'dos_review_links_reviewer', (select count(*) from dos_review_links where reviewer_person_id in (p_source_id, p_target_id)),
      'dos_table_invitation_bookings', (select count(*) from dos_table_invitation_bookings where field_person_id in (p_source_id, p_target_id)),
      'dos_user_mentor_meetings', (select count(*) from dos_user_mentor_meetings where field_person_id in (p_source_id, p_target_id)),
      'dos_user_mentor_relationships', (select count(*) from dos_user_mentor_relationships where field_person_id in (p_source_id, p_target_id)),
      'dos_user_prayer_logs', (select count(*) from dos_user_prayer_logs where field_person_id in (p_source_id, p_target_id)),
      'fruit_events', (select count(*) from fruit_events where person_id in (p_source_id, p_target_id)),
      'meeting_reflections', (select count(*) from meeting_reflections where person_id in (p_source_id, p_target_id)),
      'missionary_connection_logs', (select count(*) from missionary_connection_logs where field_person_id in (p_source_id, p_target_id)),
      'missionary_fruit_items', (select count(*) from missionary_fruit_items where field_person_id in (p_source_id, p_target_id)),
      'participant_reviews', (select count(*) from participant_reviews where person_id in (p_source_id, p_target_id)),
      'participant_testimonies', (select count(*) from participant_testimonies where person_id in (p_source_id, p_target_id)),
      'person_roles', (select count(*) from person_roles where field_person_id in (p_source_id, p_target_id)),
      'prayer_logs', (select count(*) from prayer_logs where field_person_id in (p_source_id, p_target_id)),
      'prayer_partners', (select count(*) from prayer_partners where field_person_id in (p_source_id, p_target_id)),
      'prayer_requests', (select count(*) from prayer_requests where created_by_person_id in (p_source_id, p_target_id)),
      'relationship_reminders', (select count(*) from relationship_reminders where person_id in (p_source_id, p_target_id))
    )
    -- Concatenated rather than appended: jsonb_build_object() takes at most
    -- 100 arguments, and the original list already spends 82 of them.
    || jsonb_build_object(
      'discipleship_relationships', (select count(*) from discipleship_relationships where disciple_person_id in (p_source_id, p_target_id)),
      'dos_circle_placements', (select count(*) from dos_circle_placements where person_id in (p_source_id, p_target_id)),
      'dos_commitment_updates_subject', (select count(*) from dos_commitment_updates where subject_person_id in (p_source_id, p_target_id)),
      'dos_discipleship_account_connections', (select count(*) from dos_discipleship_account_connections where person_id in (p_source_id, p_target_id)),
      'dos_discipleship_connections_disciple', (select count(*) from dos_discipleship_connections where disciple_person_id in (p_source_id, p_target_id)),
      'dos_discipleship_connections_mentor', (select count(*) from dos_discipleship_connections where mentor_person_id in (p_source_id, p_target_id)),
      'dos_discipleship_identity_matches', (select count(*) from dos_discipleship_identity_matches where matched_person_id in (p_source_id, p_target_id)),
      'dos_resource_share_assignments_primary', (select count(*) from dos_resource_share_assignments where primary_person_id in (p_source_id, p_target_id)),
      'dos_resource_share_assignments_secondary', (select count(*) from dos_resource_share_assignments where secondary_person_id in (p_source_id, p_target_id)),
      'meeting_people', (select count(*) from meeting_people where person_id in (p_source_id, p_target_id)),
      'missionary_tables_field_person_ids', (select count(*) from missionary_tables where field_person_ids && array[p_source_id, p_target_id]),
      'prayer_requests_field_person', (select count(*) from prayer_requests where field_person_id in (p_source_id, p_target_id)),
      'prayer_requests_linked_person_ids', (select count(*) from prayer_requests where linked_person_ids && array[p_source_id, p_target_id])
    )
  )
  into v_result
  from missionary_field_people s, missionary_field_people t
  where s.id = p_source_id and t.id = p_target_id;

  if v_result is null then
    raise exception 'source % or target % not found in missionary_field_people', p_source_id, p_target_id;
  end if;

  return v_result;
end;
$$;

comment on function preview_person_merge(uuid, uuid) is 'Read-only preview of merge_person_records(): row counts per referencing table plus both person rows. Call this first.';

do $usa280$
declare
  v_def text;
  v_anchor text := '  update missionary_field_people
     set email = coalesce(nullif(email, ''''), nullif(v_source.email, '''')),';
  v_additions text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'merge_person_records';

  if v_def is null then
    raise exception 'merge_person_records() not found';
  end if;

  if position('USA-280' in v_def) > 0 then
    raise notice 'merge_person_records() already extended; nothing to do';
    return;
  end if;

  if position(v_anchor in v_def) = 0 then
    raise exception 'anchor not found in merge_person_records(); refusing to splice blindly';
  end if;

  v_additions := $add$  -- USA-280: tables and columns added after the original merge tool was
  -- written. Without these a merge leaves an assessment share link, a circle
  -- placement or a discipleship connection pointing at the archived row.

  update dos_commitment_updates set subject_person_id = p_target_id where subject_person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('dos_commitment_updates_subject', v_moved);

  update dos_discipleship_identity_matches set matched_person_id = p_target_id where matched_person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('dos_discipleship_identity_matches', v_moved);

  update prayer_requests set field_person_id = p_target_id where field_person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('prayer_requests_field_person', v_moved);

  -- Array columns: swap the element and de-duplicate, so a table that already
  -- listed both duplicates does not end up naming the target twice.
  update missionary_tables
     set field_person_ids = (
           select array_agg(distinct case when pid = p_source_id then p_target_id else pid end)
           from unnest(field_person_ids) as pid
         )
   where field_person_ids && array[p_source_id];
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('missionary_tables_field_person_ids', v_moved);

  update prayer_requests
     set linked_person_ids = (
           select array_agg(distinct case when pid = p_source_id then p_target_id else pid end)
           from unnest(linked_person_ids) as pid
         )
   where linked_person_ids && array[p_source_id];
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('prayer_requests_linked_person_ids', v_moved);

  -- meeting_people: unique (meeting_id, person_id). Both duplicates may have
  -- attended the same meeting; keep the target's row.
  update meeting_people mp
     set person_id = p_target_id
   where mp.person_id = p_source_id
     and not exists (
       select 1 from meeting_people mp2
       where mp2.meeting_id = mp.meeting_id and mp2.person_id = p_target_id
     );
  get diagnostics v_moved = row_count;
  select count(*) into v_dropped from meeting_people where person_id = p_source_id;
  if v_dropped > 0 then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('table', 'meeting_people', 'kept_target_row_dropped_source_rows', v_dropped));
  end if;
  v_counts := v_counts || jsonb_build_object('meeting_people', v_moved);

  -- dos_circle_placements: unique (workspace_id, person_id) where the
  -- placement is current. History rows move freely; a current one yields.
  update dos_circle_placements cp
     set person_id = p_target_id
   where cp.person_id = p_source_id
     and not exists (
       select 1 from dos_circle_placements cp2
       where cp2.workspace_id = cp.workspace_id
         and cp2.person_id = p_target_id
         and cp2.effective_to is null
         and cp.effective_to is null
     );
  get diagnostics v_moved = row_count;
  select count(*) into v_dropped from dos_circle_placements where person_id = p_source_id;
  if v_dropped > 0 then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('table', 'dos_circle_placements', 'kept_target_row_dropped_source_rows', v_dropped));
  end if;
  v_counts := v_counts || jsonb_build_object('dos_circle_placements', v_moved);

  -- discipleship_relationships: unique (discipler_profile_id,
  -- disciple_person_id) while active or paused.
  update discipleship_relationships dr
     set disciple_person_id = p_target_id
   where dr.disciple_person_id = p_source_id
     and not exists (
       select 1 from discipleship_relationships dr2
       where dr2.discipler_profile_id = dr.discipler_profile_id
         and dr2.disciple_person_id = p_target_id
         and dr2.status in ('active', 'paused')
         and dr.status in ('active', 'paused')
     );
  get diagnostics v_moved = row_count;
  select count(*) into v_dropped from discipleship_relationships where disciple_person_id = p_source_id;
  if v_dropped > 0 then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('table', 'discipleship_relationships', 'kept_target_row_dropped_source_rows', v_dropped));
  end if;
  v_counts := v_counts || jsonb_build_object('discipleship_relationships', v_moved);

  -- dos_discipleship_account_connections: unique (person_id) while the
  -- invitation is pending or accepted.
  update dos_discipleship_account_connections ac
     set person_id = p_target_id
   where ac.person_id = p_source_id
     and not exists (
       select 1 from dos_discipleship_account_connections ac2
       where ac2.person_id = p_target_id
         and ac2.status in ('pending', 'accepted')
         and ac.status in ('pending', 'accepted')
     );
  get diagnostics v_moved = row_count;
  select count(*) into v_dropped from dos_discipleship_account_connections where person_id = p_source_id;
  if v_dropped > 0 then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('table', 'dos_discipleship_account_connections', 'kept_target_row_dropped_source_rows', v_dropped));
  end if;
  v_counts := v_counts || jsonb_build_object('dos_discipleship_account_connections', v_moved);

  -- dos_discipleship_connections: unique (mentor_person_id,
  -- disciple_person_id) while active. A connection that would end up naming
  -- the same person on both sides is dropped rather than made self-referential
  -- (the table forbids it, and it would be meaningless anyway).
  update dos_discipleship_connections dc
     set mentor_person_id = p_target_id
   where dc.mentor_person_id = p_source_id
     and dc.disciple_person_id is distinct from p_target_id
     and not exists (
       select 1 from dos_discipleship_connections dc2
       where dc2.mentor_person_id = p_target_id
         and dc2.disciple_person_id = dc.disciple_person_id
         and dc2.status = 'active'
         and dc.status = 'active'
     );
  get diagnostics v_moved = row_count;
  v_counts := v_counts || jsonb_build_object('dos_discipleship_connections_mentor', v_moved);

  update dos_discipleship_connections dc
     set disciple_person_id = p_target_id
   where dc.disciple_person_id = p_source_id
     and dc.mentor_person_id is distinct from p_target_id
     and not exists (
       select 1 from dos_discipleship_connections dc2
       where dc2.disciple_person_id = p_target_id
         and dc2.mentor_person_id = dc.mentor_person_id
         and dc2.status = 'active'
         and dc.status = 'active'
     );
  get diagnostics v_moved = row_count;
  select count(*) into v_dropped from dos_discipleship_connections
   where mentor_person_id = p_source_id or disciple_person_id = p_source_id;
  if v_dropped > 0 then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('table', 'dos_discipleship_connections', 'kept_target_row_dropped_source_rows', v_dropped));
  end if;
  v_counts := v_counts || jsonb_build_object('dos_discipleship_connections_disciple', v_moved);

  -- dos_resource_share_assignments (USA-278): a sent Library resource. Two
  -- partial unique indexes guard the OPEN rows, one on the primary person and
  -- one on the order-independent couple key; completed and revoked rows are
  -- free to move. A row that pairs the two duplicates with each other would
  -- become self-coupled, so it is left on the source and logged instead.
  update dos_resource_share_assignments sa
     set primary_person_id = p_target_id
   where sa.primary_person_id = p_source_id
     and sa.secondary_person_id is distinct from p_target_id
     and not exists (
       select 1 from dos_resource_share_assignments sa2
       where sa2.workspace_id = sa.workspace_id
         and sa2.resource_slug = sa.resource_slug
         and sa2.primary_person_id = p_target_id
         and sa2.status in ('link_ready', 'in_progress')
         and sa.status in ('link_ready', 'in_progress')
     );
  get diagnostics v_moved = row_count;
  v_counts := v_counts || jsonb_build_object('dos_resource_share_assignments_primary', v_moved);

  update dos_resource_share_assignments sa
     set secondary_person_id = p_target_id
   where sa.secondary_person_id = p_source_id
     and sa.primary_person_id is distinct from p_target_id
     and not exists (
       select 1 from dos_resource_share_assignments sa2
       where sa2.workspace_id = sa.workspace_id
         and sa2.resource_slug = sa.resource_slug
         and sa2.status in ('link_ready', 'in_progress')
         and sa.status in ('link_ready', 'in_progress')
         and least(sa2.primary_person_id, sa2.secondary_person_id) = least(sa.primary_person_id, p_target_id)
         and greatest(sa2.primary_person_id, sa2.secondary_person_id) = greatest(sa.primary_person_id, p_target_id)
     );
  get diagnostics v_moved = row_count;
  select count(*) into v_dropped from dos_resource_share_assignments
   where primary_person_id = p_source_id or secondary_person_id = p_source_id;
  if v_dropped > 0 then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('table', 'dos_resource_share_assignments', 'kept_target_row_dropped_source_rows', v_dropped));
  end if;
  v_counts := v_counts || jsonb_build_object('dos_resource_share_assignments_secondary', v_moved);

$add$;

  execute replace(v_def, v_anchor, v_additions || v_anchor);
  raise notice 'merge_person_records() extended for USA-280';
end
$usa280$;
