alter table public.meetings
  add column if not exists meeting_at timestamptz,
  add column if not exists summary_private text,
  add column if not exists prayer_requested boolean not null default false,
  add column if not exists follow_up_needed boolean not null default false,
  add column if not exists relationship_movement text,
  add column if not exists spiritual_openness_movement text;

update public.meetings
set meeting_at = meeting_date::timestamptz
where meeting_at is null;

alter table public.meetings
  alter column meeting_at set default now(),
  alter column meeting_at set not null;

alter table public.meetings
  drop constraint if exists meetings_type_check,
  add constraint meetings_type_check check (
    type in (
      'kitchen_table',
      'coffee',
      'prayer',
      'follow_up',
      'discipleship',
      'group_gathering',
      'evangelism_conversation',
      'phone',
      'zoom',
      'group',
      'other'
    )
  );

alter table public.meetings
  drop constraint if exists meetings_relationship_movement_check,
  add constraint meetings_relationship_movement_check check (
    relationship_movement is null
    or relationship_movement in (
      'more_open',
      'more_engaged',
      'beginning_discipleship',
      'beginning_multiplication'
    )
  ),
  drop constraint if exists meetings_spiritual_openness_movement_check,
  add constraint meetings_spiritual_openness_movement_check check (
    spiritual_openness_movement is null
    or spiritual_openness_movement in (
      'more_open',
      'more_engaged',
      'beginning_discipleship',
      'beginning_multiplication'
    )
  );

create index if not exists meetings_collective_at_idx
  on public.meetings(primary_collective_id, meeting_at desc);

create index if not exists meetings_follow_up_needed_idx
  on public.meetings(owner_organization_id, meeting_at desc)
  where follow_up_needed is true;

create index if not exists meetings_prayer_requested_idx
  on public.meetings(owner_organization_id, meeting_at desc)
  where prayer_requested is true;

comment on column public.meetings.meeting_at is
  'Timestamp for a real ministry interaction. meeting_date remains for date-based compatibility.';

comment on column public.meetings.summary_private is
  'Short private field summary for the meeting timeline. Do not expose through affiliate visibility.';

comment on column public.meetings.prayer_requested is
  'Lightweight private indicator that prayer context was requested in this interaction.';

comment on column public.meetings.follow_up_needed is
  'Lightweight private indicator that this interaction needs follow up. This is not a reminder system yet.';

comment on column public.meetings.relationship_movement is
  'Optional lightweight movement marker for relational progress. Keep user-facing language ministry-oriented.';

comment on column public.meetings.spiritual_openness_movement is
  'Optional lightweight movement marker for spiritual openness. Future analytics can use this without exposing private notes.';
