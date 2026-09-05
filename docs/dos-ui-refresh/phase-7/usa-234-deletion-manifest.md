# USA-234 — Archive of superseded direction and deletion manifest

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
