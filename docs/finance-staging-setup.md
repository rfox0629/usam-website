# Finance & Compliance Staging Setup

**Status: blocked on Ryan creating the staging environment.** This session has no
Supabase management-API token, no Docker (so no local `supabase start`), and no
linked CLI project (`supabase/config.toml` doesn't exist) — so none of the options
below can be self-served from here. This doc is what to do, and what to hand back.

## What I investigated

- Supabase CLI is installed (`2.104.0`) but this repo has never run `supabase link`.
- Docker is unavailable in this environment, so a fully local Postgres via
  `supabase start` isn't possible here.
- No `SUPABASE_ACCESS_TOKEN` is set, so the CLI/Management API can't check the
  project's plan tier or create a branch/project on your behalf.
- Per Supabase's current pricing page, **database branching requires Pro plan or
  above**, plus $0.01344/branch/hour (~$9.67/mo if left running continuously) — not
  available on Free.

## What to create

### Option A — Supabase database branch (if `usam-website` is on Pro or above)

1. Supabase dashboard → the `usam-website` project → **Branches** (left nav, under
   the project, or via the GitHub integration panel).
2. Create a branch named something like `ncc-finance-staging`, based on `main`'s
   current schema.
3. Supabase gives the branch its own project URL, anon key, and service-role key —
   copy all three (see "What to hand back" below).

### Option B — Separate free-tier staging project (works on any plan)

1. Supabase dashboard → **New project**. Name it something like
   `usam-website-staging`. Any region is fine; it doesn't need to match production.
2. Once created, copy its **Project URL**, **anon/publishable key**, and
   **service_role key** (Project Settings → API).
3. This project starts with an empty schema — every existing migration
   (`supabase/migrations/*.sql`, 121+ files) needs to run there before the two new
   ones, not just the two new ones in isolation, since the app queries tables from
   the full schema (e.g. `admin_users`, `organizations`) even on pages that don't
   look finance-related. The Supabase CLI can do this in one shot: from a machine
   with Docker (this one doesn't have it) or via the dashboard's SQL editor running
   `supabase db diff`/migration files in order.

**Either option works for what's being tested here.** Option A is closer to "real"
in dashboard terms (linked to this project's history) but costs more and needs a
plan check first. Option B is simpler to reason about and free, at the cost of
needing the full migration history applied once.

## What to hand back

Three values, from whichever option you create:

- Staging Project URL (e.g. `https://xxxxxxxx.supabase.co`)
- Staging anon/publishable key
- Staging service-role key

Hand these back through a channel you're comfortable with — not pasted directly
into chat if you'd rather not have it in the conversation log. I'll wire them into
Vercel's **Preview** environment only, per the env var plan below, and will not
place the service-role key in any `NEXT_PUBLIC_`-prefixed variable or anywhere
reachable from the browser.

## Exact Vercel environment-variable plan

Vercel already separates variables by environment (Production / Preview /
Development) — the fix here is scoping, not new infrastructure.

| Variable | Production (unchanged) | Preview (change) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | production project URL | staging project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | production anon key | staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | production service-role key | staging service-role key |

Steps once staging credentials exist:

1. Vercel dashboard → `usam-website` project → **Settings → Environment
   Variables**.
2. For each of the three variables above, add a **Preview**-scoped value (Vercel
   lets one variable name hold different values per environment) using the
   staging project's credentials. Leave every existing **Production**-scoped value
   untouched.
3. Redeploy the `ncc-overhaul-phase1` preview (or any preview branch) — it will
   now read from staging automatically; production continues reading from
   production because its env scope wasn't touched.
4. Confirm via a read-only check (e.g. the NCC Home counts, which query several
   tables) that the preview is actually hitting staging, not production, before
   running any write test.

**Never** add these as unscoped ("all environments") variables — that would make
Preview and Production share one database again, defeating the isolation this
whole exercise exists to create. Each of the three rows above must be added
*Preview-only*.

## After credentials are in place

Once staging exists and Preview is pointed at it, the actual test plan is in
[docs/finance-migration-test-plan.md](finance-migration-test-plan.md) — this file
only covers getting the environment stood up.
