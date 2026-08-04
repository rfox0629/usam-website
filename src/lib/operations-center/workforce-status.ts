export const OPERATIONS_CENTER_SCHEMA_VERSION = "usam.operations-center.v1";
export const WORKFORCE_STATUS_SCHEMA_VERSION = "usam.workforce-status.v1";

export type RunnerKey = "claude" | "codex" | "dispatcher";
export type SourceStatus = "error" | "live" | "stale" | "unavailable";
export type OperationsState =
  | "blocked_failed"
  | "claimed"
  | "complete"
  | "delegated"
  | "dispatcher_eligible"
  | "founder_review"
  | "idle"
  | "preview_ready"
  | "queued"
  | "stale_offline"
  | "unavailable"
  | "working";

export type OperationsSource = {
  detail: string;
  fetchedAt: string | null;
  status: SourceStatus;
};

export type WorkforceCard = {
  branch: string | null;
  commit: string | null;
  currentStep: string | null;
  currentIssue: string | null;
  detail: string;
  elapsedSeconds: number | null;
  latestActivityAt: string | null;
  name: "Claude" | "Codex" | "Dispatcher";
  previewUrl: string | null;
  prUrl: string | null;
  repository: string | null;
  runner: RunnerKey;
  startedAt: string | null;
  state: OperationsState;
  stale: boolean;
};

export type OperationsWorkItem = {
  assignee: string | null;
  branch: string | null;
  commit: string | null;
  currentStep: string;
  dispatcherEligible: boolean | null;
  issue: string;
  linearDelegate: string | null;
  linearUrl: string | null;
  latestActivityAt: string | null;
  owner: string;
  prUrl: string | null;
  previewUrl: string | null;
  repository: string | null;
  runner: "claude" | "codex" | "unknown";
  state: OperationsState;
  stateDetail: string;
  title: string;
  worktree: string | null;
};

export type FounderReviewItem = {
  branch: string | null;
  checks: string[];
  commit: string | null;
  deliveredSummary: string;
  decisionRequired: string;
  issue: string;
  latestActivityAt: string | null;
  linearUrl: string | null;
  prUrl: string | null;
  previewUrl: string | null;
  productionChanged: boolean | null;
  repository: string | null;
  runner: string | null;
  screenshots: string[];
  title: string;
};

export type BackupVisibility = {
  detail: string;
  recommendation: string;
  status: SourceStatus;
};

export type OperationsAlert = {
  code: string;
  detail: string;
  issue: string | null;
  severity: "amber" | "red";
};

export type OperationsActivity = {
  at: string | null;
  event: string;
  issue: string | null;
  repository: string | null;
  runner: string | null;
  summary: string;
};

export type OperationsCenterData = {
  activeWork: OperationsWorkItem[];
  alerts: OperationsAlert[];
  backupVisibility: BackupVisibility;
  cards: WorkforceCard[];
  completedWork: OperationsWorkItem[];
  founderReviewQueue: FounderReviewItem[];
  generatedAt: string;
  recentActivity: OperationsActivity[];
  schemaVersion: typeof OPERATIONS_CENTER_SCHEMA_VERSION;
  sources: {
    linear: OperationsSource;
    workforceFeed: OperationsSource;
  };
  summary: {
    blockedFailed: number;
    claimed: number;
    complete: number;
    delegated: number;
    dispatcherEligible: number;
    founderReview: number;
    idle: number;
    previewReady: number;
    queued: number;
    staleOffline: number;
    working: number;
  };
  unavailableData: string[];
};

export type LinearIssueNode = {
  assignee?: { name?: unknown } | null;
  attachments?: { nodes?: Array<{ title?: unknown; url?: unknown }> | null } | null;
  branchName?: unknown;
  completedAt?: unknown;
  createdAt?: unknown;
  delegate?: { name?: unknown } | null;
  identifier?: unknown;
  labels?: { nodes?: Array<{ name?: unknown; parent?: { name?: unknown } | null }> | null } | null;
  project?: { name?: unknown } | null;
  startedAt?: unknown;
  state?: { name?: unknown; type?: unknown } | null;
  title?: unknown;
  updatedAt?: unknown;
  url?: unknown;
};

const STALE_FEED_SECONDS = 300;
const STALE_LINEAR_STARTED_MS = 24 * 60 * 60 * 1000;
const MAX_LIST_ITEMS = 80;
const MAX_ACTIVITY_ITEMS = 40;
const ACTIVE_CLAIM_SECONDS = 30 * 60;
const TOKEN_VALUE_RE =
  /(lin_api_[A-Za-z0-9._-]+|sk-[A-Za-z0-9._-]+|ghp_[A-Za-z0-9._-]+|github_pat_[A-Za-z0-9._-]+|vercel_[A-Za-z0-9._-]+)/g;
const SECRET_KEY_RE = /(authorization|bearer|cookie|credential|password|private.?key|prompt|secret|stderr|stdin|stdout|token)/i;
const LOCAL_PATH_RE = /\/(?:Users|private|var)\/[^\s"'<>)]*/g;
const VERCEL_SHARE_RE = /([?&]_vercel_share=)[^&\s"'<>)]*/g;

const emptySummary: OperationsCenterData["summary"] = {
  blockedFailed: 0,
  claimed: 0,
  complete: 0,
  delegated: 0,
  dispatcherEligible: 0,
  founderReview: 0,
  idle: 0,
  previewReady: 0,
  queued: 0,
  staleOffline: 0,
  working: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value.slice(0, MAX_LIST_ITEMS) : [];
}

export function redactOperationsText(value: unknown, fallback = "Unavailable", maxLength = 220) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value
    .replace(TOKEN_VALUE_RE, "[redacted]")
    .replace(VERCEL_SHARE_RE, "$1[redacted]")
    .replace(LOCAL_PATH_RE, "[local path]")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return fallback;
  }

  if (SECRET_KEY_RE.test(normalized)) {
    return "[redacted]";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

function optionalText(value: unknown, maxLength = 180) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return redactOperationsText(value, "Unavailable", maxLength);
}

function isoDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value);
    const allowed =
      url.protocol === "https:"
      && (
        url.hostname === "linear.app"
        || url.hostname === "github.com"
        || url.hostname === "raw.githubusercontent.com"
        || url.hostname === "uploads.linear.app"
        || url.hostname === "vercel.com"
        || url.hostname.endsWith(".vercel.app")
      );

    if (!allowed) {
      return null;
    }

    url.searchParams.delete("_vercel_share");
    return url.toString().slice(0, 320);
  } catch {
    return null;
  }
}

function repositoryName(value: unknown, pathValue?: unknown) {
  const explicit = optionalText(value, 80);
  if (explicit && explicit !== "[redacted]" && !explicit.includes("[local path]")) {
    if (explicit === "website") return "usam-website";
    if (explicit === "automation") return "usam-automation";
    if (explicit === "save") return "save-website";
    return explicit;
  }

  if (typeof pathValue === "string") {
    const clean = pathValue.replace(/\/+$/, "");
    const basename = clean.split("/").filter(Boolean).pop();
    return basename ? redactOperationsText(basename, "Unknown repository", 80) : null;
  }

  return null;
}

function worktreeName(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const clean = value.replace(/\/+$/, "");
  const basename = clean.split("/").filter(Boolean).pop();
  return basename ? redactOperationsText(basename, "worktree", 96) : null;
}

function runnerKey(value: unknown): "claude" | "codex" | "unknown" {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("claude")) return "claude";
  if (normalized.includes("codex")) return "codex";
  return "unknown";
}

function elapsedSeconds(startedAt: string | null, now: Date) {
  const startedMs = startedAt ? Date.parse(startedAt) : 0;
  if (!startedMs) {
    return null;
  }

  return Math.max(0, Math.floor((now.getTime() - startedMs) / 1000));
}

function isStaleAt(value: string | null, now: Date, thresholdSeconds = STALE_FEED_SECONDS) {
  const timestamp = value ? Date.parse(value) : 0;
  if (!timestamp) {
    return true;
  }

  return now.getTime() - timestamp > thresholdSeconds * 1000;
}

function cardRunnerKey(value: unknown): RunnerKey | null {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("dispatcher")) return "dispatcher";
  if (normalized.includes("claude")) return "claude";
  if (normalized.includes("codex")) return "codex";
  return null;
}

function labelForRunner(runner: RunnerKey) {
  if (runner === "claude") return "Claude";
  if (runner === "codex") return "Codex";
  return "Dispatcher";
}

function normalizeState(value: unknown): OperationsState {
  const text = String(value || "").toLowerCase();

  if (text.includes("preview")) return "preview_ready";
  if (text.includes("founder") || text.includes("review")) return "founder_review";
  if (text.includes("complete") || text.includes("done") || text.includes("success")) return "complete";
  if (text.includes("fail") || text.includes("block") || text.includes("crash") || text.includes("cooldown")) return "blocked_failed";
  if (text.includes("stale") || text.includes("offline")) return "stale_offline";
  if (text.includes("idle") || text.includes("available") || text.includes("monitoring")) return "idle";
  if (text.includes("claim")) return "claimed";
  if (text.includes("run") || text.includes("work") || text.includes("execut")) return "working";
  if (text.includes("eligible")) return "dispatcher_eligible";
  if (text.includes("queue") || text.includes("ready") || text.includes("pause")) return "queued";

  return "unavailable";
}

function activeRunState(run: Record<string, unknown>) {
  const currentStep = redactOperationsText(run.currentStep, "", 100);
  const status = redactOperationsText(run.status, "", 100);
  const state = normalizeState(`${currentStep} ${status}`);
  return state === "unavailable" ? "working" : state;
}

function queueItemState(eligibility: Record<string, unknown> | null, reason: string) {
  const queueState = redactOperationsText(eligibility?.queueState, "", 80);
  const state = normalizeState(`${queueState} ${reason}`);
  if (state !== "unavailable") {
    return state;
  }

  return eligibility?.eligible === true ? "dispatcher_eligible" : "queued";
}

function stateCountKey(state: OperationsState): keyof OperationsCenterData["summary"] | null {
  const stateCountKeys: Record<OperationsState, keyof OperationsCenterData["summary"] | null> = {
    blocked_failed: "blockedFailed",
    claimed: "claimed",
    complete: "complete",
    delegated: "delegated",
    dispatcher_eligible: "dispatcherEligible",
    founder_review: "founderReview",
    idle: "idle",
    preview_ready: "previewReady",
    queued: "queued",
    stale_offline: "staleOffline",
    unavailable: null,
    working: "working",
  };

  return stateCountKeys[state];
}

function summarize(
  items: readonly OperationsWorkItem[],
  reviews: readonly FounderReviewItem[],
  alerts: readonly OperationsAlert[],
  completedWork: readonly OperationsWorkItem[] = [],
) {
  const summary = { ...emptySummary };

  for (const item of items) {
    const key = stateCountKey(item.state);
    if (key) {
      summary[key] += 1;
    }
  }

  summary.founderReview += reviews.length;
  summary.complete += completedWork.length;
  summary.blockedFailed += alerts.filter((alert) => alert.severity === "red").length;
  return summary;
}

function sourceFromFeed(feed: unknown, now: Date): OperationsSource {
  if (!isRecord(feed)) {
    return {
      detail: "USA-147 workforce feed is not configured for this runtime.",
      fetchedAt: null,
      status: "unavailable",
    };
  }

  if (feed.schemaVersion !== WORKFORCE_STATUS_SCHEMA_VERSION) {
    return {
      detail: "USA-147 workforce feed returned an unexpected schema version.",
      fetchedAt: isoDate(feed.generatedAt),
      status: "error",
    };
  }

  const generatedAt = isoDate(feed.generatedAt);
  const generatedMs = generatedAt ? new Date(generatedAt).getTime() : 0;
  const ageSeconds = generatedMs > 0 ? Math.max(0, Math.floor((now.getTime() - generatedMs) / 1000)) : Number.POSITIVE_INFINITY;

  return {
    detail: ageSeconds > STALE_FEED_SECONDS
      ? `USA-147 feed is older than ${STALE_FEED_SECONDS} seconds.`
      : "USA-147 workforce feed loaded through the server boundary.",
    fetchedAt: generatedAt,
    status: ageSeconds > STALE_FEED_SECONDS ? "stale" : "live",
  };
}

function dispatcherCard(feed: Record<string, unknown>, source: OperationsSource, now: Date): WorkforceCard {
  const dispatcher = isRecord(feed.dispatcher) ? feed.dispatcher : {};
  const heartbeatAt = isoDate(dispatcher.heartbeatAt);
  const phase = redactOperationsText(dispatcher.phase, "unavailable", 80);
  const state = redactOperationsText(dispatcher.state, "unavailable", 80);
  const heartbeatMs = heartbeatAt ? new Date(heartbeatAt).getTime() : 0;
  const heartbeatAgeSeconds = heartbeatMs > 0 ? Math.max(0, Math.floor((now.getTime() - heartbeatMs) / 1000)) : null;
  const cardState = source.status === "live" && state === "running" ? "working" : normalizeState(`${state} ${source.status}`);

  return {
    branch: null,
    commit: null,
    currentStep: phase === "unavailable" ? null : phase,
    currentIssue: null,
    detail: heartbeatAgeSeconds === null
      ? "Dispatcher heartbeat unavailable."
      : `Phase ${phase}; heartbeat ${heartbeatAgeSeconds}s ago.`,
    elapsedSeconds: null,
    latestActivityAt: heartbeatAt,
    name: "Dispatcher",
    previewUrl: null,
    prUrl: null,
    repository: null,
    runner: "dispatcher",
    startedAt: null,
    state: cardState === "working" && phase === "idle" ? "idle" : cardState,
    stale: source.status !== "live" || isStaleAt(heartbeatAt, now),
  };
}

function workItemFromActiveRun(run: unknown, now: Date): OperationsWorkItem | null {
  if (!isRecord(run)) {
    return null;
  }

  const issue = redactOperationsText(run.issue, "", 40);
  if (!issue) {
    return null;
  }

  const publish = isRecord(run.publish) ? run.publish : {};
  const heartbeatAt = isoDate(run.heartbeatAt);

  return {
    assignee: null,
    branch: optionalText(run.branch, 120),
    commit: optionalText(run.latestCommit, 80),
    currentStep: redactOperationsText(run.currentStep, "running", 120),
    dispatcherEligible: true,
    issue,
    latestActivityAt: heartbeatAt,
    linearDelegate: null,
    linearUrl: null,
    owner: "USA-147 feed",
    prUrl: safeUrl(run.prUrl ?? publish.prUrl),
    previewUrl: safeUrl(run.previewUrl ?? publish.previewUrl),
    repository: repositoryName(run.repository, run.repositoryPath),
    runner: runnerKey(run.runner),
    state: isStaleAt(heartbeatAt, now, ACTIVE_CLAIM_SECONDS) ? "stale_offline" : activeRunState(run),
    stateDetail: redactOperationsText(run.status, "Dispatcher-managed run is active.", 180),
    title: issue,
    worktree: worktreeName(run.worktree),
  };
}

function workItemFromQueueHold(hold: unknown): OperationsWorkItem | null {
  if (!isRecord(hold)) {
    return null;
  }

  const eligibility = isRecord(hold.eligibility) ? hold.eligibility : null;
  const issueRecord = isRecord(eligibility?.issue) ? eligibility.issue : {};
  const selectedRepository = isRecord(eligibility?.selectedRepository) ? eligibility.selectedRepository : null;
  const issue = redactOperationsText(hold.issue ?? issueRecord.identifier, "", 40);
  if (!issue) {
    return null;
  }

  const reason = redactOperationsText(hold.reason ?? eligibility?.reason ?? eligibility?.holdReason, "Queued by dispatcher.", 220);

  return {
    assignee: null,
    branch: null,
    commit: null,
    currentStep: redactOperationsText(eligibility?.queueState, "queued", 120),
    dispatcherEligible: typeof eligibility?.eligible === "boolean" ? eligibility.eligible : null,
    issue,
    latestActivityAt: isoDate(eligibility?.evaluatedAt),
    linearDelegate: null,
    linearUrl: safeUrl(issueRecord.url),
    owner: "Dispatcher queue",
    prUrl: null,
    previewUrl: null,
    repository: repositoryName(selectedRepository?.name, selectedRepository?.path),
    runner: runnerKey(hold.runner ?? eligibility?.selectedRunner),
    state: queueItemState(eligibility, reason),
    stateDetail: reason,
    title: redactOperationsText(issueRecord.title, issue, 140),
    worktree: null,
  };
}

function reviewItemFromFeed(item: unknown): FounderReviewItem | null {
  if (!isRecord(item)) {
    return null;
  }

  const issue = redactOperationsText(item.issue, "", 40);
  if (!issue) {
    return null;
  }

  return {
    branch: optionalText(item.branch, 120),
    checks: asArray(item.checks).map((check) => redactOperationsText(check, "check", 80)),
    commit: optionalText(item.commit, 80),
    deliveredSummary: redactOperationsText(item.summary ?? item.status, "Dispatcher reported a completed review package.", 220),
    decisionRequired: "Founder review required before merge, deploy, DNS, or production changes.",
    issue,
    latestActivityAt: isoDate(item.at),
    linearUrl: null,
    prUrl: safeUrl(item.prUrl),
    previewUrl: safeUrl(item.previewUrl),
    productionChanged: typeof item.productionChanged === "boolean" ? item.productionChanged : null,
    repository: repositoryName(item.repository),
    runner: optionalText(item.runner, 40),
    screenshots: asArray(item.screenshots).map(safeUrl).filter((url): url is string => Boolean(url)),
    title: issue,
  };
}

function alertFromFeed(item: unknown): OperationsAlert | null {
  if (!isRecord(item)) {
    return null;
  }

  const detail = redactOperationsText(item.message ?? item.detail ?? item.reason, "", 240);
  if (!detail) {
    return null;
  }

  return {
    code: redactOperationsText(item.code, "dispatcher_alert", 80),
    detail,
    issue: optionalText(item.issue, 40),
    severity: String(item.severity).toLowerCase() === "red" ? "red" : "amber",
  };
}

function activityFromEvent(item: unknown): OperationsActivity | null {
  if (!isRecord(item)) {
    return null;
  }

  const event = redactOperationsText(item.event, "", 80);
  if (!event) {
    return null;
  }

  const metadata = isRecord(item.metadata) ? item.metadata : {};
  const reason = metadata.reason ?? metadata.currentStep ?? metadata.status ?? item.currentStep;

  return {
    at: isoDate(item.at),
    event,
    issue: optionalText(item.issue, 40),
    repository: repositoryName(item.repository, item.repositoryPath),
    runner: optionalText(item.runner, 40),
    summary: redactOperationsText(reason ?? event, event, 200),
  };
}

function cardsFromRuns(feed: Record<string, unknown>, feedSource: OperationsSource, now: Date): WorkforceCard[] {
  const cards = new Map<RunnerKey, WorkforceCard>();
  cards.set("dispatcher", dispatcherCard(feed, feedSource, now));

  for (const runner of ["codex", "claude"] as const) {
    cards.set(runner, {
      branch: null,
      commit: null,
      currentStep: feedSource.status === "live" ? "idle" : null,
      currentIssue: null,
      detail: feedSource.status === "live"
        ? "No active USA-147 run is assigned to this runner."
        : "Runner state unavailable until the USA-147 feed is connected.",
      elapsedSeconds: null,
      latestActivityAt: feedSource.fetchedAt,
      name: labelForRunner(runner),
      previewUrl: null,
      prUrl: null,
      repository: null,
      runner,
      startedAt: null,
      state: feedSource.status === "live" ? "idle" : "unavailable",
      stale: feedSource.status !== "live",
    });
  }

  for (const run of asArray(feed.activeRuns)) {
    if (!isRecord(run)) continue;
    const runner = cardRunnerKey(run.runner);
    if (!runner || runner === "dispatcher") continue;
    const startedAt = isoDate(run.startedAt);
    const heartbeatAt = isoDate(run.heartbeatAt);
    const publish = isRecord(run.publish) ? run.publish : {};
    cards.set(runner, {
      branch: optionalText(run.branch, 120),
      commit: optionalText(run.latestCommit, 80),
      currentStep: optionalText(run.currentStep, 120),
      currentIssue: optionalText(run.issue, 40),
      detail: redactOperationsText(run.currentStep ?? run.status, "Dispatcher-managed run is active.", 180),
      elapsedSeconds: elapsedSeconds(startedAt, now),
      latestActivityAt: heartbeatAt,
      name: labelForRunner(runner),
      previewUrl: safeUrl(run.previewUrl ?? publish.previewUrl),
      prUrl: safeUrl(run.prUrl ?? publish.prUrl),
      repository: repositoryName(run.repository, run.repositoryPath),
      runner,
      startedAt,
      state: isStaleAt(heartbeatAt, now, ACTIVE_CLAIM_SECONDS) ? "stale_offline" : activeRunState(run),
      stale: isStaleAt(heartbeatAt, now, ACTIVE_CLAIM_SECONDS),
    });
  }

  const runners = isRecord(feed.runners) ? feed.runners : {};
  for (const [runnerName, runnerState] of Object.entries(runners)) {
    const runner = cardRunnerKey(runnerName);
    if (!runner || runner === "dispatcher" || !isRecord(runnerState)) continue;
    const existing = cards.get(runner);
    if (!existing || existing.currentIssue) continue;
    cards.set(runner, {
      ...existing,
      detail: redactOperationsText(runnerState.availability ?? runnerState.state, existing.detail, 180),
      state: normalizeState(runnerState.availability ?? runnerState.state) === "unavailable"
        ? existing.state
        : normalizeState(runnerState.availability ?? runnerState.state),
    });
  }

  return ["dispatcher", "codex", "claude"].map((runner) => cards.get(runner as RunnerKey)).filter(Boolean) as WorkforceCard[];
}

function uniqueByIssueAndState(items: OperationsWorkItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.issue}:${item.state}:${item.runner}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueReviews(items: FounderReviewItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.issue)) return false;
    seen.add(item.issue);
    return true;
  });
}

export function normalizeWorkforceFeed(feed: unknown, now = new Date()) {
  const source = sourceFromFeed(feed, now);
  const record = isRecord(feed) ? feed : {};
  const activeWork = [
    ...asArray(record.activeRuns).map((run) => workItemFromActiveRun(run, now)),
    ...asArray(record.queuedIssues).map(workItemFromQueueHold),
  ].filter((item): item is OperationsWorkItem => Boolean(item));
  const alerts = asArray(record.stalledOrFailedWork).map(alertFromFeed).filter((item): item is OperationsAlert => Boolean(item));
  const recentActivity = asArray(record.recentEvents)
    .map(activityFromEvent)
    .filter((item): item is OperationsActivity => Boolean(item))
    .slice(-MAX_ACTIVITY_ITEMS)
    .reverse();

  for (const item of activeWork) {
    if (item.state === "blocked_failed" || item.dispatcherEligible === false) {
      alerts.push({
        code: item.dispatcherEligible === false ? "dispatcher_ineligible_or_held" : "dispatcher_blocked",
        detail: item.stateDetail,
        issue: item.issue,
        severity: item.state === "blocked_failed" ? "red" : "amber",
      });
    }
  }

  if (source.status === "error" || source.status === "stale") {
    alerts.push({
      code: source.status === "stale" ? "stale_workforce_feed" : "invalid_workforce_feed",
      detail: source.detail,
      issue: null,
      severity: source.status === "stale" ? "amber" : "red",
    });
  }

  return {
    activeWork: uniqueByIssueAndState(activeWork),
    alerts,
    cards: cardsFromRuns(record, source, now),
    recentActivity,
    reviewItems: uniqueReviews(asArray(record.reviewReadyDeliverables)
      .map(reviewItemFromFeed)
      .filter((item): item is FounderReviewItem => Boolean(item))),
    source,
  };
}

type LinearLabel = {
  name: string;
  parent: string | null;
};

type LinearRunnerInfo = {
  canonicalRunner: "claude" | "codex" | "unknown";
  delegatedRunner: "claude" | "codex" | "unknown";
  deprecatedRunner: "claude" | "codex" | "unknown";
  hasCanonicalConflict: boolean;
  hasDeprecatedConflict: boolean;
  hasDeprecatedRunnerLabel: boolean;
  runner: "claude" | "codex" | "unknown";
};

function labelsForIssue(issue: LinearIssueNode): LinearLabel[] {
  return (issue.labels?.nodes ?? [])
    .map((label) => ({
      name: redactOperationsText(label?.name, "", 80),
      parent: optionalText(label?.parent?.name, 80),
    }))
    .filter((label) => Boolean(label.name));
}

function linearLabelText(label: LinearLabel) {
  return `${label.parent ? `${label.parent}/` : ""}${label.name}`.toLowerCase();
}

function hasLabel(labels: readonly LinearLabel[], needle: string) {
  const normalized = needle.toLowerCase();
  return labels.some((label) => label.name.toLowerCase() === normalized || linearLabelText(label) === normalized);
}

function labelMatchesRunner(label: LinearLabel, runner: "claude" | "codex") {
  const name = label.name.toLowerCase();
  const parent = label.parent?.toLowerCase() ?? "";
  return (parent === "runner" && name === runner)
    || name === runner
    || name === `runner/${runner}`;
}

function labelMatchesDeprecatedRunner(label: LinearLabel, runner: "claude" | "codex") {
  return label.name.toLowerCase() === `ready for ${runner}`;
}

function runnerFromName(value: unknown): "claude" | "codex" | "unknown" {
  const name = String(value || "").toLowerCase();
  if (name.includes("claude")) return "claude";
  if (name.includes("codex")) return "codex";
  return "unknown";
}

function runnerInfoFromLinear(issue: LinearIssueNode, labels: readonly LinearLabel[]): LinearRunnerInfo {
  const canonical = (["claude", "codex"] as const).filter((runner) => labels.some((label) => labelMatchesRunner(label, runner)));
  const deprecated = (["claude", "codex"] as const).filter((runner) => labels.some((label) => labelMatchesDeprecatedRunner(label, runner)));
  const delegatedRunner = runnerFromName(issue.delegate?.name);
  const canonicalRunner = canonical.length === 1 ? canonical[0] : "unknown";
  const deprecatedRunner = deprecated.length === 1 ? deprecated[0] : "unknown";

  return {
    canonicalRunner,
    delegatedRunner,
    deprecatedRunner,
    hasCanonicalConflict: canonical.length > 1,
    hasDeprecatedConflict: deprecated.length > 1,
    hasDeprecatedRunnerLabel: deprecated.length > 0,
    runner: canonicalRunner !== "unknown"
      ? canonicalRunner
      : delegatedRunner !== "unknown"
        ? delegatedRunner
        : deprecatedRunner,
  };
}

function repositoryFromLinearLabels(labels: readonly LinearLabel[], _projectName: unknown, title: unknown) {
  const repositoryLabels = labels.filter((label) => {
    const name = label.name.toLowerCase();
    const parent = label.parent?.toLowerCase() ?? "";
    return parent === "application"
      || name.startsWith("application/")
      || [
        "automation",
        "save",
        "save website",
        "save-website",
        "usam automation",
        "usam website",
        "usam-automation",
        "usam-website",
        "website",
      ].includes(name);
  });
  const haystack = [
    ...repositoryLabels.map((label) => linearLabelText(label)),
    redactOperationsText(title, "", 160),
  ].join(" ").toLowerCase();

  if (/\bsave\b|save-website/.test(haystack)) return "save-website";
  if (/\bautomation\b|\bdispatcher\b|usam-automation/.test(haystack)) return "usam-automation";
  if (/\busam website\b|usam-website|\bwebsite\b|\boperations center\b|\bcommand center\b/.test(haystack)) return "usam-website";
  return null;
}

function linearState(issue: LinearIssueNode, labels: readonly LinearLabel[], runnerInfo: LinearRunnerInfo): OperationsState | null {
  const stateName = redactOperationsText(issue.state?.name, "", 80).toLowerCase();
  const stateType = redactOperationsText(issue.state?.type, "", 80).toLowerCase();
  const readyForDispatcher = hasLabel(labels, "Ready for Dispatcher");

  if (stateName.includes("founder review") || stateName.includes("review")) return "founder_review";
  if (stateType === "completed" || stateName.includes("done") || stateName.includes("complete")) return "complete";
  if (stateName.includes("block") || stateName.includes("fail")) return "blocked_failed";
  if (stateType === "started" || stateName.includes("progress")) return "claimed";
  if (stateName.includes("ready") && readyForDispatcher && runnerInfo.canonicalRunner !== "unknown" && !runnerInfo.hasCanonicalConflict) return "dispatcher_eligible";
  if (stateName.includes("ready") && readyForDispatcher) return "queued";
  if (runnerInfo.runner !== "unknown" || issue.delegate?.name || issue.assignee?.name) return "delegated";

  return null;
}

function attachmentUrls(issue: LinearIssueNode) {
  return (issue.attachments?.nodes ?? [])
    .map((attachment) => ({
      title: redactOperationsText(attachment.title, "", 120),
      url: safeUrl(attachment.url),
    }))
    .filter((attachment): attachment is { title: string; url: string } => Boolean(attachment.title && attachment.url));
}

function evidenceFromAttachments(issue: LinearIssueNode) {
  const attachments = attachmentUrls(issue);
  const prUrl = attachments.find((attachment) => /github\.com\/.+\/pull\//i.test(attachment.url))?.url ?? null;
  const previewUrl = attachments.find((attachment) => /\.vercel\.app/i.test(attachment.url) || /preview/i.test(attachment.title))?.url ?? null;
  const screenshots = attachments
    .filter((attachment) => /screenshot|desktop|mobile|\.png|\.jpg|\.jpeg|\.webp/i.test(`${attachment.title} ${attachment.url}`))
    .map((attachment) => attachment.url);
  const checks = attachments
    .filter((attachment) => /check|test|build|validation|smoke|typecheck/i.test(attachment.title))
    .map((attachment) => attachment.title);

  return {
    checks,
    previewUrl,
    prUrl,
    screenshots,
  };
}

function linearStateDetail(state: OperationsState, readyForDispatcher: boolean, runnerInfo: LinearRunnerInfo) {
  if (state === "dispatcher_eligible") {
    return "Ready for Dispatcher with exactly one canonical runner signal. This is eligible for pickup, not proof of execution.";
  }

  if (state === "claimed") {
    return "Linear says In Progress. Treat as claimed only; active execution requires USA-147 heartbeat evidence.";
  }

  if (state === "delegated") {
    return "Assigned or delegated in Linear, but not eligible for dispatcher pickup yet.";
  }

  if (state === "queued" && readyForDispatcher && runnerInfo.hasDeprecatedRunnerLabel) {
    return "Ready for Dispatcher, but only deprecated runner labels are visible. Dispatcher needs a canonical Runner label.";
  }

  if (state === "queued" && readyForDispatcher) {
    return "Ready for Dispatcher, but missing or conflicting canonical runner evidence.";
  }

  return "Linear state is visible, but execution requires USA-147 heartbeat evidence.";
}

function workItemFromLinear(issue: LinearIssueNode): OperationsWorkItem | null {
  const identifier = redactOperationsText(issue.identifier, "", 40);
  const title = redactOperationsText(issue.title, identifier, 140);
  if (!identifier || !title) {
    return null;
  }

  const labels = labelsForIssue(issue);
  const runnerInfo = runnerInfoFromLinear(issue, labels);
  const state = linearState(issue, labels, runnerInfo);
  if (!state || state === "complete" || state === "founder_review") {
    return null;
  }

  const readyForDispatcher = hasLabel(labels, "Ready for Dispatcher");
  const repository = repositoryFromLinearLabels(labels, issue.project?.name, issue.title);
  const evidence = evidenceFromAttachments(issue);
  const assignee = optionalText(issue.assignee?.name, 80);
  const linearDelegate = optionalText(issue.delegate?.name, 80);

  return {
    assignee,
    branch: optionalText(issue.branchName, 120),
    commit: null,
    currentStep: state === "delegated" ? "delegated_not_dispatcher_ready" : "linear_state",
    dispatcherEligible: state === "dispatcher_eligible" ? true : readyForDispatcher ? false : false,
    issue: identifier,
    latestActivityAt: isoDate(issue.updatedAt),
    linearDelegate,
    linearUrl: safeUrl(issue.url),
    owner: "Linear",
    prUrl: evidence.prUrl,
    previewUrl: evidence.previewUrl,
    repository,
    runner: runnerInfo.runner,
    state,
    stateDetail: linearStateDetail(state, readyForDispatcher, runnerInfo),
    title,
    worktree: null,
  };
}

function completedItemFromLinear(issue: LinearIssueNode): OperationsWorkItem | null {
  const identifier = redactOperationsText(issue.identifier, "", 40);
  const title = redactOperationsText(issue.title, identifier, 140);
  if (!identifier || !title) {
    return null;
  }

  const labels = labelsForIssue(issue);
  const runnerInfo = runnerInfoFromLinear(issue, labels);
  const state = linearState(issue, labels, runnerInfo);
  if (state !== "complete") {
    return null;
  }

  const evidence = evidenceFromAttachments(issue);
  return {
    assignee: optionalText(issue.assignee?.name, 80),
    branch: optionalText(issue.branchName, 120),
    commit: null,
    currentStep: "linear_complete",
    dispatcherEligible: null,
    issue: identifier,
    latestActivityAt: isoDate(issue.completedAt) ?? isoDate(issue.updatedAt),
    linearDelegate: optionalText(issue.delegate?.name, 80),
    linearUrl: safeUrl(issue.url),
    owner: "Linear",
    prUrl: evidence.prUrl,
    previewUrl: evidence.previewUrl,
    repository: repositoryFromLinearLabels(labels, issue.project?.name, issue.title),
    runner: runnerInfo.runner,
    state: "complete",
    stateDetail: "Linear marks this work complete. Execution evidence is shown only when linked by Linear or USA-147.",
    title,
    worktree: null,
  };
}

function reviewItemFromLinear(issue: LinearIssueNode): FounderReviewItem | null {
  const labels = labelsForIssue(issue);
  const runnerInfo = runnerInfoFromLinear(issue, labels);
  const state = linearState(issue, labels, runnerInfo);
  if (state !== "founder_review") {
    return null;
  }

  const identifier = redactOperationsText(issue.identifier, "", 40);
  if (!identifier) {
    return null;
  }

  const evidence = evidenceFromAttachments(issue);
  const missingEvidence = [
    evidence.previewUrl ? null : "preview",
    evidence.prUrl ? null : "PR",
    evidence.screenshots.length ? null : "screenshots",
    evidence.checks.length ? null : "checks",
  ].filter(Boolean);

  return {
    branch: optionalText(issue.branchName, 120),
    checks: evidence.checks,
    commit: null,
    deliveredSummary: "Linear marks this item Founder Review. Review package evidence is shown when linked in Linear or supplied by USA-147.",
    decisionRequired: missingEvidence.length
      ? `Do not approve yet: missing ${missingEvidence.join(", ")} evidence in connected data.`
      : "Approve, request changes, or hold after reviewing preview, PR, screenshots, and checks.",
    issue: identifier,
    latestActivityAt: isoDate(issue.updatedAt),
    linearUrl: safeUrl(issue.url),
    prUrl: evidence.prUrl,
    previewUrl: evidence.previewUrl,
    productionChanged: null,
    repository: repositoryFromLinearLabels(labels, issue.project?.name, issue.title),
    runner: runnerInfo.runner,
    screenshots: evidence.screenshots,
    title: redactOperationsText(issue.title, identifier, 140),
  };
}

function activityFromLinear(issue: LinearIssueNode): OperationsActivity | null {
  const identifier = redactOperationsText(issue.identifier, "", 40);
  const title = redactOperationsText(issue.title, "", 140);
  if (!identifier || !title) {
    return null;
  }

  const labels = labelsForIssue(issue);
  const runnerInfo = runnerInfoFromLinear(issue, labels);
  return {
    at: isoDate(issue.updatedAt),
    event: "linear_issue_updated",
    issue: identifier,
    repository: repositoryFromLinearLabels(labels, issue.project?.name, issue.title),
    runner: runnerInfo.runner,
    summary: title,
  };
}

export function normalizeLinearIssues(
  issues: unknown,
  source: OperationsSource,
  now = new Date(),
) {
  const nodes = asArray(issues) as LinearIssueNode[];
  const activeWork = nodes.map(workItemFromLinear).filter((item): item is OperationsWorkItem => Boolean(item));
  const completedWork = nodes.map(completedItemFromLinear).filter((item): item is OperationsWorkItem => Boolean(item));
  const reviewItems = nodes.map(reviewItemFromLinear).filter((item): item is FounderReviewItem => Boolean(item));
  const recentActivity = nodes.map(activityFromLinear).filter((item): item is OperationsActivity => Boolean(item)).slice(0, MAX_ACTIVITY_ITEMS);
  const alerts: OperationsAlert[] = [];

  for (const issue of nodes) {
    const identifier = redactOperationsText(issue.identifier, "", 40);
    if (!identifier) continue;

    const labels = labelsForIssue(issue);
    const runnerInfo = runnerInfoFromLinear(issue, labels);
    const state = linearState(issue, labels, runnerInfo);
    const readyForDispatcher = hasLabel(labels, "Ready for Dispatcher");

    if (runnerInfo.hasDeprecatedRunnerLabel) {
      alerts.push({
        code: "deprecated_runner_label",
        detail: "Issue uses deprecated Ready for Codex/Claude routing labels. Dispatcher expects a canonical Runner label.",
        issue: identifier,
        severity: "amber",
      });
    }

    if (runnerInfo.hasCanonicalConflict || runnerInfo.hasDeprecatedConflict) {
      alerts.push({
        code: "conflicting_claude_codex_assignment",
        detail: "Issue has conflicting Claude/Codex runner signals and is not safely claimable.",
        issue: identifier,
        severity: "red",
      });
    }

    if (readyForDispatcher && state !== "complete" && state !== "founder_review" && runnerInfo.canonicalRunner === "unknown") {
      alerts.push({
        code: "missing_or_conflicting_runner",
        detail: "Ready for Dispatcher requires exactly one canonical Runner label before pickup.",
        issue: identifier,
        severity: "amber",
      });
    }
  }

  for (const item of activeWork) {
    if (item.runner === "unknown" && item.state !== "delegated") {
      alerts.push({
        code: "missing_or_conflicting_runner",
        detail: "Linear issue does not have exactly one unambiguous runner signal.",
        issue: item.issue,
        severity: "amber",
      });
    }

    if (!item.repository && item.state !== "delegated") {
      alerts.push({
        code: "missing_repository_route",
        detail: "Linear issue does not have a deterministic repository route.",
        issue: item.issue,
        severity: "amber",
      });
    }

    if (item.state === "claimed") {
      const latestActivityMs = Date.parse(item.latestActivityAt || "");
      if (latestActivityMs > 0 && now.getTime() - latestActivityMs > STALE_LINEAR_STARTED_MS) {
        alerts.push({
          code: "stale_in_progress_issue",
          detail: "Linear issue is In Progress but has no recent visible activity.",
          issue: item.issue,
          severity: "amber",
        });
      }
    }
  }

  for (const item of reviewItems) {
    if (!item.previewUrl) {
      alerts.push({
        code: "missing_preview",
        detail: "Founder Review item has no preview URL in the connected status data.",
        issue: item.issue,
        severity: "amber",
      });
    }

    if (!item.prUrl) {
      alerts.push({
        code: "missing_pr",
        detail: "Founder Review item has no draft PR URL in the connected status data.",
        issue: item.issue,
        severity: "amber",
      });
    }

    if (!item.screenshots.length) {
      alerts.push({
        code: "missing_screenshots",
        detail: "Founder Review item has no desktop/mobile screenshot evidence in the connected status data.",
        issue: item.issue,
        severity: "amber",
      });
    }
  }

  if (source.status !== "live") {
    alerts.push({
      code: "linear_unavailable",
      detail: source.detail,
      issue: null,
      severity: source.status === "error" ? "red" : "amber",
    });
  }

  return {
    activeWork,
    alerts,
    completedWork,
    recentActivity,
    reviewItems,
    source,
  };
}

function mergeCards(feedCards: WorkforceCard[], activeWork: OperationsWorkItem[], source: OperationsSource): WorkforceCard[] {
  const cards = new Map<RunnerKey, WorkforceCard>();
  for (const card of feedCards) {
    cards.set(card.runner, card);
  }

  for (const runner of ["dispatcher", "codex", "claude"] as const) {
    if (!cards.has(runner)) {
      cards.set(runner, {
        branch: null,
        commit: null,
        currentStep: null,
        currentIssue: null,
        detail: "State unavailable.",
        elapsedSeconds: null,
        latestActivityAt: null,
        name: labelForRunner(runner),
        previewUrl: null,
        prUrl: null,
        repository: null,
        runner,
        startedAt: null,
        state: "unavailable",
        stale: true,
      });
    }
  }

  for (const runner of ["codex", "claude"] as const) {
    const card = cards.get(runner);
    const feedHasActiveRunner = card?.currentIssue;
    if (feedHasActiveRunner) {
      continue;
    }

    const linearItem = activeWork.find((item) => item.runner === runner && ["claimed", "dispatcher_eligible", "queued", "delegated"].includes(item.state));
    if (linearItem && card) {
      cards.set(runner, {
        ...card,
        branch: linearItem.branch,
        commit: linearItem.commit,
        currentStep: linearItem.currentStep,
        currentIssue: linearItem.issue,
        detail: `${linearItem.stateDetail} This is not proof of active execution unless the USA-147 feed shows a run.`,
        elapsedSeconds: null,
        latestActivityAt: linearItem.latestActivityAt,
        previewUrl: linearItem.previewUrl,
        prUrl: linearItem.prUrl,
        repository: linearItem.repository,
        startedAt: null,
        state: linearItem.state,
        stale: source.status !== "live",
      });
    }
  }

  if (source.status !== "live") {
    const dispatcher = cards.get("dispatcher");
    if (dispatcher) {
      cards.set("dispatcher", {
        ...dispatcher,
        detail: source.detail,
        state: source.status === "stale" ? "stale_offline" : "unavailable",
        stale: true,
      });
    }
  }

  return ["dispatcher", "codex", "claude"].map((runner) => cards.get(runner as RunnerKey)).filter(Boolean) as WorkforceCard[];
}

function crossSourceAlerts(activeWork: readonly OperationsWorkItem[], source: OperationsSource): OperationsAlert[] {
  const alerts: OperationsAlert[] = [];
  const activeByIssue = new Map<string, OperationsWorkItem[]>();

  for (const item of activeWork) {
    if (["claimed", "working"].includes(item.state)) {
      activeByIssue.set(item.issue, [...(activeByIssue.get(item.issue) ?? []), item]);
    }
  }

  activeByIssue.forEach((items, issue) => {
    const runners = new Set(items.map((item: OperationsWorkItem) => item.runner).filter((runner) => runner !== "unknown"));
    if (runners.size > 1 || items.length > 1) {
      alerts.push({
        code: "duplicate_execution",
        detail: "Multiple active/claimed records are visible for this issue. Confirm only one runner owns it.",
        issue,
        severity: "red",
      });
    }
  });

  if (source.status === "live") {
    for (const item of activeWork) {
      if (item.owner !== "Linear" || item.state !== "dispatcher_eligible") {
        continue;
      }

      const feedEvidence = activeWork.some((candidate) => candidate.issue === item.issue && candidate.owner !== "Linear");
      if (!feedEvidence) {
        alerts.push({
          code: "eligible_work_not_claimed",
          detail: "Linear says this issue is dispatcher eligible, but the live USA-147 feed does not show it queued, claimed, or executing.",
          issue: item.issue,
          severity: "amber",
        });
      }
    }
  }

  return alerts;
}

function backupVisibility(): BackupVisibility {
  return {
    detail: "USA-91 backup work was reviewed as a separate preserved Infrastructure > Backups capability. This USA-50 dashboard exposes no backup actions and has no live backup status feed configured.",
    recommendation: "Keep backup controls deferred until a read-only status feed or paired local backup agent is approved for this dashboard.",
    status: "unavailable",
  };
}

export function buildOperationsCenterData({
  feed,
  linearIssues = [],
  linearSource = {
    detail: "Linear server credentials are not configured.",
    fetchedAt: null,
    status: "unavailable" as const,
  },
  now = new Date(),
}: {
  feed?: unknown;
  linearIssues?: unknown;
  linearSource?: OperationsSource;
  now?: Date;
}): OperationsCenterData {
  const normalizedFeed = normalizeWorkforceFeed(feed, now);
  const normalizedLinear = normalizeLinearIssues(linearIssues, linearSource, now);
  const activeWork = uniqueByIssueAndState([
    ...normalizedFeed.activeWork,
    ...normalizedLinear.activeWork,
  ]).sort((first, second) => {
    return (Date.parse(second.latestActivityAt || "") || 0) - (Date.parse(first.latestActivityAt || "") || 0);
  });
  const completedWork = uniqueByIssueAndState(normalizedLinear.completedWork)
    .sort((first, second) => {
      return (Date.parse(second.latestActivityAt || "") || 0) - (Date.parse(first.latestActivityAt || "") || 0);
    })
    .slice(0, 12);
  const founderReviewQueue = uniqueReviews([
    ...normalizedFeed.reviewItems,
    ...normalizedLinear.reviewItems,
  ]).sort((first, second) => {
    return (Date.parse(second.latestActivityAt || "") || 0) - (Date.parse(first.latestActivityAt || "") || 0);
  });
  const alerts = [
    ...normalizedFeed.alerts,
    ...normalizedLinear.alerts,
    ...crossSourceAlerts(activeWork, normalizedFeed.source),
  ].slice(0, MAX_LIST_ITEMS);
  const recentActivity = [...normalizedFeed.recentActivity, ...normalizedLinear.recentActivity]
    .sort((first, second) => (Date.parse(second.at || "") || 0) - (Date.parse(first.at || "") || 0))
    .slice(0, MAX_ACTIVITY_ITEMS);
  const unavailableData = [
    normalizedFeed.source.status !== "live" ? "USA-147 workforce feed" : null,
    linearSource.status !== "live" ? "Linear issues" : null,
    "Runner usage allowance/cooldown is shown only when the feed supplies it.",
    "Branch, commit, PR, preview, screenshots, and checks show unavailable unless supplied by the run.",
  ].filter((item): item is string => Boolean(item));

  return {
    activeWork,
    alerts,
    backupVisibility: backupVisibility(),
    cards: mergeCards(normalizedFeed.cards, activeWork, normalizedFeed.source),
    completedWork,
    founderReviewQueue,
    generatedAt: now.toISOString(),
    recentActivity,
    schemaVersion: OPERATIONS_CENTER_SCHEMA_VERSION,
    sources: {
      linear: linearSource,
      workforceFeed: normalizedFeed.source,
    },
    summary: summarize(activeWork, founderReviewQueue, alerts, completedWork),
    unavailableData,
  };
}
