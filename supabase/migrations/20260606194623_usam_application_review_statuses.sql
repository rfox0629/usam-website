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
          'more_info_requested',
          'approved',
          'active',
          'declined',
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
          'more_info_requested',
          'approved',
          'active',
          'declined',
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
          'more_info_requested',
          'approved',
          'active',
          'declined',
          'rejected',
          'archived',
          'pending',
          'inactive'
        )
      );
  end if;

  if to_regclass('public.missionary_households') is not null then
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
          'more_info_requested',
          'approved',
          'active',
          'declined',
          'rejected',
          'archived'
        )
      );
  end if;

  if to_regclass('public.usam_missionary_applications') is not null then
    alter table public.usam_missionary_applications
      drop constraint if exists usam_missionary_applications_status_check;

    alter table public.usam_missionary_applications
      add constraint usam_missionary_applications_status_check
      check (
        status in (
          'independent',
          'not_connected',
          'application_started',
          'application_submitted',
          'pending_review',
          'more_info_requested',
          'approved',
          'active',
          'declined',
          'rejected',
          'archived'
        )
      );
  end if;
end $$;

drop index if exists public.usam_missionary_applications_workspace_org_active_idx;

create unique index if not exists usam_missionary_applications_workspace_org_active_idx
  on public.usam_missionary_applications(
    workspace_id,
    coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status not in ('rejected', 'declined', 'archived');
