# Supabase migration ledger (USA-279)

`production.tsv` is a read-only snapshot of production
`supabase_migrations.schema_migrations` (project `dbupuphezeqkiolprrlg`),
captured 2026-09-29. `npm run check:migrations` compares `supabase/migrations`
with it on every CI run.

## What the check enforces

- No rollback file in `supabase/migrations`. Rollbacks live in `supabase/rollbacks`.
  The Supabase CLI and GitHub integration treat every `.sql` file there as a
  forward migration, so `db push` would apply a migration and then its rollback.
- No two files share a version.
- A migration recorded in production keeps the recorded version. Renumbered copies
  would be pushed a second time.
- Every rollback has a forward migration.

`node scripts/supabase-migration-drift-check.mjs --live` (needs
`SUPABASE_DB_URL` and `psql`) also fails when the snapshot no longer matches
production. Add `--write-snapshot` to refresh it after an approved apply.

## State after this change

- 162 forward migrations, 109 production ledger rows.
- 101 repo files match a production version.
- **61 repo files are not in the production ledger.** All are older than the latest
  applied version, so `supabase db push` would try to apply them. **Do not run
  `supabase db push` until this list is resolved.**
  - **58 pre-ledger files (May to July 2026).** They were applied out-of-band or
    superseded before the ledger was kept. Each needs an object check against
    production. Then either record it with
    `supabase migration repair --status applied <version>`, or move it to an
    archive if it was superseded.
  - `20260811225500_dos_guided_resource_progress_assignment_instances.sql`:
    **applied but unrecorded**. Index
    `dos_guided_resource_progress_assignment_session_unique` exists in production.
  - `20260810120000_dos_group_location_and_recurrence.sql`: **not applied**.
    `dos_groups.location_label`, `location_address`, `recurrence_effective_date`
    and `recurrence_end_date` are missing. The settings route falls back to
    `dos_groups.settings` JSON, so values are kept there.
  - `20260911160000_dos_group_gathering_covered_journey.sql`: **not applied**.
    `dos_group_gatherings.covered_summary`, `journey_resource_slug` and
    `journey_session_id` are missing. The gatherings route detects this and
    **drops** the covered/journey fields, so that input is lost today.
- **8 production rows have no repo file.** Four are early rows whose repo files
  carry different names (financial intake, support commitments, form
  submissions, aligned insights). Four are later rows applied without a
  committed file: `communications_resend_subscribers`,
  `usa_174_pco_donation_id_unique_constraint`,
  `usa_247_circle_placements_revoke_anon`, and a second identical record of
  `dos_resource_share_assignments` (`20260916200606`).

## Proposed repair, in order (each step needs founder approval; none has run)

1. Merge this change, so no rollback file is left in `supabase/migrations`.
2. Apply the two additive, idempotent migrations (`add column if not exists`)
   with `apply_migration`: `20260911160000` and `20260810120000`. Rename each
   file to the version production records. Refresh the snapshot.
3. Record `20260811225500` with `migration repair --status applied`. Its index
   already exists.
4. Check objects for the 58 pre-ledger files. Record the ones that exist, and
   archive the superseded ones in a reviewed PR.
5. Optionally, commit the four production-only statements so a clean
   environment can be rebuilt (USA-186).

Rollback files are never applied automatically. See `supabase/rollbacks/README.md`.
