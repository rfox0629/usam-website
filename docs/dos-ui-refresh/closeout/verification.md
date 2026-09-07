# Closeout verification (USA-239 Phase 6)

Run on 2026-09-07 against the **integration branch** `ryan/usa-239-closeout-integration` (`c55e3b4`) = `main` `e30a49e` + PR #105 (USA-238) + PR #106 (decisions) + PR #107 (cleanup) + PR #108 (tooling), merged in that order; the one conflict (#105 vs #107 in `DosMvpAppClient.tsx`) was resolved by keeping #105's code and dropping the dead predecessors it replaced. Every command is the repository's own. Pre-existing conditions and closeout regressions are separated.

## Suites
| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | ✓ |
| DOS regression aggregate (40 scripts incl. the new USA-238 boundary checks) | `npm run test:dos` | ✓ 40/40 |
| Lint / config | — | no lint or formatter configuration exists (Phase 1 §3); `test:dos` is the aggregate and CI runs it |
| /join contract, restoration preparation, join email copy, join release routing | `test:join-contract`, `test:preparation`, `test:join-email-em-dash`, `test:join-v2-release` | ✓ |
| New Testament reading-plan regression (corrected in #108) | `npm run test:new-testament-reading-plan` | ✓ (was failing on a stale needle) |
| Production build | `npm run build` | ✓ (47 s) |
| CI smoke (Playwright, production build) | `npm run smoke` | ✓ |
| Visual baselines (16 scenes, byte-for-byte, pinned demo clock) | `npm run test:dos:visual` | 14/16 identical; the 2 differences are **#105's intended changes** — `mobile--log-meeting` (the new collapsed "Kitchen Table responses" row above the sticky primary) and `mobile--library-resource` (the resource section title "Guided Questions" → "Kitchen Table Questions"). Re-record those two baselines in #105 once #108 (the pinned clock) is merged |
| Accessibility / responsive / overflow sweep (7 widths × 10 screens, pinned clock) | `node scripts/dos-a11y-responsive-verification.mjs` → [a11y-responsive-report.md](./a11y-responsive-report.md) | No horizontal overflow at 320 / 375 / 390 / 430 / 768 / 1024 / 1440; bottom nav opaque on every mobile width; pill rails carry `tablist` / `aria-selected` |
| Protected Person UI test (Playwright) | `npm run test:usa-168-person-ui` | ✓ at 390×844, 768×1024, 1440×900 |

## Functional and data-boundary checks
- **Log / Edit / Schedule persistence:** the meeting lifecycle, scheduled-table log, table detail/edit, next steps, roles, invitations and calendar-sync scripts pass; no save path changed in the closeout (the only route edit is the USAM gate in the meetings API).
- **Kitchen Table USAM / non-USAM boundary:** `scripts/dos-log-meeting-form-regression.mjs` exercises `decideUsamWorkspace` (active / approved application → USAM; live public profile → USAM; USA Missionaries owner organization → USAM; another organization, a pending unowned applicant, an archived workspace, a generic workspace → not USAM), asserts `normalizeConversationFlowKey` returns `none` for both gated flows without access, and asserts both meetings-route handlers gate from workspace state and answer 403. Read-only production check: the two real USAM workspaces and the preview household remain USAM; the archived workspace and an unowned pending-review applicant become generic.
- **Person, Field, Prayer, Fruit, Groups/Journeys, My Record, Library, Reports, More:** rendered in the sweep and the visual scenes (Field, Person Record, My Record, Prayer, Library resource, More, Groups, Fruit, Timeline, Calendar); the cleanup's rendering A/B (16 scenes recorded from `main`'s client, verified byte-for-byte on the cleanup branch) proves the deletions change nothing visible.
- **Auth, authorization, API, data ownership:** `git diff --stat origin/main...HEAD -- app/api supabase middleware.ts` on the integration branch shows only `app/api/dos/app/meetings/route.ts` (the USAM gate); no migration, RLS, auth or ownership change. Identity-security, portal-provisioning-auth, portal-rollback, ministry-event-visibility, public-sites and participant-portal parity scripts pass.
- **Widths:** 320 and 390 (mobile), 768/1024/1440 (desktop) in the sweep; 390 @2x and 1440 in the baselines.
- **Keyboard/focus, labels, contrast, 44px targets, reduced motion:** as recorded in the Phase 8 report; the closeout sweep finds one new sub-44px group — the Person views **Segmented** control (Overview / Timeline / Details, 114×36) introduced by USA-236 after the release. Filed as **USA-240** (bounded follow-up in one primitive). Every other refreshed control is ≥ 44px; remaining small controls are legacy (Home, production calendar, Prayer filter, desktop tables/links) as listed in the report.
- **Overflow, safe areas, opaque nav, FAB placement:** no overflow; nav opaque; FAB inset per USA-237 verified visually in the More scene.
- **Loading, empty, error, permission, destructive, retry:** unchanged production components; Save-outranks-Delete and the USA-168 retry model remain asserted by the stabilization script.
- **Console / network:** the only error on every screen is `GET /_vercel/speed-insights/script.js` → 404 on a local `next start` (exists only on Vercel).

## Pre-existing vs closeout
| Condition | Class |
| --- | --- |
| Visual baselines on `main` stale since #102–#104 (form and FAB changed without re-recording) and date-drifting | Pre-existing; repaired by #108 |
| Reading-plan script stale needle | Pre-existing (USA-170); repaired by #108 |
| Meetings API accepted gated flows from any workspace | Pre-existing; closed by #105 |
| Person views Segmented control under 44px | Pre-existing (USA-236); follow-up USA-240 |
| Closeout regressions | **None found** |
