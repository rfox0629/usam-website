create extension if not exists pgcrypto;

alter table public.dos_review_links
  drop constraint if exists dos_review_links_review_type_check,
  add constraint dos_review_links_review_type_check check (
    review_type in ('quick_check_in', 'ministry_experience', 'full_testimony', 'testimony')
  );

create table if not exists public.meeting_reflections (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.missionary_tables(id) on delete cascade,
  person_id uuid references public.missionary_field_people(id) on delete set null,
  leader_id uuid,
  spiritual_openness text,
  what_happened text,
  prayer_needs text,
  follow_up_needed boolean not null default false,
  next_step text,
  observed_fruit jsonb not null default '[]'::jsonb,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participant_reviews (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.missionary_tables(id) on delete cascade,
  person_id uuid references public.missionary_field_people(id) on delete set null,
  leader_id uuid,
  felt_cared_for text,
  felt_heard text,
  conversation_helpful text,
  would_meet_again boolean,
  comments text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint participant_reviews_rating_check check (
    (felt_cared_for is null or felt_cared_for in ('yes', 'no', 'unsure', 'skipped'))
    and (felt_heard is null or felt_heard in ('yes', 'no', 'unsure', 'skipped'))
    and (conversation_helpful is null or conversation_helpful in ('yes', 'no', 'unsure', 'skipped'))
  )
);

create table if not exists public.participant_testimonies (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.missionary_tables(id) on delete cascade,
  person_id uuid references public.missionary_field_people(id) on delete set null,
  leader_id uuid,
  story text not null,
  what_changed text,
  decision_made text,
  next_step text,
  permission_to_share boolean not null default false,
  public_display_name text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.fruit_events (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.missionary_tables(id) on delete set null,
  person_id uuid references public.missionary_field_people(id) on delete set null,
  leader_id uuid,
  source_type text not null default 'manual',
  source_id uuid,
  fruit_type text not null,
  confidence_level text not null default 'observed',
  title text,
  description text,
  occurred_at timestamptz not null default now(),
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fruit_events_source_type_check check (
    source_type in ('leader_reflection', 'participant_review', 'testimony', 'manual', 'system')
  ),
  constraint fruit_events_confidence_level_check check (
    confidence_level in ('observed', 'confirmed', 'verified')
  ),
  constraint fruit_events_visibility_check check (
    visibility in ('private', 'internal', 'public')
  )
);

create index if not exists meeting_reflections_meeting_idx
  on public.meeting_reflections(meeting_id, created_at desc);

create index if not exists meeting_reflections_person_idx
  on public.meeting_reflections(person_id, created_at desc)
  where person_id is not null;

create index if not exists participant_reviews_meeting_idx
  on public.participant_reviews(meeting_id, submitted_at desc);

create index if not exists participant_reviews_person_idx
  on public.participant_reviews(person_id, submitted_at desc)
  where person_id is not null;

create index if not exists participant_testimonies_meeting_idx
  on public.participant_testimonies(meeting_id, submitted_at desc);

create index if not exists participant_testimonies_person_idx
  on public.participant_testimonies(person_id, submitted_at desc)
  where person_id is not null;

create index if not exists fruit_events_person_timeline_idx
  on public.fruit_events(person_id, occurred_at desc)
  where person_id is not null;

create index if not exists fruit_events_meeting_idx
  on public.fruit_events(meeting_id, occurred_at desc)
  where meeting_id is not null;

create or replace function public.set_reviews_fruit_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_meeting_reflections_updated_at on public.meeting_reflections;
create trigger set_meeting_reflections_updated_at
  before update on public.meeting_reflections
  for each row
  execute function public.set_reviews_fruit_updated_at();

drop trigger if exists set_fruit_events_updated_at on public.fruit_events;
create trigger set_fruit_events_updated_at
  before update on public.fruit_events
  for each row
  execute function public.set_reviews_fruit_updated_at();

alter table public.meeting_reflections enable row level security;
alter table public.participant_reviews enable row level security;
alter table public.participant_testimonies enable row level security;
alter table public.fruit_events enable row level security;

revoke all on table public.meeting_reflections from anon;
revoke all on table public.meeting_reflections from authenticated;
revoke all on table public.participant_reviews from anon;
revoke all on table public.participant_reviews from authenticated;
revoke all on table public.participant_testimonies from anon;
revoke all on table public.participant_testimonies from authenticated;
revoke all on table public.fruit_events from anon;
revoke all on table public.fruit_events from authenticated;

grant select, insert, update on table public.meeting_reflections to authenticated;
grant select, insert, update on table public.participant_reviews to authenticated;
grant select, insert, update on table public.participant_testimonies to authenticated;
grant select, insert, update on table public.fruit_events to authenticated;

drop policy if exists "Admins can manage meeting reflections" on public.meeting_reflections;
create policy "Admins can manage meeting reflections"
  on public.meeting_reflections
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Admins can manage participant reviews" on public.participant_reviews;
create policy "Admins can manage participant reviews"
  on public.participant_reviews
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Admins can manage participant testimonies" on public.participant_testimonies;
create policy "Admins can manage participant testimonies"
  on public.participant_testimonies
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Admins can manage fruit events" on public.fruit_events;
create policy "Admins can manage fruit events"
  on public.fruit_events
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

comment on table public.meeting_reflections is
  'Internal leader reflection layer for DOS meetings. Never expose publicly.';

comment on table public.participant_reviews is
  'External participant experience reviews submitted through token routes.';

comment on table public.participant_testimonies is
  'External participant transformation stories submitted through token routes.';

comment on table public.fruit_events is
  'Structured Fruit outcomes derived from reflections, reviews, testimonies, manual entry, or system prompts.';
