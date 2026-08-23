# USA-70 Execution Environment Repair

Date: 2026-07-22

## Root Cause

The dispatcher launched Codex with `--sandbox workspace-write`, which overrode the user's global Codex config. The primary worktree path was writable, but the real Git metadata for each worktree lived under `/Users/ryanfox/Code/usam-website/.git/worktrees/...` and was only readable through the worktree `.git` pointer file. `git add` therefore could not create `index.lock`.

The same Codex sandbox was launched with network disabled, which prevented reliable GitHub, Vercel, Linear, local server, and screenshot workflows. Claude was launched with `--permission-mode acceptEdits`, which can stall unattended npm, git, Vercel, Linear, or connector actions.

## Launcher Repair

- Codex remains bounded to `workspace-write`.
- Base Codex config remains conservative: no network and no extra writable roots by default.
- Founder-authorized Codex runs receive one extra writable root at invocation time: `/Users/ryanfox/Code/usam-website/.git`.
- Founder-authorized Codex runs enable network only inside the workspace-write sandbox with `sandbox_workspace_write.network_access=true`.
- Founder-authorized Codex runs force `approval_policy="never"` so review work does not stall unattended.
- Local automation Codex runs add `--skip-git-repo-check` when the automation repository is routed directly at `/Users/ryanfox/Code/usam-website/tooling/automation`.
- Codex is not granted `danger-full-access` and does not use `--dangerously-bypass-approvals-and-sandbox`.
- Base Claude config remains conservative with `acceptEdits`.
- Founder-authorized Claude runs replace `acceptEdits` with `bypassPermissions` at invocation time so authorized review work does not wait for unattended approvals.
- Runner environment now includes:
  - `RUNNER_REVIEW_AUTHORIZED`
  - `RUNNER_ISSUE_BRANCH`
  - `RUNNER_ALLOWED_REVIEW_ACTIONS`
  - `RUNNER_BLOCKED_ACTIONS`

## Preserved Blocks

Always prohibited:

- Merge to main/master/production/prod
- Production deploy
- Production promotion
- DNS changes
- Production database/schema changes
- Destructive filesystem/repository actions
- Unrelated worktrees
- Unrelated external communications

Founder-authorized review actions are limited to commit, push the issue branch, create/update a protected Vercel preview, generate screenshots, expose review assets, and post review details to Linear.

## Regression Coverage

`npm test` now includes `scripts/dispatcher-execution-environment-regression.mjs`, which proves:

- Base Codex config does not grant review network access or Git metadata write access globally.
- Founder-authorized Codex invocation includes the repo `.git` metadata as writable.
- Founder-authorized local automation invocation includes `--skip-git-repo-check` without inheriting website Git metadata access.
- Founder-authorized Codex invocation has sandbox network enabled.
- Founder-authorized Codex invocation is non-interactive and not unrestricted.
- Base Claude config does not globally use `bypassPermissions`.
- Founder-authorized Claude invocation is non-interactive.
- A real Git worktree can create a commit when its metadata is writable.
- Authorized issue policy allows commit.
- Authorized issue policy allows pushing only the issue branch.
- Authorized issue policy allows protected preview creation.
- Unauthorized issue policy blocks push and preview.
- Production branch push/deploy/promotion/DNS/database/destructive actions remain blocked.
- In Review transition remains blocked without a usable review package.

## Remaining Limitations

- The dispatcher still relies on runner prompt compliance plus deterministic policy tests; it does not intercept every possible raw shell binary invocation.
- Vercel preview protection depends on the existing project/team settings.
- Linear, GitHub, and Vercel live writes can still fail if credentials expire or remote services are unavailable.
