-- USA-275 — Multiplication: discipleship connections, account connections and
-- identity matches.
--
-- Additive only. No existing row is read, rewritten or backfilled: current
-- Discipling selections (missionary_field_people.role_in_my_life =
-- 'discipling_them') already ARE the owner's own connections and are read in
-- place. Historical Fruit, discipleship_stage and accountability subjects are
-- untouched.
--
-- Access model: these tables are reached only through service-role API routes
-- that authorize in server code (every DOS route does). anon and authenticated
-- get no privileges at all, so no client can read or write them directly.
-- Upstream visibility is additionally computed by
-- public.dos_discipleship_readable_workspaces(), which the connected-read
-- route calls as an independent database check alongside the TypeScript
-- traversal; access is granted only when both agree.
--
-- Rollback: 20260913180000_usa_275_discipleship_connections_rollback.sql.

create schema if not exists private_dos;

-- ---------------------------------------------------------------------------
-- Recorded connections: "Tanner disciples Aaron", entered on a Person.
create table if not exists public.dos_discipleship_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  mentor_person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  disciple_person_id uuid references public.missionary_field_people(id) on delete set null,
  -- Always stored, so a name-only entry and a later-deleted Person both keep a name.
  disciple_name text not null,
  status text not null default 'active',
  -- Unknown unless entered; never inferred.
  started_on date,
  ended_at timestamptz,
  removed_at timestamptz,
  -- Provenance, kept internally and never shown as "Recorded by".
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  -- Optional link to existing evidence ("Started Discipling Others"); never creates Fruit.
  evidence_fruit_event_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_discipleship_connections_status_check check (status in ('active', 'ended', 'removed')),
  constraint dos_discipleship_connections_name_check check (length(btrim(disciple_name)) between 1 and 120),
  constraint dos_discipleship_connections_not_self check (disciple_person_id is null or disciple_person_id <> mentor_person_id),
  constraint dos_discipleship_connections_ended_check check (status <> 'ended' or ended_at is not null),
  constraint dos_discipleship_connections_removed_check check (status <> 'removed' or removed_at is not null)
);

create unique index if not exists dos_discipleship_connections_active_person_unique
  on public.dos_discipleship_connections(mentor_person_id, disciple_person_id)
  where status = 'active' and disciple_person_id is not null;

create index if not exists dos_discipleship_connections_workspace_status_idx
  on public.dos_discipleship_connections(workspace_id, status);

create index if not exists dos_discipleship_connections_mentor_idx
  on public.dos_discipleship_connections(mentor_person_id);

create index if not exists dos_discipleship_connections_disciple_idx
  on public.dos_discipleship_connections(disciple_person_id);

-- Both People must belong to the connection's workspace.
create or replace function private_dos.dos_discipleship_connection_scope_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.missionary_field_people p
    where p.id = new.mentor_person_id and (p.workspace_id = new.workspace_id or p.household_id = new.workspace_id)
  ) then
    raise exception 'mentor person is not in workspace %', new.workspace_id using errcode = '23514';
  end if;

  if new.disciple_person_id is not null and not exists (
    select 1 from public.missionary_field_people p
    where p.id = new.disciple_person_id and (p.workspace_id = new.workspace_id or p.household_id = new.workspace_id)
  ) then
    raise exception 'disciple person is not in workspace %', new.workspace_id using errcode = '23514';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists dos_discipleship_connections_scope_guard on public.dos_discipleship_connections;
create trigger dos_discipleship_connections_scope_guard
  before insert or update on public.dos_discipleship_connections
  for each row execute function private_dos.dos_discipleship_connection_scope_guard();

-- ---------------------------------------------------------------------------
-- Account connections: the mentor's Person record ↔ the disciple's own DOS
-- account, by invitation and explicit acceptance only.
create table if not exists public.dos_discipleship_account_connections (
  id uuid primary key default gen_random_uuid(),
  mentor_workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  invited_by_user_id uuid references auth.users(id) on delete set null,
  -- Lower-cased; matched only against the signed-in user's authenticated email.
  invite_email text not null,
  status text not null default 'pending',
  disciple_user_id uuid references auth.users(id) on delete cascade,
  disciple_workspace_id uuid references public.missionary_households(id) on delete set null,
  identity_link_id uuid references public.dos_identity_links(id) on delete set null,
  -- When the accepting user was shown who would be able to view their DOS
  -- information, including indirect upstream viewers.
  visibility_explained_at timestamptz,
  upstream_viewer_names text[] not null default '{}',
  accepted_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_discipleship_account_connections_status_check check (status in ('pending', 'accepted', 'declined', 'revoked', 'canceled')),
  constraint dos_discipleship_account_connections_email_check check (invite_email = lower(btrim(invite_email)) and position('@' in invite_email) > 1),
  constraint dos_discipleship_account_connections_accepted_check check (
    status <> 'accepted'
    or (disciple_user_id is not null and disciple_workspace_id is not null and accepted_at is not null and visibility_explained_at is not null)
  ),
  constraint dos_discipleship_account_connections_not_own_workspace check (disciple_workspace_id is null or disciple_workspace_id <> mentor_workspace_id)
);

-- One open invitation or accepted connection per Person record.
create unique index if not exists dos_discipleship_account_connections_open_person_unique
  on public.dos_discipleship_account_connections(person_id)
  where status in ('pending', 'accepted');

create index if not exists dos_discipleship_account_connections_mentor_ws_idx
  on public.dos_discipleship_account_connections(mentor_workspace_id, status);

create index if not exists dos_discipleship_account_connections_email_idx
  on public.dos_discipleship_account_connections(invite_email, status);

create index if not exists dos_discipleship_account_connections_disciple_idx
  on public.dos_discipleship_account_connections(disciple_user_id, status);

-- ---------------------------------------------------------------------------
-- Identity matches: the disciple's explicit, reversible decision about an
-- entry their mentor recorded ("this Aaron is my Aaron" / "not correct").
create table if not exists public.dos_discipleship_identity_matches (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.dos_discipleship_connections(id) on delete cascade,
  account_connection_id uuid not null references public.dos_discipleship_account_connections(id) on delete cascade,
  matched_workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  matched_person_id uuid references public.missionary_field_people(id) on delete cascade,
  status text not null,
  -- Whether confirming created the matched Person (so undo can say so; the
  -- Person and any history added to it are never deleted by undo).
  created_person boolean not null default false,
  decided_by_user_id uuid references auth.users(id) on delete set null,
  decided_at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint dos_discipleship_identity_matches_status_check check (status in ('confirmed', 'declined', 'undone')),
  constraint dos_discipleship_identity_matches_confirmed_check check (status <> 'confirmed' or matched_person_id is not null),
  constraint dos_discipleship_identity_matches_undone_check check (status <> 'undone' or undone_at is not null)
);

create unique index if not exists dos_discipleship_identity_matches_decided_unique
  on public.dos_discipleship_identity_matches(connection_id)
  where status in ('confirmed', 'declined');

create index if not exists dos_discipleship_identity_matches_person_idx
  on public.dos_discipleship_identity_matches(matched_person_id);

create index if not exists dos_discipleship_identity_matches_account_idx
  on public.dos_discipleship_identity_matches(account_connection_id);

-- ---------------------------------------------------------------------------
-- Upstream readable workspaces, bounded and cycle-safe. Mirrors
-- dosReadableWorkspaces() in src/lib/dos/discipleship-graph.ts.
--
-- In `public` only so the service-role route can call it through PostgREST
-- (`private_dos` is not an exposed schema). It is SECURITY INVOKER and
-- executable by service_role alone, so it grants no one anything: a caller
-- without table privileges could not read the rows it walks.
create or replace function public.dos_discipleship_readable_workspaces(
  p_viewer_workspace_ids uuid[],
  p_max_depth integer default 8
)
returns table (workspace_id uuid, depth integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive walk(workspace_id, depth, path) as (
    select v.id, 0, array[v.id]
    from unnest(p_viewer_workspace_ids) as v(id)
    union all
    select ac.disciple_workspace_id, w.depth + 1, w.path || ac.disciple_workspace_id
    from walk w
    join public.dos_discipleship_account_connections ac
      on ac.mentor_workspace_id = w.workspace_id
     and ac.status = 'accepted'
     and ac.disciple_user_id is not null
     and ac.disciple_workspace_id is not null
    join public.missionary_field_people p
      on p.id = ac.person_id
     and (p.workspace_id = w.workspace_id or p.household_id = w.workspace_id)
     and p.role_in_my_life = 'discipling_them'
     and coalesce(p.status, '') <> 'archived'
    join public.dos_identity_links l
      on l.user_id = ac.disciple_user_id
     and l.workspace_id = w.workspace_id
     and l.person_id = ac.person_id
     and l.verification_status = 'verified'
    where w.depth < least(greatest(coalesce(p_max_depth, 8), 0), 8)
      and not ac.disciple_workspace_id = any(w.path)
  )
  select w.workspace_id, min(w.depth)::integer
  from walk w
  where w.depth > 0
    and not w.workspace_id = any(p_viewer_workspace_ids)
  group by w.workspace_id;
$$;

-- ---------------------------------------------------------------------------
-- Grants: service role only (the same posture as dos_person_merge_log). New
-- public tables inherit a default anon grant, so revoke explicitly (USA-247).
alter table public.dos_discipleship_connections enable row level security;
alter table public.dos_discipleship_account_connections enable row level security;
alter table public.dos_discipleship_identity_matches enable row level security;

revoke all on public.dos_discipleship_connections from anon, authenticated;
revoke all on public.dos_discipleship_account_connections from anon, authenticated;
revoke all on public.dos_discipleship_identity_matches from anon, authenticated;

grant all on public.dos_discipleship_connections to service_role;
grant all on public.dos_discipleship_account_connections to service_role;
grant all on public.dos_discipleship_identity_matches to service_role;

revoke all on function public.dos_discipleship_readable_workspaces(uuid[], integer) from public, anon, authenticated;
grant execute on function public.dos_discipleship_readable_workspaces(uuid[], integer) to service_role;
revoke all on function private_dos.dos_discipleship_connection_scope_guard() from public, anon, authenticated;
