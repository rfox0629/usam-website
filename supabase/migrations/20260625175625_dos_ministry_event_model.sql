create extension if not exists pgcrypto;

create table if not exists public.ministry_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  event_type text not null default 'table',
  event_date date not null default current_date,
  event_at timestamptz,
  title text,
  notes text,
  source_table text not null default 'missionary_tables',
  source_id uuid,
  recorder_user_id uuid references auth.users(id) on delete set null,
  recorder_display_name text,
  created_by uuid,
  source text not null default 'field',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ministry_events_event_type_check check (
    event_type in (
      'kitchen_table',
      'table',
      'coffee',
      'phone',
      'zoom',
      'text',
      'prayer',
      'group',
      'discipleship',
      'connection',
      'other'
    )
  ),
  constraint ministry_events_source_table_check check (
    source_table in ('missionary_tables', 'missionary_connection_logs', 'manual')
  ),
  constraint ministry_events_source_check check (source in ('command_center', 'field', 'system'))
);

create unique index if not exists ministry_events_source_unique_idx
  on public.ministry_events(source_table, source_id)
  where source_id is not null;

create index if not exists ministry_events_workspace_date_idx
  on public.ministry_events(workspace_id, event_date desc, created_at desc);

create index if not exists ministry_events_recorder_user_idx
  on public.ministry_events(recorder_user_id)
  where recorder_user_id is not null;

create table if not exists public.ministry_event_people (
  id uuid primary key default gen_random_uuid(),
  ministry_event_id uuid not null references public.ministry_events(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  role text not null,
  supporting_sub_role text,
  field_person_id uuid references public.missionary_field_people(id) on delete cascade,
  team_member_id uuid references public.missionary_team_members(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ministry_event_people_role_check check (
    role in ('ministry_team', 'participant', 'supporting_attendee', 'recorder')
  ),
  constraint ministry_event_people_supporting_sub_role_check check (
    supporting_sub_role is null
    or (
      role = 'supporting_attendee'
      and supporting_sub_role in ('observer', 'contributor', 'learning', 'support', 'child_present')
    )
  ),
  constraint ministry_event_people_actor_check check (
    ((field_person_id is not null)::int + (team_member_id is not null)::int + (user_id is not null)::int) >= 1
  )
);

create index if not exists ministry_event_people_event_role_idx
  on public.ministry_event_people(ministry_event_id, role);

create index if not exists ministry_event_people_workspace_role_idx
  on public.ministry_event_people(workspace_id, role, created_at desc);

create index if not exists ministry_event_people_field_person_idx
  on public.ministry_event_people(field_person_id, role)
  where field_person_id is not null;

create index if not exists ministry_event_people_team_member_idx
  on public.ministry_event_people(team_member_id, role)
  where team_member_id is not null;

create index if not exists ministry_event_people_user_idx
  on public.ministry_event_people(user_id, role)
  where user_id is not null;

create unique index if not exists ministry_event_people_event_field_role_unique
  on public.ministry_event_people(ministry_event_id, role, field_person_id)
  where field_person_id is not null;

create unique index if not exists ministry_event_people_event_team_role_unique
  on public.ministry_event_people(ministry_event_id, role, team_member_id)
  where team_member_id is not null;

create unique index if not exists ministry_event_people_event_user_role_unique
  on public.ministry_event_people(ministry_event_id, role, user_id)
  where user_id is not null;

create table if not exists public.ministry_event_person_responses (
  id uuid primary key default gen_random_uuid(),
  ministry_event_id uuid not null references public.ministry_events(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  field_person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  conversation_flow_key text not null default 'none',
  responses jsonb not null default '{}'::jsonb,
  recommended_resources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ministry_event_person_responses_flow_check check (
    conversation_flow_key in ('none', 'kitchen_table_gospel', 'four_questions')
  )
);

create unique index if not exists ministry_event_person_responses_unique
  on public.ministry_event_person_responses(ministry_event_id, field_person_id, conversation_flow_key);

create index if not exists ministry_event_person_responses_person_idx
  on public.ministry_event_person_responses(field_person_id, created_at desc);

alter table public.missionary_tables
  add column if not exists ministry_event_id uuid,
  add column if not exists recorded_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists recorded_by_display_name text;

insert into public.ministry_events (
  workspace_id,
  event_type,
  event_date,
  event_at,
  title,
  notes,
  source_table,
  source_id,
  recorder_user_id,
  recorder_display_name,
  created_by,
  source,
  created_at,
  updated_at
)
select
  coalesce(missionary_tables.workspace_id, missionary_tables.household_id),
  case
    when missionary_tables.table_type in (
      'kitchen_table',
      'coffee',
      'phone',
      'zoom',
      'text',
      'prayer',
      'group',
      'discipleship',
      'other'
    ) then missionary_tables.table_type
    else 'table'
  end,
  missionary_tables.table_date,
  coalesce(missionary_tables.scheduled_start_at, missionary_tables.table_date::timestamptz),
  'Table',
  missionary_tables.notes,
  'missionary_tables',
  missionary_tables.id,
  missionary_tables.recorded_by_user_id,
  missionary_tables.recorded_by_display_name,
  missionary_tables.created_by,
  case
    when missionary_tables.source in ('command_center', 'field') then missionary_tables.source
    else 'field'
  end,
  missionary_tables.created_at,
  missionary_tables.updated_at
from public.missionary_tables
where coalesce(missionary_tables.workspace_id, missionary_tables.household_id) is not null
on conflict (source_table, source_id) where source_id is not null do update
set workspace_id = excluded.workspace_id,
    event_type = excluded.event_type,
    event_date = excluded.event_date,
    event_at = excluded.event_at,
    notes = excluded.notes,
    recorder_user_id = coalesce(excluded.recorder_user_id, public.ministry_events.recorder_user_id),
    recorder_display_name = coalesce(excluded.recorder_display_name, public.ministry_events.recorder_display_name),
    updated_at = greatest(public.ministry_events.updated_at, excluded.updated_at);

update public.missionary_tables
set ministry_event_id = ministry_events.id
from public.ministry_events
where ministry_events.source_table = 'missionary_tables'
  and ministry_events.source_id = missionary_tables.id
  and missionary_tables.ministry_event_id is distinct from ministry_events.id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_tables_ministry_event_id_fkey'
      and conrelid = 'public.missionary_tables'::regclass
  ) then
    alter table public.missionary_tables
      add constraint missionary_tables_ministry_event_id_fkey
      foreign key (ministry_event_id) references public.ministry_events(id) on delete set null;
  end if;
end $$;

create unique index if not exists missionary_tables_ministry_event_id_unique_idx
  on public.missionary_tables(ministry_event_id)
  where ministry_event_id is not null;

create index if not exists missionary_tables_recorded_by_user_idx
  on public.missionary_tables(recorded_by_user_id)
  where recorded_by_user_id is not null;

insert into public.ministry_event_people (
  ministry_event_id,
  workspace_id,
  role,
  field_person_id,
  display_name,
  created_at,
  updated_at
)
select distinct
  missionary_tables.ministry_event_id,
  coalesce(missionary_tables.workspace_id, missionary_tables.household_id),
  'participant',
  missionary_field_people.id,
  missionary_field_people.name,
  missionary_tables.created_at,
  missionary_tables.updated_at
from public.missionary_tables
join lateral unnest(missionary_tables.field_person_ids) as linked_person(person_id) on true
join public.missionary_field_people
  on missionary_field_people.id = linked_person.person_id
where missionary_tables.ministry_event_id is not null
on conflict do nothing;

insert into public.ministry_event_person_responses (
  ministry_event_id,
  workspace_id,
  field_person_id,
  conversation_flow_key,
  responses,
  recommended_resources,
  created_at,
  updated_at
)
select
  missionary_tables.ministry_event_id,
  coalesce(missionary_tables.workspace_id, missionary_tables.household_id),
  missionary_tables.field_person_ids[1],
  missionary_tables.conversation_flow_key,
  missionary_tables.conversation_responses,
  missionary_tables.recommended_resources,
  missionary_tables.created_at,
  missionary_tables.updated_at
from public.missionary_tables
where missionary_tables.ministry_event_id is not null
  and array_length(missionary_tables.field_person_ids, 1) = 1
  and missionary_tables.conversation_flow_key is not null
  and missionary_tables.conversation_flow_key <> 'none'
on conflict (ministry_event_id, field_person_id, conversation_flow_key) do nothing;

create or replace function public.set_ministry_event_updated_at()
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

drop trigger if exists set_ministry_events_updated_at on public.ministry_events;
create trigger set_ministry_events_updated_at
  before update on public.ministry_events
  for each row
  execute function public.set_ministry_event_updated_at();

drop trigger if exists set_ministry_event_people_updated_at on public.ministry_event_people;
create trigger set_ministry_event_people_updated_at
  before update on public.ministry_event_people
  for each row
  execute function public.set_ministry_event_updated_at();

drop trigger if exists set_ministry_event_person_responses_updated_at on public.ministry_event_person_responses;
create trigger set_ministry_event_person_responses_updated_at
  before update on public.ministry_event_person_responses
  for each row
  execute function public.set_ministry_event_updated_at();

alter table public.ministry_events enable row level security;
alter table public.ministry_event_people enable row level security;
alter table public.ministry_event_person_responses enable row level security;

revoke all on table public.ministry_events from anon;
revoke all on table public.ministry_events from authenticated;
grant select, insert, update on table public.ministry_events to authenticated;

revoke all on table public.ministry_event_people from anon;
revoke all on table public.ministry_event_people from authenticated;
grant select, insert, update, delete on table public.ministry_event_people to authenticated;

revoke all on table public.ministry_event_person_responses from anon;
revoke all on table public.ministry_event_person_responses from authenticated;
grant select, insert, update, delete on table public.ministry_event_person_responses to authenticated;

drop policy if exists "Admins can read ministry events" on public.ministry_events;
create policy "Admins can read ministry events"
  on public.ministry_events
  for select
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor', 'viewer']));

drop policy if exists "Admins can insert ministry events" on public.ministry_events;
create policy "Admins can insert ministry events"
  on public.ministry_events
  for insert
  to authenticated
  with check (public.is_dos_admin(array['admin', 'editor']));

drop policy if exists "Admins can update ministry events" on public.ministry_events;
create policy "Admins can update ministry events"
  on public.ministry_events
  for update
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor']))
  with check (public.is_dos_admin(array['admin', 'editor']));

drop policy if exists "Admins can read ministry event people" on public.ministry_event_people;
create policy "Admins can read ministry event people"
  on public.ministry_event_people
  for select
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor', 'viewer']));

drop policy if exists "Admins can insert ministry event people" on public.ministry_event_people;
create policy "Admins can insert ministry event people"
  on public.ministry_event_people
  for insert
  to authenticated
  with check (public.is_dos_admin(array['admin', 'editor']));

drop policy if exists "Admins can update ministry event people" on public.ministry_event_people;
create policy "Admins can update ministry event people"
  on public.ministry_event_people
  for update
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor']))
  with check (public.is_dos_admin(array['admin', 'editor']));

drop policy if exists "Admins can delete ministry event people" on public.ministry_event_people;
create policy "Admins can delete ministry event people"
  on public.ministry_event_people
  for delete
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor']));

drop policy if exists "Admins can read ministry event person responses" on public.ministry_event_person_responses;
create policy "Admins can read ministry event person responses"
  on public.ministry_event_person_responses
  for select
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor', 'viewer']));

drop policy if exists "Admins can insert ministry event person responses" on public.ministry_event_person_responses;
create policy "Admins can insert ministry event person responses"
  on public.ministry_event_person_responses
  for insert
  to authenticated
  with check (public.is_dos_admin(array['admin', 'editor']));

drop policy if exists "Admins can update ministry event person responses" on public.ministry_event_person_responses;
create policy "Admins can update ministry event person responses"
  on public.ministry_event_person_responses
  for update
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor']))
  with check (public.is_dos_admin(array['admin', 'editor']));

drop policy if exists "Admins can delete ministry event person responses" on public.ministry_event_person_responses;
create policy "Admins can delete ministry event person responses"
  on public.ministry_event_person_responses
  for delete
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor']));

comment on table public.ministry_events is
  'Reusable DOS ministry event record. Table logs, connection logs, and future event types should map here instead of duplicating activity per person.';

comment on table public.ministry_event_people is
  'Role assignments for a ministry event: ministry_team, participant, supporting_attendee, and recorder. Participants receive person activity and fruit; supporting attendees do not.';

comment on table public.ministry_event_person_responses is
  'Participant-specific guided conversation responses for a ministry event. Use this when Jared and Heather need separate Commands answers under the same table.';

comment on column public.missionary_tables.ministry_event_id is
  'Compatibility link from the active DOS table detail record to its reusable ministry event.';

comment on column public.missionary_tables.recorded_by_display_name is
  'Quiet recorder label for the user who entered the table. This is not ownership or visibility.';

notify pgrst, 'reload schema';
