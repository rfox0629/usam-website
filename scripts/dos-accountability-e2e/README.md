# Accountability against a real database, end to end

`npm run test:dos` asserts what the source says. This one runs the real route
handlers — the modules under `app/api/dos/app/` — against a real Postgres
carrying this repository's own migrations, and then checks the database
directly to see what actually happened.

It exists because the rules that matter here are rules about stored rows, and
no source assertion can prove them: a rhythm's recorded check-ins must stay on
the person's record when the rhythm is deleted and a goal's own progress must
not; four missed weeks must leave one reminder rather than four catch-up
tasks; a late check-in must advance the rhythm from the day it happened; and a
check-in must never complete a Journey.

## What is real, and what is not

Real: the route modules, `supabase-js`, PostgREST, Postgres, the repository's
migrations, the workspace-access check, the feature-flag gate, the Journey
guards, and the deletes themselves.

Substituted: `getDosAuthorization()` alone, which reads a session cookie and
cannot exist outside a request. `scripts/dos-accountability-e2e/auth-shim.ts`
re-exports the real auth module and replaces that one function; everything it
feeds — `getDosWorkspaceAccess`, `canWriteDosActivity`, the workspace scope
loaders — stays real and still queries the database.

## Running it

Needs the Postgres 16 server binaries (`postgresql-16` on Ubuntu) and a
`postgrest` binary on `PATH` or at `$POSTGREST_BIN`.

```sh
scripts/dos-accountability-e2e/setup.sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55320 \
  SUPABASE_SERVICE_ROLE_KEY=$(cat /var/tmp/usa282-pg/service.jwt) \
  npm run test:dos-accountability-e2e
scripts/dos-accountability-e2e/teardown.sh
```

`setup.sh` creates a throwaway cluster, applies every migration, **asserts the
two foreign-key rules this test depends on** (so a cluster whose schema does
not match the migrations fails loudly instead of verifying a fiction), and
seeds two isolated workspaces. `teardown.sh` removes the cluster entirely.

It is deliberately not part of `npm run test:dos`: that chain runs anywhere
Node does, and this needs a database.

## The data

Everything lives in two workspaces created by `seed.sql`
(`usa282-test-a`, `usa282-test-b`) in a database that exists only for the run.
No real workspace is read or written, and the second workspace is there to
prove a delete asked for in one workspace cannot reach a record in another.

## What it checks

| | |
|---|---|
| Authorization | unauthenticated → 401; signed in without access to the workspace → 403; a record in another workspace → 404, and that record is still there |
| Journeys | a generated growth follow-up → 409; the shadow commitment an assignment carries → 409; both rows survive, and the assignment still points at the commitment |
| A rhythm | the schedule is gone; both recorded check-ins survive, detached (`schedule_id` null); all three of the person's check-ins are still on the record |
| A goal | the goal is gone; its own progress updates go with it; the check-in written beside it stays; nothing else in the workspace is touched |
| Twice | a second delete of the same record reports 404 rather than erroring |
| A missed rhythm | four missed weeks leave **one** outstanding date and no back-filled entries |
| A late check-in | one check-in saved for the day it happened, the next date a cadence step from it and genuinely ahead, the earlier history untouched |
| A back-dated check-in | the rhythm is not left due in the past, and keeps its own weekday |
| One item at a time | checking in on a rhythm leaves that person's goal, other rhythm and Journey follow-up exactly as they were |
| Journeys | a check-in on a growth follow-up changes neither the assignment's status nor its shadow commitment |
