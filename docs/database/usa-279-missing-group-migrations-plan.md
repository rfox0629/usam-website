# USA-279: apply the two migrations production never received

Status: **plan only. Nothing here has been run against production.** Applying
needs founder approval of the production schema change.

## What is missing

| Order | Migration | Adds | Impact today |
|---|---|---|---|
| 1 | `20260911160000_dos_group_gathering_covered_journey.sql` | `dos_group_gatherings.covered_summary`, `journey_resource_slug`, `journey_session_id` (text, nullable) | The gatherings route detects the missing columns and **drops** "what we covered" and the Journey link when a leader completes a gathering. That input is lost. 12 gatherings exist; 2 were created after the feature shipped on 2026-09-11. |
| 2 | `20260810120000_dos_group_location_and_recurrence.sql` | `dos_groups.location_label`, `location_address` (text); `recurrence_effective_date`, `recurrence_end_date` (date), all nullable | The settings route stores these in `dos_groups.settings` JSON instead (2 of 3 groups use it), so **nothing is lost**. |

Both migrations are additive and idempotent (`add column if not exists`). They
have no defaults, no constraints, no backfill, no data change, and no RLS change.

## Compatibility

- **Gatherings**: the route writes the Journey columns first and falls back only
  on a missing-column error (`isMissingJourneyColumn`). Once the columns exist,
  the first write succeeds. No code change or deploy is needed.
- **Groups**: reads use `column ?? settings` (`groupLocationLabel` and siblings),
  so existing values in `settings` keep showing until a group is saved again.
  No backfill is needed.
- **PostgREST**: production has the `pgrst_ddl_watch` event trigger, so the API
  sees new columns without a manual reload. `20260810120000` also notifies
  `pgrst` explicitly.

## Evidence (2026-09-29, local only)

Rehearsed on `usam_migration_rehearsal`, a local restore of backup
`usam-website-db-2026-09-29-20260929T090720` (141/141 tables, 230/230
policies). The database was dropped afterwards.

1. Both migrations applied cleanly, and a second apply was a no-op (idempotent).
2. Row counts were unchanged (12 gatherings, 3 groups), and all 7 columns
   were present.
3. Both rollbacks ran. The group rollback copied a test `location_label` and
   `recurrence_end_date` back into `settings` before dropping the columns.
4. Re-applying after the rollbacks succeeded.

## Backup and rollback

- **Backup**: take a fresh verified backup immediately before applying:
  `~/Code/usam-automation/backup/bin/usam-backup.sh --skip-offsite`, then
  `usam-restore.sh --latest` (must report PASSED).
- **Rollback files**: `supabase/rollbacks/20260911160000_dos_group_gathering_covered_journey_rollback.sql`
  and `supabase/rollbacks/20260810120000_dos_group_location_and_recurrence_rollback.sql`.
  The group rollback preserves values by copying them into `settings` first.
  The gathering rollback discards any covered/journey text written after the
  apply, so export those three columns first if it ever has to run.

## Apply sequence (after approval)

Prerequisite: #205 is merged, so there are no rollback files in `supabase/migrations`.

1. Take the fresh backup and verify the restore (above).
2. `apply_migration` with the exact contents of `20260911160000_dos_group_gathering_covered_journey.sql`,
   named `dos_group_gathering_covered_journey`.
3. Verify, read-only:
   ```sql
   select column_name from information_schema.columns
   where table_schema = 'public' and table_name = 'dos_group_gatherings'
     and column_name in ('covered_summary', 'journey_resource_slug', 'journey_session_id');
   -- expect 3 rows
   ```
4. In production DOS, complete a test gathering with "covered" text, then reload
   it and confirm the text persisted. Use a leader-owned test group, not a
   real member's group.
5. `apply_migration` with the exact contents of `20260810120000_dos_group_location_and_recurrence.sql`,
   named `dos_group_location_and_recurrence`. Verify its 4 columns the same way.
   Open a group's settings, save, and reload.
6. Rename both files in `supabase/migrations` (and their rollbacks) to the
   versions production recorded. Refresh the snapshot with
   `node scripts/supabase-migration-drift-check.mjs --live --write-snapshot`.
   Commit in a follow-up PR. `npm run check:migrations` must pass.

Do not run `supabase db push` at any step.
