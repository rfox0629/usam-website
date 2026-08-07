alter table public.dos_resource_assignments
  add column if not exists assignment_context text not null default 'person',
  add column if not exists source_group_id uuid references public.dos_groups(id) on delete set null,
  add column if not exists sharing_level text not null default 'leader_progress';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dos_resource_assignments_context_check'
      and conrelid = 'public.dos_resource_assignments'::regclass
  ) then
    alter table public.dos_resource_assignments
      add constraint dos_resource_assignments_context_check
      check (assignment_context in ('self', 'person', 'group', 'library'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'dos_resource_assignments_group_context_check'
      and conrelid = 'public.dos_resource_assignments'::regclass
  ) then
    alter table public.dos_resource_assignments
      add constraint dos_resource_assignments_group_context_check
      check (
        (assignment_context = 'group' and source_group_id is not null)
        or assignment_context <> 'group'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'dos_resource_assignments_sharing_level_check'
      and conrelid = 'public.dos_resource_assignments'::regclass
  ) then
    alter table public.dos_resource_assignments
      add constraint dos_resource_assignments_sharing_level_check
      check (sharing_level in ('leader_progress', 'shared_responses'));
  end if;
end $$;

create index if not exists dos_resource_assignments_group_context_idx
  on public.dos_resource_assignments(workspace_id, source_group_id, resource_slug, status)
  where source_group_id is not null;

comment on column public.dos_resource_assignments.assignment_context is
  'Where the canonical participant assignment was initiated: self, person profile, group, or Library assign.';

comment on column public.dos_resource_assignments.source_group_id is
  'Optional group context for the same canonical participant assignment. Group Journeys must not create separate progress rows.';

comment on column public.dos_resource_assignments.sharing_level is
  'Leader visibility default for this assignment. Private participant response fields stay in dos_guided_resource_progress.';

drop policy if exists "DOS users can read guided resource progress" on public.dos_guided_resource_progress;
create policy "DOS linked participants can read guided resource progress"
  on public.dos_guided_resource_progress
  for select
  to authenticated
  using (
    person_id in (
      select private_dos.current_dos_identity_person_ids(workspace_id)
    )
  );

drop policy if exists "DOS editors can manage guided resource progress" on public.dos_guided_resource_progress;
create policy "DOS linked participants can manage guided resource progress"
  on public.dos_guided_resource_progress
  for all
  to authenticated
  using (
    person_id in (
      select private_dos.current_dos_identity_person_ids(workspace_id)
    )
  )
  with check (
    person_id in (
      select private_dos.current_dos_identity_person_ids(workspace_id)
    )
  );

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
