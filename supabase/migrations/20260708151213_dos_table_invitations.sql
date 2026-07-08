create extension if not exists pgcrypto;

create table if not exists public.dos_table_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  token text not null default encode(gen_random_bytes(18), 'hex'),
  kind text not null default 'kitchen_table',
  title text not null default 'Kitchen Table',
  description text,
  audience text,
  status text not null default 'active',
  host_mode text not null default 'single',
  host_member_ids uuid[] not null default '{}',
  settings jsonb not null default '{}'::jsonb,
  public_enabled boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_table_invitations_token_unique unique (token),
  constraint dos_table_invitations_token_check check (length(trim(token)) >= 20),
  constraint dos_table_invitations_kind_check
    check (kind in ('coffee', 'kitchen_table', 'prayer')),
  constraint dos_table_invitations_status_check
    check (status in ('active', 'draft', 'paused', 'archived')),
  constraint dos_table_invitations_host_mode_check
    check (host_mode in ('single', 'household'))
);

create index if not exists dos_table_invitations_workspace_status_idx
  on public.dos_table_invitations(workspace_id, status, updated_at desc);

create index if not exists dos_table_invitations_workspace_kind_idx
  on public.dos_table_invitations(workspace_id, kind);

create table if not exists public.dos_table_invitation_bookings (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.dos_table_invitations(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  field_person_id uuid references public.missionary_field_people(id) on delete set null,
  table_id uuid references public.missionary_tables(id) on delete set null,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  requester_notes text,
  prayer_request text,
  status text not null default 'booked',
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text,
  calendar_event_synced boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_table_invitation_bookings_status_check
    check (status in ('booked', 'canceled', 'requested')),
  constraint dos_table_invitation_bookings_email_check
    check (position('@' in requester_email) > 1),
  constraint dos_table_invitation_bookings_time_check
    check (end_at > start_at)
);

create index if not exists dos_table_invitation_bookings_invitation_start_idx
  on public.dos_table_invitation_bookings(invitation_id, start_at);

create index if not exists dos_table_invitation_bookings_workspace_start_idx
  on public.dos_table_invitation_bookings(workspace_id, start_at)
  where status = 'booked';

create or replace function public.set_dos_table_invite_updated_at()
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

drop trigger if exists set_dos_table_invitations_updated_at on public.dos_table_invitations;
create trigger set_dos_table_invitations_updated_at
  before update on public.dos_table_invitations
  for each row
  execute function public.set_dos_table_invite_updated_at();

drop trigger if exists set_dos_table_invitation_bookings_updated_at on public.dos_table_invitation_bookings;
create trigger set_dos_table_invitation_bookings_updated_at
  before update on public.dos_table_invitation_bookings
  for each row
  execute function public.set_dos_table_invite_updated_at();

alter table public.dos_table_invitations enable row level security;
alter table public.dos_table_invitation_bookings enable row level security;

revoke all on table public.dos_table_invitations from anon;
revoke all on table public.dos_table_invitation_bookings from anon;
revoke all on table public.dos_table_invitations from authenticated;
revoke all on table public.dos_table_invitation_bookings from authenticated;

grant select, insert, update on table public.dos_table_invitations to authenticated;
grant select, insert, update on table public.dos_table_invitation_bookings to authenticated;

drop policy if exists "Admins can manage DOS table invitations" on public.dos_table_invitations;
create policy "Admins can manage DOS table invitations"
  on public.dos_table_invitations
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

drop policy if exists "Admins can manage DOS table invitation bookings" on public.dos_table_invitation_bookings;
create policy "Admins can manage DOS table invitation bookings"
  on public.dos_table_invitation_bookings
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

comment on table public.dos_table_invitations is
  'Workspace-scoped DOS table invitation links and availability rules.';

comment on table public.dos_table_invitation_bookings is
  'Public booking requests created from DOS table invitation links.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
