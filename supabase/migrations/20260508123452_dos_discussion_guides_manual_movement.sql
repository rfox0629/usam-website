alter table public.meetings
  add column if not exists discussion_guide_key text;

alter table public.meetings
  drop constraint if exists meetings_discussion_guide_key_check,
  add constraint meetings_discussion_guide_key_check check (
    discussion_guide_key is null
    or discussion_guide_key in (
      'are_you_really_a_disciple',
      'the_10_commands',
      'relationship_with_jesus_check_in',
      'prayer_freedom_conversation',
      'testimony',
      'custom_discussion'
    )
  );

alter table public.meetings
  drop constraint if exists meetings_outcome_markers_check,
  add constraint meetings_outcome_markers_check check (
    outcome_markers <@ array[
      'prayer_requested',
      'gospel_conversation',
      'follow_up_needed',
      'wants_to_meet_again',
      'breakthrough_moment',
      'interested_discipleship',
      'began_discipling_someone',
      'testimony_shared',
      'repentance_surrender',
      'committed_obey_jesus',
      'asked_baptism',
      'received_freedom_healing'
    ]::text[]
  );

alter table public.meetings
  drop constraint if exists meetings_relationship_movement_check,
  add constraint meetings_relationship_movement_check check (
    relationship_movement is null
    or relationship_movement in (
      'more_resistant',
      'more_curious',
      'more_open',
      'more_engaged',
      'ready_for_discipleship',
      'multiplying',
      'beginning_discipleship',
      'beginning_multiplication'
    )
  ),
  drop constraint if exists meetings_spiritual_openness_movement_check,
  add constraint meetings_spiritual_openness_movement_check check (
    spiritual_openness_movement is null
    or spiritual_openness_movement in (
      'more_resistant',
      'more_curious',
      'more_open',
      'more_engaged',
      'ready_for_discipleship',
      'multiplying',
      'beginning_discipleship',
      'beginning_multiplication'
    )
  );

comment on column public.meetings.discussion_guide_key is
  'Optional private key for the discussion guide walked through in this meeting. Future: discussion guide templates, per-person guide answers, yes/no questions per person, relationship with Jesus rating per person, and guide completion tracking belong in meeting_discussion_responses.';

comment on column public.meetings.relationship_movement is
  'Optional manual commitment movement marker selected by the field user. Do not calculate this automatically from outcomes.';

comment on column public.meetings.outcome_markers is
  'Lightweight private meeting outcome markers. Meeting captures what happened; discussion guide captures what was walked through; fruit/outcome markers capture what changed.';
