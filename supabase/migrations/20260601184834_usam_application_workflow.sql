create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.organization_memberships') is not null then
    alter table public.organization_memberships
      drop constraint if exists organization_memberships_status_check;

    alter table public.organization_memberships
      add constraint organization_memberships_status_check
      check (
        status in (
          'independent',
          'not_connected',
          'application_started',
          'application_submitted',
          'pending_review',
          'approved',
          'active',
          'rejected',
          'archived',
          'pending',
          'inactive'
        )
      );
  end if;

  if to_regclass('public.collective_memberships') is not null then
    alter table public.collective_memberships
      drop constraint if exists collective_memberships_status_check;

    alter table public.collective_memberships
      add constraint collective_memberships_status_check
      check (
        status in (
          'independent',
          'not_connected',
          'application_started',
          'application_submitted',
          'pending_review',
          'approved',
          'active',
          'rejected',
          'archived',
          'pending',
          'inactive'
        )
      );
  end if;

  if to_regclass('public.network_memberships') is not null then
    alter table public.network_memberships
      drop constraint if exists network_memberships_status_check;

    alter table public.network_memberships
      add constraint network_memberships_status_check
      check (
        status in (
          'independent',
          'not_connected',
          'application_started',
          'application_submitted',
          'pending_review',
          'approved',
          'active',
          'rejected',
          'archived',
          'pending',
          'inactive'
        )
      );
  end if;
end $$;

alter table public.missionary_households
  add column if not exists usam_application_status text not null default 'not_connected',
  add column if not exists usam_profile_status text not null default 'draft',
  add column if not exists usam_application_submitted_at timestamptz,
  add column if not exists usam_application_reviewed_at timestamptz,
  add column if not exists usam_assigned_admin_email text;

do $$
begin
  alter table public.missionary_households
    drop constraint if exists missionary_households_usam_application_status_check;

  alter table public.missionary_households
    add constraint missionary_households_usam_application_status_check
    check (
      usam_application_status in (
        'independent',
        'not_connected',
        'application_started',
        'application_submitted',
        'pending_review',
        'approved',
        'active',
        'rejected',
        'archived'
      )
    );

  alter table public.missionary_households
    drop constraint if exists missionary_households_usam_profile_status_check;

  alter table public.missionary_households
    add constraint missionary_households_usam_profile_status_check
    check (
      usam_profile_status in (
        'draft',
        'under_review',
        'approved',
        'published',
        'hidden',
        'archived'
      )
    );
end $$;

create table if not exists public.usam_missionary_applications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  missionary_profile_id uuid references public.missionary_households(id) on delete set null,
  applicant_user_id uuid,
  applicant_name text not null default '',
  applicant_email text,
  applicant_phone text,
  location text,
  story_testimony text,
  profile_photo_url text,
  calling_focus text,
  monthly_budget numeric(12,2),
  support_goal numeric(12,2),
  prayer_needs text,
  references_text text,
  contact_payload jsonb not null default '{}'::jsonb,
  status text not null default 'application_started',
  assigned_admin_email text,
  admin_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usam_missionary_applications_status_check
    check (
      status in (
        'independent',
        'not_connected',
        'application_started',
        'application_submitted',
        'pending_review',
        'approved',
        'active',
        'rejected',
        'archived'
      )
    )
);

alter table public.missionary_households
  add column if not exists usam_application_id uuid references public.usam_missionary_applications(id) on delete set null;

create unique index if not exists usam_missionary_applications_workspace_org_active_idx
  on public.usam_missionary_applications(
    workspace_id,
    coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status not in ('rejected', 'archived');

create index if not exists usam_missionary_applications_workspace_idx
  on public.usam_missionary_applications(workspace_id, status, created_at desc);

create index if not exists usam_missionary_applications_profile_idx
  on public.usam_missionary_applications(profile_id);

create index if not exists usam_missionary_applications_status_submitted_idx
  on public.usam_missionary_applications(status, submitted_at desc);

create index if not exists missionary_households_usam_application_status_idx
  on public.missionary_households(usam_application_status, usam_application_submitted_at desc);

alter table public.usam_missionary_applications enable row level security;

grant select, insert, update on table public.usam_missionary_applications to authenticated;
grant all on table public.usam_missionary_applications to service_role;

drop policy if exists "USAM applications admins can read" on public.usam_missionary_applications;
create policy "USAM applications admins can read"
  on public.usam_missionary_applications
  for select
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor', 'viewer']));

drop policy if exists "USAM applications admins can write" on public.usam_missionary_applications;
create policy "USAM applications admins can write"
  on public.usam_missionary_applications
  for all
  to authenticated
  using (public.is_dos_admin(array['admin', 'editor']))
  with check (public.is_dos_admin(array['admin', 'editor']));

drop policy if exists "USAM applicants can read own application" on public.usam_missionary_applications;
create policy "USAM applicants can read own application"
  on public.usam_missionary_applications
  for select
  to authenticated
  using (
    applicant_user_id = (select auth.uid())
    or exists (
      select 1
      from public.missionary_team_members
      where missionary_team_members.household_id = usam_missionary_applications.workspace_id
        and missionary_team_members.status not in ('inactive', 'archived')
        and (
          missionary_team_members.dos_user_id = (select auth.uid())::text
          or lower(missionary_team_members.dos_user_id) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
        )
    )
  );

drop policy if exists "USAM applicants can submit own application" on public.usam_missionary_applications;
create policy "USAM applicants can submit own application"
  on public.usam_missionary_applications
  for insert
  to authenticated
  with check (
    applicant_user_id = (select auth.uid())
    or exists (
      select 1
      from public.missionary_team_members
      where missionary_team_members.household_id = usam_missionary_applications.workspace_id
        and missionary_team_members.status not in ('inactive', 'archived')
        and (
          missionary_team_members.dos_user_id = (select auth.uid())::text
          or lower(missionary_team_members.dos_user_id) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
        )
    )
  );

drop policy if exists "USAM applicants can update own draft" on public.usam_missionary_applications;
create policy "USAM applicants can update own draft"
  on public.usam_missionary_applications
  for update
  to authenticated
  using (
    status in ('application_started', 'application_submitted', 'pending_review', 'approved', 'active')
    and (
      applicant_user_id = (select auth.uid())
      or exists (
        select 1
        from public.missionary_team_members
        where missionary_team_members.household_id = usam_missionary_applications.workspace_id
          and missionary_team_members.status not in ('inactive', 'archived')
          and (
            missionary_team_members.dos_user_id = (select auth.uid())::text
            or lower(missionary_team_members.dos_user_id) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
          )
      )
    )
  )
  with check (
    status in ('application_started', 'application_submitted', 'pending_review')
    and (
      applicant_user_id = (select auth.uid())
      or exists (
        select 1
        from public.missionary_team_members
        where missionary_team_members.household_id = usam_missionary_applications.workspace_id
          and missionary_team_members.status not in ('inactive', 'archived')
          and (
            missionary_team_members.dos_user_id = (select auth.uid())::text
            or lower(missionary_team_members.dos_user_id) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
          )
      )
    )
  );

drop trigger if exists set_usam_missionary_applications_updated_at on public.usam_missionary_applications;
create trigger set_usam_missionary_applications_updated_at
  before update on public.usam_missionary_applications
  for each row
  execute function public.set_dos_updated_at();

comment on table public.usam_missionary_applications is
  'USA Missionaries approval workflow records. Applications are tied to one DOS workspace and seed the public profile draft.';

comment on column public.missionary_households.usam_application_status is
  'Current USA Missionaries organization application state for this DOS workspace.';

comment on column public.missionary_households.usam_profile_status is
  'Admin-managed public profile workflow state for USA Missionaries Profiles.';
