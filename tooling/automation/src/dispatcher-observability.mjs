export const WORKFORCE_EVENT_SCHEMA_VERSION = "usam.workforce-event.v1";
export const WORKFORCE_STATUS_SCHEMA_VERSION = "usam.workforce-status.v1";

export const LIFECYCLE_EVENTS = new Set([
  "issue_discovered",
  "eligibility_passed",
  "eligibility_failed",
  "issue_queued",
  "issue_claimed",
  "runner_started",
  "heartbeat",
  "commit_detected",
  "tests_started",
  "tests_completed",
  "preview_ready",
  "founder_review_ready",
  "runner_failed",
  "retry_scheduled",
  "stalled",
  "completed",
]);

const REDACTED = "[redacted]";
const SENSITIVE_KEY_RE = /(?:token|secret|password|passphrase|authorization|credential|cookie|private.?key|prompt|stdin|stdout|stderr|raw|body|description|finalText|outputSnippet)/i;
const SECRET_VALUE_PATTERNS = [
  /lin_api_[A-Za-z0-9._-]+/g,
  /sk-[A-Za-z0-9._-]+/g,
  /(VERCEL_TOKEN=)[^\s]+/g,
  /([?&]_vercel_share=)[^\s"'<>)]*/g,
];

function isoNow() {
  return new Date().toISOString();
}

function shallowIssue(issue) {
  return {
    identifier: issue?.identifier || issue?.id || null,
    state: issue?.state?.name || issue?.state || null,
    title: issue?.title || null,
    url: issue?.url || null,
  };
}

function safeString(value) {
  let text = String(value || "");
  for (const pattern of SECRET_VALUE_PATTERNS) {
    text = text.replace(pattern, (match, prefix = "") => (prefix ? `${prefix}${REDACTED}` : REDACTED));
  }
  return text.length > 1600 ? `${text.slice(0, 1600)}...[truncated]` : text;
}

export function redactObservableValue(value, key = "", depth = 0) {
  if (SENSITIVE_KEY_RE.test(key)) {
    return REDACTED;
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return safeString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (depth > 6) {
    return "[max-depth]";
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactObservableValue(item, key, depth + 1));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = redactObservableValue(childValue, childKey, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function buildLifecycleEvent(eventType, fields = {}, { now = isoNow } = {}) {
  if (!LIFECYCLE_EVENTS.has(eventType)) {
    throw new Error(`unknown dispatcher lifecycle event: ${eventType}`);
  }
  const safe = redactObservableValue(fields);
  return {
    schemaVersion: WORKFORCE_EVENT_SCHEMA_VERSION,
    at: now(),
    event: eventType,
    currentStep: safe.currentStep || safe.phase || null,
    issue: safe.issue || null,
    metadata: safe.metadata || {},
    repository: safe.repository || safe.repositoryName || null,
    repositoryPath: safe.repositoryPath || null,
    runner: safe.runner || null,
    ...safe,
  };
}

function queueStateFrom({ classification, hold, issue, lock = null }) {
  const state = issue?.state?.name || issue?.state || "unknown";
  const lockStatus = lock?.status || null;
  if (lockStatus === "completed") return "completed";
  if (lockStatus === "review_blocked" || state === "Founder Review") return "waiting_founder_review";
  if (["running", "retrying"].includes(lockStatus)) return "executing";
  if (lockStatus === "claimed") return "claimed";
  if (["failed", "crashed", "cooldown"].includes(lockStatus)) return "blocked";
  if (classification?.eligible) return hold ? "queued" : "queued";
  if (/stale/i.test(classification?.reason || hold?.reason || "")) return "stalled";
  return "blocked";
}

function repositorySummary(repository) {
  if (!repository) {
    return null;
  }
  return {
    kind: repository.kind || null,
    name: repository.name || null,
    path: repository.repositoryPath || null,
  };
}

export function buildEligibilityReport({ classification, hold = null, issue, lock = null, now = isoNow, route = null } = {}) {
  const diagnostics = classification?.diagnostics || {};
  const selectedRepository = diagnostics.selectedRepository || repositorySummary(classification?.repository);
  const conditions = diagnostics.conditions || [];
  return {
    schemaVersion: "usam.dispatcher.eligibility-report.v1",
    evaluatedAt: now(),
    issue: shallowIssue(issue),
    eligible: Boolean(classification?.eligible),
    queueState: queueStateFrom({ classification, hold, issue, lock }),
    selectedRunner: classification?.runner || diagnostics.selectedRunner || null,
    selectedRepository,
    satisfied: diagnostics.satisfied || conditions.filter((item) => item.status === "satisfied"),
    missing: diagnostics.missing || conditions.filter((item) => item.status === "missing"),
    conflicting: diagnostics.conflicting || conditions.filter((item) => item.status === "conflicting"),
    conditions,
    delegatedRunner: diagnostics.delegatedRunner || null,
    holdReason: hold?.reason || null,
    reason: classification?.reason || hold?.reason || null,
    route: route ? {
      fallbackRepository: Boolean(route.fallbackRepository),
      matched: Boolean(route.matched),
      matches: route.matches || [],
      repository: repositorySummary(route.repository),
    } : null,
  };
}

function productionAuthorizationClaimLine(reviewAuthorization) {
  const productionAuthorization = reviewAuthorization?.productionAuthorization || null;
  const productionAllowed = productionAuthorization?.production?.allowed === true;
  const productionDataAllowed = productionAuthorization?.productionData?.allowed === true;

  if (productionAllowed) {
    return productionDataAllowed
      ? `Production authorization: "${productionAuthorization.production.label}" and "${productionAuthorization.productionData.label}" labels present. Validated branch/PR/merge/deploy actions are authorized after required validation/CI, and only the issue-documented production data mutations are authorized after pre-write validation and a rollback/revocation plan.`
      : `Production authorization: "${productionAuthorization.production.label}" label present. Validated branch/PR/merge/deploy actions are authorized after required validation/CI. Production database/schema writes remain blocked ("${productionAuthorization.productionData.label}" label is not present on this issue).`;
  }

  if (productionDataAllowed) {
    return `Production data authorization: "${productionAuthorization.productionData.label}" label present. Only the issue-documented production data mutations are authorized after pre-write validation and a rollback/revocation plan. Production branch/PR/merge/deploy actions remain blocked ("${productionAuthorization.production.label}" label is not present on this issue).`;
  }

  if (reviewAuthorization?.allowed) {
    const label = productionAuthorization?.production?.label || "Founder Approved — Production";
    return `Review actions authorized by issue context; production merge/deploy actions remain prohibited (no "${label}" label present on this issue).`;
  }

  return "No production action is authorized by this claim.";
}

export function buildClaimAcknowledgment({
  config,
  issue,
  lock,
  nextStep = "launch runner and record local heartbeats",
  reviewAuthorization = null,
  safetyNote = "",
}) {
  return [
    "Dispatcher pickup started.",
    "",
    `Issue: ${issue.identifier}`,
    `Claim time: ${lock.createdAt}`,
    `Runner: ${lock.runner}`,
    `Repository: ${lock.repositoryName} (${lock.repositoryKind})`,
    `Branch: \`${lock.branch}\``,
    `Worktree: \`${lock.worktreePath}\``,
    `Next expected step: ${nextStep}`,
    lock.revisionCycle ? `Revision cycle: ${lock.revisionCycle}` : null,
    lock.handoff ? `Handoff source: ${lock.handoff.sourceIssue} (${lock.handoff.sourceBranch})` : null,
    lock.handoffPath ? `Handoff record: \`${lock.handoffPath}\`` : null,
    lock.supersedesLockPath ? `Supersedes lock: \`${lock.supersedesLockPath}\`` : null,
    lock.supersedesFailedLockPath ? `Supersedes terminal failed lock: \`${lock.supersedesFailedLockPath}\`` : null,
    lock.baseRef ? `Base: \`${lock.baseRef}\` (${lock.baseCommit || "unknown"})` : `Base: local repository (${lock.baseCommit || "not a git worktree"})`,
    `Test mode: ${config.testMode ? "on" : "off"}`,
    "",
    productionAuthorizationClaimLine(reviewAuthorization),
    safetyNote,
  ].filter((line) => line !== null && line !== "").join("\n");
}

export function buildCompletionReport({
  finalText = "",
  issue,
  lock,
  productionChanged = false,
  reviewAuthorization = null,
  reviewPackage = null,
  revisionLines = [],
  summary = {},
}) {
  const publish = lock.publishHealth || {};
  const tests = publish.validationResults || summary.validationResults || [];
  const screenshotRefs = publish.screenshots || summary.screenshots || [];
  const pr = publish.prUrl || summary.prUrl || null;
  const preview = publish.previewUrl || summary.previewUrl || null;
  return [
    "Dispatcher runner completed successfully.",
    "",
    `Runner: ${lock.runner}`,
    `Repository: ${lock.repositoryName} (${lock.repositoryKind})`,
    `Branch: \`${lock.branch}\``,
    `Commit: ${summary.headCommit || publish.commitSha || "not reported"}`,
    `PR: ${pr || "not created by dispatcher"}`,
    `Preview URL: ${preview || "not applicable or not supplied"}`,
    `Screenshots: ${screenshotRefs.length ? screenshotRefs.join(", ") : "not supplied"}`,
    `Production changed: ${productionChanged ? "yes" : "no"}`,
    `Worktree: \`${lock.worktreePath}\``,
    ...revisionLines,
    `Changed files: ${summary.changedFiles?.length ? summary.changedFiles.map((file) => `\`${file}\``).join(", ") : "none reported by git status"}`,
    `Tests/checks: ${tests.length ? tests.map((item) => `${item.label || item.command || "check"}=${item.code === 0 || item.ok ? "pass" : "fail"}`).join(", ") : "runner reported in summary below"}`,
    "",
    "Validation / runner summary:",
    "```text",
    String(finalText || "").trim() || "(runner produced no final text)",
    "```",
    "",
    "Git status:",
    "```text",
    summary.status || "(clean)",
    "```",
    "",
    reviewPackage?.required
      ? [
        "Review package gate: passed.",
        `Preview URLs: ${reviewPackage.previewUrls?.length ? reviewPackage.previewUrls.join(", ") : "none required"}`,
        `Review assets: ${reviewPackage.assetReferences?.length ? reviewPackage.assetReferences.join(", ") : reviewPackage.hasAssets ? "reported by runner" : "none reported"}`,
        "Validation summary and exact founder decision request were present.",
      ].join("\n")
      : "Review package gate: not required for this issue.",
    "",
    completionAuthorizationLine(reviewAuthorization),
  ].join("\n");
}

function completionAuthorizationLine(reviewAuthorization) {
  const productionAuthorization = reviewAuthorization?.productionAuthorization || null;
  const productionAllowed = productionAuthorization?.production?.allowed === true;
  const productionDataAllowed = productionAuthorization?.productionData?.allowed === true;

  if (productionAllowed) {
    return productionDataAllowed
      ? `Authorized branch/review-package and production delivery actions (commit, push, PR, merge to main after required validation/CI, normal Vercel production deploy) may have been performed by the runner, plus only the issue-documented production data mutations. Deployment promotion, DNS changes, destructive actions, and unrelated external communications were not authorized.`
      : `Authorized branch/review-package and production delivery actions (commit, push, PR, merge to main after required validation/CI, normal Vercel production deploy) may have been performed by the runner. Production database/schema writes, deployment promotion, DNS changes, destructive actions, and unrelated external communications were not authorized.`;
  }

  if (productionDataAllowed) {
    return "Only the issue-documented production data mutations may have been performed after pre-write validation and a rollback/revocation plan. Commit, push, PR, merge/deploy, deployment promotion, DNS changes, destructive actions, and unrelated external communications were not authorized.";
  }

  if (reviewAuthorization?.allowed) {
    return "Authorized branch/review-package actions may have been performed by the runner. Production merge/deployment/promotion, DNS changes, production database/schema changes, destructive actions, and unrelated external communications were not authorized.";
  }

  return "No commit, push, deploy, DNS, production database, destructive, or external communication action was authorized.";
}

function activeRunFromLock(lock) {
  return {
    branch: lock.branch || null,
    currentStep: lock.currentStep || lock.publish?.stage || lock.status || null,
    heartbeatAt: lock.heartbeatAt || null,
    issue: lock.issue || lock.identifier || null,
    latestCommit: lock.headCommit || lock.publish?.commitSha || null,
    process: lock.process || null,
    repository: lock.repository || lock.repositoryName || null,
    repositoryPath: lock.repositoryPath || null,
    runner: lock.runner || null,
    startedAt: lock.createdAt || null,
    status: lock.status || null,
    worktree: lock.worktree || lock.worktreePath || null,
  };
}

export function buildWorkforceStatusFeed({ health = {}, inspection = null, recentEvents = [], now = isoNow } = {}) {
  const locks = health.locks || [];
  const alerts = health.alerts || [];
  const activeRuns = locks.filter((lock) => lock.active).map(activeRunFromLock);
  const reviewReadyDeliverables = [
    ...(health.lastCompletion ? [health.lastCompletion] : []),
    ...locks.filter((lock) => ["completed", "review_blocked"].includes(lock.status)).map((lock) => ({
      branch: lock.branch || null,
      issue: lock.issue || null,
      previewUrl: lock.publish?.previewUrl || null,
      repository: lock.repository || null,
      runner: lock.runner || null,
      status: lock.status,
      worktree: lock.worktree || null,
    })),
  ];
  return redactObservableValue({
    schemaVersion: WORKFORCE_STATUS_SCHEMA_VERSION,
    generatedAt: now(),
    workforce: {
      activeRunCount: activeRuns.length,
      queuedCount: health.queue?.holds?.length || 0,
      stalledOrFailedCount: alerts.filter((alert) => ["red", "amber"].includes(alert.severity)).length,
    },
    dispatcher: health.dispatcher || {},
    dispatcherStatus: {
      paused: health.paused || {},
      polling: health.polling || {},
      testMode: health.testMode ?? health.config?.testMode ?? null,
    },
    runners: health.runners || {},
    activeRuns,
    queuedIssues: (health.queue?.holds || []).map((hold) => ({
      eligibility: hold.eligibility || null,
      issue: hold.issue || null,
      reason: hold.reason || null,
      runner: hold.runner || null,
    })),
    stalledOrFailedWork: alerts,
    recentEvents: recentEvents.slice(-100),
    reviewReadyDeliverables,
    inspection: inspection ? {
      at: inspection.at || null,
      candidateCount: inspection.candidateCount || 0,
      issues: inspection.issues || [],
    } : null,
  });
}
