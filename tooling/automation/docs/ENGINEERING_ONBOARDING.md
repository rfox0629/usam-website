# Engineering Onboarding

This guide documents the current local engineering standard for USA Missionaries automation and product work. It is a living operating guide, not an irreversible architecture decision. Material environment or architecture changes should be recorded in Linear and, when appropriate, an ADR or review note.

## Canonical Local Layout

Active repositories live under `/Users/ryanfox/Code/`.

Temporary issue worktrees live under `/Users/ryanfox/USAM-Worktrees/`.

Runtime state, logs, locks, handoffs, publications, and evidence live under `/Users/ryanfox/.usam-dispatcher/`.

Archives, backups, release bundles, and historical runtime copies are preservation material. They are not starting points for new work, and they must not be deleted or replaced without explicit founder approval.

Never start new work from `/Users/ryanfox/Documents/GitHub`, `/Users/ryanfox/Documents/Codex`, `/Users/ryanfox/Documents/Codex 2`, archived repositories, backups, or the retired `/Users/ryanfox/USAM-Automation` path.

## Canonical Repositories

| Repository | Path | Purpose |
| --- | --- | --- |
| `usam-website/tooling/automation` | `/Users/ryanfox/Code/usam-website/tooling/automation` | Dispatcher, Claude bridge, runner policy, local automation, evidence scripts, and operations docs. |
| `usam-website` | `/Users/ryanfox/Code/usam-website` | USA Missionaries public site, DOS surfaces, Kitchen Table Gospel, and Organization OS-facing product work unless a later issue moves that scope. |
| `save-website` | `/Users/ryanfox/Code/save-website` | SAVE public, donor, ministry, and staff portal product work. SAVE is a relationship and trust platform, not a marketplace. |
| `stewardship.capital` | `/Users/ryanfox/Code/stewardship.capital` | Stewardship Capital public/product repository. |
| `theLordsarmy-website` | `/Users/ryanfox/Code/theLordsarmy-website` | Active The Lords Army product repository. It is not an archive candidate. |

Product surfaces own user-facing application code. `tooling/automation` owns orchestration, policy, local runtime control, evidence generation, and backup coordination inside the canonical website checkout. Do not move product scope into automation, and do not patch dispatcher behavior outside this tooling directory.

## Linear Execution Workflow

Linear is the system of record.

The normal flow is:

1. ChatGPT or Chief of Staff captures direction in Linear.
2. Linear issue carries status, labels, owner, repository, and acceptance criteria.
3. Claude or Codex claims exactly one current execution lane.
4. The runner works from the canonical repo or an issue worktree.
5. The runner runs tests, creates review evidence, and opens or updates a branch or draft PR when implementation is authorized.
6. Founder review happens from Linear evidence, preview URLs, screenshots, and PRs.
7. Merge happens only after the required review and explicit authorization.

Each issue has one current execution owner. Ownership can move from Claude to Codex on the same issue only when Linear labels/comments make that handoff explicit. Different repositories may run concurrently; the same repository must have one active writer.

## Manual Sessions

For a manual Codex session, start from the correct canonical repository under `/Users/ryanfox/Code/...` unless the issue explicitly names an existing issue worktree.

For a manual Claude session, start from the same canonical repository rule and verify the current Linear issue, branch, and worktree before making changes.

Before editing, read the full Linear issue description and latest comments. Before posting completion, record changed files, validation commands, branch, commit, PR or preview evidence, blockers, and the next action.

## Branch And Worktree Conventions

Use one issue per branch or worktree. Product implementation should happen in an isolated issue worktree unless the founder explicitly authorizes direct canonical-clone work.

Issue worktrees belong under `/Users/ryanfox/USAM-Worktrees/`. Release worktrees belong under `/Users/ryanfox/USAM-Releases/`.

Do not reuse a stale worktree unless the issue is an intentional revision cycle for the same branch. Do not delete a worktree just because an issue looks old; first verify merge status, PR status, dirty state, untracked files, and active processes.

When implementation is authorized and safe, push the feature branch and open or update a draft PR. Do not merge to `main` unless the issue already contains explicit founder authorization.

## Runtime Architecture

LaunchAgents run from `/Users/ryanfox/Code/usam-website/tooling/automation`.

Dispatcher runtime state is under `/Users/ryanfox/.usam-dispatcher/`:

| Runtime Area | Path |
| --- | --- |
| Control files | `/Users/ryanfox/.usam-dispatcher/control/` |
| Locks | `/Users/ryanfox/.usam-dispatcher/locks/` |
| Repository writer locks | `/Users/ryanfox/.usam-dispatcher/locks/repository-writers/` |
| Logs | `/Users/ryanfox/.usam-dispatcher/logs/` |
| State | `/Users/ryanfox/.usam-dispatcher/state/` |
| Evidence | `/Users/ryanfox/.usam-dispatcher/evidence/` |
| Handoffs | `/Users/ryanfox/.usam-dispatcher/handoffs/` |
| Publications | `/Users/ryanfox/.usam-dispatcher/publications/` |

The repository writer guard prevents two dispatcher-managed writers from owning the same canonical repository at the same time and records manual process evidence when detected. It does not kill unknown manual processes automatically.

## Review And Safety Gates

Founder review is required for production deployments, merges to protected branches, migrations, auth, RLS, tenancy, payments, destructive data operations, cleanup/deletion of old folders, architecture boundary changes, and any action that exposes or changes production data.

Engineering-only review can cover scoped non-production implementation, tests, local evidence scripts, dispatcher policy fixes, and documentation when they do not change product direction or production systems.

Do not run migrations or modify Supabase, authentication, RLS, tenancy, payments, or production data unless a Linear issue explicitly authorizes that exact action and required backup/restore gates are green.

## Secrets And Local Configuration

Secret values belong in approved local environment files, Keychain, or platform-managed secret stores. Never commit `.env` files or secret values.

Evidence reports may record secret names, file paths, and whether required credentials are present. They must not print token, password, passphrase, service-role, cookie, or private-key values.

## Backup And Recovery

LaCie archive material is under `/Volumes/LaCie/USAM-Archive/`. The July 27 archive includes bundles, loose files, and encrypted artifacts that must be verified before cleanup decisions.

Git bundles should be checked with `git bundle verify`. Tar archives should be listed before any restore. Encrypted artifacts require documented recovery instructions and key references, without exposing keys.

Backup evidence should record what was backed up, checksums where available, whether canonical repos and unique local work are covered, and whether a disposable test restore has succeeded.

## Troubleshooting Checklist

Check these before starting or resuming work:

1. The current path is under `/Users/ryanfox/Code/` or `/Users/ryanfox/USAM-Worktrees/`.
2. Linear status and labels match the intended runner and repository.
3. No global or runner pause file exists unless pickup is intentionally paused.
4. Repository writer locks do not show another active owner.
5. No manual Claude/Codex/dev-server process is using the same repository.
6. The canonical clone is not dirty with unrelated work.
7. The branch/worktree matches the Linear issue.
8. Required tests, preview, screenshot, and PR evidence are present before Founder Review.
9. Backup, migration, auth, RLS, payments, and production deployment gates are green before high-risk work.
10. Old folders are treated as preservation targets until USA-139 evidence proves their contents are already merged, already pushed, generated/cache only, or explicitly cleared by the founder.

## DOS application UI rules (added 2026-09-04, DOS UI refresh Phase 7)

Work under `app/dos/**`, `app/api/dos/**`, `src/components/dos/**`, `components/dos/**`, or `src/lib/dos/**` starts from the scoped `app/dos/AGENTS.md`, which points to the canonical UI and behavior specification at `docs/dos-ui-refresh/phase-3/dos-ui-canonical-spec.md` and the verification commands (`npm run typecheck`, `npm run test:dos`, `npm run build`, `npm run test:dos:visual`). Superseded DOS direction is archived under `docs/archive/dos-ui-refresh-superseded/`.
