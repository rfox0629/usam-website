# Phase 0 — Blockers, risks, and unknowns

## Blockers

None. Repository identity, production identity, rollback target, and Linear governance were all verified.

## Risks (recorded, not fixed)

| Id | Risk | Evidence | Consequence for the project |
| --- | --- | --- | --- |
| R1 | **Repository migrations do not describe the production schema.** 62 migration names exist only in the repo; 6 exist only in production; several shared migrations have different timestamps. | `01-baseline-report.md` §5 | Any phase that reads a column must confirm it exists in production (information_schema) before relying on it. No migrations in this project. |
| R2 | **The live DOS UI is one 46,898-line client file** with 83 commits in 30 days from multiple concurrent branches. | `app/dos/app/DosMvpAppClient.tsx`; `git log` | Every UI PR touches the same file; merge conflicts and accidental behavior changes are likely. PRs must name the functions changed and stay small. Foundation work should add new primitives beside the file, not rewrite it. |
| R3 | **No visual-regression or rendered-DOS test exists**; CI smoke covers only the public homepage. | `02-verification-results.md` §D | Until USA-215 lands, regressions are caught only by screenshots and manual checks. |
| R4 | **Bottom navigation is translucent and content shows through it**; sticky footers use `bg-white/97 backdrop-blur-sm`. | screenshots `09-person-record`, `02-meetings-calendar`, `06-more-launcher`; line 34312 | Confirms USA-214's premise. Fixing it changes every tabbed screen's clearance; must be one bounded PR. |
| R5 | **Meetings has no Calendar/Timeline toggle today**; history is listed beneath the calendar. | `03b-meetings-history-below-calendar.png` | The Phase 5 Meetings pilot is a structural change, not a restyle; its scope must be confirmed against the canonical spec in Phase 3. |
| R6 | **My Record Overview shows "Today at a glance"**, which the approved direction removes. | `07-my-record.png` | Removal is a visible product change; it is approved in the project description but must be listed on USA-220 as intentional. |
| R7 | **Pre-existing failing script** `dos-field-contact-form` contradicts the shipped USA-168 Person form. | `02-verification-results.md` §B | Phase 1 must classify the script (likely Obsolete). It is not in CI. |
| R8 | **Concurrent, unmerged DOS UI branches** (`ryan/usa-163-journey-focused-revision`, `origin/codex/dos-ui-blitz`) and an untracked `app/dos/library-preview/` in the dirty main checkout. | `git worktree list`, `git status` in main checkout | Phase 1 must classify them; this project must not merge or delete them. |
| R9 | **Global stylesheet is the dark USAM website theme**; DOS is white only because of `body:has(.dos-app-route)` overrides. | `app/globals.css`, `app/dos/app/layout.tsx` | Token work in Phase 4 must not touch `globals.css` in a way that affects the website; light-background text needs explicit colors. |
| R10 | **Preview deployments are SSO-protected and share the production database.** | Vercel deployment protection; `.env` boundary | Persistence verification in Phase 5 needs a Ryan-designated test workspace; screenshots use the demo route. |
| R11 | **`/dos/app/preview` demo route is live in production** behind a default token (`dos2026`) unless `DOS_DISABLE_DEMO_PREVIEW=true`; README calls it deprecated. | `app/dos/app/preview/page.tsx` lines 35–36, 2068–2076 | Rules disagreement (repo README vs code). Recorded for Phase 1; useful for screenshots; not changed. |
| R12 | **`src/components/dos/WorkspaceV2Shell.tsx` and `dos.html` are unreferenced.** | grep for importers; `next.config.js` | Cleanup candidates for Phase 7 only after the Phase 1 evidence rule is met. |
| R13 | **Branch protection does not enforce admins**, requires 0 approvals, and the required check is non-strict (a PR can merge with a stale base). | GitHub branch protection API | A PR can be merged before its CI run reflects `main`. Rebase before merge as a protocol rule. |

## Unknowns (to resolve in later phases, not guessed)

| Id | Question | Owner / phase |
| --- | --- | --- |
| U1 | Which of the 62 repo-only migrations were actually applied to production under another name or via the SQL editor? | Phase 1 audit (information_schema check per DOS table the refresh reads) |
| U2 | Does any production workspace have `dos_engagement_levels`, commitments, or groups-simplified flags enabled? (Affects which UI states are reachable in previews.) | Phase 2 inventory, read-only query |
| U3 | Which test workspace may be used for persistence verification on previews? | Ryan, before Phase 5 |
| U4 | "More" → "Apps" rename. | Ryan; explicitly reserved by Linear |
| U5 | The "Product logic — later" list in V10 (rhythm satisfaction, due-soon windows, Apps category membership, Log future-date rule and duration confirm threshold, Fruit on the log form, Schedule repeat/reminder defaults, Circle at creation vs Place, empty-day sheet, "Follow-up" label, My Record Current rules, Scripture storage, per-tab add actions, Purpose record shape, Faithfulness kinds, cross-links, per-entry sharing, Time with God timer, resource-type colour, complete-requires-response, "Who is this for" vs "Linked people", prayer-team sending model, previous assessment results). | Phase 3 spec lists each as unresolved; implementation preserves current behavior. |
| U6 | Whether Community has any DOS-app entry point. | Phase 2 |

## Disagreements between repository and Linear (documented, not resolved)

| Where | Repository says | Linear / V10 says |
| --- | --- | --- |
| Third tab label | "More" (`mobileTabs`) | V10 frames show "Apps"; both sources state production is "More" and the rename is Ryan's. Consistent once read carefully — no action. |
| Demo preview route | README: "deprecated and redirects to `/dos`" | Code: live, token-gated. (Repo-internal disagreement; Phase 1 item.) |
| Meetings structure | Calendar with history beneath | Project description: Calendar / Timeline toggle, no history under the calendar. This is the approved *future* direction, not a conflict with the baseline. |
| Field Contact form order | `dos-field-contact-form` script expects 4 ordered sections | Shipped USA-168 Basic form (3 questions). Repo-internal; script is stale. |

## Phase 0 gate recommendation

**PASS WITH RECORDED RISKS** (R1–R13). No blocker prevents Phase 1 (repository and rules audit), which is documentation-only. Implementation phases remain gated on Phases 1–3 evidence and on the migration/auth prohibitions above.
