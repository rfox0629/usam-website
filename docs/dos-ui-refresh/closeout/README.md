# DOS UI System Audit & Visual Refresh — closeout (USA-239)

Linear: USA-239. Finishes the project after the "DOS UI Foundation V1" release (PR #101, 2026-09-06) without restarting discovery or starting a new redesign. Baseline `origin/main` = `e30a49e`.

| Phase | Deliverable | Where |
| --- | --- | --- |
| 1 | Closeout baseline (commit, open PRs, known failures, rollback point) | USA-239 comments |
| 2 | USA-238 server-side USAM boundary | PR #105 (branch `usa-238-kitchen-table-responses`), `docs/dos-ui-refresh/phase-6/usa-238-kitchen-table-responses.md` |
| 3 | Decisions and precedence reconciled | spec v1.2 §9, decision log §E, `app/dos/AGENTS.md`, `app/dos/README.md`, Phase 1 matrix marked historical — this PR |
| 4 | Re-audited destructive cleanup | `../phase-7/usa-234-deletion-manifest.md` (revalidated), replacement cleanup PR |
| 5 | Tooling drift repaired | reading-plan script, deterministic demo clock, dead-code re-detection — tooling PR |
| 6 | Refreshed verification | [verification.md](./verification.md) |
| 7 | Linear reconciled; final report | [final-report.md](./final-report.md) |

## Instruction precedence (final)
For `app/dos/**`, `app/api/dos/**`, `src/components/dos/**`, `components/dos/**`, `src/lib/dos/**`: **Linear project and issue → canonical spec (`phase-3/dos-ui-canonical-spec.md`, v1.2) → V10 reference (visual detail only, with its own labels) → `app/dos/README.md` → root `AGENTS.md` (website/admin; its DOS-specific statements superseded, D1) → phase evidence.** Agents start from `app/dos/AGENTS.md`; superseded direction is archived under `docs/archive/dos-ui-refresh-superseded/`.
