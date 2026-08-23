# Legacy Audit — USA-Missionaries/dos-platform

**Date:** 2026-07-28 · Read-only. Nothing was deleted, revived, or made canonical.

## Repository state

| Property | Value |
|---|---|
| Slug | `USA-Missionaries/dos-platform` |
| Visibility | private |
| **Archived on GitHub** | **`false`** — contradicts the "it is archived" premise |
| Default branch | `main` (2 commits) |
| Branches | `main`, `rescue/dos-platform-legacy-reference-20260727` |
| Tags | none |
| Disk | ~15.6 MB |
| Last push | 2026-07-27T23:25:53Z |
| Local clone | `/Users/ryanfox/Documents/GitHub/dos-platform` — **dirty working tree** |
| Supabase | `wtmzhfggcgzyloepqeyi` — INACTIVE (paused) |
| Vercel | none linked |

**Correction 1:** the repository is *not* archived. It should be archived on GitHub to match its documented "Legacy DOS Reference" status.

**Correction 2:** registry v2 states "Its 24 migrations are historical only." `main` contains only **3** migrations. The 24 exist on the **rescue branch**. The registry note is right about the count but wrong about where it lives — a reader following `main` would conclude 21 migrations were lost.

## Preservation verification (USA-88)

The local clone carries substantial uncommitted work: **60 modified files (+1,891/−2,824)** and ~130 untracked paths, including 21 untracked migrations and whole feature trees (`apps/`, `packages/`, `src/features/{groups,guides,meetings,organization,people,prayer,stewardship,table-flow,testimonies,time-with-jesus,discipleship-readiness,extras}/`).

Every one of these was verified present on `rescue/dos-platform-legacy-reference-20260727` (`51ffeefc7d1f`, 372 files):

- **21 of 21** untracked migrations: present ✅
- **14 of 14** untracked feature/app directories: present ✅

**USA-88 preservation held.** The dirty local clone is redundant with the rescue branch. It should not be relied on as the archive, and it should not be cleaned until the founder confirms.

## Secret and sensitivity scan

Scanned the rescue branch for service-role keys, JWTs, private keys, and inline passwords.

- Matches found in 5 files are **all `process.env.*` references**, not values.
- **Zero literal JWT-shaped or key-shaped values.**
- Only `.env.example` is committed; its `SUPABASE_SERVICE_ROLE_KEY=` is an empty placeholder.
- No `.env`, `.env.local`, or credential file is tracked.

The rescue commit message claims "CLEAN — no PII, no secrets". Independently confirmed for secrets. PII was not exhaustively audited; `20260326202000_add_people_profile_fields_and_demo_seed.sql` contains a demo seed that should be spot-checked before any public exposure.

## Schema comparison against current DOS

`dos-platform` (rescue branch, 24 migrations) defines **38 tables**. Current `usam-website` defines **102**.

**Overlapping names (8):** `organizations`, `organization_memberships`, `people`, `profiles`, `meetings`, `prayer_logs`, `prayer_requests`, `connected_calendars`.
These are *name* collisions only. The current schema was built independently; the shapes differ.

**Unique to dos-platform (30):** `audit_logs`, `churches`, `confirmed_meetings_map`, `contacts`, `contact_tags`, `contact_tag_definitions`, `debts`, `disciple_assessments`, `disciple_assessment_gifts`, `dos_handoff_records`, `in_season_messages`, `in_season_message_sections`, `in_season_paths`, `in_season_practice_attempts`, `in_season_trainer_feedback`, `meeting_assessments`, `meeting_outcomes`, `organization_members`, `organization_member_assignments`, `organization_member_extras`, `prayer_notes`, `scheduling_requests`, `scheduling_slots`, `scheduling_assignments`, `scheduling_messages`, `stewardship_profiles`, `stewardship_shares`, `support_transactions`, `testimonies`, `users`.

**None of these 24 migrations was ever applied to the production database** (`dbupuphezeqkiolprrlg`). They belong to the paused `wtmzhfggcgzyloepqeyi` project. They are historical only.

## Findings against the 14 questions

| # | Question | Answer |
|---|---|---|
| 1 | Unique migration file not in usam-website? | **Yes — all 24 are unique**, but they target a different, paused database and were never applied to production. |
| 2 | Unique schema definition? | Yes — 30 tables with no counterpart. Chiefly *In Season*, *Scheduling*, and *Stewardship shares*. |
| 3 | Unique product feature? | Yes — **In Season** (discipleship messaging paths, practice attempts, trainer feedback) and the **scheduling app** (`apps/scheduling-app`) have no equivalent in current DOS. |
| 4 | Design artifacts worth preserving? | Yes — `docs/app-*.md`, `docs/dos-*.md` (11 product spec documents), plus `packages/` and `skills/`. |
| 5 | Docs to copy into an archive folder? | **Yes — the 11 `docs/` specifications are the highest-value artifact in the repository.** |
| 6 | Secrets or sensitive history? | No secrets. One demo seed migration warrants a PII spot-check. |
| 7 | Production dependencies? | **None.** No Vercel project, paused Supabase, zero references from dispatcher/config/scripts. |
| 8 | Vercel project linked? | No. |
| 9 | Supabase project linked? | Yes — `wtmzhfggcgzyloepqeyi`, INACTIVE. |
| 10 | Linear issue still linked? | Only as historical reference; no active issue depends on it. |
| 11 | Automation/registry entry pointing to it? | Yes — registry v2 `DOS (legacy)` record. Must be updated, not removed, if the repo is ever deleted. |
| 12 | Needed for USA-100? | **No.** USA-100 concerns `dbupuphezeqkiolprrlg`; dos-platform's history belongs to a different project. |
| 13 | Needed for future DOS extraction? | **No** for code — current DOS is a clean reimplementation. **Possibly yes** for product intent: the In Season and scheduling specs describe features not yet rebuilt. |
| 14 | Can it be deleted after an archival bundle? | Yes, subject to the verdict below. |

## Deletion-readiness verdict

### **PRESERVE SPECIFIC ARTIFACTS, THEN DELETE**

Not "safe to delete after USA-100" — USA-100 is unrelated. The gate is artifact preservation, not database reconciliation.

**Artifacts to preserve before deletion:**

| Source (on `rescue/dos-platform-legacy-reference-20260727`) | Destination |
|---|---|
| `docs/app-in-season.md`, `app-people.md`, `app-library.md`, `app-table-flow.md`, `app-financial-stewardship.md`, `ai-assistant.md`, `dos-home.md`, `dos-fruit.md`, `dos-shell.md`, `dos-stewardship.md`, `table-flow-launch.md`, `in-season-migration-note.md` | `rfox0629/usam-automation` → `docs/archive/dos-platform-2026/specs/` |
| `supabase/migrations/**` (all 24) | `docs/archive/dos-platform-2026/migrations/` — reference only, never runnable |
| `src/features/in-season/**`, `apps/scheduling-app/**` | `docs/archive/dos-platform-2026/source-reference/` or a git bundle |
| Full `git bundle` of both branches | offline archive + encrypted backup |

**Prerequisites before deletion:**
1. Archive the repository on GitHub first (it is currently *not* archived) and leave it archived for a cooling-off period.
2. Produce and verify the artifact bundle above.
3. Confirm the paused Supabase project `wtmzhfggcgzyloepqeyi` is separately backed up or explicitly written off.
4. Update registry v2's `DOS (legacy)` record to point at the archive location rather than the repository.
5. Founder sign-off.

**Do not delete during this session or before those five steps.** Deletion is irreversible; archiving is not.
