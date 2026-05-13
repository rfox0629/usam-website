create extension if not exists pgcrypto;

create table if not exists public.dos_review_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  meeting_id uuid not null references public.missionary_tables(id) on delete cascade,
  reviewer_person_id uuid references public.missionary_field_people(id) on delete set null,
  created_by_user_id uuid,
  review_type text not null default 'quick_check_in',
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint dos_review_links_review_type_check check (
    review_type in ('quick_check_in', 'ministry_experience', 'full_testimony')
  )
);

create unique index if not exists dos_review_links_active_meeting_unique
  on public.dos_review_links(workspace_id, meeting_id, coalesce(reviewer_person_id, '00000000-0000-0000-0000-000000000000'::uuid), review_type)
  where used_at is null;

create index if not exists dos_review_links_token_idx
  on public.dos_review_links(token);

create index if not exists dos_review_links_workspace_meeting_idx
  on public.dos_review_links(workspace_id, meeting_id, created_at desc);

create table if not exists public.dos_meeting_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  meeting_id uuid not null references public.missionary_tables(id) on delete cascade,
  review_link_id uuid references public.dos_review_links(id) on delete set null,
  reviewer_person_id uuid references public.missionary_field_people(id) on delete set null,
  missionary_user_id uuid,
  review_type text not null default 'quick_check_in',
  encouraged boolean,
  felt_heard boolean,
  step_toward_jesus text,
  wants_follow_up text,
  stood_out text,
  share_permission text not null default 'private',
  submitted_name text,
  status text not null default 'pending_review',
  fruit_item_id uuid references public.missionary_fruit_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_meeting_reviews_review_type_check check (
    review_type in ('quick_check_in', 'ministry_experience', 'full_testimony')
  ),
  constraint dos_meeting_reviews_step_toward_jesus_check check (
    step_toward_jesus is null
    or step_toward_jesus in ('yes', 'no', 'unsure')
  ),
  constraint dos_meeting_reviews_wants_follow_up_check check (
    wants_follow_up is null
    or wants_follow_up in ('yes', 'no', 'maybe')
  ),
  constraint dos_meeting_reviews_share_permission_check check (
    share_permission in ('anonymous', 'with_name', 'private')
  ),
  constraint dos_meeting_reviews_status_check check (
    status in ('pending_review', 'reviewed', 'approved', 'private', 'archived')
  )
);

create index if not exists dos_meeting_reviews_workspace_status_idx
  on public.dos_meeting_reviews(workspace_id, status, created_at desc);

create index if not exists dos_meeting_reviews_meeting_idx
  on public.dos_meeting_reviews(meeting_id, created_at desc);

create index if not exists dos_meeting_reviews_person_idx
  on public.dos_meeting_reviews(reviewer_person_id, created_at desc)
  where reviewer_person_id is not null;

create or replace function public.set_dos_meeting_reviews_updated_at()
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

drop trigger if exists set_dos_meeting_reviews_updated_at on public.dos_meeting_reviews;
create trigger set_dos_meeting_reviews_updated_at
  before update on public.dos_meeting_reviews
  for each row
  execute function public.set_dos_meeting_reviews_updated_at();

alter table public.dos_review_links enable row level security;
alter table public.dos_meeting_reviews enable row level security;

revoke all on table public.dos_review_links from anon;
revoke all on table public.dos_review_links from authenticated;
revoke all on table public.dos_meeting_reviews from anon;
revoke all on table public.dos_meeting_reviews from authenticated;

grant select, insert, update on table public.dos_review_links to authenticated;
grant select, insert, update on table public.dos_meeting_reviews to authenticated;

drop policy if exists "Admins can read DOS review links" on public.dos_review_links;
create policy "Admins can read DOS review links"
  on public.dos_review_links
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Admins can insert DOS review links" on public.dos_review_links;
create policy "Admins can insert DOS review links"
  on public.dos_review_links
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Admins can update DOS review links" on public.dos_review_links;
create policy "Admins can update DOS review links"
  on public.dos_review_links
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Admins can read DOS meeting reviews" on public.dos_meeting_reviews;
create policy "Admins can read DOS meeting reviews"
  on public.dos_meeting_reviews
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Admins can insert DOS meeting reviews" on public.dos_meeting_reviews;
create policy "Admins can insert DOS meeting reviews"
  on public.dos_meeting_reviews
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

drop policy if exists "Admins can update DOS meeting reviews" on public.dos_meeting_reviews;
create policy "Admins can update DOS meeting reviews"
  on public.dos_meeting_reviews
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

comment on table public.dos_review_links is
  'Private token links for external DOS Quick Review flows. Public users submit through server routes; links are not exposed directly through the Data API.';

comment on table public.dos_meeting_reviews is
  'External fruit verification submitted by people ministered to after DOS meetings. Reviews default to pending/private and require future approval before public use.';
