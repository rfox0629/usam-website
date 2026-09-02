# Minimal Automation Replacement (USA-97)

Four jobs. No UI, no database, no queue service, no heartbeat subsystem, no
health dashboard, no registry duplication, no hidden issue state.
**Linear and git remain the system of record.**

**Status: source implementation only. NOT deployed. The old dispatcher is still running and untouched.**

## The four jobs

| Job | Module | Purpose |
|---|---|---|
| 1. Runner launcher | `launcher/` | Poll Ready issues, resolve repository, claim, create worktree, start agent |
| 1a. Claude bridge | `claude-bridge/` | Bridge Linear plain-text `@Claude` comments to Claude Code until a native Linear Claude agent exists |
| 2. Review packet + digest | `digest/` | Standardized packets and one grouped daily digest |
| 3. Worktree janitor | `janitor/` | Report unsafe worktrees, prune only provably safe ones |
| 4. Backup trigger | `backup/` | Preflight and coordinate the **existing** `backup/` framework |

## Usage

```bash
node src/replacement/cli.mjs <launcher|claude-bridge|digest|janitor|backup> [--live] [--config PATH]
```

**Dry-run is the default.** Without `--live` nothing is mutated; every intended
mutation is recorded and returned in `plannedMutations`.

```bash
npm run replacement:test        # 94 tests
npm run replacement:launcher    # dry-run
npm run replacement:claude-bridge -- --issue USA-98  # dry-run
npm run replacement:claude-bridge-daemon -- --once    # dry-run poll
npm run replacement:backup      # preflight only
```

## USA-98 Claude lane bridge

Linear stores the working `@Codex` trigger as a structured mention of the Codex
app user. In this workspace, `@Claude` is plain text because no mentionable
Claude app user is registered in Linear. The bridge is the source-controlled
replacement path: it reads an unhandled Linear `@Claude` comment, resolves the
issue's Application label through `repository-registry.json` v2, launches local
Claude Code in the resolved repository, posts the result back to Linear, and
optionally moves the issue to a finish state. Dry-run remains the default.

The persistent daemon runs the same bridge in polling mode:

```bash
node src/replacement/cli.mjs claude-bridge-daemon --live --finish-state "Founder Review"
```

Production Claude runs default to 30 minutes. Short validation runs must pass an
explicit `--claude-timeout-ms` value; the production LaunchAgent wrapper does
not provide a short default.

It records state in `~/.usam-dispatcher/state/claude-bridge.json`, records a
single active task lock in `~/.usam-dispatcher/state/claude-bridge-active.json`,
honors `~/.usam-dispatcher/control/claude-bridge.pause`, and only launches one
Claude task at a time. On restart it clears stale active locks whose owning PID
is no longer alive.

## What this reuses rather than reinventing

| Existing module | Used for |
|---|---|
| `src/runner-cooldowns.mjs` | **USA-68** usage-limit parsing and cooldown classification |
| `src/routing-policy.mjs` | Label/text helpers, founder-comment detection |
| `src/repository-registry.mjs` | Fail-closed registry v2 resolution |
| `src/queue-policy.mjs` | Candidate ordering |

The new code is a thin composition layer. `src/dispatcher.mjs` is **not** modified.

## Fail-closed conditions (Job 1)

Every one of these refuses to launch, with a named error code:

- unknown / unresolvable repository (`REPO_UNRESOLVED`)
- bare repository name (`REPO_BARE_NAME`)
- missing Application label (`APPLICATION_MISSING`)
- **more than one** Application label (`APPLICATION_AMBIGUOUS`)
- missing or unconfigured Runner (`RUNNER_MISSING`)
- missing acceptance criteria (`ACCEPTANCE_CRITERIA_MISSING`)
- issue archived / Done / Canceled / Duplicate (`ISSUE_ARCHIVED`, `ISSUE_TERMINAL`)
- per-runner WIP limit reached (`WIP_LIMIT_REACHED`)
- Founder Review cap of 7 reached (`REVIEW_CAP_REACHED`) — backpressure
- runner cooling down (`RUNNER_COOLING_DOWN`)
- an active session already exists (`DUPLICATE_SESSION`)

**It never consults the retired `Ready for Codex` / `Ready for Claude`
routing labels.** `Ready for Dispatcher` remains only as the workflow queue
label; execution ownership comes from exactly one `Runner -> Claude` or
`Runner -> Codex` label.

## USA-68 — cooldown

Usage/rate-limit signals are classified by the existing tested parser, a reset
time is stored, and the runner is skipped until it elapses. A cooldown on one
runner does not block the other. A Linear comment is posted **only when the
cooldown window changes**, to avoid notification spam.

## USA-73 — founder revision re-pickup

The newest founder comment on a Founder Review issue is examined. Approvals are
ignored; change requests return the issue to In Progress for the **same** runner,
**preserving the existing branch and worktree**. Our own generated comments are
skipped so the loop cannot feed itself, and an already-handled revision is not
re-picked-up — preventing duplicate sessions.

## Job 3 safety model

The janitor **reports far more than it deletes**. It refuses on: dirty tree,
untracked files, unpushed commits, open PR, non-terminal issue, unknown issue
state, unresolvable repository, path outside the allowlist, raw path traversal,
symlink escaping the allowlist, and any protected path.

**Protected paths — never operated on under any circumstances:**
`/Users/ryanfox/Code` (canonical clones) and `/Users/ryanfox/USAM-Automation`
(retired runtime/source layout). An empty `allowlistRoots` is a configuration error, so the
janitor can never run unbounded.

## Job 4 honesty rule

The backup job **never reports healthy when it is not**. Exit 0 alone is not
success: stdout must evidence **both** a database dump **and** a storage export.
It reads credential **presence** only — via macOS Keychain probes for the
services named in `backup/config/backup.env` — and never reads, returns, or logs
a value.

**USA-86 remains authoritative for backup readiness. This job does not satisfy it.**

### Live preflight finding (2026-07-28)

Run against the real `backup/config/backup.env`:

| Prerequisite | Status |
|---|---|
| Database password (Keychain `usam-supabase-db-password`) | ✅ present |
| Encryption passphrase (Keychain `usam-backup-gpg-passphrase`) | ❌ **MISSING** |
| Offsite destination | ❌ **`OFFSITE_MODE="none"`** |

Backups therefore cannot be encrypted and are not copied offsite. This is
concrete evidence for USA-86 and **must not be read as backup readiness**.

## USA-189 consolidated runtime

The replacement launcher and Claude bridge now run from the canonical website
checkout:

`/Users/ryanfox/Code/usam-website/tooling/automation`

Launchd executes the source checkout directly. Runtime state remains in
`/Users/ryanfox/.usam-dispatcher`; there is no copy deployment into
`~/USAM-Automation`.

## Rollback

Rollback is a launchd/source rollback:

1. Restore the prior LaunchAgent plist copies from the evidence directory.
2. Re-bootstrap the affected LaunchAgents.
3. Revert the source commit in `/Users/ryanfox/Code/usam-website`.

Do not recreate the retired source-to-runtime copy workflow.
