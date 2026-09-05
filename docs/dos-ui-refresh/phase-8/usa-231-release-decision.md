# USA-231 — Release decision, rollback plan, and post-release watch list

## Recommendation
**Ready for founder review; not deployed.** The stack (#78 → #100) is verified end to end on the top branch: typecheck, the 40-script DOS aggregate, the repository's join/preparation/email/release scripts, the production build, the CI smoke test, 16/16 byte-for-byte visual baselines, the accessibility/responsive/overflow sweep, and a rollback rehearsal. No API, migration, RLS, auth, or flag changed. Release is Ryan's call per repository policy; the sequencing below assumes the stack is merged in order.

## What ships (23 PRs, in merge order)
| Phase | PRs | Nature |
| --- | --- | --- |
| 0–3 | #78 #79 #80 #81 | Docs only (baseline, audit, inventory, canonical spec v1.0) |
| 4 | #82 #83 #84 #85 #86 | Tokens; pure moves of overlays/forms/controls; opaque nav + z ladder; regression coverage in CI |
| 5 | #87 #88 #89 #90 #91 #92 #93 | Pilots: Log/Edit Meeting, Schedule + Person, Calendar/Timeline, Person Record, My Record, Apps launcher; gate + spec v1.1 |
| 6 | #94 #95 #96 #97 #98 | Field, Prayer + My Record panels, shared controls (all More sub-views), Library, evidence |
| 7 | #99 #100 | Archive + manifest (docs); deletions (**draft, founder approval required**) |
| 8 | #101 | Verification reports (docs) |

## Deploy sequencing
1. Merge in stack order (#78 first). Each PR is independent in intent but stacked in git; merging out of order would need rebases.
2. `#100` may be left unmerged without affecting anything above it in the report (it removes only unreferenced code); if it is merged, it goes last among code PRs.
3. Vercel builds `main` automatically; production promotion follows the project's normal flow. No environment variable, migration, or Supabase change is needed.
4. After promotion, the visual baselines apply only to macOS-arm64 runners; CI on Linux skips them by design (USA-215) until Linux baselines are recorded deliberately.

## Rollback plan (rehearsed)
- **Fastest:** Vercel instant rollback to the current production deployment `dpl_9swjVmkN2kk7tKVP6wQKtLtKf5Sg` (commit `de6862f`); the earlier candidate `dpl_EsdGXNATBSJCPLkjEs2fKiT3rVfU` (`828de2c`) remains valid. No data migration means no data rollback is needed.
- **Git:** every PR is a single commit (a few carry one follow-up docs commit); `git revert` applies cleanly — rehearsed on 2026-09-05 by reverting the five newest code commits (#100, #97, #96, #95, #94) in a detached worktree with no conflicts. Reverting a middle PR alone (for example only #96) is also possible because each PR touches distinct regions; typecheck and `test:dos` should be run after any partial revert.
- **Baselines:** reverting a UI PR also reverts its visual baselines, so `npm run test:dos:visual` stays consistent.

## Intentionally unchanged
Home (mobile) and the Dashboard; the three-tab navigation, its production icons and the "More" label; every save path, API contract, migration, RLS policy, flag; Person Timeline and Details tabs; `GuidedJourneyUi` and the participant portal views; the meeting detail record; Groups structure; Settings, placeholders, USAM layer, portal/setup/onboarding, public forms; `AppButton` primary gradient; desktop layouts (tokens and components only).

## Known limitations
- The visual suite is clock-sensitive for date-relative demo rows (P-9); a Dashboard-only diff whose pixels are due-date buckets is drift, not a regression. Freezing the demo clock for the run is the recommended follow-up.
- 16 zero-reference client functions remain because regression scripts pin them (manifest); `scripts/new-testament-reading-plan-regression.mjs` fails on a stale literal (pre-existing).
- Controls under 44px listed in the USA-233 report are legacy controls the refresh did not touch (desktop tables, sheets, secondary buttons); they are a follow-up, not a regression.
- Screenshots were taken on the demo route (synthetic data); the SSO-protected previews render the same code against the production database for Ryan's review.

## Deferred decisions (spec §9; production behavior stands)
D1 `AGENTS.md` wording · D2 "More" → "Apps" · D3 demo route in production · D4 legacy prototype clients/handlers · D5 "Household" copy · D6 Groups V2 · D7 unmerged UI branches · D8 `app/dos/library-preview/` · D9 strict status checks · D10 My Record "Current" rule · D11 Needs-placement block · D12 More-tab "+" FAB · PL-1 rhythm pills · PL-2 app categories · PL-3 Log defaults/rules · PL-4 Schedule defaults · PL-5 circle at creation · PL-6 empty-day sheet / pre-fill / search on Calendar / week view · PL-7 "Follow-up" vs "Feedback", "Upcoming" label · PL-8 My Record per-tab structure · PL-9 Library type colour / step as task screen / assign helper copy · PL-10 prayer "who is this for", follow-up pill.

## Post-release watch list (first 72 hours)
1. **Meetings tab**: the Calendar | Timeline rail on real data — Timeline lists only logged meetings; Needs Logging and the day sheet open; Google-synced events still render in the calendar.
2. **Person Record**: Accountability / Prayer / Fruit "View all" on people with more than three records; the Prayer count line; Journey rows' Continue opening the right assignment instance.
3. **My Record**: "Current" appears only with active assignments or draft assessments; the Private chip opens the sharing panel; per-tab FAB items.
4. **Field**: rows show the circle only for placed people; Log meeting shortcut per row; household/secondary Show toggle.
5. **Bottom nav** on real devices (iOS safe area): opaque bar, FAB above content and beneath the nav, no content hidden under the bar on the longest screens (Person Record, Meetings).
6. **Forms**: Log / Schedule / Person save exactly as before (durations from the stepper land as minutes; attendee chips; sentence-case labels only).
7. **Console/network**: the a11y sweep recorded zero console errors and failed requests on the demo route; watch Vercel runtime logs for the first sessions.
