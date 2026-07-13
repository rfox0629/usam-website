create extension if not exists pgcrypto;

create table if not exists public.dos_identity_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  verification_status text not null default 'candidate',
  verification_method text not null default 'manual_review',
  match_reasons text[] not null default '{}'::text[],
  verified_at timestamptz,
  verified_by_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_identity_links_status_check check (
    verification_status in ('candidate', 'ambiguous', 'verified', 'rejected')
  ),
  constraint dos_identity_links_method_not_empty check (length(btrim(verification_method)) > 0),
  constraint dos_identity_links_verified_at_check check (
    (verification_status = 'verified' and verified_at is not null)
    or verification_status <> 'verified'
  )
);

create unique index if not exists dos_identity_links_user_workspace_person_unique
  on public.dos_identity_links(user_id, workspace_id, person_id);

create unique index if not exists dos_identity_links_verified_user_workspace_unique
  on public.dos_identity_links(user_id, workspace_id)
  where verification_status = 'verified';

create unique index if not exists dos_identity_links_verified_person_unique
  on public.dos_identity_links(person_id)
  where verification_status = 'verified';

create index if not exists dos_identity_links_profile_idx
  on public.dos_identity_links(profile_id)
  where profile_id is not null;

create index if not exists dos_identity_links_workspace_status_idx
  on public.dos_identity_links(workspace_id, verification_status, user_id);

create index if not exists dos_identity_links_person_status_idx
  on public.dos_identity_links(person_id, verification_status);

drop trigger if exists set_dos_identity_links_updated_at on public.dos_identity_links;
create trigger set_dos_identity_links_updated_at
  before update on public.dos_identity_links
  for each row
  execute function public.set_dos_updated_at();

alter table public.dos_identity_links enable row level security;

revoke all on table public.dos_identity_links from anon;
revoke all on table public.dos_identity_links from authenticated;

grant select on table public.dos_identity_links to authenticated;
grant select, insert, update, delete on table public.dos_identity_links to service_role;

drop policy if exists "DOS users can read their identity links" on public.dos_identity_links;
create policy "DOS users can read their identity links"
  on public.dos_identity_links
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_dos_admin(array['admin', 'editor', 'viewer'])
  );

drop policy if exists "DOS admins can manage identity links" on public.dos_identity_links;
create policy "DOS admins can manage identity links"
  on public.dos_identity_links
  for all
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor']))
  with check (public.is_dos_admin(array['admin', 'editor']));

create or replace function public.current_dos_identity_person_ids(
  target_workspace_id uuid default null
)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select identity_links.person_id
  from public.dos_identity_links identity_links
  where identity_links.user_id = auth.uid()
    and identity_links.verification_status = 'verified'
    and (
      target_workspace_id is null
      or identity_links.workspace_id = target_workspace_id
    );
$$;

grant execute on function public.current_dos_identity_person_ids(uuid) to authenticated;
grant execute on function public.current_dos_identity_person_ids(uuid) to service_role;

create or replace function public.can_view_dos_group(
  target_group_id uuid,
  allowed_roles text[] default array['leader', 'co_leader', 'helper', 'member', 'guest']
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_dos_admin(array['admin', 'editor', 'viewer'])
    or exists (
      select 1
      from public.dos_group_members members
      join public.dos_identity_links identity_links
        on identity_links.person_id = members.person_id
       and identity_links.verification_status = 'verified'
       and identity_links.user_id = auth.uid()
      join public.dos_groups groups
        on groups.id = members.group_id
       and groups.workspace_id = identity_links.workspace_id
      where members.group_id = target_group_id
        and members.status = 'active'
        and members.role = any(allowed_roles)
        and groups.active is not false
    );
$$;

grant execute on function public.can_view_dos_group(uuid, text[]) to authenticated;
grant execute on function public.can_view_dos_group(uuid, text[]) to service_role;

create or replace function public.can_manage_dos_group(
  target_group_id uuid,
  allowed_roles text[] default array['leader', 'co_leader', 'helper']
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_dos_admin(array['admin', 'editor'])
    or exists (
      select 1
      from public.dos_group_members members
      join public.dos_identity_links identity_links
        on identity_links.person_id = members.person_id
       and identity_links.verification_status = 'verified'
       and identity_links.user_id = auth.uid()
      join public.dos_groups groups
        on groups.id = members.group_id
       and groups.workspace_id = identity_links.workspace_id
      where members.group_id = target_group_id
        and members.status = 'active'
        and members.role = any(allowed_roles)
        and groups.active is not false
    );
$$;

grant execute on function public.can_manage_dos_group(uuid, text[]) to authenticated;
grant execute on function public.can_manage_dos_group(uuid, text[]) to service_role;

drop policy if exists "DOS linked group members can read groups" on public.dos_groups;
create policy "DOS linked group members can read groups"
  on public.dos_groups
  for select
  to authenticated
  using (public.can_view_dos_group(id));

drop policy if exists "DOS linked group leaders can manage groups" on public.dos_groups;
create policy "DOS linked group leaders can manage groups"
  on public.dos_groups
  for update
  to authenticated
  using (public.can_manage_dos_group(id, array['leader', 'co_leader']))
  with check (public.can_manage_dos_group(id, array['leader', 'co_leader']));

drop policy if exists "DOS linked group members can read membership" on public.dos_group_members;
create policy "DOS linked group members can read membership"
  on public.dos_group_members
  for select
  to authenticated
  using (public.can_view_dos_group(group_id));

drop policy if exists "DOS linked group leaders can manage membership" on public.dos_group_members;
create policy "DOS linked group leaders can manage membership"
  on public.dos_group_members
  for all
  to authenticated
  using (public.can_manage_dos_group(group_id, array['leader', 'co_leader']))
  with check (public.can_manage_dos_group(group_id, array['leader', 'co_leader']));

drop policy if exists "DOS linked group members can read gatherings" on public.dos_group_gatherings;
create policy "DOS linked group members can read gatherings"
  on public.dos_group_gatherings
  for select
  to authenticated
  using (public.can_view_dos_group(group_id));

drop policy if exists "DOS linked group leaders can manage gatherings" on public.dos_group_gatherings;
create policy "DOS linked group leaders can manage gatherings"
  on public.dos_group_gatherings
  for all
  to authenticated
  using (public.can_manage_dos_group(group_id))
  with check (public.can_manage_dos_group(group_id));

drop policy if exists "DOS linked group members can read attendance" on public.dos_group_attendance;
create policy "DOS linked group members can read attendance"
  on public.dos_group_attendance
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.dos_group_gatherings gatherings
      where gatherings.id = dos_group_attendance.gathering_id
        and public.can_view_dos_group(gatherings.group_id)
    )
  );

drop policy if exists "DOS linked group leaders can manage attendance" on public.dos_group_attendance;
create policy "DOS linked group leaders can manage attendance"
  on public.dos_group_attendance
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.dos_group_gatherings gatherings
      where gatherings.id = dos_group_attendance.gathering_id
        and public.can_manage_dos_group(gatherings.group_id)
    )
  )
  with check (
    exists (
      select 1
      from public.dos_group_gatherings gatherings
      where gatherings.id = dos_group_attendance.gathering_id
        and public.can_manage_dos_group(gatherings.group_id)
    )
  );

drop policy if exists "DOS linked group members can read resources" on public.dos_group_resources;
create policy "DOS linked group members can read resources"
  on public.dos_group_resources
  for select
  to authenticated
  using (public.can_view_dos_group(group_id));

drop policy if exists "DOS linked group leaders can manage resources" on public.dos_group_resources;
create policy "DOS linked group leaders can manage resources"
  on public.dos_group_resources
  for all
  to authenticated
  using (public.can_manage_dos_group(group_id))
  with check (public.can_manage_dos_group(group_id));

comment on table public.dos_identity_links is
  'Canonical DOS identity bridge from authenticated auth.users to the verified Field person used for shared ministry objects. Candidate/ambiguous rows support safe manual verification before linking existing people.';

comment on column public.dos_identity_links.person_id is
  'Verified canonical DOS Field person for this authenticated user within a workspace. Shared objects such as Groups derive role permissions from this person.';

comment on column public.dos_identity_links.verification_status is
  'candidate and ambiguous never grant shared object permissions. Only verified links authorize shared leadership.';

comment on column public.dos_identity_links.match_reasons is
  'Evidence used for the link, such as profile_user_id, email_exact, phone_exact, created_viewer_person, or manual_admin.';

comment on function public.current_dos_identity_person_ids(uuid) is
  'Returns verified Field person ids for the authenticated DOS user, optionally scoped to one workspace.';

comment on function public.can_view_dos_group(uuid, text[]) is
  'Group-level read guard based on verified DOS identity links plus active group membership roles. Does not expose private records.';

comment on function public.can_manage_dos_group(uuid, text[]) is
  'Group-level management guard based on verified DOS identity links plus active leader/co-leader/helper roles. Workspace membership alone does not grant shared group management.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
