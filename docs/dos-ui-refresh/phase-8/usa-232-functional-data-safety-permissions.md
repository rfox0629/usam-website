# USA-232 — Full functional, data-safety, and permission regression

Run on branch `ryan/usa-199-phase-8-verification` (the top of the release stack; rebased onto #99 on 2026-09-05 so that PR #100's deletions are outside the release, and every suite re-run after the rebase) on 2026-09-04/05. Every command below is the repository's own; nothing was skipped or weakened. Results are in the table; pre-existing failures are separated from refresh regressions.

## Suite results
| Check | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | ✓ |
| DOS regression aggregate (40 scripts: meeting lifecycle, scheduled-table log, table detail/edit, next steps, roles, invitations, calendar sync, My Record, prayer UI, readability, disclosure overflow, groups, legacy group assignment, group member portal, participant-portal parity, guided resources, resource assignments, assessment results, identity security, portal provisioning auth (static + behavior), portal rollback, ministry event visibility, quick review, review link send-state, public sites, USA-168 stabilization (72 behaviors), field contact form, design tokens, form primitives, UI controls, …) | `npm run test:dos` | ✓ 40/40 |
| /join provisioner contract | `npm run test:join-contract` | ✓ |
| Restoration preparation summary | `npm run test:preparation` | ✓ |
| Join email copy | `npm run test:join-email-em-dash` | ✓ |
| Production build | `npm run build` | ✓ |
| /join application and resume routing | `npm run test:join-v2-release` | ✓ |
| CI smoke (Playwright against the production build) | `npm run smoke` | ✓ |
| Visual baselines (16 scenes, byte-for-byte) | `npm run test:dos:visual` | ✓ 16/16, **three consecutive passes** after the Phase 8 fixes (three baselines re-recorded deliberately for the 44px hit-area fixes: Person Record, My Record, Log Meeting). After the rebase onto #99 the local calendar day had rolled over (Sep 4 → Sep 5): eight date-relative scenes differed only in date strings ("Friday, September 4" → "Saturday, September 5", "4 days ago" → "5 days ago", the Today cell, due buckets) — the recorded P-9 drift, confirmed pixel by pixel — and were re-recorded, then verified twice more |
| Accessibility / responsive / overflow (USA-233) | `node scripts/dos-a11y-responsive-verification.mjs` | see [usa-233](./usa-233-accessibility-responsive-visual.md) |
| Lint | — | the repository has no lint or formatter configuration (Phase 1 §3); typecheck and the string-anchored scripts are the enforcement |
| Person UI (Playwright, protected UI test) | `npm run test:usa-168-person-ui` | ✓ at 390×844, 768×1024 and 1440×900 (its locator for the group back control updated to the canonical back arrow; see USA-233) |

## Critical workflows and data persistence
The refresh changed presentation and composition only. The evidence that persistence is unchanged is structural, not just observational:
- **No API route, migration, RLS policy, or middleware changed**: `git diff --stat origin/main...HEAD -- app/api supabase middleware.ts` is empty. The stack's merge-base with `origin/main` is `de6862f`, the production deployment's commit.
- **`src/lib/dos/`**: only `text-tokens.ts` (design tokens) changed.
- **Every save path is the production one**: Log / Edit Meeting (`MeetingFormContent` submit), Schedule (`ScheduleMeetingForm`), Add / Edit Person (`PersonFormContent`), My Record (`onSave` / `submitMyRecord`), Prayer (`onCreatePrayerRequest` etc.), resource assignments and accountability handlers — none was edited; the pilots and batches only changed the JSX around them (each PR's evidence page lists the untouched handlers). The USA-168 stabilization behaviors (operation-ID retries, canonical sync resumption, review claim release, Save-outranks-Delete, no reminder on edit) pass unchanged.
- **Editable surfaces keep entered work** (B7): `useUnsavedWorkGuard`, `DiscardChangesDialog`, and the editable `Sheet` / task-screen contract moved as a pure move in USA-211 (byte-identical screenshots) and are asserted by the stabilization script.
- **Timezone and historical meetings** (B9): `displayTimeZoneForValue` and the calendar-date helpers untouched; the Timeline (USA-218) formats through the same helpers.

## Authentication, authorization, RLS, and API boundary
- No change to `app/api/dos/**` request or response shapes, to any migration, to RLS, to auth, or to flag semantics (B10) — proven by the empty diff above.
- `dos-identity-security`, `dos-portal-provisioning-auth` (static and behavior), `dos-portal-rollback`, `dos-ministry-event-visibility`, `dos-public-sites`, and the participant-portal parity script are all inside `test:dos` and pass.
- Advanced Feature flags (`dos_engagement_levels` visibility-only contract) untouched; engagement stays hidden unless the flag is on (USA-217, USA-227 evidence).
- Previews share the production Supabase project; every screenshot in this project was taken on the token-gated demo route with synthetic data — no production data was written.

## Destructive actions
Delete paths (person, meeting, prayer request, My Record entry, group) were not edited; their confirmations remain (`window.confirm` on My Record delete, the Sheet-level confirmations elsewhere). Save still outranks Delete on the Person form (stabilization script).

## Pre-existing failures (not refresh regressions)
| Script | Status | Why | Disposition |
| --- | --- | --- | --- |
| `scripts/new-testament-reading-plan-regression.mjs` | fails at `HEAD` and at `origin/main` | asserts the literal `onOpenGuidedResource(resource)` which the featured card lost when USA-170 scoped opens by assignment | Not in `test:dos` or CI; left for a deliberate fix outside this project |
| `scripts/dos-field-contact-form-regression.mjs` (Phase 0 failure) | fixed in USA-217 | asserted the pre-USA-168 form | Rewritten to the shipped form and added to `test:dos` |

## Refresh regressions found and fixed during the project
None outstanding. Defects found by the suites during the work were fixed before each PR (PillRail fade on short rails, P-1; the Timeline scene clicking the wrong role; a Prayer patch that briefly removed two grid constants — caught by typecheck before commit).
