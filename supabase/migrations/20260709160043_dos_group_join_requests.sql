create extension if not exists pgcrypto;

create table if not exists public.dos_group_join_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.missionary_households(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  group_id uuid references public.dos_groups(id) on delete set null,
  source_group_id uuid references public.dos_groups(id) on delete set null,
  source_group_slug text not null,
  source_type text not null default 'group_join_request',
  source_path text not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  message text,
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_join_requests_name_check
    check (length(btrim(first_name)) > 0 and length(btrim(last_name)) > 0),
  constraint dos_group_join_requests_email_check
    check (position('@' in email) > 1),
  constraint dos_group_join_requests_source_type_check
    check (source_type = 'group_join_request'),
  constraint dos_group_join_requests_source_slug_check
    check (source_group_slug ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  constraint dos_group_join_requests_source_path_check
    check (source_path like '/groups/%'),
  constraint dos_group_join_requests_status_check
    check (status in ('pending', 'reviewed', 'accepted', 'declined', 'archived'))
);

create index if not exists dos_group_join_requests_group_status_idx
  on public.dos_group_join_requests(group_id, status, submitted_at desc)
  where group_id is not null;

create index if not exists dos_group_join_requests_workspace_status_idx
  on public.dos_group_join_requests(workspace_id, status, submitted_at desc)
  where workspace_id is not null;

create index if not exists dos_group_join_requests_source_slug_idx
  on public.dos_group_join_requests(source_group_slug, status, submitted_at desc);

create unique index if not exists dos_group_join_requests_pending_group_email_unique
  on public.dos_group_join_requests(group_id, lower(email))
  where group_id is not null
    and status = 'pending';

drop trigger if exists set_dos_group_join_requests_updated_at on public.dos_group_join_requests;
create trigger set_dos_group_join_requests_updated_at
  before update on public.dos_group_join_requests
  for each row
  execute function public.set_dos_updated_at();

alter table public.dos_group_join_requests enable row level security;

revoke all on table public.dos_group_join_requests from anon;
revoke all on table public.dos_group_join_requests from authenticated;

grant insert (
  email,
  first_name,
  last_name,
  message,
  phone,
  source_group_slug,
  source_path,
  source_type
) on table public.dos_group_join_requests to anon;
grant insert, select, update, delete on table public.dos_group_join_requests to service_role;

drop policy if exists "Public can create pending group join requests" on public.dos_group_join_requests;
create policy "Public can create pending group join requests"
  on public.dos_group_join_requests
  for insert
  to anon
  with check (
    status = 'pending'
    and source_type = 'group_join_request'
    and length(btrim(first_name)) > 0
    and length(btrim(last_name)) > 0
    and position('@' in email) > 1
    and source_path like '/groups/%'
    and group_id is null
    and source_group_id is null
    and workspace_id is null
    and organization_id is null
  );

comment on table public.dos_group_join_requests is
  'Pending public join requests for DOS groups. Public submissions do not create group membership. Private DOS server routes review requests with workspace/group scoping.';

comment on column public.dos_group_join_requests.source_type is
  'Always group_join_request for public group page intake tracking.';

comment on column public.dos_group_join_requests.source_group_slug is
  'Public group slug submitted from the shareable group page.';

comment on column public.dos_group_join_requests.source_group_id is
  'Resolved DOS group id at submission time when the group exists.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
