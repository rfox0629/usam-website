# USA-224 — Pilot review gate and canonical-spec corrections

Branch `ryan/usa-224-pilot-gate` (stacked on USA-223). Docs only: no application code changes.

## What was reviewed
The six pilot PRs (#87 USA-216, #88 USA-217, #89 USA-218, #90 USA-222, #91 USA-220, #92 USA-223), each with a Vercel preview (listed in [README.md](./README.md)), screenshots at 390×844 @2x (320 for rails) and 1440×900, and the functional workflows exercised on the demo route: log and edit a meeting, schedule a meeting, add and edit a person, switch Calendar / Timeline and open a day and a meeting, open a Person's Overview / Timeline / Details and its records, open My Record's sections and the sharing panel, open every launcher tile.

## Functional verification (per PR, unchanged data paths)
- Every pilot passed `npm run typecheck`, `npm run test:dos` (40 scripts, including the 72 USA-168 stabilization behaviors, meeting lifecycle, scheduled-table log, table roles / invitations / next steps, calendar sync, My Record, prayer UI, participant-portal parity) and `npm run build`.
- No `app/api/dos/**` request or response shape, migration, RLS, auth, or flag changed (B10); no handler, sheet, or save path was edited; protected baselines (Home, Dashboard, nav, Person Timeline / Details) are byte-identical across the six PRs.

## Corrections recorded (spec v1.1)
Nine corrections, P-1 … P-9, in `phase-3/decision-log.md` §D and marked *[v1.1]* in `phase-3/dos-ui-canonical-spec.md`: PillRail fade only on overflow; Meetings search shared by both views; calendar key lists only present kinds; Person header without "set by you"; "Next meeting" label kept; the Right now band as one surface with hairline groups; PageHeader "More" mobile only; no My Record Settings control; the visual suite's clock-drift rule.

## Unresolved decisions carried into Phase 6 (spec §9)
D1–D12 and PL-1 … PL-10 unchanged. None blocks a Phase 6 batch; each batch keeps production behavior where a decision is pending, as the pilots did.

## Rollback
Revert the branch commit (docs only).
