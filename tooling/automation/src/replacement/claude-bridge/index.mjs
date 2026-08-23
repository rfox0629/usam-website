/**
 * USA-98 — Linear to Claude Code bridge.
 *
 * Linear has a native Codex app user that wakes on structured @Codex mentions.
 * This workspace has no equivalent Claude app user, so @Claude is stored as
 * plain text. The bridge is the explicit control-plane component for that gap:
 * read a Linear issue, find an unhandled @Claude request, run Claude Code in the
 * canonical repository resolved from registry v2, then post results back.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ERROR_CODES, AutomationError } from "../shared/errors.mjs";
import { createMutationGuard } from "../shared/config.mjs";
import { createLogger } from "../shared/logging.mjs";
import { hasAcceptanceCriteria, stateName } from "../launcher/eligibility.mjs";
import { orderCandidateIssues } from "../../queue-policy.mjs";
import {
  createRepositoryWriterLockStore,
  formatRepositoryWriterBusyComment,
  hasRepositoryWriterHoldComment,
} from "../../repository-writer-lock.mjs";

export const CLAUDE_BRIDGE_MARKER = "<!-- usam-claude-bridge -->";
export const CLAUDE_BRIDGE_FOLLOW_UP_MARKER = "<!-- usam-claude-bridge-follow-up -->";
export const DEFAULT_RUNTIME_ROOT = "/Users/ryanfox/.usam-dispatcher";
export const PRODUCTION_CLAUDE_TIMEOUT_MS = 30 * 60 * 1000;
export const VALIDATION_CLAUDE_TIMEOUT_MS = 2 * 60 * 1000;
export const CLAUDE_BRIDGE_COMMENT_FIRST = 50;
export const CLAUDE_FOLLOW_UP_STATES = Object.freeze({
  ACTIVE: "active",
  BLOCKED: "blocked",
  COMPLETED: "completed",
  DETECTED: "detected",
  QUEUED: "queued_follow_up",
  SUPERSEDED: "superseded",
});

function normalizeLabels(issue) {
  return issue?.labels ?? [];
}

function labelsInGroup(issue, group) {
  return normalizeLabels(issue)
    .filter((label) => (label.parent?.name ?? label.parent) === group)
    .map((label) => label.name);
}

export function isClaudeMentionComment(comment) {
  const body = comment?.body ?? "";
  return /(^|\s)@Claude\b/i.test(body);
}

export function isCanonicalClaudeFounderEditComment(comment) {
  const body = comment?.body ?? "";
  return /(^|\s)@Claude\s+NEW\s+FOUNDER\s+EDIT\b/i.test(body);
}

export function handledMarkerFor(commentId) {
  return `${CLAUDE_BRIDGE_MARKER} source-comment:${commentId}`;
}

export function followUpMarkerFor(commentId) {
  return `${CLAUDE_BRIDGE_FOLLOW_UP_MARKER} source-comment:${commentId}`;
}

function markerSourceCommentIds(comments = [], marker) {
  const ids = new Set();
  for (const comment of comments) {
    const body = comment?.body ?? "";
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = body.match(new RegExp(`${escaped}\\s+source-comment:([A-Za-z0-9-]+)`, "i"));
    if (match) ids.add(match[1]);
  }
  return ids;
}

function handledSourceCommentIds(comments = []) {
  return markerSourceCommentIds(comments, CLAUDE_BRIDGE_MARKER);
}

function acknowledgedSourceCommentIds(comments = []) {
  return markerSourceCommentIds(comments, CLAUDE_BRIDGE_FOLLOW_UP_MARKER);
}

function daemonCommentFirst(config) {
  const configured = Number(config?.linear?.commentFirst);
  return Math.max(Number.isFinite(configured) ? configured : CLAUDE_BRIDGE_COMMENT_FIRST, CLAUDE_BRIDGE_COMMENT_FIRST);
}

export function selectUnhandledClaudeMention(comments = [], { afterSourceCommentId = null, excludeSourceCommentIds = [] } = {}) {
  const handled = handledSourceCommentIds(comments);
  const excluded = new Set(excludeSourceCommentIds.filter(Boolean));

  const mentions = [...comments]
    .filter((comment) => isClaudeMentionComment(comment))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const mentionById = new Map(mentions.map((mention) => [mention.id, mention]));
  let newestHandledMentionAt = null;
  for (const sourceCommentId of handled) {
    const source = mentionById.get(sourceCommentId);
    const time = Date.parse(source?.createdAt ?? "");
    if (Number.isFinite(time) && (newestHandledMentionAt === null || time > newestHandledMentionAt)) {
      newestHandledMentionAt = time;
    }
  }
  const afterSourceTime = Date.parse(mentionById.get(afterSourceCommentId)?.createdAt ?? "");
  const earliestEligibleMentionAt = [
    newestHandledMentionAt,
    Number.isFinite(afterSourceTime) ? afterSourceTime : null,
  ].reduce((max, time) => (time === null ? max : max === null || time > max ? time : max), null);

  const eligibleMentions = [];
  for (const mention of mentions) {
    const mentionTime = Date.parse(mention.createdAt ?? "");
    if (handled.has(mention.id)) continue;
    if (excluded.has(mention.id)) continue;
    if (earliestEligibleMentionAt === null || !Number.isFinite(mentionTime) || mentionTime > earliestEligibleMentionAt) {
      eligibleMentions.push(mention);
    }
  }
  if (eligibleMentions.length > 0) {
    if (earliestEligibleMentionAt === null) {
      const canonicalFounderEdits = eligibleMentions.filter((mention) => isCanonicalClaudeFounderEditComment(mention));
      return canonicalFounderEdits[0] ?? eligibleMentions[eligibleMentions.length - 1];
    }
    return eligibleMentions[0];
  }
  if (mentions.length > 0) {
    return {
      handled: true,
      code: ERROR_CODES.CLAUDE_ALREADY_HANDLED,
      reason: "all Claude mention comments already have bridge result markers",
    };
  }
  return {
    handled: false,
    code: ERROR_CODES.CLAUDE_MENTION_MISSING,
    reason: "no @Claude comment found",
  };
}

export function renderClaudeFollowUpAcknowledgement({
  activeTask = null,
  issue,
  mention,
  queuePosition = null,
  repository,
  status,
}) {
  const isClaimed = status === CLAUDE_FOLLOW_UP_STATES.ACTIVE;
  return [
    `${followUpMarkerFor(mention.id)} status:${status}`,
    isClaimed ? "## Claude follow-up detected: issue claimed" : "## Claude follow-up detected",
    "",
    `- Issue: ${issue.identifier ?? issue.id}`,
    `- Source comment: ${mention.id}`,
    `- Status: ${status}`,
    `- Queue position: ${queuePosition ?? "n/a"}`,
    `- Repository: \`${repository?.repository ?? "unresolved"}\``,
    `- Branch: \`${repository?.branch ?? "unknown"}\``,
    activeTask
      ? `- Current active source comment: ${activeTask.sourceCommentId ?? "unknown"}`
      : "- Current active source comment: none",
    activeTask ? `- Active bridge PID: ${activeTask.pid ?? "unknown"}` : "- Active bridge PID: none",
    "",
    status === CLAUDE_FOLLOW_UP_STATES.QUEUED
      ? "Claude is already working in this repository. I did not launch a duplicate process; this follow-up is queued for the next bridge pass after the current run clears."
      : "Claude has claimed this issue and will use this source comment as the controlling trigger for this bridge run.",
  ].join("\n");
}

export function resolveIssueRepositoryPath({ issue, registry, applicationLabelGroup = "Application" }) {
  const applications = labelsInGroup(issue, applicationLabelGroup);
  if (applications.length === 0) {
    throw new AutomationError(
      ERROR_CODES.APPLICATION_MISSING,
      `issue ${issue.identifier ?? issue.id} has no ${applicationLabelGroup} label`,
    );
  }
  if (applications.length > 1) {
    throw new AutomationError(
      ERROR_CODES.APPLICATION_AMBIGUOUS,
      `issue ${issue.identifier ?? issue.id} has multiple ${applicationLabelGroup} labels: ${applications.join(", ")}`,
      { applications },
    );
  }

  const records = (registry?.applications ?? []).filter((record) =>
    (record.linearApplication ?? []).includes(applications[0]),
  );
  const active = records.filter((record) => record.status !== "legacy-reference" && record.status !== "archived");
  if (active.length !== 1) {
    throw new AutomationError(
      ERROR_CODES.REPO_UNRESOLVED,
      active.length === 0
        ? `Application "${applications[0]}" maps only to legacy/archived repositories`
        : `Application "${applications[0]}" maps to ${active.length} active repositories`,
      { application: applications[0], candidates: active.map((record) => record.slug) },
    );
  }
  const record = active[0];
  if (!record.slug?.includes("/")) {
    throw new AutomationError(ERROR_CODES.REPO_BARE_NAME, `registry record for "${applications[0]}" is not fully qualified`);
  }
  const localPath = record.sourcePath ?? record.runtimePath;
  if (!localPath) {
    throw new AutomationError(ERROR_CODES.REPO_LOCAL_PATH_MISSING, `registry record "${record.slug}" has no local source/runtime path`);
  }
  return {
    application: applications[0],
    defaultBranch: record.defaultBranch,
    localPath,
    repository: record.slug,
  };
}

export function buildClaudeBridgePrompt({ issue, mention, repository, now = new Date().toISOString() }) {
  const comments = (issue.comments ?? [])
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((comment) => {
      const author = comment.user?.name ?? "System";
      return `- ${comment.createdAt} — ${author}: ${comment.body}`;
    })
    .join("\n");

  return [
    "USAM Claude production-work bridge.",
    "",
    "You were launched by the USAM Linear-to-Claude bridge from a Linear @Claude comment.",
    "This is an authorized local repository execution lane. Treat the mapped repository, Linear issue, and trigger comment as the controlling work scope.",
    "Work only in the mapped repository path. Do not use Linear cloud delegates for work that requires local repositories.",
    "Do not deploy, merge, run migrations, mutate production data, or change Supabase/auth/tenancy/RLS/payments unless the Linear issue and founder instruction explicitly authorize that action.",
    "If the trigger comment is a controlled bridge validation request, perform only that validation and stop before product implementation.",
    "",
    `Timestamp: ${now}`,
    `Linear issue: ${issue.identifier} — ${issue.title}`,
    `Issue URL: ${issue.url}`,
    `Current state: ${issue.state?.name ?? "unknown"}`,
    `Application: ${repository.application}`,
    `Repository: ${repository.repository}`,
    `Working directory: ${repository.localPath}`,
    `Target branch: ${repository.branch ?? "unknown"}`,
    "",
    "Trigger comment:",
    mention.body,
    "",
    "Issue description:",
    issue.description ?? "",
    "",
    "Recent issue comments:",
    comments || "(none)",
    "",
    "Required response:",
    "1. Confirm the working directory, repository, and branch used.",
    "2. Summarize the work performed, or state that the trigger comment requested validation only.",
    "3. List files changed and validation commands run, or state that none were changed or run.",
    "4. Report blockers, safety stops, or founder decisions needed.",
    "",
    "Do not ask to post to Linear. The bridge will post your text output after you exit.",
  ].join("\n");
}

export function buildClaudeCodeArgs() {
  return [
    "-p",
    "--permission-mode",
    "bypassPermissions",
    "--output-format",
    "text",
  ];
}

export function resolveClaudeBridgeBranch({ issue, repository }) {
  return issue?.gitBranchName || issue?.branchName || repository?.defaultBranch || null;
}

function runGit({ cwd, args, allowFailure = false }) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (allowFailure) return result;
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "").trim() || `git ${args.join(" ")} failed`;
    throw new AutomationError(ERROR_CODES.CLAUDE_RUN_FAILED, message, {
      args,
      cwd,
      status: result.status,
      stderr: result.stderr,
      stdout: result.stdout,
    });
  }
  return (result.stdout ?? "").trim();
}

function gitRefExists(cwd, ref) {
  return runGit({ cwd, args: ["show-ref", "--verify", "--quiet", ref], allowFailure: true }).status === 0;
}

export function ensureClaudeBridgeBranch({ cwd, branch }) {
  if (!cwd || !branch) return { action: "skipped", branch: branch ?? null, cwd };
  if (String(branch).match(/[\0\r\n]/)) {
    throw new AutomationError(ERROR_CODES.CONFIG_INVALID_FIELD, `invalid Claude bridge branch name: ${branch}`);
  }

  const currentBranch = runGit({ cwd, args: ["branch", "--show-current"] });
  if (currentBranch === branch) {
    return { action: "already_current", branch, cwd, previousBranch: currentBranch };
  }

  const trackedStatus = runGit({ cwd, args: ["status", "--porcelain", "--untracked-files=no"] });
  const hasTrackedChanges = trackedStatus.trim().length > 0;
  const localRef = `refs/heads/${branch}`;
  const remoteRef = `refs/remotes/origin/${branch}`;

  if (gitRefExists(cwd, localRef)) {
    if (hasTrackedChanges) {
      throw new AutomationError(
        ERROR_CODES.REPOSITORY_MANUAL_ACTIVITY,
        `cannot switch from ${currentBranch || "detached HEAD"} to existing branch ${branch}; tracked changes are present`,
        { branch, cwd, currentBranch, trackedStatus },
      );
    }
    runGit({ cwd, args: ["switch", branch] });
    return { action: "switched_existing", branch, cwd, previousBranch: currentBranch };
  }

  if (gitRefExists(cwd, remoteRef)) {
    if (hasTrackedChanges) {
      throw new AutomationError(
        ERROR_CODES.REPOSITORY_MANUAL_ACTIVITY,
        `cannot track origin/${branch}; tracked changes are present on ${currentBranch || "detached HEAD"}`,
        { branch, cwd, currentBranch, trackedStatus },
      );
    }
    runGit({ cwd, args: ["switch", "--track", "-c", branch, `origin/${branch}`] });
    return { action: "switched_remote", branch, cwd, previousBranch: currentBranch };
  }

  runGit({ cwd, args: ["switch", "-c", branch] });
  return {
    action: hasTrackedChanges ? "created_with_tracked_changes" : "created",
    branch,
    cwd,
    previousBranch: currentBranch,
  };
}

export async function runClaudeCode({
  prompt,
  cwd,
  onSpawn = null,
  runner = null,
  timeoutMs = PRODUCTION_CLAUDE_TIMEOUT_MS,
} = {}) {
  if (runner) return runner({ prompt, cwd, timeoutMs });
  const args = buildClaudeCodeArgs();
  return await new Promise((resolve, reject) => {
    const child = spawn("claude", args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (typeof onSpawn === "function") {
      onSpawn(child, { args, command: "claude" });
    }
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new AutomationError(ERROR_CODES.CLAUDE_RUN_FAILED, error.message, { stderr, stdout }));
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0 && !timedOut) {
        resolve({ ok: true, stdout, stderr, cwd });
        return;
      }
      reject(
        new AutomationError(
          ERROR_CODES.CLAUDE_RUN_FAILED,
          timedOut ? `Claude Code timed out after ${timeoutMs}ms` : `Claude Code exited with ${code ?? signal}`,
          { code, signal, stderr, stdout, timedOut },
        ),
      );
    });

    child.stdin.end(prompt);
  });
}

export function renderClaudeResultComment({ issue, mention, repository, result, startedAt, finishedAt }) {
  return [
    `${handledMarkerFor(mention.id)}`,
    "## Claude lane bridge result",
    "",
    `- Issue: ${issue.identifier}`,
    `- Trigger comment: ${mention.id}`,
    `- Repository: \`${repository.repository}\``,
    `- Working directory: \`${repository.localPath}\``,
    `- Branch: \`${repository.branch ?? "unknown"}\``,
    `- Follow-up state: ${CLAUDE_FOLLOW_UP_STATES.COMPLETED}`,
    `- Started: ${startedAt}`,
    `- Finished: ${finishedAt}`,
    `- Manual copy/paste of issue context: no; bridge supplied issue description and comments to Claude`,
    "",
    "### Claude output",
    "",
    "````text",
    (result.stdout ?? "").trim() || "(no stdout)",
    "````",
  ].join("\n");
}

export function renderClaudeFailureComment({ issue, mention, repository, error, startedAt, finishedAt }) {
  return [
    `${handledMarkerFor(mention.id)}`,
    "## Claude lane bridge failure",
    "",
    `- Issue: ${issue.identifier}`,
    `- Trigger comment: ${mention.id}`,
    `- Repository: \`${repository?.repository ?? "unresolved"}\``,
    `- Working directory: \`${repository?.localPath ?? "unresolved"}\``,
    `- Branch: \`${repository?.branch ?? "unknown"}\``,
    `- Follow-up state: ${CLAUDE_FOLLOW_UP_STATES.BLOCKED}`,
    `- Started: ${startedAt}`,
    `- Finished: ${finishedAt}`,
    `- Result: failed closed; duplicate retry is blocked for this source comment`,
    "",
    "```text",
    `${error.code ?? "UNKNOWN"}: ${error.message}`,
    "```",
  ].join("\n");
}

function buildClaudeFollowUpRecord({
  acknowledgementCommentId = null,
  activeTask = null,
  at,
  issue,
  mention,
  queuePosition = null,
  repository,
  status,
}) {
  return {
    activeSourceCommentId: activeTask?.sourceCommentId ?? null,
    acknowledgementCommentId,
    branch: repository?.branch ?? null,
    detectedAt: at,
    issueId: issue?.identifier ?? issue?.id ?? null,
    queuePosition,
    repository: repository?.repository ?? null,
    repositoryPath: repository?.localPath ?? null,
    sourceCommentCreatedAt: mention?.createdAt ?? null,
    sourceCommentId: mention?.id ?? null,
    status,
    updatedAt: at,
  };
}

export function mergeClaudeFollowUpRecords(current = [], updates = []) {
  const bySourceComment = new Map();
  for (const record of current ?? []) {
    if (record?.sourceCommentId) bySourceComment.set(record.sourceCommentId, { ...record });
  }
  for (const update of updates ?? []) {
    if (!update?.sourceCommentId) continue;
    const existing = bySourceComment.get(update.sourceCommentId) ?? {};
    bySourceComment.set(update.sourceCommentId, {
      ...existing,
      ...update,
      acknowledgementCommentId: update.acknowledgementCommentId ?? existing.acknowledgementCommentId ?? null,
      detectedAt: existing.detectedAt ?? update.detectedAt,
    });
  }
  return normalizeQueuedFollowUpPositions([...bySourceComment.values()])
    .sort((a, b) => new Date(b.updatedAt ?? b.detectedAt ?? 0).getTime() - new Date(a.updatedAt ?? a.detectedAt ?? 0).getTime())
    .slice(0, 50);
}

function normalizeQueuedFollowUpPositions(records = []) {
  const queuedByRepository = new Map();
  for (const record of records) {
    if (record?.status !== CLAUDE_FOLLOW_UP_STATES.QUEUED) continue;
    const key = record.repositoryPath || record.repository || record.issueId || "unknown";
    if (!queuedByRepository.has(key)) queuedByRepository.set(key, []);
    queuedByRepository.get(key).push(record);
  }
  for (const queued of queuedByRepository.values()) {
    queued
      .sort((a, b) =>
        new Date(a.sourceCommentCreatedAt ?? a.detectedAt ?? 0).getTime()
        - new Date(b.sourceCommentCreatedAt ?? b.detectedAt ?? 0).getTime(),
      )
      .forEach((record, index) => {
        record.queuePosition = index + 1;
      });
  }
  return records;
}

function bridgeOutcomeForSourceComment(comments = [], sourceCommentId) {
  if (!sourceCommentId) return null;
  const outcomes = [...comments]
    .filter((comment) => markerSourceCommentIds([comment], CLAUDE_BRIDGE_MARKER).has(sourceCommentId))
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  const outcome = outcomes[0];
  if (!outcome) return null;
  const body = outcome.body ?? "";
  const blocked = /Follow-up state:\s*blocked/i.test(body) || /failed closed/i.test(body);
  return {
    commentId: outcome.id ?? null,
    status: blocked ? CLAUDE_FOLLOW_UP_STATES.BLOCKED : CLAUDE_FOLLOW_UP_STATES.COMPLETED,
    updatedAt: outcome.createdAt ?? null,
  };
}

function observedFollowUpOutcomes({ issues = [], state = {}, at }) {
  const byIssueId = new Map();
  for (const issue of issues ?? []) {
    const key = issue?.identifier ?? issue?.id;
    if (key) byIssueId.set(key, issue);
  }
  const updates = [];
  for (const record of state.followUps ?? []) {
    if (!record?.sourceCommentId || !record?.issueId) continue;
    const issue = byIssueId.get(record.issueId);
    const outcome = bridgeOutcomeForSourceComment(issue?.comments ?? [], record.sourceCommentId);
    if (!outcome) continue;
    updates.push({
      ...record,
      queuePosition: null,
      resultCommentId: outcome.commentId,
      status: outcome.status,
      updatedAt: outcome.updatedAt ?? at,
    });
  }
  return updates;
}

function existingFollowUpAcknowledgementId({ comments = [], state = {}, sourceCommentId }) {
  if (!sourceCommentId) return null;
  for (const comment of comments) {
    if (acknowledgedSourceCommentIds([comment]).has(sourceCommentId)) {
      return comment?.id ?? null;
    }
  }
  return (state.followUps ?? []).find((record) =>
    record?.sourceCommentId === sourceCommentId && record.acknowledgementCommentId,
  )?.acknowledgementCommentId ?? null;
}

async function acknowledgeClaudeFollowUp({
  activeTask = null,
  config,
  issue,
  linear,
  mention,
  queuePosition = null,
  repository,
  state,
  status,
}) {
  const existingAcknowledgementId = existingFollowUpAcknowledgementId({
    comments: issue.comments ?? [],
    state,
    sourceCommentId: mention.id,
  });
  if (existingAcknowledgementId || config.dryRun) {
    return existingAcknowledgementId;
  }
  const body = renderClaudeFollowUpAcknowledgement({
    activeTask,
    issue,
    mention,
    queuePosition,
    repository,
    status,
  });
  const response = await linear.createComment(issue.linearId, body);
  return response?.comment?.id ?? null;
}

async function buildAndAcknowledgeFollowUpRecord({
  activeTask = null,
  at,
  config,
  issue,
  linear,
  mention,
  queuePosition = null,
  repository,
  state,
  status,
}) {
  const acknowledgementCommentId = await acknowledgeClaudeFollowUp({
    activeTask,
    config,
    issue,
    linear,
    mention,
    queuePosition,
    repository,
    state,
    status,
  });
  return buildClaudeFollowUpRecord({
    acknowledgementCommentId,
    activeTask,
    at,
    issue,
    mention,
    queuePosition,
    repository,
    status,
  });
}

function writeJsonAtomic(file, data) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(tmp, file);
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function createClaudeBridgeFileStateStore({
  runtimeRoot = process.env.USAM_RUNTIME_ROOT ?? DEFAULT_RUNTIME_ROOT,
  statePath = null,
  activePath = null,
  pausePath = null,
} = {}) {
  const paths = {
    activePath: activePath ?? path.join(runtimeRoot, "state", "claude-bridge-active.json"),
    pausePath: pausePath ?? path.join(runtimeRoot, "control", "claude-bridge.pause"),
    statePath: statePath ?? path.join(runtimeRoot, "state", "claude-bridge.json"),
  };
  return {
    paths,
    isPaused: () => existsSync(paths.pausePath),
    readActive: () => readJson(paths.activePath, null),
    writeActive: (active) => writeJsonAtomic(paths.activePath, active),
    clearActive: () => {
      try {
        unlinkSync(paths.activePath);
      } catch {}
    },
    readState: () => readJson(paths.statePath, {}),
    writeState: (patch) => {
      const current = readJson(paths.statePath, {});
      const next = { ...current, ...patch };
      writeJsonAtomic(paths.statePath, next);
      return next;
    },
  };
}

export function classifyClaudeBridgeCandidate({ activeSourceCommentId = null, issue, config, registry }) {
  const state = stateName(issue);
  const issueId = issue.identifier ?? issue.id;
  if (issue.archivedAt) return { eligible: false, code: ERROR_CODES.ISSUE_ARCHIVED, reason: `${issueId} is archived` };

  const mention = selectUnhandledClaudeMention(issue.comments ?? [], {
    afterSourceCommentId: activeSourceCommentId,
    excludeSourceCommentIds: activeSourceCommentId ? [activeSourceCommentId] : [],
  });
  if (!mention?.id) return { eligible: false, code: mention.code, reason: mention.reason };

  const isTerminal = config.linear.terminalStateNames.includes(state);
  if (isTerminal && !isCanonicalClaudeFounderEditComment(mention)) {
    return { eligible: false, code: ERROR_CODES.ISSUE_TERMINAL, reason: `${issueId} is terminal (${state})` };
  }
  const allowedStates = [config.linear.readyStateName, config.linear.founderReviewStateName, config.linear.inProgressStateName]
    .filter(Boolean);
  if (!isTerminal && !allowedStates.includes(state)) {
    return { eligible: false, code: ERROR_CODES.ISSUE_NOT_READY, reason: `${issueId} is ${state}, not Ready/Founder Review/In Progress` };
  }

  const runners = labelsInGroup(issue, config.linear.runnerLabelGroup);
  if (runners.length === 0) {
    return { eligible: false, code: ERROR_CODES.RUNNER_MISSING, reason: `${issueId} has no Runner label` };
  }
  if (runners.length > 1 || runners[0] !== "Claude") {
    return {
      eligible: false,
      code: ERROR_CODES.RUNNER_AMBIGUOUS,
      reason: `${issueId} does not have exactly one Runner -> Claude label`,
      runners,
    };
  }
  if (!hasAcceptanceCriteria(issue)) {
    return { eligible: false, code: ERROR_CODES.ACCEPTANCE_CRITERIA_MISSING, reason: `${issueId} has no acceptance criteria` };
  }

  try {
    const repository = resolveIssueRepositoryPath({
      issue,
      registry,
      applicationLabelGroup: config.linear.applicationLabelGroup,
    });
    return { eligible: true, mention, repository };
  } catch (error) {
    return { eligible: false, code: error.code ?? ERROR_CODES.REPO_UNRESOLVED, reason: error.message };
  }
}

export function findClaudeBridgeCandidates({ activeTask = null, issues, config, registry }) {
  const ordered = orderCandidateIssues(issues ?? [], {});
  const candidates = [];
  const refused = [];
  for (const issue of ordered) {
    const issueId = issue.identifier ?? issue.id;
    const verdict = classifyClaudeBridgeCandidate({
      activeSourceCommentId: activeTask?.issueId === issueId ? activeTask.sourceCommentId : null,
      issue,
      config,
      registry,
    });
    if (verdict.eligible) candidates.push({ issue, ...verdict });
    else refused.push({ issueId: issue.identifier ?? issue.id, code: verdict.code, reason: verdict.reason });
  }
  return { candidates, refused };
}

async function runBridgeWithFailureMarker({
  branchManager,
  config,
  finishStateName,
  issueIdentifier,
  linear,
  logger,
  now,
  onActive = null,
  registry,
  repositoryWriterLocks,
  runner,
  timeoutMs,
}) {
  try {
    return await runClaudeBridge({
      config,
      finishStateName,
      branchManager,
      issueIdentifier,
      linear,
      logger,
      now,
      onActive,
      registry,
      repositoryWriterLocks,
      runner,
      timeoutMs,
    });
  } catch (error) {
    if (config.dryRun || !error.details?.issue || !error.details?.mention) throw error;
    const finishedAt = now();
    const comment = renderClaudeFailureComment({
      issue: error.details.issue,
      mention: error.details.mention,
      repository: error.details.repository,
      error,
      startedAt: error.details.startedAt ?? finishedAt,
      finishedAt,
    });
    await linear.createComment(error.details.issue.linearId, comment);
    throw error;
  }
}

export async function runClaudeBridgeDaemonPass({
  branchManager = ensureClaudeBridgeBranch,
  config,
  registry,
  linear,
  finishStateName = null,
  logger = createLogger({ job: "claude-bridge-daemon" }),
  now = () => new Date().toISOString(),
  runner = null,
  stateStore = createClaudeBridgeFileStateStore(),
  timeoutMs = PRODUCTION_CLAUDE_TIMEOUT_MS,
  repositoryWriterLocks = createRepositoryWriterLockStore({ logger }),
} = {}) {
  const startedAt = now();
  if (stateStore.isPaused?.()) {
    const state = stateStore.writeState?.({ lastPollAt: startedAt, paused: true, queueDepth: 0, activeTask: null });
    logger.info("claude_bridge_paused", {});
    return { ok: true, paused: true, state };
  }

  const active = stateStore.readActive?.();
  if (active?.pid && pidAlive(active.pid)) {
    let issues;
    try {
      issues = await linear.listIssuesWithRecentComments({
        first: config.linear.pollFirst ?? 250,
        commentFirst: daemonCommentFirst(config),
      });
    } catch (error) {
      const failure = {
        at: startedAt,
        code: error.code ?? ERROR_CODES.LINEAR_QUERY_FAILED,
        message: error.message,
        stage: "linear_read_while_active",
      };
      const state = stateStore.writeState?.({ activeTask: active, lastFailure: failure, lastPollAt: startedAt });
      logger.warn("claude_bridge_active_follow_up_scan_failed", failure);
      return { ok: true, activeTask: active, state, warning: failure };
    }

    const scan = findClaudeBridgeCandidates({ activeTask: active, config, issues, registry });
    const previousState = stateStore.readState?.() ?? {};
    const followUpRecords = [];
    let queuePosition = 0;
    for (const candidate of scan.candidates) {
      const branch = resolveClaudeBridgeBranch({ issue: candidate.issue, repository: candidate.repository });
      const repositoryContext = { ...candidate.repository, branch };
      const isActiveSource = candidate.mention.id === active.sourceCommentId;
      const status = isActiveSource ? CLAUDE_FOLLOW_UP_STATES.ACTIVE : CLAUDE_FOLLOW_UP_STATES.QUEUED;
      const position = isActiveSource ? 0 : ++queuePosition;
      const record = await buildAndAcknowledgeFollowUpRecord({
        activeTask: active,
        at: startedAt,
        config,
        issue: candidate.issue,
        linear,
        mention: candidate.mention,
        queuePosition: position,
        repository: repositoryContext,
        state: previousState,
        status,
      });
      followUpRecords.push(record);
    }
    const followUps = mergeClaudeFollowUpRecords(
      previousState.followUps,
      [
        ...followUpRecords,
        ...observedFollowUpOutcomes({ issues, state: previousState, at: startedAt }),
      ],
    );
    const state = stateStore.writeState?.({
      activeTask: active,
      followUps,
      lastFailure: null,
      lastPollAt: startedAt,
      paused: false,
      queueDepth: queuePosition,
      refused: scan.refused.slice(0, 20),
    });
    logger.info("claude_bridge_active", {
      issueId: active.issueId,
      pid: active.pid,
      queuedFollowUps: queuePosition,
    });
    return {
      ok: true,
      activeTask: active,
      queuedFollowUps: followUpRecords.filter((record) => record.status === CLAUDE_FOLLOW_UP_STATES.QUEUED),
      state,
    };
  }
  if (active) {
    logger.warn("claude_bridge_recovered_stale_active", { issueId: active.issueId, pid: active.pid });
    stateStore.clearActive?.();
  }

  let issues;
  try {
    issues = await linear.listIssuesWithRecentComments({
      first: config.linear.pollFirst ?? 250,
      commentFirst: daemonCommentFirst(config),
    });
  } catch (error) {
    const failure = {
      at: startedAt,
      code: error.code ?? ERROR_CODES.LINEAR_QUERY_FAILED,
      message: error.message,
      stage: "linear_read",
    };
    stateStore.writeState?.({ activeTask: null, lastFailure: failure, lastPollAt: startedAt, queueDepth: null });
    logger.error("claude_bridge_linear_read_failed", failure);
    return { ok: false, code: failure.code, error: failure, plannedMutations: [] };
  }

  const scan = findClaudeBridgeCandidates({ config, issues, registry });
  const previousState = stateStore.readState?.() ?? {};
  const observedFollowUps = observedFollowUpOutcomes({ issues, state: previousState, at: startedAt });
  stateStore.writeState?.({
    activeTask: null,
    followUps: mergeClaudeFollowUpRecords(previousState.followUps, observedFollowUps),
    lastFailure: null,
    lastPollAt: startedAt,
    paused: false,
    queueDepth: scan.candidates.length,
    refused: scan.refused.slice(0, 20),
  });

  if (scan.candidates.length === 0) {
    logger.info("claude_bridge_idle", { queueDepth: 0, refused: scan.refused.length });
    return { ok: true, launched: false, queueDepth: 0, refused: scan.refused };
  }

  const candidate = scan.candidates[0];
  const candidateBranch = resolveClaudeBridgeBranch({ issue: candidate.issue, repository: candidate.repository });
  const candidateRepository = { ...candidate.repository, branch: candidateBranch };
  const activeTask = {
    branch: candidateBranch,
    issueId: candidate.issue.identifier ?? candidate.issue.id,
    pid: process.pid,
    repository: candidate.repository.repository,
    sourceCommentId: candidate.mention.id,
    startedAt,
  };
  logger.info("issue_claimed", {
    issue: activeTask.issueId,
    repository: activeTask.repository,
    repositoryPath: candidate.repository.localPath,
    runner: "Claude",
    sourceCommentId: activeTask.sourceCommentId,
  });
  stateStore.writeActive?.(activeTask);
  stateStore.writeState?.({ activeTask, queueDepth: scan.candidates.length });

  try {
    const result = await runBridgeWithFailureMarker({
      config,
      finishStateName,
      branchManager,
      issueIdentifier: candidate.issue.identifier ?? candidate.issue.id,
      linear,
      logger,
      now,
      onActive: async () => {
        const currentState = stateStore.readState?.() ?? {};
        const activeFollowUpRecord = await buildAndAcknowledgeFollowUpRecord({
          activeTask,
          at: now(),
          config,
          issue: candidate.issue,
          linear,
          mention: candidate.mention,
          queuePosition: 0,
          repository: candidateRepository,
          state: currentState,
          status: CLAUDE_FOLLOW_UP_STATES.ACTIVE,
        });
        stateStore.writeState?.({
          activeTask,
          followUps: mergeClaudeFollowUpRecords(currentState.followUps, [activeFollowUpRecord]),
          lastFailure: null,
          lastPollAt: startedAt,
          queueDepth: scan.candidates.length,
        });
      },
      registry,
      repositoryWriterLocks,
      runner,
      timeoutMs,
    });
    if (result.held) {
      const heldAt = now();
      const hold = {
        at: heldAt,
        branch: result.repository?.branch || null,
        code: result.code,
        issueId: result.issueId,
        repositoryPath: result.repository?.localPath || null,
        sourceCommentId: result.sourceCommentId,
      };
      const currentState = stateStore.readState?.() ?? {};
      const queuedRecord = await buildAndAcknowledgeFollowUpRecord({
        activeTask: result.repositoryWriter ?? null,
        at: heldAt,
        config,
        issue: candidate.issue,
        linear,
        mention: candidate.mention,
        queuePosition: 1,
        repository: result.repository,
        state: currentState,
        status: CLAUDE_FOLLOW_UP_STATES.QUEUED,
      });
      stateStore.writeState?.({
        activeTask: null,
        followUps: mergeClaudeFollowUpRecords(currentState.followUps, [queuedRecord]),
        lastFailure: null,
        lastHold: hold,
        lastPollAt: heldAt,
        queueDepth: scan.candidates.length,
      });
      return { ...result, daemon: true, queueDepth: scan.candidates.length };
    }
    const completedAt = now();
    const success = {
      at: completedAt,
      branch: result.repository?.branch || null,
      issueId: result.issueId,
      repository: result.repository?.repository,
      sourceCommentId: result.sourceCommentId,
    };
    const currentState = stateStore.readState?.() ?? {};
    const completedRecord = buildClaudeFollowUpRecord({
      at: completedAt,
      issue: candidate.issue,
      mention: candidate.mention,
      queuePosition: null,
      repository: result.repository,
      status: CLAUDE_FOLLOW_UP_STATES.COMPLETED,
    });
    stateStore.writeState?.({
      activeTask: null,
      followUps: mergeClaudeFollowUpRecords(currentState.followUps, [completedRecord]),
      lastFailure: null,
      lastSuccess: success,
      lastPollAt: completedAt,
      queueDepth: Math.max(0, scan.candidates.length - 1),
    });
    return { ...result, daemon: true, queueDepth: scan.candidates.length };
  } catch (error) {
    const failedAt = now();
    const failure = {
      at: failedAt,
      code: error.code ?? "UNKNOWN",
      issueId: activeTask.issueId,
      message: error.message,
      sourceCommentId: activeTask.sourceCommentId,
      stage: "runner",
    };
    const currentState = stateStore.readState?.() ?? {};
    const blockedRecord = buildClaudeFollowUpRecord({
      at: failedAt,
      issue: candidate.issue,
      mention: candidate.mention,
      queuePosition: null,
      repository: candidateRepository,
      status: CLAUDE_FOLLOW_UP_STATES.BLOCKED,
    });
    stateStore.writeState?.({
      activeTask: null,
      followUps: mergeClaudeFollowUpRecords(currentState.followUps, [blockedRecord]),
      lastFailure: failure,
      lastPollAt: failedAt,
    });
    logger.error("claude_bridge_runner_failed", failure);
    return { ok: false, code: failure.code, error: failure, plannedMutations: [] };
  } finally {
    stateStore.clearActive?.();
  }
}

export async function runClaudeBridgeDaemon({
  branchManager = ensureClaudeBridgeBranch,
  config,
  registry,
  linear,
  finishStateName,
  logger = createLogger({ job: "claude-bridge-daemon" }),
  once = false,
  pollIntervalMs = 60000,
  runner = null,
  stateStore = createClaudeBridgeFileStateStore(),
  timeoutMs = PRODUCTION_CLAUDE_TIMEOUT_MS,
  repositoryWriterLocks = createRepositoryWriterLockStore({ logger }),
} = {}) {
  if (once) {
    return await runClaudeBridgeDaemonPass({
      config,
      finishStateName,
      branchManager,
      linear,
      logger,
      registry,
      runner,
      stateStore,
      timeoutMs,
      repositoryWriterLocks,
    });
  }
  logger.info("claude_bridge_daemon_start", { dryRun: config.dryRun, pollIntervalMs });
  for (;;) {
    await runClaudeBridgeDaemonPass({
      config,
      finishStateName,
      branchManager,
      linear,
      logger,
      registry,
      runner,
      stateStore,
      timeoutMs,
      repositoryWriterLocks,
    });
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

export async function runClaudeBridge({
  branchManager = ensureClaudeBridgeBranch,
  config,
  registry,
  issueIdentifier,
  linear,
  runner = null,
  logger = createLogger({ job: "claude-bridge" }),
  now = () => new Date().toISOString(),
  onActive = null,
  finishStateName = null,
  timeoutMs = PRODUCTION_CLAUDE_TIMEOUT_MS,
  repositoryWriterLocks = createRepositoryWriterLockStore({ logger }),
}) {
  if (!issueIdentifier) {
    throw new AutomationError(ERROR_CODES.CONFIG_INVALID_FIELD, "claude-bridge requires --issue IDENTIFIER");
  }
  const guard = createMutationGuard({ dryRun: config.dryRun });
  const issue = await linear.getIssueWithComments(issueIdentifier);
  const mention = selectUnhandledClaudeMention(issue.comments ?? []);
  if (!mention?.id) {
    logger.info("claude_bridge_refused", { issueIdentifier, code: mention.code, reason: mention.reason });
    return { ok: false, dryRun: config.dryRun, code: mention.code, reason: mention.reason, plannedMutations: [] };
  }

  const repository = resolveIssueRepositoryPath({
    issue,
    registry,
    applicationLabelGroup: config.linear.applicationLabelGroup,
  });
  const targetBranch = resolveClaudeBridgeBranch({ issue, repository });
  const repositoryContext = { ...repository, branch: targetBranch };
  const startedAt = now();
  const prompt = buildClaudeBridgePrompt({ issue, mention, repository: repositoryContext, now: startedAt });
  let repositoryWriterLock = null;

  if (!config.dryRun) {
    repositoryWriterLock = repositoryWriterLocks.acquire({
      branch: targetBranch,
      command: "claude bridge pending launch",
      cwd: repository.localPath,
      issueId: issue.identifier,
      owner: "claude-bridge",
      pid: process.pid,
      repositoryPath: repository.localPath,
      runner: "Claude",
      startedAt,
    });
    if (!repositoryWriterLock.acquired) {
      const comment = formatRepositoryWriterBusyComment({
        issueId: issue.identifier,
        occupant: repositoryWriterLock.occupant,
        repositoryPath: repositoryWriterLock.repositoryPath,
      });
      if (!hasRepositoryWriterHoldComment(issue.comments ?? [], { issueId: issue.identifier, occupant: repositoryWriterLock.occupant })) {
        await guard.perform(
          `comment repository writer hold on ${issue.identifier}`,
          () => linear.createComment(issue.linearId, comment),
          { type: "comment", issueId: issue.identifier },
        );
      }
      logger.info("claude_bridge_repository_writer_busy", {
        issueIdentifier: issue.identifier,
        occupantIssueId: repositoryWriterLock.occupant?.issueId || null,
        repositoryPath: repositoryWriterLock.repositoryPath,
      });
      return {
        ok: true,
        held: true,
        code: ERROR_CODES.REPOSITORY_WRITER_ACTIVE,
        dryRun: config.dryRun,
        issueId: issue.identifier,
        plannedMutations: guard.planned,
        repository: repositoryContext,
        repositoryWriter: repositoryWriterLock.occupant,
        runner: "Claude",
        sourceCommentId: mention.id,
      };
    }
  }
  if (typeof onActive === "function") {
    await onActive({ issue, mention, repository: repositoryContext, repositoryWriterLock, startedAt });
  }

  let result = { ok: true, stdout: "(dry-run: Claude Code not launched)", stderr: "", cwd: repository.localPath };
  try {
    await guard.perform(
      `checkout ${targetBranch ?? "repository default branch"} for ${issue.identifier}`,
      () => branchManager({ cwd: repository.localPath, branch: targetBranch }),
      { type: "git", issueId: issue.identifier, branch: targetBranch, repository: repository.repository },
    );

    await guard.perform(
      `move ${issue.identifier} to ${config.linear.inProgressStateName}`,
      () => linear.setState(issue.linearId, config.linear.inProgressStateName),
      { type: "state", issueId: issue.identifier, to: config.linear.inProgressStateName },
    );

    await guard.perform(
      `launch Claude Code for ${issue.identifier}`,
      async () => {
        try {
          result = await runClaudeCode({
            prompt,
            cwd: repository.localPath,
            onSpawn: (child, invocation) => {
              repositoryWriterLocks.update(repositoryWriterLock, {
                childPid: child.pid,
                command: [invocation.command, ...invocation.args].join(" "),
                cwd: repository.localPath,
                pendingLaunch: false,
                pid: child.pid,
                processPid: child.pid,
              });
            },
            runner,
            timeoutMs,
          });
        } catch (error) {
          error.details = { ...(error.details ?? {}), issue, mention, repository, startedAt };
          throw error;
        }
        return { ok: result.ok, cwd: result.cwd };
      },
      { type: "runner", issueId: issue.identifier, runner: "Claude", repository: repository.repository },
    );
  } catch (error) {
    error.details = { ...(error.details ?? {}), issue, mention, repository: repositoryContext, startedAt };
    throw error;
  } finally {
    if (repositoryWriterLock?.acquired) {
      repositoryWriterLocks.release(repositoryWriterLock, { reason: "claude_bridge_finished" });
    }
  }

  const finishedAt = now();
  const comment = renderClaudeResultComment({ issue, mention, repository: repositoryContext, result, startedAt, finishedAt });
  await guard.perform(
    `comment on ${issue.identifier}`,
    () => linear.createComment(issue.linearId, comment),
    { type: "comment", issueId: issue.identifier },
  );

  if (finishStateName) {
    await guard.perform(
      `move ${issue.identifier} to ${finishStateName}`,
      () => linear.setState(issue.linearId, finishStateName),
      { type: "state", issueId: issue.identifier, to: finishStateName },
    );
  }

  logger.info("claude_bridge_complete", {
    dryRun: config.dryRun,
    issueIdentifier: issue.identifier,
    repository: repository.repository,
    branch: targetBranch,
  });

  return {
    ok: true,
    dryRun: config.dryRun,
    issueId: issue.identifier,
    sourceCommentId: mention.id,
    repository: repositoryContext,
    runner: "Claude",
    result: { ok: result.ok, cwd: result.cwd, stdoutPreview: (result.stdout ?? "").slice(0, 500) },
    plannedMutations: guard.planned,
  };
}
