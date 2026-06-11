create extension if not exists pgcrypto;

create table if not exists public.connected_calendars (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'google',
  google_account_email text,
  calendar_id text not null default 'primary',
  access_token text,
  refresh_token text not null,
  expires_at timestamptz,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connected_calendars_provider_check check (provider in ('google')),
  constraint connected_calendars_calendar_id_not_empty check (length(trim(calendar_id)) > 0)
);

create unique index if not exists connected_calendars_active_workspace_provider_calendar_idx
  on public.connected_calendars(workspace_id, provider, calendar_id)
  where disconnected_at is null;

create index if not exists connected_calendars_workspace_connected_idx
  on public.connected_calendars(workspace_id, connected_at desc)
  where disconnected_at is null;

create table if not exists public.calendar_event_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  provider text not null default 'google',
  calendar_id text not null default 'primary',
  external_event_id text,
  sync_status text not null default 'pending',
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_event_links_provider_check check (provider in ('google')),
  constraint calendar_event_links_source_type_check check (source_type in ('meeting', 'reminder', 'important_date')),
  constraint calendar_event_links_sync_status_check check (sync_status in ('pending', 'synced', 'failed'))
);

create unique index if not exists calendar_event_links_workspace_source_provider_unique
  on public.calendar_event_links(workspace_id, source_type, source_id, provider);

create index if not exists calendar_event_links_workspace_status_idx
  on public.calendar_event_links(workspace_id, sync_status, updated_at desc);

alter table public.missionary_tables
  add column if not exists meeting_status text not null default 'logged',
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists scheduled_end_at timestamptz,
  add column if not exists timezone text,
  add column if not exists google_sync_enabled boolean not null default false;

update public.missionary_tables
set meeting_status = 'logged'
where meeting_status is null
  or meeting_status not in ('logged', 'scheduled', 'canceled');

update public.missionary_tables
set google_sync_enabled = false
where google_sync_enabled is null;

alter table public.missionary_tables
  alter column meeting_status set default 'logged',
  alter column meeting_status set not null,
  alter column google_sync_enabled set default false,
  alter column google_sync_enabled set not null,
  drop constraint if exists missionary_tables_meeting_status_check,
  add constraint missionary_tables_meeting_status_check
    check (meeting_status in ('logged', 'scheduled', 'canceled')),
  drop constraint if exists missionary_tables_scheduled_time_check,
  add constraint missionary_tables_scheduled_time_check
    check (scheduled_end_at is null or scheduled_start_at is null or scheduled_end_at > scheduled_start_at);

create index if not exists missionary_tables_workspace_status_scheduled_idx
  on public.missionary_tables(workspace_id, meeting_status, scheduled_start_at)
  where meeting_status = 'scheduled';

create table if not exists public.relationship_reminders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  reminder_type text not null,
  title text,
  reminder_date timestamptz not null,
  recurrence text not null default 'none',
  notes text,
  google_sync_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint relationship_reminders_type_check check (
    reminder_type in ('birthday', 'anniversary', 'baptism', 'salvation', 'follow_up', 'prayer', 'custom')
  ),
  constraint relationship_reminders_recurrence_check check (recurrence in ('none', 'yearly', 'monthly', 'weekly'))
);

create index if not exists relationship_reminders_workspace_person_date_idx
  on public.relationship_reminders(workspace_id, person_id, reminder_date)
  where deleted_at is null;

create index if not exists relationship_reminders_workspace_upcoming_idx
  on public.relationship_reminders(workspace_id, reminder_date)
  where deleted_at is null;

create or replace function public.set_dos_calendar_mvp_updated_at()
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

drop trigger if exists set_connected_calendars_updated_at on public.connected_calendars;
create trigger set_connected_calendars_updated_at
  before update on public.connected_calendars
  for each row
  execute function public.set_dos_calendar_mvp_updated_at();

drop trigger if exists set_calendar_event_links_updated_at on public.calendar_event_links;
create trigger set_calendar_event_links_updated_at
  before update on public.calendar_event_links
  for each row
  execute function public.set_dos_calendar_mvp_updated_at();

drop trigger if exists set_relationship_reminders_updated_at on public.relationship_reminders;
create trigger set_relationship_reminders_updated_at
  before update on public.relationship_reminders
  for each row
  execute function public.set_dos_calendar_mvp_updated_at();

alter table public.connected_calendars enable row level security;
alter table public.calendar_event_links enable row level security;
alter table public.relationship_reminders enable row level security;

revoke all on table public.connected_calendars from anon;
revoke all on table public.calendar_event_links from anon;
revoke all on table public.relationship_reminders from anon;
revoke all on table public.connected_calendars from authenticated;
revoke all on table public.calendar_event_links from authenticated;
revoke all on table public.relationship_reminders from authenticated;

grant select, insert, update on table public.connected_calendars to authenticated;
grant select, insert, update on table public.calendar_event_links to authenticated;
grant select, insert, update on table public.relationship_reminders to authenticated;

drop policy if exists "Admins can manage connected calendars" on public.connected_calendars;
create policy "Admins can manage connected calendars"
  on public.connected_calendars
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  );

drop policy if exists "Admins can manage calendar links" on public.calendar_event_links;
create policy "Admins can manage calendar links"
  on public.calendar_event_links
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  );

drop policy if exists "Admins can manage relationship reminders" on public.relationship_reminders;
create policy "Admins can manage relationship reminders"
  on public.relationship_reminders
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true)
    )
  );

comment on table public.connected_calendars is
  'Server-owned DOS calendar connections. OAuth tokens must not be exposed to client components.';

comment on column public.connected_calendars.refresh_token is
  'Encrypted Google refresh token. Prefer GOOGLE_TOKEN_ENCRYPTION_KEY; server code may fall back to another server secret.';

comment on table public.calendar_event_links is
  'Idempotent external calendar event mapping for DOS meetings and reminders.';

comment on table public.relationship_reminders is
  'DOS relationship reminder engine for birthdays, anniversaries, follow ups, prayer, and custom reminders.';

comment on column public.missionary_tables.meeting_status is
  'DOS meeting lifecycle. Existing rows without an explicit value are treated as logged.';

comment on column public.missionary_tables.google_sync_enabled is
  'User intent to sync this DOS meeting to an external calendar when a connection exists.';

notify pgrst, 'reload schema';;
