alter table public.dos_review_links
  add column if not exists sender_person_id uuid references public.missionary_team_members(id) on delete set null,
  add column if not exists recipient_person_id uuid references public.missionary_field_people(id) on delete set null,
  add column if not exists status text not null default 'pending',
  add column if not exists opened_at timestamptz,
  add column if not exists submitted_at timestamptz;

update public.dos_review_links
set recipient_person_id = reviewer_person_id
where recipient_person_id is null
  and reviewer_person_id is not null;

update public.dos_review_links
set status = case
  when used_at is not null then 'submitted'
  when expires_at is not null and expires_at < now() then 'expired'
  else status
end;

alter table public.dos_review_links
  drop constraint if exists dos_review_links_status_check,
  add constraint dos_review_links_status_check check (
    status in ('pending', 'opened', 'submitted', 'expired')
  ),
  drop constraint if exists dos_review_links_review_type_check,
  add constraint dos_review_links_review_type_check check (
    review_type in (
      'quick_review',
      'review',
      'quick_check_in',
      'ministry_experience',
      'full_testimony',
      'testimony_review',
      'testimony',
      'review_options'
    )
  );

alter table public.dos_meeting_reviews
  drop constraint if exists dos_meeting_reviews_review_type_check,
  add constraint dos_meeting_reviews_review_type_check check (
    review_type in ('quick_review', 'review', 'quick_check_in', 'ministry_experience', 'full_testimony')
  );

alter table public.missionary_fruit_items
  drop constraint if exists missionary_fruit_items_outcome_tags_check,
  add constraint missionary_fruit_items_outcome_tags_check check (
    outcome_tags <@ array[
      'Reconciliation',
      'New Believers',
      'Marriage Restoration',
      'Baptized',
      'Discipling',
      'Started Discipling Others',
      'Answered Prayer',
      'Salvation',
      'Baptism',
      'Healing',
      'Deliverance',
      'Church Connection',
      'Discipleship',
      'Prayer Answered',
      'Other'
    ]::text[]
  );

create index if not exists dos_review_links_recipient_idx
  on public.dos_review_links(recipient_person_id, created_at desc)
  where recipient_person_id is not null;

create index if not exists dos_review_links_status_idx
  on public.dos_review_links(workspace_id, status, created_at desc);

drop index if exists public.dos_review_links_active_meeting_unique;
create unique index if not exists dos_review_links_active_meeting_unique
  on public.dos_review_links(
    workspace_id,
    meeting_id,
    coalesce(recipient_person_id, reviewer_person_id, '00000000-0000-0000-0000-000000000000'::uuid),
    review_type
  )
  where used_at is null and status in ('pending', 'opened');

alter table public.dos_meeting_reviews
  add column if not exists submitted_email text,
  add column if not exists outcome_tags text[] not null default '{}'::text[];

alter table public.participant_reviews
  add column if not exists submitted_name text,
  add column if not exists submitted_email text,
  add column if not exists outcome_tags text[] not null default '{}'::text[];

alter table public.participant_testimonies
  add column if not exists submitted_name text,
  add column if not exists submitted_email text,
  add column if not exists outcome_tags text[] not null default '{}'::text[];

comment on column public.dos_review_links.id is
  'Review request id. Public URLs expose only the secure token.';

comment on column public.dos_review_links.sender_person_id is
  'Missionary team member who created the request when known.';

comment on column public.dos_review_links.recipient_person_id is
  'Field person selected from the saved Table. Token submission attaches to this person rather than matching on name or email.';

comment on column public.dos_review_links.status is
  'Request lifecycle for DOS review/testimony forms: pending, opened, submitted, expired.';

comment on column public.dos_review_links.submitted_at is
  'Timestamp when the token was successfully submitted. Tokens are single-use unless intentionally reopened.';

comment on column public.participant_reviews.outcome_tags is
  'DOS outcome options selected by the recipient from the token-tied review form.';

comment on column public.participant_testimonies.outcome_tags is
  'DOS outcome options selected by the recipient from the token-tied testimony form.';

notify pgrst, 'reload schema';
