# USA-31 Isolation Audit

Generated: 2026-07-22T14:19:19Z

This audit was run from the dispatcher worktree only:

- Worktree: `/Users/ryanfox/USAM-Automation/worktrees/usa-31-codex-20260722141721`
- Branch: `dispatcher/usa-31-codex-20260722141721`
- HEAD: `908ef7124c2c01b18a31a8f630f8a982fc3b5ecc`

No merge, push, deployment, DNS, production database/schema, reset, stash, or cleanup action was performed.

## NCC Worktree

- Owner: Claude Code
- Worktree: `/Users/ryanfox/Documents/GitHub/usam-website-ncc-usa-31`
- Branch: `ryan/usa-31-ncc-parallel-sprint-isolate-claude-work-and-continue`
- HEAD: `c7a1299ecdee8a9cd7fba3aa84daab3831f3e0b5`
- Latest commit: `Add CLAUDE.md, ARCHITECTURE.md, WORKFLOW.md engineering playbook (USA-43)`
- Prior USA-31 WIP commit: `23c109a06df1f2b53f680fd0cdf451f44212f31d`
- Isolation source/base from history: `8ee8c004b22105d52be4442e706d1ad9bd8cd085`
- Merge-base vs local `origin/main`: `cd1dd594356b54f305e7b029b78f4ddce8c5a836`

Current NCC dirty state is untracked-only:

- `.mcp.json`
- `docs/USA-63-ncc-reset-reconciliation-report.md`
- `mockups/ncc-operations-platform-mockup.html`

No tracked NCC files were modified at last read. The active uncommitted task appears to be USA-63 reset/reconciliation and operations-platform mockup work, inferred from the untracked filenames and report heading.

## Preservation

The NCC worktree was not edited. A git-style preservation patch was written outside all worktrees:

- Patch: `/private/tmp/usa-31-ncc-preservation-20260722T141919Z/usa-31-ncc-untracked-wip.patch`
- Checksum file: `/private/tmp/usa-31-ncc-preservation-20260722T141919Z/SHA256SUMS`
- Patch SHA-256: `e8ee5fdd645f914332295693878f046216873e469edbd0e7ef8e71350af37609`
- Patch size: 58,175 bytes

The patch includes the three untracked NCC files listed above. `git apply --check` succeeded in `/private/tmp/usa-31-ncc-preservation-20260722T141919Z/apply-check`.

## Parallel Worktrees

Community work is isolated but actively dirty:

- Worktree: `/Users/ryanfox/Documents/GitHub/usam-website-usa-26-community-qa`
- Branch: `codex/usa-26-community-qa`
- Dirty file count at last read: 39

Three Websites work is isolated but actively dirty:

- Worktree: `/Users/ryanfox/Documents/GitHub/usam-website-usa-30-websites-qa`
- Branch: `codex/usa-30-websites-qa`
- Dirty file count at last read: 21

Primary/canonical checkout remains dirty and should be treated as read-only / not for implementation:

- Worktree: `/Users/ryanfox/Documents/GitHub/usam-website`
- Branch: `ncc-overhaul-phase1`
- Dirty state includes `app/partners/page.tsx`, `.claude/launch.json`, the board-briefing route/component cluster, board briefing images, and `src/lib/board-briefing-*` files.

## Overlap Risks

NCC vs Community:

- `app/dos/app/DosMvpAppClient.tsx`
- `components/RouteAwareSiteFooter.tsx`
- `src/lib/dos/missionary-app.ts`

NCC vs Three Websites:

- `app/robots.ts`
- `app/sitemap.ts`
- `docs/domain-routing-analytics-foundation.md`
- `next.config.js`
- `src/lib/domain-metadata.ts`
- `src/lib/domain-sites.ts`

These files need explicit founder/review reconciliation before any merge sequencing.

## Linear Status

The Linear issue was read successfully. An attempt to post this audit as a Linear comment was cancelled by the MCP client, so this local artifact is the durable fallback record from the Codex lane.

## Approval Gate

Founder Approval is still required before merging NCC, reconciling overlaps, deploying, applying migration repairs, or changing any production database/schema.
