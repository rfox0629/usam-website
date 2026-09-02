import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyDispatchEligibility, deprecatedRoutingLabelsForIssue, runnerSelectionsForIssue } from "./dispatch-policy.mjs";
import { tailLines } from "./dispatcher-log-tail.mjs";
import { dispatcherLayout } from "./dispatcher-paths.mjs";
import {
  buildClaimAcknowledgment,
  buildCompletionReport,
  buildEligibilityReport,
  buildLifecycleEvent,
  buildWorkforceStatusFeed,
} from "./dispatcher-observability.mjs";
import { buildRunnerExecutionEnv } from "./execution-policy.mjs";
import { describeProductionAuthorizationForClaim } from "./production-authorization.mjs";
import { orderCandidateIssues } from "./queue-policy.mjs";
import {
  buildPickupSafetyNote,
  buildRunnerSafetyLines,
  detectReviewAuthorization,
  evaluatePreviewFirstIteration,
  evaluateReviewPackage,
} from "./review-policy.mjs";
import { claudeArgsForAuthorization, codexArgsForAuthorization } from "./runner-invocation-policy.mjs";
import { classifyRunnerCooldown, classifyRunnerEnvironmentUnavailable } from "./runner-cooldowns.mjs";
import {
  buildHandoffRecord,
  buildPreviewBlockedComment,
  buildVerifiedPreviewComment,
  classifyAutoPublishFailure,
  defaultPublishHealth,
  evaluateAutoPublishActions,
  expectedMarkersForReviewRoute,
  extractRequestedRoute,
  handoffRecordEligible,
  mergePublishHealth,
  previewDeploymentStrategy,
  publishFailureRecovery,
  validationCommandsForPackage,
  websiteAutoPublishEligibility,
} from "./website-auto-publish-policy.mjs";
import {
  buildFounderRevisionPromptSection,
  buildFounderRevisionReclaimComment,
  continuedFounderRevisionFromLock,
  extractMentionedPaths,
  issueCoreText,
  latestCompletedCycleLock,
  latestRevisionCycle,
  normalizeRepositories,
  repositoryForIssue,
  resolveFounderRevisionContext,
  revisionCycleAfter,
  supersedeLockRecord,
} from "./routing-policy.mjs";
import { planIssueWorktree } from "./worktree-policy.mjs";
import {
  createRepositoryWriterLockStore,
  formatRepositoryWriterBusyComment,
  hasRepositoryWriterHoldComment,
} from "./repository-writer-lock.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultConfigPath = join(rootDir, "config", "dispatcher.config.json");
const configPath = process.env.DISPATCHER_CONFIG || defaultConfigPath;
const config = JSON.parse(readFileSync(configPath, "utf8"));
const layout = dispatcherLayout(config, rootDir);
const dirs = layout.dirs;
const repositoryWriterLocks = createRepositoryWriterLockStore({
  lockRoot: join(dirs.locks, "repository-writers"),
  logger: (event, fields) => jsonLog(event, fields),
});

for (const dir of Object.values(dirs)) {
  mkdirSync(dir, { recursive: true });
}

const flags = new Set(process.argv.slice(2));
const once = flags.has("--once");
const statusOnly = flags.has("--status");
const inspectQueueOnly = flags.has("--inspect-queue") || flags.has("--dry-run");
const dispatcherVersion = "usa-81-usa82-release-matrix-v3";
const runnerNames = ["codex", "claude"];
const repositoryRegistry = normalizeRepositories(config, { defaultWorktreeRoot: dirs.worktrees });
const heartbeatIntervalMs = Math.max(5000, Number(config.heartbeatIntervalMs || 15000));
const healthStaleAfterMs = Math.max(heartbeatIntervalMs * 2, Number(config.health?.staleAfterMs || 300000));
const readyForDispatcherStaleMs = Math.max(60000, Number(config.health?.readyForDispatcherStaleMs || 120000));
const bridgeStaleAfterMs = Math.max(heartbeatIntervalMs * 2, Number(config.health?.bridgeStaleAfterMs || 300000));
const cooldownResumeDelayMs = Math.max(0, Number(config.cooldowns?.resumeDelayMs || 120000));
const defaultCooldownMs = Math.max(cooldownResumeDelayMs, Number(config.cooldowns?.defaultMs || 60 * 60 * 1000));
const environmentRetryMs = Math.max(heartbeatIntervalMs, Number(config.environmentRetryMs || 5 * 60 * 1000));
const fallbackCooldownInitialMs = Math.max(cooldownResumeDelayMs, Number(config.cooldowns?.fallbackInitialMs || 15 * 60 * 1000));
const fallbackCooldownMaxMs = Math.max(fallbackCooldownInitialMs, Number(config.cooldowns?.fallbackMaxMs || 2 * 60 * 60 * 1000));
const defaultCooldownTimeZone = config.cooldowns?.defaultTimeZone || process.env.TZ || "America/Chicago";
const websiteAutoPublish = {
  enabled: config.websiteAutoPublish?.enabled !== false,
  maxRetries: Number.isFinite(Number(config.websiteAutoPublish?.maxRetries)) ? Number(config.websiteAutoPublish.maxRetries) : 2,
  publisherTimeoutMs: Math.max(60000, Number(config.websiteAutoPublish?.publisherTimeoutMs || 45 * 60 * 1000)),
  retryMs: Number.isFinite(Number(config.websiteAutoPublish?.retryMs)) ? Number(config.websiteAutoPublish.retryMs) : 5 * 60 * 1000,
  vercelTimeoutMs: Math.max(60000, Number(config.websiteAutoPublish?.vercelTimeoutMs || 10 * 60 * 1000)),
  verificationTimeoutMs: Math.max(10000, Number(config.websiteAutoPublish?.verificationTimeoutMs || 120000)),
};

function isoNow() {
  return new Date().toISOString();
}

function dateStamp() {
  return isoNow().slice(0, 10);
}

function jsonLog(event, fields = {}) {
  const entry = {
    at: isoNow(),
    event,
    ...fields,
  };
  const line = `${JSON.stringify(entry)}\n`;
  writeFileSync(join(dirs.logs, `dispatcher-${dateStamp()}.jsonl`), line, { flag: "a" });
  process.stdout.write(line);
}

function writeState(name, value) {
  writeFileSync(join(dirs.state, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
}

function readState(name, fallback = null) {
  const path = join(dirs.state, `${name}.json`);
  if (!existsSync(path)) {
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    jsonLog("state_read_failed", { error: error.message, name });
    return fallback;
  }
}

function ageMs(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? Date.now() - time : null;
}

function secondsFromMs(value) {
  return value === null ? null : Math.max(0, Math.round(value / 1000));
}

function alertKey(alert) {
  return [
    alert.code || "unknown",
    alert.issue || "",
    alert.runner || "",
    alert.repository || "",
  ].join(":");
}

function dedupeAlerts(alerts) {
  const seen = new Set();
  const unique = [];
  for (const alert of alerts) {
    const key = alertKey(alert);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(alert);
  }
  return unique;
}

function invalidOwnershipReason(reason) {
  return /\b(?:missing ownership label|both ownership labels present|deprecated routing labels present)\b/i.test(reason || "");
}

function holdReadyForDispatcherAgeMs(hold) {
  const readySince = hold?.readyForDispatcherSince || hold?.issueUpdatedAt || hold?.issueCreatedAt || null;
  return ageMs(readySince);
}

function workforceEventLogPath() {
  return join(dirs.events, `workforce-events-${dateStamp()}.jsonl`);
}

function writeWorkforceEvent(eventType, fields = {}) {
  const entry = buildLifecycleEvent(eventType, fields);
  writeFileSync(workforceEventLogPath(), `${JSON.stringify(entry)}\n`, { flag: "a" });
  return entry;
}

function recentWorkforceEvents(maxEvents = 100) {
  return tailLines(workforceEventLogPath(), 600)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .slice(-maxEvents);
}

function recentLogEvents(maxEvents = 50) {
  return tailLines(join(dirs.logs, `dispatcher-${dateStamp()}.jsonl`), 300)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .slice(-maxEvents);
}

function safeIssueFile(identifier) {
  return identifier.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function lockPath(identifier) {
  return join(dirs.locks, `${safeIssueFile(identifier)}.json`);
}

function readJsonFile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readLocks() {
  return readdirSync(dirs.locks)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const path = join(dirs.locks, file);
      try {
        return { file, path, lock: readJsonFile(path) };
      } catch (error) {
        jsonLog("lock_read_failed", { file, error: error.message });
        return null;
      }
    })
    .filter(Boolean);
}

function readIssueLockHistory(identifier) {
  const base = `${safeIssueFile(identifier)}.json`;
  return readdirSync(dirs.locks)
    .filter((file) => file === base || file.startsWith(`${base}.`))
    .map((file) => {
      const path = join(dirs.locks, file);
      try {
        return { file, path, lock: readJsonFile(path) };
      } catch (error) {
        jsonLog("lock_history_read_failed", { file, error: error.message, issue: identifier });
        return null;
      }
    })
    .filter(Boolean);
}

function isActiveLock(lock) {
  if (!["claimed", "running", "retrying"].includes(lock.status)) {
    return false;
  }

  const heartbeat = Date.parse(lock.heartbeatAt || lock.createdAt || 0);
  if (!Number.isFinite(heartbeat)) {
    return true;
  }

  return Date.now() - heartbeat < config.lockStaleAfterMs;
}

function isBlockingLock(lock) {
  if (lock.status === "cooldown") {
    return Boolean(activeCooldown(lock.runner));
  }

  return isActiveLock(lock) || ["crashed", "failed"].includes(lock.status);
}

function failedLockHasTerminalExit(lock) {
  return lock?.status === "failed"
    && Boolean(lock.failedAt)
    && (
      Object.prototype.hasOwnProperty.call(lock, "lastExitCode")
      || lock.lastSignal
      || lock.timedOut === true
    );
}

function lockProcessCheck(lock) {
  const pid = Number(lock.runnerPid || lock.processPid || lock.childPid || 0);
  if (Number.isInteger(pid) && pid > 0) {
    try {
      process.kill(pid, 0);
      return { active: true, method: "pid", pid };
    } catch (error) {
      if (error.code === "ESRCH") {
        return { active: false, method: "pid", pid };
      }
      return { active: true, error: error.code || error.message, method: "pid", pid };
    }
  }

  if (failedLockHasTerminalExit(lock)) {
    return { active: false, method: "terminal_exit_recorded", pid: null };
  }

  return { active: isActiveLock(lock), method: "heartbeat", pid: null };
}

function failedLockSupersedeDecision(lock) {
  const processCheck = lockProcessCheck(lock);
  return {
    canSupersede: lock?.status === "failed" && failedLockHasTerminalExit(lock) && !processCheck.active,
    processCheck,
  };
}

function recoverStaleLocks() {
  for (const item of readLocks()) {
    if (!["claimed", "running", "retrying"].includes(item.lock.status)) {
      continue;
    }

    if (isActiveLock(item.lock)) {
      continue;
    }

    const recovered = {
      ...item.lock,
      status: "crashed",
      crashedAt: isoNow(),
      note: "Recovered by dispatcher startup because heartbeat was stale.",
    };
    writeFileSync(item.path, `${JSON.stringify(recovered, null, 2)}\n`);
    writeWorkforceEvent("stalled", {
      currentStep: "stale_lock_recovery",
      issue: item.lock.identifier,
      metadata: { lockPath: item.path, previousStatus: item.lock.status },
      repository: item.lock.repositoryName || null,
      repositoryPath: item.lock.repositoryPath || null,
      runner: item.lock.runner,
    });
    jsonLog("lock_recovered", { issue: item.lock.identifier, runner: item.lock.runner, lock: item.path });
  }
}

function recoverCooldownFailures() {
  for (const item of readLocks()) {
    if (!["failed", "crashed"].includes(item.lock.status) || item.lock.runnerFailureType === "runner_cooldown") {
      continue;
    }

    const cooldown = classifyRunnerCooldown({
      code: item.lock.lastExitCode,
      stderr: tailText(item.lock.stderrPath),
      stdout: tailText(item.lock.stdoutPath),
      timedOut: item.lock.timedOut || false,
    }, {
      defaultCooldownMs: fallbackCooldownMsForRunner(item.lock.runner) || defaultCooldownMs,
      defaultTimeZone: defaultCooldownTimeZone,
      now: new Date(item.lock.failedAt || item.lock.lastAttemptAt || item.lock.heartbeatAt || Date.now()),
      resumeDelayMs: cooldownResumeDelayMs,
    });

    if (!cooldown || Date.parse(cooldown.resumeAfter) <= Date.now()) {
      continue;
    }

    const savedCooldown = setRunnerCooldown(item.lock.runner, cooldown, {
      branch: item.lock.branch,
      issue: item.lock.identifier,
      lockPath: item.path,
      recoveredFromFailedLock: true,
      repository: item.lock.repositoryName || null,
      worktree: item.lock.worktreePath,
    });
    const recovered = {
      ...item.lock,
      cooldownDetectedAt: savedCooldown.detectedAt,
      cooldownResetAt: savedCooldown.resetAt,
      cooldownResumeAfter: savedCooldown.resumeAfter,
      failedAt: null,
      heartbeatAt: isoNow(),
      recoveredAt: isoNow(),
      runnerFailureType: "runner_cooldown",
      status: "cooldown",
    };
    writeFileSync(item.path, `${JSON.stringify(recovered, null, 2)}\n`);
    jsonLog("failed_lock_recovered_as_cooldown", {
      issue: item.lock.identifier,
      resetAt: savedCooldown.resetAt,
      resumeAfter: savedCooldown.resumeAfter,
      runner: item.lock.runner,
    });
  }
}

function pauseFile(runner) {
  return join(dirs.control, `${runner}.pause`);
}

function readCooldowns() {
  return readState("runner-cooldowns", { at: null, runners: {} }) || { at: null, runners: {} };
}

function writeCooldowns(state) {
  writeState("runner-cooldowns", {
    at: isoNow(),
    runners: state.runners || {},
  });
}

function readCooldownBackoff() {
  return readState("runner-cooldown-backoff", { at: null, runners: {} }) || { at: null, runners: {} };
}

function fallbackCooldownMsForRunner(runner) {
  const state = readCooldownBackoff();
  const previousMs = Number(state.runners?.[runner]?.lastMs || 0);
  return previousMs > 0
    ? Math.min(fallbackCooldownMaxMs, previousMs * 2)
    : fallbackCooldownInitialMs;
}

function recordCooldownBackoff(runner, cooldown) {
  const state = readCooldownBackoff();
  const next = { ...state, runners: { ...(state.runners || {}) } };

  if (cooldown.inferredReset) {
    next.runners[runner] = {
      lastMs: fallbackCooldownMsForRunner(runner),
      resetAt: cooldown.resetAt,
      resumeAfter: cooldown.resumeAfter,
      updatedAt: isoNow(),
    };
  } else {
    delete next.runners[runner];
  }

  writeState("runner-cooldown-backoff", {
    at: isoNow(),
    runners: next.runners,
  });
}

function cleanupExpiredCooldowns() {
  const state = readCooldowns();
  const next = { ...state, runners: { ...(state.runners || {}) } };
  let changed = false;

  for (const runner of Object.keys(next.runners)) {
    const cooldown = next.runners[runner];
    const resumeAfter = Date.parse(cooldown?.resumeAfter || cooldown?.resetAt || "");
    if (Number.isFinite(resumeAfter) && Date.now() >= resumeAfter) {
      delete next.runners[runner];
      changed = true;
      jsonLog("runner_cooldown_resumed", { runner, resumeAfter: cooldown.resumeAfter || null, resetAt: cooldown.resetAt || null });
    }
  }

  if (changed) {
    writeCooldowns(next);
  }

  return next;
}

function activeCooldown(runner) {
  const state = cleanupExpiredCooldowns();
  const cooldown = state.runners?.[runner] || null;
  if (!cooldown) {
    return null;
  }

  const resumeAfter = Date.parse(cooldown.resumeAfter || cooldown.resetAt || "");
  if (!Number.isFinite(resumeAfter) || Date.now() >= resumeAfter) {
    return null;
  }

  return cooldown;
}

function setRunnerCooldown(runner, cooldown, fields = {}) {
  const state = cleanupExpiredCooldowns();
  const next = {
    ...state,
    runners: {
      ...(state.runners || {}),
      [runner]: {
        ...cooldown,
        ...fields,
        runner,
        status: "active",
        updatedAt: isoNow(),
      },
    },
  };
  writeCooldowns(next);
  jsonLog("runner_cooldown_started", {
    issue: fields.issue || null,
    resetAt: cooldown.resetAt,
    resumeAfter: cooldown.resumeAfter,
    runner,
  });
  if (fields.issue) {
    writeWorkforceEvent("retry_scheduled", {
      currentStep: cooldown.reason === "runner_environment_unavailable" ? "runner_environment_unavailable" : "runner_cooldown",
      issue: fields.issue,
      metadata: {
        reason: cooldown.reason || "runner_cooldown",
        resetAt: cooldown.resetAt || null,
        resumeAfter: cooldown.resumeAfter || null,
      },
      repository: fields.repository || null,
      runner,
    });
  }
  return next.runners[runner];
}

function manualPauseActive(runner) {
  if (config.pauses?.global || existsSync(pauseFile("global"))) {
    return true;
  }

  return Boolean(config.pauses?.[runner] || existsSync(pauseFile(runner)));
}

function isPaused(runner) {
  return manualPauseActive(runner) || Boolean(activeCooldown(runner));
}

function pausedState() {
  return {
    global: isPaused("codex") && isPaused("claude"),
    codex: isPaused("codex"),
    claude: isPaused("claude"),
  };
}

function emitHeartbeat(fields = {}) {
  writeState("heartbeat", {
    at: isoNow(),
    configPath,
    dispatcherVersion,
    pid: process.pid,
    rootDir,
    runtimeRoot: dirs.runtime,
    testMode: config.testMode,
    ...fields,
  });
  if (fields.issue) {
    writeWorkforceEvent("heartbeat", {
      currentStep: fields.currentStep || fields.phase || "heartbeat",
      issue: fields.issue,
      metadata: {
        latestActivity: fields.latestActivity || null,
        processState: fields.processState || null,
        startTime: fields.startTime || null,
      },
      repository: fields.repository || fields.repositoryName || null,
      repositoryPath: fields.repositoryPath || null,
      runner: fields.runner || null,
      branch: fields.branch || null,
      latestCommit: fields.latestCommit || null,
      pid: fields.pid || process.pid,
    });
  }
}

function runnerLaunchCommand(runner) {
  const runnerConfig = config.runners[runner];
  if (!runnerConfig) {
    return "not configured";
  }

  if (runner === "codex") {
    return `${runnerConfig.command} ${(runnerConfig.args || []).join(" ")} --cd <worktree> --output-last-message <tmp-last-message> -`;
  }

  return `${runnerConfig.command} ${(runnerConfig.args || []).join(" ")} --debug-file <debug-log> <prompt>`;
}

function buildHealthSnapshot(phase = "status") {
  const paused = pausedState();
  const heartbeat = readState("heartbeat");
  const lastPoll = readState("last-poll");
  const lastPickup = readState("last-successful-pickup");
  const lastCompletion = readState("last-completion");
  const lastError = readState("last-error");
  const bridgeState = readState("claude-bridge", null);
  const queueHolds = readState("queue-holds", { holds: [] });
  const registry = readState("runner-registry", { runners: {} });
  const cooldownState = cleanupExpiredCooldowns();
  const heartbeatAgeMs = ageMs(heartbeat?.at);
  const pollAgeMs = ageMs(lastPoll?.at);
  const locks = readLocks().map((item) => {
    const process = lockProcessCheck(item.lock);
    return {
      active: isActiveLock(item.lock),
      attempts: item.lock.attempts,
      baseCommit: item.lock.baseCommit || null,
      branch: item.lock.branch,
      createdAt: item.lock.createdAt || null,
      currentStep: item.lock.currentStep || item.lock.publishHealth?.stage || null,
      failedAt: item.lock.failedAt || null,
      heartbeatAt: item.lock.heartbeatAt || null,
      issue: item.lock.identifier,
      process,
      processPid: item.lock.processPid || null,
      repository: item.lock.repositoryName || "website",
      repositoryKind: item.lock.repositoryKind || "git-worktree",
      repositoryPath: item.lock.repositoryPath || config.git.repositoryPath,
      runner: item.lock.runner,
      runnerPid: item.lock.runnerPid || null,
      status: item.lock.status,
      timedOut: item.lock.timedOut || false,
      worktree: item.lock.worktreePath,
      publish: mergePublishHealth(item.lock.publishHealth),
    };
  });
  const activeLocks = locks.filter((lock) => lock.active);
  const failedLocks = locks.filter((lock) => ["failed", "crashed"].includes(lock.status));
  const previewBlockedLocks = locks.filter((lock) => (
    lock.publish.implementationComplete
    && !lock.publish.previewUrlPosted
    && Boolean(lock.publish.exactBlocker)
  ));
  const alerts = [];

  if (!process.env.LINEAR_API_KEY) {
    alerts.push({
      code: "linear_credentials_missing",
      severity: "red",
      message: "LINEAR_API_KEY is not available to the dispatcher service environment.",
    });
  }

  if (heartbeatAgeMs !== null && heartbeatAgeMs > healthStaleAfterMs) {
    alerts.push({
      code: "heartbeat_stale",
      severity: "red",
      message: `Dispatcher heartbeat is stale by ${secondsFromMs(heartbeatAgeMs)} seconds.`,
    });
  }

  if (!paused.global && pollAgeMs !== null && pollAgeMs > healthStaleAfterMs) {
    alerts.push({
      code: "poll_stale",
      severity: "amber",
      message: `Linear polling is stale by ${secondsFromMs(pollAgeMs)} seconds.`,
    });
  }

  if (bridgeState?.lastFailure?.message) {
    alerts.push({
      code: "claude_bridge_failure",
      severity: "red",
      message: `Claude bridge last failed at ${bridgeState.lastFailure.at || "unknown time"}: ${bridgeState.lastFailure.message}`,
    });
  }

  const bridgePollAgeMs = ageMs(bridgeState?.lastPollAt || bridgeState?.at || null);
  if (bridgeState && bridgePollAgeMs !== null && bridgePollAgeMs > bridgeStaleAfterMs) {
    alerts.push({
      code: "claude_bridge_stale",
      severity: "amber",
      message: `Claude bridge polling is stale by ${secondsFromMs(bridgePollAgeMs)} seconds.`,
    });
  }

  for (const lock of activeLocks) {
    const lockAge = ageMs(lock.heartbeatAt);
    if (lockAge !== null && lockAge > config.lockStaleAfterMs) {
      alerts.push({
        code: "lock_stale",
        issue: lock.issue,
        runner: lock.runner,
        severity: "red",
        message: `${lock.issue} has a stale ${lock.runner} lock.`,
      });
    }
    const createdAge = ageMs(lock.createdAt);
    if (lock.status === "claimed" && createdAge !== null && createdAge > heartbeatIntervalMs * 2 && !lock.runnerPid) {
      alerts.push({
        code: "claimed_issue_no_runner_process",
        issue: lock.issue,
        runner: lock.runner,
        severity: "red",
        message: `${lock.issue} is claimed but no runner process has been recorded.`,
      });
    }
    if (["running", "retrying"].includes(lock.status) && lock.process?.active === false) {
      alerts.push({
        code: "runner_process_missing",
        issue: lock.issue,
        pid: lock.process.pid || lock.runnerPid || lock.processPid || null,
        runner: lock.runner,
        severity: "red",
        message: `${lock.issue} has a ${lock.runner} lock, but the recorded runner process is no longer active.`,
      });
    }
  }

  for (const lock of failedLocks) {
    alerts.push({
      code: "runner_failure_blocking_pickup",
      issue: lock.issue,
      runner: lock.runner,
      severity: "amber",
      message: `${lock.issue} has a ${lock.status} lock that blocks duplicate pickup until an operator clears it.`,
    });
  }

  for (const lock of previewBlockedLocks) {
    alerts.push({
      code: "implementation_complete_preview_blocked",
      issue: lock.issue,
      runner: lock.runner,
      severity: "amber",
      message: `${lock.issue} implementation is complete, but preview publishing is blocked: ${lock.publish.exactBlocker}`,
      nextRetryAt: lock.publish.nextRetryAt || null,
    });
  }

  for (const runner of runnerNames) {
    const cooldown = cooldownState.runners?.[runner];
    if (cooldown) {
      const environmentUnavailable = cooldown.reason === "runner_environment_unavailable";
      alerts.push({
        code: environmentUnavailable ? "runner_environment_unavailable" : "runner_cooldown",
        runner,
        severity: environmentUnavailable ? "red" : "amber",
        message: environmentUnavailable
          ? `${runner} runner has no available environments; retrying after ${cooldown.resumeAfter || cooldown.resetAt}.`
          : `${runner} runner is cooling down until ${cooldown.resumeAfter || cooldown.resetAt}.`,
      });
    }
  }

  if (lastError?.code === "MISSING_LINEAR_API_KEY") {
    alerts.push({
      code: "linear_auth_failed",
      severity: "red",
      message: "Most recent poll failed because LINEAR_API_KEY was missing.",
    });
  } else if (lastError?.message) {
    alerts.push({
      code: "poll_error",
      severity: "amber",
      message: lastError.message,
    });
  }

  const runners = Object.fromEntries(runnerNames.map((runner) => {
    const runnerLocks = locks.filter((lock) => lock.runner === runner && lock.active);
    const runnerInfo = registry.runners?.[runner] || {};
    const cooldown = cooldownState.runners?.[runner] || null;
    const availability = cooldown
      ? "cooldown"
      : manualPauseActive(runner)
        ? "paused"
      : runnerLocks.length
        ? "busy"
        : runnerInfo.available === false
          ? "error"
          : "available";

    if (runnerInfo.available === false) {
      alerts.push({
        code: `${runner}_unavailable`,
        runner,
        severity: "red",
        message: `${runner} runner command is unavailable: ${runnerInfo.error || "unknown error"}`,
      });
    }

    return [runner, {
      active: runnerLocks.length,
      assignments: runnerLocks.map((lock) => ({
        branch: lock.branch,
        issue: lock.issue,
        repository: lock.repository,
        status: lock.status,
        worktree: lock.worktree,
      })),
      availability,
      cooldown,
      command: runnerLaunchCommand(runner),
      limit: config.maxWorkers[runner],
      version: runnerInfo.version || null,
      versionCheckedAt: runnerInfo.checkedAt || null,
    }];
  }));

  const queueDepth = Number(lastPoll?.candidateCount || 0);
  if (!paused.global && queueDepth > 0) {
    alerts.push({
      code: "queue_backlog",
      severity: "amber",
      message: `Dispatcher queue backlog has ${queueDepth} Ready for Dispatcher candidate${queueDepth === 1 ? "" : "s"}.`,
      queueDepth,
    });
  }

  for (const hold of queueHolds.holds || []) {
    const reason = hold.reason || hold.eligibility?.reason || null;
    if (invalidOwnershipReason(reason)) {
      alerts.push({
        code: "invalid_ownership_labels",
        issue: hold.issue,
        severity: "red",
        message: `${hold.issue} has invalid dispatcher ownership: ${reason}.`,
        reason,
      });
    }

    const holdAgeMs = holdReadyForDispatcherAgeMs(hold);
    if (holdAgeMs !== null && holdAgeMs > readyForDispatcherStaleMs) {
      alerts.push({
        code: "ready_for_dispatcher_stuck",
        issue: hold.issue,
        severity: "amber",
        message: `${hold.issue} has remained in Ready for Dispatcher for at least ${secondsFromMs(holdAgeMs)} seconds.`,
        reason,
      });
    }
  }

  if (!paused.global && queueDepth > 0 && (queueHolds.holds || []).length >= queueDepth) {
    alerts.push({
      code: "eligible_queue_not_picked_up",
      severity: "amber",
      message: "Linear has dispatcher candidates, but all visible candidates are currently held.",
    });
  }

  const dispatcherState = paused.global
    ? "paused"
    : heartbeatAgeMs === null
      ? "unknown"
      : heartbeatAgeMs > healthStaleAfterMs
        ? "stale"
        : "running";

  return {
    alerts: dedupeAlerts(alerts),
    config: {
      healthStaleAfterMs,
      heartbeatIntervalMs,
      maxRetries: config.maxRetries,
      maxWorkers: config.maxWorkers,
      pollIntervalMs: config.pollIntervalMs,
      readyForDispatcherStaleMs,
      repositories: Object.fromEntries(Object.entries(repositoryRegistry.repositories).map(([name, repository]) => [name, {
        kind: repository.kind,
        repositoryPath: repository.repositoryPath,
        worktreeRoot: repository.worktreeRoot,
      }])),
      runtimeRoot: dirs.runtime,
      releaseWorktreeRoot: dirs.releaseWorktrees,
      runnerTimeoutMs: config.runnerTimeoutMs,
      testMode: config.testMode,
      writableGitMetadataPath: config.git.metadataPath || null,
    },
    configPath,
    credentials: {
      linearApiConfigured: Boolean(process.env.LINEAR_API_KEY),
    },
    dispatcher: {
      heartbeatAgeSeconds: secondsFromMs(heartbeatAgeMs),
      heartbeatAt: heartbeat?.at || null,
      lastError: lastError || null,
      phase,
      pid: heartbeat?.pid || null,
      state: dispatcherState,
      version: dispatcherVersion,
    },
    bridge: {
      activeTask: bridgeState?.activeTask || null,
      lastFailure: bridgeState?.lastFailure || null,
      lastPollAgeSeconds: secondsFromMs(bridgePollAgeMs),
      lastPollAt: bridgeState?.lastPollAt || null,
      paused: bridgeState?.paused || false,
    },
    generatedAt: isoNow(),
    lastCompletion,
    lastPickup,
    locks,
    paused,
    polling: {
      candidateCount: queueDepth,
      lastPollAgeSeconds: secondsFromMs(pollAgeMs),
      lastPollAt: lastPoll?.at || null,
      pollIntervalMs: config.pollIntervalMs,
    },
    queue: {
      holds: queueHolds.holds || [],
      queueDepth,
      updatedAt: queueHolds.at || null,
    },
    runnerCooldowns: cooldownState,
    recentFailures: failedLocks,
    recentEvents: recentLogEvents(20),
    rootDir,
    runtimeRoot: dirs.runtime,
    runners,
    testMode: config.testMode,
  };
}

function writeHealthSnapshot(phase = "service") {
  const snapshot = buildHealthSnapshot(phase);
  writeState("health", snapshot);
  writeState("alerts", { alerts: snapshot.alerts, at: snapshot.generatedAt });
  writeState("workforce-status", buildWorkforceStatusFeed({
    health: snapshot,
    recentEvents: recentWorkforceEvents(100),
  }));
  for (const alert of snapshot.alerts.filter((item) => [
    "claimed_issue_no_runner_process",
    "claude_bridge_failure",
    "claude_bridge_stale",
    "heartbeat_stale",
    "invalid_ownership_labels",
    "lock_stale",
    "poll_stale",
    "ready_for_dispatcher_stuck",
    "runner_process_missing",
  ].includes(item.code))) {
    writeWorkforceEvent("stalled", {
      currentStep: alert.code,
      issue: alert.issue || null,
      metadata: alert,
      runner: alert.runner || null,
    });
  }
  return snapshot;
}

function dispatcherStatus() {
  return {
    ...buildHealthSnapshot("status"),
    rootDir,
  };
}

async function linearGraphql(query, variables = {}) {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    const error = new Error("LINEAR_API_KEY is not configured.");
    error.code = "MISSING_LINEAR_API_KEY";
    throw error;
  }

  const response = await fetch(config.linear.apiUrl, {
    body: JSON.stringify({ query, variables }),
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors?.length) {
    const error = new Error(payload.errors?.map((item) => item.message).join("; ") || `Linear HTTP ${response.status}`);
    error.payload = payload;
    throw error;
  }

  return payload.data;
}

const issuesQuery = `
query DispatcherIssues($teamKey: String!, $first: Int!) {
  issues(
    first: $first
    filter: {
      team: { key: { eq: $teamKey } }
      labels: { name: { eq: "Ready for Dispatcher" } }
    }
  ) {
    nodes {
      id
      identifier
      title
      description
      url
      branchName
      createdAt
      updatedAt
      state { name type }
      labels { nodes { name parent { name } } }
      comments(first: 50) {
        nodes {
          user { name displayName }
          body
          createdAt
        }
      }
    }
  }
}`;

const stateQuery = `
query WorkflowState($teamKey: String!, $name: String!) {
  workflowStates(first: 20, filter: { team: { key: { eq: $teamKey } }, name: { eq: $name } }) {
    nodes { id name }
  }
}`;

const issueUpdateMutation = `
mutation DispatcherIssueUpdate($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) {
    success
    issue { id identifier state { name } }
  }
}`;

const commentMutation = `
mutation DispatcherComment($input: CommentCreateInput!) {
  commentCreate(input: $input) {
    success
    comment { id }
  }
}`;

async function listCandidateIssues() {
  const data = await linearGraphql(issuesQuery, {
    first: config.linear.pollFirst,
    teamKey: config.linear.teamKey,
  });

  const filter = String(process.env.USAM_DISPATCHER_ISSUE_FILTER || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!filter.length) {
    return data.issues.nodes;
  }
  const allowed = new Set(filter);
  return data.issues.nodes.filter((issue) => allowed.has(issue.identifier));
}

async function getWorkflowStateId(name) {
  const data = await linearGraphql(stateQuery, {
    name,
    teamKey: config.linear.teamKey,
  });
  const state = data.workflowStates.nodes[0];
  if (!state) {
    throw new Error(`Linear workflow state not found: ${name}`);
  }
  return state.id;
}

async function updateIssueState(issue, stateName) {
  const stateId = await getWorkflowStateId(stateName);
  await linearGraphql(issueUpdateMutation, {
    id: issue.id,
    input: { stateId },
  });
  jsonLog("linear_state_updated", { issue: issue.identifier, state: stateName });
}

async function postIssueComment(issue, body) {
  await linearGraphql(commentMutation, {
    input: {
      body,
      issueId: issue.id,
    },
  });
  jsonLog("linear_comment_posted", { issue: issue.identifier });
}

function classifyIssue(issue) {
  const currentLocks = readLocks();
  const existingIssueLock = currentLocks.find((item) => item.lock.identifier === issue.identifier && isBlockingLock(item.lock));
  const failedSupersedeDecision = existingIssueLock ? failedLockSupersedeDecision(existingIssueLock.lock) : null;
  const issueLockHistory = readIssueLockHistory(issue.identifier);
  const previousCompletedLockItem = latestCompletedCycleLock(issueLockHistory);
  const previousCompletedLock = previousCompletedLockItem?.lock || null;
  const previousRevisionCycle = latestRevisionCycle(issueLockHistory);
  const expectedPaths = extractMentionedPaths(issueCoreText(issue));
  const route = repositoryForIssue(issue, config, {
    defaultWorktreeRoot: dirs.worktrees,
    expectedPaths,
  });
  const repository = route.repository;
  const classification = classifyDispatchEligibility(issue, {
    blockingLock: existingIssueLock?.lock || null,
    blockingLockCooldown: existingIssueLock?.lock?.status === "cooldown" ? activeCooldown(existingIssueLock.lock.runner) : null,
    blockingLockSupersedable: failedSupersedeDecision?.canSupersede || false,
    config,
    expectedPaths,
    previousCompletedLockPath: previousCompletedLockItem?.path || null,
    repository,
    previousCompletedLock,
    previousRevisionCycle,
    repositoryRouteMatched: route.matched,
  });
  const handoff = latestHandoffForDestination(issue.identifier);
  if (!classification.eligible && handoff && repository?.repositoryPath) {
    const labels = new Set((issue.labels?.nodes || []).map((label) => label.name));
    const stateName = issue.state?.name || "unknown";
    const runnerSelections = runnerSelectionsForIssue(issue, config.linear);
    const deprecatedRoutingLabels = deprecatedRoutingLabelsForIssue(issue, config.linear);
    const canUseHandoff = labels.has(config.linear.labelReadyForDispatcher)
      && runnerSelections.length === 1
      && runnerSelections[0] === "codex"
      && deprecatedRoutingLabels.length === 0
      && [config.linear.statusTodo, config.linear.statusInProgress].includes(stateName)
      && !existingIssueLock;
    if (canUseHandoff) {
      return {
        eligible: true,
        expectedPaths,
        handoff: handoff.handoff,
        handoffPath: handoff.path,
        previousCompletedLock,
        previousCompletedLockPath: previousCompletedLockItem?.path || null,
        previousRevisionCycle,
        reclaim: null,
        repository,
        route,
        runner: "codex",
      };
    }
  }
  return { ...classification, route };
}

function activeRunnerCount(runner) {
  return readLocks().filter((item) => item.lock.runner === runner && isActiveLock(item.lock)).length;
}

function hasPathOverlap(expectedPaths, repositoryName) {
  if (!expectedPaths.length) {
    return null;
  }

  for (const item of readLocks()) {
    if (!isActiveLock(item.lock)) {
      continue;
    }
    if ((item.lock.repositoryName || "website") !== repositoryName) {
      continue;
    }

    const activePaths = item.lock.expectedPaths || [];
    const overlap = expectedPaths.filter((path) => activePaths.includes(path));
    if (overlap.length) {
      return { issue: item.lock.identifier, overlap };
    }
  }

  return null;
}

function parseWorktreeList(output) {
  const entries = [];
  let current = null;

  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (current) {
        entries.push(current);
      }
      current = { worktreePath: line.slice("worktree ".length) };
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length);
    } else if (line.startsWith("branch ")) {
      current.branchRef = line.slice("branch ".length);
      current.branch = current.branchRef.replace(/^refs\/heads\//, "");
    }
  }

  if (current) {
    entries.push(current);
  }

  return entries;
}

async function reusableWorktreeForIssue(issue, repository) {
  if (repository.kind === "local") {
    return {
      baseCommit: null,
      branch: issue.branchName || `${repository.branchPrefix}/${issue.identifier.toLowerCase()}`,
      source: "local_repository",
      worktreePath: repository.repositoryPath,
    };
  }

  if (!issue.branchName) {
    return null;
  }

  const output = await git(["worktree", "list", "--porcelain"], repository.repositoryPath, 30000).catch((error) => {
    jsonLog("worktree_reuse_lookup_failed", { error: error.message, issue: issue.identifier, repository: repository.name });
    return "";
  });
  const reusable = parseWorktreeList(output).find((entry) => entry.branch === issue.branchName);
  if (!reusable || !existsSync(reusable.worktreePath)) {
    return null;
  }

  return {
    baseCommit: reusable.head || null,
    branch: reusable.branch,
    source: "linear_branch_worktree",
    worktreePath: reusable.worktreePath,
  };
}

async function reusableWorktreeFromPreviousLock(issue, previousLock) {
  if (!previousLock?.worktreePath || !previousLock?.branch || previousLock.identifier !== issue.identifier) {
    return null;
  }

  if (!existsSync(previousLock.worktreePath)) {
    return null;
  }

  const branch = await git(["branch", "--show-current"], previousLock.worktreePath, 30000).catch((error) => {
    jsonLog("previous_worktree_branch_lookup_failed", { error: error.message, issue: issue.identifier, worktree: previousLock.worktreePath });
    return "";
  });
  if (branch && branch !== previousLock.branch) {
    return null;
  }

  const head = await git(["rev-parse", "HEAD"], previousLock.worktreePath, 30000).catch((error) => {
    jsonLog("previous_worktree_head_lookup_failed", { error: error.message, issue: issue.identifier, worktree: previousLock.worktreePath });
    return null;
  });
  if (!head) {
    return null;
  }

  return {
    baseCommit: head,
    branch: previousLock.branch,
    source: `previous_${previousLock.status || "old"}_lock`,
    worktreePath: previousLock.worktreePath,
  };
}

async function branchExists(repositoryPath, branch) {
  return git(["show-ref", "--verify", `refs/heads/${branch}`], repositoryPath, 30000)
    .then(() => true)
    .catch(() => false);
}

async function acquireLock(issue, runner, expectedPaths, repository, options = {}) {
  const path = lockPath(issue.identifier);
  const previousCompletedLock = options.previousCompletedLock || null;
  let previousCompletedLockPath = options.previousCompletedLockPath || null;
  const revisionCycle = options.reclaim ? revisionCycleAfter(previousCompletedLock, options.previousRevisionCycle) : null;
  let continuedRevision = null;
  let reusableWorktree = null;
  let supersededFailedLockPath = null;
  let supersededFailedLockProcessCheck = null;

  if (existsSync(path)) {
    const existing = readJsonFile(path);
    const failedSupersede = failedLockSupersedeDecision(existing);
    const canSupersedeFailedLock = Boolean(options.reclaim && failedSupersede.canSupersede);
    if (isBlockingLock(existing) && !canSupersedeFailedLock) {
      return null;
    }
    const legacyRepositoryMatch = !existing.repositoryName && repository.name === "website";
    const explicitRepositoryMatch = existing.repositoryName === repository.name;
    if (repository.kind !== "local" && (legacyRepositoryMatch || explicitRepositoryMatch)) {
      reusableWorktree = await reusableWorktreeFromPreviousLock(issue, existing);
    }
    continuedRevision = continuedFounderRevisionFromLock(existing);
    const archivePath = `${path}.${Date.now()}.${existing.status || "old"}`;
    if (canSupersedeFailedLock) {
      const at = isoNow();
      const supersededFailed = {
        ...supersedeLockRecord(existing, {
          at,
          branch: existing.branch || issue.branchName || previousCompletedLock?.branch || null,
          lockPath: path,
          reason: `Founder revision cycle ${revisionCycle || 2} superseded this terminal failed lock after confirming no runner process was active. Failure details remain on this archived lock.`,
          revisionCycle,
        }),
        clearedAt: at,
        clearedBy: "founder_revision_reclaim",
        clearedReason: "Terminal failed lock superseded for a newer founder revision cycle; stderr/stdout and exit metadata are preserved on this archived record.",
        processActiveAtClear: false,
        processActiveCheck: failedSupersede.processCheck,
      };
      writeFileSync(path, `${JSON.stringify(supersededFailed, null, 2)}\n`);
      supersededFailedLockPath = archivePath;
      supersededFailedLockProcessCheck = failedSupersede.processCheck;
    }
    renameSync(path, archivePath);
    if (previousCompletedLockPath === path) {
      previousCompletedLockPath = archivePath;
    }
  }

  const revisionContext = resolveFounderRevisionContext({
    continuedRevision,
    previousCompletedLock,
    previousRevisionCycle: options.previousRevisionCycle,
    reclaim: options.reclaim,
  });
  const revision = revisionContext.revision;
  const effectiveRevisionCycle = revisionContext.revisionCycle;
  if (!reusableWorktree && repository.kind !== "local") {
    reusableWorktree = await reusableWorktreeFromPreviousLock(issue, previousCompletedLock);
  }
  reusableWorktree ||= await reusableWorktreeForIssue(issue, repository);
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const releaseManifest = releaseManifestForIssue(issue.identifier);
  const defaultWorktreeRoot = releaseManifest ? dirs.releaseWorktrees : dirs.worktrees;
  const planningRepository = releaseManifest ? { ...repository, worktreeRoot: dirs.releaseWorktrees } : repository;
  const worktreePlan = planIssueWorktree({
    defaultWorktreeRoot,
    issue,
    previousCompletedLock,
    previousCompletedWorktreeMissing: Boolean(previousCompletedLock?.worktreePath && !existsSync(previousCompletedLock.worktreePath)),
    repository: planningRepository,
    reusableWorktree,
    runner,
    sourceRoot: layout.automationRepositoryPath,
    timestamp,
  });
  const lock = {
    attempts: 0,
    baseCommit: reusableWorktree?.baseCommit || null,
    baseRef: repository.baseRef,
    branch: worktreePlan.branch,
    createdAt: isoNow(),
    currentStep: "claimed",
    expectedPaths,
    heartbeatAt: isoNow(),
    handoff: options.handoff || null,
    handoffPath: options.handoffPath || null,
    id: issue.id,
    identifier: issue.identifier,
    metadataPath: repository.metadataPath,
    repositoryKind: repository.kind,
    repositoryName: repository.name,
    repositoryPath: repository.repositoryPath,
    runner,
    recreateExistingBranch: worktreePlan.recreateExistingBranch,
    releaseManifestPath: releaseManifest?.path || null,
    revisionCycle: effectiveRevisionCycle,
    revisionFounderComments: revision?.comments || [],
    revisionPreviousCompletedAt: revision?.previousCompletedAt || null,
    reuseExistingWorktree: worktreePlan.reuseExistingWorktree,
    reuseSource: worktreePlan.reuseSource,
    status: "claimed",
    supersedesLockPath: revision ? continuedRevision?.supersedesLockPath || previousCompletedLockPath : null,
    supersedesFailedLockPath: supersededFailedLockPath || continuedRevision?.supersedesFailedLockPath || null,
    supersededFailedLockProcessCheck,
    title: issue.title,
    url: issue.url,
    worktreeRoot: defaultWorktreeRoot,
    worktreePath: worktreePlan.worktreePath,
  };

  const fd = openSync(path, "wx");
  writeFileSync(fd, `${JSON.stringify(lock, null, 2)}\n`);

  if (options.reclaim && previousCompletedLockPath && existsSync(previousCompletedLockPath)) {
    const superseded = supersedeLockRecord(readJsonFile(previousCompletedLockPath), {
      at: lock.createdAt,
      branch: lock.branch,
      lockPath: path,
      reason: `Founder revision cycle ${revisionCycle} superseded this prior review package.`,
      revisionCycle,
    });
    writeFileSync(previousCompletedLockPath, `${JSON.stringify(superseded, null, 2)}\n`);
  }

  return { lock, path };
}

function updateLock(lockPathValue, patch) {
  const current = readJsonFile(lockPathValue);
  const next = {
    ...current,
    ...patch,
    heartbeatAt: isoNow(),
  };
  writeFileSync(lockPathValue, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

function runCommand(command, args, options = {}) {
  const { cwd = rootDir, env = {}, input = "", onSpawn = null, timeoutMs = config.runnerTimeoutMs } = options;

  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE || join(dirs.tmp, "npm-cache"),
        NO_UPDATE_NOTIFIER: process.env.NO_UPDATE_NOTIFIER || "1",
        NO_COLOR: "1",
        TERM: process.env.TERM || "xterm-256color",
        VERCEL_CACHE_DIR: process.env.VERCEL_CACHE_DIR || join(dirs.tmp, "vercel-cache"),
        XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || join(dirs.tmp, "xdg-cache"),
        npm_config_cache: process.env.npm_config_cache || process.env.NPM_CONFIG_CACHE || join(dirs.tmp, "npm-cache"),
        ...env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (typeof onSpawn === "function") {
      onSpawn(child);
    }

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000).unref();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({ code: 127, error, stderr, stdout, timedOut });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolvePromise({ code, signal, stderr, stdout, timedOut });
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

async function git(args, cwd = config.git.repositoryPath, timeoutMs = 120000) {
  const result = await runCommand("git", args, { cwd, timeoutMs });
  if (result.code !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

async function createWorktree(lock, lockPathValue) {
  if (lock.repositoryKind === "local") {
    const baseCommit = await git(["rev-parse", "HEAD"], lock.worktreePath, 30000).catch(() => null);
    return updateLock(lockPathValue, {
      baseCommit,
      currentStep: "worktree_ready",
      status: "running",
      worktreeReusedAt: isoNow(),
    });
  }

  if (lock.reuseExistingWorktree) {
    const baseCommit = await git(["rev-parse", "HEAD"], lock.worktreePath, 30000);
    return updateLock(lockPathValue, {
      baseCommit,
      currentStep: "worktree_ready",
      status: "running",
      worktreeReusedAt: isoNow(),
    });
  }

  mkdirSync(dirname(lock.worktreePath), { recursive: true });
  await git(["fetch", "origin"], lock.repositoryPath, 120000);
  if (lock.recreateExistingBranch && await branchExists(lock.repositoryPath, lock.branch)) {
    await git(["worktree", "add", lock.worktreePath, lock.branch], lock.repositoryPath, 120000);
  } else {
    await git(["worktree", "add", "-b", lock.branch, lock.worktreePath, lock.baseRef], lock.repositoryPath, 120000);
  }
  const baseCommit = await git(["rev-parse", "HEAD"], lock.worktreePath, 30000);
  return updateLock(lockPathValue, {
    baseCommit,
    currentStep: "worktree_ready",
    status: "running",
    worktreeCreatedAt: isoNow(),
  });
}

function buildPrompt(issue, lock) {
  const lane = lock.runner === "codex"
    ? "Codex engineering and validation lane"
    : "Claude Code product-experience lane";
  const reviewAuthorization = detectReviewAuthorization(issue, { config, lock });
  const safetyLines = buildRunnerSafetyLines(issue, lock, { authorization: reviewAuthorization, config });
  const founderRevisionPromptSection = buildFounderRevisionPromptSection(lock);
  const handoffPromptSection = lock.handoff
    ? [
      "Machine-readable handoff:",
      `- Source issue: ${lock.handoff.sourceIssue}`,
      `- Source branch: ${lock.handoff.sourceBranch}`,
      `- Source worktree: ${lock.handoff.sourceWorktree}`,
      `- Changed files: ${(lock.handoff.changedFiles || []).join(", ") || "unknown"}`,
      "- Use the scoped files from this handoff; do not recreate or redesign completed Claude work unless instructed.",
    ].join("\n")
    : "";
  const fixtureGuidance = issue.identifier === "USA-40"
    ? "\nFor this dispatcher test, update only `docs/dispatcher-fixtures/codex-pickup.md` or create it if missing. Keep it harmless and run a lightweight validation such as `git diff --check`."
    : issue.identifier === "USA-41"
      ? "\nFor this dispatcher test, update only `sandbox/dispatcher-fixtures/claude-product-experience.html` or create it if missing. Keep it a sandbox UI/copy fixture and run a lightweight validation such as `git diff --check`."
      : "";

  const recentComments = (issue.comments?.nodes || [])
    .slice()
    .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
    .map((comment) => [`Comment created ${comment.createdAt || "unknown"}:`, comment.body || ""].join("\n"))
    .join("\n\n---\n\n");

  return [
    `You are running from the USAM automatic Linear dispatcher in the ${lane}.`,
    "",
    "Hard rules:",
    ...safetyLines,
    "- Keep the smallest complete implementation that satisfies the Linear issue.",
    "- Preserve existing repo patterns and AGENTS.md instructions.",
    `- Repository route: ${lock.repositoryName || "website"} at \`${lock.repositoryPath || lock.worktreePath}\`.`,
    `- Runtime branch policy: RUNNER_ISSUE_BRANCH is \`${lock.branch}\`; commit and push actions, when authorized, must target only that branch.`,
    reviewAuthorization.productionAuthorization?.production?.allowed
      ? "- Preview deployments and, once required validation/CI passes, a normal (non-`--prod`-promotion) production deployment are allowed for this issue only, per the Founder Approved — Production label. Deployment promotion, DNS changes, production database/schema changes (unless separately authorized), destructive repository/filesystem commands, unrelated worktrees, and unrelated communications remain prohibited."
      : "- Use preview deployments only. Never use `--prod`, deployment promotion, DNS changes, production database/schema changes, destructive repository/filesystem commands, unrelated worktrees, or unrelated communications.",
    "- At the end, report changed files, validation commands, risks, and whether founder approval is still required.",
    reviewAuthorization.allowed
      ? `Review authorization source: ${reviewAuthorization.source?.kind || "unknown"}${reviewAuthorization.source?.createdAt ? ` at ${reviewAuthorization.source.createdAt}` : ""}.`
      : `Review authorization: ${reviewAuthorization.reason}`,
    reviewAuthorization.productionAuthorization
      ? (describeProductionAuthorizationForClaim(reviewAuthorization.productionAuthorization) || `Production authorization: not present (no "${reviewAuthorization.productionAuthorization.production.label}" label on this issue).`)
      : null,
    fixtureGuidance,
    founderRevisionPromptSection,
    handoffPromptSection,
    "",
    `Linear issue: ${issue.identifier} - ${issue.title}`,
    `URL: ${issue.url}`,
    "",
    issue.description || "",
    "",
    "Recent Linear comments, newest first:",
    "",
    recentComments || "(none)",
  ].join("\n");
}

function runnerInvocation(runner, lock, outputPath, authorization) {
  const worktreePath = lock.worktreePath;
  if (runner === "codex") {
    return {
      args: [
        ...codexArgsForAuthorization(config.runners.codex.args, authorization, {
          metadataPath: lock.metadataPath,
          skipGitRepoCheck: lock.repositoryKind === "local",
        }),
        "--cd",
        worktreePath,
        "--output-last-message",
        outputPath,
        "-",
      ],
      command: config.runners.codex.command,
      cwd: worktreePath,
      stdin: true,
    };
  }

  return {
    args: [
      ...claudeArgsForAuthorization(config.runners.claude.args, authorization),
      "--debug-file",
      join(dirs.logs, `claude-${dateStamp()}.debug.log`),
    ],
    command: config.runners.claude.command,
    cwd: worktreePath,
    stdin: false,
  };
}

function acquireRepositoryWriterForIssue(issue, lock, lockPathValue) {
  const acquired = repositoryWriterLocks.acquire({
    branch: lock.branch,
    command: "dispatcher pending runner launch",
    cwd: lock.worktreePath,
    issueId: issue.identifier,
    metadata: {
      issueLockPath: lockPathValue,
      repositoryKind: lock.repositoryKind,
      repositoryName: lock.repositoryName,
      worktreePath: lock.worktreePath,
    },
    owner: "dispatcher",
    pid: process.pid,
    repositoryPath: lock.repositoryPath || lock.worktreePath,
    runner: lock.runner,
    startedAt: isoNow(),
  });
  if (!acquired.acquired) {
    jsonLog("repository_writer_busy", {
      issue: issue.identifier,
      occupantIssue: acquired.occupant?.issueId || null,
      occupantPid: acquired.occupant?.pid || null,
      repositoryPath: acquired.repositoryPath,
      runner: lock.runner,
    });
  }
  return acquired;
}

async function holdForRepositoryWriter(issue, lock, lockPathValue, acquired) {
  updateLock(lockPathValue, {
    repositoryWriter: acquired.occupant || null,
    repositoryWriterQueuedAt: isoNow(),
    status: "queued_repository_busy",
  });
  writeWorkforceEvent("issue_queued", {
    currentStep: "repository_writer_busy",
    issue: issue.identifier,
    metadata: {
      occupantBranch: acquired.occupant?.branch || null,
      occupantIssue: acquired.occupant?.issueId || null,
      occupantPid: acquired.occupant?.pid || null,
      occupantRunner: acquired.occupant?.runner || null,
      occupantStartedAt: acquired.occupant?.startedAt || acquired.occupant?.createdAt || null,
    },
    repository: lock.repositoryName,
    repositoryPath: acquired.repositoryPath,
    runner: lock.runner,
  });
  const comments = issue.comments?.nodes || issue.comments || [];
  if (!hasRepositoryWriterHoldComment(comments, { issueId: issue.identifier, occupant: acquired.occupant })) {
    await postIssueComment(issue, formatRepositoryWriterBusyComment({
      issueId: issue.identifier,
      occupant: acquired.occupant,
      repositoryPath: acquired.repositoryPath,
    }));
  }
  await updateIssueState(issue, config.linear.statusTodo);
  writeHealthSnapshot("repository_writer_busy");
  return {
    held: true,
    issue: issue.identifier,
    reason: `repository writer busy: ${acquired.occupant?.issueId || "unknown owner"}`,
    runner: lock.runner,
  };
}

async function runAgent(issue, lock, lockPathValue, attempt, repositoryWriterLock) {
  const prompt = buildPrompt(issue, lock);
  const reviewAuthorization = detectReviewAuthorization(issue, { config, lock });
  const runnerEnv = buildRunnerExecutionEnv({ authorization: reviewAuthorization, lock });
  const promptPath = join(dirs.tmp, `${safeIssueFile(issue.identifier)}-${lock.runner}-prompt.txt`);
  const outputPath = join(dirs.tmp, `${safeIssueFile(issue.identifier)}-${lock.runner}-last-message.txt`);
  writeFileSync(promptPath, prompt);
  const invocation = runnerInvocation(lock.runner, lock, outputPath, reviewAuthorization);
  const args = invocation.stdin ? invocation.args : [...invocation.args, prompt];
  jsonLog("runner_start", { attempt, command: invocation.command, issue: issue.identifier, runner: lock.runner, worktree: lock.worktreePath });
  updateLock(lockPathValue, {
    attempts: attempt,
    currentStep: "runner_launching",
    lastAttemptAt: isoNow(),
    promptPath,
    status: attempt > 1 ? "retrying" : "running",
  });

  const heartbeatTimer = setInterval(() => {
    try {
      const current = updateLock(lockPathValue, {
        currentStep: "runner_active",
        status: attempt > 1 ? "retrying" : "running",
      });
      emitHeartbeat({
        branch: lock.branch,
        currentStep: "runner_active",
        issue: issue.identifier,
        latestActivity: current.heartbeatAt,
        phase: "runner",
        processState: "running",
        repository: lock.repositoryName,
        repositoryPath: lock.repositoryPath,
        runner: lock.runner,
        startTime: lock.createdAt,
      });
      writeHealthSnapshot("runner");
    } catch (error) {
      jsonLog("runner_heartbeat_failed", { error: error.message, issue: issue.identifier, runner: lock.runner });
    }
  }, heartbeatIntervalMs);
  heartbeatTimer.unref?.();

  let result;
  try {
    result = await runCommand(invocation.command, args, {
      cwd: invocation.cwd,
      env: runnerEnv,
      input: invocation.stdin ? prompt : "",
      onSpawn: (child) => {
        updateLock(lockPathValue, {
          currentStep: "runner_active",
          processPid: child.pid,
          runnerPid: child.pid,
        });
        repositoryWriterLocks.update(repositoryWriterLock, {
          childPid: child.pid,
          command: redactedCommand(invocation.command, args),
          cwd: invocation.cwd,
          ownerPhase: "runner",
          pendingLaunch: false,
          pid: child.pid,
          processPid: child.pid,
        });
        writeWorkforceEvent("runner_started", {
          branch: lock.branch,
          currentStep: "runner_active",
          issue: issue.identifier,
          metadata: {
            attempt,
            pid: child.pid,
          },
          pid: child.pid,
          repository: lock.repositoryName,
          repositoryPath: lock.repositoryPath,
          runner: lock.runner,
        });
      },
      timeoutMs: config.runnerTimeoutMs,
    });
  } finally {
    clearInterval(heartbeatTimer);
  }
  const stdoutPath = join(dirs.logs, `${safeIssueFile(issue.identifier)}-${lock.runner}-attempt-${attempt}.stdout.log`);
  const stderrPath = join(dirs.logs, `${safeIssueFile(issue.identifier)}-${lock.runner}-attempt-${attempt}.stderr.log`);
  writeFileSync(stdoutPath, result.stdout || "");
  writeFileSync(stderrPath, result.stderr || "");
  updateLock(lockPathValue, {
    currentStep: "runner_exited",
    lastExitCode: result.code,
    lastSignal: result.signal,
    stderrPath,
    stdoutPath,
    timedOut: result.timedOut,
  });
  repositoryWriterLocks.update(repositoryWriterLock, {
    command: "dispatcher post-run finalization",
    cwd: rootDir,
    ownerPhase: "dispatcher_finalization",
    pendingLaunch: false,
    pid: process.pid,
    processPid: process.pid,
  });
  jsonLog("runner_exit", { attempt, code: result.code, issue: issue.identifier, runner: lock.runner, signal: result.signal, timedOut: result.timedOut });

  return {
    ...result,
    outputPath: existsSync(outputPath) ? outputPath : stdoutPath,
    stderrPath,
    stdoutPath,
  };
}

async function gitSummary(lock) {
  const worktreePath = typeof lock === "string" ? lock : lock.worktreePath;
  const headCommit = await git(["rev-parse", "--short", "HEAD"], worktreePath, 30000).catch((error) => {
    jsonLog("git_summary_head_failed", { error: error.message, worktree: worktreePath });
    return null;
  });
  const headCommitLong = await git(["rev-parse", "HEAD"], worktreePath, 30000).catch(() => null);
  const status = await git(["status", "--short"], worktreePath, 30000).catch((error) => {
    jsonLog("git_summary_status_failed", { error: error.message, worktree: worktreePath });
    return "";
  });
  const diffStat = await git(["diff", "--stat"], worktreePath, 30000).catch((error) => `diff stat failed: ${error.message}`);
  const changedFiles = status.split("\n").filter(Boolean).map((line) => line.slice(3));
  return { changedFiles, diffStat, headCommit, headCommitLong, status };
}

function normalizeStatusFile(line) {
  const file = String(line || "").slice(3).trim();
  if (file.includes(" -> ")) {
    return file.split(" -> ").at(-1).trim();
  }
  return file;
}

function changedFilesFromStatus(status) {
  return String(status || "")
    .split("\n")
    .filter(Boolean)
    .map(normalizeStatusFile)
    .filter(Boolean);
}

function repositoryByName(name) {
  return repositoryRegistry.repositories[name] || null;
}

function allowedIssueFile(file, lock) {
  if (!file || file.startsWith(".git/") || file.startsWith(".next/") || file.startsWith("node_modules/")) {
    return false;
  }
  if (/^\.env(?:\.|$)/.test(file)) {
    return false;
  }

  const expectedPaths = lock.expectedPaths || [];
  if (expectedPaths.length) {
    return expectedPaths.some((expectedPath) => (
      file === expectedPath
      || file.startsWith(`${expectedPath.replace(/\/$/, "")}/`)
      || expectedPath.startsWith(`${file.replace(/\/$/, "")}/`)
    ));
  }

  const repository = repositoryByName(lock.repositoryName || "website");
  const routePrefixes = repository?.routing?.pathPrefixes || [];
  const allowedExact = new Set([
    "middleware.ts",
    "next.config.js",
    "next.config.mjs",
    "package-lock.json",
    "package.json",
    "postcss.config.js",
    "tailwind.config.js",
    "tailwind.config.ts",
    "tsconfig.json",
  ]);
  return allowedExact.has(file) || routePrefixes.some((prefix) => file.startsWith(prefix));
}

function scopedChangedFiles(status, lock) {
  const changedFiles = changedFilesFromStatus(status);
  return {
    blocked: changedFiles.filter((file) => !allowedIssueFile(file, lock)),
    scoped: changedFiles.filter((file) => allowedIssueFile(file, lock)),
  };
}

function readPackageJson(worktreePath) {
  const path = join(worktreePath, "package.json");
  if (!existsSync(path)) {
    return {};
  }

  return JSON.parse(readFileSync(path, "utf8"));
}

function updatePublishHealth(lockPathValue, patch) {
  const current = readJsonFile(lockPathValue);
  return updateLock(lockPathValue, {
    publishHealth: mergePublishHealth(current.publishHealth, patch),
  });
}

function commandFailureText(result, maxChars = 1800) {
  const text = [result.stdout, result.stderr, result.error?.message]
    .map((value) => String(value || ""))
    .filter(Boolean)
    .join("\n")
    .trim();
  const redacted = redactSecrets(text);
  return redacted.length > maxChars ? redacted.slice(-maxChars) : redacted;
}

function hasTokenLikeValue(value) {
  return typeof value === "string" && value.trim().length > 8;
}

function redactSecrets(text) {
  let value = String(text || "");
  if (hasTokenLikeValue(process.env.VERCEL_TOKEN)) {
    value = value.split(process.env.VERCEL_TOKEN).join("[redacted]");
  }
  if (hasTokenLikeValue(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)) {
    value = value.split(process.env.VERCEL_AUTOMATION_BYPASS_SECRET).join("[redacted]");
  }
  value = value.replace(/([?&]_vercel_share=)[^\s"'<>)]*/g, "$1[redacted]");
  return value;
}

function redactedCommand(command, args = []) {
  const safeArgs = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = String(args[index]);
    if (arg === "--token") {
      safeArgs.push(arg, "[redacted]");
      index += 1;
    } else if (arg.startsWith("--token=")) {
      safeArgs.push("--token=[redacted]");
    } else {
      safeArgs.push(redactSecrets(arg));
    }
  }
  return [command, ...safeArgs].join(" ");
}

function objectHasToken(value) {
  if (!value || typeof value !== "object") return false;
  if (hasTokenLikeValue(value.token) || hasTokenLikeValue(value.authToken)) return true;
  return Object.values(value).some((item) => objectHasToken(item));
}

function vercelCredentialState() {
  if (hasTokenLikeValue(process.env.VERCEL_TOKEN)) {
    return { ok: true, source: "VERCEL_TOKEN" };
  }

  const home = process.env.HOME || "/Users/ryanfox";
  const candidates = [
    join(home, ".vercel", "auth.json"),
    join(home, ".vercel", "config.json"),
    join(home, "Library", "Application Support", "com.vercel.cli", "auth.json"),
    join(home, "Library", "Application Support", "com.vercel.cli", "config.json"),
  ];

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8"));
      if (objectHasToken(parsed)) {
        return { ok: true, source: path };
      }
    } catch {
      continue;
    }
  }

  return {
    ok: false,
    reason: "No Vercel CLI credentials found for ryanfox. Run `npx --yes vercel login` as ryanfox or configure VERCEL_TOKEN before publishing.",
  };
}

async function websiteExecutionPreflight(lock) {
  if ((lock.repositoryName || "website") !== "website" || lock.repositoryKind !== "git-worktree") {
    return { ok: true, results: [] };
  }

  const results = [];
  const runCheck = async (label, command, args, options = {}) => {
    const result = await runCommand(command, args, {
      cwd: lock.worktreePath,
      timeoutMs: options.timeoutMs || 30000,
    });
    const ok = result.code === 0 && !result.timedOut;
    const record = {
      command: redactedCommand(command, args),
      ok,
      output: commandFailureText(result),
      timedOut: result.timedOut,
    };
    results.push({ label, ...record });
    return record;
  };

  const gitDir = await git(["rev-parse", "--git-dir"], lock.worktreePath, 30000).catch((error) => {
    results.push({ command: "git rev-parse --git-dir", label: "git metadata path", ok: false, output: error.message, timedOut: false });
    return null;
  });
  if (!gitDir) {
    return { exactBlocker: results.at(-1).output, ok: false, results };
  }

  const checks = [
    ["git metadata writable", "test", ["-w", gitDir], {}],
    ["GitHub auth", "gh", ["auth", "status"], {}],
    ["Git remote access", "git", ["ls-remote", "origin", "HEAD"], {}],
  ];

  for (const [label, command, args, options] of checks) {
    const result = await runCheck(label, command, args, options);
    if (!result.ok) {
      return {
        exactBlocker: `${label} failed: ${result.output || (result.timedOut ? "timed out" : "no output")}`,
        ok: false,
        results,
      };
    }
  }

  const vercelCredential = vercelCredentialState();
  results.push({
    command: "vercel credential files",
    label: "Vercel auth",
    ok: vercelCredential.ok,
    output: vercelCredential.ok ? `credential source: ${vercelCredential.source}` : vercelCredential.reason,
    timedOut: false,
  });
  if (!vercelCredential.ok) {
    return {
      exactBlocker: `Vercel auth failed: ${vercelCredential.reason}`,
      ok: false,
      results,
    };
  }

  const vercelWhoamiArgs = hasTokenLikeValue(process.env.VERCEL_TOKEN)
    ? ["--yes", "vercel", "whoami", "--token", process.env.VERCEL_TOKEN]
    : ["--yes", "vercel", "whoami"];
  const vercelResult = await runCheck("Vercel auth", "npx", vercelWhoamiArgs, { timeoutMs: 20000 });
  if (!vercelResult.ok) {
    return {
      exactBlocker: `Vercel auth failed: ${vercelResult.output || (vercelResult.timedOut ? "timed out" : "no output")}`,
      ok: false,
      results,
    };
  }

  return { ok: true, results };
}

function releaseManifestForIssue(identifier) {
  const path = join(rootDir, "config", "release-manifests", `${safeIssueFile(identifier)}.json`);
  if (!existsSync(path)) {
    return null;
  }

  return {
    manifest: JSON.parse(readFileSync(path, "utf8")),
    path,
  };
}

function completionManifestForIssue(issue, lock, summary, finalText) {
  const packageJson = readPackageJson(lock.worktreePath);
  const route = extractRequestedRoute(issue);
  const releaseManifest = releaseManifestForIssue(issue.identifier);
  const release = releaseManifest?.manifest || null;
  const requestedReviewRoute = release?.requestedReviewRoute || route;
  const validationCommands = validationCommandsForPackage(packageJson).map((item) => item.label);
  const changedFiles = summary.changedFiles || [];
  return {
    branch: lock.branch,
    changedFiles,
    commitAlreadyExists: changedFiles.length === 0,
    createdAt: isoNow(),
    excludedLaunchDependencies: release?.excludedLaunchDependencies || [],
    expectedMarkers: release ? [] : expectedMarkersForReviewRoute(issue, route),
    issueId: issue.identifier,
    knownLimitations: [
      "Protected preview access may require an authorized Vercel session.",
    ],
    manifestVersion: release?.manifestVersion || null,
    primaryRouteId: release?.primaryRouteId || null,
    releaseManifestPath: releaseManifest?.path || null,
    routeChecks: release?.routeChecks || release?.routes || [],
    requestedReviewRoute,
    route: requestedReviewRoute,
    runner: lock.runner,
    runnerFinalText: finalText || "",
    staleGlobalMarkers: release?.staleGlobalMarkers || null,
    supersedesPreviousPackage: lock.revisionPreviousCompletedAt
      ? `${issue.identifier} review package from ${lock.revisionPreviousCompletedAt}`
      : null,
    textMatching: release?.textMatching || null,
    validationCommands,
    validationResults: [],
    worktree: lock.worktreePath,
  };
}

function completionManifestPath(issue) {
  return join(dirs.completions, `${safeIssueFile(issue.identifier)}-${Date.now()}.json`);
}

async function invokeTrustedPublisher(issue, lock, lockPathValue, summary, finalText) {
  const manifest = completionManifestForIssue(issue, lock, summary, finalText);
  const manifestPath = completionManifestPath(issue);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  updatePublishHealth(lockPathValue, {
    completionManifestPath: manifestPath,
    implementationComplete: true,
    stage: "host_publisher_invoked",
  });
  const result = await runCommand(join(rootDir, "bin", "publish-preview.sh"), ["--manifest", manifestPath], {
    cwd: rootDir,
    timeoutMs: websiteAutoPublish.publisherTimeoutMs,
  });
  if (result.code !== 0 || result.timedOut) {
    return {
      failed: {
        exactBlocker: commandFailureText(result) || "Trusted host publisher failed without output.",
        kind: "host_publisher_failed",
        preventsPush: false,
        retryable: /vercel|timeout|temporar|network|credential|auth|login/i.test(commandFailureText(result)),
        stage: "host_publisher",
      },
      manifestPath,
      result,
    };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return {
      failed: {
        exactBlocker: `Trusted host publisher returned non-JSON output: ${commandFailureText(result)}`,
        kind: "host_publisher_invalid_output",
        preventsPush: false,
        retryable: false,
        stage: "host_publisher",
      },
      manifestPath,
      result,
    };
  }

  if (!parsed.ok) {
    return {
      failed: {
        exactBlocker: parsed.failure?.error || "Trusted host publisher reported failure.",
        kind: "host_publisher_failed",
        preventsPush: false,
        retryable: /vercel|timeout|temporar|network|credential|auth|login/i.test(parsed.failure?.error || ""),
        stage: "host_publisher",
      },
      manifestPath,
      result,
    };
  }

  return {
    manifestPath,
    publication: parsed.publication,
  };
}

async function runWebsiteValidation(lock, lockPathValue) {
  const packageJson = readPackageJson(lock.worktreePath);
  const commands = validationCommandsForPackage(packageJson);
  const results = [];
  if (commands.length) {
    writeWorkforceEvent("tests_started", {
      branch: lock.branch,
      currentStep: "validation",
      issue: lock.identifier,
      metadata: { commands: commands.map((command) => command.label) },
      repository: lock.repositoryName,
      repositoryPath: lock.repositoryPath,
      runner: lock.runner,
    });
  }

  for (const validation of commands) {
    updatePublishHealth(lockPathValue, {
      implementationComplete: true,
      stage: "validation",
      validationCommand: validation.label,
    });
    const result = await runCommand(validation.command, validation.args, {
      cwd: lock.worktreePath,
      timeoutMs: config.runnerTimeoutMs,
    });
    results.push({
      code: result.code,
      label: validation.label,
      stderr: tailTextFromValue(result.stderr, 2000),
      stdout: tailTextFromValue(result.stdout, 2000),
      timedOut: result.timedOut,
    });
    if (result.code !== 0 || result.timedOut) {
      writeWorkforceEvent("tests_completed", {
        branch: lock.branch,
        currentStep: "validation_failed",
        issue: lock.identifier,
        metadata: { ok: false, results },
        repository: lock.repositoryName,
        repositoryPath: lock.repositoryPath,
        runner: lock.runner,
      });
      return {
        failed: classifyAutoPublishFailure("validation", result),
        results,
      };
    }
  }

  if (commands.length) {
    writeWorkforceEvent("tests_completed", {
      branch: lock.branch,
      currentStep: "validation_completed",
      issue: lock.identifier,
      metadata: { ok: true, results },
      repository: lock.repositoryName,
      repositoryPath: lock.repositoryPath,
      runner: lock.runner,
    });
  }

  return {
    commands,
    results,
  };
}

async function commitScopedWebsiteFiles(issue, lock, lockPathValue) {
  const currentBranch = await git(["branch", "--show-current"], lock.worktreePath, 30000);
  if (currentBranch !== lock.branch) {
    return {
      failed: {
        exactBlocker: `Current branch ${currentBranch || "(detached)"} does not match issue branch ${lock.branch}.`,
        kind: "wrong_branch",
        preventsPush: true,
        retryable: false,
        stage: "commit",
      },
    };
  }

  const status = await git(["status", "--short"], lock.worktreePath, 30000);
  const scoped = scopedChangedFiles(status, lock);
  if (scoped.blocked.length) {
    return {
      failed: {
        exactBlocker: `Unscoped changed files would not be committed automatically: ${scoped.blocked.join(", ")}`,
        kind: "unscoped_changes",
        preventsPush: true,
        retryable: false,
        stage: "commit",
      },
    };
  }

  if (!scoped.scoped.length) {
    updatePublishHealth(lockPathValue, {
      commitCreated: false,
      stage: "commit_skipped_clean",
    });
    return {
      changedFiles: [],
      commitCreated: false,
    };
  }

  await git(["add", "--", ...scoped.scoped], lock.worktreePath, 120000);
  const commit = await runCommand("git", ["commit", "-m", `${issue.identifier}: ${issue.title}`], {
    cwd: lock.worktreePath,
    timeoutMs: 120000,
  });
  if (commit.code !== 0) {
    return {
      failed: {
        exactBlocker: tailTextFromValue(commit.stderr || commit.stdout, 1200) || "Git commit failed.",
        kind: "commit_failed",
        preventsPush: true,
        retryable: false,
        stage: "commit",
      },
    };
  }

  const head = await git(["rev-parse", "--short", "HEAD"], lock.worktreePath, 30000).catch(() => null);
  updatePublishHealth(lockPathValue, {
    commitCreated: true,
    commitSha: head,
    stage: "commit_created",
  });
  return {
    changedFiles: scoped.scoped,
    commitCreated: true,
    commitSha: head,
  };
}

async function retryPublishStage(stage, action, lock, lockPathValue) {
  let lastFailure = null;
  for (let attempt = 1; attempt <= websiteAutoPublish.maxRetries + 1; attempt += 1) {
    const result = await action(attempt);
    if (!result.failed) {
      return { ...result, attempts: attempt };
    }

    lastFailure = result.failed;
    const recovery = publishFailureRecovery(lastFailure, {
      attempt,
      config,
      runner: lock.runner,
    });
    updatePublishHealth(lockPathValue, {
      exactBlocker: lastFailure.exactBlocker,
      nextRetryAt: recovery.nextRetryAt,
      publishOnlyRunner: recovery.alternateRunner,
      stage,
      [`${stage}Attempts`]: attempt,
    });
    jsonLog("website_auto_publish_retry", {
      attempt,
      issue: lock.identifier,
      retryAllowed: recovery.retryAllowed,
      runner: lock.runner,
      stage,
    });

    if (!recovery.retryAllowed) {
      return {
        failed: {
          ...lastFailure,
          recovery,
        },
      };
    }
  }

  return { failed: lastFailure };
}

async function pushIssueBranch(lock, lockPathValue) {
  return retryPublishStage("push", async () => {
    updatePublishHealth(lockPathValue, {
      stage: "push",
    });
    const push = await runCommand("git", ["push", "origin", `HEAD:${lock.branch}`], {
      cwd: lock.worktreePath,
      timeoutMs: 180000,
    });
    if (push.code !== 0 || push.timedOut) {
      return { failed: classifyAutoPublishFailure("push", push) };
    }
    updatePublishHealth(lockPathValue, {
      branchPushed: true,
      stage: "branch_pushed",
    });
    return {
      branchPushed: true,
      stdout: push.stdout,
    };
  }, lock, lockPathValue);
}

function extractPreviewUrl(text) {
  const urls = [...String(text || "").matchAll(/\bhttps?:\/\/[^\s<>)\]`"']+/gi)]
    .map((match) => match[0].replace(/[),.;\]]+$/, ""));
  return urls.find((url) => /\.vercel\.app(?:\/|$)/i.test(url)) || null;
}

async function requestVercelPreview(lock, lockPathValue, existingPreviewUrl = null) {
  const strategy = previewDeploymentStrategy({
    branchPushed: true,
    existingPreviewUrl,
  });

  if (!strategy.requestNewDeployment) {
    updatePublishHealth(lockPathValue, {
      previewReady: true,
      previewRequested: true,
      previewUrl: existingPreviewUrl,
      stage: strategy.mode,
    });
    return {
      previewUrl: existingPreviewUrl,
      strategy,
    };
  }

  return retryPublishStage("vercel", async () => {
    updatePublishHealth(lockPathValue, {
      previewRequested: true,
      stage: "vercel_preview_requested",
    });
    const deploy = await runCommand("npx", ["--yes", "vercel@latest", "deploy", "--yes"], {
      cwd: lock.worktreePath,
      timeoutMs: websiteAutoPublish.vercelTimeoutMs,
    });
    const previewUrl = extractPreviewUrl(`${deploy.stdout}\n${deploy.stderr}`);
    if (deploy.code !== 0 || deploy.timedOut || !previewUrl) {
      return { failed: classifyAutoPublishFailure("vercel", deploy) };
    }
    updatePublishHealth(lockPathValue, {
      previewReady: true,
      previewUrl,
      stage: "preview_ready",
    });
    return {
      previewUrl,
      strategy,
    };
  }, lock, lockPathValue);
}

async function verifyPreviewRoute(previewUrl, route, lockPathValue) {
  const target = new URL(route || "/", previewUrl).toString();
  updatePublishHealth(lockPathValue, {
    stage: "preview_verification",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), websiteAutoPublish.verificationTimeoutMs);
  try {
    const response = await fetch(target, {
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text().catch(() => "");
    const ok = response.ok && body.length > 100;
    if (!ok) {
      return {
        failed: {
          exactBlocker: `Preview verification failed for ${target}: HTTP ${response.status}; rendered body length ${body.length}.`,
          kind: "preview_verification_failed",
          preventsPush: false,
          retryable: response.status >= 500,
          stage: "verification",
        },
      };
    }
    updatePublishHealth(lockPathValue, {
      previewVerified: true,
      verifiedRoute: route,
      verifiedUrl: target,
      stage: "preview_verified",
    });
    return {
      bodyLength: body.length,
      status: response.status,
      target,
    };
  } catch (error) {
    return {
      failed: {
        exactBlocker: `Preview verification failed for ${target}: ${error.message}`,
        kind: "preview_verification_failed",
        preventsPush: false,
        retryable: true,
        stage: "verification",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

function latestHandoffForDestination(identifier) {
  if (!existsSync(dirs.handoffs)) {
    return null;
  }

  return readdirSync(dirs.handoffs)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const path = join(dirs.handoffs, file);
      try {
        const handoff = readJsonFile(path);
        return handoff.destinationIssue === identifier && handoff.status === "available_to_codex"
          ? { handoff, path }
          : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.handoff.createdAt || "") - Date.parse(a.handoff.createdAt || ""))[0] || null;
}

function writeHandoffRecordIfNeeded(issue, lock, summary) {
  const changedFiles = summary.changedFiles || [];
  if (!handoffRecordEligible(issue, lock, changedFiles)) {
    return null;
  }

  const record = buildHandoffRecord({
    changedFiles,
    sourceIssue: issue,
    sourceLock: lock,
  });
  mkdirSync(dirs.handoffs, { recursive: true });
  const destination = safeIssueFile(record.destinationIssue || "unknown");
  const path = join(dirs.handoffs, `${safeIssueFile(record.sourceIssue)}-to-${destination}.json`);
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
  jsonLog("handoff_record_created", {
    destinationIssue: record.destinationIssue,
    path,
    sourceIssue: record.sourceIssue,
  });
  return { path, record };
}

async function runWebsiteAutoPublish(issue, lock, lockPathValue, finalText, summary) {
  const eligibility = websiteAutoPublishEligibility(issue, lock, config);
  if (!eligibility.eligible) {
    return {
      active: false,
      eligibility,
    };
  }

  const reviewAuthorization = detectReviewAuthorization(issue, { config, lock });
  const actions = evaluateAutoPublishActions({
    authorization: reviewAuthorization,
    branch: lock.branch,
  });
  const blockedAction = Object.entries(actions).find(([name, result]) => name !== "productionDeploy" && !result.allowed);
  if (blockedAction) {
    return {
      active: true,
      failed: {
        exactBlocker: blockedAction[1].reason,
        kind: "policy_blocked",
        preventsPush: true,
        retryable: false,
        stage: blockedAction[0],
      },
    };
  }

  updatePublishHealth(lockPathValue, defaultPublishHealth({
    implementationComplete: true,
    stage: "implementation_complete",
  }));

  const published = await invokeTrustedPublisher(issue, lock, lockPathValue, summary || { changedFiles: [] }, finalText);
  if (published.failed) {
    return {
      active: true,
      failed: published.failed,
      manifestPath: published.manifestPath,
    };
  }

  updatePublishHealth(lockPathValue, {
    branchPushed: true,
    commitCreated: Boolean(published.publication.commitCreated),
    commitSha: published.publication.commitSha,
    previewReady: true,
    previewRequested: true,
    previewUrl: published.publication.previewUrl,
    previewUrlPosted: true,
    previewVerified: true,
    publicationManifestPath: published.publication.manifestPath || null,
    stage: "host_publisher_completed",
  });
  writeWorkforceEvent("preview_ready", {
    branch: lock.branch,
    currentStep: "preview_ready",
    issue: issue.identifier,
    metadata: {
      commitSha: published.publication.commitSha || null,
      manifestPath: published.publication.manifestPath || null,
      previewUrl: published.publication.previewUrl || null,
      route: published.publication.route || null,
    },
    repository: lock.repositoryName,
    repositoryPath: lock.repositoryPath,
    runner: lock.runner,
  });
  return {
    active: true,
    previewUrl: published.publication.previewUrl,
    publication: published.publication,
    route: published.publication.route,
  };
}

function revisionSummaryLines(lock) {
  if (!lock?.revisionCycle || lock.revisionCycle < 2) {
    return [];
  }

  return [
    `Revision cycle: ${lock.revisionCycle}`,
    `Supersedes prior review package from: ${lock.revisionPreviousCompletedAt || "unknown"}`,
    lock.supersedesLockPath ? `Superseded lock: \`${lock.supersedesLockPath}\`` : null,
  ].filter(Boolean);
}

function tailText(path, maxChars = 4000) {
  if (!path || !existsSync(path)) {
    return "";
  }

  const text = readFileSync(path, "utf8");
  return text.length > maxChars ? text.slice(-maxChars) : text;
}

async function handleIssue(issue, classification) {
  if (isPaused(classification.runner)) {
    const cooldown = activeCooldown(classification.runner);
    const environmentUnavailable = cooldown?.reason === "runner_environment_unavailable";
    const reason = cooldown
      ? environmentUnavailable
        ? `${classification.runner} no available environments until ${cooldown.resumeAfter || cooldown.resetAt}`
        : `${classification.runner} cooldown until ${cooldown.resumeAfter || cooldown.resetAt}`
      : `${classification.runner} paused`;
    jsonLog("issue_skipped_paused", { issue: issue.identifier, runner: classification.runner });
    writeWorkforceEvent("issue_queued", {
      currentStep: "runner_paused",
      issue: issue.identifier,
      metadata: { reason },
      repository: classification.repository?.name || null,
      repositoryPath: classification.repository?.repositoryPath || null,
      runner: classification.runner,
    });
    return { held: true, issue: issue.identifier, reason, runner: classification.runner };
  }

  const workerCount = activeRunnerCount(classification.runner);
  if (workerCount >= config.maxWorkers[classification.runner]) {
    jsonLog("issue_skipped_worker_limit", { issue: issue.identifier, runner: classification.runner, workerCount });
    writeWorkforceEvent("issue_queued", {
      currentStep: "worker_limit",
      issue: issue.identifier,
      metadata: { workerCount },
      repository: classification.repository?.name || null,
      repositoryPath: classification.repository?.repositoryPath || null,
      runner: classification.runner,
    });
    return { held: true, issue: issue.identifier, reason: `${classification.runner} worker limit`, runner: classification.runner };
  }

  const overlap = hasPathOverlap(classification.expectedPaths, classification.repository.name);
  if (overlap) {
    jsonLog("issue_skipped_overlap", { issue: issue.identifier, overlap });
    writeWorkforceEvent("issue_queued", {
      currentStep: "path_overlap",
      issue: issue.identifier,
      metadata: overlap,
      repository: classification.repository?.name || null,
      repositoryPath: classification.repository?.repositoryPath || null,
      runner: classification.runner,
    });
    return { held: true, issue: issue.identifier, reason: `path overlap with ${overlap.issue}`, runner: classification.runner };
  }

  const acquired = await acquireLock(issue, classification.runner, classification.expectedPaths, classification.repository, {
    handoff: classification.handoff || null,
    handoffPath: classification.handoffPath || null,
    previousCompletedLock: classification.previousCompletedLock,
    previousCompletedLockPath: classification.previousCompletedLockPath,
    previousRevisionCycle: classification.previousRevisionCycle,
    reclaim: classification.reclaim,
  });
  if (!acquired) {
    jsonLog("issue_skipped_lock_exists", { issue: issue.identifier });
    writeWorkforceEvent("issue_queued", {
      currentStep: "blocking_issue_lock",
      issue: issue.identifier,
      metadata: { reason: "blocking lock exists" },
      repository: classification.repository?.name || null,
      repositoryPath: classification.repository?.repositoryPath || null,
      runner: classification.runner,
    });
    return { held: true, issue: issue.identifier, reason: "blocking lock exists", runner: classification.runner };
  }

  let lock = acquired.lock;
  const lockPathValue = acquired.path;
  jsonLog("issue_claimed", {
    issue: issue.identifier,
    lock: lockPathValue,
    reclaim: Boolean(classification.reclaim),
    repository: lock.repositoryName,
    revisionCycle: lock.revisionCycle || null,
    runner: lock.runner,
  });
  writeWorkforceEvent("issue_claimed", {
    branch: lock.branch,
    currentStep: "claimed",
    issue: issue.identifier,
    metadata: {
      claimTime: lock.createdAt,
      lockPath: lockPathValue,
      worktree: lock.worktreePath,
    },
    repository: lock.repositoryName,
    repositoryPath: lock.repositoryPath,
    runner: lock.runner,
  });

  let repositoryWriterLock = null;
  try {
    lock = await createWorktree(lock, lockPathValue);
    const reviewAuthorization = detectReviewAuthorization(issue, { config, lock });
    updateLock(lockPathValue, {
      productionAuthorization: reviewAuthorization.productionAuthorization || null,
      reviewAuthorization,
    });
    const preflight = await websiteExecutionPreflight(lock);
    if (!preflight.ok) {
      updateLock(lockPathValue, {
        completedAt: isoNow(),
        failedAt: isoNow(),
        lastExitCode: 78,
        preflight,
        publishHealth: mergePublishHealth(readJsonFile(lockPathValue).publishHealth, {
          exactBlocker: preflight.exactBlocker,
          implementationComplete: false,
          stage: "preflight_blocked",
        }),
        runnerFailureType: "publisher_preflight",
        status: "failed",
      });
      await postIssueComment(issue, buildPreviewBlockedComment({
        blocker: preflight.exactBlocker,
        issue,
        nextRetryAt: null,
        stage: "preflight",
      }));
      writeWorkforceEvent("runner_failed", {
        branch: lock.branch,
        currentStep: "preflight_blocked",
        issue: issue.identifier,
        metadata: { blocker: preflight.exactBlocker, failureType: "publisher_preflight" },
        repository: lock.repositoryName,
        repositoryPath: lock.repositoryPath,
        runner: lock.runner,
      });
      writeHealthSnapshot("website_preflight_blocked");
      jsonLog("website_preflight_blocked", {
        blocker: preflight.exactBlocker,
        issue: issue.identifier,
        runner: lock.runner,
      });
      return { held: true, issue: issue.identifier, reason: `website preflight blocked: ${preflight.exactBlocker}`, runner: lock.runner };
    }

    repositoryWriterLock = acquireRepositoryWriterForIssue(issue, lock, lockPathValue);
    if (!repositoryWriterLock.acquired) {
      return await holdForRepositoryWriter(issue, lock, lockPathValue, repositoryWriterLock);
    }

    await updateIssueState(issue, config.linear.statusInProgress);
    writeState("last-successful-pickup", {
      at: isoNow(),
      baseCommit: lock.baseCommit,
      branch: lock.branch,
      issue: issue.identifier,
      repository: lock.repositoryName,
      revisionCycle: lock.revisionCycle || null,
      runner: lock.runner,
      worktree: lock.worktreePath,
    });
    writeHealthSnapshot("pickup");
    if (classification.reclaim) {
      await postIssueComment(issue, buildFounderRevisionReclaimComment(lock));
    }
    await postIssueComment(issue, buildClaimAcknowledgment({
      config,
      issue,
      lock,
      nextStep: `launch ${lock.runner} in the selected worktree and persist local heartbeats`,
      reviewAuthorization,
      safetyNote: buildPickupSafetyNote(issue, lock, { authorization: reviewAuthorization }),
    }));

    let result = null;
    const maxAttempts = Math.max(1, config.maxRetries + 1);
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      result = await runAgent(issue, lock, lockPathValue, attempt, repositoryWriterLock);
      result = {
        ...result,
        finalText: tailText(result.outputPath),
      };

      const environmentRetry = classifyRunnerEnvironmentUnavailable(result, {
        defaultTimeZone: defaultCooldownTimeZone,
        retryMs: environmentRetryMs,
      });
      if (environmentRetry) {
        const savedRetry = setRunnerCooldown(lock.runner, environmentRetry, {
          branch: lock.branch,
          issue: issue.identifier,
          lockPath: lockPathValue,
          repository: lock.repositoryName,
          worktree: lock.worktreePath,
        });
        updateLock(lockPathValue, {
          cooldownDetectedAt: savedRetry.detectedAt,
          cooldownResetAt: savedRetry.resetAt,
          cooldownResumeAfter: savedRetry.resumeAfter,
          failedAt: null,
          runnerFailureType: "runner_environment_unavailable",
          status: "cooldown",
        });
        writeState("last-error", {
          at: isoNow(),
          code: "RUNNER_ENVIRONMENT_UNAVAILABLE",
          issue: issue.identifier,
          message: `${lock.runner} runner has no available execution environments until ${savedRetry.resumeAfter || savedRetry.resetAt}.`,
          runner: lock.runner,
          resetAt: savedRetry.resetAt,
          resumeAfter: savedRetry.resumeAfter,
        });
        await postIssueComment(issue, [
          `Dispatcher runner could not start because no execution environment was available.`,
          "",
          `Runner: ${lock.runner}`,
          `Repository: ${lock.repositoryName} (${lock.repositoryKind})`,
          `Branch: \`${lock.branch}\``,
          `Worktree: \`${lock.worktreePath}\``,
          `Retry after: \`${savedRetry.resumeAfter || savedRetry.resetAt}\``,
          "",
          "The issue is returned to Todo and will be retried automatically after the retry window. The existing branch/worktree remains reserved for reuse.",
          "",
          "Runner output:",
          "```text",
          savedRetry.outputSnippet || "(empty)",
          "```",
        ].join("\n"));
        await updateIssueState(issue, config.linear.statusTodo);
        writeHealthSnapshot("runner_environment_unavailable");
        return { held: true, issue: issue.identifier, reason: `${lock.runner} no available environments until ${savedRetry.resumeAfter || savedRetry.resetAt}`, runner: lock.runner };
      }

      if (result.code === 0 && !result.timedOut) {
        break;
      }

      const cooldown = classifyRunnerCooldown(result, {
        defaultCooldownMs: fallbackCooldownMsForRunner(lock.runner) || defaultCooldownMs,
        defaultTimeZone: defaultCooldownTimeZone,
        resumeDelayMs: cooldownResumeDelayMs,
      });
      if (cooldown) {
        recordCooldownBackoff(lock.runner, cooldown);
        const savedCooldown = setRunnerCooldown(lock.runner, cooldown, {
          branch: lock.branch,
          issue: issue.identifier,
          lockPath: lockPathValue,
          repository: lock.repositoryName,
          worktree: lock.worktreePath,
        });
        updateLock(lockPathValue, {
          cooldownDetectedAt: savedCooldown.detectedAt,
          cooldownResetAt: savedCooldown.resetAt,
          cooldownResumeAfter: savedCooldown.resumeAfter,
          failedAt: null,
          runnerFailureType: "runner_cooldown",
          status: "cooldown",
        });
        writeState("last-error", {
          at: isoNow(),
          code: "RUNNER_COOLDOWN",
          issue: issue.identifier,
          message: `${lock.runner} runner is cooling down until ${savedCooldown.resumeAfter || savedCooldown.resetAt}.`,
          runner: lock.runner,
          resetAt: savedCooldown.resetAt,
          resumeAfter: savedCooldown.resumeAfter,
        });
        await postIssueComment(issue, [
          `Dispatcher runner hit a usage/session limit and is cooling down.`,
          "",
          `Runner: ${lock.runner}`,
          `Branch: \`${lock.branch}\``,
          `Worktree: \`${lock.worktreePath}\``,
          `Reset at: \`${savedCooldown.resetAt}\``,
          `Resume after: \`${savedCooldown.resumeAfter}\``,
          `Reset source: \`${savedCooldown.resetSource}\``,
          "",
          "The dispatcher will not call this runner again before the resume time. The issue is returned to Todo and held for one automatic retry after reset; the other runner remains available.",
          "",
          "Runner output:",
          "```text",
          savedCooldown.outputSnippet || "(empty)",
          "```",
        ].join("\n"));
        await updateIssueState(issue, config.linear.statusTodo);
        writeHealthSnapshot("runner_cooldown");
        return { held: true, issue: issue.identifier, reason: `${lock.runner} cooldown until ${savedCooldown.resumeAfter || savedCooldown.resetAt}`, runner: lock.runner };
      }

      if (attempt < maxAttempts) {
        await postIssueComment(issue, `Dispatcher runner attempt ${attempt} failed${result.timedOut ? " by timeout" : ""}. Retrying once in the same isolated worktree.`);
        writeWorkforceEvent("retry_scheduled", {
          branch: lock.branch,
          currentStep: "runner_retry",
          issue: issue.identifier,
          metadata: {
            attempt,
            exitCode: result.code ?? null,
            timedOut: result.timedOut,
          },
          repository: lock.repositoryName,
          repositoryPath: lock.repositoryPath,
          runner: lock.runner,
        });
      }
    }

    const summary = await gitSummary(lock);
    updateLock(lockPathValue, {
      currentStep: "post_run_summary",
      headCommit: summary.headCommit || null,
      headCommitLong: summary.headCommitLong || null,
    });
    if (summary.headCommit && summary.headCommitLong !== lock.baseCommit) {
      writeWorkforceEvent("commit_detected", {
        branch: lock.branch,
        currentStep: "post_run_summary",
        issue: issue.identifier,
        latestCommit: summary.headCommit,
        metadata: {
          baseCommit: lock.baseCommit || null,
          changedFiles: summary.changedFiles || [],
          headCommitLong: summary.headCommitLong || null,
        },
        repository: lock.repositoryName,
        repositoryPath: lock.repositoryPath,
        runner: lock.runner,
      });
    }
    const finalText = result.finalText || tailText(result.outputPath);
    const previewFirstIteration = evaluatePreviewFirstIteration(issue, finalText, {
      authorization: reviewAuthorization,
      config,
      lock,
      repositoryName: lock.repositoryName,
      revisionCycle: lock.revisionCycle,
    });
    const reviewPackage = evaluateReviewPackage(issue, finalText, { authorization: reviewAuthorization });

    if (result.code === 0 && !result.timedOut) {
      const handoff = writeHandoffRecordIfNeeded(issue, lock, summary);
      if (handoff) {
        updateLock(lockPathValue, {
          handoff: handoff.record,
          handoffPath: handoff.path,
        });
      }

      const autoPublish = await runWebsiteAutoPublish(issue, lock, lockPathValue, finalText, summary);
      if (autoPublish.active) {
        if (autoPublish.failed) {
          const recovery = autoPublish.failed.recovery || publishFailureRecovery(autoPublish.failed, {
            attempt: websiteAutoPublish.maxRetries + 1,
            config,
            runner: lock.runner,
          });
          updateLock(lockPathValue, {
            completedAt: isoNow(),
            publishHealth: mergePublishHealth(readJsonFile(lockPathValue).publishHealth, {
              exactBlocker: autoPublish.failed.exactBlocker,
              implementationComplete: true,
              nextRetryAt: recovery.nextRetryAt,
              publishOnlyRunner: recovery.alternateRunner,
              stage: autoPublish.failed.stage || "preview_blocked",
            }),
            status: "review_blocked",
          });
          writeState("last-error", {
            at: isoNow(),
            code: autoPublish.failed.kind,
            issue: issue.identifier,
            message: autoPublish.failed.exactBlocker,
            nextRetryAt: recovery.nextRetryAt,
            publishOnlyRunner: recovery.alternateRunner,
            runner: lock.runner,
          });
          await postIssueComment(issue, buildPreviewBlockedComment({
            blocker: autoPublish.failed.exactBlocker,
            issue,
            nextRetryAt: recovery.nextRetryAt,
            stage: autoPublish.failed.stage || "preview",
          }));
          writeWorkforceEvent(recovery.nextRetryAt ? "retry_scheduled" : "issue_queued", {
            branch: lock.branch,
            currentStep: "preview_blocked",
            issue: issue.identifier,
            metadata: {
              blocker: autoPublish.failed.exactBlocker,
              nextRetryAt: recovery.nextRetryAt || null,
              stage: autoPublish.failed.stage || "preview",
            },
            repository: lock.repositoryName,
            repositoryPath: lock.repositoryPath,
            runner: lock.runner,
          });
          writeHealthSnapshot("implementation_complete_preview_blocked");
          jsonLog("website_auto_publish_blocked", {
            issue: issue.identifier,
            kind: autoPublish.failed.kind,
            runner: lock.runner,
            stage: autoPublish.failed.stage || null,
          });
          return { held: true, issue: issue.identifier, reason: `preview publishing blocked: ${autoPublish.failed.exactBlocker}`, runner: lock.runner };
        }

        const comment = buildVerifiedPreviewComment({
          issue,
          previewUrl: autoPublish.previewUrl,
          route: autoPublish.route,
          summary: previewFirstIteration.summarySentence,
        });
        await postIssueComment(issue, comment);
        updateLock(lockPathValue, {
          completedAt: isoNow(),
          publishHealth: mergePublishHealth(readJsonFile(lockPathValue).publishHealth, {
            exactBlocker: null,
            implementationComplete: true,
            previewUrl: autoPublish.previewUrl,
            previewUrlPosted: true,
            stage: "preview_url_posted",
          }),
          status: "completed",
        });
        writeState("last-completion", {
          at: isoNow(),
          branch: lock.branch,
          issue: issue.identifier,
          previewUrl: autoPublish.previewUrl,
          repository: lock.repositoryName,
          revisionCycle: lock.revisionCycle || null,
          runner: lock.runner,
          status: "website_auto_preview_delivered",
          worktree: lock.worktreePath,
        });
        writeState("last-error", null);
        writeWorkforceEvent("founder_review_ready", {
          branch: lock.branch,
          currentStep: "website_auto_preview_delivered",
          issue: issue.identifier,
          latestCommit: summary.headCommit || null,
          metadata: { previewUrl: autoPublish.previewUrl, productionChanged: false },
          repository: lock.repositoryName,
          repositoryPath: lock.repositoryPath,
          runner: lock.runner,
        });
        writeWorkforceEvent("completed", {
          branch: lock.branch,
          currentStep: "website_auto_preview_delivered",
          issue: issue.identifier,
          latestCommit: summary.headCommit || null,
          metadata: { previewUrl: autoPublish.previewUrl, status: "website_auto_preview_delivered" },
          repository: lock.repositoryName,
          repositoryPath: lock.repositoryPath,
          runner: lock.runner,
        });
        writeHealthSnapshot("website_auto_preview_delivered");
        jsonLog("website_auto_preview_delivered", {
          issue: issue.identifier,
          previewUrl: autoPublish.previewUrl,
          runner: lock.runner,
        });
        return { completed: true, issue: issue.identifier, previewUrl: autoPublish.previewUrl, runner: lock.runner };
      }

      if (previewFirstIteration.active) {
        if (!previewFirstIteration.passed) {
          updateLock(lockPathValue, { completedAt: isoNow(), previewFirstIterationGate: previewFirstIteration, status: "review_blocked" });
          writeState("last-error", {
            at: isoNow(),
            code: "PREVIEW_FIRST_ITERATION_MISSING",
            issue: issue.identifier,
            message: `Runner completed, but preview-first iteration details are missing: ${previewFirstIteration.missing.join(", ")}.`,
            runner: lock.runner,
          });
          await postIssueComment(issue, [
            `Dispatcher runner finished, but the preview-first iteration gate blocked founder feedback.`,
            "",
            `${issue.identifier} - ${issue.title}`,
            `Verified preview URL: missing`,
            `Updated: ${previewFirstIteration.summarySentence}`,
            `Blocker: missing ${previewFirstIteration.missing.join(", ")}`,
            "",
            "The issue remains `In Progress`; screenshots, long review packages, changed-file summaries, validation narratives, known-limitations sections, estimated review time, formal `In Review` status, and test submissions are not required for active website iteration.",
          ].join("\n"));
          writeHealthSnapshot("preview_first_iteration_blocked");
          jsonLog("issue_preview_first_iteration_blocked", { issue: issue.identifier, missing: previewFirstIteration.missing, runner: lock.runner });
          return { held: true, issue: issue.identifier, reason: `preview-first iteration missing: ${previewFirstIteration.missing.join(", ")}`, runner: lock.runner };
        }

        updateLock(lockPathValue, { completedAt: isoNow(), previewFirstIterationGate: previewFirstIteration, status: "completed" });
        await postIssueComment(issue, [
          `${issue.identifier} - ${issue.title}`,
          `Verified preview URL: ${previewFirstIteration.previewUrls[0]}`,
          `Updated: ${previewFirstIteration.summarySentence}`,
          `Blocker: ${previewFirstIteration.blocker}`,
        ].join("\n"));
        writeState("last-completion", {
          at: isoNow(),
          branch: lock.branch,
          issue: issue.identifier,
          previewUrl: previewFirstIteration.previewUrls[0],
          repository: lock.repositoryName,
          revisionCycle: lock.revisionCycle || null,
          runner: lock.runner,
          status: "preview_first_iteration_delivered",
          worktree: lock.worktreePath,
        });
        writeState("last-error", null);
        writeWorkforceEvent("preview_ready", {
          branch: lock.branch,
          currentStep: "preview_first_iteration_delivered",
          issue: issue.identifier,
          latestCommit: summary.headCommit || null,
          metadata: { previewUrl: previewFirstIteration.previewUrls[0] },
          repository: lock.repositoryName,
          repositoryPath: lock.repositoryPath,
          runner: lock.runner,
        });
        writeWorkforceEvent("completed", {
          branch: lock.branch,
          currentStep: "preview_first_iteration_delivered",
          issue: issue.identifier,
          latestCommit: summary.headCommit || null,
          metadata: { previewUrl: previewFirstIteration.previewUrls[0], status: "preview_first_iteration_delivered" },
          repository: lock.repositoryName,
          repositoryPath: lock.repositoryPath,
          runner: lock.runner,
        });
        writeHealthSnapshot("preview_first_iteration_delivered");
        jsonLog("issue_preview_first_iteration_delivered", {
          issue: issue.identifier,
          previewUrl: previewFirstIteration.previewUrls[0],
          runner: lock.runner,
        });
        return { completed: true, issue: issue.identifier, previewUrl: previewFirstIteration.previewUrls[0], runner: lock.runner };
      }

      if (reviewPackage.required && !reviewPackage.passed) {
        updateLock(lockPathValue, { completedAt: isoNow(), reviewPackageGate: reviewPackage, status: "review_blocked" });
        writeState("last-error", {
          at: isoNow(),
          code: "REVIEW_PACKAGE_MISSING",
          issue: issue.identifier,
          message: `Runner completed, but review package is missing: ${reviewPackage.missing.join(", ")}.`,
          runner: lock.runner,
        });
        await postIssueComment(issue, [
          `Dispatcher runner finished, but the review package gate blocked \`${config.linear.statusInReview}\`.`,
          "",
          `Runner: ${lock.runner}`,
          `Branch: \`${lock.branch}\``,
          `Worktree: \`${lock.worktreePath}\``,
          ...revisionSummaryLines(lock),
          `Changed files: ${summary.changedFiles.length ? summary.changedFiles.map((file) => `\`${file}\``).join(", ") : "none reported by git status"}`,
          `Missing review details: ${reviewPackage.missing.join(", ")}`,
          "",
          "Validation / runner summary:",
          "```text",
          finalText.trim() || "(runner produced no final text)",
          "```",
          "",
          "Git status:",
          "```text",
          summary.status || "(clean)",
          "```",
          "",
          `The issue remains \`${config.linear.statusInProgress}\` until the preview/review details are posted and usable.`,
          "Production merge/deployment/promotion, DNS changes, production database/schema changes, destructive actions, and unrelated external communications remain prohibited.",
        ].join("\n"));
        writeHealthSnapshot("review_blocked");
        jsonLog("issue_review_blocked", { issue: issue.identifier, missing: reviewPackage.missing, runner: lock.runner });
        return { held: true, issue: issue.identifier, reason: `review package missing: ${reviewPackage.missing.join(", ")}`, runner: lock.runner };
      }

      updateLock(lockPathValue, { completedAt: isoNow(), currentStep: "founder_review_ready", status: "completed" });
      await postIssueComment(issue, buildCompletionReport({
        finalText,
        issue,
        lock: {
          ...lock,
          publishHealth: mergePublishHealth(readJsonFile(lockPathValue).publishHealth),
        },
        productionChanged: false,
        reviewAuthorization,
        reviewPackage,
        revisionLines: revisionSummaryLines(lock),
        summary,
      }));
      await updateIssueState(issue, config.linear.statusInReview);
      writeState("last-completion", {
        at: isoNow(),
        branch: lock.branch,
        commit: summary.headCommit || null,
        issue: issue.identifier,
        productionChanged: false,
        repository: lock.repositoryName,
        revisionCycle: lock.revisionCycle || null,
        runner: lock.runner,
        status: "completed",
        worktree: lock.worktreePath,
      });
      writeState("last-error", null);
      writeWorkforceEvent("founder_review_ready", {
        branch: lock.branch,
        currentStep: "founder_review_ready",
        issue: issue.identifier,
        latestCommit: summary.headCommit || null,
        metadata: {
          changedFiles: summary.changedFiles || [],
          productionChanged: false,
        },
        repository: lock.repositoryName,
        repositoryPath: lock.repositoryPath,
        runner: lock.runner,
      });
      writeWorkforceEvent("completed", {
        branch: lock.branch,
        currentStep: "completed",
        issue: issue.identifier,
        latestCommit: summary.headCommit || null,
        metadata: {
          changedFiles: summary.changedFiles || [],
          productionChanged: false,
          status: "completed",
        },
        repository: lock.repositoryName,
        repositoryPath: lock.repositoryPath,
        runner: lock.runner,
      });
      writeHealthSnapshot("completed");
      jsonLog("issue_completed", { issue: issue.identifier, runner: lock.runner });
      return { completed: true, issue: issue.identifier, runner: lock.runner };
    }

    updateLock(lockPathValue, { failedAt: isoNow(), status: "failed" });
    writeState("last-error", {
      at: isoNow(),
      code: result.code ?? null,
      issue: issue.identifier,
      message: result.timedOut ? "Runner timed out." : "Runner exited non-zero.",
      runner: lock.runner,
      timedOut: result.timedOut,
    });
    await postIssueComment(issue, [
      `Dispatcher runner failed after ${Math.max(1, config.maxRetries + 1)} attempt(s).`,
      "",
      `Runner: ${lock.runner}`,
      `Branch: \`${lock.branch}\``,
      `Worktree: \`${lock.worktreePath}\``,
      `Timed out: ${result.timedOut ? "yes" : "no"}`,
      `Exit code: ${result.code ?? "unknown"}`,
      "",
      "stderr tail:",
      "```text",
      tailText(result.stderrPath).trim() || "(empty)",
      "```",
      "",
      "The issue is being returned to Todo, but the failed lock remains in place so it will not be picked up again until the lock is cleared intentionally.",
    ].join("\n"));
    writeWorkforceEvent("runner_failed", {
      branch: lock.branch,
      currentStep: "runner_failed",
      issue: issue.identifier,
      metadata: {
        attempts: Math.max(1, config.maxRetries + 1),
        exitCode: result.code ?? null,
        signal: result.signal || null,
        timedOut: result.timedOut,
      },
      repository: lock.repositoryName,
      repositoryPath: lock.repositoryPath,
      runner: lock.runner,
    });
    await updateIssueState(issue, config.linear.statusTodo);
    writeHealthSnapshot("failed");
    jsonLog("issue_failed", { code: result.code, issue: issue.identifier, runner: lock.runner, timedOut: result.timedOut });
    return { failed: true, issue: issue.identifier, runner: lock.runner };
  } catch (error) {
    updateLock(lockPathValue, { error: error.message, failedAt: isoNow(), status: "failed" });
    writeState("last-error", {
      at: isoNow(),
      issue: issue.identifier,
      message: error.message,
      runner: lock.runner,
    });
    writeWorkforceEvent("runner_failed", {
      branch: lock.branch,
      currentStep: "dispatcher_error",
      issue: issue.identifier,
      metadata: { error: error.message },
      repository: lock.repositoryName,
      repositoryPath: lock.repositoryPath,
      runner: lock.runner,
    });
    jsonLog("issue_error", { error: error.message, issue: issue.identifier, runner: lock.runner });
    try {
      await postIssueComment(issue, `Dispatcher failed before completion.\n\n\`\`\`text\n${error.message}\n\`\`\``);
      await updateIssueState(issue, config.linear.statusTodo);
    } catch (commentError) {
      jsonLog("issue_error_comment_failed", { error: commentError.message, issue: issue.identifier });
    }
    writeHealthSnapshot("error");
    return { failed: true, issue: issue.identifier, runner: lock.runner };
  } finally {
    if (repositoryWriterLock?.acquired) {
      repositoryWriterLocks.release(repositoryWriterLock, { reason: "dispatcher_issue_finished" });
    }
  }
}

function holdReasonForEligibleIssue(issue, classification) {
  if (!classification.eligible) {
    return { reason: classification.reason, runner: "unknown" };
  }

  if (isPaused(classification.runner)) {
    const cooldown = activeCooldown(classification.runner);
    const environmentUnavailable = cooldown?.reason === "runner_environment_unavailable";
    return {
      reason: cooldown
        ? environmentUnavailable
          ? `${classification.runner} no available environments until ${cooldown.resumeAfter || cooldown.resetAt}`
          : `${classification.runner} cooldown until ${cooldown.resumeAfter || cooldown.resetAt}`
        : `${classification.runner} paused`,
      runner: classification.runner,
    };
  }

  const workerCount = activeRunnerCount(classification.runner);
  if (workerCount >= config.maxWorkers[classification.runner]) {
    return {
      reason: `${classification.runner} worker limit`,
      runner: classification.runner,
    };
  }

  const overlap = hasPathOverlap(classification.expectedPaths, classification.repository.name);
  if (overlap) {
    return {
      reason: `path overlap with ${overlap.issue}`,
      runner: classification.runner,
    };
  }

  return null;
}

async function inspectQueue() {
  const issues = orderCandidateIssues(await listCandidateIssues(), {
    priorityIdentifiers: config.linear.revisionPriority || [],
  });
  const rows = issues.map((issue) => {
    const classification = classifyIssue(issue);
    const hold = holdReasonForEligibleIssue(issue, classification);
    const eligibility = buildEligibilityReport({
      classification,
      hold,
      issue,
      route: classification.route || null,
    });
    return {
      conditions: eligibility.conditions,
      eligible: classification.eligible,
      eligibility,
      expectedPaths: classification.expectedPaths || [],
      holdReason: hold?.reason || null,
      issue: issue.identifier,
      missing: eligibility.missing,
      conflicting: eligibility.conflicting,
      queueState: eligibility.queueState,
      reclaim: classification.reclaim || null,
      repository: classification.repository ? {
        kind: classification.repository.kind,
        name: classification.repository.name,
        path: classification.repository.repositoryPath,
      } : null,
      runner: classification.runner || hold?.runner || null,
      satisfied: eligibility.satisfied,
      state: issue.state?.name || "unknown",
      title: issue.title,
      wouldDispatch: Boolean(classification.eligible && !hold),
    };
  });

  return {
    at: isoNow(),
    candidateCount: issues.length,
    issues: rows,
  };
}

async function pollOnce() {
  recoverStaleLocks();
  recoverCooldownFailures();

  const issues = orderCandidateIssues(await listCandidateIssues(), {
    priorityIdentifiers: config.linear.revisionPriority || [],
  });
  const paused = pausedState();
  const holds = [];
  writeState("last-error", null);
  writeState("last-poll", {
    at: isoNow(),
    candidateCount: issues.length,
    paused,
    pollIntervalMs: config.pollIntervalMs,
  });
  jsonLog("poll_candidates", { count: issues.length });

  if (paused.global) {
    for (const issue of issues) {
      const classification = classifyIssue(issue);
      const hold = { reason: "dispatcher globally paused", runner: classification.runner || "unknown" };
      const eligibility = buildEligibilityReport({
        classification,
        hold,
        issue,
        route: classification.route || null,
      });
      writeWorkforceEvent("issue_discovered", {
        currentStep: "poll",
        issue: issue.identifier,
        metadata: { state: issue.state?.name || "unknown" },
      });
      writeWorkforceEvent(classification.eligible ? "eligibility_passed" : "eligibility_failed", {
        currentStep: "eligibility",
        issue: issue.identifier,
        metadata: { eligibility },
        repository: eligibility.selectedRepository?.name || null,
        repositoryPath: eligibility.selectedRepository?.path || null,
        runner: eligibility.selectedRunner || null,
      });
      writeWorkforceEvent("issue_queued", {
        currentStep: "dispatcher_paused",
        issue: issue.identifier,
        metadata: { reason: hold.reason },
        repository: eligibility.selectedRepository?.name || null,
        repositoryPath: eligibility.selectedRepository?.path || null,
        runner: eligibility.selectedRunner || null,
      });
      holds.push({
        eligibility,
        issue: issue.identifier,
        issueCreatedAt: issue.createdAt || null,
        issueUpdatedAt: issue.updatedAt || null,
        readyForDispatcherSince: issue.updatedAt || issue.createdAt || null,
        reason: hold.reason,
        runner: hold.runner,
        state: issue.state?.name || "unknown",
      });
    }
    writeState("queue-holds", { at: isoNow(), holds });
    writeHealthSnapshot("paused");
    jsonLog("poll_skipped_paused", { count: issues.length });
    return;
  }

  for (const issue of issues) {
    writeWorkforceEvent("issue_discovered", {
      currentStep: "poll",
      issue: issue.identifier,
      metadata: { state: issue.state?.name || "unknown" },
    });
    const classification = classifyIssue(issue);
    const preHold = holdReasonForEligibleIssue(issue, classification);
    const eligibility = buildEligibilityReport({
      classification,
      hold: preHold,
      issue,
      route: classification.route || null,
    });
    writeWorkforceEvent(classification.eligible ? "eligibility_passed" : "eligibility_failed", {
      currentStep: "eligibility",
      issue: issue.identifier,
      metadata: { eligibility },
      repository: eligibility.selectedRepository?.name || null,
      repositoryPath: eligibility.selectedRepository?.path || null,
      runner: eligibility.selectedRunner || null,
    });
    if (!classification.eligible) {
      jsonLog("issue_not_eligible", { issue: issue.identifier, reason: classification.reason });
      holds.push({
        eligibility,
        issue: issue.identifier,
        issueCreatedAt: issue.createdAt || null,
        issueUpdatedAt: issue.updatedAt || null,
        readyForDispatcherSince: issue.updatedAt || issue.createdAt || null,
        reason: classification.reason,
        runner: "unknown",
        state: issue.state?.name || "unknown",
      });
      continue;
    }

    const result = await handleIssue(issue, classification);
    if (result?.held) {
      const heldEligibility = buildEligibilityReport({
        classification,
        hold: result,
        issue,
        route: classification.route || null,
      });
      holds.push({
        eligibility: heldEligibility,
        issue: result.issue,
        issueCreatedAt: issue.createdAt || null,
        issueUpdatedAt: issue.updatedAt || null,
        readyForDispatcherSince: issue.updatedAt || issue.createdAt || null,
        reason: result.reason,
        runner: result.runner,
        state: issue.state?.name || "unknown",
      });
    }
  }

  writeState("queue-holds", { at: isoNow(), holds });
  writeHealthSnapshot("poll");
}

function runnerVersionCommand(runner) {
  const runnerConfig = config.runners[runner];
  if (!runnerConfig?.command) {
    return null;
  }

  if (runner === "codex") {
    return {
      args: ["--version"],
      command: runnerConfig.command,
    };
  }

  if (runner === "claude") {
    return {
      args: ["--yes", "@anthropic-ai/claude-code", "--version"],
      command: runnerConfig.command,
    };
  }

  return null;
}

async function refreshRunnerRegistry() {
  const runners = {};

  for (const runner of runnerNames) {
    const versionCommand = runnerVersionCommand(runner);
    if (!versionCommand) {
      runners[runner] = {
        available: false,
        checkedAt: isoNow(),
        command: config.runners[runner]?.command || null,
        error: "runner command is not configured",
        launchCommand: runnerLaunchCommand(runner),
        version: null,
      };
      continue;
    }

    const result = await runCommand(versionCommand.command, versionCommand.args, {
      cwd: rootDir,
      timeoutMs: 30000,
    });
    runners[runner] = {
      available: result.code === 0,
      checkedAt: isoNow(),
      command: config.runners[runner].command,
      error: result.code === 0 ? null : tailTextFromValue(result.stderr || result.stdout, 800),
      launchCommand: runnerLaunchCommand(runner),
      version: result.code === 0 ? (result.stdout || result.stderr).trim() : null,
    };
  }

  writeState("runner-registry", {
    at: isoNow(),
    runners,
  });
  writeHealthSnapshot("runner_registry");
  jsonLog("runner_registry_refreshed", {
    claude: runners.claude?.available || false,
    codex: runners.codex?.available || false,
  });
}

function tailTextFromValue(text, maxChars = 4000) {
  if (!text) {
    return "";
  }

  return text.length > maxChars ? text.slice(-maxChars) : text;
}

async function waitWithHeartbeat(ms) {
  const endAt = Date.now() + ms;
  while (Date.now() < endAt) {
    const waitMs = Math.max(0, Math.min(heartbeatIntervalMs, endAt - Date.now()));
    if (waitMs > 0) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, waitMs));
    }
    emitHeartbeat({ phase: "idle" });
    writeHealthSnapshot("idle");
  }
}

async function main() {
  if (statusOnly) {
    process.stdout.write(`${JSON.stringify(dispatcherStatus(), null, 2)}\n`);
    return;
  }

  if (inspectQueueOnly) {
    process.stdout.write(`${JSON.stringify(await inspectQueue(), null, 2)}\n`);
    return;
  }

  jsonLog("dispatcher_start", { configPath, once, rootDir, testMode: config.testMode });
  emitHeartbeat({ phase: "start" });
  await refreshRunnerRegistry();
  writeHealthSnapshot("start");

  while (true) {
    let nextDelayMs = config.pollIntervalMs;
    try {
      emitHeartbeat({ phase: "poll" });
      await pollOnce();
      emitHeartbeat({ phase: "idle" });
      writeHealthSnapshot("idle");
    } catch (error) {
      writeState("last-error", {
        at: isoNow(),
        code: error.code || null,
        message: error.message,
      });
      jsonLog("poll_error", { code: error.code || null, error: error.message });
      emitHeartbeat({ phase: "error" });
      writeHealthSnapshot("error");
      if (once && error.code === "MISSING_LINEAR_API_KEY") {
        process.exitCode = 2;
      }
      if (!once && error.code === "MISSING_LINEAR_API_KEY") {
        nextDelayMs = config.credentialRetryMs || config.pollIntervalMs;
      }
    }

    if (once) {
      break;
    }

    await waitWithHeartbeat(nextDelayMs);
  }
}

main().catch((error) => {
  jsonLog("dispatcher_fatal", { error: error.message, stack: error.stack });
  process.exitCode = 1;
});
