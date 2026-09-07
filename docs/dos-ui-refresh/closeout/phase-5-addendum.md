# USA-239 Phase 5 addendum — aggregate coverage, repeatable dead-code scan, independent determinism check

Stacks on PR #108 (deterministic demo clock, reading-plan script repair, `CLAUDE.md` / `AGENTS.md` discoverability). Adds the three things #108 leaves open. No product change.

## 1. The reading-plan script is inside `test:dos`
`scripts/new-testament-reading-plan-regression.mjs` rotted for three weeks because nothing ran it: it is not in CI and was not in the aggregate. #108 repairs its needle; this addendum appends `npm run test:new-testament-reading-plan` to `test:dos`, so the aggregate is 41 scripts (42 once PR #105 lands its Kitchen Table boundary script) and the script fails CI the next time the Library card changes. It is offline and runs in well under a second.

## 2. Repeatable dead-code scan
`scripts/dos-dead-code-scan.mjs` (`npm run scan:dos-dead-code`, `--json` for machines; report only, deletes nothing) makes the Phase 7 manifest's method repeatable: every function declared in `app/dos/app/DosMvpAppClient.tsx` whose name appears nowhere else in the repository's code, with the names a regression script still pins listed separately so a cleanup PR knows which script to update. Against `main` `e30a49e`:

| | Phase 7 manifest (2026-09-04) | `main` today |
| --- | --- | --- |
| Functions declared in `DosMvpAppClient.tsx` | — | 913 |
| Referenced only by their declaration | 91 | 82 = 74 unpinned + 8 pinned by a script |

The Phase 4 re-audit (PR #107) reached its list by hand; this scan is the check to run before that PR merges and after any later refactor. Two of the 74, `ConversationFlowDetail` and `ConversationFlowExperience`, are already removed by PR #105, which is why the merge order puts #105 before #107.

## 3. Determinism confirmed on a second platform
#108 proves two identical 16/16 passes on macOS. This addendum repeated the proof on Linux (Chromium 1194, Playwright 1.61) against a fresh `next build --webpack` of the stacked branch: `test:dos:visual --update` recorded 16 `linux-x64` scenes, then two consecutive compare runs matched all 16 byte-for-byte. The Linux baselines were discarded afterwards — Linux baselines stay unrecorded by design (USA-215; CI skips the suite). The accessibility sweep on the same pinned clock reported no horizontal overflow and an opaque bottom nav on every mobile width; the only console entries are the sandbox's blocked font request and the demo route's pre-existing 404, both present in the Phase 8 report.

## Verification for this addendum
`npm run typecheck` · `npm run test:dos` (41 scripts) · `next build --webpack` · `npm run test:dos:visual` ×3 on Linux (record, compare, compare) · `node scripts/dos-a11y-responsive-verification.mjs` · `git diff --check`.
