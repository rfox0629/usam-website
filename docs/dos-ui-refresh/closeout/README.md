# DOS UI System Audit & Visual Refresh — closeout (USA-239)

Linear: USA-239. Finishes the project after the "DOS UI Foundation V1" release (PR #101, 2026-09-06) without restarting discovery or starting a new redesign. Baseline `origin/main` = `e30a49e`.

| Phase | Deliverable | Where | Status |
| --- | --- | --- | --- |
| 1 | Closeout baseline (commit, open PRs, known failures, rollback point) | USA-239 comments | done |
| 2 | USA-238 server-side USAM boundary | PR #105 (branch `usa-238-kitchen-table-responses`), `docs/dos-ui-refresh/phase-6/usa-238-kitchen-table-responses.md` | ready for Ryan's review |
| 3 | Decisions and precedence reconciled | PR #106: spec v1.2 §9, decision log §E, `app/dos/AGENTS.md`, `app/dos/README.md`, Phase 1 matrix marked historical | safe to merge |
| 4 | Re-audited destructive cleanup | PR #107 (draft) + `../phase-7/usa-234-deletion-manifest.md` closeout classification; PR #100 closed | needs founder approval |
| 5 | Tooling drift repaired | PR #108: reading-plan script, deterministic demo clock, root `CLAUDE.md`, root `AGENTS.md` DOS pointer, re-recorded baselines | safe to merge |
| 6 | Refreshed verification | [verification.md](./verification.md), [a11y-responsive-report.md](./a11y-responsive-report.md) | done (integration branch `ryan/usa-239-closeout-integration`) |
| 7 | Linear reconciled; final report | [final-report.md](./final-report.md) | done — this PR |

## Instruction precedence (final)
For `app/dos/**`, `app/api/dos/**`, `src/components/dos/**`, `components/dos/**`, `src/lib/dos/**`: **Linear project and issue → canonical spec (`phase-3/dos-ui-canonical-spec.md`, v1.2) → V10 reference (visual detail only, with its own labels) → `app/dos/README.md` → root `AGENTS.md` (website/admin; its DOS-specific statements superseded, D1) → phase evidence.** Agents start from `app/dos/AGENTS.md` (Codex) or the root `CLAUDE.md` (Claude); superseded direction is archived under `docs/archive/dos-ui-refresh-superseded/`.
