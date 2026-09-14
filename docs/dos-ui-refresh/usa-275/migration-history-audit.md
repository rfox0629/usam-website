# USA-275 follow-up — production migration history audit

**Date:** 2026-09-14 · **Project:** `usam-website` (`dbupuphezeqkiolprrlg`) · **Main:** `782036d` (PR #146)

**Outcome.**
- **Audit (§1–§4).** The audit stopped before any production mutation. §1–§4 describe the state before the apply and come from read-only catalog queries and git.
- **Follow-up (§5).** After Ryan confirmed *Deploy to production* was off, **only** USA-275 was applied, as version `20260914183331`, on 2026-09-14.
- **Not done.** No `migration repair`, push, reset or other migration was run, and no existing data was changed.

The per-version evidence is in [`migration-history-matrix.csv`](./migration-history-matrix.csv). Its USA-275 rows reflect the apply.

## 1. What the failing check is

- **The check.** `Supabase Preview` is the Supabase GitHub integration. Its production branch record reads `main` (`is_default: true`, `git_branch: main`), status **`MIGRATIONS_FAILED`**, created 2026-07-27. On push to `main` it compares `supabase/migrations` with `supabase_migrations.schema_migrations`, then applies whatever it considers pending.
- **How long it has failed.** It has failed with `Remote migration versions not found in local migrations directory.` on every main commit checked back to 2026-09-07 (40 commits). A few commits were `skipped`, and one hit a 502. It is **not** new with #146, and it has never deployed a migration during that period.
- **It is not required.** Branch protection requires only `Typecheck, build, and smoke`.
- **How production actually gets migrated.** Every production migration since May has been applied directly with Supabase MCP `apply_migration`. Those rows have `created_by = ryan@usamissionaries.org`, a single statement, and a version stamped at apply time rather than the file's timestamp. This is why most versions differ from the filenames.
  - 38 older rows were applied by the CLI (`created_by` null, multi-statement).
  - One row is a prior history repair: USA-167, `created_by = codex-usa-167-production-rollout`, no statements.
  - Git shows two earlier local renames to match production: `f5d007a` and `5218e71`.

## 2. Exact comparison (production ledger vs `origin/main`)

| | Count |
|---|---:|
| Production recorded versions | 96 |
| Local files / distinct local versions | 160 / 152 (8 versions shared by a migration and its `_rollback.sql`) |
| Same version in both | 45 |
| Production-only versions | 51 |
| Local-only files | 71 |

### Production-only versions (51)

| Class | Count | Evidence |
|---|---:|---|
| Same name, different version, **identical SQL** | 22 | md5 of whitespace-stripped ledger SQL = local file |
| Same name, different version, identical after removing comments/semicolons | 14 | normalized md5 equal |
| Same name, different version, **SQL differs** | 8 | `create_admin_users_allowlist`, `create_financial_freedom_inquiries`, `optimize_admin_rls_policies`, `add_financial_freedom_consent_fields`, `usa_174_pco_giving_import`, `usa_174_map_pco_general_fund`, `usa_180_pco_people`, `usa_247_circle_placements` (ledger 10,899 chars vs file 15,086) |
| **No file on main** — exact SQL recoverable from the ledger's `statements` column | 7 | `create_support_commitments_for_donor_intake`, `restore_form_submissions_inbox`, `build_financial_intake_system`, `create_aligned_insights_inquiries` (last seen only in git `03de016`), `communications_resend_subscribers` (on rescue branches), `usa_174_pco_donation_id_unique_constraint`, `usa_247_circle_placements_revoke_anon` |

Among the 45 shared versions, one (`dos_groups_simplification_shared_leadership`) also has different SQL, although all 27 of its objects exist.

### Local-only files (71)

| Class | Files |
|---|---|
| `_rollback.sql` files the CLI treats as migrations | 7 (`usa_246` ×3, `usa_247`, `dos_person_feedback_import`, `dos_group_gathering_covered_journey`, `usa_275`). Each shares its version with its forward migration (the eighth shared version is `operations_communications_newsletter_workflow` / `usa_168_explicit_count_progress`). They contain `drop table` / `drop function` / `drop column`. |
| Every object present | 41, e.g. `missionary_tables_encounters_fruit_pipeline`, `align_missionary_field_people`, `dos_relationship_stewardship_model` |
| **Not applied at all** (0 objects present) | `20260501223000_create_prayer_command_center`, `20260504163724_missionary_images_storage_bucket` (storage policies absent), `20260513143000_missionary_profile_page_views`, `20260513151500_support_experience_flow_settings`, `20260625175625_dos_ministry_event_model` (37 objects, includes `delete from` / `update`), `20260702194002_dos_table_discipleship_roles`, `20260810120000_dos_group_location_and_recurrence`, `20260911160000_dos_group_gathering_covered_journey` (awaiting founder authorization), `20260913180000_usa_275_discipleship_connections` |
| Partially present | `prayer_team_system` 12/22, `support_major_gift_system` 12/16, `form_submissions_prayer_operations` 43/49, `expand_prayer_team_operations_hub` 42/46, `ensure_prayer_team_tables` 58/60, `missionary_workspace_mvp_meeting_types` 2/4, `dos_guided_resource_progress` 8/10 |
| Data-only (nothing to probe) | `seed_ryan_fox_team_members`, `global_team_public_numbers`, `reserve_team_public_number_0001` (`delete from`), `renumber_ryan_brooke_household_people`, `guard_explicit_dos_fruit_sources` (`delete from`), `sync_missionary_household_visibility`, `align_dos_review_link_type` |

### USA-275 objects in production

None exist:
- tables `dos_discipleship_connections`, `dos_discipleship_account_connections`, `dos_discipleship_identity_matches`
- trigger `dos_discipleship_connections_scope_guard` and function `private_dos.dos_discipleship_connection_scope_guard`
- function `public.dos_discipleship_readable_workspaces`
- the 11 indexes and all constraints

Nothing partial exists, so there is no RLS, grant or revoke state to inspect yet. All dependencies are present: `missionary_field_people.{workspace_id,household_id,role_in_my_life,status}`, `missionary_households`, `dos_identity_links.*`, `fruit_events`, `private_dos` schema, `pgcrypto`. No name collisions. Default privileges grant `anon`/`authenticated` full rights on new public tables, which the migration explicitly revokes.

Baseline advisors before any change:
- security: 19 `rls_enabled_no_policy` INFO, 1 leaked-password WARN
- performance: `unindexed_foreign_keys` 81, `auth_rls_initplan` 8, `unused_index` 136, `multiple_permissive_policies` 32, `duplicate_index` 1

## 3. Why the requested reconciliation cannot be done safely as specified

The error only names production-only versions. Clearing it by restoring or renaming those 51 files would let the integration's **Deploy to production** step run every local-only file as pending on the next push to `main`. That includes:

1. **Seven `_rollback.sql` files.** These would drop `dos_circle_placements` / `dos_circle_placement_batches` and the booking functions, remove the planned-meeting columns, and more. Duplicate versions would also collide.
2. **Nine never-applied migrations,** among them the ministry-event model with `delete from` / `update` statements and the founder-gated gathering Journey columns.
3. **Data rewrites:** team-member seeding and renumbering, `reserve_team_public_number_0001`, and fruit-source deletes.

The alternative, `supabase migration repair --status applied`, is only defensible for files whose objects all exist. It would still be wrong for the not-applied, partial, data-only and 9 content-different cases. The USA-100 plan (2026-07-30) lists these stop conditions: a same-name migration with different SQL, and no verified restore test before any ledger repair. Both hold today.

## 4. Proposed reconciliation (for approval — nothing executed)

**Phase R0 — immediate, dashboard, no SQL.** Turn off the integration's *Deploy to production* for `main` until R1–R3 land. Today the failing comparison is the only thing preventing items 1–3 above.

**Phase R1 — repository only, no database effect.**
1. Move the seven `_rollback.sql` files to `supabase/rollbacks/`, and update the references to their paths:
   - five regression scripts: `dos-multiplication`, `dos-booking-write-path`, `dos-meeting-planned-actual`, `dos-people-experience-correction`, `dos-circle-placement`
   - four docs: `usa-247/placement-migration-and-rollback.md`, `usa-246/booking-write-path-plan.md`, `usa-246/migration-plan-planned-vs-actual.md`, `usa-275/README.md`
2. Rename the 36 identical same-name files to their production versions, following the precedent of `f5d007a` and `5218e71`.
3. Restore the 7 missing files byte-for-byte from `schema_migrations.statements`, under their production versions.

**Phase R2 — review, founder decision per item.**
- The 9 content-different pairs: diff each against the ledger SQL and against the live catalog. Keep the ledger SQL as the versioned file; carry the extra local SQL forward only as a new, reviewed migration.
- The 9 not-applied and 7 partial files: for each, either archive it to `supabase/migrations-archive/` or re-author the still-wanted parts as new migrations.
- The 7 data-only files: archive them. Their data effects are already history.

**Phase R3 — ledger, after USA-86 backup + restore test.** Run `supabase migration repair --status applied <version>` only for local files whose objects were proven present and whose SQL is unchanged. Record every version in the PR. Target: `supabase migration list` shows local = remote, with USA-275 the only pending entry.

**Phase R4 — apply USA-275.**
- Option (a): re-enable Deploy to production and let the integration apply exactly one pending migration.
- Option (b): if R1–R3 are not wanted now, use the established path (`apply_migration`). Then rename the local file to the recorded version, as `5218e71` did. The integration check stays red, as it has been since July.

Rollback for R1: revert the PR. Rollback for R3: `migration repair --status reverted <version>` for exactly the repaired versions; ledger only, no SQL. Rollback for USA-275: `supabase/rollbacks/20260914183331_usa_275_discipleship_connections_rollback.sql` (moved there 2026-09-14; see §5).

## 5. Focused USA-275 application (2026-09-14, founder-approved path R4b)

**Preconditions**
- Ryan confirmed the integration's *Deploy to production* is **off**.
- Immediately before applying, a re-check showed nothing `dos_discipleship*` existed and the ledger still held 96 versions, latest `20260910151053`.
- Dependencies were all present, and the file was byte-identical to `782036d` (md5 `40b86bb5576bf788361d24d3775f3bae`).

**Applied once** with Supabase MCP `apply_migration`:

| Field | Value |
|---|---|
| Recorded version | `20260914183331` |
| Recorded name | `usa_275_discipleship_connections` |
| Created by | `ryan@usamissionaries.org` |
| Statements | 1 |
| Recorded SQL | whitespace-stripped md5 `37db79c76d85513052c69a4753f63e3b`, equal to the local file |

The ledger now holds 97 versions. No other migration was applied, repaired or marked.

**Verified after applying**
- **Objects.** All 17 objects exist: 3 tables, 11 named indexes plus 3 primary keys, trigger `dos_discipleship_connections_scope_guard`, and functions `private_dos.dos_discipleship_connection_scope_guard` and `public.dos_discipleship_readable_workspaces`. Each new table holds 0 rows.
- **Table access.** RLS is enabled on all three tables, with no policies and no forced RLS. The table ACL is `postgres` + `service_role` only.
- **Behavioural role test** (single `DO` block, rolled back):
  - anon and authenticated are denied `SELECT` and `INSERT` on all three tables, and denied `EXECUTE` on the traversal function;
  - service_role can read and execute;
  - a service_role insert with fabricated IDs is rejected by the scope guard (`23514 mentor person is not in workspace`).
- **API check.** An anon REST request to each table and to the RPC returns `401 42501`. Before the apply, the app's probes got 404.
- **Functions.** The traversal function is `SECURITY INVOKER`, `STABLE`, `search_path=""`, executable only by service_role. The trigger function is `SECURITY DEFINER`, `search_path=""`, with no EXECUTE for any client role; triggers do not need it.
- **Structure.** Foreign keys match the file: 5 on connections, 7 on account connections, 6 on identity matches, with the declared `ON DELETE` actions. The 5 + 4 + 3 check constraints and the partial unique indexes are exactly as written.
- **Existing data unchanged.** `missionary_field_people` 126, `missionary_households` 5, `dos_identity_links` 44, `fruit_events` 41, `missionary_tables` 74, `dos_circle_placements` 26. The only movement is a `max(updated_at)` change on `missionary_field_people` / `missionary_tables` at 18:27 UTC. That was a DOS page load, which touches the viewer Person; it happened before the 18:33:31 apply.
- **Logs.** Postgres logs show only the apply and the deliberate verification exception. Vercel shows no runtime errors in the two hours around the apply.

**Advisors, compared with the same-day baseline**

| Advisor | Before | After | Change |
|---|---|---|---|
| Security | `rls_enabled_no_policy` 19 INFO, 1 WARN | 22 INFO, 1 WARN | +3 |
| Performance | 258 findings | 275 findings | +17 |

- **Security, +3.** One `rls_enabled_no_policy` INFO for each new table. This is intended: the tables are service-role only, the same posture as `dos_person_merge_log`. No new WARN.
- **Performance, +8 `unused_index` INFO.** New indexes on empty tables. Expected.
- **Performance, +9 `unindexed_foreign_keys` INFO.** Audit columns referencing `auth.users` (`created_by_user_id`, `updated_by_user_id`, `invited_by_user_id`, `revoked_by_user_id`, `decided_by_user_id`, `undone_by_user_id`), plus `disciple_workspace_id`, `identity_link_id` and `matched_workspace_id`. These tables are empty and written only by the service role, so there is no present impact. Covering indexes would need a **new** migration, which this focused change is not authorised to apply. Recorded as a follow-up.

**Repository.**
- The migration is renamed to `supabase/migrations/20260914183331_usa_275_discipleship_connections.sql`. The SQL is byte-identical, so its header comment still names the old rollback path.
- The rollback moved to `supabase/rollbacks/`, with a README. It can no longer run as a forward migration.
- Other rollback files are unchanged, pending the broader reconciliation.

**Still outstanding**
- *Deploy to production* stays **off**. The local and production histories are still not reconciled (§2–§4), so turning it back on now would run unsafe migrations.
- Signed-in production UI verification (+ Add visible on Tanner Kent, open, cancel) needs Ryan's browser session.
- Aaron Johnson was not added. No person, connection or activity was created.
