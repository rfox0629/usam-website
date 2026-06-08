create extension if not exists pgcrypto;

alter table public.missionary_households
  add column if not exists enable_prayer_team boolean not null default true,
  add column if not exists prayer_section_headline text,
  add column if not exists prayer_section_description text;

create table if not exists public.prayer_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  state text,
  region text,
  recruited_by_household_id uuid references public.missionary_households(id) on delete set null,
  recruited_by_household_name text,
  recruited_by_household_number text,
  recruited_by_profile_slug text,
  source text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_partners_status_check check (status in ('active', 'inactive', 'archived')),
  constraint prayer_partners_email_household_unique unique (email, recruited_by_household_id)
);

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.missionary_households(id) on delete set null,
  title text not null,
  description text not null,
  category text,
  visibility text not null default 'team',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_requests_visibility_check check (visibility in ('public', 'team', 'private')),
  constraint prayer_requests_status_check check (status in ('active', 'archived'))
);

create index if not exists prayer_partners_email_lower_idx
  on public.prayer_partners (lower(email));

create index if not exists prayer_partners_household_status_idx
  on public.prayer_partners (recruited_by_household_id, status);

create index if not exists prayer_partners_state_region_idx
  on public.prayer_partners (state, region);

create index if not exists prayer_partners_created_at_idx
  on public.prayer_partners (created_at desc);

create index if not exists prayer_requests_household_status_idx
  on public.prayer_requests (household_id, status);

create index if not exists prayer_requests_visibility_status_idx
  on public.prayer_requests (visibility, status);

create index if not exists prayer_requests_created_at_idx
  on public.prayer_requests (created_at desc);

create or replace function public.set_prayer_team_updated_at()
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

drop trigger if exists set_prayer_partners_updated_at on public.prayer_partners;
create trigger set_prayer_partners_updated_at
  before update on public.prayer_partners
  for each row
  execute function public.set_prayer_team_updated_at();

drop trigger if exists set_prayer_requests_updated_at on public.prayer_requests;
create trigger set_prayer_requests_updated_at
  before update on public.prayer_requests
  for each row
  execute function public.set_prayer_team_updated_at();

alter table public.prayer_partners enable row level security;
alter table public.prayer_requests enable row level security;

revoke all on table public.prayer_partners from anon;
revoke all on table public.prayer_partners from authenticated;
revoke all on table public.prayer_requests from anon;
revoke all on table public.prayer_requests from authenticated;

grant insert on table public.prayer_partners to anon;
grant insert on table public.prayer_partners to authenticated;
grant select, update on table public.prayer_partners to authenticated;

grant select on table public.prayer_requests to anon;
grant select, insert, update on table public.prayer_requests to authenticated;

drop policy if exists "Public can join missionary prayer teams" on public.prayer_partners;
create policy "Public can join missionary prayer teams"
  on public.prayer_partners
  for insert
  to anon, authenticated
  with check (
    status = 'active'
    and length(trim(name)) > 0
    and position('@' in email) > 1
  );

drop policy if exists "Admins can read prayer partners" on public.prayer_partners;
create policy "Admins can read prayer partners"
  on public.prayer_partners
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and (
          admin_users.role = 'admin'
          or admin_users.prayer_permissions && array[
            'view_general_requests',
            'view_confidential_requests',
            'admin_prayer_manager'
          ]::text[]
        )
    )
  );

drop policy if exists "Admins can update prayer partners" on public.prayer_partners;
create policy "Admins can update prayer partners"
  on public.prayer_partners
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and (
          admin_users.role = 'admin'
          or 'admin_prayer_manager' = any(admin_users.prayer_permissions)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and (
          admin_users.role = 'admin'
          or 'admin_prayer_manager' = any(admin_users.prayer_permissions)
        )
    )
    and status in ('active', 'inactive', 'archived')
  );

drop policy if exists "Public can read active public prayer requests" on public.prayer_requests;
create policy "Public can read active public prayer requests"
  on public.prayer_requests
  for select
  to anon, authenticated
  using (
    status = 'active'
    and visibility = 'public'
    and exists (
      select 1
      from public.missionary_households
      where missionary_households.id = prayer_requests.household_id
        and missionary_households.public_visible = true
    )
  );

drop policy if exists "Admins can read prayer requests" on public.prayer_requests;
create policy "Admins can read prayer requests"
  on public.prayer_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and (
          admin_users.role = 'admin'
          or admin_users.prayer_permissions && array[
            'view_general_requests',
            'view_confidential_requests',
            'admin_prayer_manager'
          ]::text[]
        )
    )
  );

drop policy if exists "Admins can insert prayer requests" on public.prayer_requests;
create policy "Admins can insert prayer requests"
  on public.prayer_requests
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and (
          admin_users.role = 'admin'
          or 'admin_prayer_manager' = any(admin_users.prayer_permissions)
        )
    )
  );

drop policy if exists "Admins can update prayer requests" on public.prayer_requests;
create policy "Admins can update prayer requests"
  on public.prayer_requests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and (
          admin_users.role = 'admin'
          or 'admin_prayer_manager' = any(admin_users.prayer_permissions)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and (
          admin_users.role = 'admin'
          or 'admin_prayer_manager' = any(admin_users.prayer_permissions)
        )
    )
    and visibility in ('public', 'team', 'private')
    and status in ('active', 'archived')
  );
