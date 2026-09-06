# Phase 1 — Stale UI implementations, routes, flags, and hard-coded styles (USA-203)

Evidence only. No file was deleted, moved, or edited. Counts are from `de6862f`; "importers" means files under `app/`, `src/`, `components/`, or `middleware.ts` that import the symbol or path.

## 1. Unreferenced or legacy UI code

| Path | Lines | Last commit | Importers | Finding | Class |
| --- | --- | --- | --- | --- | --- |
| `src/components/dos/WorkspaceV2Shell.tsx` | 1,379 | 2026-05-28 | **0** | A complete alternative DOS shell with its own three-tab bottom nav (`lucide-react` icons, "More" label) and 221 hard-coded hex values. Never rendered. | **OBS** — Phase 7 deletion candidate; the only DOS user of `lucide-react`, which stays for 28 non-DOS importers. |
| `app/dos/[collectiveSlug]/meetings/MeetingsWorkspaceClient.tsx` | — | 2026-05-07 | 0 | Prototype meetings client; its page redirects via `legacy-redirect.ts`. Fetches `/api/dos/<slug>/people`. | **OBS** |
| `app/dos/[collectiveSlug]/people/PeopleWorkspaceClient.tsx` | — | 2026-05-07 | 0 | Prototype people client; page redirects. | **OBS** |
| `app/dos/[collectiveSlug]/people/[personId]/PersonRelationshipModal.tsx`, `RelationshipInsightsPanel.tsx` | — | 2026-05-07 | 0 | Prototype person UI; page redirects. Only callers of `/api/dos/<slug>/relationships` and `/people/<id>/insights`. | **OBS** |
| `src/lib/dos/workspace.ts`, `src/lib/dos/meetings.ts` | 304+ | — | 0 | Legacy collective helpers (README: "reference until fully removed"). | **OBS** |
| `src/lib/dos/people.ts` | — | — | 3 (all three are the OBS prototype clients above) | Dead once those are removed. | **OBS** (transitive) |
| `app/api/dos/[collectiveSlug]/{people,meetings,relationships,people/[personId]/insights}/route.ts` | 4 handlers | — | Only the OBS clients call them | Live HTTP endpoints for the prototype model (`collectives`/`people`/`meetings` tables). Not called by the production client. | **?R (D4)** — removal is an API change even if unused; needs Ryan's explicit go in Phase 7. |
| `dos.html` (repo root) | 34 KB | 2026-04-24 | 0 | Dark static mockup, not served. | **OBS** |
| `app/dos/app/MemberGroupHomePreview.tsx` | 145 | — | 1 (`DosMvpAppClient`) | Preview of the member portal inside the leader app; live. | A/C |
| `src/components/dos/GuidedJourneyUi.tsx`, `VoiceTextarea.tsx` | — | — | 2 each (app client + `app/groups/GroupJourneyView.tsx`) | The only genuinely shared DOS components today. | A/C — seed of the Phase 4 component folder. |
| `components/dos/DosCircleTarget.tsx`, `DosTargetLoader.tsx` | — | — | 2 / 4 | Circle target + loading skeleton, shared by `loading.tsx` files. Lives in `components/dos/` while the other shared DOS components live in `src/components/dos/` — **two component roots**. | A/X — consolidate location in Phase 4 (safe). |

## 2. Routes: stale, compatibility, and undocumented

| Route | State | Evidence | Class |
| --- | --- | --- | --- |
| `/dos/app/preview?demo=<token>` | Live, token-gated (`DOS_PREVIEW_TOKEN`, default `dos2026`; off only if `DOS_DISABLE_DEMO_PREVIEW=true`) | `app/dos/app/preview/page.tsx` lines 35–36, 2068–2076 | **A/X** vs README ("deprecated and redirects"). It is also the only way to render the app without a database, which Phase 0 relied on. **?R (D3)**: keep as a documented smoke/preview route, or disable in production and keep for local/preview only. |
| `/dos/app?workspace=` | Compatibility redirect | `app/dos/app/page.tsx` | A/C (documented) |
| `/dos/[slug]/meetings`, `/people`, `/people/[id]`, `/meetings/[id]` | Redirect to `/dos/[slug]` | `legacy-redirect.ts` | A/C (documented) — pages can be deleted with the OBS clients only if the redirects are kept (Phase 7, safe if redirects stay). |
| `/dos/workspaces/[slug]` | Redirect to `/dos/[slug]` | 22-line page | A/C (documented) |
| `/dos/admin` | Redirect to `/dos` | 7-line page | Undocumented; harmless. HIST. |
| `/admin/workspaces/[id]/preview` | Compatibility redirect | `app/admin/README.md` | A/C |
| `/system/preview` | Marketing demo | README: demos belong here | A/C, out of scope |
| Query-param deep links `?view=`, `?person=`, `?openGroup=`, `?tab=growth|commitments`, `?resource=`, `?walkthrough=usam` | Live | `DosMvpAppClient` lines 38924–39489 | A/C — must be preserved and listed in the Phase 2 matrix. |

## 3. Feature flags

| Flag | Where | Production state (read-only query, 2026-09-04) | Code paths | Class |
| --- | --- | --- | --- | --- |
| `dos_engagement_levels` (Advanced Feature) | `dos_workspace_feature_flags` | enabled for **2** workspaces | 20 `engagementLevelsEnabled` references in the client | A/C — visibility-only contract documented in `advanced-features.ts` |
| `dos_commitments_accountability` | same | enabled for **1** workspace | 1 reference | A/C — gates data loading (different contract; documented) |
| `dos_groups_simplified_v2` | same | enabled for **1** workspace | 3 references | **A/X** — both Groups code paths still exist in the client two months after rollout to one workspace; the off path is what every other workspace sees. Phase 2 must inventory both states; Phase 6 Groups batch must not assume V2. **?R (D6)**: is V2 the intended default for everyone? |
| `DOS_PREVIEW_TOKEN` / `DOS_DISABLE_DEMO_PREVIEW` | env | unknown (values not read) | preview page | see D3 |
| `SYSTEM_ACCESS_CODE` | env | — | system preview | out of scope |

No disabled rows exist in the flag table, so "flag row absent" is the only off state in production.

## 4. Hard-coded styles in `DosMvpAppClient.tsx`

| Metric | Value |
| --- | --- |
| Hex color literals | **3,547** occurrences, **93** distinct |
| Top colors | `#0F172A` ×459 (primary text), `#64748B` ×431 (secondary), `#2563EB` ×328 (blue), `#EBF2FF` ×274, `#1D4ED8` ×271, `#BFDBFE` ×244, `#DCEBFF` ×229, `#EAF2FF` ×223, `#F8FBFF` ×189, **`#94A3B8` ×134**, `#E2E8F0` ×115, `#F8FAFC` ×106, `#475569` ×103 |
| Token utilities (`text-dos-*`, `bg-dos-*`, `border-dos-*`) | **399** uses total (`text-dos-primary` 127, `text-dos-secondary` 56, `text-dos-eyebrow` 56, `text-dos-body` 49, `border-dos-rule` 41, `text-dos-blue` 39 …) — i.e. tokens cover ≈10% of color decisions |
| Two competing blues | Tailwind `dos.blue` = `#2450C8` (USA-168 token) vs `#2563EB` (×328) and `#1D4ED8` (×271) used everywhere else |
| Two competing text ladders | Token ladder `#0F1520 / #3D4654 / #5A6473 / #6B7686` (USA-168) vs legacy `#0F172A / #475569 / #64748B / #94A3B8` (thousands of uses) |
| Very light gray text | `text-[#94A3B8]` **×133**, `text-[#CBD5E1]` ×5, `text-[#B4BBC5]` ×1 — the exact pattern the project description removes; `text-tokens.ts` calls migrating these "tracked as follow-up". The `dos-readability` script only checks three sliced functions, which is why it passes. |
| Font sizes | `text-[10px]` **×200**, `text-[11px]` ×95, `text-[13px]` ×70, **`text-[9px]` ×56**, `text-[15px]` ×40, `text-[14.5px]` ×39, `text-[13.5px]` ×30, `text-[12.5px]` ×29, `text-[8px]` ×12 — 15 distinct arbitrary sizes, three of them below 11 px |
| Inline `style={{}}` | 246 |
| Overlay primitives | `Sheet` ×60 uses, `MobileBottomSheet` ×2, `ProfileSheetFrame` (third variant, line 16405) — three overlay implementations; `DosWorkflowPage` ×4; `DiscardChangesDialog` ×1 |
| Blur/translucency | `backdrop-blur-*` 14 uses (nav `2xl`, sheets `lg`/`[3px]`, footers `sm`) |
| Segmented tab arrays | 8 separate `SegmentedTabOption` arrays; `{ label: "Overview", value: "overview" }` defined 4 times |
| Form sections | `DosFormSection` ×60, `AppButton` ×109, `DesktopPanel` ×40, `DisclosureSection` ×6 — real primitives exist but are file-local |

Other DOS surfaces: `DosOnboardingClient.tsx` 208 hex / 2,916 lines; `DosPortalClient.tsx` 74 hex; `DosSetupClient.tsx` 61 hex; `app/dos/app/layout.tsx` 4 hex (container CSS, includes `!important` overrides of the website body).

## 5. Copied form patterns

- Log Meeting and Edit Meeting share `MeetingFormContent`; Schedule Meeting is a separate `ScheduleMeetingForm` with its own date/time/duration controls (the V10 direction wants one form language for both).
- Ten `MyRecord*Form` components each re-implement the sheet frame + save/cancel footer (`MyRecordSheetFrame` exists but the forms still differ in footer and validation handling).
- Group sheets (`GroupCreateSheet`, `GroupSettingsSheet`, `GroupGatheringFormSheet`, `GroupInviteSheet`) and prayer sheets (`AddPrayerPartnerSheet`, `AddPrayerRequestSheet`, `LogPrayerSheet`) each own their field markup rather than composing `DosFormSection`.
- 23 surfaces declare `kind="editable"`; only 1 declares `kind="inspection"` explicitly (inspection is the default), so the declaration is invisible on ~37 read-only sheets.

## 6. Branches and worktrees that keep old UI alive

| Branch | Ahead / behind `origin/main` | DOS files changed | Last commit | Finding | Class |
| --- | --- | --- | --- | --- | --- |
| `origin/codex/dos-ui-blitz` | 0 / 232 | 0 | 2026-07-13 | Fully merged; the name suggests a design pass but nothing is pending. | **OBS** branch — safe to delete remotely (Phase 7, needs Ryan per onboarding rule on deleting old material). |
| `origin/clean/public-website-brand-refresh` | 0 / 472 | 0 | 2026-06-11 | Merged. | OBS branch |
| `ryan/usa-163-journey-focused-revision` (worktree `dos-journey-claude-ui-refresh`) | 4 / 151 | 4 | 2026-08-13 | "Move the Journey bands onto the DOS blues" — unmerged Journey UI restyle. | **?R (D7)** — superseded by this project or to be merged first? |
| `ryan/dos-journey-claude-ui-refresh` | 3 / 152 | 2 | 2026-08-12 | Sibling of the above. | ?R (D7) |
| `ryan/usa-164-people-home-v2-canonical-discipleship-workflow-prototype` | 2 / 151 | 4 | 2026-08-13 | People/Home V2 prototype — touches **Home**, which this project protects. | **?R (D7)** — must not be merged during this project without a Home decision. |
| `ryan/usa-138-…cleanup-audit…`, `claude/usa-138-dos-v3-solo` | 1–2 / ~198 | 14–16 | 2026-08-04/05 | "DOS V3 prototype and AI-assisted meeting intake". | ?R (D7) |
| `usa-168-consolidated` | 0 / 2 | 0 | 2026-09-04 | Merged; worktree `.claude/worktrees/usa-168-people-v2-audit-99cbc0` still checked out. | Merged; worktree cleanup is Ryan's (onboarding rule). |
| Main checkout untracked `app/dos/library-preview/` | — | — | — | Unknown DOS route in progress, user-owned, not committed. | **?R (D8)** — what is it, and does it overlap Library (USA-225)? |

128 remote branches exist in total; only the above touch DOS UI.

## 7. Imports that keep obsolete UI alive

- `lucide-react`: 29 importers, 28 outside DOS; the DOS one is the unreferenced `WorkspaceV2Shell.tsx`. The live DOS client uses its own inline `Icon` (line 1423) — the production icon set the project protects.
- `src/lib/dos/people.ts` ← 3 dead clients (see §1).
- `app/dos/[collectiveSlug]/legacy-redirect.ts` ← 4 redirect pages (keep).
- `@/src/lib/dos/workspace` — zero importers; nothing keeps it alive except CODEOWNERS and the README sentence.
