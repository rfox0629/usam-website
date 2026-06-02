create extension if not exists pgcrypto;

create table if not exists public.support_commitments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.missionary_households(id) on delete set null,
  household_name text,
  profile_slug text,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  gift_type text not null,
  selected_amount text,
  other_amount numeric,
  allocation_preference text,
  message text,
  support_mode text,
  default_allocation text,
  resolved_monthly_giving_url text,
  resolved_one_time_giving_url text,
  redirect_giving_url text,
  status text not null default 'pending_giving_setup',
  source text not null default 'missionary_profile',
  submitted_at timestamptz not null default now(),
  completed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_commitments_gift_type_check check (gift_type in ('monthly', 'one_time')),
  constraint support_commitments_status_check check (
    status in ('pending_giving_setup', 'active', 'incomplete', 'cancelled', 'needs_follow_up')
  ),
  constraint support_commitments_source_check check (source in ('missionary_profile', 'general_support_page'))
);

create index if not exists support_commitments_status_created_idx
  on public.support_commitments(status, created_at desc);

create index if not exists support_commitments_household_created_idx
  on public.support_commitments(household_id, created_at desc);

create index if not exists support_commitments_household_status_idx
  on public.support_commitments(household_id, status, submitted_at desc);

create index if not exists support_commitments_email_created_idx
  on public.support_commitments(lower(email), created_at desc);

create or replace function public.set_support_commitments_updated_at()
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

drop trigger if exists set_support_commitments_updated_at on public.support_commitments;

create trigger set_support_commitments_updated_at
  before update on public.support_commitments
  for each row
  execute function public.set_support_commitments_updated_at();

alter table public.support_commitments enable row level security;

revoke all on table public.support_commitments from anon;
revoke all on table public.support_commitments from authenticated;

grant insert on table public.support_commitments to anon;
grant insert on table public.support_commitments to authenticated;
grant select, update on table public.support_commitments to authenticated;

drop policy if exists "Public can submit support commitments" on public.support_commitments;

create policy "Public can submit support commitments"
  on public.support_commitments
  for insert
  to anon, authenticated
  with check (
    status = 'pending_giving_setup'
    and completed_at is null
    and source in ('missionary_profile', 'general_support_page')
    and gift_type in ('monthly', 'one_time')
    and length(trim(first_name)) > 0
    and length(trim(last_name)) > 0
    and position('@' in email) > 1
  );

drop policy if exists "Admins can read support commitments" on public.support_commitments;

create policy "Admins can read support commitments"
  on public.support_commitments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  );

drop policy if exists "Admins can update support commitments" on public.support_commitments;

create policy "Admins can update support commitments"
  on public.support_commitments
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
    and status in ('pending_giving_setup', 'active', 'incomplete', 'cancelled', 'needs_follow_up')
  );

comment on table public.support_commitments is
  'Public donor support intent records. Pending Giving Setup does not update public support progress; only Active confirmed monthly commitments should be reconciled into monthly committed totals.';

comment on column public.support_commitments.status is
  'Donor intent reconciliation status: pending_giving_setup, active, incomplete, cancelled, or needs_follow_up.';

comment on column public.support_commitments.submitted_at is
  'Public form submission timestamp. This is separate from completed_at because the giving platform confirms actual giving later.';;
