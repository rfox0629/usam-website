# Database Ownership Map — Supabase `usam-website` (`dbupuphezeqkiolprrlg`)

**Date:** 2026-07-28 · Read-only. No migration was run. No schema was modified. No `db repair` was attempted.

## Supabase estate

| Project | Ref | Status | Role |
|---|---|---|---|
| `usam-website` | `dbupuphezeqkiolprrlg` | **ACTIVE_HEALTHY** | the only live production database |
| `dos-platform` | `wtmzhfggcgzyloepqeyi` | INACTIVE | legacy DOS reference, paused |
| `usam-dashboard` | `httbugkowzladdlsjozr` | INACTIVE | orphaned (repo deleted) |
| `dos-2.0` | `ljriqykdecgpnmgwqjue` | INACTIVE | archived experiment |
| `alignedinsights-website` | `igbzzezhjovyuuopyiki` | INACTIVE | out of scope, ownership unconfirmed |
| `rfox0629's Project` | `uapfhtmipcafrszmommv` | INACTIVE | unused |

Plus an inaccessible **second account** holding SAVE (`lcxgfnjfnhohlqivldkp`, ref now visible via CI) and Stewardship Capital (`hbvjxm`, masked). USA-89 D17 remains open.

**One production database serves every domain in `usam-website`.**

## Table ownership (102 distinct tables from 125 migration files)

### DOS-owned (≈48)
All `dos_*` tables: accountability (`dos_accountability_*`, `dos_person_commitments`, `dos_commitment_updates`), groups/community (`dos_groups`, `dos_group_members`, `dos_group_gatherings`, `dos_group_rsvps`, `dos_group_attendance`, `dos_group_join_requests`, `dos_group_resources`, `dos_group_templates`, `dos_group_member_access_tokens`, `dos_group_member_identities`, `dos_group_member_sessions`, `dos_group_notification_deliveries`, `dos_group_member_notification_preferences`, `dos_group_updates`), My Record (`dos_user_records`, `dos_user_journal_entries`, `dos_user_life_plans`, `dos_user_prayer_logs`, `dos_user_prophetic_words`, `dos_user_learning_books`, `dos_user_learning_chapter_notes`, `dos_user_mentor_*`), assessments (`dos_assessment_results`, `dos_user_assessment_results`, `dos_user_external_assessment_results`), relationship intelligence (`dos_relationship_scores`, `dos_relationship_score_history`, `dos_circle_*`), reviews (`dos_meeting_reviews`, `dos_review_links`), invitations (`dos_table_invitations`, `dos_table_invitation_bookings`), resources (`dos_resource_assignments`, `dos_guided_resource_progress`), `dos_identity_links`, `dos_workspace_feature_flags`.

Plus `meetings`, `meeting_people`, `meeting_ministers`, `meeting_reflections`, `fruit_events`, `discipleship_relationships`, `ministry_events`, `ministry_event_people`, `ministry_event_person_responses`, `participant_reviews`, `participant_testimonies`, `relationship_reminders`, `visibility_rules`, `collectives`, `collective_memberships`, `networks`, `network_memberships`, calendar tables (`connected_calendars`, `calendar_sources`, `calendar_event_links`, `calendar_sync_cursors`, `external_calendar_events`).

### USAM Website-owned (≈25)
`missionary_profiles`, `missionary_people`, `missionary_households`, `missionary_field_people`, `missionary_tables`, `missionary_table_reviews`, `missionary_encounters`, `missionary_connection_logs`, `missionary_fruit_items`, `missionary_library_items`, `missionary_in_season_focus`, `missionary_support_settings`, `missionary_tags`, `missionary_team_members`, `missionary_profile_page_views`, `support_commitments`, `support_commitment_matches`, `major_gift_inquiries`, `financial_freedom_inquiries`, `financial_freedom_uploads`, `form_submissions`, `prayer_requests`, `prayer_logs`, `prayer_partners`, `prayer_partner_applications`, `partners_documents`, `system_access_codes`, `usam_missionary_applications`, `public_sites`, `product_feedback`.

### Organization OS-owned (≈4)
`organizations`, `organization_memberships`, `people`, `person_roles`.

### Communications-owned (1)
`communications_resend_subscribers` — applied remotely 2026-07-28, **not present as a local migration file**.

### Shared identity core (3)
`profiles`, `admin_users`, and Supabase-managed `auth.users`.

### External integration (2)
`pco_giving_records`, `pco_giving_sync_runs` — Planning Center. Carries the open `pco_people` RLS finding.

## Cross-domain table usage — the actual blocker

Measured by counting files in each domain that reference each table:

| Table | DOS | Admin | Public | Domains |
|---|---:|---:|---:|---:|
| `missionary_households` | 8 | 12 | 9 | **3** |
| `organizations` | 9 | 9 | 2 | **3** |
| `profiles` | 8 | 4 | 1 | **3** |
| `organization_memberships` | 2 | 2 | 1 | **3** |
| `prayer_requests` | 2 | 7 | 4 | **3** |
| `people` | 7 | 2 | 0 | 2 |
| `meetings` | 7 | 3 | 0 | 2 |
| `dos_groups` | 7 | 0 | 6 | 2 |

**The shared identity and organization core is:** `profiles`, `people`, `person_roles`, `organizations`, `organization_memberships`, `missionary_households`, `admin_users`, `auth.users`.

`missionary_households` is the most coupled table in the system — DOS treats households as the unit of discipleship, the website treats them as the unit of support, and admin manages both.

## Answers to the Phase 4 questions

**1. Can DOS and Organization OS safely share one Supabase project?**
Yes — and they must, for now. They share `organizations`, `organization_memberships`, `people`, `profiles`. Organization OS is also only ~2,600 LOC of mostly preview UI, so there is no second product to give a second database to.

**2. Would separate repositories require separate databases?**
**No.** This is the single most important conclusion. Repository boundaries and database boundaries are independent. Multiple repositories can target one Supabase project using the same `@supabase/ssr` client and the same RLS policies. The 87-line `src/lib/supabase` module is trivially publishable as a shared package.

**3. Would separate databases create unacceptable identity duplication?**
Yes. Splitting the database would fork `auth.users` and `profiles`, requiring cross-database identity sync for every login, every household lookup, and every prayer/support join. **Do not split the database.**

**4. Which tables form the shared identity and organization core?**
`auth.users`, `profiles`, `people`, `person_roles`, `organizations`, `organization_memberships`, `missionary_households`, `admin_users`. Eight tables. Everything else is cleanly domain-owned.

**5. Could schema namespaces or ownership documentation be enough?**
Yes — documentation plus a naming convention is sufficient today. The `dos_*` prefix already provides de-facto namespacing for 48 tables. Postgres schemas (`dos`, `website`, `core`) would be cleaner but would require rewriting every query and every RLS policy: high risk, low near-term benefit. **Recommend: document ownership now, defer schema namespaces.**

**6. Would an API boundary be safer than direct table access?**
Not yet. An internal API layer over eight shared tables adds latency, a failure mode, and maintenance burden for a single-developer codebase. Revisit when a second engineer owns DOS independently, or when DOS is licensed to a third party. Until then, RLS *is* the enforcement boundary.

**7. What is the migration risk from USA-100 drift?**
**Material, and worse than a simple count mismatch.** Measured:
- **125** local migration files vs **70** applied remote migrations.
- Identically-named migrations carry **different version timestamps** locally and remotely:

  | Migration | Local version | Remote version |
  |---|---|---|
  | `missionary_profiles_foundation` | 20260501164602 | 20260501185143 |
  | `create_admin_users_allowlist` | 20260501201146 | 20260501203837 |
  | `create_financial_freedom_inquiries` | 20260501202545 | 20260501203857 |
  | `optimize_admin_rls_policies` | 20260501203951 | 20260501204036 |

- At least two migrations exist **only remotely**, with no local file: `communications_resend_subscribers` (2026-07-28) and `create_aligned_insights_inquiries`.
- `create_aligned_insights_inquiries` places an **Aligned Insights** table inside the USAM production database. Aligned Insights is flagged in registry v2 as out-of-scope with unconfirmed ownership. This is a tenancy concern, not just drift.

Because versions differ for the *same* logical migration, `supabase db push` cannot converge without history repair, and `supabase db pull` would generate a schema snapshot that disagrees with 125 existing files.

**8. Should extraction wait until USA-100 is resolved?**
**Yes, for anything touching the database or CI migration checks.** A second repository running migrations against a database whose history already disagrees with its files will compound the drift into a genuinely unrecoverable state. Documentation, internal boundaries, and Vercel separation (Stages A–C) can proceed in parallel — none of them run migrations.

**9. What USA-86 backup prerequisites are required?**
Before any stage that runs a migration or repairs history:
- A verified nightly `pg_dump` of `dbupuphezeqkiolprrlg` with a **tested restore** — a backup that has never been restored is a hypothesis.
- A storage-bucket export (missionary images, application photos, uploads).
- A point-in-time snapshot taken immediately before the first `db repair`.
- Documented restore runbook and measured restore duration.

USA-100 must not begin until USA-86 reports a successful restore test.

## Limitations

Table ownership was derived from migration DDL and code references, not from live `information_schema` queries. RLS policies, triggers, storage buckets, and edge functions were **not** enumerated — doing so would require live database queries beyond the read-only scope taken here. A follow-up inventory should confirm RLS coverage per table before extraction.
