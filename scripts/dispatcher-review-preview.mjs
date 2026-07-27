#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

export const DISPATCHER_REVIEW_BRANCH_PATTERN = /^dispatcher\/usa-\d+-(codex|claude)-\d{14}$/;
export const DEFAULT_PREVIEW_ROUTE = "/admin/operations-center";

const PROTECTED_BRANCH_NAMES = new Set([
  "main",
  "master",
  "prod",
  "production",
]);

const PROTECTED_BRANCH_PREFIXES = [
  "prod/",
  "production/",
  "release/",
  "deploy/",
];

function parseBoolean(value, defaultValue = false) {
  if (value == null || value === "") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--branch") {
      args.branch = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--linear-issue") {
      args.linearIssue = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--issue") {
      args.linearIssue = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--route") {
      args.route = argv[index + 1];
      index += 1;
      continue;
    }

    if (!arg.startsWith("--") && !args.branch) {
      args.branch = arg;
    }
  }

  return args;
}

export function normalizeReviewBranch(branch) {
  if (typeof branch !== "string") {
    return "";
  }

  return branch.trim().replace(/^refs\/heads\//, "");
}

export function isProtectedBranchName(branch) {
  const normalized = normalizeReviewBranch(branch);

  if (PROTECTED_BRANCH_NAMES.has(normalized)) {
    return true;
  }

  return PROTECTED_BRANCH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function validateReviewBranchName(branch) {
  if (typeof branch !== "string" || branch !== branch.trim()) {
    return {
      ok: false,
      reason: "review branch must not contain leading or trailing whitespace",
    };
  }

  const normalized = normalizeReviewBranch(branch);

  if (!normalized) {
    return {
      ok: false,
      reason: "review branch is required",
    };
  }

  if (branch !== normalized && !branch.startsWith("refs/heads/")) {
    return {
      ok: false,
      reason: "review branch must be a branch name or refs/heads branch ref",
    };
  }

  if (normalized.startsWith("+") || normalized.includes(":")) {
    return {
      ok: false,
      reason: `refusing force or custom refspec syntax for '${normalized}'`,
    };
  }

  if (/[\s~^:?*[\]\\]/.test(normalized) || normalized.includes("..") || normalized.endsWith(".lock")) {
    return {
      ok: false,
      reason: `refusing invalid branch ref syntax for '${normalized}'`,
    };
  }

  if (isProtectedBranchName(normalized)) {
    return {
      ok: false,
      reason: `refusing to push protected branch '${normalized}'`,
    };
  }

  if (!DISPATCHER_REVIEW_BRANCH_PATTERN.test(normalized)) {
    return {
      ok: false,
      reason: `branch '${normalized}' does not match allowed dispatcher review pattern '${DISPATCHER_REVIEW_BRANCH_PATTERN.source}'`,
    };
  }

  return {
    ok: true,
    branch: normalized,
  };
}

export function buildPushRefspec(branch) {
  const validation = validateReviewBranchName(branch);

  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  return `refs/heads/${validation.branch}:refs/heads/${validation.branch}`;
}

export function buildGitPushArgs(branch) {
  return ["push", "--porcelain", "origin", buildPushRefspec(branch)];
}

export function formatPreviewBlocked(reason) {
  return `Preview Blocked: ${reason}`;
}

export function buildPreviewRouteUrl(deploymentUrl, route = DEFAULT_PREVIEW_ROUTE) {
  const url = deploymentUrl.startsWith("http")
    ? new URL(deploymentUrl)
    : new URL(`https://${deploymentUrl}`);

  url.pathname = route.startsWith("/") ? route : `/${route}`;
  url.search = "";
  url.hash = "";

  return url.toString();
}

export function buildLinearCommentBody({ branch, routeUrl, reason, status }) {
  if (status === "ready") {
    return [
      "Product preview ready:",
      "",
      `[Open protected preview](${routeUrl})`,
      "",
      "Review instructions:",
      "- Sign in or use the approved Vercel preview access flow.",
      "- Open `/admin/operations-center`.",
      "- Review the Operations Center B dashboard MVP on desktop and mobile.",
      "- Do not merge or promote to production until founder approval is explicit.",
      "",
      `Branch: \`${branch}\``,
    ].join("\n");
  }

  return [
    formatPreviewBlocked(reason),
    "",
    `Branch: \`${branch || "unknown"}\``,
  ].join("\n");
}

export function getConfig(env = process.env, argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const pushDisabled = parseBoolean(env.DISPATCHER_REVIEW_PUSH_DISABLED, false);
  const pushEnabled = parseBoolean(env.DISPATCHER_REVIEW_PUSH_ENABLED, true);
  const previewEnabled = parseBoolean(env.DISPATCHER_REVIEW_PREVIEW_ENABLED, true);
  const singleWorkerMode = parseBoolean(env.DISPATCHER_SINGLE_WORKER_MODE, false);
  const allowSingleWorkerPush = parseBoolean(env.DISPATCHER_REVIEW_PUSH_IN_SINGLE_WORKER, false);
  const enabled = previewEnabled && pushEnabled && !pushDisabled;
  const disabledReason = !previewEnabled
    ? "review preview publishing is disabled by DISPATCHER_REVIEW_PREVIEW_ENABLED=false"
    : !pushEnabled
      ? "review preview publishing is disabled by DISPATCHER_REVIEW_PUSH_ENABLED=false"
      : pushDisabled
        ? "review preview publishing is disabled by DISPATCHER_REVIEW_PUSH_DISABLED=true"
        : "";

  return {
    branch: args.branch || env.DISPATCHER_REVIEW_BRANCH || "",
    disabledReason,
    enabled,
    dryRun: Boolean(args.dryRun)
      || parseBoolean(env.DISPATCHER_REVIEW_PREVIEW_TEST_MODE, false)
      || parseBoolean(env.DISPATCHER_TEST_MODE, false),
    singleWorkerMode: singleWorkerMode && !allowSingleWorkerPush,
    route: args.route || env.DISPATCHER_REVIEW_PREVIEW_ROUTE || DEFAULT_PREVIEW_ROUTE,
    linearIssue: args.linearIssue || env.DISPATCHER_LINEAR_ISSUE || "",
    linearToken: env.LINEAR_API_KEY || "",
    linearCommentEnabled: parseBoolean(env.DISPATCHER_LINEAR_COMMENT_ENABLED, true),
    requireLinearComment: parseBoolean(env.DISPATCHER_REQUIRE_LINEAR_COMMENT, true),
    vercelApiBaseUrl: env.VERCEL_API_BASE_URL || "https://api.vercel.com",
    vercelToken: env.VERCEL_TOKEN || "",
    vercelProjectId: env.VERCEL_PROJECT_ID || "",
    vercelProjectName: env.VERCEL_PROJECT_NAME || "",
    vercelTeamId: env.VERCEL_TEAM_ID || "",
    vercelPollTimeoutMs: Number(env.VERCEL_POLL_TIMEOUT_MS || 600000),
    vercelPollIntervalMs: Number(env.VERCEL_POLL_INTERVAL_MS || 10000),
    skipProtectionCheck: parseBoolean(env.DISPATCHER_SKIP_PREVIEW_PROTECTION_CHECK, false),
  };
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

async function git(args, options = {}) {
  const result = await runCommand("git", args, options);

  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  }

  return result.stdout;
}

async function hasLocalReviewDiff(branch, options = {}) {
  await git(["rev-parse", "--verify", `refs/heads/${branch}`], options);
  await git(["rev-parse", "--verify", "origin/main"], options);

  const aheadCount = Number(await git(["rev-list", "--count", `origin/main..${branch}`], options));

  if (!Number.isFinite(aheadCount) || aheadCount < 1) {
    return {
      ok: false,
      reason: `branch '${branch}' has no commits ahead of origin/main`,
    };
  }

  const changedFiles = await git(["diff", "--name-only", `origin/main...${branch}`], options);

  if (!changedFiles) {
    return {
      ok: false,
      reason: `branch '${branch}' has no file changes compared with origin/main`,
    };
  }

  return {
    ok: true,
    aheadCount,
    changedFiles: changedFiles.split("\n").filter(Boolean),
  };
}

async function pushReviewBranch(branch, config, options = {}) {
  if (!config.enabled) {
    return {
      ok: false,
      reason: config.disabledReason || "review preview publishing is disabled",
    };
  }

  if (config.singleWorkerMode) {
    return {
      ok: false,
      reason: "single-worker mode is active; automatic review-branch push skipped",
    };
  }

  if (config.dryRun) {
    return {
      ok: true,
      skipped: true,
      stdout: "dry run: non-force push skipped",
    };
  }

  const args = buildGitPushArgs(branch);
  const result = await runCommand("git", args, options);

  if (result.code !== 0) {
    return {
      ok: false,
      reason: result.stderr || result.stdout || "git push failed",
    };
  }

  return {
    ok: true,
    stdout: result.stdout,
  };
}

function deploymentMatchesBranch(deployment, branch) {
  const meta = deployment?.meta || {};
  const gitSource = deployment?.gitSource || {};

  return [
    meta.githubCommitRef,
    meta.gitCommitRef,
    meta.branch,
    gitSource.ref,
    deployment?.gitSource?.ref,
  ].includes(branch);
}

async function listVercelDeployments(config) {
  if (!config.vercelToken) {
    throw new Error("VERCEL_TOKEN is required to wait for Vercel preview result");
  }

  if (!config.vercelProjectId && !config.vercelProjectName) {
    throw new Error("VERCEL_PROJECT_ID or VERCEL_PROJECT_NAME is required to wait for Vercel preview result");
  }

  const params = new URLSearchParams({
    limit: "20",
  });

  if (config.vercelProjectId) {
    params.set("projectId", config.vercelProjectId);
  }

  if (config.vercelProjectName) {
    params.set("projectName", config.vercelProjectName);
  }

  if (config.vercelTeamId) {
    params.set("teamId", config.vercelTeamId);
  }

  const response = await fetch(`${config.vercelApiBaseUrl}/v6/deployments?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${config.vercelToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Vercel deployments API returned ${response.status}`);
  }

  const data = await response.json();

  return data.deployments || [];
}

async function waitForVercelPreview(branch, config) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < config.vercelPollTimeoutMs) {
    const deployments = await listVercelDeployments(config);
    const deployment = deployments.find((item) => deploymentMatchesBranch(item, branch));

    if (deployment) {
      if (deployment.target === "production") {
        return {
          ok: false,
          reason: `matched deployment for '${branch}' targets production`,
        };
      }

      if (deployment.state === "READY") {
        return {
          ok: true,
          deploymentUrl: deployment.url,
          routeUrl: buildPreviewRouteUrl(deployment.url, config.route),
        };
      }

      if (["ERROR", "CANCELED"].includes(deployment.state)) {
        return {
          ok: false,
          reason: `Vercel preview ended with state ${deployment.state}`,
        };
      }
    }

    await delay(config.vercelPollIntervalMs);
  }

  return {
    ok: false,
    reason: `timed out waiting for Vercel preview for '${branch}'`,
  };
}

async function verifyPreviewProtection(routeUrl, config) {
  if (config.skipProtectionCheck) {
    return {
      ok: true,
      skipped: true,
    };
  }

  const response = await fetch(routeUrl, {
    method: "GET",
    redirect: "manual",
  });

  if ([401, 403].includes(response.status)) {
    return {
      ok: true,
      status: response.status,
    };
  }

  const location = response.headers.get("location") || "";

  if ([302, 303, 307, 308].includes(response.status) && /auth|login|signin|vercel/i.test(location)) {
    return {
      ok: true,
      status: response.status,
      location,
    };
  }

  return {
    ok: false,
    reason: `preview route responded ${response.status} without an auth/protection challenge`,
  };
}

async function postLinearComment(issueIdentifier, body, config) {
  if (config.dryRun || config.singleWorkerMode) {
    return {
      ok: true,
      skipped: true,
      reason: "test or single-worker mode is active; Linear comment posting skipped",
    };
  }

  if (!config.linearCommentEnabled) {
    return {
      ok: !config.requireLinearComment,
      skipped: true,
      reason: "Linear comment posting is disabled",
    };
  }

  if (!issueIdentifier) {
    return {
      ok: !config.requireLinearComment,
      skipped: true,
      reason: "DISPATCHER_LINEAR_ISSUE is required to post a Linear preview comment",
    };
  }

  if (!config.linearToken) {
    return {
      ok: !config.requireLinearComment,
      skipped: true,
      reason: "LINEAR_API_KEY is required to post a Linear preview comment",
    };
  }

  let issueResponse;
  try {
    issueResponse = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: config.linearToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "query Issue($id: String!) { issue(id: $id) { id identifier } }",
        variables: {
          id: issueIdentifier,
        },
      }),
    });
  } catch (error) {
    return {
      ok: !config.requireLinearComment,
      reason: `Linear issue lookup failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }

  if (!issueResponse.ok) {
    return {
      ok: false,
      reason: `Linear issue lookup returned ${issueResponse.status}`,
    };
  }

  const issuePayload = await issueResponse.json();
  const issueId = issuePayload?.data?.issue?.id;

  if (!issueId) {
    return {
      ok: false,
      reason: `Linear issue '${issueIdentifier}' was not found`,
    };
  }

  let commentResponse;
  try {
    commentResponse = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: config.linearToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "mutation CommentCreate($issueId: String!, $body: String!) { commentCreate(input: { issueId: $issueId, body: $body }) { success comment { id url } } }",
        variables: {
          issueId,
          body,
        },
      }),
    });
  } catch (error) {
    return {
      ok: !config.requireLinearComment,
      reason: `Linear comment create failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }

  if (!commentResponse.ok) {
    return {
      ok: false,
      reason: `Linear comment create returned ${commentResponse.status}`,
    };
  }

  const commentPayload = await commentResponse.json();

  if (!commentPayload?.data?.commentCreate?.success) {
    return {
      ok: false,
      reason: "Linear comment create did not return success",
    };
  }

  return {
    ok: true,
    commentUrl: commentPayload.data.commentCreate.comment?.url || null,
  };
}

async function finishBlocked(branch, reason, config) {
  const body = buildLinearCommentBody({
    branch,
    reason,
    status: "blocked",
  });
  const linear = await postLinearComment(config.linearIssue, body, config);

  return {
    ok: false,
    status: "Preview Blocked",
    productPreviewReady: false,
    branch,
    reason,
    linear,
    linearBody: body,
  };
}

export async function publishReviewPreview(config = getConfig(), options = {}) {
  const validation = validateReviewBranchName(config.branch);

  if (!validation.ok) {
    return finishBlocked(config.branch, validation.reason, config);
  }

  const branch = validation.branch;

  let diff;
  try {
    diff = await hasLocalReviewDiff(branch, options);
  } catch (error) {
    return finishBlocked(branch, error instanceof Error ? error.message : "unable to validate local review branch", config);
  }

  if (!diff.ok) {
    return finishBlocked(branch, diff.reason, config);
  }

  const push = await pushReviewBranch(branch, config, options);

  if (!push.ok) {
    return finishBlocked(branch, push.reason, config);
  }

  if (push.skipped) {
    return finishBlocked(branch, "test mode is active; review branch push and Vercel wait were skipped", config);
  }

  let preview;
  try {
    preview = await waitForVercelPreview(branch, config);
  } catch (error) {
    return finishBlocked(branch, error instanceof Error ? error.message : "unable to wait for Vercel preview", config);
  }

  if (!preview.ok) {
    return finishBlocked(branch, preview.reason, config);
  }

  let protection;
  try {
    protection = await verifyPreviewProtection(preview.routeUrl, config);
  } catch (error) {
    return finishBlocked(branch, error instanceof Error ? error.message : "unable to verify preview protection", config);
  }

  if (!protection.ok) {
    return finishBlocked(branch, protection.reason, config);
  }

  const linearBody = buildLinearCommentBody({
    branch,
    routeUrl: preview.routeUrl,
    status: "ready",
  });
  const linear = await postLinearComment(config.linearIssue, linearBody, config);

  if (!linear.ok) {
    return finishBlocked(branch, linear.reason, config);
  }

  return {
    ok: true,
    status: "product-preview-ready",
    productPreviewReady: true,
    branch,
    changedFiles: diff.changedFiles,
    aheadCount: diff.aheadCount,
    routeUrl: preview.routeUrl,
    deploymentUrl: preview.deploymentUrl,
    push,
    protection,
    linear,
    linearBody,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await publishReviewPreview();

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
