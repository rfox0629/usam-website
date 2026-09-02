# USA-135 Canonical Dispatcher Routing

Date: 2026-08-01
Worktree: `/Users/ryanfox/Code/usam-website/tooling/automation`

## Local Inventory

Read-only Linear connector export:

- Issue labels exported: 52
- Canonical ownership labels found:
  - `Claude`
  - `Codex`
- Deprecated routing labels found:
  - `Ready for Claude`
  - `Ready for Codex`

Open issue counts from read-only, state-scoped samples:

- `Claude`: 1 open issue with the canonical ownership label.
- `Codex`: 8 open issues with the canonical ownership label.
- `Ready for Claude`: 7 open issues still carry the deprecated label.
  - Ready: 1
  - In Progress: 4
  - Founder Review: 1
  - Backlog: 1
- `Ready for Codex`: 26 open issues still carry the deprecated label.
  - Ready: 6
  - In Progress: 8
  - Founder Review: 4
  - Backlog: 8

The active dispatcher code now treats `Ready for Dispatcher` as the queue
workflow label and routes only from exactly one ownership label:

- `Runner -> Claude`
- `Runner -> Codex`

Deprecated workflow-style routing labels are retained only as blockers in
configuration and policy code:

- `Ready for Claude`
- `Ready for Codex`

Historical pre-USA-64 files still contain the retired labels as preserved
evidence. They are not imported by the active runtime.

## Dependency Map

- `src/dispatch-policy.mjs`: canonical ownership selection, fail-closed missing
  or conflicting ownership, and deprecated routing label rejection.
- `src/dispatcher.mjs`: handoff fallback uses canonical Codex ownership only;
  health reads existing runtime state for invalid ownership, stale queue holds,
  queue backlog, runner, dispatcher, and Claude bridge alerts.
- `src/website-auto-publish-policy.mjs`: preview automation accepts only
  canonical ownership and rejects deprecated routing labels.
- `src/routing-policy.mjs`: repository route text scoring does not depend on
  repository-specific Linear labels.
- `config/dispatcher.config.json`: active label configuration names ownership
  labels, deprecated routing labels, health thresholds, and path/text repository
  routes with `labelNames` disabled.
- `src/replacement/claude-bridge/index.mjs`: already requires exactly one
  `Runner -> Claude` label and uses the production-work bridge prompt.
- `src/replacement/launcher/eligibility.mjs`: already requires exactly one
  `Runner` label and never consults retired routing labels.
- `README.md` and `src/replacement/README.md`: document the canonical model.

## Migration Map

Keep:

- `Claude`
- `Codex`
- `Product`
- `UX`
- `Design`
- `Research`
- `Frontend`
- `Backend`
- `Infrastructure`
- `Automation`
- `Database`
- `Testing`
- `Bug`
- `Ready for Dispatcher`
- `Founder Review`

Replace on active executable issues:

- `Ready for Claude` -> `Claude`
- `Ready for Codex` -> `Codex`

Delete only after live validation:

- `Ready for Claude`
- `Ready for Codex`
- Any repository-routing labels that duplicate the repository registry or issue
  metadata.

## Runtime Evidence

- macOS runtime detected: `Darwin`, macOS 15.6.1.
- `LINEAR_API_KEY` is present in the local shell environment.
- Runtime root exists: `/Users/ryanfox/.usam-dispatcher`.
- USA-135 lock exists at `/Users/ryanfox/.usam-dispatcher/locks/usa-135.json`.
- USA-135 recorded local worktree: `/Users/ryanfox/Code/usam-website/tooling/automation`.
- USA-135 recorded runner command:
  `/Applications/ChatGPT.app/Contents/Resources/codex`.
- USA-135 recorded branch policy:
  `ryan/usa-135-linear-label-simplification-and-canonical-dispatcher-routing`.

## Blocked Live Gates

The shell-based Linear API export was attempted read-only from this worktree, but
the sandbox could not resolve `api.linear.app` (`getaddrinfo ENOTFOUND`). The
Linear connector was available and provided the read-only label and issue counts
above.

The Linear relabel migration, deprecated label deletion, and before/after
migration report were not completed here because those require mutating Linear.

No LaunchAgent reload, label mutation, issue mutation, commit, push, deployment,
or live pilot issue creation was performed in this run.
