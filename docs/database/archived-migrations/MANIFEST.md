# Archived Migrations

These files were removed from `supabase/migrations/` because they were never
successfully applied to production and were superseded by a different design
before they ever ran. They are kept here as historical record only.

**These files must never be executed against production.** They are not
tracked in the Supabase CLI migration ledger, they are not part of the active
`supabase/migrations/` directory, and `supabase db push` will not see them.
If any of this functionality is wanted again, design it fresh against the
current schema — do not resurrect these files and run them as-is; several
would conflict with tables/columns that now exist under a different shape.

Evidence method: production schema was read via
`supabase gen types typescript --linked --schema public` (live, schema-only
introspection — no row data read) on 2026-07-17, then cross-referenced
against each file's `CREATE TABLE` / `ALTER TABLE ADD COLUMN` targets.

---

## 20260501223000_create_prayer_command_center.sql

- **Original purpose:** Dedicated `prayer_partner_applications` table plus a
  `prayer_permissions` column on `admin_users`, for an early standalone
  prayer-command-center feature.
- **Replacement:** `admin_users` allowlist model established by
  `20260501203837_create_admin_users_allowlist.sql` and
  `20260506121842_admin_access_permissions.sql` (no `prayer_permissions`
  column in the current, live `admin_users` shape). The prayer-partner
  application concept itself was rebuilt on the `prayer_partners` table via
  `20260513200806_restore_prayer_team_signup_tables.sql`,
  `20260513204740_prayer_partner_application_lifecycle.sql`, and
  `20260701125400_prayer_partner_canonical_context.sql`.
- **Known application status:** Never applied. `prayer_partner_applications`
  does not exist in production; `admin_users.prayer_permissions` does not
  exist in production.
- **Reason archived:** Superseded before ever running.
- **Warning:** Do not execute. Running this would create a table and column
  the current application does not use or expect.

## 20260505174500_form_submissions_prayer_operations.sql

- **Original purpose:** First of three iterative attempts to add detailed
  request-tracking columns (`household_id`, `related_household_id`,
  `request`, `urgency`, `visibility`, `assigned_partner_ids`, etc.) directly
  onto `prayer_partners`.
- **Replacement:** Same `prayer_partner_application_lifecycle` /
  `prayer_partner_canonical_context` lineage as above — the live
  `prayer_partners` table has a materially different column set
  (`approved_at`, `approved_by`, `field_person_id`, `how_heard`,
  `missionary_profile_id`, `workspace_id`, etc.).
- **Known application status:** Never applied — 14 of the 31 columns this
  file would add are absent from the live table; the ones that happen to
  share a name were reintroduced independently by the later lineage, not by
  this file.
- **Reason archived:** Superseded before ever running.
- **Warning:** Do not execute.

## 20260505221500_expand_prayer_team_operations_hub.sql

- **Original purpose:** Second iteration of the same detailed
  `prayer_partners` column set, expanded further (adds `category`,
  `prayer_notes`, etc.).
- **Replacement:** Same as above.
- **Known application status:** Never applied — 16 of 38 columns absent.
- **Reason archived:** Superseded before ever running.
- **Warning:** Do not execute.

## 20260506025711_ensure_prayer_team_tables.sql

- **Original purpose:** Third and final iteration of the same detailed
  `prayer_partners` column set (adds `title`).
- **Replacement:** Same as above.
- **Known application status:** Never applied — 17 of 42 columns absent.
- **Reason archived:** Superseded before ever running.
- **Warning:** Do not execute.

## 20260513151500_support_experience_flow_settings.sql

- **Original purpose:** `enable_monthly_partnership` / `enable_one_time_gift`
  / description toggle columns on `missionary_support_settings`.
- **Replacement:** The live table instead carries `monthly_committed`,
  `monthly_goal`, `monthly_received`, `annual_goal`, `general_fund_percentage`,
  and `goal_basis` — a numeric/goal-based design rather than a boolean-toggle
  design. That shape traces to the original
  `20260501185143_missionary_profiles_foundation.sql` (renamed from
  `20260501164602_*` during this reconciliation), which predates this file
  by 12 days — meaning this file's toggle-based approach was an alternative
  that was never adopted, not a later upgrade that got skipped.
- **Known application status:** Never applied — 0 of 4 columns present.
- **Reason archived:** Superseded (by an earlier, differently-shaped design
  that remained the one actually used).
- **Warning:** Do not execute.

## 20260625175625_dos_ministry_event_model.sql

- **Original purpose:** Dedicated `ministry_events`,
  `ministry_event_people`, `ministry_event_person_responses` tables plus
  `ministry_event_id` / `recorded_by_*` columns on `missionary_tables`.
- **Replacement:** `dos_group_gatherings` and `dos_group_attendance`
  (established via `20260707034007_dos_private_groups.sql` and related DOS
  groups migrations) — the live schema handles gatherings/attendance through
  the DOS groups model instead of a dedicated ministry-event model.
- **Known application status:** Never applied — none of the three tables
  exist in production; none of the three `missionary_tables` columns exist.
- **Reason archived:** Superseded before ever running.
- **Warning:** Do not execute.

## 20260702194002_dos_table_discipleship_roles.sql

- **Original purpose:** Growth-tracking columns on `missionary_tables`
  (`discipleship_relationship`, `growth_action_step`, `growth_scriptures`,
  `planning_decisions`, `table_role`, etc.).
- **Replacement:** `20260507162211_dos_foundation_schema.sql` and
  `20260507162735_dos_foundation_advisor_cleanup.sql` establish equivalent
  discipleship/growth-tracking concepts on the proper DOS foundation
  tables — those migrations predate this file by nearly two months, meaning
  this `missionary_tables`-based approach was an alternate design that was
  never adopted in favor of the already-established DOS foundation model.
- **Known application status:** Never applied — 0 of 10 columns present.
- **Reason archived:** Superseded (by an earlier, differently-located design
  that remained the one actually used).
- **Warning:** Do not execute.

## 20260707132434_dos_unified_prayer_context.sql

- **Original purpose:** `created_by_person_id`, `created_by_user_id`,
  `follow_up_at`, `gathering_id`, `group_id`, `meeting_id`, `priority`
  columns on `prayer_requests`, unifying prayer requests with DOS
  groups/gatherings/meetings context.
- **Replacement:** None identified. No other migration in this repository
  introduces an equivalent column set on `prayer_requests` or elsewhere.
  The "unified context" concept appears to have been abandoned rather than
  replaced by an equivalent design — `prayer_requests` kept its simpler,
  original shape.
- **Known application status:** Never applied — 7 of 8 columns absent
  (only a column matching `priority`'s neighbor `organization_id` predates
  this file independently).
- **Reason archived:** Abandoned, not confirmed superseded by name — flagged
  here rather than left active since there is no evidence it is still
  wanted. If DOS/prayer unification is still desired, it should be
  redesigned fresh against the current `prayer_requests` and DOS schema, not
  reapplied from this file.
- **Warning:** Do not execute.

## 20260513143000_missionary_profile_page_views.sql

- **Original purpose:** `missionary_profile_page_views` table for public
  profile page-view analytics (device type, referrer, visitor fingerprint,
  etc.).
- **Replacement:** None identified anywhere in the current 94-table
  production schema — no page-view or analytics-style table exists under
  any name.
- **Known application status:** Never applied — the table does not exist in
  production at all.
- **Reason archived:** No evidence of current use or a superseding design.
  **This is a product decision, not a purely technical one** — archived here
  based on the absence of any successor, but if profile page-view analytics
  is still a wanted feature, it should be confirmed and rebuilt fresh rather
  than resurrected from this file.
- **Warning:** Do not execute.
