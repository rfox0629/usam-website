create extension if not exists pgcrypto;

create or replace function public.set_dos_updated_at()
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

create or replace function public.is_dos_admin(required_roles text[] default array['admin', 'editor', 'viewer'])
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(public.admin_users.email) = lower((select auth.jwt()) ->> 'email')
      and public.admin_users.is_active is not false
      and public.admin_users.role = any(required_roles)
  );
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type text not null default 'ministry',
  branding_mode text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_not_empty check (length(trim(name)) > 0),
  constraint organizations_slug_not_empty check (length(trim(slug)) > 0),
  constraint organizations_type_check check (type in ('ministry', 'church', 'partner', 'other')),
  constraint organizations_branding_mode_check check (branding_mode in ('default', 'usam', 'affiliate', 'custom'))
);

create table if not exists public.networks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint networks_name_not_empty check (length(trim(name)) > 0),
  constraint networks_slug_not_empty check (length(trim(slug)) > 0),
  constraint networks_organization_slug_unique unique (organization_id, slug)
);

create table if not exists public.collectives (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null default 'team',
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collectives_name_not_empty check (length(trim(name)) > 0),
  constraint collectives_slug_not_empty check (length(trim(slug)) > 0),
  constraint collectives_type_check check (type in ('family', 'team', 'ministry_team', 'small_group', 'other')),
  constraint collectives_owner_slug_unique unique (owner_organization_id, slug)
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  owner_organization_id uuid not null references public.organizations(id) on delete restrict,
  primary_collective_id uuid references public.collectives(id) on delete set null,
  first_name text not null,
  last_name text not null default '',
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_first_name_not_empty check (length(trim(first_name)) > 0)
);

create unique index if not exists profiles_user_id_unique_idx
  on public.profiles(user_id)
  where user_id is not null;

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references public.organizations(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  first_name text not null,
  last_name text not null default '',
  email text,
  phone text,
  engagement_level text,
  notes_private text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_first_name_not_empty check (length(trim(first_name)) > 0)
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_role_check check (role in ('owner', 'admin', 'leader', 'member')),
  constraint organization_memberships_status_check check (status in ('active', 'pending', 'inactive')),
  constraint organization_memberships_unique unique (organization_id, profile_id)
);

create table if not exists public.network_memberships (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint network_memberships_role_check check (role in ('owner', 'admin', 'leader', 'member')),
  constraint network_memberships_status_check check (status in ('active', 'pending', 'inactive')),
  constraint network_memberships_unique unique (network_id, profile_id)
);

create table if not exists public.collective_memberships (
  id uuid primary key default gen_random_uuid(),
  collective_id uuid not null references public.collectives(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collective_memberships_role_check check (role in ('owner', 'admin', 'leader', 'member')),
  constraint collective_memberships_status_check check (status in ('active', 'pending', 'inactive')),
  constraint collective_memberships_unique unique (collective_id, profile_id)
);

create table if not exists public.discipleship_relationships (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references public.organizations(id) on delete restrict,
  discipler_profile_id uuid not null references public.profiles(id) on delete restrict,
  disciple_person_id uuid references public.people(id) on delete cascade,
  disciple_profile_id uuid references public.profiles(id) on delete cascade,
  style text not null default 'mentor',
  strength text not null default 'primary',
  status text not null default 'active',
  started_at date not null default current_date,
  ended_at date,
  notes_private text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discipleship_relationships_disciple_check check (
    ((disciple_person_id is not null)::int + (disciple_profile_id is not null)::int) = 1
  ),
  constraint discipleship_relationships_not_self_check check (
    disciple_profile_id is null or disciple_profile_id <> discipler_profile_id
  ),
  constraint discipleship_relationships_style_check check (
    style in ('mentor', 'pastor', 'coach', 'spiritual_parent', 'peer_accountability', 'prayer_support', 'ministry_partner', 'other')
  ),
  constraint discipleship_relationships_strength_check check (strength in ('primary', 'supporting')),
  constraint discipleship_relationships_status_check check (status in ('active', 'paused', 'ended')),
  constraint discipleship_relationships_dates_check check (ended_at is null or ended_at >= started_at)
);

create unique index if not exists discipleship_relationships_active_profile_unique_idx
  on public.discipleship_relationships(discipler_profile_id, disciple_profile_id)
  where disciple_profile_id is not null and status in ('active', 'paused');

create unique index if not exists discipleship_relationships_active_person_unique_idx
  on public.discipleship_relationships(discipler_profile_id, disciple_person_id)
  where disciple_person_id is not null and status in ('active', 'paused');

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references public.organizations(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  primary_collective_id uuid references public.collectives(id) on delete set null,
  type text not null default 'kitchen_table',
  title text not null,
  meeting_date date not null default current_date,
  location text,
  notes_private text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_title_not_empty check (length(trim(title)) > 0),
  constraint meetings_type_check check (type in ('kitchen_table', 'coffee', 'phone', 'zoom', 'group', 'other'))
);

create unique index if not exists meetings_real_life_event_unique_idx
  on public.meetings(
    owner_organization_id,
    created_by_profile_id,
    coalesce(primary_collective_id, '00000000-0000-0000-0000-000000000000'::uuid),
    meeting_date,
    type,
    lower(trim(title))
  );

create table if not exists public.meeting_ministers (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  collective_id uuid references public.collectives(id) on delete set null,
  role text not null default 'minister',
  created_at timestamptz not null default now(),
  constraint meeting_ministers_role_check check (role in ('lead', 'co_lead', 'minister', 'host', 'observer', 'other')),
  constraint meeting_ministers_unique unique (meeting_id, profile_id)
);

create table if not exists public.meeting_people (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text not null default 'participant',
  created_at timestamptz not null default now(),
  constraint meeting_people_role_check check (role in ('participant', 'host', 'follow_up', 'other')),
  constraint meeting_people_unique unique (meeting_id, person_id)
);

create table if not exists public.visibility_rules (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references public.organizations(id) on delete cascade,
  affiliate_organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  collective_id uuid references public.collectives(id) on delete cascade,
  share_activity_summary boolean not null default false,
  share_meeting_counts boolean not null default false,
  share_unique_people_counts boolean not null default false,
  share_names boolean not null default false,
  share_private_notes boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visibility_rules_not_same_org_check check (owner_organization_id <> affiliate_organization_id),
  constraint visibility_rules_no_private_notes_check check (share_private_notes = false),
  constraint visibility_rules_status_check check (status in ('active', 'paused', 'ended')),
  constraint visibility_rules_scope_unique unique nulls not distinct (
    owner_organization_id,
    affiliate_organization_id,
    profile_id,
    collective_id
  )
);

create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  submitted_by_profile_id uuid references public.profiles(id) on delete set null,
  collective_id uuid references public.collectives(id) on delete set null,
  page_path text,
  category text not null,
  message_text text,
  voice_file_url text,
  status text not null default 'new',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_feedback_category_check check (
    category in ('bug', 'confusing', 'feature_idea', 'design_feedback', 'other')
  ),
  constraint product_feedback_status_check check (
    status in ('new', 'reviewed', 'planned', 'in_progress', 'completed', 'archived')
  ),
  constraint product_feedback_content_check check (
    nullif(trim(coalesce(message_text, '')), '') is not null
    or nullif(trim(coalesce(voice_file_url, '')), '') is not null
  )
);

create index if not exists networks_organization_idx on public.networks(organization_id);
create index if not exists collectives_owner_idx on public.collectives(owner_organization_id);
create index if not exists profiles_owner_idx on public.profiles(owner_organization_id);
create index if not exists profiles_primary_collective_idx on public.profiles(primary_collective_id);
create index if not exists people_owner_idx on public.people(owner_organization_id);
create index if not exists people_created_by_idx on public.people(created_by_profile_id);
create index if not exists discipleship_relationships_discipler_idx on public.discipleship_relationships(discipler_profile_id, status);
create index if not exists discipleship_relationships_disciple_profile_idx on public.discipleship_relationships(disciple_profile_id, status);
create index if not exists discipleship_relationships_disciple_person_idx on public.discipleship_relationships(disciple_person_id, status);
create index if not exists meetings_owner_date_idx on public.meetings(owner_organization_id, meeting_date desc);
create index if not exists meetings_created_by_date_idx on public.meetings(created_by_profile_id, meeting_date desc);
create index if not exists meeting_ministers_profile_idx on public.meeting_ministers(profile_id);
create index if not exists meeting_people_person_idx on public.meeting_people(person_id);
create index if not exists visibility_rules_owner_affiliate_idx on public.visibility_rules(owner_organization_id, affiliate_organization_id, status);
create index if not exists product_feedback_status_created_idx on public.product_feedback(status, created_at desc);
create index if not exists product_feedback_organization_idx on public.product_feedback(organization_id, created_at desc);

do $$
declare
  dos_table_name text;
  dos_trigger_name text;
  dos_tables text[] := array[
    'organizations',
    'networks',
    'collectives',
    'profiles',
    'people',
    'organization_memberships',
    'network_memberships',
    'collective_memberships',
    'discipleship_relationships',
    'meetings',
    'meeting_ministers',
    'meeting_people',
    'visibility_rules',
    'product_feedback'
  ];
  dos_updated_tables text[] := array[
    'organizations',
    'networks',
    'collectives',
    'profiles',
    'people',
    'organization_memberships',
    'network_memberships',
    'collective_memberships',
    'discipleship_relationships',
    'meetings',
    'visibility_rules',
    'product_feedback'
  ];
begin
  foreach dos_table_name in array dos_tables loop
    execute format('alter table public.%I enable row level security', dos_table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', dos_table_name);

    execute format('drop policy if exists "DOS admins can read" on public.%I', dos_table_name);
    execute format(
      'create policy "DOS admins can read" on public.%I for select to authenticated using (public.is_dos_admin(array[''admin'', ''editor'', ''viewer'']))',
      dos_table_name
    );

    execute format('drop policy if exists "DOS editors can write" on public.%I', dos_table_name);
    execute format(
      'create policy "DOS editors can write" on public.%I for all to authenticated using (public.is_dos_admin(array[''admin'', ''editor''])) with check (public.is_dos_admin(array[''admin'', ''editor'']))',
      dos_table_name
    );
  end loop;

  foreach dos_table_name in array dos_updated_tables loop
    dos_trigger_name := 'set_' || dos_table_name || '_updated_at';
    execute format('drop trigger if exists %I on public.%I', dos_trigger_name, dos_table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_dos_updated_at()',
      dos_trigger_name,
      dos_table_name
    );
  end loop;
end $$;

comment on table public.organizations is
  'DOS organization ownership boundary. Ownership does not imply visibility outside this organization.';

comment on table public.networks is
  'DOS network layer under an organization, such as a church ministry or ministry network.';

comment on table public.collectives is
  'DOS collective layer owned by an organization, such as a family, team, or ministry group.';

comment on table public.profiles is
  'DOS user/person profile for ministers and leaders. This is separate from public missionary profile pages.';

comment on table public.people is
  'DOS ministry people layer. Private notes stay with the owning organization.';

comment on table public.discipleship_relationships is
  'Ongoing discipleship formation. Multiplication can be measured when a disciple becomes a discipler in another active relationship.';

comment on table public.meetings is
  'One real life meeting equals one meeting record. Multiple ministers and people are attached through join tables.';

comment on table public.visibility_rules is
  'Visibility sharing rules for affiliate organizations. Private notes are never shared through these rules.';

comment on table public.product_feedback is
  'MVP feedback intake for improving DOS from users and admins.';
