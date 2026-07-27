import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const DISPATCHER_STALE_MINUTES = 5;
const RUNNER_STALE_MINUTES = 10;
const LOCK_STALE_MINUTES = 15;

type HealthTone = "amber" | "blue" | "green" | "muted" | "red";
type RegistryStatus = "error" | "integration_missing" | "not_configured" | "ready";

type DispatcherState = "error" | "offline" | "paused" | "running" | "stale" | "unknown";
type RunnerState = "available" | "busy" | "error" | "offline" | "paused" | "stale" | "unknown";

type SupabaseErrorLike = {
  code?: string;
  message?: string;
} | null | undefined;

type DispatcherRow = {
  dispatcher_key: string;
  display_name: string;
  heartbeat_at: string | null;
  last_poll_at: string | null;
  last_successful_pickup_at: string | null;
  recovery_guidance: string | null;
  state: "error" | "offline" | "paused" | "running" | "unknown";
  test_mode: boolean;
  updated_at: string;
  version: string | null;
};

type RunnerRow = {
  active_since: string | null;
  availability: "available" | "busy" | "error" | "offline" | "paused" | "unknown";
  current_issue_identifier: string | null;
  current_issue_title: string | null;
  display_name: string;
  heartbeat_at: string | null;
  paused: boolean;
  recovery_guidance: string | null;
  runner_key: string;
  runner_type: "claude" | "codex";
  updated_at: string;
  version: string | null;
};

type WorktreeRow = {
  branch_name: string | null;
  completed_at: string | null;
  issue_identifier: string;
  issue_title: string | null;
  last_seen_at: string | null;
  lock_state: "locked" | "released" | "stale" | "unknown" | "unlocked";
  recovery_guidance: string | null;
  runner_key: string | null;
  runner_type: "claude" | "codex" | null;
  started_at: string | null;
  status: "abandoned" | "active" | "completed" | "failed" | "unknown";
  updated_at: string;
  worktree_key: string;
};

type LockRow = {
  acquired_at: string | null;
  branch_name: string | null;
  expires_at: string | null;
  heartbeat_at: string | null;
  issue_identifier: string | null;
  lock_key: string;
  recovery_guidance: string | null;
  released_at: string | null;
  runner_key: string | null;
  runner_type: "claude" | "codex" | null;
  state: "active" | "expired" | "released" | "stale" | "unknown";
  updated_at: string;
};

type ExecutionEventRow = {
  attempt: number;
  event_type:
    | "completed"
    | "failed"
    | "heartbeat"
    | "lock_acquired"
    | "lock_released"
    | "manual_note"
    | "offline_detected"
    | "paused"
    | "pickup"
    | "resumed"
    | "retry_scheduled"
    | "retry_started"
    | "stale_detected";
  issue_identifier: string | null;
  issue_title: string | null;
  occurred_at: string;
  recovery_guidance: string | null;
  runner_key: string | null;
  runner_type: "claude" | "codex" | null;
  summary: string | null;
  worktree_key: string | null;
};

export type OperationsDispatcher = {
  displayName: string;
  heartbeatAt: string | null;
  key: string;
  lastPollAt: string | null;
  lastSuccessfulPickupAt: string | null;
  recoveryGuidance: string | null;
  state: DispatcherState;
  stateLabel: string;
  testMode: boolean;
  tone: HealthTone;
  updatedAt: string;
  version: string | null;
};

export type OperationsRunner = {
  activeSince: string | null;
  availability: RunnerState;
  currentIssueIdentifier: string | null;
  currentIssueTitle: string | null;
  displayName: string;
  elapsedSeconds: number | null;
  heartbeatAt: string | null;
  key: string;
  paused: boolean;
  recoveryGuidance: string | null;
  runnerType: "claude" | "codex";
  tone: HealthTone;
  updatedAt: string;
  version: string | null;
};

export type OperationsWorktree = {
  branchName: string | null;
  completedAt: string | null;
  issueIdentifier: string;
  issueTitle: string | null;
  key: string;
  lastSeenAt: string | null;
  lockState: "locked" | "released" | "stale" | "unknown" | "unlocked";
  recoveryGuidance: string | null;
  runnerKey: string | null;
  runnerType: "claude" | "codex" | null;
  startedAt: string | null;
  status: "abandoned" | "active" | "completed" | "failed" | "unknown";
  tone: HealthTone;
  updatedAt: string;
};

export type OperationsLock = {
  acquiredAt: string | null;
  branchName: string | null;
  expiresAt: string | null;
  heartbeatAt: string | null;
  issueIdentifier: string | null;
  key: string;
  recoveryGuidance: string | null;
  releasedAt: string | null;
  runnerKey: string | null;
  runnerType: "claude" | "codex" | null;
  state: "active" | "expired" | "released" | "stale" | "unknown";
  tone: HealthTone;
  updatedAt: string;
};

export type OperationsExecutionEvent = {
  attempt: number;
  eventType: ExecutionEventRow["event_type"];
  issueIdentifier: string | null;
  issueTitle: string | null;
  occurredAt: string;
  recoveryGuidance: string | null;
  runnerKey: string | null;
  runnerType: "claude" | "codex" | null;
  summary: string | null;
  tone: HealthTone;
  worktreeKey: string | null;
};

export type OperationsReviewItem = {
  detail: string;
  guidance: string;
  key: string;
  timestamp: string | null;
  title: string;
  tone: HealthTone;
};

export type OperationsRegistryData = {
  dispatchers: OperationsDispatcher[];
  error?: string;
  generatedAt: string;
  history: OperationsExecutionEvent[];
  locks: OperationsLock[];
  reviewQueue: OperationsReviewItem[];
  runners: OperationsRunner[];
  status: RegistryStatus;
  worktrees: OperationsWorktree[];
};

function isMissingOperationsTable(error: SupabaseErrorLike) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || message.includes("operations_dispatchers")
    || message.includes("operations_runners")
    || message.includes("operations_worktrees")
    || message.includes("operations_locks")
    || message.includes("operations_execution_events")
    || message.includes("schema cache")
    || message.includes("does not exist")
    || message.includes("could not find the table");
}

function sanitizeRegistryText(value: string | null | undefined, maxLength = 180) {
  if (!value) {
    return null;
  }

  const redacted = value
    .replace(/\b[A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD)[A-Z0-9_]*\s*=\s*("[^"]*"|'[^']*'|[^\s,;]+)/gi, "[redacted secret]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[redacted token]")
    .replace(/(?:\/Users|\/private\/var|\/private\/tmp|\/var|\/tmp|\/home)\/[A-Za-z0-9._~@%+=:,/-]+/g, "[local path]")
    .replace(/[A-Za-z]:\\[^\s,;]+/g, "[local path]")
    .trim();

  if (redacted.length <= maxLength) {
    return redacted;
  }

  return `${redacted.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function requiredText(value: string | null | undefined, fallback: string, maxLength = 180) {
  return sanitizeRegistryText(value, maxLength) ?? fallback;
}

function timestampMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function minutesSince(value: string | null | undefined, now: Date) {
  const time = timestampMs(value);
  return time === null ? null : (now.getTime() - time) / 60000;
}

function isOlderThan(value: string | null | undefined, minutes: number, now: Date) {
  const age = minutesSince(value, now);
  return age === null || age > minutes;
}

function elapsedSecondsSince(value: string | null | undefined, now: Date) {
  const time = timestampMs(value);
  return time === null ? null : Math.max(0, Math.floor((now.getTime() - time) / 1000));
}

function dispatcherState(row: DispatcherRow, now: Date): DispatcherState {
  if (row.state === "offline" || (!row.heartbeat_at && !row.last_poll_at)) {
    return "offline";
  }

  if (row.state === "error") {
    return "error";
  }

  if (isOlderThan(row.heartbeat_at ?? row.last_poll_at, DISPATCHER_STALE_MINUTES, now)) {
    return "stale";
  }

  if (row.state === "paused") {
    return "paused";
  }

  return row.state === "running" ? "running" : "unknown";
}

function runnerState(row: RunnerRow, now: Date): RunnerState {
  if (row.paused || row.availability === "paused") {
    return "paused";
  }

  if (row.availability === "offline" || !row.heartbeat_at) {
    return "offline";
  }

  if (row.availability === "error") {
    return "error";
  }

  if (isOlderThan(row.heartbeat_at, RUNNER_STALE_MINUTES, now)) {
    return "stale";
  }

  return row.availability;
}

function dispatcherTone(state: DispatcherState): HealthTone {
  if (state === "running") {
    return "green";
  }

  if (state === "paused") {
    return "blue";
  }

  if (state === "stale" || state === "unknown") {
    return "amber";
  }

  return "red";
}

function runnerTone(state: RunnerState): HealthTone {
  if (state === "available") {
    return "green";
  }

  if (state === "busy" || state === "paused") {
    return "blue";
  }

  if (state === "stale" || state === "unknown") {
    return "amber";
  }

  return "red";
}

function worktreeTone(row: WorktreeRow): HealthTone {
  if (row.lock_state === "stale" || row.status === "abandoned") {
    return "amber";
  }

  if (row.status === "failed") {
    return "red";
  }

  if (row.status === "completed") {
    return "green";
  }

  if (row.status === "active") {
    return "blue";
  }

  return "muted";
}

function lockTone(row: LockRow, now: Date): HealthTone {
  if (row.state === "released") {
    return "green";
  }

  if (row.state === "expired" || row.state === "stale") {
    return "red";
  }

  if (row.expires_at && timestampMs(row.expires_at) !== null && timestampMs(row.expires_at)! < now.getTime()) {
    return "red";
  }

  if (row.state === "active" && isOlderThan(row.heartbeat_at ?? row.updated_at, LOCK_STALE_MINUTES, now)) {
    return "amber";
  }

  return row.state === "active" ? "blue" : "muted";
}

function eventTone(eventType: ExecutionEventRow["event_type"]): HealthTone {
  if (eventType === "completed" || eventType === "lock_released") {
    return "green";
  }

  if (eventType === "failed" || eventType === "offline_detected") {
    return "red";
  }

  if (eventType === "retry_scheduled" || eventType === "stale_detected") {
    return "amber";
  }

  return eventType === "paused" || eventType === "retry_started" ? "blue" : "muted";
}

function stateLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDispatcher(row: DispatcherRow, now: Date): OperationsDispatcher {
  const state = dispatcherState(row, now);

  return {
    displayName: requiredText(row.display_name, "Dispatcher"),
    heartbeatAt: row.heartbeat_at,
    key: requiredText(row.dispatcher_key, "dispatcher"),
    lastPollAt: row.last_poll_at,
    lastSuccessfulPickupAt: row.last_successful_pickup_at,
    recoveryGuidance: sanitizeRegistryText(row.recovery_guidance, 260),
    state,
    stateLabel: stateLabel(state),
    testMode: Boolean(row.test_mode),
    tone: dispatcherTone(state),
    updatedAt: row.updated_at,
    version: sanitizeRegistryText(row.version, 80),
  };
}

function toRunner(row: RunnerRow, now: Date): OperationsRunner {
  const availability = runnerState(row, now);

  return {
    activeSince: row.active_since,
    availability,
    currentIssueIdentifier: sanitizeRegistryText(row.current_issue_identifier, 40),
    currentIssueTitle: sanitizeRegistryText(row.current_issue_title, 140),
    displayName: requiredText(row.display_name, stateLabel(row.runner_type)),
    elapsedSeconds: row.active_since && (availability === "busy" || row.current_issue_identifier)
      ? elapsedSecondsSince(row.active_since, now)
      : null,
    heartbeatAt: row.heartbeat_at,
    key: requiredText(row.runner_key, row.runner_type),
    paused: Boolean(row.paused) || availability === "paused",
    recoveryGuidance: sanitizeRegistryText(row.recovery_guidance, 260),
    runnerType: row.runner_type,
    tone: runnerTone(availability),
    updatedAt: row.updated_at,
    version: sanitizeRegistryText(row.version, 80),
  };
}

function toWorktree(row: WorktreeRow): OperationsWorktree {
  return {
    branchName: sanitizeRegistryText(row.branch_name, 90),
    completedAt: row.completed_at,
    issueIdentifier: requiredText(row.issue_identifier, "Unknown", 40),
    issueTitle: sanitizeRegistryText(row.issue_title, 140),
    key: requiredText(row.worktree_key, "worktree", 90),
    lastSeenAt: row.last_seen_at,
    lockState: row.lock_state,
    recoveryGuidance: sanitizeRegistryText(row.recovery_guidance, 260),
    runnerKey: sanitizeRegistryText(row.runner_key, 80),
    runnerType: row.runner_type,
    startedAt: row.started_at,
    status: row.status,
    tone: worktreeTone(row),
    updatedAt: row.updated_at,
  };
}

function toLock(row: LockRow, now: Date): OperationsLock {
  return {
    acquiredAt: row.acquired_at,
    branchName: sanitizeRegistryText(row.branch_name, 90),
    expiresAt: row.expires_at,
    heartbeatAt: row.heartbeat_at,
    issueIdentifier: sanitizeRegistryText(row.issue_identifier, 40),
    key: requiredText(row.lock_key, "lock", 90),
    recoveryGuidance: sanitizeRegistryText(row.recovery_guidance, 260),
    releasedAt: row.released_at,
    runnerKey: sanitizeRegistryText(row.runner_key, 80),
    runnerType: row.runner_type,
    state: row.state,
    tone: lockTone(row, now),
    updatedAt: row.updated_at,
  };
}

function toExecutionEvent(row: ExecutionEventRow): OperationsExecutionEvent {
  return {
    attempt: row.attempt,
    eventType: row.event_type,
    issueIdentifier: sanitizeRegistryText(row.issue_identifier, 40),
    issueTitle: sanitizeRegistryText(row.issue_title, 140),
    occurredAt: row.occurred_at,
    recoveryGuidance: sanitizeRegistryText(row.recovery_guidance, 260),
    runnerKey: sanitizeRegistryText(row.runner_key, 80),
    runnerType: row.runner_type,
    summary: sanitizeRegistryText(row.summary, 220),
    tone: eventTone(row.event_type),
    worktreeKey: sanitizeRegistryText(row.worktree_key, 90),
  };
}

function buildReviewQueue(
  dispatchers: OperationsDispatcher[],
  runners: OperationsRunner[],
  worktrees: OperationsWorktree[],
  locks: OperationsLock[],
  history: OperationsExecutionEvent[],
) {
  const queue: OperationsReviewItem[] = [];

  for (const dispatcher of dispatchers) {
    if (dispatcher.state === "offline" || dispatcher.state === "stale" || dispatcher.state === "error") {
      queue.push({
        detail: `${dispatcher.stateLabel}. Last poll ${dispatcher.lastPollAt ? "recorded" : "missing"}.`,
        guidance: dispatcher.recoveryGuidance ?? "Check dispatcher heartbeat source, credentials, and the last poll job before retrying pickups.",
        key: `dispatcher-${dispatcher.key}`,
        timestamp: dispatcher.heartbeatAt ?? dispatcher.updatedAt,
        title: dispatcher.displayName,
        tone: dispatcher.tone,
      });
    }
  }

  for (const runner of runners) {
    if (runner.availability === "offline" || runner.availability === "stale" || runner.availability === "error") {
      queue.push({
        detail: `${stateLabel(runner.runnerType)} runner is ${stateLabel(runner.availability)}${runner.currentIssueIdentifier ? ` on ${runner.currentIssueIdentifier}` : ""}.`,
        guidance: runner.recoveryGuidance ?? "Confirm the runner heartbeat and current lock before assigning new work.",
        key: `runner-${runner.key}`,
        timestamp: runner.heartbeatAt ?? runner.updatedAt,
        title: runner.displayName,
        tone: runner.tone,
      });
    }
  }

  for (const worktree of worktrees) {
    if (worktree.status === "failed" || worktree.status === "abandoned" || worktree.lockState === "stale") {
      queue.push({
        detail: `${worktree.issueIdentifier}. ${stateLabel(worktree.status)} worktree with ${stateLabel(worktree.lockState)} lock.`,
        guidance: worktree.recoveryGuidance ?? "Review the latest execution event, confirm no runner is active, then clear or retry through the approved dispatcher workflow.",
        key: `worktree-${worktree.key}`,
        timestamp: worktree.lastSeenAt ?? worktree.updatedAt,
        title: worktree.issueTitle ?? worktree.key,
        tone: worktree.tone,
      });
    }
  }

  for (const lock of locks) {
    if (lock.state === "expired" || lock.state === "stale" || lock.tone === "red") {
      queue.push({
        detail: `${lock.issueIdentifier ?? "Unassigned"} lock is ${stateLabel(lock.state)}.`,
        guidance: lock.recoveryGuidance ?? "Confirm the owning runner is stopped before clearing this lock outside the UI.",
        key: `lock-${lock.key}`,
        timestamp: lock.heartbeatAt ?? lock.expiresAt ?? lock.updatedAt,
        title: lock.key,
        tone: lock.tone,
      });
    }
  }

  for (const event of history) {
    if (event.eventType === "failed" || event.eventType === "retry_scheduled" || event.eventType === "stale_detected" || event.eventType === "offline_detected") {
      queue.push({
        detail: `${event.issueIdentifier ?? "No issue"} - ${stateLabel(event.eventType)} - attempt ${event.attempt}`,
        guidance: event.recoveryGuidance ?? "Use the dispatcher runbook for recovery; this Operations Center is read-only.",
        key: `event-${event.eventType}-${event.issueIdentifier ?? event.occurredAt}-${event.attempt}`,
        timestamp: event.occurredAt,
        title: event.summary ?? event.issueTitle ?? "Execution event",
        tone: event.tone,
      });
    }
  }

  return queue
    .sort((a, b) => (timestampMs(b.timestamp) ?? 0) - (timestampMs(a.timestamp) ?? 0))
    .slice(0, 12);
}

export async function loadOperationsRegistry(): Promise<OperationsRegistryData> {
  const now = new Date();
  const generatedAt = now.toISOString();

  const empty = {
    dispatchers: [],
    generatedAt,
    history: [],
    locks: [],
    reviewQueue: [],
    runners: [],
    worktrees: [],
  };

  if (!isSupabaseAdminConfigured()) {
    return {
      ...empty,
      error: "Supabase admin environment variables are not configured.",
      status: "not_configured",
    };
  }

  const supabase = createSupabaseAdminClient();
  const [
    dispatchersResult,
    runnersResult,
    worktreesResult,
    locksResult,
    historyResult,
  ] = await Promise.all([
    supabase
      .from("operations_dispatchers")
      .select("dispatcher_key, display_name, state, test_mode, last_poll_at, last_successful_pickup_at, heartbeat_at, version, recovery_guidance, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("operations_runners")
      .select("runner_key, runner_type, display_name, availability, current_issue_identifier, current_issue_title, paused, active_since, heartbeat_at, version, recovery_guidance, updated_at")
      .order("runner_type", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("operations_worktrees")
      .select("worktree_key, issue_identifier, issue_title, runner_key, runner_type, branch_name, status, lock_state, started_at, completed_at, last_seen_at, recovery_guidance, updated_at")
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("operations_locks")
      .select("lock_key, issue_identifier, runner_key, runner_type, branch_name, state, acquired_at, expires_at, released_at, heartbeat_at, recovery_guidance, updated_at")
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("operations_execution_events")
      .select("issue_identifier, issue_title, runner_key, runner_type, worktree_key, event_type, attempt, summary, recovery_guidance, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(40),
  ]);
  const results: Array<{ error: SupabaseErrorLike }> = [
    dispatchersResult,
    runnersResult,
    worktreesResult,
    locksResult,
    historyResult,
  ];
  const missingRegistry = results.some((result) => isMissingOperationsTable(result.error));
  const firstError = results.find((result) => result.error)?.error;

  if (missingRegistry) {
    return {
      ...empty,
      error: "Operations registry tables are not installed. Apply the USA-53 migration after founder approval.",
      status: "integration_missing",
    };
  }

  if (firstError) {
    return {
      ...empty,
      error: firstError.message ?? "Unable to load operations registry.",
      status: "error",
    };
  }

  const dispatchers = ((dispatchersResult.data ?? []) as DispatcherRow[]).map((row) => toDispatcher(row, now));
  const runners = ((runnersResult.data ?? []) as RunnerRow[]).map((row) => toRunner(row, now));
  const worktrees = ((worktreesResult.data ?? []) as WorktreeRow[]).map(toWorktree);
  const locks = ((locksResult.data ?? []) as LockRow[]).map((row) => toLock(row, now));
  const history = ((historyResult.data ?? []) as ExecutionEventRow[]).map(toExecutionEvent);
  const reviewQueue = buildReviewQueue(dispatchers, runners, worktrees, locks, history);

  return {
    ...empty,
    dispatchers,
    history,
    locks,
    reviewQueue,
    runners,
    status: "ready",
    worktrees,
  };
}
