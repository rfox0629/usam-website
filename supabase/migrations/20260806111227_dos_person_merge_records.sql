-- Reusable admin "Merge Person Records" capability.
-- Preserves all context from a duplicate missionary_field_people row by
-- repointing every known foreign key to the canonical (target) row, then
-- archiving (never deleting) the duplicate. Built after the USA-151 live
-- duplicate-Tanner-Kent incident so future duplicates never require a
-- one-off SQL cleanup.

create table if not exists dos_person_merge_log (
  id uuid primary key default gen_random_uuid(),
  source_person_id uuid not null,
  target_person_id uuid not null,
  merged_by uuid,
  before_snapshot jsonb not null,
  table_counts jsonb not null,
  conflicts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

comment on table dos_person_merge_log is 'Audit trail for merge_person_records(): one row per executed merge, with per-table row-move counts and any conflict-resolution decisions.';

-- Returns a jsonb report of what WOULD move, without changing anything.
-- Use before calling merge_person_records() to preview conflicts.
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

-- Executes the merge inside an implicit function-level transaction.
-- Simple one-to-many history tables are repointed outright. Tables with a
-- unique constraint that includes the person column keep the target''s
-- existing row on conflict and drop the source''s row (logged, not deleted
-- silently -- the conflict is recorded in dos_person_merge_log.conflicts).
-- The source person row is archived (status = 'archived'), never deleted,
-- and any contact field the target is missing is backfilled from the source.
create or replace function merge_person_records(p_source_id uuid, p_target_id uuid, p_actor_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source missionary_field_people%rowtype;
  v_target missionary_field_people%rowtype;
  v_before jsonb;
  v_counts jsonb := '{}'::jsonb;
  v_conflicts jsonb := '[]'::jsonb;
  v_moved int;
  v_dropped int;
begin
  if p_source_id = p_target_id then
    raise exception 'source and target person ids must differ';
  end if;

  select * into v_source from missionary_field_people where id = p_source_id for update;
  if not found then
    raise exception 'source person % not found', p_source_id;
  end if;

  select * into v_target from missionary_field_people where id = p_target_id for update;
  if not found then
    raise exception 'target person % not found', p_target_id;
  end if;

  v_before := jsonb_build_object('source', to_jsonb(v_source), 'target', to_jsonb(v_target));

  -- Simple repoints: PK(id) only, no unique constraint on the person column,
  -- so both rows' history can coexist under the target with no conflict.
  update dos_accountability_check_ins set person_id = p_target_id where person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('dos_accountability_check_ins', v_moved);

  update dos_accountability_schedules set person_id = p_target_id where person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('dos_accountability_schedules', v_moved);

  update dos_assessment_results set person_id = p_target_id where person_id = p_source_id;
  update dos_assessment_results set secondary_person_id = p_target_id where secondary_person_id = p_source_id;

  update dos_commitment_updates set person_id = p_target_id where person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('dos_commitment_updates', v_moved);

  update dos_group_member_access_tokens set created_by_person_id = p_target_id where created_by_person_id = p_source_id;
  update dos_group_member_notification_preferences set person_id = p_target_id where person_id = p_source_id;
  update dos_group_member_sessions set person_id = p_target_id where person_id = p_source_id;
  update dos_group_notification_deliveries set person_id = p_target_id where person_id = p_source_id;
  update dos_group_rsvps set person_id = p_target_id where person_id = p_source_id;
  update dos_group_updates set created_by_person_id = p_target_id where created_by_person_id = p_source_id;
  update dos_groups set primary_leader_person_id = p_target_id where primary_leader_person_id = p_source_id;
  update dos_groups set leader_person_id = p_target_id where leader_person_id = p_source_id;
  update dos_group_gatherings set acting_leader_person_id = p_target_id where acting_leader_person_id = p_source_id;
  update dos_identity_links set person_id = p_target_id where person_id = p_source_id;
  update dos_meeting_reviews set reviewer_person_id = p_target_id where reviewer_person_id = p_source_id;

  update dos_person_commitments set person_id = p_target_id where person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('dos_person_commitments', v_moved);

  update dos_relationship_score_history set person_id = p_target_id where person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('dos_relationship_score_history', v_moved);

  update dos_resource_assignments set person_id = p_target_id where person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('dos_resource_assignments', v_moved);

  update dos_review_links set recipient_person_id = p_target_id where recipient_person_id = p_source_id;
  update dos_review_links set reviewer_person_id = p_target_id where reviewer_person_id = p_source_id;
  update dos_table_invitation_bookings set field_person_id = p_target_id where field_person_id = p_source_id;
  update dos_user_mentor_meetings set field_person_id = p_target_id where field_person_id = p_source_id;
  update dos_user_mentor_relationships set field_person_id = p_target_id where field_person_id = p_source_id;
  update dos_user_prayer_logs set field_person_id = p_target_id where field_person_id = p_source_id;

  update fruit_events set person_id = p_target_id where person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('fruit_events', v_moved);

  update meeting_reflections set person_id = p_target_id where person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('meeting_reflections', v_moved);

  update missionary_connection_logs set field_person_id = p_target_id where field_person_id = p_source_id;
  update missionary_fruit_items set field_person_id = p_target_id where field_person_id = p_source_id;
  update participant_reviews set person_id = p_target_id where person_id = p_source_id;
  update participant_testimonies set person_id = p_target_id where person_id = p_source_id;

  update person_roles set field_person_id = p_target_id where field_person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('person_roles', v_moved);

  update prayer_logs set field_person_id = p_target_id where field_person_id = p_source_id;

  update prayer_partners set field_person_id = p_target_id where field_person_id = p_source_id;
  get diagnostics v_moved = row_count; v_counts := v_counts || jsonb_build_object('prayer_partners', v_moved);

  update prayer_requests set created_by_person_id = p_target_id where created_by_person_id = p_source_id;
  update relationship_reminders set person_id = p_target_id where person_id = p_source_id;

  -- Conflict-prone tables: a unique constraint includes the person column,
  -- so the target may already own a row that collides with the source's.
  -- Keep the target's existing row; move only source rows that don't collide.
  update dos_group_members gm
     set person_id = p_target_id
   where gm.person_id = p_source_id
     and not exists (
       select 1 from dos_group_members gm2
       where gm2.group_id = gm.group_id and gm2.person_id = p_target_id
     );
  get diagnostics v_moved = row_count;
  select count(*) into v_dropped from dos_group_members where person_id = p_source_id;
  if v_dropped > 0 then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('table', 'dos_group_members', 'kept_target_row_dropped_source_rows', v_dropped));
  end if;
  v_counts := v_counts || jsonb_build_object('dos_group_members', v_moved);

  update dos_group_attendance ga
     set person_id = p_target_id
   where ga.person_id = p_source_id
     and not exists (
       select 1 from dos_group_attendance ga2
       where ga2.gathering_id = ga.gathering_id and ga2.person_id = p_target_id
     );
  get diagnostics v_moved = row_count;
  select count(*) into v_dropped from dos_group_attendance where person_id = p_source_id;
  if v_dropped > 0 then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('table', 'dos_group_attendance', 'kept_target_row_dropped_source_rows', v_dropped));
  end if;
  v_counts := v_counts || jsonb_build_object('dos_group_attendance', v_moved);

  update dos_group_member_identities gmi
     set person_id = p_target_id
   where gmi.person_id = p_source_id
     and not exists (select 1 from dos_group_member_identities gmi2 where gmi2.person_id = p_target_id);
  get diagnostics v_moved = row_count;
  select count(*) into v_dropped from dos_group_member_identities where person_id = p_source_id;
  if v_dropped > 0 then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('table', 'dos_group_member_identities', 'kept_target_row_dropped_source_rows', v_dropped));
  end if;
  v_counts := v_counts || jsonb_build_object('dos_group_member_identities', v_moved);

  update dos_guided_resource_progress grp
     set person_id = p_target_id
   where grp.person_id = p_source_id
     and not exists (
       select 1 from dos_guided_resource_progress grp2
       where grp2.workspace_id = grp.workspace_id and grp2.person_id = p_target_id
         and grp2.resource_slug = grp.resource_slug and grp2.session_id = grp.session_id
     );
  get diagnostics v_moved = row_count;
  select count(*) into v_dropped from dos_guided_resource_progress where person_id = p_source_id;
  if v_dropped > 0 then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('table', 'dos_guided_resource_progress', 'kept_target_row_dropped_source_rows', v_dropped));
  end if;
  v_counts := v_counts || jsonb_build_object('dos_guided_resource_progress', v_moved);

  update dos_relationship_scores rs
     set person_id = p_target_id
   where rs.person_id = p_source_id
     and not exists (
       select 1 from dos_relationship_scores rs2
       where rs2.workspace_id = rs.workspace_id and rs2.person_id = p_target_id
     );
  get diagnostics v_moved = row_count;
  select count(*) into v_dropped from dos_relationship_scores where person_id = p_source_id;
  if v_dropped > 0 then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('table', 'dos_relationship_scores', 'kept_target_row_dropped_source_rows', v_dropped));
  end if;
  v_counts := v_counts || jsonb_build_object('dos_relationship_scores', v_moved);

  update dos_circle_overrides co
     set person_id = p_target_id
   where co.person_id = p_source_id
     and not exists (
       select 1 from dos_circle_overrides co2
       where co2.workspace_id = co.workspace_id and co2.person_id = p_target_id
     );
  get diagnostics v_moved = row_count;
  select count(*) into v_dropped from dos_circle_overrides where person_id = p_source_id;
  if v_dropped > 0 then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('table', 'dos_circle_overrides', 'kept_target_row_dropped_source_rows', v_dropped));
  end if;
  v_counts := v_counts || jsonb_build_object('dos_circle_overrides', v_moved);

  -- Backfill contact fields the target is missing from the source, then
  -- archive the source. Never delete -- context stays inspectable.
  update missionary_field_people
     set email = coalesce(nullif(email, ''), nullif(v_source.email, '')),
         phone = coalesce(nullif(phone, ''), nullif(v_source.phone, '')),
         updated_at = now()
   where id = p_target_id;

  update missionary_field_people
     set status = 'archived',
         notes = coalesce(notes || E'\n\n', '') || format(
           'Merged into person %s on %s (merge_person_records). See dos_person_merge_log.',
           p_target_id, now()
         ),
         updated_at = now()
   where id = p_source_id;

  insert into dos_person_merge_log (source_person_id, target_person_id, merged_by, before_snapshot, table_counts, conflicts)
  values (p_source_id, p_target_id, p_actor_id, v_before, v_counts, v_conflicts);

  return jsonb_build_object(
    'source_person_id', p_source_id,
    'target_person_id', p_target_id,
    'moved_row_counts', v_counts,
    'conflicts', v_conflicts
  );
end;
$$;

comment on function merge_person_records(uuid, uuid, uuid) is 'Reusable admin merge: repoints every known missionary_field_people foreign key from source to target, archives (never deletes) the source row, and writes an audit row to dos_person_merge_log. Call preview_person_merge() first.';
