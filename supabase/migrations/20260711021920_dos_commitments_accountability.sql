create extension if not exists pgcrypto;

create or replace function public.can_access_dos_workspace(
  target_workspace_id uuid,
  required_admin_roles text[] default array['admin', 'editor', 'viewer']
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  with current_identity as (
    select
      (select auth.uid()) as user_id,
      lower(coalesce((select auth.jwt()) ->> 'email', '')) as email
  ),
  current_profiles as (
    select profiles.id, profiles.primary_collective_id
    from public.profiles, current_identity
    where profiles.user_id = current_identity.user_id
       or lower(profiles.email) = current_identity.email
  ),
  current_collectives as (
    select primary_collective_id as collective_id
    from current_profiles
    where primary_collective_id is not null

    union

    select collective_memberships.collective_id
    from public.collective_memberships
    join current_profiles on current_profiles.id = collective_memberships.profile_id
    where collective_memberships.status <> 'inactive'
  )
  select public.is_dos_admin(required_admin_roles)
    or exists (
      select 1
      from public.missionary_households
      join public.collectives on collectives.slug = missionary_households.slug
      join current_collectives on current_collectives.collective_id = collectives.id
      where missionary_households.id = target_workspace_id
    )
    or exists (
      select 1
      from public.missionary_team_members, current_identity
      where missionary_team_members.household_id = target_workspace_id
        and lower(coalesce(missionary_team_members.status, 'active')) not in ('inactive', 'archived', 'declined')
        and (
          missionary_team_members.dos_user_id = current_identity.user_id::text
          or lower(coalesce(missionary_team_members.dos_user_id, '')) = current_identity.email
          or lower(coalesce(missionary_team_members.invite_email, '')) = current_identity.email
        )
    );
$$;

create table if not exists public.dos_workspace_feature_flags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  flag_key text not null,
  enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_workspace_feature_flags_key_check
    check (flag_key ~ '^[a-z0-9][a-z0-9_]{1,80}$'),
  constraint dos_workspace_feature_flags_unique unique (workspace_id, flag_key)
);

create index if not exists dos_workspace_feature_flags_workspace_idx
  on public.dos_workspace_feature_flags(workspace_id, flag_key)
  where enabled = true;

create table if not exists public.dos_person_commitments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  title text not null,
  description text,
  category text,
  assigned_date date not null default current_date,
  target_date date,
  status text not null default 'active',
  completed_date date,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_person_commitments_title_check check (length(btrim(title)) > 0),
  constraint dos_person_commitments_status_check
    check (status in ('active', 'completed', 'paused', 'cancelled')),
  constraint dos_person_commitments_category_check
    check (
      category is null
      or category in (
        'Spiritual Disciplines',
        'Testimony',
        'Relationships',
        'Marriage',
        'Character',
        'Evangelism',
        'Leadership',
        'Ministry',
        'Health',
        'Finances',
        'Other'
      )
    ),
  constraint dos_person_commitments_completed_date_check
    check ((status = 'completed' and completed_date is not null) or status <> 'completed')
);

create index if not exists dos_person_commitments_workspace_status_idx
  on public.dos_person_commitments(workspace_id, status, assigned_date desc, updated_at desc);

create index if not exists dos_person_commitments_person_status_idx
  on public.dos_person_commitments(person_id, status, assigned_date desc);

create table if not exists public.dos_commitment_updates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  commitment_id uuid not null references public.dos_person_commitments(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  update_date date not null default current_date,
  progress_note text not null,
  progress_state text,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  constraint dos_commitment_updates_note_check check (length(btrim(progress_note)) > 0),
  constraint dos_commitment_updates_state_check
    check (
      progress_state is null
      or progress_state in ('not_started', 'in_progress', 'going_well', 'struggling', 'completed')
    )
);

create index if not exists dos_commitment_updates_commitment_date_idx
  on public.dos_commitment_updates(commitment_id, update_date desc, created_at desc);

create index if not exists dos_commitment_updates_workspace_person_idx
  on public.dos_commitment_updates(workspace_id, person_id, update_date desc, created_at desc);

create table if not exists public.dos_accountability_schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  title text not null,
  frequency text not null,
  day_of_week integer,
  scheduled_time time,
  start_date date not null default current_date,
  next_check_in date not null,
  status text not null default 'active',
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_accountability_schedules_title_check check (length(btrim(title)) > 0),
  constraint dos_accountability_schedules_frequency_check
    check (frequency in ('weekly', 'every_two_weeks', 'monthly', 'one_time')),
  constraint dos_accountability_schedules_day_check
    check (day_of_week is null or day_of_week between 0 and 6),
  constraint dos_accountability_schedules_status_check
    check (status in ('active', 'paused')),
  constraint dos_accountability_schedules_frequency_day_check
    check (frequency not in ('weekly', 'every_two_weeks') or day_of_week is not null)
);

create index if not exists dos_accountability_schedules_workspace_due_idx
  on public.dos_accountability_schedules(workspace_id, status, next_check_in, person_id);

create index if not exists dos_accountability_schedules_person_idx
  on public.dos_accountability_schedules(person_id, status, next_check_in);

create table if not exists public.dos_accountability_check_ins (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  schedule_id uuid references public.dos_accountability_schedules(id) on delete set null,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  check_in_date date not null default current_date,
  duration_minutes integer,
  general_update text not null,
  wins text,
  struggles text,
  prayer_needs text,
  follow_up text,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_accountability_check_ins_general_update_check check (length(btrim(general_update)) > 0),
  constraint dos_accountability_check_ins_duration_check
    check (duration_minutes is null or duration_minutes >= 0)
);

create index if not exists dos_accountability_check_ins_workspace_date_idx
  on public.dos_accountability_check_ins(workspace_id, check_in_date desc, created_at desc);

create index if not exists dos_accountability_check_ins_person_date_idx
  on public.dos_accountability_check_ins(person_id, check_in_date desc, created_at desc);

create table if not exists public.dos_accountability_check_in_commitments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  check_in_id uuid not null references public.dos_accountability_check_ins(id) on delete cascade,
  commitment_id uuid not null references public.dos_person_commitments(id) on delete cascade,
  progress_update_id uuid references public.dos_commitment_updates(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint dos_accountability_check_in_commitments_unique
    unique (check_in_id, commitment_id)
);

create index if not exists dos_accountability_check_in_commitments_workspace_idx
  on public.dos_accountability_check_in_commitments(workspace_id, check_in_id);

create index if not exists dos_accountability_check_in_commitments_commitment_idx
  on public.dos_accountability_check_in_commitments(commitment_id, created_at desc);

drop trigger if exists set_dos_workspace_feature_flags_updated_at on public.dos_workspace_feature_flags;
create trigger set_dos_workspace_feature_flags_updated_at
  before update on public.dos_workspace_feature_flags
  for each row
  execute function public.set_dos_updated_at();

drop trigger if exists set_dos_person_commitments_updated_at on public.dos_person_commitments;
create trigger set_dos_person_commitments_updated_at
  before update on public.dos_person_commitments
  for each row
  execute function public.set_dos_updated_at();

drop trigger if exists set_dos_accountability_schedules_updated_at on public.dos_accountability_schedules;
create trigger set_dos_accountability_schedules_updated_at
  before update on public.dos_accountability_schedules
  for each row
  execute function public.set_dos_updated_at();

drop trigger if exists set_dos_accountability_check_ins_updated_at on public.dos_accountability_check_ins;
create trigger set_dos_accountability_check_ins_updated_at
  before update on public.dos_accountability_check_ins
  for each row
  execute function public.set_dos_updated_at();

alter table public.dos_workspace_feature_flags enable row level security;
alter table public.dos_person_commitments enable row level security;
alter table public.dos_commitment_updates enable row level security;
alter table public.dos_accountability_schedules enable row level security;
alter table public.dos_accountability_check_ins enable row level security;
alter table public.dos_accountability_check_in_commitments enable row level security;

revoke all on table public.dos_workspace_feature_flags from anon;
revoke all on table public.dos_person_commitments from anon;
revoke all on table public.dos_commitment_updates from anon;
revoke all on table public.dos_accountability_schedules from anon;
revoke all on table public.dos_accountability_check_ins from anon;
revoke all on table public.dos_accountability_check_in_commitments from anon;

revoke all on table public.dos_workspace_feature_flags from authenticated;
revoke all on table public.dos_person_commitments from authenticated;
revoke all on table public.dos_commitment_updates from authenticated;
revoke all on table public.dos_accountability_schedules from authenticated;
revoke all on table public.dos_accountability_check_ins from authenticated;
revoke all on table public.dos_accountability_check_in_commitments from authenticated;

grant select on table public.dos_workspace_feature_flags to authenticated;
grant select, insert, update on table public.dos_person_commitments to authenticated;
grant select, insert on table public.dos_commitment_updates to authenticated;
grant select, insert, update on table public.dos_accountability_schedules to authenticated;
grant select, insert, update on table public.dos_accountability_check_ins to authenticated;
grant select, insert on table public.dos_accountability_check_in_commitments to authenticated;

grant select, insert, update, delete on table public.dos_workspace_feature_flags to service_role;
grant select, insert, update, delete on table public.dos_person_commitments to service_role;
grant select, insert, update, delete on table public.dos_commitment_updates to service_role;
grant select, insert, update, delete on table public.dos_accountability_schedules to service_role;
grant select, insert, update, delete on table public.dos_accountability_check_ins to service_role;
grant select, insert, update, delete on table public.dos_accountability_check_in_commitments to service_role;

drop policy if exists "DOS admins can read workspace feature flags" on public.dos_workspace_feature_flags;
create policy "DOS admins can read workspace feature flags"
  on public.dos_workspace_feature_flags
  for select
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor', 'viewer']));

drop policy if exists "DOS admins can read commitments" on public.dos_person_commitments;
create policy "DOS admins can read commitments"
  on public.dos_person_commitments
  for select
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can manage commitments" on public.dos_person_commitments;
create policy "DOS editors can manage commitments"
  on public.dos_person_commitments
  for all
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']))
  with check (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']));

drop policy if exists "DOS admins can read commitment updates" on public.dos_commitment_updates;
create policy "DOS admins can read commitment updates"
  on public.dos_commitment_updates
  for select
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can create commitment updates" on public.dos_commitment_updates;
create policy "DOS editors can create commitment updates"
  on public.dos_commitment_updates
  for insert
  to authenticated
  with check (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']));

drop policy if exists "DOS admins can read accountability schedules" on public.dos_accountability_schedules;
create policy "DOS admins can read accountability schedules"
  on public.dos_accountability_schedules
  for select
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can manage accountability schedules" on public.dos_accountability_schedules;
create policy "DOS editors can manage accountability schedules"
  on public.dos_accountability_schedules
  for all
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']))
  with check (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']));

drop policy if exists "DOS admins can read accountability check ins" on public.dos_accountability_check_ins;
create policy "DOS admins can read accountability check ins"
  on public.dos_accountability_check_ins
  for select
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can manage accountability check ins" on public.dos_accountability_check_ins;
create policy "DOS editors can manage accountability check ins"
  on public.dos_accountability_check_ins
  for all
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']))
  with check (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']));

drop policy if exists "DOS admins can read accountability commitment links" on public.dos_accountability_check_in_commitments;
create policy "DOS admins can read accountability commitment links"
  on public.dos_accountability_check_in_commitments
  for select
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can create accountability commitment links" on public.dos_accountability_check_in_commitments;
create policy "DOS editors can create accountability commitment links"
  on public.dos_accountability_check_in_commitments
  for insert
  to authenticated
  with check (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']));

do $$
declare
  ryan_workspace_id uuid;
begin
  select id
  into ryan_workspace_id
  from public.missionary_households
  where slug in ('ryan-fox', 'ryan-brooke-fox')
     or public_slug = 'fox-family'
  order by case
    when slug = 'ryan-fox' then 0
    when slug = 'ryan-brooke-fox' then 1
    when public_slug = 'fox-family' then 2
    else 3
  end
  limit 1;

  if ryan_workspace_id is not null then
    insert into public.dos_workspace_feature_flags (
      workspace_id,
      flag_key,
      enabled,
      metadata
    )
    values (
      ryan_workspace_id,
      'dos_commitments_accountability',
      true,
      '{"initial_rollout":"ryan_workspace_only"}'::jsonb
    )
    on conflict (workspace_id, flag_key) do update
      set enabled = excluded.enabled,
          metadata = public.dos_workspace_feature_flags.metadata || excluded.metadata,
          updated_at = now();
  end if;
end $$;

comment on table public.dos_workspace_feature_flags is
  'Workspace-scoped DOS feature gates. Disabling a flag hides the feature without deleting data.';

comment on table public.dos_person_commitments is
  'Intentional discipleship commitments assigned to people in a DOS workspace.';

comment on table public.dos_commitment_updates is
  'Chronological progress timeline entries for DOS person commitments.';

comment on table public.dos_accountability_schedules is
  'Recurring or one-time accountability rhythms for a DOS person.';

comment on table public.dos_accountability_check_ins is
  'Logged accountability conversations for a DOS person and optional schedule.';

comment on table public.dos_accountability_check_in_commitments is
  'Commitments discussed during an accountability check-in, optionally linked to a progress update.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
