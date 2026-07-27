# USA-59 Dispatcher Concurrency Report

Date: July 21, 2026

## Scope

USA-59 asked for a conservative configurable worker pool for the Mac mini dispatcher, with safe parallel execution, conflict prevention, resource protection, review queue control, routing preservation, status visibility, tests, and a staged validation report.

The live automation files are outside this issue worktree's writable sandbox. I audited them read-only and added the V1 implementation as a drop-in package under `automation/dispatcher/` in this worktree.

## Current Baseline Proven

The live dispatcher at audit time was effectively single-packet:

- Config had `maxWorkers.codex: 1` and `maxWorkers.claude: 1`.
- `pollOnce()` awaited `handleIssue()` for each eligible issue.
- `handleIssue()` awaited the full agent run before returning.
- The July 21 dispatcher log showed polling every roughly 30 seconds until USA-59 was claimed at `2026-07-21T20:41:58Z`, then polling stopped while the Codex runner was active.
- The active USA-59 lock showed `status: running`, a unique branch, and a unique worktree.

Observed machine/resource facts available from the sandbox:

- Disk: about 51 GiB free on the data volume, 88 percent used.
- Load average: between `2.2` and `2.6` during validation.
- CPU count: 8 from Node `os.cpus()`. Direct `sysctl hw.ncpu` was blocked by sandbox permissions.
- `ps` was blocked by sandbox permissions, so active process counts could not be directly verified here.
- `vm_stat` was available. Current status reported about 1.3 GiB available memory, low free memory, and several GiB in memory compression, so memory/resource guards should remain conservative and use available memory rather than raw free memory.

## Implementation Summary

Added `automation/dispatcher/src/dispatcher.mjs` with:

- Configurable worker pool.
- Global concurrency cap.
- Per-runner Codex and Claude caps.
- Worker-slot freeing when a run exits.
- Immediate refill loop when a worker exits before the next poll interval.
- Disk lock recovery and stale active lock reconciliation.
- Heartbeats while runner processes are active.
- Explicit Codex/Claude routing preservation.
- Fixture Linear backend for local validation.
- Safe status contract for Operations Center use.

Added configs:

- `automation/dispatcher/config/dispatcher.config.example.json`
- `automation/dispatcher/config/dispatcher.single-worker-fallback.json`

Added control scripts:

- `automation/dispatcher/bin/run-dispatcher.sh`
- `automation/dispatcher/bin/dispatcher-control.sh`

Added tests:

- `automation/dispatcher/test/dispatcher-concurrency.test.mjs`
- `automation/dispatcher/test/fixtures/mock-runner.mjs`
- `scripts/dispatcher-concurrency-regression.mjs`
- `npm run test:dispatcher-concurrency`

## Validated Behavior

Fixture-backed tests proved:

- Two non-conflicting packets can run concurrently in separate git worktrees.
- Branches and worktrees are isolated per packet.
- Path-overlapping packets are held while unrelated packets can still use capacity.
- Capacity refills after a worker exits.
- Resource-pressure holds are configurable and block new pickup.
- Review-ceiling holds are configurable and block new pickup.
- Stale active locks recover to `crashed` on startup.

Validation command:

```bash
npm run test:dispatcher-concurrency
```

Result:

```text
tests 5
pass 5
fail 0
duration_ms 2567.051583
```

## Recommended Initial Production Limits

Recommended starting point for this Mac mini:

```json
{
  "concurrency": { "globalMax": 2 },
  "maxWorkers": { "codex": 2, "claude": 2 },
  "resources": {
    "minFreeDiskGb": 20,
    "minFreeMemoryMb": 512,
    "maxLoadPerCpu": 1.8,
    "maxActiveBuilds": 1
  },
  "queue": { "reviewCeiling": 6 }
}
```

This does not force four workers. It allows up to two total active packets, with either runner allowed to use the available slots. Increase only after a live staged test shows healthy runner limits, CPU, memory, disk, validation time, and founder review throughput.

Single-worker fallback remains:

```json
{
  "concurrency": { "globalMax": 1 },
  "maxWorkers": { "codex": 1, "claude": 1 }
}
```

## Staged Validation Status

Completed in this worktree:

1. Baseline behavior proven from live code and logs.
2. Two non-conflicting packets run concurrently with fixture Linear data and mock runners.
3. Lock, branch, worktree, and log separation validated in temporary git repos.
4. Capacity refill, conflict holds, resource holds, review holds, and stale-lock recovery validated.

Not completed from this sandbox:

- Live two-packet Linear pickup with real Codex and Claude accounts.
- Direct process inspection with `ps`.
- Direct CPU count with `sysctl`.
- Updating the live automation directory outside this worktree.

## Live Promotion Checklist

Before using the V1 pool on the Mac mini:

1. Keep the current live dispatcher paused.
2. Install the package into the automation root.
3. Start with `dispatcher.single-worker-fallback.json` and run `--once --status`.
4. Switch to the recommended V1 config with `globalMax: 2`.
5. Use harmless fixture or test Linear packets with explicit non-overlapping paths.
6. Confirm both packets reach In Review and no duplicate lock/worktree appears.
7. Watch disk, load, memory, runner account limits, and review backlog before raising limits.

## Founder Approval

Founder approval is still required before live production use. This implementation preserves the dispatcher stop at In Review and does not merge, push, deploy, change DNS, mutate production databases, or perform financial/legal actions.
