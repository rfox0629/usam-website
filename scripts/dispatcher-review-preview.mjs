#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const PREVIEW_READY_STATUS = "product-preview-ready";
export const PREVIEW_BLOCKED_STATUS = "Preview Blocked";
export const DEFAULT_REVIEW_BRANCH_PATTERN = "^dispatcher/usa-[0-9]+-(codex|claude)-[0-9]{14}$";
export const DEFAULT_REVIEW_ROUTE = "/admin/operations-center";

const readyStates = new Set(["READY"]);
const blockedStates = new Set(["ERROR", "CANCELED"]);

class PreviewBlockedError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "PreviewBlockedError";
    this.details = details;
  }
}

function usage() {
  return `Usage:
  node scripts/dispatcher-review-preview.mjs --branch dispatcher/usa-52-codex-20260721154907 --issue USA-52

Options:
  --branch <name>        Required dispatcher review branch.
  --issue <id>           Linear issue identifier to receive the preview comment.
  --route <path>         Preview route. Default: ${DEFAULT_REVIEW_ROUTE}
  --remote <name>        Git remote. Default: origin
  --base <ref>           Diff base used to reject empty previews. Default: origin/main
  --timeout-ms <number>  Vercel wait timeout. Default: 900000
  --poll-ms <number>     Vercel poll interval. Default: 15000
  --allow-empty-diff     Do not block when the branch has no diff from --base.
  --dry-run              Validate only; do not push, wait for Vercel, or post Linear.
  --test-mode            Validate only and report Preview Blocked for dispatcher test mode.
  --skip-linear          Do not post the ready preview comment to Linear.
  --skip-vercel          Do not wait for Vercel. Reports Preview Blocked after push.
  --no-protection-check  Do not verify unauthenticated preview access is challenged.
  --json                 Emit JSON only.`;
}

function asBoolean(value) {
  return /^(1|true|yes|on)$/i.test(String(value ?? "").trim());
}

function asFalse(value) {
  return /^(0|false|no|off)$/i.test(String(value ?? "").trim());
}

function compactText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : fallback;
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseArgs(argv, env = process.env) {
  const options = {
    allowEmptyDiff: false,
    base: compactText(env.DISPATCHER_REVIEW_BASE, "origin/main"),
    branch: compactText(env.DISPATCHER_REVIEW_BRANCH),
    dryRun: asBoolean(env.DISPATCHER_REVIEW_DRY_RUN),
    issue: compactText(env.DISPATCHER_REVIEW_LINEAR_ISSUE),
    json: asBoolean(env.DISPATCHER_REVIEW_JSON),
    noProtectionCheck: asBoolean(env.DISPATCHER_REVIEW_SKIP_PROTECTION_CHECK),
    pollMs: positiveInteger(env.DISPATCHER_PREVIEW_POLL_MS, 15_000),
    remote: compactText(env.DISPATCHER_REVIEW_REMOTE, "origin"),
    route: compactText(env.DISPATCHER_REVIEW_ROUTE, DEFAULT_REVIEW_ROUTE),
    skipLinear: asBoolean(env.DISPATCHER_REVIEW_SKIP_LINEAR),
    skipVercel: asBoolean(env.DISPATCHER_REVIEW_SKIP_VERCEL),
    testMode: asBoolean(env.DISPATCHER_TEST_MODE),
    timeoutMs: positiveInteger(env.DISPATCHER_PREVIEW_TIMEOUT_MS, 900_000),
    vercelApiBase: compactText(env.VERCEL_API_BASE, "https://api.vercel.com"),
    vercelProjectId: compactText(env.VERCEL_PROJECT_ID),
    vercelTeamId: compactText(env.VERCEL_TEAM_ID),
    vercelTeamSlug: compactText(env.VERCEL_TEAM_SLUG),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = () => {
      index += 1;
      if (index >= argv.length || argv[index].startsWith("--")) {
        throw new PreviewBlockedError(`Missing value for ${arg}.`);
      }
      return argv[index];
    };

    if (arg === "--branch") options.branch = nextValue();
    else if (arg === "--issue") options.issue = nextValue();
    else if (arg === "--route") options.route = nextValue();
    else if (arg === "--remote") options.remote = nextValue();
    else if (arg === "--base") options.base = nextValue();
    else if (arg === "--timeout-ms") options.timeoutMs = positiveInteger(nextValue(), options.timeoutMs);
    else if (arg === "--poll-ms") options.pollMs = positiveInteger(nextValue(), options.pollMs);
    else if (arg === "--vercel-project-id") options.vercelProjectId = nextValue();
    else if (arg === "--vercel-team-id") options.vercelTeamId = nextValue();
    else if (arg === "--vercel-team-slug") options.vercelTeamSlug = nextValue();
    else if (arg === "--allow-empty-diff") options.allowEmptyDiff = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--test-mode") options.testMode = true;
    else if (arg === "--skip-linear") options.skipLinear = true;
    else if (arg === "--skip-vercel") options.skipVercel = true;
    else if (arg === "--no-protection-check") options.noProtectionCheck = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new PreviewBlockedError(`Unknown option ${arg}.`);
    }
  }

  return options;
}

export function normalizeRoute(route) {
  const cleanRoute = compactText(route, DEFAULT_REVIEW_ROUTE);
  return cleanRoute.startsWith("/") ? cleanRoute : `/${cleanRoute}`;
}

export function previewUrlForRoute(deploymentUrl, route = DEFAULT_REVIEW_ROUTE) {
  const cleanDeploymentUrl = compactText(deploymentUrl);
  if (!cleanDeploymentUrl) {
    throw new PreviewBlockedError("Vercel returned a deployment without a URL.");
  }
  const baseUrl = cleanDeploymentUrl.startsWith("http")
    ? cleanDeploymentUrl
    : `https://${cleanDeploymentUrl}`;
  return new URL(normalizeRoute(route), baseUrl).toString();
}

export function validateReviewBranchName(branch, env = process.env) {
  const cleanBranch = compactText(branch);
  if (!cleanBranch) {
    return { ok: false, reason: "Missing review branch name." };
  }
  if (cleanBranch.startsWith("refs/")) {
    return { ok: false, reason: "Review branch must be a short branch name, not a full ref." };
  }
  if (cleanBranch.startsWith("-")) {
    return { ok: false, reason: "Review branch cannot start with '-'." };
  }
  if (/[\s\\~^:?*[\]\x00-\x1F\x7F]/.test(cleanBranch)) {
    return { ok: false, reason: "Review branch contains characters that are unsafe for git refs." };
  }
  if (cleanBranch.includes("..") || cleanBranch.includes("@{") || cleanBranch.includes("//")) {
    return { ok: false, reason: "Review branch contains an unsafe git ref sequence." };
  }
  if (cleanBranch.endsWith("/") || cleanBranch.endsWith(".") || cleanBranch.endsWith(".lock")) {
    return { ok: false, reason: "Review branch has an unsafe git ref suffix." };
  }

  const protectedNames = new Set(["main", "master", "production", "prod"]);
  if (protectedNames.has(cleanBranch)) {
    return { ok: false, reason: `Dispatcher pushes to protected branch '${cleanBranch}' are not allowed.` };
  }
  if (/^(release|deploy|production|prod|hotfix)\//i.test(cleanBranch)) {
    return { ok: false, reason: `Dispatcher pushes to protected branch family '${cleanBranch}' are not allowed.` };
  }

  const allowlistPattern = compactText(env.DISPATCHER_REVIEW_BRANCH_ALLOWLIST, DEFAULT_REVIEW_BRANCH_PATTERN);
  let allowlist;
  try {
    allowlist = new RegExp(allowlistPattern);
  } catch (error) {
    return { ok: false, reason: `Invalid DISPATCHER_REVIEW_BRANCH_ALLOWLIST regex: ${error.message}` };
  }
  if (!allowlist.test(cleanBranch)) {
    return {
      ok: false,
      reason: `Review branch '${cleanBranch}' does not match allowlist ${allowlistPattern}.`,
    };
  }

  return { ok: true, branch: cleanBranch };
}

export function reviewPushBlockedByMode(env = process.env, options = {}) {
  const enabled = env.DISPATCHER_REVIEW_PUSH_ENABLED ?? env.DISPATCHER_REVIEW_PUSHES_ENABLED;
  if (enabled !== undefined && asFalse(enabled)) {
    return {
      blocked: true,
      reason: "Review branch pushes are disabled by DISPATCHER_REVIEW_PUSH_ENABLED.",
    };
  }
  if (asBoolean(env.DISPATCHER_REVIEW_PUSH_DISABLED) || asBoolean(env.DISPATCHER_REVIEW_PUSHES_DISABLED)) {
    return {
      blocked: true,
      reason: "Review branch pushes are disabled by DISPATCHER_REVIEW_PUSH_DISABLED.",
    };
  }
  if (options.testMode || asBoolean(env.DISPATCHER_TEST_MODE)) {
    return {
      blocked: true,
      reason: "Dispatcher test mode is active; review branch push side effects are suppressed.",
    };
  }
  if (asBoolean(env.DISPATCHER_SINGLE_WORKER_MODE) && !asBoolean(env.DISPATCHER_REVIEW_PUSH_IN_SINGLE_WORKER)) {
    return {
      blocked: true,
      reason: "Dispatcher single-worker fallback is active; review branch push side effects are suppressed.",
    };
  }
  return { blocked: false };
}

export function buildPushArgs(remote, branch) {
  return [
    "push",
    "--porcelain",
    compactText(remote, "origin"),
    `refs/heads/${branch}:refs/heads/${branch}`,
  ];
}

export function classifyDeploymentState(deployment) {
  const rawState = compactText(deployment?.readyState ?? deployment?.state ?? deployment?.status).toUpperCase();
  if (readyStates.has(rawState)) return "ready";
  if (blockedStates.has(rawState)) return "blocked";
  if (rawState) return "pending";
  return "unknown";
}

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const stdout = compactText(result.stdout);
  const stderr = compactText(result.stderr);
  if (!options.allowFailure && result.status !== 0) {
    throw new PreviewBlockedError(`git ${args.join(" ")} failed: ${stderr || stdout || `exit ${result.status}`}`);
  }
  return {
    ok: result.status === 0,
    status: result.status,
    stdout,
    stderr,
  };
}

function assertGitRefFormat(branch) {
  const result = runGit(["check-ref-format", "--branch", branch], { allowFailure: true });
  if (!result.ok) {
    throw new PreviewBlockedError(`Review branch '${branch}' is not a valid git branch name.`);
  }
}

function localBranchCommit(branch) {
  const ref = `refs/heads/${branch}`;
  const exists = runGit(["show-ref", "--verify", "--quiet", ref], { allowFailure: true });
  if (!exists.ok) {
    throw new PreviewBlockedError(`Local review branch '${branch}' does not exist.`);
  }
  return runGit(["rev-parse", "--verify", `${ref}^{commit}`]).stdout;
}

function refCommit(ref) {
  return runGit(["rev-parse", "--verify", `${ref}^{commit}`]).stdout;
}

function diffSummary(base, branch) {
  const diff = runGit(["diff", "--name-status", `${base}...refs/heads/${branch}`], { allowFailure: true });
  if (!diff.ok) {
    throw new PreviewBlockedError(`Unable to compare '${branch}' with '${base}': ${diff.stderr || diff.stdout}`);
  }
  return diff.stdout;
}

function assertBranchHasDiff(base, branch) {
  const diff = runGit(["diff", "--quiet", `${base}...refs/heads/${branch}`], { allowFailure: true });
  if (diff.status === 0) {
    throw new PreviewBlockedError(`Review branch '${branch}' has no diff from '${base}'.`);
  }
  if (diff.status !== 1) {
    throw new PreviewBlockedError(`Unable to verify branch diff: ${diff.stderr || diff.stdout}`);
  }
}

function truncateOutput(text) {
  const cleanText = compactText(text);
  if (cleanText.length <= 1_200) return cleanText;
  return `${cleanText.slice(0, 1_200)}...`;
}

async function fetchJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const bodyText = await response.text();
  let body = null;
  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = { raw: bodyText };
    }
  }
  if (!response.ok) {
    const message = body?.error?.message ?? body?.message ?? bodyText ?? response.statusText;
    throw new PreviewBlockedError(`Vercel API ${response.status} ${response.statusText}: ${message}`);
  }
  return body;
}

function vercelQuery(options, extra = {}) {
  const query = new URLSearchParams();
  query.set("limit", String(extra.limit ?? 20));
  query.set("target", "preview");
  if (options.vercelProjectId) query.set("projectId", options.vercelProjectId);
  if (options.vercelTeamId) query.set("teamId", options.vercelTeamId);
  if (options.vercelTeamSlug) query.set("slug", options.vercelTeamSlug);
  for (const [key, value] of Object.entries(extra.meta ?? {})) {
    if (value) query.set(`meta-${key}`, String(value));
  }
  return query;
}

function deploymentMatches(deployment, branch, commit) {
  const meta = deployment?.meta ?? {};
  const gitSource = deployment?.gitSource ?? {};
  const branchCandidates = [
    meta.githubCommitRef,
    meta.gitlabCommitRef,
    meta.bitbucketCommitRef,
    gitSource.ref,
    deployment?.source?.ref,
  ].filter(Boolean);
  const commitCandidates = [
    meta.githubCommitSha,
    meta.gitlabCommitSha,
    meta.bitbucketCommitSha,
    gitSource.sha,
    deployment?.source?.sha,
    deployment?.meta?.commitSha,
  ].filter(Boolean);

  return branchCandidates.includes(branch) || commitCandidates.includes(commit);
}

function newestDeployment(deployments) {
  return deployments.slice().sort((a, b) => {
    const aTime = Number(a.createdAt ?? a.created ?? 0);
    const bTime = Number(b.createdAt ?? b.created ?? 0);
    return bTime - aTime;
  })[0] ?? null;
}

async function listMatchingDeployments(options, branch, commit) {
  const token = compactText(process.env.VERCEL_TOKEN);
  if (!token) {
    throw new PreviewBlockedError("Missing VERCEL_TOKEN; cannot wait for the Vercel protected preview.");
  }

  const baseUrl = options.vercelApiBase.replace(/\/+$/, "");
  const queries = [
    vercelQuery(options, { meta: { githubCommitSha: commit }, limit: 20 }),
    vercelQuery(options, { limit: 50 }),
  ];

  for (const query of queries) {
    const data = await fetchJson(`${baseUrl}/v6/deployments?${query.toString()}`, token);
    const deployments = Array.isArray(data?.deployments) ? data.deployments : [];
    const matches = deployments.filter((deployment) => deploymentMatches(deployment, branch, commit));
    if (matches.length > 0) {
      return matches;
    }
  }

  return [];
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForVercelPreview(options, branch, commit) {
  const startedAt = Date.now();
  let lastState = "not found";

  while (Date.now() - startedAt <= options.timeoutMs) {
    const deployments = await listMatchingDeployments(options, branch, commit);
    const deployment = newestDeployment(deployments);
    if (deployment) {
      const state = classifyDeploymentState(deployment);
      const rawState = compactText(deployment.readyState ?? deployment.state ?? deployment.status, "unknown");
      lastState = rawState;
      const target = compactText(deployment.target ?? deployment.environment);
      if (/production/i.test(target)) {
        throw new PreviewBlockedError(`Matched Vercel deployment for '${branch}' is production, not preview.`);
      }
      if (state === "ready") {
        return deployment;
      }
      if (state === "blocked") {
        throw new PreviewBlockedError(`Vercel preview for '${branch}' ended with state ${rawState}.`);
      }
    }
    await wait(options.pollMs);
  }

  throw new PreviewBlockedError(`Timed out waiting for Vercel preview for '${branch}'. Last state: ${lastState}.`);
}

export async function verifyProtectedPreview(previewUrl, fetchImpl = fetch) {
  const response = await fetchImpl(previewUrl, {
    headers: {
      "User-Agent": "usam-dispatcher-review-preview/1.0",
    },
    redirect: "manual",
  });
  const location = response.headers.get("location") ?? "";

  if (response.status === 401 || response.status === 403) {
    return { ok: true, reason: `Unauthenticated request received HTTP ${response.status}.` };
  }
  if (response.status >= 300 && response.status < 400) {
    if (/vercel|login|auth|sso|signin/i.test(location)) {
      return { ok: true, reason: `Unauthenticated request redirected to ${location}.` };
    }
    return {
      ok: false,
      reason: `Unauthenticated request redirected to unexpected location '${location || "(missing)"}'.`,
    };
  }
  if (response.status === 404) {
    return { ok: false, reason: `Preview route returned HTTP 404 at ${previewUrl}.` };
  }
  return {
    ok: false,
    reason: `Unauthenticated request returned HTTP ${response.status}; expected a protection challenge or auth redirect.`,
  };
}

async function linearGraphql(query, variables) {
  const token = compactText(process.env.LINEAR_API_KEY ?? process.env.LINEAR_TOKEN);
  if (!token) {
    throw new PreviewBlockedError("Missing LINEAR_API_KEY; cannot post the protected preview URL to Linear.");
  }
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors?.length) {
    const message = body.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new PreviewBlockedError(`Linear API failed: ${message}`);
  }
  return body.data;
}

async function postLinearPreviewComment(issueIdentifier, body) {
  const issueData = await linearGraphql(
    `query DispatcherPreviewIssue($id: String!) {
      issue(id: $id) {
        id
        identifier
      }
    }`,
    { id: issueIdentifier },
  );
  const issue = issueData?.issue;
  if (!issue?.id) {
    throw new PreviewBlockedError(`Linear issue '${issueIdentifier}' was not found.`);
  }

  const commentData = await linearGraphql(
    `mutation DispatcherPreviewComment($input: CommentCreateInput!) {
      commentCreate(input: $input) {
        success
        comment {
          id
          url
        }
      }
    }`,
    {
      input: {
        issueId: issue.id,
        body,
      },
    },
  );
  if (!commentData?.commentCreate?.success) {
    throw new PreviewBlockedError(`Linear did not confirm comment creation for '${issueIdentifier}'.`);
  }
  return commentData.commentCreate.comment;
}

function buildLinearReadyComment({ branch, commit, previewUrl, route, diff, protectionReason }) {
  return `Protected preview ready for review.

Preview: [Open ${route}](${previewUrl})
Route: \`${route}\`
Branch: \`${branch}\`
Commit: \`${commit}\`

Review instructions:
1. Open the preview and sign in with an authorized admin account if prompted.
2. Confirm \`${route}\` answers what is executing, queued, in review, blocked, stale, or idle.
3. Leave founder approval on this issue before any merge or production action.

Validation:
- Non-force review branch push completed.
- Matched Vercel preview deployment for the review branch.
- Protection check: ${protectionReason}
- No merge, production deployment, DNS change, or production database mutation was performed.

Changed files from base:
\`\`\`text
${diff || "(no file summary available)"}
\`\`\``;
}

function outputResult(payload, jsonOnly = false) {
  if (jsonOnly) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  if (payload.status === PREVIEW_BLOCKED_STATUS) {
    process.stderr.write(`${PREVIEW_BLOCKED_STATUS}: ${payload.reason}\n`);
    process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${payload.status}: ${payload.previewUrl ?? payload.reason ?? "ok"}\n`);
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const startedAt = new Date().toISOString();
  const branchCheck = validateReviewBranchName(options.branch);
  if (!branchCheck.ok) {
    throw new PreviewBlockedError(branchCheck.reason, { branch: options.branch });
  }
  const branch = branchCheck.branch;
  const route = normalizeRoute(options.route);

  assertGitRefFormat(branch);
  runGit(["rev-parse", "--is-inside-work-tree"]);
  const commit = localBranchCommit(branch);
  refCommit(options.base);
  if (!options.allowEmptyDiff) {
    assertBranchHasDiff(options.base, branch);
  }
  const diff = diffSummary(options.base, branch);

  const modeBlock = reviewPushBlockedByMode(process.env, options);
  if (modeBlock.blocked) {
    throw new PreviewBlockedError(modeBlock.reason, { branch, commit });
  }

  if (options.dryRun) {
    outputResult({
      status: "dry-run",
      branch,
      base: options.base,
      commit,
      diff,
      route,
      reason: "Validated review branch safeguards; no push, Vercel wait, or Linear post was performed.",
      startedAt,
    }, options.json);
    return;
  }

  const push = runGit(buildPushArgs(options.remote, branch), { allowFailure: true });
  if (!push.ok) {
    throw new PreviewBlockedError(`GitHub push failed for '${branch}': ${truncateOutput(push.stderr || push.stdout)}`, {
      branch,
      commit,
    });
  }

  if (options.skipVercel) {
    throw new PreviewBlockedError("Vercel wait was skipped; cannot mark product-preview-ready.", { branch, commit });
  }

  const deployment = await waitForVercelPreview(options, branch, commit);
  const previewUrl = previewUrlForRoute(deployment.url, route);
  let protectionReason = "Skipped by --no-protection-check.";
  if (!options.noProtectionCheck) {
    const protection = await verifyProtectedPreview(previewUrl);
    if (!protection.ok) {
      throw new PreviewBlockedError(`Preview protection check failed: ${protection.reason}`, {
        branch,
        commit,
        previewUrl,
      });
    }
    protectionReason = protection.reason;
  }

  if (!options.issue) {
    throw new PreviewBlockedError("Missing Linear issue identifier; cannot post the protected preview URL to Linear.", {
      branch,
      commit,
      previewUrl,
    });
  }
  if (options.issue && options.skipLinear) {
    throw new PreviewBlockedError("Linear posting was skipped; cannot mark product-preview-ready.", {
      branch,
      commit,
      previewUrl,
    });
  }
  const linearComment = await postLinearPreviewComment(options.issue, buildLinearReadyComment({
    branch,
    commit,
    diff,
    previewUrl,
    protectionReason,
    route,
  }));

  outputResult({
    status: PREVIEW_READY_STATUS,
    branch,
    commit,
    deploymentId: deployment.uid ?? deployment.id ?? null,
    previewUrl,
    route,
    linearCommentUrl: linearComment?.url ?? null,
    protection: protectionReason,
    startedAt,
  }, options.json);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const reason = error instanceof PreviewBlockedError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);
    outputResult({
      status: PREVIEW_BLOCKED_STATUS,
      reason,
      details: error instanceof PreviewBlockedError ? error.details : {},
      route: DEFAULT_REVIEW_ROUTE,
    }, process.argv.includes("--json"));
    process.exitCode = 1;
  });
}
