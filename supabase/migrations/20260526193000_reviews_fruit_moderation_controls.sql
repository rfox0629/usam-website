alter table public.participant_reviews
  add column if not exists status text not null default 'submitted';

alter table public.participant_reviews
  drop constraint if exists participant_reviews_status_check,
  add constraint participant_reviews_status_check check (
    status in ('draft', 'submitted', 'reviewed', 'approved', 'hidden')
  );

alter table public.participant_testimonies
  add column if not exists status text not null default 'submitted';

alter table public.participant_testimonies
  drop constraint if exists participant_testimonies_status_check,
  add constraint participant_testimonies_status_check check (
    status in ('draft', 'submitted', 'reviewed', 'approved', 'hidden')
  );

alter table public.fruit_events
  add column if not exists status text not null default 'submitted';

alter table public.fruit_events
  drop constraint if exists fruit_events_status_check,
  add constraint fruit_events_status_check check (
    status in ('draft', 'submitted', 'reviewed', 'approved', 'hidden')
  );

create index if not exists participant_reviews_status_idx
  on public.participant_reviews(status, submitted_at desc);

create index if not exists participant_testimonies_status_idx
  on public.participant_testimonies(status, submitted_at desc);

create index if not exists fruit_events_status_visibility_idx
  on public.fruit_events(status, visibility, occurred_at desc);

comment on column public.participant_reviews.status is
  'Moderation state. Participant Reviews default to submitted/internal and require approval before any public use.';

comment on column public.participant_testimonies.status is
  'Moderation state. Public testimony use requires approved status and permission_to_share.';

comment on column public.fruit_events.status is
  'Leader/admin moderation state for generated or manual Fruit events.';
