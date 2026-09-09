# USA-249 — Reporting truth audit and metric registry

Discovery for the DOS Reports & Ministry Intelligence project. Verified read-only against the production Supabase project `usam-website` (`dbupuphezeqkiolprrlg`) on 2026-09-09. No personal data is copied here beyond the four people the founder named as scenarios. Nothing was written, migrated, or deployed.

Precedence: Linear issue → this registry → `docs/dos-ui-refresh/phase-3/dos-ui-canonical-spec.md`.

## 1. What production actually holds

| Fact | Value |
| --- | --- |
| Workspaces with data | Ryan Fox (`ryan-fox`): 73 people, 33 meetings (32 logged, 1 canceled), 7 check-ins, 2 "discipling me" relationships. Dirk Bond (`bond-family`): 48 people, 33 meetings (27 logged, 6 scheduled). Three other workspaces are empty test rows. |
| Logged meetings in Ryan's workspace | 32, every one with a `scheduled_start_at` and `scheduled_end_at`, every one a single-person meeting, none with `planned_*` or `logged_at`. 9 fall in the last 30 days, 32 in the last 90. |
| Meeting start times | All 32 sit at exactly 12:00 local (USA-246 audit). The **duration** (end − start, 15–210 minutes, 11 distinct values) is what the missionary entered; the start is synthetic. |
| Check-ins | 7 for 5 people (July 13–27). Only 1 carries a duration. None in the last 30 days. |
| Connection logs | 0 rows in production. |
| "Discipling me" (My Record) | `dos_user_mentor_relationships`: Dirk Bond and Marty Vanderzanden, both active, both linked to a Person. 4 discipleship meetings recorded there (July 6–21). |
| Columns the loader expects but production lacks | `missionary_tables.table_role`, `missionary_tables.growth_*`, `missionary_tables.planning_*`, `missionary_tables.ministry_event_id`, `missionary_tables.recorded_by_*`, `missionary_field_people.discipleship_relationship`. The loader falls back to a narrower select, so **every production meeting is "ministering"** and **every person's `discipleshipRelationship` is null**. |
| Tables the loader queries that do not exist | `ministry_events`, `ministry_event_people` (handled by the loader's missing-table path). |
| `discipleship_relationships` | Exists, 0 rows, organization-scoped (`discipler_profile_id`, `disciple_person_id`, `disciple_profile_id`). Unused by DOS. |
| Identity links | Ryan is verified in his workspace. Tanner Kent and Philip John Suaco have no DOS user, no identity link, and no workspace. Dirk's workspace has one ambiguous link. |
| The named scenario people (Ryan's workspace) | **Dirk Bond**: summary "Mentor · Friend · Exploring", structured role `not_active`, My Record says discipling me. **Tanner Kent**: three rows (one active `discipling_them`, two archived duplicates); 2 logged meetings, 1 check-in, 270 recorded minutes. **Philip John Suaco** (the fixture spells it "Saco"): `discipling_them`, 1 logged meeting (210 minutes) in the last 30 days. |
| USA-258 evidence | Tanner's group Journey assignment (`marks-of-discipleship`, context `group`) is `not_started` while a Week 1 progress row dated 2026-08-20 is stored **under that same assignment id**. Saving progress never transitions assignment status, and Home reads the status column. His earlier `new-testament-14-days` assignment is `completed` with no progress rows at all. |

## 2. Current reporting surfaces and their defects

| Surface | What it does today | Defect |
| --- | --- | --- |
| Reports (More → Reports) | Static "Coming soon" screen. | No report. |
| Home → Top Time Investments | Ranks people by `personTableStatsByPersonId`: every logged "ministering" meeting's minutes plus every check-in's minutes, per person, over the whole loaded dataset. | No date range; check-ins counted as meetings and as time; a meeting without a start and end is credited 45 minutes (one-to-one) or 75 (group) by `meetingMinutesEstimate`; group meetings credit every participant and the rows invite summing. |
| Home → Table Activity | "Total meetings" = logged meetings + check-ins; "Total hours logged" = estimated meeting minutes + check-in minutes; "People met with" includes check-in people. | Two activity types silently combined; estimates presented as logged hours. |
| Home → Today's Alignment / Weekly Report Card | Five booleans (journal, prayer, discipleship meeting, any logged meeting, any linked person) become On Track / Building / Started / Needs Attention. | A fixed checklist, not ministry health; removed from Home by USA-257. |
| My Record → Personal Report | "Ministry Tables" counts only `source === "table"` meetings; "People Ministered" falls back to counting people whose `lastActivityAt` is in range when no participant exists. | The fallback is an inference presented as a count. |
| Loader `stats.meetingsCount` | Logged meetings + check-ins. | Same conflation. |
| Circle scoring | Frequency, time (with the same estimates), progress, fruit, momentum, multiplication heuristics; placement changes only on confirmation. | Blocked for reporting until the People audit confirms the placement source (USA-247). |
| Fruit / reviews / testimonies | Fruit items + observable fruit events on Home; reviews assembled from two stores. | Need canonical dedupe and provenance before any count (USA-243). |

## 3. Metric registry

Status key: **approved** (founder direction, USA-250 recommendation), **provisional** (built, awaiting founder confirmation), **blocked** (not built until its gate clears), **rejected** (must not be reported as fact).

| Field | Question answered | Source (grain) | Formula, timeframe, rules | Class | Dedupe / identity | Drill-through | Audience | Privacy | Completeness signal | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Range | Which days? | Viewer's local calendar | Inclusive days; default last 30; 7 / 90 / custom offered. Meeting day = `table_date` → `scheduled_start_at` → `created_at` (loader rule). Timezone: the browser's. | actual | — | — | Workspace | — | — | approved |
| Person | Who? | `missionary_field_people` (row) | Workspace-scoped; `status = 'archived'` excluded. | actual | Duplicates are separate rows until merged (Tanner has two archived duplicates). | Person record | Workspace | Name only | — | approved |
| Relationship direction | Who is discipling whom? | `dos_user_mentor_relationships` (active, linked) then `missionary_field_people.role_in_my_life` | My Record relationship → **Discipling me**; else `discipling_them` → **I am discipling**, `mentoring_me` → **Discipling me**, `walking_with_them` → **Walking with**, `peer_encouragement` → **Peer encouragement**, `not_active` → **No direction recorded**. The display summary `relationship_type` is never truth; when it alone carries a direction the row says so. | actual / conflicting | One direction per person; conflicts stated on the row. | Person record | Workspace | Direction only | Conflict sentence | provisional (decision 2 below) |
| Recorded meetings | How many meetings? | `missionary_tables` (row) | `meeting_status = 'logged'`, `source = 'table'`, person in `field_person_ids`, day in range. Scheduled, canceled, and connection logs never count. | actual | Meeting id | Meeting record | Workspace | Date, type, role | — | approved |
| Recorded contact time | How much recorded time with this person? | `missionary_tables.scheduled_start_at/end_at` | Sum of (end − start) over contributing meetings where both exist and end > start. A meeting missing either contributes 0 and marks the row **Partial**. Group meetings credit each participant. Rows are never summed as elapsed time. | actual (duration); start time is synthetic noon | Meeting id | Meeting record | Workspace | Minutes only | Partial when any contributing meeting lacks time | approved |
| Unique recorded time (total) | How much of *my* time? | Same | Sum over unique qualifying meetings. The only figure that may be called "your time". | actual | Meeting id | — | Workspace | Minutes | Count of meetings without time | approved |
| Check-ins | How many accountability conversations? | `dos_accountability_check_ins` (row) | `check_in_date` in range, by person. Separate column; never a meeting; minutes never added to contact time. | actual (count); duration incomplete (1 of 7) | Row id | Person record (Accountability) | Workspace | Date, duration | Partial when a check-in lacks a duration | approved |
| Last recorded activity | When did DOS last see something? | Meetings + check-ins above | Latest date of either, labelled by kind. | actual | — | The record | Workspace | Date | — | approved |
| Data completeness | Can this row be trusted? | Derived | **Recorded** (every contributing record has a duration) / **Partial** (some lack it) / **No qualifying activity** (nothing in range). The word "inactive" is never used. | derived | — | — | Workspace | — | Itself | approved |
| Recommended next action | What now? | Derived | In order: missing meeting time → *Add the missing meeting time*; active schedule past `next_check_in` → *Log the overdue check-in*; a scheduled meeting exists → *Next meeting <date>*; I am discipling and no meeting in the trailing 14 days → *Schedule the next meeting*; Discipling me and quiet → *Ask for the next meeting*; else *Nothing due*. | derived | — | — | Workspace | — | — | provisional (USA-252) |
| Multiplication (downstream) | Who is this person discipling? | `discipleshipChain` on the loaded data | Only explicit links with `source = 'explicit'` and `status = 'active'`. Never inferred from `discipleship_stage = 'disciple_maker'`, a score, or notes. **Production has no source; the loader returns none; the preview fixture supplies them.** | explicit only | Link id | — | Workspace; upward as a count | Names only where explicitly recorded | "No downstream relationship recorded" | provisional (decision 1 below) |
| Safe upward summary | What may a person discipling me see? | Derived from the report | `period, peopleWithRecordedActivity, meetings, uniqueRecordedMinutes, meetingsMissingTime, checkIns, lastRecordedActivity, relationships (direction counts), downstreamRelationships (count), completeness`. Excluded by name: notes, private notes, prayer wording, My Record narrative, journal, participant responses, conversation responses, reflections, testimony, story, records, person names. | derived | — | — | Active "discipling me" relationships only; ends when the relationship is archived | Counts only | Completeness | approved contract; delivery not built |
| Adoption ("is X using DOS?") | Is this missionary recording? | Would need `dos_identity_links` + their workspace's activity | Not built. Tanner and Philip have no DOS user or workspace, so nothing can be observed yet. | blocked | — | — | — | — | — | blocked (USA-259) |
| Journey progress | Where is the Journey? | `dos_resource_assignments.status` vs `dos_guided_resource_progress` | Not used. Status never transitions on saved progress (see §1). | conflicting | — | — | — | — | — | blocked (USA-258) |
| Circle placement | My 3 / 12 / 70 / 120 | `dos_relationship_scores` / layer groups | Not used. All 73 placements are unconfirmed machine assignments. | blocked | — | — | — | — | — | blocked (USA-247) |
| Fruit, reviews, testimonies | What happened through this? | `missionary_fruit_items`, `fruit_events`, `participant_reviews`, `participant_testimonies`, `meeting_reflections.observed_fruit` | Not counted. Recent Fruit and Recent Reviews lists moved from Home into Reports unchanged; counts wait for canonical dedupe and consent rules (USA-243). | blocked as counts | — | Fruit / review record | Workspace | Consent-governed | — | blocked |
| "People Ministered" (My Record) | — | `lastActivityAt` fallback | Rejected: an inference. | inferred | — | — | — | — | — | rejected |
| 45/75-minute duration estimate | — | `meetingMinutesEstimate` | Rejected for reporting; still used by circle scoring, which is itself blocked. | estimated | — | — | — | — | — | rejected |
| Weekly report card status | — | Five booleans | Rejected as ministry health. | inferred | — | — | — | — | — | rejected |
| `meetingsCount` / "Total meetings" | — | Loader / Home | Rejected while it adds check-ins. | conflated | — | — | — | — | — | rejected |

## 4. Trust classification (summary)

- **Trustworthy after production verification:** person identity and archive state, logged meeting rows and participant links, recorded meeting duration, check-in rows, active My Record "discipling me" relationships, scheduled meetings' planned time.
- **Partial or definition-dependent:** check-in duration; direction when the structured role and the display summary disagree; Journey status (USA-258); attendance (absent row ≠ absent person); prayer totals (overlapping sources).
- **Inferred (must not be reported as fact):** "People Ministered" fallback; duration estimates; the weekly report card; engagement level as health; circle scores as placement or maturity.
- **Conflicting / duplicate paths:** Home totals mixing meetings and check-ins; My Record's `source === "table"` filter; duplicate person rows; two overlapping "discipling me" sources (My Record relationship vs `role_in_my_life`).
- **Blocked:** circle reporting; multiplication in production (no source); adoption for people without a DOS user; Fruit/review/testimony counts; national/team aggregates (no oversight model).

## 5. Founder decisions

1. **Downstream discipleship source.** The report reads an optional `discipleshipChain` list on the loaded data (explicit links only). The loader returns none. Candidate production sources: the existing organization-scoped `discipleship_relationships` table (0 rows) or a new workspace-scoped table. Nothing is created until you choose.
2. **Which record is truth for "Discipling me".** The prototype uses the My Record relationship and states a conflict when the Person record disagrees (Dirk). The alternative is `role_in_my_life = mentoring_me` on the Person.
3. **Meetings where I was the one being discipled** (table role Being discipled) count as recorded contact time with that person, with the direction shown. The alternative is a separate section.
4. **Check-ins as their own column**, never merged into meetings or time (built that way).
5. **Spec rule B1 ("Home unchanged")** is superseded by USA-257 for Home only. Recorded in the decision log §F; needs your acknowledgement because B1 was settled by you on 2026-09-07.
6. **Learning's share line** reads "Eligible for future sharing with the person discipling you" rather than PR #129's "Visible in discipleship reporting" (Learning is private and not in any report).
7. **Fixture spelling:** "Philip John Saco" (fixture) vs "Philip John Suaco" (production).
8. **USA-258** has its explanation (§1) but no fix; the fix is a separate decision.

## 6. Where privacy and access are enforced

- Every DOS API route and the workspace loader authorise the signed-in user against the workspace (`src/lib/dos/auth.ts` → `getDosWorkspaceAccess`, `src/lib/dos/api-auth.ts` → `requireDosWorkspaceRouteAccess`). The report reads only data that loader already returned for that workspace. No new route, no cross-workspace read.
- `src/lib/dos/ministry-report.ts` names every field it reads (input types) and every field it may send upward (`dosSafeMinistrySummaryFields`) and every field it must not (`dosSafeMinistrySummaryExcluded`). `scripts/dos-ministry-report-regression.mjs` fails if either list drifts.
- `dosMinistryReportInputFromAppData` is the narrowing step between the loaded workspace and the calculation.
- Upward delivery (Dirk seeing Ryan's summary, Ryan seeing Tanner's) is **not built**. When it is, it belongs server-side behind a confirmed-relationship lookup and returns `buildDosSafeMinistrySummary` output only; archiving the relationship ends it (`dosUpstreamViewers`).
