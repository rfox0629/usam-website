-- Rollback for 20260917190000_usa_280_person_merge_coverage.sql.
--
-- preview_person_merge() goes back to its 20260806 definition verbatim.
-- merge_person_records() is un-spliced the same way it was spliced: the
-- USA-280 block is cut out of whatever is currently live, so the rest of the
-- body is preserved exactly as that environment had it.
--
-- Note what reverting costs: a merge run afterwards again leaves
-- dos_resource_share_assignments, dos_discipleship_connections,
-- dos_circle_placements, discipleship_relationships, meeting_people and the
-- array columns pointing at the archived source row.
--
-- No schema or data change to undo. Merges already executed are not reversed
-- by this file; use dos_person_merge_log for that.

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

do $usa280rb$
declare
  v_def text;
  v_start int;
  v_end int;
  v_anchor text := '  update missionary_field_people
     set email = coalesce(nullif(email, ''''), nullif(v_source.email, '''')),';
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'merge_person_records';

  if v_def is null then
    raise exception 'merge_person_records() not found';
  end if;

  v_start := position('  -- USA-280: tables and columns added after' in v_def);

  if v_start = 0 then
    raise notice 'merge_person_records() carries no USA-280 block; nothing to do';
    return;
  end if;

  v_end := position(v_anchor in v_def);

  if v_end = 0 or v_end < v_start then
    raise exception 'cannot locate the end of the USA-280 block; refusing to cut blindly';
  end if;

  execute substring(v_def from 1 for v_start - 1) || substring(v_def from v_end);
  raise notice 'merge_person_records() reverted to its pre-USA-280 coverage';
end
$usa280rb$;
