# DOS UI System Audit & Visual Refresh — closeout (USA-239)

Linear: USA-239. Finishes the project after the "DOS UI Foundation V1" release (PR #101, 2026-09-06) without restarting discovery or starting a new redesign. Baseline `origin/main` = `e30a49e`; final application `main` = `0dcf304` (2026-09-08). USA-242 (PR #111 → c3c8e17) merged inside the queue at Ryan's direction.

| Phase | Deliverable | Where | Status |
| --- | --- | --- | --- |
| 1 | Closeout baseline (commit, open PRs, known failures, rollback point) | USA-239 comments | done |
| 2 | USA-238 server-side USAM boundary | PR #105 → `main` e4672fe (Kitchen Table Gospel Responses + boundary), `docs/dos-ui-refresh/phase-6/usa-238-kitchen-table-responses.md` | merged 2026-09-08 |
| 3 | Decisions and precedence reconciled | PR #106 → `main` 8437b34: spec v1.2 §9, decision log §E, `app/dos/AGENTS.md`, `app/dos/README.md`, Phase 1 matrix marked historical | merged 2026-09-07 |
| 4 | Re-audited destructive cleanup | PR #107 → `main` 0dcf304 (regenerated on 63c5b32; 9 files + 74 functions; 15 pinned + 15 second-order retained) + `../phase-7/usa-234-deletion-manifest.md`; PR #100 closed | merged 2026-09-08 (Ryan's approval) |
| 5 | Tooling drift repaired | PR #108 → `main` d2a5103 (deterministic clock, reading-plan script, root `CLAUDE.md`, `AGENTS.md` pointer, baselines); PR #110 → `main` 63c5b32 (reconciled addendum: reading-plan in `test:dos`, `scan:dos-dead-code`) | merged |
| 6 | Refreshed verification | [verification.md](./verification.md), [a11y-responsive-report.md](./a11y-responsive-report.md), [phase-5-addendum.md](./phase-5-addendum.md) | done — integration branch, then per-merge on `main` |
| 7 | Linear reconciled; final report | [final-report.md](./final-report.md) | done — this PR (#109), merged last |

## Instruction precedence (final)
For `app/dos/**`, `app/api/dos/**`, `src/components/dos/**`, `components/dos/**`, `src/lib/dos/**`: **Linear project and issue → canonical spec (`phase-3/dos-ui-canonical-spec.md`, v1.2) → V10 reference (visual detail only, with its own labels) → `app/dos/README.md` → root `AGENTS.md` (website/admin; its DOS-specific statements superseded, D1) → phase evidence.** Agents start from `app/dos/AGENTS.md` (Codex) or the root `CLAUDE.md` (Claude); superseded direction is archived under `docs/archive/dos-ui-refresh-superseded/`.
