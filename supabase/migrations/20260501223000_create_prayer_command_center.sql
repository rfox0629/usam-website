create extension if not exists pgcrypto;

alter table public.admin_users
  add column if not exists prayer_permissions text[] not null default '{}';

create table if not exists public.prayer_partner_applications (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  city text,
  state text,
  church_affiliation text,
  referral_source text,
  motivation text,
  email_alerts boolean not null default false,
  sms_alerts boolean not null default false,
  availability text[] not null default '{}',
  confidentiality_agreement boolean not null default false,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint prayer_partner_applications_status_check check (
    status in ('pending', 'approved', 'declined', 'inactive')
  )
);

create index if not exists prayer_partner_applications_created_at_idx
  on public.prayer_partner_applications(created_at desc);

create index if not exists prayer_partner_applications_status_idx
  on public.prayer_partner_applications(status);

alter table public.prayer_partner_applications enable row level security;

revoke all on table public.prayer_partner_applications from anon;
revoke all on table public.prayer_partner_applications from authenticated;

grant insert on table public.prayer_partner_applications to anon;
grant insert on table public.prayer_partner_applications to authenticated;
grant select on table public.prayer_partner_applications to authenticated;
grant update(status) on table public.prayer_partner_applications to authenticated;

drop policy if exists "Public can submit prayer partner applications" on public.prayer_partner_applications;
create policy "Public can submit prayer partner applications"
  on public.prayer_partner_applications
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and confidentiality_agreement = true
  );

drop policy if exists "Prayer admins can read prayer partner applications" on public.prayer_partner_applications;
create policy "Prayer admins can read prayer partner applications"
  on public.prayer_partner_applications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.prayer_permissions && array[
          'view_general_requests',
          'view_confidential_requests',
          'admin_prayer_manager'
        ]::text[]
    )
  );

drop policy if exists "Prayer admins can update prayer partner application status" on public.prayer_partner_applications;
create policy "Prayer admins can update prayer partner application status"
  on public.prayer_partner_applications
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and 'admin_prayer_manager' = any(admin_users.prayer_permissions)
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and 'admin_prayer_manager' = any(admin_users.prayer_permissions)
    )
    and status in ('pending', 'approved', 'declined', 'inactive')
  );
