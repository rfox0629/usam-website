# USA-147 Dispatcher Observability

## Root Cause

Linear delegation was being interpreted as “someone should work on this,” but the live dispatcher requires a separate execution contract before it will claim anything. A candidate issue must satisfy Linear state, dispatcher-ready label, exactly one runner signal, deterministic repository routing, no blocking locks, and compatible runtime state. When one of those fields was missing or conflicting, the prior observability path often required reading logs manually.

## Runtime Contract

The canonical runtime remains `/Users/ryanfox/Code/usam-website/tooling/automation`, launched by the current LaunchAgent wrapper. Runtime data remains outside Git under `/Users/ryanfox/.usam-dispatcher/`.

The dispatcher now writes:

- `/Users/ryanfox/.usam-dispatcher/state/workforce-status.json`
- `/Users/ryanfox/.usam-dispatcher/events/workforce-events-YYYY-MM-DD.jsonl`
- existing health, heartbeat, lock, queue-hold, and runner-registry state files

## Workforce Feed Schema

`workforce-status.json` has schema version `usam.workforce-status.v1`.

Top-level fields:

- `schemaVersion`
- `generatedAt`
- `workforce`
- `dispatcher`
- `dispatcherStatus`
- `runners`
- `activeRuns`
- `queuedIssues`
- `stalledOrFailedWork`
- `recentEvents`
- `reviewReadyDeliverables`
- `inspection`

Each active run includes issue, runner, repository, branch, worktree, current step, heartbeat, latest commit when available, and process state.

Each queued issue includes issue, runner if known, hold reason, and the canonical eligibility report with satisfied, missing, and conflicting conditions.

## Lifecycle Events

Events use schema version `usam.workforce-event.v1`.

Supported events:

- `issue_discovered`
- `eligibility_passed`
- `eligibility_failed`
- `issue_queued`
- `issue_claimed`
- `runner_started`
- `heartbeat`
- `commit_detected`
- `tests_started`
- `tests_completed`
- `preview_ready`
- `founder_review_ready`
- `runner_failed`
- `retry_scheduled`
- `stalled`
- `completed`

Events include timestamp, issue, runner, repository, current step, and redacted metadata. Prompt text, raw runner output, tokens, passwords, cookies, and authorization values are redacted before being written.

## Dashboard Consumption

USA-50 should consume the feed through a controlled backend process that reads `workforce-status.json`, optionally tails the event JSONL file, and returns sanitized JSON to the dashboard. Do not expose local files, runtime directories, or shell execution directly to a browser.

## Routing Rule

Repository selection is deterministic and visible. A default repository may be present in config, but an issue with no matching repository route is reported as ineligible with `no repository route matched`; it is not silently treated as executable work.

## Pilot Safety

For one-shot validation, operators may set `USAM_DISPATCHER_ISSUE_FILTER=USA-123` to restrict the local dispatcher process to that issue identifier. The LaunchAgent does not set this variable, so normal polling remains unchanged.
