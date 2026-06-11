create table if not exists public.calendar_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  connected_calendar_id uuid references public.connected_calendars(id) on delete set null,
  provider text not null default 'google',
  external_calendar_id text not null,
  name text not null,
  description text,
  time_zone text,
  access_role text,
  is_primary boolean not null default false,
  background_color text,
  foreground_color text,
  selected_for_display boolean not null default true,
  selected_for_import boolean not null default true,
  selected_for_availability boolean not null default true,
  sync_direction text not null default 'read',
  visibility_level text not null default 'details',
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_sources_provider_check check (provider in ('google')),
  constraint calendar_sources_external_calendar_id_not_empty check (length(trim(external_calendar_id)) > 0),
  constraint calendar_sources_sync_direction_check check (sync_direction in ('none', 'read', 'write', 'two_way')),
  constraint calendar_sources_visibility_level_check check (visibility_level in ('busy_only', 'details'))
);

create unique index if not exists calendar_sources_workspace_provider_external_unique
  on public.calendar_sources(workspace_id, provider, external_calendar_id);

create index if not exists calendar_sources_workspace_active_idx
  on public.calendar_sources(workspace_id, is_active, selected_for_display);

create index if not exists calendar_sources_connected_calendar_idx
  on public.calendar_sources(connected_calendar_id);

create table if not exists public.external_calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  calendar_source_id uuid references public.calendar_sources(id) on delete cascade,
  provider text not null default 'google',
  external_calendar_id text not null,
  external_event_id text not null,
  i_cal_uid text,
  etag text,
  status text,
  summary text,
  description text,
  location text,
  html_link text,
  start_at timestamptz,
  end_at timestamptz,
  all_day boolean not null default false,
  timezone text,
  recurring_event_id text,
  visibility text,
  transparency text,
  updated_external_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  imported_dos_source_type text,
  imported_dos_source_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_calendar_events_provider_check check (provider in ('google')),
  constraint external_calendar_events_external_calendar_id_not_empty check (length(trim(external_calendar_id)) > 0),
  constraint external_calendar_events_external_event_id_not_empty check (length(trim(external_event_id)) > 0),
  constraint external_calendar_events_imported_source_type_check check (
    imported_dos_source_type is null
    or imported_dos_source_type in ('meeting', 'reminder', 'important_date')
  )
);

create unique index if not exists external_calendar_events_workspace_provider_external_unique
  on public.external_calendar_events(workspace_id, provider, external_calendar_id, external_event_id);

create index if not exists external_calendar_events_workspace_start_idx
  on public.external_calendar_events(workspace_id, start_at, end_at)
  where deleted_at is null;

create index if not exists external_calendar_events_workspace_ical_idx
  on public.external_calendar_events(workspace_id, i_cal_uid)
  where i_cal_uid is not null and deleted_at is null;

create index if not exists external_calendar_events_imported_source_idx
  on public.external_calendar_events(workspace_id, imported_dos_source_type, imported_dos_source_id)
  where imported_dos_source_id is not null;

create table if not exists public.calendar_sync_cursors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  calendar_source_id uuid references public.calendar_sources(id) on delete cascade,
  provider text not null default 'google',
  sync_token text,
  page_token text,
  time_min timestamptz,
  time_max timestamptz,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_error text,
  channel_id text,
  resource_id text,
  channel_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_sync_cursors_provider_check check (provider in ('google'))
);

create unique index if not exists calendar_sync_cursors_workspace_source_provider_unique
  on public.calendar_sync_cursors(workspace_id, calendar_source_id, provider);

create index if not exists calendar_sync_cursors_workspace_idx
  on public.calendar_sync_cursors(workspace_id, provider, last_finished_at desc);

create unique index if not exists calendar_event_links_workspace_provider_calendar_external_unique
  on public.calendar_event_links(workspace_id, provider, calendar_id, external_event_id)
  where external_event_id is not null;

drop trigger if exists set_calendar_sources_updated_at on public.calendar_sources;
create trigger set_calendar_sources_updated_at
  before update on public.calendar_sources
  for each row
  execute function public.set_dos_calendar_mvp_updated_at();

drop trigger if exists set_external_calendar_events_updated_at on public.external_calendar_events;
create trigger set_external_calendar_events_updated_at
  before update on public.external_calendar_events
  for each row
  execute function public.set_dos_calendar_mvp_updated_at();

drop trigger if exists set_calendar_sync_cursors_updated_at on public.calendar_sync_cursors;
create trigger set_calendar_sync_cursors_updated_at
  before update on public.calendar_sync_cursors
  for each row
  execute function public.set_dos_calendar_mvp_updated_at();

alter table public.calendar_sources enable row level security;
alter table public.external_calendar_events enable row level security;
alter table public.calendar_sync_cursors enable row level security;

revoke all on table public.calendar_sources from anon;
revoke all on table public.external_calendar_events from anon;
revoke all on table public.calendar_sync_cursors from anon;

revoke all on table public.calendar_sources from authenticated;
revoke all on table public.external_calendar_events from authenticated;
revoke all on table public.calendar_sync_cursors from authenticated;

grant select, insert, update on table public.calendar_sources to authenticated;
grant select, insert, update on table public.external_calendar_events to authenticated;
grant select, insert, update on table public.calendar_sync_cursors to authenticated;

drop policy if exists "Admins can manage calendar sources" on public.calendar_sources;
create policy "Admins can manage calendar sources"
  on public.calendar_sources
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

drop policy if exists "Admins can manage external calendar events" on public.external_calendar_events;
create policy "Admins can manage external calendar events"
  on public.external_calendar_events
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

drop policy if exists "Admins can manage calendar sync cursors" on public.calendar_sync_cursors;
create policy "Admins can manage calendar sync cursors"
  on public.calendar_sync_cursors
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

comment on table public.calendar_sources is
  'Server-owned list of external calendars available to a DOS workspace.';

comment on table public.external_calendar_events is
  'Read-only Google Calendar event cache for DOS calendar display and optional Add to DOS conversion.';

comment on table public.calendar_sync_cursors is
  'External calendar sync cursor storage. MVP uses bounded future-window pulls before incremental sync.';

notify pgrst, 'reload schema';;
