create extension if not exists pgcrypto;

create table if not exists public.missionary_table_reviews (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  table_id uuid not null references public.missionary_tables(id) on delete cascade,
  how_meeting_went text,
  key_observations text,
  breakthroughs_or_concerns text,
  follow_up_needed text,
  movement_step text,
  teaching_used text,
  questions_covered text,
  assessment_notes text,
  readiness text,
  follow_up_areas text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missionary_table_reviews_table_unique unique (table_id),
  constraint missionary_table_reviews_movement_step_check check (
    movement_step is null
    or movement_step in (
      'Continue meeting',
      'Begin discipleship',
      'Send follow up',
      'Invite to group',
      'Connect to church',
      'Connect to ministry',
      'Hand off',
      'Pray and wait',
      'Other'
    )
  ),
  constraint missionary_table_reviews_teaching_used_check check (
    teaching_used is null
    or teaching_used in (
      'Kitchen Table Gospel',
      'Are You Really a Disciple',
      'Commands of Jesus',
      'Other'
    )
  ),
  constraint missionary_table_reviews_readiness_check check (
    readiness is null
    or readiness in (
      'Not ready',
      'Curious',
      'Open',
      'Ready to follow',
      'Actively following'
    )
  ),
  constraint missionary_table_reviews_follow_up_areas_check check (
    follow_up_areas <@ array[
      'Repentance',
      'Baptism',
      'Scripture',
      'Prayer',
      'Community',
      'Obedience'
    ]::text[]
  )
);

create index if not exists missionary_table_reviews_household_table_idx
  on public.missionary_table_reviews(household_id, table_id);

alter table public.missionary_fruit_items
  add column if not exists table_id uuid references public.missionary_tables(id) on delete set null,
  add column if not exists field_person_id uuid references public.missionary_field_people(id) on delete set null,
  add column if not exists internal_notes text,
  add column if not exists outcome_tags text[] not null default '{}',
  add column if not exists cc_status text not null default 'draft';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'missionary_fruit_items_cc_status_check'
      and conrelid = 'public.missionary_fruit_items'::regclass
  ) then
    alter table public.missionary_fruit_items
      drop constraint missionary_fruit_items_cc_status_check;
  end if;

  alter table public.missionary_fruit_items
    add constraint missionary_fruit_items_cc_status_check
    check (cc_status in ('draft', 'approved', 'private'));

  if exists (
    select 1
    from pg_constraint
    where conname = 'missionary_fruit_items_outcome_tags_check'
      and conrelid = 'public.missionary_fruit_items'::regclass
  ) then
    alter table public.missionary_fruit_items
      drop constraint missionary_fruit_items_outcome_tags_check;
  end if;

  alter table public.missionary_fruit_items
    add constraint missionary_fruit_items_outcome_tags_check
    check (
      outcome_tags <@ array[
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
end $$;

create index if not exists missionary_fruit_items_cc_household_status_idx
  on public.missionary_fruit_items(household_id, cc_status, testimony_date desc nulls last, created_at desc);

create index if not exists missionary_fruit_items_table_id_idx
  on public.missionary_fruit_items(table_id);

create index if not exists missionary_fruit_items_field_person_id_idx
  on public.missionary_fruit_items(field_person_id);

create table if not exists public.missionary_connection_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  field_person_id uuid references public.missionary_field_people(id) on delete set null,
  connection_date date not null default current_date,
  duration_minutes integer,
  interaction_type text not null default 'Phone call',
  notes text,
  movement_step text,
  follow_up_needed text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missionary_connection_logs_duration_check check (duration_minutes is null or duration_minutes >= 0),
  constraint missionary_connection_logs_interaction_type_check check (
    interaction_type in ('Phone call', 'Zoom', 'Text', 'Coffee', 'Prayer', 'Discipleship', 'Other')
  ),
  constraint missionary_connection_logs_movement_step_check check (
    movement_step is null
    or movement_step in (
      'Continue meeting',
      'Begin discipleship',
      'Send follow up',
      'Invite to group',
      'Connect to church',
      'Connect to ministry',
      'Hand off',
      'Pray and wait',
      'Other'
    )
  )
);

create index if not exists missionary_connection_logs_household_date_idx
  on public.missionary_connection_logs(household_id, connection_date desc, created_at desc);

create index if not exists missionary_connection_logs_field_person_idx
  on public.missionary_connection_logs(field_person_id, connection_date desc);

create table if not exists public.missionary_library_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  title text not null,
  category text,
  description text,
  content_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missionary_library_items_household_title_unique unique (household_id, title)
);

create index if not exists missionary_library_items_household_title_idx
  on public.missionary_library_items(household_id, title);

create table if not exists public.missionary_in_season_focus (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade unique,
  current_focus text,
  prayer_emphasis text,
  active_people_note text,
  active_tables_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_command_center_workflow_updated_at()
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

drop trigger if exists set_missionary_table_reviews_updated_at on public.missionary_table_reviews;
create trigger set_missionary_table_reviews_updated_at
  before update on public.missionary_table_reviews
  for each row
  execute function public.set_command_center_workflow_updated_at();

drop trigger if exists set_missionary_connection_logs_updated_at on public.missionary_connection_logs;
create trigger set_missionary_connection_logs_updated_at
  before update on public.missionary_connection_logs
  for each row
  execute function public.set_command_center_workflow_updated_at();

drop trigger if exists set_missionary_library_items_updated_at on public.missionary_library_items;
create trigger set_missionary_library_items_updated_at
  before update on public.missionary_library_items
  for each row
  execute function public.set_command_center_workflow_updated_at();

drop trigger if exists set_missionary_in_season_focus_updated_at on public.missionary_in_season_focus;
create trigger set_missionary_in_season_focus_updated_at
  before update on public.missionary_in_season_focus
  for each row
  execute function public.set_command_center_workflow_updated_at();

alter table public.missionary_table_reviews enable row level security;
alter table public.missionary_connection_logs enable row level security;
alter table public.missionary_library_items enable row level security;
alter table public.missionary_in_season_focus enable row level security;

revoke all on table public.missionary_table_reviews from anon;
revoke all on table public.missionary_table_reviews from authenticated;
revoke all on table public.missionary_connection_logs from anon;
revoke all on table public.missionary_connection_logs from authenticated;
revoke all on table public.missionary_library_items from anon;
revoke all on table public.missionary_library_items from authenticated;
revoke all on table public.missionary_in_season_focus from anon;
revoke all on table public.missionary_in_season_focus from authenticated;

grant select, insert, update on table public.missionary_table_reviews to authenticated;
grant select, insert, update on table public.missionary_connection_logs to authenticated;
grant select, insert, update on table public.missionary_library_items to authenticated;
grant select, insert, update on table public.missionary_in_season_focus to authenticated;

drop policy if exists "Admins can read missionary table reviews" on public.missionary_table_reviews;
create policy "Admins can read missionary table reviews"
  on public.missionary_table_reviews
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

drop policy if exists "Admins can insert missionary table reviews" on public.missionary_table_reviews;
create policy "Admins can insert missionary table reviews"
  on public.missionary_table_reviews
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

drop policy if exists "Admins can update missionary table reviews" on public.missionary_table_reviews;
create policy "Admins can update missionary table reviews"
  on public.missionary_table_reviews
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

drop policy if exists "Admins can read missionary connection logs" on public.missionary_connection_logs;
create policy "Admins can read missionary connection logs"
  on public.missionary_connection_logs
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

drop policy if exists "Admins can insert missionary connection logs" on public.missionary_connection_logs;
create policy "Admins can insert missionary connection logs"
  on public.missionary_connection_logs
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

drop policy if exists "Admins can update missionary connection logs" on public.missionary_connection_logs;
create policy "Admins can update missionary connection logs"
  on public.missionary_connection_logs
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

drop policy if exists "Admins can read missionary library items" on public.missionary_library_items;
create policy "Admins can read missionary library items"
  on public.missionary_library_items
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

drop policy if exists "Admins can insert missionary library items" on public.missionary_library_items;
create policy "Admins can insert missionary library items"
  on public.missionary_library_items
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

drop policy if exists "Admins can update missionary library items" on public.missionary_library_items;
create policy "Admins can update missionary library items"
  on public.missionary_library_items
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

drop policy if exists "Admins can read missionary in season focus" on public.missionary_in_season_focus;
create policy "Admins can read missionary in season focus"
  on public.missionary_in_season_focus
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

drop policy if exists "Admins can insert missionary in season focus" on public.missionary_in_season_focus;
create policy "Admins can insert missionary in season focus"
  on public.missionary_in_season_focus
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

drop policy if exists "Admins can update missionary in season focus" on public.missionary_in_season_focus;
create policy "Admins can update missionary in season focus"
  on public.missionary_in_season_focus
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

insert into public.missionary_library_items (household_id, title, category, description, content_notes)
select missionary_households.id, seed.title, 'Teaching Framework', seed.description, ''
from public.missionary_households
cross join (
  values
    ('Kitchen Table Gospel', 'Simple gospel framework for conversations around the table.'),
    ('Are You Really a Disciple', 'Discipleship diagnostic for clarity and follow-through.'),
    ('Commands of Jesus', 'Teaching framework for obedience-based discipleship.')
) as seed(title, description)
on conflict (household_id, title) do nothing;

comment on table public.missionary_table_reviews is
  'Command Center Review and Discipleship Assessment data for a Table. This belongs to the meeting, not People or public Team.';

comment on table public.missionary_connection_logs is
  'Fast ongoing discipleship interactions outside formal Tables. Feeds People insights and future Field summaries.';

comment on table public.missionary_library_items is
  'Light Command Center teaching framework library for future Table references and Field use.';

comment on table public.missionary_in_season_focus is
  'Simple current focus notes for a missionary household. Internal Command Center data only.';

comment on column public.missionary_fruit_items.cc_status is
  'Command Center Fruit status: draft, approved, or private. Public Profile publishing remains gated by existing public flags.';
