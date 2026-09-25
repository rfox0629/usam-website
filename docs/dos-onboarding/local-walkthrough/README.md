# Local walkthrough harness (USA-289)

Test tooling only. It is never deployed. It reproduces the evidence in `../evidence/` without touching production.

1. Start Postgres 16 and create a database. Load `stubs.sql`, which stands in for Supabase's roles and its `auth` and `storage` schemas. Then load every non-rollback file in `supabase/migrations/` in order.
2. Run PostgREST 12 against it with `db-schemas = "public,auth"` on port 3001, and a `jwt-secret` of 32 or more characters.
3. `JWT_SECRET=... node gateway.mjs` serves `/rest/v1`, which proxies to PostgREST, and `/auth/v1`, a minimal Supabase Auth stub, on port 54321.
4. `JWT_SECRET=... node keys.mjs > keys.env` writes the anon and service keys. Build and start the app with those keys, `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, and no `RESEND_API_KEY`.
5. Seed a reviewer in `admin_users` and set passwords via `POST /auth/v1/__password`. Then run `visitor.mjs`, `operations.mjs`, `signin-signout.mjs`, and `new-user-first-open.mjs` from the repo root.

All people and emails are synthetic (`*.usa289@localtest.dev`).
