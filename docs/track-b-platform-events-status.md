# Track B: Platform Events Foundation — Preservation Status

This branch is intentionally **not merged into `main`** and must not be deployed to
production or have its migration applied to the production Supabase database.

## Location

- **Branch:** `ncc-phase0-track-a-b`
- **Commit:** `53b86d1198b406d6b4924c88cc2d048de644b14d` ("Add minimal platform_events
  foundation for missionary applications and major gifts")
- **Parent commit:** `35582214` (Track A, already released separately via
  `release/dos-group-notifications` → `main`)

## What it contains

- `supabase/migrations/20260710190000_platform_events_foundation.sql` — creates the
  append-only `platform_events` table (RLS enabled, anon/authenticated revoked,
  service_role granted all), mirroring the existing `prayer_logs` migration pattern.
- `src/lib/events/record-event.ts` — `recordEvent()`, `recordNotificationResult()`,
  `resolveUsamOrganizationId()`. These never throw; a missing table or misconfigured
  organization causes a logged no-op, not a caller-visible failure.
- Call sites wired into `app/api/join/submit/route.ts` and
  `app/api/major-gift-inquiries/route.ts`, both guarded so event recording happens
  only after the primary write already succeeded and can never affect the response.
- `scripts/platform-events-regression.mjs` (static source-text assertions only —
  confirms the call sites exist, are ordered after the primary write, and that the
  payload for `major_gift_inquiry.submitted` stays empty).

## Exact database requirement

The `platform_events` table, matching the migration's schema exactly, must exist in
whatever Supabase project the code runs against. Without it, `recordEvent()` and
`recordNotificationResult()` catch the resulting Postgres error internally and log a
warning — they do not throw, so the request-handling code path is unaffected, but no
event rows are ever written and the entire feature is silently inert.

## Why this is not in production

1. The migration has never been applied to the production Supabase database (or any
   database) and has not been tested against a real Postgres instance — only
   validated by static regression scripts that read source files as text.
2. The user explicitly instructed that this migration must not be applied to
   production during this task.
3. Track A and Track B were deliberately kept on independently revertible commits
   specifically so Track A could ship without waiting on Track B's review.

## What must happen before this can release

An end-to-end test against a database that actually has the migration applied:

1. Apply `20260710190000_platform_events_foundation.sql` to a real (non-production)
   Postgres/Supabase instance.
2. Submit a real missionary application through `/api/join/submit` and a real major
   gift inquiry through `/api/major-gift-inquiries` against that instance.
3. Confirm a `platform_events` row lands for each with the expected `event_type`,
   `subject_id`, `subject_type`, and `organization_id` (via
   `resolveUsamOrganizationId()`).
4. Confirm the `*.notification_attempted` follow-up event records the correct
   `notificationStatus` for both a successful and a skipped/failed send.
5. Confirm re-submitting the same logical event does not produce duplicate rows
   (dedupe behavior), and confirm RLS actually blocks anon/authenticated reads while
   allowing service_role writes.
6. Re-run `npm run test:platform-events`, `tsc`, and a production build on top of the
   already-released Track A `main` to confirm no drift before merging.

## Recommended staging approach

**Vercel Preview does not provide database isolation for this project** — preview
deployments here use the same production Supabase project as production, so a
preview deployment is not a safe place to apply this migration or exercise it
end-to-end.

There is currently no isolated Supabase staging environment for this repository.
That absence is a blocker for safely completing the end-to-end test above. The
smallest practical fix is one of:

- Create a second, genuinely separate Supabase project (free tier is sufficient for
  this table's testing needs) and point a Vercel Preview environment's env vars at
  it, or
- Use Supabase's branching feature (if available on the current plan) to get an
  isolated database copy scoped to this PR/branch.

Either way, the migration should be applied and tested there — never directly
against the production project — before this branch is considered for merge.
