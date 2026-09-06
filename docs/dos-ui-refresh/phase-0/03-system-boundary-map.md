# Phase 0 — DOS system boundary map

A baseline map, not the Phase 2 screen inventory. Line numbers refer to `app/dos/app/DosMvpAppClient.tsx` at `de6862f` unless another file is named.

## 1. Entry points and route families

| Family | Routes | Notes |
| --- | --- | --- |
| Portal / auth | `/dos`, `/login`, `/auth/callback`, `/auth/session`, `/update-password` | `getDosAuthorization()` in `src/lib/dos/auth.ts`; unauthenticated users go to `/login?next=…` |
| Setup / onboarding | `/dos/setup`, `/dos/onboarding`, `/dos/workspaces/[slug]`, `/dos/admin` | Personal workspace creation, USAM application |
| **Live app** | `/dos/[collectiveSlug]` (+ query `?view=`, `?person=`, `?openGroup=`, `?tab=`, `?resource=`, `?walkthrough=usam`) | One page, one client component; all sections are client state, not routes |
| Compatibility | `/dos/app?workspace=`, `/dos/[slug]/meetings`, `/dos/[slug]/people`, `/dos/[slug]/people/[id]`, `/dos/[slug]/meetings/[id]` | Redirect to `/dos/[slug]` |
| Demo | `/dos/app/preview?demo=<token>` | Synthetic data, no DB |
| Token-link public forms | `/dos/book/[token]`, `/dos/review/[token]`, `/dos/review-options/[token]`, `/dos/testimony/[token]` | Unauthenticated, token-gated; own POST APIs under `/api/dos/{book,reviews,testimonies}/[token]` |
| Library pages | `/dos/library/marriage-assessment`, `/dos/library/remnant` | Standalone resource pages |
| Public group portal | `/groups/*` (outside `/dos`) | Member portal; `src/lib/groups/`, tested by `dos-group-member-portal` |
| Marketing | `/domain-sites/discipleship-operating-system`, `/system/preview` | Not the app |

## 2. Shells

- **Mobile shell**: `DosMvpAppClient` renders `MobileTabBar` (line 34311) — `<nav aria-label="Primary">`, `absolute inset-x-0 bottom-0 z-[60] md:hidden`, three tabs from `mobileTabs` (line 425): **Home / Meetings / More** with icons `home`, `meetings`, `apps` drawn by the inline `Icon` component (line 1423). Surface is `bg-white/62 backdrop-blur-2xl` (translucent). A floating quick-action button (`aria-label="Open quick actions"`, line 34424) sits above it. The app container is `app/dos/app/layout.tsx` (`.dos-app-route`, max-width 430px on mobile, 1440px from `md:`). `activeTab === "people"` (Field) highlights the **More** tab.
- **Desktop shell**: same component, `md:` breakpoint; left sidebar from `desktopNavGroups` (line 466): Dashboard, My Record, Core (Field, Meetings, Prayer), More (Groups, Fruit, Library, Reports, Stewardship, Testimony Practice), Settings; `DesktopPanel` (line 7051) content cards. Forms open as `DosWorkflowPage` (line 15943) full-screen at `z-[120]`, offset `md:left-[232px] xl:left-[260px]`.
- **Section state**: `ActiveTab` = home | meetings | people | more; `MoreAppView` (line 163) = apps | fruit | groups | in_season | library | missionary_profile | my_record | organizations | prayer | prayer_team | reports | settings | stewardship | support_team | table_flow. Deep links are read from `useSearchParams` (lines 38924–39489).
- **Unused shell**: `src/components/dos/WorkspaceV2Shell.tsx` — no importers.

## 3. Authentication boundary

- Supabase Auth via `@supabase/ssr` cookies (`src/lib/supabase/server.ts`, PKCE). `src/lib/admin-auth.ts` → `getAdminAuthorization()` returns admin roles; `src/lib/dos/auth.ts` → `getDosAuthorization()` widens this to `admin | member` DOS users, `getDosWorkspaceAccess()` resolves a slug to `missionary_households` and checks membership (`allowed | forbidden | not_found | configuration_error`).
- `middleware.ts` does **not** gate `/dos`; it handles domain routing, favicon rewrites, `/vision` and `/partners` access cookies, and the `/domain-sites` preview gate.
- Every `/dos/*` page is `dynamic = "force-dynamic"` and checks authorization server-side before rendering.

## 4. Authorization and permission boundary

- **Application-layer, not RLS-layer for DOS.** 63 files under `app/dos`, `app/api/dos`, `src/lib/dos` use the **service-role admin client** (`src/lib/supabase/admin.ts`); 1 uses the cookie-bound server client. Workspace scoping is enforced in code by `requireDosWorkspaceRouteAccess()` (`src/lib/dos/api-auth.ts`) and `workspace_id` filters in `src/lib/dos/missionary-app.ts`. A UI refresh must therefore never change which `workspace_id` or person id a request carries.
- Portal provisioning (`/api/dos/portal/workspaces`) is gated by `requireDosPortalProvisioningAuthorization()` (USA-117 compatibility boundary; explicitly global by design).
- Shared leadership / identity: `src/lib/dos/identity.ts` (`loadDosSharedWorkspaceAccess`), tested by `dos-identity-security`.

## 5. Database and API boundary

- **Canonical tables** (README): `missionary_households` (workspace identity), `missionary_field_people` (people), `missionary_tables` (meetings), `missionary_connection_logs`, `missionary_fruit_items`, `dos_meeting_reviews`, `dos_workspace_feature_flags`, plus My Record, prayer, groups, commitments, resource-assignment and calendar tables. Legacy prototype model (`organizations` / `collectives` / `people` / `meetings`, helpers `src/lib/dos/workspace.ts`, `people.ts`, `meetings.ts`) is reference-only.
- **Data loader**: `loadDosAppData()` in `src/lib/dos/missionary-app.ts` builds the whole `DosAppData` payload the client renders.
- **APIs**: 56 route handlers under `app/api/dos/`. Write surface the UI depends on: `app/meetings` [POST, PATCH, DELETE], `app/people` [POST, PATCH, DELETE], `app/people/import` [POST], `app/prayer-requests` and `app/prayer-partners` [POST, PATCH, DELETE], `app/reminders` [POST, PATCH, DELETE], `app/fruit-events/[id]` [PATCH, DELETE], `app/groups/members` [POST, DELETE], `app/groups*`, `app/commitments*`, `app/accountability/*`, `app/my-record*`, `app/resource-assignments*`, `app/calendar/*`, `app/review-links`, `app/table-invitations`, `circles/override` [PATCH], `circles/recalculate` [POST], `circles/config` [PATCH], `app/advanced-features` [PATCH].
- **Migrations**: `supabase/migrations/` (146 files) + `supabase/seed_dos_foundation.sql`. See baseline report §5 for drift.

## 6. Feature flags

| Flag | Storage | Effect | Rule |
| --- | --- | --- | --- |
| `dos_engagement_levels` (Advanced Feature `engagementLevels`) | `dos_workspace_feature_flags` row per workspace | Visibility only; default off | Off must never null, reset, recalculate, migrate, or stop loading anything (`src/lib/dos/advanced-features.ts`) |
| `dosCommitmentsFeatureFlag` (`commitmentsAccountability`) | same table | Gates whether commitment rows load at all | Different pattern; do not copy |
| `dosGroupsSimplifiedFeatureFlag` (`groupsSimplifiedV2`) | same table | Groups simplified UI | |
| `DOS_PREVIEW_TOKEN` / `DOS_DISABLE_DEMO_PREVIEW` | env | Demo route | |
| `ENABLE_NEW_DOMAIN_REDIRECT`, `ENABLE_MOR_DOMAIN_REDIRECT` | env | Domain redirects (non-DOS) | |

All three workspace flags are combined into `DosAppFeatureFlags` (`missionary-app.ts` line 596) and read by the client.

## 7. External integrations touched by DOS

| Integration | Code | UI surface |
| --- | --- | --- |
| Google Calendar (OAuth, read-import, sync) | `src/lib/dos/google-calendar.ts`, `/api/dos/app/calendar/google/*` | Meetings calendar sources, `GoogleCalendarEventDetailSheet` |
| Resend email | `src/lib/email/resend.ts`, `src/lib/groups/email.ts`, `src/lib/prayer/email.ts` | Group join-request notifications, prayer team, review links |
| Planning Center | `src/lib/planning-center/*` | Operations/finance only (not DOS UI) |
| Vercel Analytics / Speed Insights, GA, Clarity | `components/AnalyticsScripts.tsx`, `src/lib/analytics.ts` | Global |
| Public share/booking tokens | `src/lib/dos/table-invitations.ts`, `review-requests.ts`, `testimonies.ts` | Token-link pages |

## 8. Shared navigation, forms, sheets, dialogs, editable surfaces

- **Overlay primitives**: `Sheet` (line 16160, `fixed inset-0 z-[1000]`), `MobileBottomSheet` (line 16277), and the second bottom-sheet variant at line 16420; `DiscardChangesDialog` (line 16000); `DosWorkflowPage` (line 15943) for full-screen task screens (Log Meeting, Schedule Meeting, Add/Edit Person, and one more).
- **Unsaved-work rule** (`src/lib/dos/unsaved-work.ts`, commits `ec836b3` and `76a942e`, both shipped 2026-09-04): a surface declares `kind="editable" | "inspection"`. Editable surfaces have an inert backdrop and inert swipe; every deliberate exit (X, Back, Cancel, Escape, browser Back) routes through `useUnsavedWorkGuard` (line 16073) and shows the "Discard changes?" dialog only when the form is dirty. Dirtiness is read from the DOM (`readSurfaceValues`), not per-form state. There are ~61 sheets; 22 declare editable.
- **Named editable sheets/forms** (function names): `ScheduleMeetingForm`, `MeetingFormContent` (Log/Edit Meeting), `PersonFormContent` (Add/Edit Person), `EditProfileSheet`, `AvailabilityEditSheet`, `InvitationAvailabilityEditor`, `GroupCreateSheet`, `GroupSettingsSheet`, `GroupGatheringFormSheet`, `GroupJourneyEditSheet`, `GroupJourneyAssignSheet`, `CommitmentFormSheet`, `PersonAccountabilityEditSheet`, `PersonAccountabilityCheckInSheet`, `LogCheckInSheet`, `AccountabilityScheduleSheet`, `ResourceAssignmentFormSheet`, `ResourceAssignmentCheckInSheet`, `AddPrayerPartnerSheet`, `AddPrayerRequestSheet`, `LogPrayerSheet`, `PeopleImportSheet`, `UsamApplicationSheet`, and the My Record forms (`MyRecordJournalForm`, `MyRecordPrayerForm`, `MyRecordMentorRelationshipForm`, `MyRecordMentorMeetingForm`, `MyRecordPropheticWordForm`, `MyRecordLifePlanForm`, `MyRecordLearningBookForm`, `MyRecordLearningChapterForm`, `MyRecordAssessmentForm`, `MyRecordExternalAssessmentForm`).
- **Shared controls**: `SegmentedTabOption` tab rails (`myRecordTabs` line 16806, `meetingCalendarViewTabs` line 16736, `fruitViewTabs` line 16754), `AppButton`, `DosFormSection`, `DisclosureSection` (overflow-tested), `VoiceTextarea` (`src/components/dos/VoiceTextarea.tsx`), `DosCircleTarget` / `DosTargetLoader` (`components/dos/`).

## 9. Design-token and component-system locations

| Location | Content |
| --- | --- |
| `tailwind.config.js` | `usam.*` brand tokens (black, white, gold, success) and the **DOS text ladder** `dos.primary #0F1520`, `dos.body #3D4654`, `dos.secondary #5A6473`, `dos.eyebrow #6B7686`, `dos.disabled #B4BBC5`, `dos.blue #2450C8`, `dos.hairline #E7E9ED`, `dos.rule #EDEFF2`, `dos.band #F6F9FE` (comment: "Nothing lighter than `dos-secondary` may carry a date, a count, or a sentence.") |
| `src/lib/dos/text-tokens.ts` | The text-ladder rule, enforced by `dos-readability` script |
| `app/globals.css` | **Dark USAM website theme** (`body { background: var(--usam-black) }`, stone-color overrides). DOS escapes it via `body:has(.dos-app-route)` overrides in `app/dos/app/layout.tsx` (white background, Inter, footer hidden). Known trap: light-background sections need explicit text color or globals turns copy invisible. |
| `app/dos/app/layout.tsx` | DOS container CSS (inline `<style>`), font stack, focus rings |
| `DosMvpAppClient.tsx` | Hundreds of hard-coded hex values (`#2563EB`, `#EBF2FF`, `#94A3B8`, `#0F172A`, `#EAF2FF`, …) in Tailwind arbitrary values; icon set; all components. No separate component library. |
| `src/lib/dos/brand-metadata.ts` | DOS metadata/viewport |
| `dos.html` (repo root) | Stale static dark mockup; not part of the app |

## 10. Critical persistence and destructive-action workflows

| Workflow | Path | Destructive? |
| --- | --- | --- |
| Log Meeting / Edit Meeting (create/update `missionary_tables`, conversation-flow JSONB, follow-up reminders, fruit signals) | `openForm("meeting")` → `DosWorkflowPage "Log Meeting"` → `MeetingFormContent` → `/api/dos/app/meetings` POST/PATCH | Update in place |
| Delete Meeting | `/api/dos/app/meetings` DELETE | **Yes** |
| Schedule Meeting (future `missionary_tables` row + reminder + optional Google Calendar event) | `openScheduleMeeting()` → `ScheduleMeetingForm` | No |
| Add / Edit / Delete Person | `PersonFormContent` → `/api/dos/app/people` POST/PATCH/DELETE; "Save outranks Delete" (USA-168) | Delete: **yes** |
| CSV people import | `PeopleImportSheet` → `/api/dos/app/people/import` | Bulk create |
| Circle placement | `/api/dos/circles/override` PATCH (human-confirmed); `/api/dos/circles/recalculate` POST refreshes recommendation metrics only and "must never move an existing Person" (`src/lib/dos/circle-placement.ts` line 19) | Data-meaning change; human-only |
| Prayer requests / partners create, update, delete | `/api/dos/app/prayer-*` | Delete: **yes** |
| Reminders create/update/delete | `/api/dos/app/reminders` | Delete: **yes** |
| Fruit events edit/delete | `/api/dos/app/fruit-events/[id]` | Delete: **yes** |
| Group members add/remove, gatherings, settings, join requests | `/api/dos/app/groups/*` | Remove member: **yes** |
| Commitments / accountability check-ins, resource assignments | `/api/dos/app/commitments*`, `accountability/*`, `resource-assignments*` | No |
| My Record entries and attachments | `/api/dos/app/my-record*` | No |
| Google Calendar connect / disconnect / sync | `/api/dos/app/calendar/google/*` | Disconnect revokes tokens |
| Advanced feature toggle | `/api/dos/app/advanced-features` PATCH | Visibility only |
| Review / testimony / booking links | `/api/dos/app/review-links`, `testimony-links`, `table-invitations` | Generates tokens |

Client-side destructive confirmations: 6 `confirm(` call sites and 4 `method: "DELETE"` fetches in the app client.
