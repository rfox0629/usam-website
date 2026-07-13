# Finance Permission Model

Real, organization-scoped Finance access — independent of the global
`admin_users` role model. Built, migration not applied to any database yet.

## Why not extend `organization_memberships`?

You asked me to challenge the table name/design if a cleaner extension point
already existed. I checked. `organization_memberships`
(`supabase/migrations/20260507162211_dos_foundation_schema.sql`) was the
obvious candidate — it already has `organization_id` scoping. It's the wrong
foundation for this, for three concrete reasons:

1. **It's keyed to `profiles`, the DOS/collective identity model** — not
   `admin_users`/Supabase Auth email, which is how `/admin` and `/ncc`
   actually authenticate today. Finance is an NCC/admin-side department.
   Reusing it would mean giving an external accountant a DOS profile they
   have no other reason to hold.
2. **Its role vocabulary is a fixed check constraint**
   (`owner`/`admin`/`leader`/`member`) with no room for `finance_owner` /
   `accountant` / `bookkeeper` / `treasurer_readonly` without either
   altering a constraint shared with DOS collectives or overloading
   `member` to mean four different things.
3. **Zero RLS policy anywhere in the schema actually scopes data by it** —
   it's not a proven authorization mechanism today, just a table with the
   right-shaped columns.

`finance_team_members` is purpose-built instead: keyed on `email` (matching
`admin_users.email` and the Supabase Auth JWT `email` claim directly, the
same identity anchor already proven by `admin_users`'s own "read your own
row" RLS policy), with `organization_id` scoping and a `finance_role` check
constraint matching exactly the four roles you specified.

## Schema

```sql
create table public.finance_team_members (
  id uuid primary key,
  organization_id uuid references organizations(id),
  email text not null,
  finance_role text check (in finance_owner/accountant/bookkeeper/treasurer_readonly),
  invited_by text not null,
  invited_at timestamptz not null,
  accepted_at timestamptz,
  disabled_at timestamptz,
  last_access_at timestamptz,
  unique (organization_id, email)
);
```

RLS: `revoke all from anon, authenticated`, then one `select` policy letting
an authenticated user read their own non-disabled row — mirrors
`admin_users`'s own policy exactly
(`supabase/migrations/20260506121842_admin_access_permissions.sql`). This
means `getFinanceTeamAuthorization()` reads via the session-bound
(cookie/anon-key) client, so the read is genuinely RLS-enforced, not just
checked in application code. All writes (invite/disable/role-change) stay
service-role-only, gated behind the `manage_finance_team` capability.

## How access resolves

`src/lib/finance-auth.ts::resolveFinanceAccess()` is the single entry point:

1. Check `admin_users` first (`getAdminAuthorization()`). If authorized,
   map the global role to an equivalent Finance role
   (`admin`→`finance_owner`, `editor`→`accountant`, `viewer`→`treasurer_readonly`)
   — existing NCC staff need zero re-onboarding.
2. Otherwise, check `finance_team_members`. If authorized there, the
   session gets Finance access **and nothing else** — no `admin_users` row
   exists for them, so `/ncc/layout.tsx` lets them through the front door
   but every non-Finance page (`/ncc/partnerships`, `/ncc/people`, all nine
   "planned" departments, NCC Home) independently calls
   `requireFullNccAccess()` and redirects them to `/ncc/finance`.
3. Otherwise, unauthorized.

This is what "global admin roles are one path in, not the final boundary"
actually means in code: `admin_users` grants Finance access as a side
effect of broader trust already granted elsewhere; `finance_team_members` is
the only path that grants Finance access **and nothing else**.

## Role matrix (as implemented)

| Capability | finance_owner | accountant | bookkeeper | treasurer_readonly |
|---|---|---|---|---|
| Upload/download documents | ✅ | ✅ | ✅ | ❌ |
| View payroll & donor detail | ✅ | ✅ | ❌ | ❌ |
| Import transactions | ✅ | ✅ | ✅ | ❌ |
| Edit transaction categories | ✅ | ✅ | ✅ | ❌ |
| Approve transactions | ✅ | ✅ | ❌ | ❌ |
| Prepare (generate) workpapers | ✅ | ✅ | ✅ | ❌ |
| Approve workpapers | ✅ | ✅ | ❌ | ❌ |
| Edit worksheets & filing fields | ✅ | ✅ | ✅ | ❌ |
| Manage Finance team | ✅ | ❌ | ❌ | ❌ |
| Record filing confirmation | ✅ | ❌ | ❌ | ❌ |
| Mark accountant package ready | ✅ | ❌ | ❌ | ❌ |
| Read scope | full | full | full (minus payroll/donor) | approved + non-sensitive only |

Every row above is enforced in `app/ncc/finance/**/actions.ts` via
`requireFinanceCapability()` — checked server-side before any Supabase call,
never only in the UI. The UI additionally hides/disables what a role can't
do (dropdown options, tabs, nav items), but that's belt-and-suspenders, not
the actual boundary — test #17 in
[docs/finance-migration-test-plan.md](finance-migration-test-plan.md) exists
specifically to prove the server-side check holds even when a client
bypasses the UI's own filtering.

## What's genuinely untested

Nothing in this document has run against a real database. The RLS policy,
the capability checks, and the read-scope filtering are all written but
unverified until staging exists and tests 13–17 run for real.
