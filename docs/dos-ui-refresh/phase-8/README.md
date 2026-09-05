# DOS UI System Audit & Visual Refresh — Phase 8: verification and release readiness

Linear: USA-199 (phase) · USA-232 functional, data-safety and permission regression · USA-233 accessibility, responsive, overflow and visual verification · USA-231 release decision, rollback plan and watch list. One docs PR (#101) stacked on #100; nothing deployed.

| Issue | Evidence |
| --- | --- |
| USA-232 | [usa-232-functional-data-safety-permissions.md](./usa-232-functional-data-safety-permissions.md) — every repository suite on the top of the stack; empty diff against `origin/main` for API routes, migrations, middleware; pre-existing failures separated |
| USA-233 | [usa-233-accessibility-responsive-visual.md](./usa-233-accessibility-responsive-visual.md) and the generated [a11y-responsive-report.md](./a11y-responsive-report.md) — 7 widths × 10 screens: overflow, nav opacity, tablist roles, hit areas, console/network errors; visual comparison to the approved references |
| USA-231 | [usa-231-release-decision.md](./usa-231-release-decision.md) — recommendation, PR list in merge order, deploy sequencing, rehearsed rollback, intentionally unchanged areas, known limitations, deferred decisions, watch list |

## Gate check (USA-199: "No release recommendation until functional, data-safety, accessibility, and visual evidence are complete")
All four evidence sets are complete and linked above. The recommendation is "ready for founder review; not deployed" — the release itself is Ryan's decision per repository policy, and the deletion PR (#100) additionally needs explicit approval.

## New tooling
`scripts/dos-a11y-responsive-verification.mjs` (run with `node`, after `npm run build`) regenerates the USA-233 report; it fails only on horizontal overflow or a translucent nav, and lists sub-44px controls for follow-up.
