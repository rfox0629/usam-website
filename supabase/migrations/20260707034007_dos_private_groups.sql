create extension if not exists pgcrypto;

create table if not exists public.dos_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  tagline text,
  scripture_reference text,
  scripture_text text,
  type text not null default 'discipleship',
  visibility text not null default 'private',
  rhythm_label text,
  default_location text,
  leader_person_id uuid references public.missionary_field_people(id) on delete set null,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_groups_name_not_empty check (length(btrim(name)) > 0),
  constraint dos_groups_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  constraint dos_groups_type_check check (
    type in ('discipleship', 'prayer', 'running', 'study', 'table', 'other')
  ),
  constraint dos_groups_visibility_check check (
    visibility in ('private', 'workspace')
  ),
  constraint dos_groups_workspace_slug_unique unique (workspace_id, slug)
);

create index if not exists dos_groups_workspace_active_idx
  on public.dos_groups(workspace_id, active, name);

create index if not exists dos_groups_leader_person_idx
  on public.dos_groups(leader_person_id)
  where leader_person_id is not null;

create table if not exists public.dos_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.dos_groups(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_members_role_check check (
    role in ('leader', 'co_leader', 'member', 'guest')
  ),
  constraint dos_group_members_status_check check (
    status in ('active', 'invited', 'removed')
  ),
  constraint dos_group_members_group_person_unique unique (group_id, person_id)
);

create index if not exists dos_group_members_person_idx
  on public.dos_group_members(person_id, status);

create table if not exists public.dos_group_gatherings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.dos_groups(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  description text,
  status text not null default 'scheduled',
  linked_table_event_id uuid references public.missionary_tables(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_gatherings_title_not_empty check (length(btrim(title)) > 0),
  constraint dos_group_gatherings_status_check check (
    status in ('scheduled', 'completed', 'canceled')
  ),
  constraint dos_group_gatherings_time_check check (
    ends_at is null or ends_at >= starts_at
  )
);

create index if not exists dos_group_gatherings_group_starts_idx
  on public.dos_group_gatherings(group_id, starts_at);

create index if not exists dos_group_gatherings_linked_table_idx
  on public.dos_group_gatherings(linked_table_event_id)
  where linked_table_event_id is not null;

create table if not exists public.dos_group_attendance (
  id uuid primary key default gen_random_uuid(),
  gathering_id uuid not null references public.dos_group_gatherings(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  status text not null default 'present',
  notes text,
  first_time_guest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_attendance_status_check check (
    status in ('present', 'absent', 'guest')
  ),
  constraint dos_group_attendance_gathering_person_unique unique (gathering_id, person_id)
);

create index if not exists dos_group_attendance_person_idx
  on public.dos_group_attendance(person_id, created_at desc);

create table if not exists public.dos_group_resources (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.dos_groups(id) on delete cascade,
  title text not null,
  description text,
  url text,
  resource_type text not null default 'link',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_resources_title_not_empty check (length(btrim(title)) > 0),
  constraint dos_group_resources_type_check check (
    resource_type in ('link', 'scripture', 'guide', 'note', 'video', 'other')
  )
);

create index if not exists dos_group_resources_group_sort_idx
  on public.dos_group_resources(group_id, active, sort_order, title);

drop trigger if exists set_dos_groups_updated_at on public.dos_groups;
create trigger set_dos_groups_updated_at
  before update on public.dos_groups
  for each row
  execute function public.set_dos_updated_at();

drop trigger if exists set_dos_group_members_updated_at on public.dos_group_members;
create trigger set_dos_group_members_updated_at
  before update on public.dos_group_members
  for each row
  execute function public.set_dos_updated_at();

drop trigger if exists set_dos_group_gatherings_updated_at on public.dos_group_gatherings;
create trigger set_dos_group_gatherings_updated_at
  before update on public.dos_group_gatherings
  for each row
  execute function public.set_dos_updated_at();

drop trigger if exists set_dos_group_attendance_updated_at on public.dos_group_attendance;
create trigger set_dos_group_attendance_updated_at
  before update on public.dos_group_attendance
  for each row
  execute function public.set_dos_updated_at();

drop trigger if exists set_dos_group_resources_updated_at on public.dos_group_resources;
create trigger set_dos_group_resources_updated_at
  before update on public.dos_group_resources
  for each row
  execute function public.set_dos_updated_at();

alter table public.dos_groups enable row level security;
alter table public.dos_group_members enable row level security;
alter table public.dos_group_gatherings enable row level security;
alter table public.dos_group_attendance enable row level security;
alter table public.dos_group_resources enable row level security;

revoke all on table public.dos_groups from anon;
revoke all on table public.dos_group_members from anon;
revoke all on table public.dos_group_gatherings from anon;
revoke all on table public.dos_group_attendance from anon;
revoke all on table public.dos_group_resources from anon;

revoke all on table public.dos_groups from authenticated;
revoke all on table public.dos_group_members from authenticated;
revoke all on table public.dos_group_gatherings from authenticated;
revoke all on table public.dos_group_attendance from authenticated;
revoke all on table public.dos_group_resources from authenticated;

grant select, insert, update, delete on table public.dos_groups to authenticated;
grant select, insert, update, delete on table public.dos_group_members to authenticated;
grant select, insert, update, delete on table public.dos_group_gatherings to authenticated;
grant select, insert, update, delete on table public.dos_group_attendance to authenticated;
grant select, insert, update, delete on table public.dos_group_resources to authenticated;

grant select, insert, update, delete on table public.dos_groups to service_role;
grant select, insert, update, delete on table public.dos_group_members to service_role;
grant select, insert, update, delete on table public.dos_group_gatherings to service_role;
grant select, insert, update, delete on table public.dos_group_attendance to service_role;
grant select, insert, update, delete on table public.dos_group_resources to service_role;

drop policy if exists "DOS admins can read groups" on public.dos_groups;
create policy "DOS admins can read groups"
  on public.dos_groups
  for select
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can manage groups" on public.dos_groups;
create policy "DOS editors can manage groups"
  on public.dos_groups
  for all
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor']))
  with check (public.is_dos_admin(array['admin', 'editor']));

drop policy if exists "DOS admins can read group members" on public.dos_group_members;
create policy "DOS admins can read group members"
  on public.dos_group_members
  for select
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can manage group members" on public.dos_group_members;
create policy "DOS editors can manage group members"
  on public.dos_group_members
  for all
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor']))
  with check (public.is_dos_admin(array['admin', 'editor']));

drop policy if exists "DOS admins can read group gatherings" on public.dos_group_gatherings;
create policy "DOS admins can read group gatherings"
  on public.dos_group_gatherings
  for select
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can manage group gatherings" on public.dos_group_gatherings;
create policy "DOS editors can manage group gatherings"
  on public.dos_group_gatherings
  for all
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor']))
  with check (public.is_dos_admin(array['admin', 'editor']));

drop policy if exists "DOS admins can read group attendance" on public.dos_group_attendance;
create policy "DOS admins can read group attendance"
  on public.dos_group_attendance
  for select
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can manage group attendance" on public.dos_group_attendance;
create policy "DOS editors can manage group attendance"
  on public.dos_group_attendance
  for all
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor']))
  with check (public.is_dos_admin(array['admin', 'editor']));

drop policy if exists "DOS admins can read group resources" on public.dos_group_resources;
create policy "DOS admins can read group resources"
  on public.dos_group_resources
  for select
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can manage group resources" on public.dos_group_resources;
create policy "DOS editors can manage group resources"
  on public.dos_group_resources
  for all
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor']))
  with check (public.is_dos_admin(array['admin', 'editor']));

do $$
declare
  next_saturday timestamptz;
  seed_group_id uuid;
  usam_organization_id uuid;
  ryan_leader_person_id uuid;
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

  if ryan_workspace_id is null then
    return;
  end if;

  select id
  into usam_organization_id
  from public.organizations
  where slug = 'usa-missionaries'
  limit 1;

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
  order by case coalesce(field_visibility, 'primary')
    when 'primary' then 0
    when 'secondary' then 1
    else 2
  end,
  updated_at desc nulls last,
  created_at asc
  limit 1;

  insert into public.dos_groups (
    workspace_id,
    organization_id,
    name,
    slug,
    description,
    tagline,
    scripture_reference,
    scripture_text,
    type,
    visibility,
    rhythm_label,
    default_location,
    leader_person_id,
    image_url,
    active
  )
  values (
    ryan_workspace_id,
    usam_organization_id,
    '2three2',
    '2three2',
    '2three2 is a men''s discipleship group where we run together, pair up two-by-two, pray for one another as we run, and pursue righteousness, faith, love, and peace with those who call on the Lord out of a pure heart.',
    'Run. Pray. Pursue.',
    '2 Timothy 2:22',
    'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.',
    'running',
    'private',
    'Saturdays at 7:00 AM',
    'Lebanon Hills Trailhead, Eagan, MN',
    ryan_leader_person_id,
    null,
    true
  )
  on conflict (workspace_id, slug) do update
  set organization_id = excluded.organization_id,
      name = excluded.name,
      description = excluded.description,
      tagline = excluded.tagline,
      scripture_reference = excluded.scripture_reference,
      scripture_text = excluded.scripture_text,
      type = excluded.type,
      visibility = excluded.visibility,
      rhythm_label = excluded.rhythm_label,
      default_location = excluded.default_location,
      leader_person_id = coalesce(public.dos_groups.leader_person_id, excluded.leader_person_id),
      active = true,
      updated_at = now()
  returning id into seed_group_id;

  if ryan_leader_person_id is not null then
    insert into public.dos_group_members (
      group_id,
      person_id,
      role,
      status,
      notes
    )
    values (
      seed_group_id,
      ryan_leader_person_id,
      'leader',
      'active',
      'Seeded from the existing Ryan Fox person record.'
    )
    on conflict (group_id, person_id) do update
    set role = 'leader',
        status = 'active',
        updated_at = now();
  end if;

  next_saturday := date_trunc('day', now())
    + (((6 - extract(dow from now())::int + 7) % 7) || ' days')::interval
    + interval '7 hours';

  if next_saturday < now() then
    next_saturday := next_saturday + interval '7 days';
  end if;

  insert into public.dos_group_gatherings (
    group_id,
    title,
    starts_at,
    ends_at,
    location,
    description,
    status
  )
  select
    seed_group_id,
    'Saturday Run & Prayer',
    next_saturday + (offset_week * interval '7 days'),
    next_saturday + (offset_week * interval '7 days') + interval '75 minutes',
    'Lebanon Hills Trailhead, Eagan, MN',
    'Run together, pair up two-by-two, and pray along the trail.',
    'scheduled'
  from generate_series(0, 2) as weeks(offset_week)
  where not exists (
    select 1
    from public.dos_group_gatherings existing
    where existing.group_id = seed_group_id
      and existing.starts_at = next_saturday + (offset_week * interval '7 days')
      and lower(btrim(existing.title)) = 'saturday run & prayer'
  );

  insert into public.dos_group_resources (
    group_id,
    title,
    description,
    url,
    resource_type,
    sort_order
  )
  select
    seed_group_id,
    '2 Timothy 2:22',
    'Verse anchor for the 2three2 rhythm.',
    null,
    'scripture',
    10
  where not exists (
    select 1
    from public.dos_group_resources existing
    where existing.group_id = seed_group_id
      and lower(btrim(existing.title)) = '2 timothy 2:22'
  );
end $$;

comment on table public.dos_groups is
  'Private DOS groups for recurring discipleship rhythms inside a workspace. Not public profile content.';

comment on table public.dos_group_gatherings is
  'Scheduled or completed DOS group gatherings. linked_table_event_id can connect a gathering to a Table log later.';

comment on table public.dos_group_attendance is
  'Private attendance rows for DOS group gatherings. These do not create Fruit or Table activity by themselves.';
