alter table public.meetings
  add column if not exists outcome_markers text[] not null default '{}'::text[],
  add column if not exists outcome_notes_private text;

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
      'testimony_shared'
    ]::text[]
  );

comment on column public.meetings.outcome_markers is
  'Lightweight private meeting outcome markers. Meeting captures what happened; outcome markers capture what changed.';

comment on column public.meetings.outcome_notes_private is
  'Optional short private notes for meeting outcome context. Do not expose through affiliate visibility.';
