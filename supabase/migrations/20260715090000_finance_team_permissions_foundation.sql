-- Finance-scoped permissions foundation.
--
-- NOT APPLIED to any database as part of this task. Do not apply to production
-- until docs/finance-migration-test-plan.md has been run against a staging
-- environment. Gated in the app layer behind FINANCE_PERMISSIONS_MIGRATION_APPLIED.
--
-- Design note (why this is a new table, not an extension of
-- organization_memberships): organization_memberships
-- (supabase/migrations/20260507162211_dos_foundation_schema.sql) is keyed to
-- public.profiles -- the DOS/collective identity model -- and its role check
-- constraint is a fixed vocabulary (owner/admin/leader/member) with zero RLS
-- policy anywhere in the schema actually scoping data by it. Finance is an
-- NCC/admin-side department, authenticated the same way /admin and /ncc
-- already are (Supabase Auth email, matched against admin_users.email) --
-- not a DOS/ministry-collective concept. Reusing organization_memberships
-- would mean either giving finance-only external accountants a DOS profile
-- they have no other reason to hold, or bolting a second, incompatible role
-- vocabulary onto a table that already has one. A purpose-built table keeps
-- the two identity systems (DOS collectives vs. NCC/admin) cleanly separate,
-- matching how admin_users itself is already a separate table from
-- organization_memberships today.
--
-- The critical design requirement this table exists to satisfy: a person
-- must be able to hold Finance access WITHOUT an admin_users row at all --
-- an external accountant or bookkeeper should never need broad /admin or
-- /ncc access just to touch Finance. So this table is keyed on email
-- (matching Supabase Auth's JWT email claim directly, exactly like
-- admin_users.email), not on admin_users.id.
create table if not exists public.finance_team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  finance_role text not null,
  invited_by text not null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  disabled_at timestamptz,
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_team_members_role_check check (finance_role in (
    'finance_owner', 'accountant', 'bookkeeper', 'treasurer_readonly'
  )),
  constraint finance_team_members_unique unique (organization_id, email)
);

create unique index if not exists finance_team_members_email_lower_unique
  on public.finance_team_members (organization_id, lower(email));

create index if not exists finance_team_members_email_idx on public.finance_team_members (lower(email));

alter table public.finance_team_members enable row level security;

revoke all on table public.finance_team_members from anon;
revoke all on table public.finance_team_members from authenticated;
grant select on table public.finance_team_members to authenticated;

-- Mirrors admin_users' own "Active admins can read their own allowlist row"
-- policy exactly (supabase/migrations/20260506121842_admin_access_permissions.sql):
-- an authenticated user can read their own membership row (needed so
-- getFinanceAuthorization() can resolve a person's role using the normal
-- session-bound client, not the service-role client, and so the read path
-- is genuinely RLS-enforced rather than only checked in application code).
-- All writes (invite/disable/role changes) remain service-role-only, issued
-- through the Manage Finance Team action, itself gated to finance_owner.
drop policy if exists "Finance team members can read their own row" on public.finance_team_members;
create policy "Finance team members can read their own row"
  on public.finance_team_members
  for select
  to authenticated
  using (
    disabled_at is null
    and lower(email) = lower(((select auth.jwt()) ->> 'email'))
  );

comment on table public.finance_team_members is
  'Organization-scoped Finance department access, independent of admin_users -- lets accountants/bookkeepers/treasurers use Finance without broader /admin or /ncc access.';
