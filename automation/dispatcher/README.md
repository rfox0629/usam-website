# USAM Dispatcher V1 Worker Pool

This package is a drop-in V1 dispatcher implementation for the Mac mini automation root. It keeps the existing Linear label routing and isolated git worktree model, but replaces the blocking single-run loop with a controlled worker pool.

## Baseline Audit

The live dispatcher audited on July 21, 2026 had these characteristics:

- `pollOnce()` listed eligible Todo issues and then awaited `handleIssue()` inside the candidate loop.
- `handleIssue()` awaited worktree creation, Linear transition, runner execution, retry, final comment, and In Review transition.
- While a runner was active, the dispatcher process did not continue polling.
- Existing config had `maxWorkers.codex = 1` and `maxWorkers.claude = 1`, but there was no global limit and no in-process pool. Real behavior was effectively one active packet per dispatcher process.
- Locks were JSON files keyed by issue identifier, with stale-lock recovery based on heartbeat age.
- Worktrees and branches were already isolated per issue.
- Runner adapters existed for Codex and Claude, with separate stdout/stderr logs.

## Recommended V1 Defaults

Use `config/dispatcher.config.example.json` as the conservative production starting point:

- `concurrency.globalMax: 2`
- `maxWorkers.codex: 2`
- `maxWorkers.claude: 2`
- `resources.maxActiveBuilds: 1`
- `queue.reviewCeiling: 6`

This allows any two safe packets to run together while preventing all four runner slots from being active at once. It also allows two Codex or two Claude runs if the other runner is idle. To restore legacy behavior, use `config/dispatcher.single-worker-fallback.json` or set:

```json
{
  "concurrency": { "globalMax": 1 },
  "maxWorkers": { "codex": 1, "claude": 1 }
}
```

## Routing

The dispatcher preserves explicit Linear routing:

- Todo + `Ready for Dispatcher` + `Ready for Codex` starts Codex.
- Todo + `Ready for Dispatcher` + `Ready for Claude` starts Claude.
- Missing runner labels, both runner labels, blocked labels, thin scope, and unresolved dependency text are held.
- The dispatcher does not reroute between Codex and Claude unless `routing.allowFallbackReroute` is later implemented and explicitly enabled. V1 keeps this false.

Fast Track and Production Track labels are recorded as `lane` metadata on locks and status output. They do not introduce a separate workflow in V1.

## Conflict Safety

Before claiming an issue, the dispatcher checks:

- Existing blocking lock for the same issue.
- Existing worktree path for the same generated worktree.
- Repository paths declared in the issue title or description.
- Active worktree `git status --short` paths when available.
- Inferred conflict keys from labels/title/description when path evidence is missing.

Path evidence takes precedence over broad metadata. Two issues with explicit, non-overlapping paths can run together even if their broad product label is similar. If path data is missing, metadata keys such as `product:dos`, `area:giving`, or `product:automation` prevent unsafe overlap.

Held packets are written to `state/queue-holds.json` and logged as `issue_held`.

## Resource And Review Guards

Resource checks run before new pickup:

- CPU load average and load-per-CPU from Node `os`.
- Available memory from macOS `vm_stat` when present, falling back to Node `os.freemem()`.
- Free disk from `df -k`.
- Active build count inferred from active locks with `resourceClass: "build"` by default.

When thresholds fail, new pickups are held with a resource-pressure reason. Existing workers are not killed.

The review queue guard uses `queue.reviewCeiling`. When In Review count is at or above the ceiling, eligible packets are held so the dispatcher does not create an excessive founder-review backlog.

## Status Contract

`--status` returns Operations Center-safe JSON by default. It intentionally excludes secrets, raw logs, shell controls, prompt contents, and full filesystem paths.

Top-level shape:

```json
{
  "config": {
    "globalMax": 2,
    "maxWorkers": { "codex": 2, "claude": 2 },
    "reviewCeiling": 6,
    "testMode": true
  },
  "paused": { "global": false, "codex": false, "claude": false },
  "resources": {
    "activeBuildCount": 0,
    "availableMemoryMb": 1385,
    "cpuCount": 10,
    "freeDiskGb": 51.0,
    "freeMemoryMb": 63,
    "loadAvg1": 2.56,
    "loadPerCpu": 0.26,
    "memorySource": "vm_stat"
  },
  "runners": {
    "codex": { "active": 1, "limit": 2, "assignments": [] },
    "claude": { "active": 0, "limit": 2, "assignments": [] }
  },
  "queue": {
    "lastPoll": { "candidateCount": 2 },
    "queueDepth": 2,
    "holds": []
  },
  "recentFailures": [],
  "recentRetries": [],
  "timings": [
    {
      "issue": "USA-100",
      "runner": "codex",
      "status": "completed",
      "timeToPickupMs": 120000,
      "timeToFirstOutputMs": 2400,
      "timeToInReviewMs": 600000
    }
  ]
}
```

Use `--unsafe-status` only from a trusted terminal. It includes local paths for operator debugging and must not be exposed to the browser.

## Control Scripts

`bin/run-dispatcher.sh` loads the automation `.env`, exports the runner path, and executes `src/dispatcher.mjs`.

`bin/dispatcher-control.sh` supports:

- `status`
- `status-unsafe`
- `once`
- `pause global|codex|claude`
- `resume global|codex|claude`

Pause files live in `control/*.pause`.

## Validation

Run the fixture-backed regression suite:

```bash
npm run test:dispatcher-concurrency
```

The tests use temporary git repositories, fixture Linear JSON, and a mock runner. They do not call Linear, Codex, Claude, Supabase, deployment providers, DNS, or production databases.
