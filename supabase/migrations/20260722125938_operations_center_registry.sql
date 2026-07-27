create extension if not exists pgcrypto;

create table if not exists public.operations_dispatchers (
  id uuid primary key default gen_random_uuid(),
  dispatcher_key text not null unique,
  display_name text not null default 'Linear dispatcher',
  state text not null default 'unknown',
  test_mode boolean not null default false,
  last_poll_at timestamptz,
  last_successful_pickup_at timestamptz,
  heartbeat_at timestamptz,
  version text,
  recovery_guidance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_dispatchers_state_check
    check (state in ('running', 'paused', 'offline', 'error', 'unknown'))
);

create table if not exists public.operations_runners (
  id uuid primary key default gen_random_uuid(),
  runner_key text not null unique,
  runner_type text not null,
  display_name text not null,
  availability text not null default 'unknown',
  current_issue_identifier text,
  current_issue_title text,
  paused boolean not null default false,
  active_since timestamptz,
  heartbeat_at timestamptz,
  version text,
  recovery_guidance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_runners_type_check
    check (runner_type in ('claude', 'codex')),
  constraint operations_runners_availability_check
    check (availability in ('available', 'busy', 'paused', 'offline', 'error', 'unknown'))
);

create table if not exists public.operations_worktrees (
  id uuid primary key default gen_random_uuid(),
  worktree_key text not null unique,
  issue_identifier text not null,
  issue_title text,
  runner_key text,
  runner_type text,
  branch_name text,
  status text not null default 'active',
  lock_state text not null default 'unknown',
  started_at timestamptz,
  completed_at timestamptz,
  last_seen_at timestamptz,
  recovery_guidance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_worktrees_runner_type_check
    check (runner_type is null or runner_type in ('claude', 'codex')),
  constraint operations_worktrees_status_check
    check (status in ('active', 'completed', 'failed', 'abandoned', 'unknown')),
  constraint operations_worktrees_lock_state_check
    check (lock_state in ('locked', 'unlocked', 'stale', 'released', 'unknown'))
);

create table if not exists public.operations_locks (
  id uuid primary key default gen_random_uuid(),
  lock_key text not null unique,
  issue_identifier text,
  runner_key text,
  runner_type text,
  branch_name text,
  state text not null default 'unknown',
  acquired_at timestamptz,
  expires_at timestamptz,
  released_at timestamptz,
  heartbeat_at timestamptz,
  recovery_guidance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_locks_runner_type_check
    check (runner_type is null or runner_type in ('claude', 'codex')),
  constraint operations_locks_state_check
    check (state in ('active', 'released', 'stale', 'expired', 'unknown'))
);

create table if not exists public.operations_execution_events (
  id uuid primary key default gen_random_uuid(),
  event_key text unique,
  issue_identifier text,
  issue_title text,
  runner_key text,
  runner_type text,
  worktree_key text,
  event_type text not null,
  attempt integer not null default 1,
  summary text,
  recovery_guidance text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint operations_execution_events_runner_type_check
    check (runner_type is null or runner_type in ('claude', 'codex')),
  constraint operations_execution_events_attempt_check
    check (attempt >= 1),
  constraint operations_execution_events_type_check
    check (event_type in (
      'pickup',
      'heartbeat',
      'completed',
      'failed',
      'retry_scheduled',
      'retry_started',
      'paused',
      'resumed',
      'lock_acquired',
      'lock_released',
      'stale_detected',
      'offline_detected',
      'manual_note'
    ))
);

create index if not exists operations_dispatchers_state_updated_idx
  on public.operations_dispatchers (state, updated_at desc);

create index if not exists operations_runners_type_availability_idx
  on public.operations_runners (runner_type, availability, updated_at desc);

create index if not exists operations_worktrees_status_updated_idx
  on public.operations_worktrees (status, updated_at desc);

create index if not exists operations_worktrees_issue_idx
  on public.operations_worktrees (issue_identifier);

create index if not exists operations_locks_state_updated_idx
  on public.operations_locks (state, updated_at desc);

create index if not exists operations_execution_events_occurred_idx
  on public.operations_execution_events (occurred_at desc);

create index if not exists operations_execution_events_type_occurred_idx
  on public.operations_execution_events (event_type, occurred_at desc);

drop trigger if exists set_operations_dispatchers_updated_at on public.operations_dispatchers;
create trigger set_operations_dispatchers_updated_at
  before update on public.operations_dispatchers
  for each row
  execute function public.set_command_center_workflow_updated_at();

drop trigger if exists set_operations_runners_updated_at on public.operations_runners;
create trigger set_operations_runners_updated_at
  before update on public.operations_runners
  for each row
  execute function public.set_command_center_workflow_updated_at();

drop trigger if exists set_operations_worktrees_updated_at on public.operations_worktrees;
create trigger set_operations_worktrees_updated_at
  before update on public.operations_worktrees
  for each row
  execute function public.set_command_center_workflow_updated_at();

drop trigger if exists set_operations_locks_updated_at on public.operations_locks;
create trigger set_operations_locks_updated_at
  before update on public.operations_locks
  for each row
  execute function public.set_command_center_workflow_updated_at();

alter table public.operations_dispatchers enable row level security;
alter table public.operations_runners enable row level security;
alter table public.operations_worktrees enable row level security;
alter table public.operations_locks enable row level security;
alter table public.operations_execution_events enable row level security;

revoke all on table public.operations_dispatchers from anon;
revoke all on table public.operations_runners from anon;
revoke all on table public.operations_worktrees from anon;
revoke all on table public.operations_locks from anon;
revoke all on table public.operations_execution_events from anon;

revoke all on table public.operations_dispatchers from authenticated;
revoke all on table public.operations_runners from authenticated;
revoke all on table public.operations_worktrees from authenticated;
revoke all on table public.operations_locks from authenticated;
revoke all on table public.operations_execution_events from authenticated;

grant select on table public.operations_dispatchers to authenticated;
grant select on table public.operations_runners to authenticated;
grant select on table public.operations_worktrees to authenticated;
grant select on table public.operations_locks to authenticated;
grant select on table public.operations_execution_events to authenticated;

grant select, insert, update, delete on table public.operations_dispatchers to service_role;
grant select, insert, update, delete on table public.operations_runners to service_role;
grant select, insert, update, delete on table public.operations_worktrees to service_role;
grant select, insert, update, delete on table public.operations_locks to service_role;
grant select, insert, update, delete on table public.operations_execution_events to service_role;

drop policy if exists "Active admins can read operations dispatchers" on public.operations_dispatchers;
create policy "Active admins can read operations dispatchers"
  on public.operations_dispatchers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and coalesce(admin_users.is_active, true)
    )
  );

drop policy if exists "Active admins can read operations runners" on public.operations_runners;
create policy "Active admins can read operations runners"
  on public.operations_runners
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and coalesce(admin_users.is_active, true)
    )
  );

drop policy if exists "Active admins can read operations worktrees" on public.operations_worktrees;
create policy "Active admins can read operations worktrees"
  on public.operations_worktrees
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and coalesce(admin_users.is_active, true)
    )
  );

drop policy if exists "Active admins can read operations locks" on public.operations_locks;
create policy "Active admins can read operations locks"
  on public.operations_locks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and coalesce(admin_users.is_active, true)
    )
  );

drop policy if exists "Active admins can read operations execution events" on public.operations_execution_events;
create policy "Active admins can read operations execution events"
  on public.operations_execution_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and coalesce(admin_users.is_active, true)
    )
  );

comment on table public.operations_dispatchers is
  'Read model for USA-51 dispatcher health. Written by the approved server integration and read by the admin Operations Center.';

comment on table public.operations_runners is
  'Read model for Claude and Codex runner availability. Do not store prompts, secrets, logs, or absolute filesystem paths here.';

comment on table public.operations_worktrees is
  'Read model for active and recently completed dispatcher worktrees. Store opaque worktree keys, issue metadata, branch names, lock state, and timestamps only.';

comment on table public.operations_locks is
  'Read model for dispatcher locks. Store lock keys and issue metadata only, not local lockfile paths or process secrets.';

comment on table public.operations_execution_events is
  'Sanitized execution history for dispatcher pickup, retry, failure, and completion events. Summaries must omit secrets and raw logs.';
