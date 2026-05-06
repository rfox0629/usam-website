create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users
  add column if not exists email text,
  add column if not exists role text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

update public.admin_users
set role = 'admin'
where role is null
  or role not in ('admin', 'editor', 'viewer');

update public.admin_users
set is_active = true
where is_active is null;

alter table public.admin_users
  alter column email set not null,
  alter column role set not null,
  alter column role set default 'viewer',
  alter column is_active set not null,
  alter column is_active set default true;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'admin_users_role_check'
      and conrelid = 'public.admin_users'::regclass
  ) then
    alter table public.admin_users
      drop constraint admin_users_role_check;
  end if;

  alter table public.admin_users
    add constraint admin_users_role_check
    check (role in ('admin', 'editor', 'viewer'));
end $$;

create unique index if not exists admin_users_email_lower_unique
  on public.admin_users (lower(email));

create index if not exists admin_users_active_role_idx
  on public.admin_users (is_active, role);

alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon;
revoke all on table public.admin_users from authenticated;
grant select on table public.admin_users to authenticated;

drop policy if exists "Admins can read their own allowlist row" on public.admin_users;
drop policy if exists "Active admins can read their own allowlist row" on public.admin_users;
create policy "Active admins can read their own allowlist row"
  on public.admin_users
  for select
  to authenticated
  using (
    is_active = true
    and lower(email) = lower(((select auth.jwt()) ->> 'email'))
  );

comment on table public.admin_users is
  'Supabase Auth allowlist and basic role permissions for the USA Missionaries admin dashboard.';
