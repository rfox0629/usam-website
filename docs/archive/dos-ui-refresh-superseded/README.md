# Archived: direction superseded by the DOS UI canonical specification

Moved here in Phase 7 of the DOS UI System Audit & Visual Refresh (USA-234, 2026-09-04). Nothing in this folder is a rule or a plan; the governing document is [`docs/dos-ui-refresh/phase-3/dos-ui-canonical-spec.md`](../../dos-ui-refresh/phase-3/dos-ui-canonical-spec.md) (precedence in its §0). Files are preserved for history (repository rule: archives are preservation material) and can be recovered with `git log --follow`.

| File | Was | Why archived |
| --- | --- | --- |
| `dos-groups-v2-polish-audit.md` | Groups V2 polish audit | Folded into the spec's §5.12 "by rule" treatment; Groups V2 promotion is decision D6 |
| `dos-groups-v2-shared-leadership-beta-validation.md` | Validation checklist, "Status: Not executed." | Historical; never run (Phase 1 inventory #11) |
| `dos-public-groups-member-portal-rollout.md` | Rollout notes for the public groups member portal | Historical; the rollout is complete and the parity script guards the portal |
| `2026-07-09-dos-groups-production-branch.md` | Release note | Historical |
| `tooling-automation-ci-baseline.md` | A second CI baseline document | Reconciled with `docs/ci-baseline.md`, which stays canonical |

Not moved: `docs/usa-170-*.sql` (a regression script reads them in place; they carry a "NEVER RUN" header instead), `dos.html` and `src/components/dos/WorkspaceV2Shell.tsx` (code; listed in the deletion manifest for founder approval), the `AGENTS.md` DOS statements (D1 pending; a scoped `app/dos/AGENTS.md` now states the precedence).
