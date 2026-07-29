# Workspace terminology — resolving the overloaded term

**USA-110 Stage 0.** Documentation and naming policy only. **No schema migration, no column rename, no data change.**
**Source of truth:** USA-109 founder-approved architecture package.
**Measured against:** live schema `dbupuphezeqkiolprrlg` and `rfox0629/usam-website` @ `main`.

---

## 1. The finding — this is bigger than expected

USA-110 anticipated the term `workspace` being overloaded in about four places. The live schema says otherwise:

> **50 tables carry a `workspace_id` column. 49 of them reference `missionary_households`.**

`workspace_id` appears **316 times** across `supabase/migrations/`.

**In this codebase, `workspace` already has a settled, dominant, load-bearing meaning: a missionary household.** It is not an ambiguous term with a few stray usages — it is the primary scoping key of the entire DOS product.

### The 49 tables scoped to `missionary_households` via `workspace_id`

`calendar_event_links` · `calendar_sources` · `calendar_sync_cursors` · `connected_calendars` ·
`dos_accountability_check_in_commitments` · `dos_accountability_check_ins` · `dos_accountability_schedules` ·
`dos_assessment_results` · `dos_circle_overrides` · `dos_circle_scoring_configs` · `dos_commitment_updates` ·
`dos_group_join_requests` · `dos_groups` · `dos_guided_resource_progress` · `dos_identity_links` ·
`dos_meeting_reviews` · `dos_person_commitments` · `dos_relationship_score_history` · `dos_relationship_scores` ·
`dos_resource_assignments` · `dos_review_links` · `dos_table_invitation_bookings` · `dos_table_invitations` ·
`dos_user_assessment_results` · `dos_user_external_assessment_results` · `dos_user_journal_entries` ·
`dos_user_learning_books` · `dos_user_learning_chapter_notes` · `dos_user_life_plans` ·
`dos_user_mentor_meetings` · `dos_user_mentor_relationships` · `dos_user_prayer_logs` ·
`dos_user_prophetic_words` · `dos_user_records` · `dos_workspace_feature_flags` · `external_calendar_events` ·
`missionary_connection_logs` · `missionary_encounters` · `missionary_field_people` · `missionary_fruit_items` ·
`missionary_in_season_focus` · `missionary_library_items` · `missionary_table_reviews` · `missionary_tables` ·
`person_roles` · `prayer_partners` · `prayer_requests` · `relationship_reminders` ·
`usam_missionary_applications`

Plus `prayer_logs.workspace_id` — **`not null` with no foreign key** (§5) — and
`missionary_team_members.relationship_to_workspace`, a free-text column.

---

## 2. Current-state naming map

| # | Usage | Actual meaning today | Scope |
|---|---|---|---|
| **1** | `X.workspace_id → missionary_households` (49 tables) | **A missionary household** — the DOS personal/family container | DOS product-wide |
| **2** | `prayer_logs.workspace_id` (no FK) | Same, unenforced | 1 table |
| **3** | `dos_workspace_feature_flags.workspace_id` | Feature flags **per household** | DOS feature gating |
| **4** | `usam_missionary_applications.workspace_id` | The household created **for** an application | Onboarding |
| **5** | `dos_identity_links.workspace_id` | The household an identity candidate belongs to | Identity matching |
| **6** | `missionary_team_members.relationship_to_workspace` | Free text: a person's relation to the household | Household display |
| **7** | `app/admin/workspaces/[id]/preview` | Admin preview of a **household** | Operations V1 |
| **8** | `can_access_dos_workspace` | Permission to open a **household** in DOS | DOS auth |
| **9** | **Workspace V2** (USA-109) | The top-level container: Personal / Organization / Network | *Proposed — does not exist* |

Usages 1–8 are consistent with each other. **Only usage 9 conflicts**, and it is the one not yet built.

---

## 3. Decision — rename the new concept, not the 50 tables

Three options were considered:

| Option | Cost | Verdict |
|---|---|---|
| **A.** Rename `workspace_id` → `household_id` across 50 tables | 50-table migration, 316 call sites, touches all of DOS, gated on USA-86/USA-100 | ❌ **Rejected** — highest-risk change in the programme, for a naming benefit |
| **B.** Keep `workspace` for households; name the V2 container something else | Zero schema change; a naming policy and a glossary | ✅ **Recommended** |
| **C.** Ship both meanings and disambiguate by context | Guaranteed defects | ❌ Rejected |

### Approved target terminology

| Concept | Term | Identifier | Notes |
|---|---|---|---|
| The top-level V2 container | **Workspace** *(product/UI language)* | `workspaces` table, **`ws_id`** in code and new columns | The user-facing word stays "Workspace" — it is the right product term |
| The DOS household container | **Household** *(product/UI language)* | **`workspace_id` stays as-is** in all 50 existing tables | Never renamed. Existing columns are legacy nomenclature, frozen. |
| Feature flags | Household feature flags | `dos_workspace_feature_flags` unchanged | |

**The rule, stated plainly:**

> **`workspace_id` always means a missionary household. The Workspace V2 container is `ws_id`. No existing column is ever renamed.**

This is deliberately asymmetric — the *user-facing word* and the *column name* diverge. That is the correct trade: users get the right word, and 50 tables and 316 call sites stay untouched.

### Why not rename the V2 concept instead (e.g. "Tenant", "Space")

Considered and rejected. USA-109 is founder-approved with "Workspace" as the product term throughout, and "Workspace" is the correct word for what it is (cf. Slack, Notion, Linear). Changing the *product* word to protect a *column* name would be the tail wagging the dog. Divergence between UI language and legacy column names is normal and manageable when it is written down — which is what this document is for.

---

## 4. Minimum safe corrections — documentation only, no code change

**Applied in this change:** this glossary.

**Required of all future work (policy, enforced at review):**

1. New columns referencing a V2 workspace are named **`ws_id`**, never `workspace_id`.
2. New code referring to a household uses the identifier `householdId`, even where it reads `workspace_id` from the database. Comment the mapping at the boundary.
3. UI copy says **"Household"** for usages 1–8 and **"Workspace"** only for usage 9.
4. No migration renames `workspace_id`. If a future change makes renaming genuinely worthwhile, it is its own gated epic, not a side effect.
5. `docs/architecture/workspace-terminology.md` (this file) is the arbiter. Update it before introducing a new sense of the word.

**Deliberately not done now:** renaming variables in existing code. It would touch DOS broadly for no behavioural gain, and USA-110 forbids modifying Operations V1 or `/join` behaviour.

---

## 5. Two integrity defects found while mapping — recorded, not fixed

| ID | Defect | Impact | Disposition |
|---|---|---|---|
| **N1** | `prayer_logs.workspace_id` is `not null` **with no foreign key**; `prayer_logs.prayed_by_user_id` also has no FK | Orphanable rows; the only household-scoped table without referential integrity | Fix in Stage 1 alongside `applicant_user_id` (USA-109 C8). **Additive constraint, gated on USA-86/USA-100.** |
| **N2** | `person_roles.workspace_id → missionary_households` and `field_person_id → missionary_field_people` | **Corrects USA-109.** `person_roles` is a *household-scoped role for a contact*, **not** an organization-level role table. It does not support multi-organization tenancy. | Update the USA-109 permission model: multi-org roles need `organization_memberships.role`, not `person_roles`. |

**N2 matters.** USA-109 listed `person_roles` as evidence that the data model already supports multi-organization tenancy. It does not. The multi-org evidence is `organizations` + `organization_memberships`; `person_roles` is DOS contact metadata. This narrows — but does not overturn — the D3 recommendation.
