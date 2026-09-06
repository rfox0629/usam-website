# DOS UI System Audit & Visual Refresh — Phase 7: cleanup and documentation

Linear: USA-200 (phase) · USA-234 archive and deletion manifest. Two stacked PRs: #99 (archive, pointers, manifest — docs only) and #100 (the deletions the manifest proves — opened for founder approval, not merged).

| PR | Content | Risk |
| --- | --- | --- |
| #99 | `docs/archive/dos-ui-refresh-superseded/` (five superseded documents + README), "NEVER RUN" headers on the USA-170 SQL kept in place, scoped `app/dos/AGENTS.md`, README and onboarding pointers, [usa-234-deletion-manifest.md](./usa-234-deletion-manifest.md) | None (moves and docs) |
| #100 | `WorkspaceV2Shell.tsx`, `dos.html`, 91 zero-reference client functions removed; readability script's file list updated | Reversible with one revert; proven by typecheck, `test:dos`, build, 16/16 visual |

## Gate check (USA-200: "Deletion manifest identifies what was removed, evidence of non-use, recovery path, and resulting repository simplification")
All four are in the manifest. Deletion execution waits on founder approval per the repository's onboarding rule; the archive and pointers do not.

## Deliberately not done
Legacy prototype clients and their API handlers (D4), `app/dos/library-preview/` (D8), remote branch deletion, `AppButton tone="black"` retirement, compatibility redirects, the demo route (D3), edits to the root `AGENTS.md` (D1).
