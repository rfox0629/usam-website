/**
 * Job 1 — Runner launcher.
 *
 * A poller, not a platform: no database, no UI, no registry duplication.
 * State lives in Linear and git. Small local state is used only for cooldowns
 * and claim locks, where there is nowhere else to put it.
 *
 * Implements USA-68 (usage-limit cooldown and resume) and USA-73 (founder
 * revision re-pickup).
 */

import path from "node:path";
import { ERROR_CODES, AutomationError } from "../shared/errors.mjs";
import { createMutationGuard } from "../shared/config.mjs";
import { createLogger } from "../shared/logging.mjs";
import {
  classifyEligibility,
  resolveApplicationRepository,
  planBranchName,
  labelsInGroup,
  stateName,
} from "./eligibility.mjs";
import { classifyRunnerCooldown, parseRunnerResetTime } from "../../runner-cooldowns.mjs";
import { orderCandidateIssues } from "../../queue-policy.mjs";

export const CLAIM_MARKER = "<!-- usam-launcher:claim -->";
export const REVISION_MARKER = "<!-- usam-launcher:revision -->";

/**
 * USA-73 — detect that the founder has requested changes on an issue that the
 * runner previously delivered, so it should return to In Progress and be
 * re-picked-up by the SAME runner, preserving its branch and worktree.
 */
export function detectFounderRevision(issue, comments, options = {}) {
  const founders = options.founderAuthorNames ?? ["Ryan Fox"];
  const state = stateName(issue);
  if (state !== (options.founderReviewStateName ?? "Founder Review")) {
    return { revisionRequested: false, reason: "issue is not in Founder Review" };
  }
  const ordered = [...(comments ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  // Find the newest founder comment that is not one of our own generated comments.
  let latest = null;
  for (const c of ordered) {
    const body = c.body ?? "";
    if (body.includes(CLAIM_MARKER) || body.includes(REVISION_MARKER)) continue;
    const author = c.author?.name ?? c.user?.name ?? "";
    if (!founders.includes(author)) continue;
    latest = c;
  }
  if (!latest) return { revisionRequested: false, reason: "no founder comment found" };

  // Already handled? Our revision marker after the founder comment means done.
  const handledAfter = ordered.some(
    (c) =>
      (c.body ?? "").includes(REVISION_MARKER) &&
      new Date(c.createdAt).getTime() > new Date(latest.createdAt).getTime(),
  );
  if (handledAfter) return { revisionRequested: false, reason: "revision already re-picked-up" };

  const text = latest.body ?? "";
  const isApproval = /\b(approved|lgtm|ship it|merge it|looks good)\b/i.test(text);
  const isChange = /\b(change|revise|fix|adjust|rework|please update|instead|not quite|redo)\b/i.test(text);
  if (isApproval && !isChange) return { revisionRequested: false, reason: "founder approved" };
  if (!isChange) return { revisionRequested: false, reason: "founder comment is not a change request" };

  return { revisionRequested: true, comment: latest, commentId: latest.id };
}

/**
 * USA-68 — classify a runner result into a cooldown decision, reusing the
 * already-tested cooldown parser rather than reimplementing it.
 */
export function evaluateCooldown(runner, runnerResult, options = {}) {
  const classified = classifyRunnerCooldown(runnerResult, options);
  if (!classified?.cooldown) return { cooling: false };
  const until =
    classified.resetAt ??
    parseRunnerResetTime(runnerResult?.stderr ?? runnerResult?.stdout ?? "", options) ??
    null;
  return {
    cooling: true,
    runner,
    until,
    reason: classified.reason ?? "usage or rate limit signalled",
    // Only notify once per cooldown window — avoids notification spam.
    shouldComment: Boolean(options.previousUntil !== until),
  };
}

/** Build the single consolidated claim comment. */
export function buildClaimComment({ issue, runner, repository, branch, worktree, revision = false }) {
  const head = revision
    ? `${REVISION_MARKER}\n**Revision re-pickup** — founder changes requested; returning to In Progress.`
    : `${CLAIM_MARKER}\n**Claimed by the runner launcher.**`;
  return [
    head,
    "",
    `- **Runner:** ${runner}`,
    `- **Repository:** \`${repository}\``,
    `- **Branch:** \`${branch}\``,
    `- **Worktree:** \`${worktree}\``,
    "",
    revision
      ? "Existing branch and worktree preserved."
      : "No production change is made by this claim.",
  ].join("\n");
}

/**
 * Plan a launch for a single issue. Pure — performs no mutation itself.
 * Returns either a refusal or a fully-specified plan.
 */
export function planLaunch({ issue, config, registry, context = {} }) {
  const verdict = classifyEligibility(issue, config, context);
  if (!verdict.eligible) return { ok: false, ...verdict };

  const repo = resolveApplicationRepository(verdict.application, registry);
  if (!repo.ok) return { ok: false, eligible: false, code: repo.code, reason: repo.reason };

  const branch = planBranchName(issue);
  const worktreeRoot = config.worktrees.allowlistRoots[0];
  const worktree = path.join(worktreeRoot, `${String(issue.id).toLowerCase()}-${verdict.runner.toLowerCase()}`);

  // Duplicate-session prevention: an existing active claim for this issue wins.
  if (context.activeSessions?.some((s) => s.issueId === issue.id)) {
    return {
      ok: false,
      eligible: false,
      code: ERROR_CODES.DUPLICATE_SESSION,
      reason: `issue ${issue.id} already has an active session`,
    };
  }

  const runnerCfg = config.runners[verdict.runner];
  return {
    ok: true,
    issueId: issue.id,
    runner: verdict.runner,
    application: verdict.application,
    repository: repo.slug,
    defaultBranch: repo.defaultBranch,
    branch,
    worktree,
    launchCommand: [runnerCfg.command, ...(runnerCfg.args ?? [])].join(" "),
    mutations: [
      { type: "comment", target: issue.id, description: "post consolidated claim comment" },
      { type: "state", target: issue.id, from: stateName(issue), to: config.linear.inProgressStateName },
      { type: "worktree", target: worktree, description: "create managed worktree" },
    ],
  };
}

/**
 * Run one launcher pass. In dry-run (the default) nothing is mutated; every
 * intended mutation is recorded and returned.
 */
export async function runLauncher({
  config,
  registry,
  issues,
  context = {},
  linear = null,
  git = null,
  productionAdapter = null,
  logger = createLogger({ job: "launcher" }),
}) {
  if (productionAdapter) {
    const inspected = await productionAdapter.inspectQueue();
    const reviewCap = Number(config.limits?.founderReviewCap || 0);
    const backpressureEngaged = reviewCap > 0 && inspected.health.founderReviewCount >= reviewCap;
    inspected.health.founderReviewCap = reviewCap || null;
    inspected.health.backpressureEngaged = backpressureEngaged;
    logger.info("production_inspect_complete", inspected.health);
    if (config.dryRun) {
      return {
        dryRun: true,
        exitStatus: 0,
        health: inspected.health,
        inspection: inspected.inspection,
        launched: [],
        refused: [],
      };
    }

    if (backpressureEngaged) {
      logger.info("production_backpressure_observed", {
        founderReviewCount: inspected.health.founderReviewCount,
        founderReviewCap: reviewCap,
        reason: "Founder Review cap is telemetry in the live adapter; legacy dispatcher policy controls pickup",
      });
    }

    const dispatch = await productionAdapter.runOnce();
    logger.info("production_dispatch_complete", {
      eventCount: dispatch.events.length,
      exitStatus: dispatch.exitStatus,
      timedOut: dispatch.timedOut,
    });
    return {
      dispatch,
      dryRun: false,
      exitStatus: dispatch.exitStatus,
      health: inspected.health,
      inspection: inspected.inspection,
    };
  }

  const guard = createMutationGuard({ dryRun: config.dryRun });
  const ordered = orderCandidateIssues(issues ?? [], {});
  const results = { launched: [], refused: [], dryRun: config.dryRun };

  for (const issue of ordered) {
    const plan = planLaunch({ issue, config, registry, context });
    if (!plan.ok) {
      results.refused.push({ issueId: issue.id, code: plan.code, reason: plan.reason });
      logger.info("launch_refused", { issueId: issue.id, code: plan.code, reason: plan.reason });
      continue;
    }

    const comment = buildClaimComment({
      issue,
      runner: plan.runner,
      repository: plan.repository,
      branch: plan.branch,
      worktree: plan.worktree,
    });

    // Atomic-ish claim: comment first, then state. If the comment fails we have
    // not moved the issue, so a retry is safe.
    await guard.perform(
      `comment on ${issue.id}`,
      () => linear.createComment(issue.id, comment),
      { type: "comment", issueId: issue.id },
    );
    await guard.perform(
      `move ${issue.id} to ${config.linear.inProgressStateName}`,
      () => linear.setState(issue.id, config.linear.inProgressStateName),
      { type: "state", issueId: issue.id, to: config.linear.inProgressStateName },
    );
    await guard.perform(
      `create worktree ${plan.worktree}`,
      () => git.createWorktree(plan.worktree, plan.branch, plan.repository),
      { type: "worktree", path: plan.worktree },
    );

    results.launched.push(plan);
    logger.info("launch_planned", {
      issueId: issue.id,
      runner: plan.runner,
      repository: plan.repository,
      branch: plan.branch,
      dryRun: config.dryRun,
    });

    // Respect per-runner WIP within a single pass.
    context.inFlightByRunner = context.inFlightByRunner ?? {};
    context.inFlightByRunner[plan.runner] = (context.inFlightByRunner[plan.runner] ?? 0) + 1;
  }

  results.plannedMutations = guard.planned;
  return results;
}
