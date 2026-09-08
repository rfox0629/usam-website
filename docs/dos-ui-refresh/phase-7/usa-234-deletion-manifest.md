# USA-234 — Archive of superseded direction and deletion manifest

> **Revalidated in the USA-239 closeout (2026-09-07) against `main` `e30a49e`.** PR #100 was stale (based on the pre-release stack) and was not rebased; every item below was re-searched on current `main` and re-classified. The replacement is the isolated cleanup PR named in the closeout index; it awaits founder approval like any deletion. The original manifest text follows for history.

## Closeout classification (current `main`)

> **Re-validated on 2026-09-08 against `main` `63c5b32`** (after #105, #111 and #110 merged), per Ryan's Step 4 approval. The deletion set was regenerated from the current tree rather than rebased from the stale commit: the same nine files, and **74** of the approved 76 zero-reference functions (`ConversationFlowDetail` and `ConversationFlowExperience` were already removed by #105). Nothing outside the approved manifest is deleted; the 15 script-pinned functions stay. The repeatable scan (`npm run scan:dos-dead-code`, #110) on the cleaned tree reports 28 zero-reference functions: the 13 still-pinned retained names, plus **15 second-order candidates** that lost their last caller only because an approved function was deleted (`DesktopPrayerActionButton`, `DesktopQuickActionButton`, `FollowUpGuideRow`, `FruitEventIcon`, `PDRow`, `PrayerRequestCard`, `RecentActivityRow`, `ReflectionDetailValue`, `meetingHasGrowthReflection`, `meetingHasPlanningReflection`, `openAddressInMaps`, `optionalDurationMinutesFromDateRange`, `prayerRequestSharedWith`, `relationshipStatusLabel`, `supportingAttendeeSubRoleLabel`). They are **retained** in this PR because they are outside the approved manifest; they are the natural scope of a later, separately approved cleanup PR. Seven manifest names the scan counts as "referenced" (`FruitEventRow`, `LeaderReflectionRow`, `MeetingCard`, `PersonCard`, `isWithinLastDays`, `meetingPeople`, `reviewStatusLabel`) are same-named symbols declared independently in other files (`missionary-app.ts` types, the deleted prototype clients, the admin dashboard, the deleted `workspace.ts`); inside the client each appears only at its own declaration, and the client exports nothing but the page component, so they are unreachable and are deleted. Client: 46450 → 44340 lines. Recovery: `git show 63c5b32:<path>` for any file or function.


| Item | Fresh evidence (2026-09-07) | Class |
| --- | --- | --- |
| `src/components/dos/WorkspaceV2Shell.tsx` (1,379 lines) | Zero importers in `app/`, `src/`, `components/`; only `scripts/dos-readability-regression.mjs` listed it as a scan target (list updated in the same PR) | **Safe to delete** — in the cleanup PR |
| `dos.html` (repo root) | No route, rewrite or import; mentioned only by a `.github/CODEOWNERS` path rule (now matches nothing; harmless) and an automation fixture string | **Safe to delete** — in the cleanup PR |
| Zero-reference functions in `DosMvpAppClient.tsx` | 84 on current `main` (USA-235–237 added and removed some; `PersonCard` is no longer script-pinned). 15 are still pinned by a regression script (name or a body-only needle) and are **retained**: `AssessmentResultSummaryCard`, `FollowUpDetailCard`, `FruitOutcomesDetailCard`, `GrowthMilestoneRow`, `MyRecordAssessmentsPanel`, `MyRecordLearningPanel`, `MyRecordPreviewCard`, `MyRecordPropheticOverviewCard`, `NotesReflectionDetailCard`, `PDPill`, `PrayerTeamCountVisibilityToggle`, `ResourceAssignmentCard`, `TableActionsDetailCard`, `TableRolePicker`, `WeekStatTile`. The other **69 named functions plus 7 that became unreferenced through them** (76 removed, 2,218 lines; 46,110 → 43,807 lines) appear exactly once in the repository | **Safe to delete** — in the cleanup PR; **15 retained** |
| Prototype clients `app/dos/[collectiveSlug]/{meetings/MeetingsWorkspaceClient,people/PeopleWorkspaceClient,people/[personId]/PersonRelationshipModal,people/[personId]/RelationshipInsightsPanel}.tsx` | Their `page.tsx` files only call `redirectLegacyDosRoute`; nothing imports the clients except each other | **Safe to delete** — in the cleanup PR (the redirecting pages and `legacy-redirect.ts` stay) |
| `src/lib/dos/workspace.ts`, `src/lib/dos/meetings.ts`, `src/lib/dos/people.ts` | No importers outside the prototype clients above | **Safe to delete** — in the cleanup PR |
| Legacy API handlers `app/api/dos/[collectiveSlug]/{people,meetings,relationships,people/[personId]/insights}/route.ts` | Live HTTP surfaces. No caller in the repository once the prototype clients are gone. Production runtime logs (7 days to 2026-09-07, all `/api/dos/` requests) show only `/api/dos/app/*` paths — no request reached a `[collectiveSlug]` handler | **Separately approved API removal (D4)** — not in the cleanup PR; recommendation: remove in their own PR after Ryan's approval |
| Compatibility redirects `/dos/[slug]/meetings`, `/people`, `/people/[id]`, `/dos/workspaces/[slug]`, `/dos/admin` | Still serve old links | **Retained** |
| Demo route `/dos/app/preview` | Test and screenshot infrastructure (D3) | **Retained** (production disablement is an environment change, separately) |
| `AppButton tone="black"` | Spec §10 retirement changes every primary button and the controls script pins the gradient | **Retained** (follow-up design PR, not cleanup) |
| `app/dos/library-preview/` | Untracked in `50b6b5f` (2026-08-21) | **Nothing to delete** (D8 resolved) |
| Remote branches `codex/dos-ui-blitz`, `clean/public-website-brand-refresh`, USA-138/163/164 UI branches | Remote operations outside these PRs; D7 settled as superseded | **Founder decision / remote operation** |

**Verification of the cleanup PR:** reference searches above; `npm run typecheck` ✓; `npm run test:dos` ✓ 40/40; `npm run build` ✓; rendering A/B — the 16 visual scenes were recorded from `main`'s client and then verified byte-for-byte against the cleanup branch (result recorded in the PR); `npm run smoke` ✓.

**Recovery:** one `git revert` of the cleanup commit restores everything; any single function can be restored from the parent commit (`git show <parent>:app/dos/app/DosMvpAppClient.tsx`).

---

Phase 7 runs after migration, not before (USA-200). It has two parts with different risk:

1. **Archive and pointers (PR #99, docs only, safe):** superseded documents moved under `docs/archive/dos-ui-refresh-superseded/` with a README; the USA-170 SQL scripts kept in place with a "NEVER RUN" header (a regression script reads them there); a scoped `app/dos/AGENTS.md` that makes the canonical spec discoverable to Claude and Codex; README / onboarding pointers.
2. **Deletion (PR #100, code, needs founder approval to execute):** only material proven obsolete by references, typecheck, the full DOS regression aggregate, the production build and the byte-for-byte visual baselines. Per `tooling/automation/docs/ENGINEERING_ONBOARDING.md` ("Founder review is required for … cleanup/deletion of old folders") and Phase 1 decision S8, the deletion PR is opened for review and **not merged**; recovery is one revert.

## Deletion manifest

| # | Item | Evidence of non-use | Recovery |
| --- | --- | --- | --- |
| 1 | `src/components/dos/WorkspaceV2Shell.tsx` (1,379 lines) | Zero importers in `app/`, `src/`, `components/` (Phase 0 R12, Phase 1 §2 OBS); its only mention is the readability script's file list, updated in the same PR; the app's only `lucide-react` DOS user, so the live client is unaffected | `git revert` of the deletion commit, or `git show <commit>^:src/components/dos/WorkspaceV2Shell.tsx` |
| 2 | `dos.html` (repo root, 34 KB static mockup) | Not served (no route, no rewrite in `next.config.js`; Phase 1 §2 OBS); referenced only by an automation regression fixture string and two docs describing it as unserved | same |
| 3 | 91 zero-reference functions in `app/dos/app/DosMvpAppClient.tsx` (3,068 lines) | Each name appears exactly once in the file (its definition) and nowhere else in the repository; the file exports only the client component, so nothing outside can call them. List below. Verified by typecheck, the 40-script `test:dos` aggregate, the production build and the 16-scene visual suite after removal | same; the list below names every function so any one can be restored from the parent commit |

**Not deleted — decisions pending or out of scope:** the four prototype clients under `app/dos/[collectiveSlug]/…`, `src/lib/dos/{workspace,meetings,people}.ts` and the legacy `app/api/dos/[collectiveSlug]/*` handlers (**D4**: live HTTP endpoints; Ryan approves); `app/dos/library-preview/` (**D8**); the merged remote branches `codex/dos-ui-blitz` and `clean/public-website-brand-refresh` (remote operations are outside this project's PRs); `AppButton tone="black"` (spec §10 — retiring it changes every primary button and the controls script pins the gradient; a follow-up once the pilots are approved); the compatibility redirects (`/dos/[slug]/meetings` etc., `/dos/workspaces/[slug]`, `/dos/admin`) which still serve old links; the demo route (**D3**).

### The 91 zero-reference functions
Components: ActionList, ActionListRow, ActivityFilterCard, AnsweredPrayerCard, AssessmentResultSummaryCard, AvailabilityActionCard, AvailabilityChipRow, AvailabilityEditSheet, ContactActionRow, ConversationFlowDetail, ConversationFlowExperience, DesktopCirclePanel, DesktopMoreAppsPreview, DesktopNextStepsPanel, DesktopPrayerActionGroup, DesktopPrayerEmptyTableState, DesktopPrayerTableRow, DesktopRecentActivityPanel, DesktopUpcomingMeetingsCard, DetailResultTile, EngagementSnapshotTile, EventPeopleRoleGroup, FeaturedTeachingCard, FollowUpDetailCard, FollowUpGuideList, FruitEventRow, FruitOutcomesDetailCard, FruitSummaryCard, GrowthMilestoneRow, GrowthReflectionDetailCard, HistoryRow, HomeActivityCard, LeaderReflectionRow, MeetingCard, MeetingPeopleDetailCard, MyRecordAssessmentsPanel, MyRecordFaithfulnessCard, MyRecordLearningPanel, MyRecordPreviewCard, MyRecordPropheticOverviewCard, MyRecordSummaryCard, NextStepsCard, NotesReflectionDetailCard, PDEmptyRow, PDList, PDPill, PDSection, PersonCard, PersonSummaryTile, PlanningReflectionDetailCard, PrayerTeamCountVisibilityToggle, ReminderRow, ResourceAssignmentCard, SnapshotMetricTile, StatTile, TableActionsDetailCard, TableDetailSummaryCard, TableRolePicker, TableTeachingRow, TaskCard, UsamStatusHomeCard, WeekStatTile.
Helpers: availabilityConnectionSummary, availabilityMeetingTypesSummary, availabilityWeeklySummary, calendarItemDateTimeLabel, circleLayerLabelForPerson, createDefaultAvailabilitySettings, currentMonthRange, dashboardTrendMonths, defaultMinistryTeamMemberIdsForWorkspace, fruitMultiplicationLabel, groupOverviewRhythms, groupedUpcomingTimelineItems, handleAddressMapClick, isWithinLastDays, lastActivityLine, latestPrayerDateForPerson, mapDosPrayerRequestToLocal, meetingPeople, meetingTestimonyRecipientTitle, monthKey, myRecordJournalReflectionCount, nextUpcomingGroupGathering, prayerRequestListContext, recentActivityLine, reviewStatusClass, reviewStatusLabel, scheduledTableDurationValue, scoreLabel, tableRoleDisplayLabel.

Retired earlier in this project (already gone, each proven by grep + typecheck in its PR): `MyRecordTabBar`, `MyRecordAtAGlanceCard` (USA-220), `MoreAppTile`, `AppsCatalogSection` (USA-223), `PeopleCircleTabs` (USA-227).

## Repository-clutter metrics
| Metric | Before Phase 7 | After archive (PR #99) | After deletion (PR #100) |
| --- | --- | --- | --- |
| Markdown files under `docs/` (top level) | 19 files | 15 | 15 |
| Superseded DOS direction documents outside `docs/archive/` | 5 | 0 | 0 |
| `DosMvpAppClient.tsx` lines | 46,019 | 46,019 | recorded in the deletion PR |
| Zero-reference functions in the client | 91 | 91 | 0 |
| Unreferenced DOS shells / mockups | 2 (`WorkspaceV2Shell.tsx`, `dos.html`) | 2 | 0 |
| Agent-instruction files that name the canonical spec | 0 | 2 (`app/dos/AGENTS.md`, onboarding pointer) | 2 |

## Pre-existing failures carried into Phase 8 (not regressions)
- `scripts/new-testament-reading-plan-regression.mjs` (not in `test:dos` or CI): asserts a literal the featured card lost in USA-170.
- The visual suite's clock sensitivity for date-relative demo rows (P-9): freezing the demo clock for the visual run is recommended as a follow-up.
