create extension if not exists pgcrypto;

create table if not exists public.dos_group_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  template_key text not null,
  category text not null,
  audience text,
  activity_type text,
  name_template text not null,
  tagline text,
  description text,
  scripture_reference text,
  scripture_text text,
  default_visibility text not null default 'private',
  default_capacity integer,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_templates_key_check check (template_key ~ '^[a-z0-9][a-z0-9_]{1,80}$'),
  constraint dos_group_templates_category_check check (category in ('discipleship', 'activity')),
  constraint dos_group_templates_audience_check check (audience is null or audience in ('men', 'women', 'coed')),
  constraint dos_group_templates_activity_check check (activity_type is null or activity_type in ('running', 'walking', 'hiking', 'cycling', 'fitness')),
  constraint dos_group_templates_visibility_check check (default_visibility in ('private', 'workspace')),
  constraint dos_group_templates_capacity_check check (default_capacity is null or default_capacity > 0),
  constraint dos_group_templates_template_key_unique unique (template_key)
);

create index if not exists dos_group_templates_active_idx
  on public.dos_group_templates(organization_id, active, sort_order, name_template);

drop trigger if exists set_dos_group_templates_updated_at on public.dos_group_templates;
create trigger set_dos_group_templates_updated_at
  before update on public.dos_group_templates
  for each row
  execute function public.set_dos_updated_at();

alter table public.dos_groups
  add column if not exists template_key text,
  add column if not exists template_category text,
  add column if not exists audience text,
  add column if not exists activity_type text,
  add column if not exists primary_leader_person_id uuid references public.missionary_field_people(id) on delete set null,
  add column if not exists capacity integer,
  add column if not exists accepting_members boolean not null default true,
  add column if not exists shared_leadership_enabled boolean not null default false,
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.dos_group_members
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists title text;

alter table public.dos_group_gatherings
  add column if not exists acting_leader_person_id uuid references public.missionary_field_people(id) on delete set null,
  add column if not exists shared_notes text,
  add column if not exists shared_prayer_summary text,
  add column if not exists shared_follow_up text,
  add column if not exists fruit_summary text,
  add column if not exists ministry_event_id uuid references public.ministry_events(id) on delete set null,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists dos_groups_template_idx
  on public.dos_groups(workspace_id, template_key, audience, activity_type)
  where active = true;

create index if not exists dos_groups_primary_leader_idx
  on public.dos_groups(primary_leader_person_id)
  where primary_leader_person_id is not null;

create index if not exists dos_group_members_role_status_idx
  on public.dos_group_members(group_id, role, status);

create index if not exists dos_group_gatherings_ministry_event_idx
  on public.dos_group_gatherings(ministry_event_id)
  where ministry_event_id is not null;

do $$
begin
  alter table public.dos_groups
    drop constraint if exists dos_groups_template_category_check,
    drop constraint if exists dos_groups_audience_check,
    drop constraint if exists dos_groups_activity_type_check,
    drop constraint if exists dos_groups_capacity_check;

  alter table public.dos_groups
    add constraint dos_groups_template_category_check check (template_category is null or template_category in ('discipleship', 'activity')),
    add constraint dos_groups_audience_check check (audience is null or audience in ('men', 'women', 'coed')),
    add constraint dos_groups_activity_type_check check (activity_type is null or activity_type in ('running', 'walking', 'hiking', 'cycling', 'fitness')),
    add constraint dos_groups_capacity_check check (capacity is null or capacity > 0);
end $$;

alter table public.dos_group_members
  drop constraint if exists dos_group_members_role_check;

alter table public.dos_group_members
  add constraint dos_group_members_role_check check (
    role in ('leader', 'co_leader', 'helper', 'member', 'guest')
  );

alter table public.dos_group_templates enable row level security;

revoke all on table public.dos_group_templates from anon;
revoke all on table public.dos_group_templates from authenticated;

grant select on table public.dos_group_templates to authenticated;
grant select, insert, update, delete on table public.dos_group_templates to service_role;

drop policy if exists "DOS users can read active group templates" on public.dos_group_templates;
create policy "DOS users can read active group templates"
  on public.dos_group_templates
  for select
  to authenticated
  using (
    active = true
    and public.is_dos_admin(array['admin', 'editor', 'viewer'])
  );

create or replace function public.can_manage_dos_group(
  target_group_id uuid,
  allowed_roles text[] default array['leader', 'co_leader', 'helper']
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_dos_admin(array['admin', 'editor'])
    or exists (
      select 1
      from public.dos_groups
      where dos_groups.id = target_group_id
        and public.can_access_dos_workspace(dos_groups.workspace_id, array['admin', 'editor'])
    );
$$;

grant execute on function public.can_manage_dos_group(uuid, text[]) to authenticated;
grant execute on function public.can_manage_dos_group(uuid, text[]) to service_role;

do $$
declare
  ryan_workspace_id uuid;
  usam_organization_id uuid;
  ryan_leader_person_id uuid;
begin
  select id
  into usam_organization_id
  from public.organizations
  where slug = 'usa-missionaries'
  limit 1;

  insert into public.dos_group_templates (
    organization_id,
    template_key,
    category,
    audience,
    activity_type,
    name_template,
    tagline,
    description,
    scripture_reference,
    scripture_text,
    default_capacity,
    sort_order
  )
  values
    (usam_organization_id, 'mens_discipleship', 'discipleship', 'men', null, 'Men''s Discipleship Group', 'Scripture. Accountability. Prayer.', 'A simple men''s discipleship rhythm for Scripture, prayer, accountability, and next steps.', null, null, 12, 10),
    (usam_organization_id, 'womens_discipleship', 'discipleship', 'women', null, 'Women''s Discipleship Group', 'Scripture. Prayer. Encouragement.', 'A simple women''s discipleship rhythm for Scripture, prayer, encouragement, and next steps.', null, null, 12, 20),
    (usam_organization_id, '2three2_running_men', 'activity', 'men', 'running', '2three2 Running Group', 'Run. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 30),
    (usam_organization_id, '2three2_walking_men', 'activity', 'men', 'walking', '2three2 Walking Group', 'Walk. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 31),
    (usam_organization_id, '2three2_hiking_men', 'activity', 'men', 'hiking', '2three2 Hiking Group', 'Hike. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 32),
    (usam_organization_id, '2three2_cycling_men', 'activity', 'men', 'cycling', '2three2 Cycling Group', 'Ride. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 33),
    (usam_organization_id, '2three2_fitness_men', 'activity', 'men', 'fitness', '2three2 Fitness Group', 'Move. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 34),
    (usam_organization_id, '2three2_running_women', 'activity', 'women', 'running', '2three2 Running Group', 'Run. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 40),
    (usam_organization_id, '2three2_walking_women', 'activity', 'women', 'walking', '2three2 Walking Group', 'Walk. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 41),
    (usam_organization_id, '2three2_hiking_women', 'activity', 'women', 'hiking', '2three2 Hiking Group', 'Hike. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 42),
    (usam_organization_id, '2three2_cycling_women', 'activity', 'women', 'cycling', '2three2 Cycling Group', 'Ride. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 43),
    (usam_organization_id, '2three2_fitness_women', 'activity', 'women', 'fitness', '2three2 Fitness Group', 'Move. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 44),
    (usam_organization_id, '2three2_running_coed', 'activity', 'coed', 'running', '2three2 Running Group', 'Run. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 50),
    (usam_organization_id, '2three2_walking_coed', 'activity', 'coed', 'walking', '2three2 Walking Group', 'Walk. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 51),
    (usam_organization_id, '2three2_hiking_coed', 'activity', 'coed', 'hiking', '2three2 Hiking Group', 'Hike. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 52),
    (usam_organization_id, '2three2_cycling_coed', 'activity', 'coed', 'cycling', '2three2 Cycling Group', 'Ride. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 53),
    (usam_organization_id, '2three2_fitness_coed', 'activity', 'coed', 'fitness', '2three2 Fitness Group', 'Move. Pray. Pursue.', 'A 2three2 activity group where people move together, pray in pairs, and pursue Christ.', '2 Timothy 2:22', 'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.', 20, 54)
  on conflict (template_key) do update
  set category = excluded.category,
      name_template = excluded.name_template,
      tagline = excluded.tagline,
      description = excluded.description,
      scripture_reference = excluded.scripture_reference,
      scripture_text = excluded.scripture_text,
      default_capacity = excluded.default_capacity,
      sort_order = excluded.sort_order,
      active = true,
      updated_at = now();

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
    select id
    into ryan_leader_person_id
    from public.missionary_field_people
    where coalesce(workspace_id, household_id) = ryan_workspace_id
      and coalesce(status, 'active') not in ('archived', 'deleted')
      and (
        lower(btrim(name)) = 'ryan fox'
        or lower(btrim(name)) = 'ryan'
        or lower(name) like '%ryan%fox%'
      )
    order by case
      when lower(btrim(name)) = 'ryan fox' then 0
      when lower(name) like '%ryan%fox%' then 1
      when lower(btrim(name)) = 'ryan' then 2
      else 3
    end,
    updated_at desc nulls last,
    created_at asc
    limit 1;

    insert into public.dos_workspace_feature_flags (
      workspace_id,
      flag_key,
      enabled,
      metadata
    )
    values (
      ryan_workspace_id,
      'dos_groups_simplified_v2',
      true,
      '{"initial_rollout":"ryan_workspace_only","legacy_preserved":true}'::jsonb
    )
    on conflict (workspace_id, flag_key) do update
      set enabled = excluded.enabled,
          metadata = public.dos_workspace_feature_flags.metadata || excluded.metadata,
          updated_at = now();

    update public.dos_groups
    set template_key = case
          when slug = '2three2' then '2three2_running_men'
          when slug in ('tuesday-mens-group', 'wednesday-mens-group') then 'mens_discipleship'
          else template_key
        end,
        template_category = case
          when slug = '2three2' then 'activity'
          when slug in ('tuesday-mens-group', 'wednesday-mens-group') then 'discipleship'
          else template_category
        end,
        audience = case
          when slug in ('2three2', 'tuesday-mens-group', 'wednesday-mens-group') then 'men'
          else audience
        end,
        activity_type = case
          when slug = '2three2' then 'running'
          else activity_type
        end,
        primary_leader_person_id = coalesce(primary_leader_person_id, leader_person_id, ryan_leader_person_id),
        shared_leadership_enabled = true,
        accepting_members = true,
        settings = settings || '{"privacy":"private_by_default","records":"shared_group_gatherings_private_person_notes"}'::jsonb,
        updated_at = now()
    where workspace_id = ryan_workspace_id
      and slug in ('2three2', 'tuesday-mens-group', 'wednesday-mens-group');

    update public.dos_group_members members
    set permissions = coalesce(members.permissions, '{}'::jsonb) || '{"can_manage_group":true,"can_log_gatherings":true,"can_manage_people":true}'::jsonb,
        title = coalesce(members.title, 'Primary Leader'),
        updated_at = now()
    from public.dos_groups groups
    where groups.id = members.group_id
      and groups.workspace_id = ryan_workspace_id
      and groups.slug in ('2three2', 'tuesday-mens-group', 'wednesday-mens-group')
      and members.role = 'leader';
  end if;
end $$;

comment on table public.dos_group_templates is
  'Approved DOS group templates for simplified group creation. Templates control allowed USA Missionaries group types without duplicating group records.';

comment on column public.dos_groups.template_key is
  'Template key selected when the group was created. Legacy groups may be null until mapped.';

comment on column public.dos_groups.shared_leadership_enabled is
  'When true, leader/co-leader/helper roles can participate in shared group management in DOS.';

comment on column public.dos_group_members.permissions is
  'Future-compatible shared leadership permissions. The role remains the primary authorization source.';

comment on column public.dos_group_gatherings.ministry_event_id is
  'Optional explicit link to a ministry event/Table log. Group gatherings do not affect Field, Fruit, Table, or Circle metrics until explicitly logged.';

comment on function public.can_manage_dos_group(uuid, text[]) is
  'Workspace-level guard for group management. Role-specific leader access is enforced in the DOS API/UI until group members are linked to authenticated identities.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
