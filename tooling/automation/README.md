# USAM Automation Dispatcher

One-time bootstrap for the local USAM Linear dispatcher:

`Ryan -> ChatGPT -> Linear -> automatic Claude or Codex pickup`

This is intentionally small and local-first. It polls Linear, claims eligible issues, creates isolated git worktrees, runs the selected agent, writes Linear comments/status updates, and stops at `In Review` unless an active website revision is still in founder iteration.

## Repository Layout

- Canonical source checkout: `/Users/ryanfox/Code/usam-website`
- Automation source and live launchd runtime: `/Users/ryanfox/Code/usam-website/tooling/automation`
- Canonical website repo: `/Users/ryanfox/Code/usam-website`
- Issue worktrees: `/Users/ryanfox/USAM-Worktrees`
- Release worktrees: `/Users/ryanfox/USAM-Releases`
- Runtime state: `/Users/ryanfox/.usam-dispatcher`

The automation tooling orchestrates work only. Product code is built from website worktrees attached to the canonical website repo, and locks/logs/manifests/publications/screenshots/temp files live under the runtime-state root.

The old duplicate `/Users/ryanfox/USAM-Automation` runtime and the separate `/Users/ryanfox/Code/usam-automation` source checkout are retired after live validation. LaunchAgents execute `tooling/automation` directly; runtime data remains outside Git under `/Users/ryanfox/.usam-dispatcher`.

## Current Mode

- Test mode: enabled
- Codex concurrency: 1
- Claude concurrency: 1
- Merge/deploy/DNS/production database/external communication actions: forbidden by prompt and dispatcher policy unless explicitly authorized per issue (see [Production Authorization](#production-authorization))

## Eligibility

An issue is eligible only when all are true:

- Status is `Todo`, or the issue is `In Progress` / `In Review` with a new founder revision request after the last completed runner cycle or review package
- Label `Ready for Dispatcher` is present
- Exactly one ownership label is present: `Runner -> Codex` or `Runner -> Claude`
- Legacy dispatcher pickup ignores deprecated routing labels such as `Ready for Codex` and `Ready for Claude`
- `Blocked` and `Needs Discussion` are absent
- No active lock exists

The Claude bridge has its own repaired production lane. It accepts both fresh `@Claude` comments and the canonical `Ready` + `Ready for Dispatcher` + `Ready for Claude` pickup on Claude-labeled issues, posts an `issue_claimed` acknowledgement, suppresses duplicate triggers, and uses the 30-minute production Claude timeout.

Founder revision reclaim preserves the assigned runner, supersedes the prior completed/review-blocked lock without deleting history, reuses the existing issue branch/worktree when healthy, and includes all founder comments newer than the prior completion in the next runner prompt. If a terminal failed lock is present, the dispatcher archives it only after confirming no runner process is active and preserving the failure metadata, stdout, and stderr paths. Ambiguous founder comments are held in the queue rather than guessed.

Active website revision cycles use preview-first iteration mode: once the revision is committed/pushed and the exact protected Vercel preview URL is verified to render, the dispatcher keeps the issue `In Progress` and posts only the issue ID/title, verified preview URL, one update sentence, and any true blocker. Screenshots, long review packages, changed-file summaries, validation narratives, known-limitations sections, estimated review time, formal `In Review` status, and test submissions are reserved for later merge-readiness unless the founder explicitly requests them.

Routing:

- `Runner -> Codex` -> local Codex runner
- `Runner -> Claude` -> Claude production-work bridge / Claude Code lane

## Production Authorization

By default the dispatcher is review-only: runners may commit, push the issue branch, and produce a protected preview/review package, but merge, production deploy, DNS, production database/schema, destructive, and unrelated-communication actions are always prohibited, and claim/completion comments say so explicitly.

Two canonical, machine-readable Linear labels opt a specific issue into more:

- **`Founder Approved — Production`** — issue-scoped authorization to, after required validation/CI and without bypassing branch protection: commit validated changes, push the issue branch, create/update a pull request, merge to `main`, perform a normal (non-promotion) Vercel production deployment, and confirm production deployment status. It does **not** authorize production database/schema writes, destructive operations, DNS changes, financial/legal actions, or unrelated external communications — those always need separate, explicit authorization. Deployment *promotion* is never granted by this label.
- **`Founder Approved — Production Data`** — a second, independent opt-in label that authorizes only the exact production data mutations documented in the issue itself, after pre-write validation and a rollback/revocation plan. It is never implied by `Founder Approved — Production`, and vice versa.

Both labels are configured in `config/dispatcher.config.json` under `linear.labelFounderApprovedProduction` / `linear.labelFounderApprovedProductionData` and are evaluated fresh from the current issue's labels on every claim, prompt build, and completion — never cached or inherited from a related issue. Adding a label to an `In Progress` issue takes effect on the next follow-up/claim cycle; removing it blocks new production actions from that point on. Authorization text in the issue body/comments (e.g. "merge to main", "confirm production deployment Ready") is never sufficient by itself — only the label is canonical, matching the guardrail that words like `deploy`, `main`, or `production` must never be inferred as authorization.

Claim comments, runner prompts, safety notes, and completion reports all state the effective permissions plainly (e.g. `Production authorization: "Founder Approved — Production" label present...`), and the lock record persists which authorization labels were present when the action was taken (`lock.productionAuthorization`). See `src/production-authorization.mjs` for the detection logic and `scripts/dispatcher-production-authorization-regression.mjs` for the acceptance-test coverage, including USA-157/USA-158-style flows.

## Required Config

Create `/Users/ryanfox/.usam-dispatcher/.env` from `.env.example`:

```sh
LINEAR_API_KEY=lin_api_...
```

Do not put live secrets in the repository, commit them, or paste them into Linear comments or logs.

## Control

```sh
/Users/ryanfox/Code/usam-website/tooling/automation/bin/control.sh status
/Users/ryanfox/Code/usam-website/tooling/automation/bin/control.sh health
/Users/ryanfox/Code/usam-website/tooling/automation/bin/control.sh alerts
/Users/ryanfox/Code/usam-website/tooling/automation/bin/control.sh inspect-queue
/Users/ryanfox/Code/usam-website/tooling/automation/bin/control.sh pause global
/Users/ryanfox/Code/usam-website/tooling/automation/bin/control.sh resume global
/Users/ryanfox/Code/usam-website/tooling/automation/bin/control.sh pause codex
/Users/ryanfox/Code/usam-website/tooling/automation/bin/control.sh resume codex
/Users/ryanfox/Code/usam-website/tooling/automation/bin/control.sh pause claude
/Users/ryanfox/Code/usam-website/tooling/automation/bin/control.sh resume claude
/Users/ryanfox/Code/usam-website/tooling/automation/bin/control.sh once
```

Pause files live in `/Users/ryanfox/.usam-dispatcher/control/`.

## Health Reporting

The background service writes fresh dispatcher heartbeat and health snapshots while idle, paused, polling, and running an agent.

- Heartbeat: `/Users/ryanfox/.usam-dispatcher/state/heartbeat.json`
- Full health snapshot: `/Users/ryanfox/.usam-dispatcher/state/health.json`
- Current alerts: `/Users/ryanfox/.usam-dispatcher/state/alerts.json`
- Queue holds and ineligible reasons: `/Users/ryanfox/.usam-dispatcher/state/queue-holds.json`
- Runner availability and versions: `/Users/ryanfox/.usam-dispatcher/state/runner-registry.json`
- Sanitized workforce dashboard feed: `/Users/ryanfox/.usam-dispatcher/state/workforce-status.json`
- Sanitized lifecycle events: `/Users/ryanfox/.usam-dispatcher/events/workforce-events-YYYY-MM-DD.jsonl`

Alerts cover missing Linear credentials, stale heartbeat, stale polling, Claude bridge failures/staleness, unavailable runners, missing runner processes, failed/crashed locks, invalid ownership labels, issues held in `Ready for Dispatcher` for more than two minutes, and queue backlog.

The workforce feed is the only supported machine-readable dashboard contract. A website dashboard must read it through a controlled backend/API process that redacts and serves the JSON; do not expose local files, shell commands, or runtime directories directly to a browser.

## Launchd

The LaunchAgent source plist lives at:

`/Users/ryanfox/Code/usam-website/tooling/automation/launchd/com.usam.dispatcher.plist`

Installed copy:

`/Users/ryanfox/Library/LaunchAgents/com.usam.dispatcher.plist`

## State

- Locks: `/Users/ryanfox/.usam-dispatcher/locks/`
- Issue worktrees: `/Users/ryanfox/USAM-Worktrees/`
- Release worktrees: `/Users/ryanfox/USAM-Releases/`
- JSONL logs: `/Users/ryanfox/.usam-dispatcher/logs/`
- Publication manifests and screenshots: `/Users/ryanfox/.usam-dispatcher/publications/`
- Completion manifests: `/Users/ryanfox/.usam-dispatcher/manifests/completions/`
- State snapshots: `/Users/ryanfox/.usam-dispatcher/state/`
- Temporary artifacts and caches: `/Users/ryanfox/.usam-dispatcher/tmp/`
