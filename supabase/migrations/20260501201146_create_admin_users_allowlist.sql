create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create unique index if not exists admin_users_email_lower_unique
  on public.admin_users (lower(email));

alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon;
revoke all on table public.admin_users from authenticated;
grant select on table public.admin_users to authenticated;

drop policy if exists "Admins can read their own allowlist row" on public.admin_users;
create policy "Admins can read their own allowlist row"
  on public.admin_users
  for select
  to authenticated
  using (
    lower(email) = lower(((select auth.jwt()) ->> 'email'))
  );
