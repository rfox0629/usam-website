create extension if not exists pgcrypto;

create table if not exists public.missionary_households (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  display_name text not null,
  location text,
  profile_image_url text,
  hero_image_url text,
  short_mission text,
  story text,
  public_visible boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.missionary_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.missionary_households(id) on delete cascade,
  missionary_number text not null,
  first_name text not null,
  last_name text,
  role text,
  is_public boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  constraint missionary_people_household_number_unique unique (household_id, missionary_number)
);

create table if not exists public.missionary_tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.missionary_households(id) on delete cascade,
  tag text not null,
  tag_type text not null check (tag_type in ('role', 'function')),
  created_at timestamp with time zone default now(),
  constraint missionary_tags_allowed_tag check (
    (tag_type = 'role' and tag in (
      'MISSIONARY COUPLE',
      'MISSIONARY',
      'STATE LEADER',
      'REGIONAL LEADER',
      'NATIONAL LEADER',
      'PRAYER TEAM',
      'SUPPORT TEAM'
    ))
    or
    (tag_type = 'function' and tag in (
      'LEADERSHIP',
      'OPERATIONS',
      'ADMIN',
      'TRAINING',
      'EVANGELISM',
      'DISCIPLESHIP'
    ))
  ),
  constraint missionary_tags_household_tag_unique unique (household_id, tag, tag_type)
);

create table if not exists public.missionary_support_settings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.missionary_households(id) on delete cascade unique,
  show_support boolean default false,
  annual_goal integer default 0,
  monthly_goal integer default 0,
  monthly_committed integer default 0,
  monthly_received integer default 0,
  general_fund_percentage integer default 10,
  goal_basis text,
  updated_at timestamp with time zone default now()
);

create index if not exists missionary_households_public_sort_idx
  on public.missionary_households(public_visible, sort_order);

create index if not exists missionary_people_household_sort_idx
  on public.missionary_people(household_id, sort_order);

create index if not exists missionary_tags_household_type_idx
  on public.missionary_tags(household_id, tag_type);

alter table public.missionary_households enable row level security;
alter table public.missionary_people enable row level security;
alter table public.missionary_tags enable row level security;
alter table public.missionary_support_settings enable row level security;

drop policy if exists "Public can read visible households" on public.missionary_households;
create policy "Public can read visible households"
  on public.missionary_households
  for select
  to anon
  using (public_visible = true);

drop policy if exists "Public can read people for visible households" on public.missionary_people;
create policy "Public can read people for visible households"
  on public.missionary_people
  for select
  to anon
  using (
    is_public = true
    and exists (
      select 1
      from public.missionary_households
      where missionary_households.id = missionary_people.household_id
        and missionary_households.public_visible = true
    )
  );

drop policy if exists "Public can read tags for visible households" on public.missionary_tags;
create policy "Public can read tags for visible households"
  on public.missionary_tags
  for select
  to anon
  using (
    exists (
      select 1
      from public.missionary_households
      where missionary_households.id = missionary_tags.household_id
        and missionary_households.public_visible = true
    )
  );

drop policy if exists "Public can read visible support settings" on public.missionary_support_settings;
create policy "Public can read visible support settings"
  on public.missionary_support_settings
  for select
  to anon
  using (
    show_support = true
    and exists (
      select 1
      from public.missionary_households
      where missionary_households.id = missionary_support_settings.household_id
        and missionary_households.public_visible = true
    )
  );

do $$
declare
  fox_household uuid;
begin
  insert into public.missionary_households (
    slug,
    display_name,
    location,
    profile_image_url,
    hero_image_url,
    short_mission,
    public_visible,
    sort_order
  )
  values (
    'ryan-brooke-fox',
    'Ryan & Brooke Fox',
    'Minnesota',
    '/fox-family.png',
    '/fox-family-no-background.png',
    'Reaching the lost. Making disciples. Multiplying across America.',
    true,
    1
  )
  on conflict (slug) do update
  set display_name = excluded.display_name,
      location = excluded.location,
      profile_image_url = excluded.profile_image_url,
      hero_image_url = excluded.hero_image_url,
      short_mission = excluded.short_mission,
      public_visible = excluded.public_visible,
      sort_order = excluded.sort_order,
      updated_at = now()
  returning id into fox_household;

  insert into public.missionary_people (household_id, missionary_number, first_name, last_name, role, sort_order)
  values
    (fox_household, '001', 'Ryan', 'Fox', 'Missionary', 1),
    (fox_household, '002', 'Brooke', 'Fox', 'Missionary', 2),
    (fox_household, '003', 'Parker', 'Fox', null, 3),
    (fox_household, '004', 'Oakley', 'Fox', null, 4),
    (fox_household, '005', 'Gunner', 'Fox', null, 5),
    (fox_household, '006', 'Axel', 'Fox', null, 6),
    (fox_household, '007', 'Jersey', 'Fox', null, 7)
  on conflict (household_id, missionary_number) do update
  set first_name = excluded.first_name,
      last_name = excluded.last_name,
      role = excluded.role,
      is_public = excluded.is_public,
      sort_order = excluded.sort_order;

  insert into public.missionary_tags (household_id, tag, tag_type)
  values
    (fox_household, 'MISSIONARY COUPLE', 'role'),
    (fox_household, 'STATE LEADER', 'role'),
    (fox_household, 'LEADERSHIP', 'function')
  on conflict (household_id, tag, tag_type) do nothing;

  insert into public.missionary_support_settings (
    household_id,
    show_support,
    annual_goal,
    monthly_goal,
    monthly_committed,
    monthly_received,
    general_fund_percentage,
    goal_basis
  )
  values (
    fox_household,
    true,
    87000,
    7250,
    2100,
    2100,
    10,
    'Based on the median household income in Lakeville, Minnesota.'
  )
  on conflict (household_id) do update
  set show_support = excluded.show_support,
      annual_goal = excluded.annual_goal,
      monthly_goal = excluded.monthly_goal,
      monthly_committed = excluded.monthly_committed,
      monthly_received = excluded.monthly_received,
      general_fund_percentage = excluded.general_fund_percentage,
      goal_basis = excluded.goal_basis,
      updated_at = now();
end $$;
