create extension if not exists pgcrypto;

create table if not exists public.dos_guided_resource_progress (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  resource_slug text not null,
  session_id text not null,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  assignment_id uuid references public.dos_resource_assignments(id) on delete set null,
  completed_at timestamptz,
  reflection text,
  action_step text,
  prayer_focus text,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_guided_resource_progress_resource_slug_check
    check (resource_slug ~ '^[a-z0-9][a-z0-9-]{1,120}$'),
  constraint dos_guided_resource_progress_session_id_check
    check (session_id ~ '^[a-z0-9][a-z0-9-]{1,120}$'),
  constraint dos_guided_resource_progress_reflection_length_check
    check (reflection is null or length(reflection) <= 6000),
  constraint dos_guided_resource_progress_action_step_length_check
    check (action_step is null or length(action_step) <= 2000),
  constraint dos_guided_resource_progress_prayer_focus_length_check
    check (prayer_focus is null or length(prayer_focus) <= 2000),
  constraint dos_guided_resource_progress_person_session_unique
    unique (workspace_id, person_id, resource_slug, session_id)
);

create index if not exists dos_guided_resource_progress_workspace_resource_idx
  on public.dos_guided_resource_progress(workspace_id, resource_slug, person_id);

create index if not exists dos_guided_resource_progress_person_completed_idx
  on public.dos_guided_resource_progress(person_id, completed_at desc nulls last, updated_at desc);

create index if not exists dos_guided_resource_progress_assignment_idx
  on public.dos_guided_resource_progress(assignment_id)
  where assignment_id is not null;

create index if not exists dos_guided_resource_progress_user_idx
  on public.dos_guided_resource_progress(created_by_user_id)
  where created_by_user_id is not null;

drop trigger if exists set_dos_guided_resource_progress_updated_at on public.dos_guided_resource_progress;
create trigger set_dos_guided_resource_progress_updated_at
  before update on public.dos_guided_resource_progress
  for each row
  execute function public.set_dos_updated_at();

alter table public.dos_guided_resource_progress enable row level security;

revoke all on table public.dos_guided_resource_progress from anon;
revoke all on table public.dos_guided_resource_progress from authenticated;

grant select, insert, update on table public.dos_guided_resource_progress to authenticated;
grant select, insert, update, delete on table public.dos_guided_resource_progress to service_role;

drop policy if exists "DOS users can read guided resource progress" on public.dos_guided_resource_progress;
create policy "DOS users can read guided resource progress"
  on public.dos_guided_resource_progress
  for select
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can manage guided resource progress" on public.dos_guided_resource_progress;
create policy "DOS editors can manage guided resource progress"
  on public.dos_guided_resource_progress
  for all
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']))
  with check (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']));

alter table public.dos_group_resources
  add column if not exists catalog_resource_slug text;

alter table public.dos_group_resources
  drop constraint if exists dos_group_resources_type_check;

alter table public.dos_group_resources
  add constraint dos_group_resources_type_check
  check (
    resource_type in ('link', 'scripture', 'guide', 'reading_plan', 'guided_resource', 'course', 'podcast', 'note', 'video', 'other')
  );

alter table public.dos_group_resources
  drop constraint if exists dos_group_resources_catalog_slug_check;

alter table public.dos_group_resources
  add constraint dos_group_resources_catalog_slug_check
  check (catalog_resource_slug is null or catalog_resource_slug ~ '^[a-z0-9][a-z0-9-]{1,120}$');

create index if not exists dos_group_resources_catalog_slug_idx
  on public.dos_group_resources(catalog_resource_slug)
  where catalog_resource_slug is not null;

comment on table public.dos_guided_resource_progress is
  'Workspace-scoped progress and reflection records for ordered DOS Guided Resource sessions. Resource title, sessions, links, and metadata remain in the DOS Library catalog.';

comment on column public.dos_guided_resource_progress.resource_slug is
  'Canonical DOS Library guided resource slug from src/lib/dos/resource-catalog.ts.';

comment on column public.dos_guided_resource_progress.session_id is
  'Session id from the guidedResource.sessions array for the resource slug.';

comment on column public.dos_group_resources.catalog_resource_slug is
  'Optional canonical DOS Library resource slug for group-attached Library resources.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
