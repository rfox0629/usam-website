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
  currentIssue: string | null;
  detail: string;
  latestActivityAt: string | null;
  name: "Claude" | "Codex" | "Dispatcher";
  repository: string | null;
  runner: RunnerKey;
  state: OperationsState;
};

export type OperationsWorkItem = {
  branch: string | null;
  commit: string | null;
  currentStep: string;
  dispatcherEligible: boolean | null;
  issue: string;
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
  decisionRequired: string;
  issue: string;
  latestActivityAt: string | null;
  prUrl: string | null;
  previewUrl: string | null;
  productionChanged: boolean | null;
  repository: string | null;
  runner: string | null;
  screenshots: string[];
  title: string;
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
  cards: WorkforceCard[];
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
    previewReady: number;
    queued: number;
    staleOffline: number;
    working: number;
  };
  unavailableData: string[];
};

export type LinearIssueNode = {
  assignee?: { name?: unknown } | null;
  completedAt?: unknown;
  createdAt?: unknown;
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
    preview_ready: "previewReady",
    queued: "queued",
    stale_offline: "staleOffline",
    unavailable: null,
    working: "working",
  };

  return stateCountKeys[state];
}

function summarize(items: readonly OperationsWorkItem[], reviews: readonly FounderReviewItem[], alerts: readonly OperationsAlert[]) {
  const summary = { ...emptySummary };

  for (const item of items) {
    const key = stateCountKey(item.state);
    if (key) {
      summary[key] += 1;
    }
  }

  summary.founderReview += reviews.length;
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
    currentIssue: null,
    detail: heartbeatAgeSeconds === null
      ? "Dispatcher heartbeat unavailable."
      : `Phase ${phase}; heartbeat ${heartbeatAgeSeconds}s ago.`,
    latestActivityAt: heartbeatAt,
    name: "Dispatcher",
    repository: null,
    runner: "dispatcher",
    state: cardState === "working" && phase === "idle" ? "queued" : cardState,
  };
}

function workItemFromActiveRun(run: unknown): OperationsWorkItem | null {
  if (!isRecord(run)) {
    return null;
  }

  const issue = redactOperationsText(run.issue, "", 40);
  if (!issue) {
    return null;
  }

  return {
    branch: optionalText(run.branch, 120),
    commit: optionalText(run.latestCommit, 80),
    currentStep: redactOperationsText(run.currentStep, "running", 120),
    dispatcherEligible: true,
    issue,
    latestActivityAt: isoDate(run.heartbeatAt),
    linearUrl: null,
    owner: "USA-147 feed",
    prUrl: null,
    previewUrl: null,
    repository: repositoryName(run.repository, run.repositoryPath),
    runner: runnerKey(run.runner),
    state: activeRunState(run),
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
    branch: null,
    commit: null,
    currentStep: redactOperationsText(eligibility?.queueState, "queued", 120),
    dispatcherEligible: typeof eligibility?.eligible === "boolean" ? eligibility.eligible : null,
    issue,
    latestActivityAt: isoDate(eligibility?.evaluatedAt),
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
    decisionRequired: "Founder review required before merge, deploy, DNS, or production changes.",
    issue,
    latestActivityAt: isoDate(item.at),
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
      currentIssue: null,
      detail: feedSource.status === "live"
        ? "No active USA-147 run is assigned to this runner."
        : "Runner state unavailable until the USA-147 feed is connected.",
      latestActivityAt: feedSource.fetchedAt,
      name: labelForRunner(runner),
      repository: null,
      runner,
      state: feedSource.status === "live" ? "queued" : "unavailable",
    });
  }

  for (const run of asArray(feed.activeRuns)) {
    if (!isRecord(run)) continue;
    const runner = cardRunnerKey(run.runner);
    if (!runner || runner === "dispatcher") continue;
    cards.set(runner, {
      currentIssue: optionalText(run.issue, 40),
      detail: redactOperationsText(run.currentStep ?? run.status, "Dispatcher-managed run is active.", 180),
      latestActivityAt: isoDate(run.heartbeatAt),
      name: labelForRunner(runner),
      repository: repositoryName(run.repository, run.repositoryPath),
      runner,
      state: activeRunState(run),
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
    ...asArray(record.activeRuns).map(workItemFromActiveRun),
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

function labelNames(issue: LinearIssueNode) {
  return (issue.labels?.nodes ?? [])
    .map((label) => redactOperationsText(label?.name, "", 80))
    .filter(Boolean);
}

function hasLabel(labels: readonly string[], needle: string) {
  return labels.some((label) => label.toLowerCase() === needle.toLowerCase());
}

function hasLabelContaining(labels: readonly string[], needle: string) {
  const loweredNeedle = needle.toLowerCase();
  return labels.some((label) => label.toLowerCase().includes(loweredNeedle));
}

function runnerFromLinearLabels(labels: readonly string[]): "claude" | "codex" | "unknown" {
  const codex = hasLabel(labels, "Runner/Codex") || hasLabel(labels, "Ready for Codex") || hasLabelContaining(labels, "codex");
  const claude = hasLabel(labels, "Runner/Claude") || hasLabel(labels, "Ready for Claude") || hasLabelContaining(labels, "claude");
  if (codex && !claude) return "codex";
  if (claude && !codex) return "claude";
  return "unknown";
}

function repositoryFromLinearLabels(labels: readonly string[], _projectName: unknown) {
  const haystack = labels.join(" ").toLowerCase();
  if (haystack.includes("save")) return "save-website";
  if (haystack.includes("automation")) return "usam-automation";
  if (haystack.includes("website")) return "usam-website";
  return null;
}

function linearState(issue: LinearIssueNode, labels: readonly string[]): OperationsState | null {
  const stateName = redactOperationsText(issue.state?.name, "", 80).toLowerCase();
  const stateType = redactOperationsText(issue.state?.type, "", 80).toLowerCase();
  const readyForDispatcher = hasLabel(labels, "Ready for Dispatcher");
  const runner = runnerFromLinearLabels(labels);
  const runnerLabelCount = Number(runner === "codex") + Number(runner === "claude");

  if (stateName.includes("founder review") || stateName.includes("review")) return "founder_review";
  if (stateType === "completed" || stateName.includes("done") || stateName.includes("complete")) return "complete";
  if (stateName.includes("block") || stateName.includes("fail")) return "blocked_failed";
  if (stateType === "started" || stateName.includes("progress")) return "claimed";
  if (stateName.includes("ready") && readyForDispatcher && runnerLabelCount === 1) return "dispatcher_eligible";
  if (runner !== "unknown" && !readyForDispatcher) return "delegated";
  if (stateName.includes("ready") && runner === "unknown") return "queued";

  return null;
}

function workItemFromLinear(issue: LinearIssueNode): OperationsWorkItem | null {
  const identifier = redactOperationsText(issue.identifier, "", 40);
  const title = redactOperationsText(issue.title, identifier, 140);
  if (!identifier || !title) {
    return null;
  }

  const labels = labelNames(issue);
  const state = linearState(issue, labels);
  if (!state || state === "complete" || state === "founder_review") {
    return null;
  }

  const runner = runnerFromLinearLabels(labels);
  const readyForDispatcher = hasLabel(labels, "Ready for Dispatcher");
  const repository = repositoryFromLinearLabels(labels, issue.project?.name);

  return {
    branch: null,
    commit: null,
    currentStep: state === "delegated" ? "delegated_not_dispatcher_ready" : "linear_state",
    dispatcherEligible: state === "dispatcher_eligible" ? true : readyForDispatcher ? null : false,
    issue: identifier,
    latestActivityAt: isoDate(issue.updatedAt),
    linearUrl: safeUrl(issue.url),
    owner: "Linear",
    prUrl: null,
    previewUrl: null,
    repository,
    runner,
    state,
    stateDetail: state === "delegated"
      ? "Delegated to a runner, but not yet dispatcher-ready."
      : "Linear state indicates work may be queued or claimed.",
    title,
    worktree: null,
  };
}

function reviewItemFromLinear(issue: LinearIssueNode): FounderReviewItem | null {
  const labels = labelNames(issue);
  const state = linearState(issue, labels);
  if (state !== "founder_review") {
    return null;
  }

  const identifier = redactOperationsText(issue.identifier, "", 40);
  if (!identifier) {
    return null;
  }

  return {
    branch: null,
    checks: [],
    commit: null,
    decisionRequired: "Review the linked Linear issue for the complete package.",
    issue: identifier,
    latestActivityAt: isoDate(issue.updatedAt),
    prUrl: null,
    previewUrl: null,
    productionChanged: null,
    repository: repositoryFromLinearLabels(labels, issue.project?.name),
    runner: runnerFromLinearLabels(labels),
    screenshots: [],
    title: redactOperationsText(issue.title, identifier, 140),
  };
}

function activityFromLinear(issue: LinearIssueNode): OperationsActivity | null {
  const identifier = redactOperationsText(issue.identifier, "", 40);
  const title = redactOperationsText(issue.title, "", 140);
  if (!identifier || !title) {
    return null;
  }

  const labels = labelNames(issue);
  return {
    at: isoDate(issue.updatedAt),
    event: "linear_issue_updated",
    issue: identifier,
    repository: repositoryFromLinearLabels(labels, issue.project?.name),
    runner: runnerFromLinearLabels(labels),
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
  const reviewItems = nodes.map(reviewItemFromLinear).filter((item): item is FounderReviewItem => Boolean(item));
  const recentActivity = nodes.map(activityFromLinear).filter((item): item is OperationsActivity => Boolean(item)).slice(0, MAX_ACTIVITY_ITEMS);
  const alerts: OperationsAlert[] = [];

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
        currentIssue: null,
        detail: "State unavailable.",
        latestActivityAt: null,
        name: labelForRunner(runner),
        repository: null,
        runner,
        state: "unavailable",
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
        currentIssue: linearItem.issue,
        detail: `${linearItem.stateDetail} This is not proof of active execution unless the USA-147 feed shows a run.`,
        latestActivityAt: linearItem.latestActivityAt,
        repository: linearItem.repository,
        state: linearItem.state,
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
      });
    }
  }

  return ["dispatcher", "codex", "claude"].map((runner) => cards.get(runner as RunnerKey)).filter(Boolean) as WorkforceCard[];
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
  const founderReviewQueue = uniqueReviews([
    ...normalizedFeed.reviewItems,
    ...normalizedLinear.reviewItems,
  ]).sort((first, second) => {
    return (Date.parse(second.latestActivityAt || "") || 0) - (Date.parse(first.latestActivityAt || "") || 0);
  });
  const alerts = [...normalizedFeed.alerts, ...normalizedLinear.alerts].slice(0, MAX_LIST_ITEMS);
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
    cards: mergeCards(normalizedFeed.cards, activeWork, normalizedFeed.source),
    founderReviewQueue,
    generatedAt: now.toISOString(),
    recentActivity,
    schemaVersion: OPERATIONS_CENTER_SCHEMA_VERSION,
    sources: {
      linear: linearSource,
      workforceFeed: normalizedFeed.source,
    },
    summary: summarize(activeWork, founderReviewQueue, alerts),
    unavailableData,
  };
}
