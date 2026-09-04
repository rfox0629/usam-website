# DOS UI System Audit & Visual Refresh — Phase 1: repository and rules audit

Linear: USA-192 (phase) · USA-204 (instructions/Markdown) · USA-203 (stale UI, routes, flags, styles) · USA-206 (config) · USA-212 (conflict matrix and decisions).

Evidence-only. No file outside `docs/dos-ui-refresh/phase-1/` was changed. Audited at `de6862f` on 2026-09-04.

| Deliverable | File |
| --- | --- |
| Agent-instruction and Markdown inventory with precedence | [01-instruction-and-markdown-inventory.md](./01-instruction-and-markdown-inventory.md) |
| Stale UI implementations, routes, flags, hard-coded styles, branches | [02-stale-ui-routes-flags-hardcoded-styles.md](./02-stale-ui-routes-flags-hardcoded-styles.md) |
| Formatting / build / lint / workspace configuration audit | [03-config-build-lint-audit.md](./03-config-build-lint-audit.md) |
| Conflict matrix, safe resolutions, Ryan decision list | [04-conflict-matrix-and-decisions.md](./04-conflict-matrix-and-decisions.md) |

Headline findings:

1. No precedence rule exists; the root `AGENTS.md` (2026-05-12) predates the DOS app and contradicts it in seven places.
2. The README rule "make DOS UI fixes in `DosMvpAppClient.tsx` first" is the root cause of the 46,898-line file; 32 regression scripts string-anchor on that file, so extraction breaks tests even when behavior is unchanged.
3. Two text ladders and two blues coexist; `#94A3B8` light-gray text appears 133 times; three overlay primitives and eight tab arrays duplicate the same patterns.
4. Eleven decisions are reserved for Ryan (D1–D11); none blocks Phase 2 or Phase 3 drafting. Repository instructions forbid agent merges, so every PR in this project stays open for Ryan.

Gate: **evidence delivered; Phase 2 may start.**
