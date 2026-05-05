create extension if not exists pgcrypto;

alter table public.missionary_support_settings
  add column if not exists monthly_giving_url text,
  add column if not exists one_time_giving_url text,
  add column if not exists monthly_button_label text not null default 'Support Monthly',
  add column if not exists one_time_button_label text not null default 'Give One Time',
  add column if not exists major_gift_button_label text not null default 'Contact About Major Gift',
  add column if not exists enable_major_gift_inquiry boolean not null default true,
  add column if not exists major_gift_notify_email text not null default 'ryan@usamissionaries.org',
  add column if not exists major_gift_public_description text;

create table if not exists public.major_gift_inquiries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.missionary_households(id) on delete set null,
  household_name text,
  profile_slug text,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  donation_types text[],
  projected_amount_range text,
  intended_for text,
  message text,
  best_time_to_contact text,
  consent_to_contact boolean not null default false,
  status text not null default 'new',
  source text not null default 'missionary_profile',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint major_gift_inquiries_status_check check (
    status in ('new', 'reviewed', 'contacted', 'closed', 'archived')
  )
);

create index if not exists major_gift_inquiries_status_created_idx
  on public.major_gift_inquiries(status, created_at desc);

create index if not exists major_gift_inquiries_household_idx
  on public.major_gift_inquiries(household_id, created_at desc);

create or replace function public.set_major_gift_inquiries_updated_at()
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

drop trigger if exists set_major_gift_inquiries_updated_at on public.major_gift_inquiries;
create trigger set_major_gift_inquiries_updated_at
  before update on public.major_gift_inquiries
  for each row
  execute function public.set_major_gift_inquiries_updated_at();

alter table public.major_gift_inquiries enable row level security;

revoke all on table public.major_gift_inquiries from anon;
revoke all on table public.major_gift_inquiries from authenticated;

grant insert on table public.major_gift_inquiries to anon;
grant insert on table public.major_gift_inquiries to authenticated;
grant select, update on table public.major_gift_inquiries to authenticated;

drop policy if exists "Public can submit major gift inquiries" on public.major_gift_inquiries;
create policy "Public can submit major gift inquiries"
  on public.major_gift_inquiries
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and source = 'missionary_profile'
    and consent_to_contact = true
    and length(trim(first_name)) > 0
    and length(trim(last_name)) > 0
    and position('@' in email) > 1
  );

drop policy if exists "Admins can read major gift inquiries" on public.major_gift_inquiries;
create policy "Admins can read major gift inquiries"
  on public.major_gift_inquiries
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

drop policy if exists "Admins can update major gift inquiries" on public.major_gift_inquiries;
create policy "Admins can update major gift inquiries"
  on public.major_gift_inquiries
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
    and status in ('new', 'reviewed', 'contacted', 'closed', 'archived')
  );
