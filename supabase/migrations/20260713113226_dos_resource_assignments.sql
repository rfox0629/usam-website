create extension if not exists pgcrypto;

create table if not exists public.dos_resource_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  resource_slug text not null,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  assigned_by_user_id uuid,
  status text not null default 'not_started',
  start_date date not null default current_date,
  due_date date,
  completed_at timestamptz,
  paused_at timestamptz,
  personal_message text,
  follow_up_cadence text not null default 'midpoint_and_completion',
  linked_commitment_id uuid references public.dos_person_commitments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_resource_assignments_resource_slug_check
    check (resource_slug ~ '^[a-z0-9][a-z0-9-]{1,120}$'),
  constraint dos_resource_assignments_status_check
    check (status in ('not_started', 'in_progress', 'completed', 'paused')),
  constraint dos_resource_assignments_follow_up_cadence_check
    check (follow_up_cadence in ('none', 'midpoint_and_completion', 'due_only', 'weekly')),
  constraint dos_resource_assignments_due_date_check
    check (due_date is null or due_date >= start_date),
  constraint dos_resource_assignments_completed_check
    check ((status = 'completed' and completed_at is not null) or status <> 'completed'),
  constraint dos_resource_assignments_paused_check
    check ((status = 'paused' and paused_at is not null) or status <> 'paused')
);

create unique index if not exists dos_resource_assignments_active_unique
  on public.dos_resource_assignments(workspace_id, person_id, resource_slug)
  where status in ('not_started', 'in_progress', 'paused');

create index if not exists dos_resource_assignments_workspace_status_due_idx
  on public.dos_resource_assignments(workspace_id, status, due_date, start_date desc);

create index if not exists dos_resource_assignments_person_status_idx
  on public.dos_resource_assignments(person_id, status, due_date);

create index if not exists dos_resource_assignments_resource_idx
  on public.dos_resource_assignments(workspace_id, resource_slug, status);

create index if not exists dos_resource_assignments_commitment_idx
  on public.dos_resource_assignments(linked_commitment_id)
  where linked_commitment_id is not null;

drop trigger if exists set_dos_resource_assignments_updated_at on public.dos_resource_assignments;
create trigger set_dos_resource_assignments_updated_at
  before update on public.dos_resource_assignments
  for each row
  execute function public.set_dos_updated_at();

alter table public.dos_resource_assignments enable row level security;

revoke all on table public.dos_resource_assignments from anon;
revoke all on table public.dos_resource_assignments from authenticated;

grant select, insert, update on table public.dos_resource_assignments to authenticated;
grant select, insert, update, delete on table public.dos_resource_assignments to service_role;

drop policy if exists "DOS admins can read resource assignments" on public.dos_resource_assignments;
create policy "DOS admins can read resource assignments"
  on public.dos_resource_assignments
  for select
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can manage resource assignments" on public.dos_resource_assignments;
create policy "DOS editors can manage resource assignments"
  on public.dos_resource_assignments
  for all
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']))
  with check (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']));

comment on table public.dos_resource_assignments is
  'Workspace-scoped assignments of canonical DOS Library resources to people. Stores only the resource slug and assignment state; Library remains the source of truth for title, URLs, PDF, type, and metadata.';

comment on column public.dos_resource_assignments.resource_slug is
  'Canonical DOS Library resource slug. Resolve title, type, URL, PDF, category, and duration from src/lib/dos/resource-catalog.ts.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
