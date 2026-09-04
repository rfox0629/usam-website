# Phase 0 — Existing verification baseline

Run 2026-09-04 in the Phase 0 worktree at `828de2c` (the only later commit on `main`, `de6862f`, changes 2 non-DOS share-card files). Environment: macOS, Node v24.13.1, npm 11.8.0, `CI=true NEXT_TELEMETRY_DISABLED=1`, no `.env.local` (matches CI, which also runs without Supabase secrets). Logs: `scratchpad/baseline-logs/*.log` (session-local; summaries reproduced here).

Nothing was fixed. Every result below is the pre-refresh baseline.

## A. CI-equivalent commands (exactly the steps in `.github/workflows/ci.yml`)

| # | Exact command | Exit | Runtime | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `npm ls --depth=0` | 0 | 0s | pass | Lockfile-consistent tree; no missing/invalid/extraneous packages. (`npm ci` was not re-run to avoid deleting `node_modules` in a shared worktree; CI runs it.) |
| 2 | `npm run typecheck` (`tsc --noEmit`) | 0 | 15s | pass | 0 errors |
| 3 | `npm run test:join-contract` | 0 | 0s | pass | 24/24 contract assertions |
| 4 | `npm run test:preparation` | 0 | 1s | pass | Node warning: "Reparsing as ES module" (package.json lacks `"type": "module"`). Pre-existing, cosmetic. |
| 5 | `npm run test:join-email-em-dash` | 0 | 0s | pass | |
| 6 | `npm run build` (`next build`) | 0 | 49s | pass | Logs "Supabase error: Supabase environment variables are not configured." during prerender; expected without env, build still succeeds. |
| 7 | `npm run test:join-v2-release` | 0 | 1s | pass | Phase A + Phase B (boots production build, probes `/join`, `/join?resume=`, `/dos/setup`) all ok |
| 8 | `npm run smoke` (`scripts/ci-smoke.mjs`) | 0 | 8s | pass | Boots `next start` on 127.0.0.1:4173, loads `/` in Chromium, asserts body content is non-trivial. **Covers only the public homepage, not DOS.** Prints nothing on success. |

## B. Offline DOS regression scripts (no env vars, no network; all `npm run test:<name>`)

37 scripts run. **36 pass, 1 fails (pre-existing).** Each is a static/behavioral assertion script; most print only a final "passed" line, so pass/fail totals are per script.

| Script | Exit | Result |
| --- | --- | --- |
| dos-log-meeting-form | 0 | pass |
| dos-schedule-meeting-form | 0 | pass |
| dos-meeting-lifecycle | 0 | pass |
| dos-scheduled-table-log | 0 | pass |
| dos-table-detail-edit | 0 | pass |
| dos-table-next-steps | 0 | pass |
| dos-table-roles | 0 | pass |
| dos-table-invitations | 0 | pass |
| dos-calendar-sync | 0 | pass |
| dos-my-record | 0 | pass |
| dos-prayer-ui | 0 | pass |
| dos-readability | 0 | pass |
| dos-disclosure-section-overflow | 0 | pass |
| dos-fruit-guard | 0 | pass |
| dos-household-people | 0 | pass |
| dos-groups | 0 | pass |
| dos-group-home-ux | 0 | pass |
| dos-group-home-visual | 0 | pass |
| dos-group-home-readiness | 0 | pass |
| dos-group-member-portal | 0 | pass |
| dos-group-join-request-notification | 0 | pass |
| dos-guided-resources | 0 | pass |
| dos-resource-assignments | 0 | pass |
| dos-legacy-group-assignment | 0 | pass (10 ok lines) |
| dos-commitments-accountability | 0 | pass |
| dos-assessment-results | 0 | pass |
| dos-identity-security | 0 | pass |
| dos-portal-provisioning-auth | 0 | pass |
| dos-portal-provisioning-auth-behavior | 0 | pass |
| dos-portal-rollback | 0 | pass |
| dos-ministry-events | 0 | pass |
| dos-quick-review | 0 | pass |
| dos-review-link-send-state | 0 | pass |
| **dos-field-contact-form** | **1** | **FAIL — pre-existing** |
| dos-public-sites | 0 | pass |
| dos-participant-preview-parity | 0 | pass |
| usa-168-stabilization | 0 | pass (25 named behaviors listed in output) |

### Pre-existing failure: `scripts/dos-field-contact-form-regression.mjs`

```
Error: Field Contact must present Person, then Relationship & Ministry, then Household & Family, then Address & Details, in that order.
    at scripts/dos-field-contact-form-regression.mjs:20:1
```

The script (last changed 2026-07-17, commit `510d180` "Redesign DOS contact and meeting forms") string-searches `PersonFormContent` in `DosMvpAppClient.tsx` for four section titles in a fixed order. USA-168 (merged 2026-09-04) restructured the Person form into a "Basic" three-question form with advanced sections hidden, which the USA-168 stabilization script asserts and passes. The two scripts encode contradictory expectations; the older one is stale. **Not in CI, so it does not block merges.** Disposition is a Phase 1 classification item (likely "Obsolete"); it was not modified in Phase 0.

## C. Scripts not run in Phase 0 (and why)

| Script | Reason |
| --- | --- |
| `test:dos-commitments-ui` | Needs `DOS_COMMITMENTS_TEST_BASE_URL`, test email, workspace slug, and a Vercel bypass secret — runs against a deployed, authenticated environment. |
| `test:usa-168-person-ui` | Needs a deployed URL (`USA_168_*` env). Note from prior work: its FAB-overlap assertion cannot fail, so it must not be cited as overlap evidence. |
| `test:dos-participant-e2e`, `test:dos-leader-e2e`, `test:dos-invitation-crawler-safety` | Boot servers / need env (`E2E_*`, `CRAWLER_SAFETY_PORT`) and real workspace fixtures. |
| `test:operations-*`, `test:pco-*`, `test:finance-*`, `test:join-*` (other), `test:mission-domain-routing`, `test:share-cards`, `test:communications-*`, `test:missionary-profile-prayer`, `test:public-profile-prayer-section`, `test:new-testament-reading-plan`, `test:usa-82-launch-validation`, `test:usa-174-launch` | Non-DOS surfaces; out of scope for the DOS UI baseline. They remain available for Phase 8. |

## D. What the existing suite does and does not protect

- **Protected by CI:** typecheck, production build, `/join` contract and routing, public homepage smoke.
- **Protected only by opt-in scripts:** Log Meeting / Schedule Meeting form structure, meeting lifecycle rules, My Record, Prayer UI, readability tokens, DisclosureSection overflow, Fruit guard, Groups, identity/security policies, unsaved-work guard behavior (USA-168 stabilization).
- **Not protected anywhere:** rendered DOS screens (no visual regression), the bottom navigation, Person Record layout, Apps/More launcher, timezone display of historical meetings at the UI level, desktop shell layout. Phase 4 (USA-215) is where this coverage is meant to be added.
