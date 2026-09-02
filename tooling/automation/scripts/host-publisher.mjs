#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dispatcherLayout } from "../src/dispatcher-paths.mjs";
import { loadRegistry, resolveVercelProject } from "../src/repository-registry.mjs";
import {
  assertNoForbiddenVercelArgs,
  buildReviewPackageComment,
  classifyDirtyFiles,
  isProductionBranch,
  markerContentResult,
  normalizeIssueId,
  primaryRouteCheck,
  publisherLockState,
  reviewPackageStatus,
  routeChecksForManifest,
  routeVerificationResult,
  safeIssueSlug,
  staleGlobalMarkerInvalidation,
  validateReviewRoute,
} from "../src/publisher-policy.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultConfigPath = join(rootDir, "config", "dispatcher.config.json");
const configPath = process.env.DISPATCHER_CONFIG || defaultConfigPath;
const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : {};
const layout = dispatcherLayout(config, rootDir);
const dirs = layout.dirs;
const stateDir = dirs.publications;
const logDir = join(dirs.logs, "publisher");
const lockRoot = join(dirs.locks, "publishers");
const defaultScope = "ryan-foxs-projects-9a51a4d5";

// Repository and Vercel project resolve through repository-registry.json v2
// (USA-89 R2). There is deliberately NO default project: an empty duplicate
// USA-Missionaries/usam-website once existed alongside rfox0629/usam-website,
// so a bare name could target the wrong repository — and publishing to the
// wrong Vercel project is a production incident. Fail closed instead.
const registryPath = resolve(
  rootDir,
  config.repositoryRegistryPath || join("config", "repository-registry.json"),
);

function resolvePublishTarget() {
  const slug = process.env.USAM_REPOSITORY_SLUG || config.repositorySlug;
  if (!slug) {
    throw new Error(
      "No repository slug configured. Set USAM_REPOSITORY_SLUG or config.repositorySlug " +
        'to a fully qualified "owner/repo" (for example rfox0629/usam-website). ' +
        "host-publisher refuses to assume a default repository.",
    );
  }
  const registry = loadRegistry(registryPath);
  const { project } = resolveVercelProject(registry, slug);
  return { slug, project };
}

mkdirSync(stateDir, { recursive: true });
mkdirSync(logDir, { recursive: true });
mkdirSync(lockRoot, { recursive: true });

function parseArgs(argv) {
  const args = { markers: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") args.manifestPath = argv[++index];
    else if (arg === "--release-manifest") args.releaseManifestPath = argv[++index];
    else if (arg === "--issue") args.issueId = argv[++index];
    else if (arg === "--worktree") args.worktreePath = argv[++index];
    else if (arg === "--route") args.route = argv[++index];
    else if (arg === "--marker") args.markers.push(argv[++index]);
    else if (arg === "--expected-file") {
      args.changedFiles ||= [];
      args.changedFiles.push(argv[++index]);
    } else if (arg === "--estimated-review-time") args.estimatedReviewTime = argv[++index];
    else if (arg === "--decision-requested") args.decisionRequested = argv[++index];
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return [
    "Usage:",
    "  publish-preview.sh --manifest <completion-manifest.json>",
    "  publish-preview.sh --manifest <completion-manifest.json> --release-manifest config/release-manifests/usa-82.json",
    "  publish-preview.sh --issue USA-38 --worktree /path/to/worktree --route /system --marker System",
  ].join("\n");
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function logLine(issueId, event, fields = {}) {
  const line = `${JSON.stringify({ at: new Date().toISOString(), event, issueId, ...fields })}\n`;
  writeFileSync(join(logDir, `${safeIssueSlug(issueId)}.jsonl`), line, { flag: "a" });
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

function redactedArgs(args = []) {
  const safe = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = String(args[index]);
    if (arg === "--token") {
      safe.push(arg, "[redacted]");
      index += 1;
    } else if (arg.startsWith("--token=")) {
      safe.push("--token=[redacted]");
    } else {
      safe.push(redactSecrets(arg));
    }
  }
  return safe;
}

function run(command, args = [], options = {}) {
  const timeoutMs = options.timeoutMs || 120000;
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd || rootDir,
      env: {
        ...process.env,
        CI: "1",
        HOME: process.env.HOME || "/Users/ryanfox",
        NO_COLOR: "1",
        PATH: process.env.PATH || "/Users/ryanfox/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
        VERCEL_CACHE_DIR: process.env.VERCEL_CACHE_DIR || join(dirs.tmp, "vercel-cache"),
        ...options.env,
      },
      stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 3000).unref();
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({ code: 127, error, stderr, stdout, timedOut });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolvePromise({ code, signal, stderr, stdout, timedOut });
    });
    if (options.input !== undefined) {
      child.stdin.end(options.input);
    }
  });
}

function commandText(result, max = 1600) {
  const text = [result.stdout, result.stderr, result.error?.message]
    .filter(Boolean)
    .join("\n")
    .trim();
  const redacted = redactSecrets(text);
  return redacted.length > max ? redacted.slice(-max) : redacted;
}

function hasTokenLikeValue(value) {
  return typeof value === "string" && value.trim().length > 8;
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

async function mustRun(command, args, options = {}) {
  const result = await run(command, args, options);
  if (result.code !== 0 || result.timedOut) {
    const displayArgs = redactedArgs(options.displayArgs || args).join(" ");
    const error = new Error(`${command} ${displayArgs} failed${result.timedOut ? " by timeout" : ""}: ${commandText(result)}`);
    error.result = result;
    throw error;
  }
  return result.stdout.trim();
}

async function git(args, cwd, timeoutMs = 120000) {
  return mustRun("git", args, { cwd, timeoutMs });
}

async function commandExists(command) {
  const result = await run("/bin/zsh", ["-lc", `command -v ${command}`], { timeoutMs: 10000 });
  return result.code === 0;
}

async function vercelCommand() {
  if (await commandExists("vercel")) {
    return { args: [], command: "vercel" };
  }
  return { args: ["--yes", "vercel"], command: "npx" };
}

function vercelArgs(vc, args = []) {
  const tokenArgs = hasTokenLikeValue(process.env.VERCEL_TOKEN)
    ? ["--token", process.env.VERCEL_TOKEN]
    : [];
  return [...vc.args, ...args, ...tokenArgs];
}

async function removeVercelLinkGitignoreNoise(issueId, worktreePath) {
  const result = await run("git", ["diff", "--", ".gitignore"], { cwd: worktreePath, timeoutMs: 30000 });
  if (result.code !== 0 || !result.stdout.trim()) return;

  const added = [];
  const removed = [];
  for (const line of result.stdout.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) added.push(line.slice(1));
    if (line.startsWith("-")) removed.push(line.slice(1));
  }

  const vercelAddsOnly = added.length > 0
    && removed.length === 0
    && added.every((line) => line === ".vercel" || line === ".vercel/");
  if (!vercelAddsOnly) return;

  const headGitignore = await git(["show", "HEAD:.gitignore"], worktreePath, 30000);
  writeFileSync(join(worktreePath, ".gitignore"), headGitignore.endsWith("\n") ? headGitignore : `${headGitignore}\n`);
  logLine(issueId, "vercel_link_gitignore_noise_removed", { file: ".gitignore" });
}

async function githubGitCredentialConfigured(cwd) {
  const result = await run("git", ["config", "--global", "--get-all", "credential.https://github.com.helper"], {
    cwd,
    timeoutMs: 10000,
  });
  return result.code === 0 && result.stdout.includes("gh auth git-credential");
}

async function ensureGithubGitAuth(cwd) {
  await mustRun("gh", ["auth", "status"], { cwd, timeoutMs: 30000 });
  if (!(await githubGitCredentialConfigured(cwd))) {
    await mustRun("gh", ["auth", "setup-git"], { cwd, timeoutMs: 30000 });
  }
}

async function remoteBranchSha(cwd, branch) {
  const result = await run("git", ["ls-remote", "--heads", "origin", branch], { cwd, timeoutMs: 30000 });
  if (result.code !== 0 || result.timedOut) {
    return null;
  }
  return result.stdout.trim().split(/\s+/)[0] || null;
}

async function cleanRemotePublicationState(cwd, branch) {
  const [status, headSha] = await Promise.all([
    git(["status", "--short"], cwd, 30000),
    git(["rev-parse", "HEAD"], cwd, 30000),
  ]);
  const remoteSha = await remoteBranchSha(cwd, branch);
  return {
    branchAlreadyPushed: Boolean(remoteSha && remoteSha === headSha && !status.trim()),
    headSha,
    remoteSha,
    status,
  };
}

function tailForFailure(error) {
  return redactSecrets(String(error?.message || error || "")).slice(-2000);
}

function releaseManifestPathForIssue(issueId) {
  if (!issueId) return null;
  return join(rootDir, "config", "release-manifests", `${safeIssueSlug(issueId)}.json`);
}

function loadReleaseManifest(issueId, explicitPath = null) {
  const candidates = [
    explicitPath ? resolve(rootDir, explicitPath) : null,
    releaseManifestPathForIssue(issueId),
  ].filter(Boolean);

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    return {
      manifest,
      path,
    };
  }

  return null;
}

function readManifest(args) {
  const fromFile = args.manifestPath ? JSON.parse(readFileSync(args.manifestPath, "utf8")) : {};
  const issueId = normalizeIssueId(args.issueId || fromFile.issueId || fromFile.issue);
  const release = loadReleaseManifest(issueId, args.releaseManifestPath || fromFile.releaseManifestPath);
  const releaseManifest = release?.manifest || {};
  const routeInput = args.route
    || releaseManifest.requestedReviewRoute
    || releaseManifest.route
    || fromFile.requestedReviewRoute
    || fromFile.route
    || "/";
  const route = validateReviewRoute(routeInput);
  if (!route.ok) {
    throw new Error(route.reason);
  }
  const rawRouteChecks = releaseManifest.routeChecks || releaseManifest.routes || fromFile.routeChecks || fromFile.routes || [];
  const hasRouteChecks = rawRouteChecks.length > 0;
  const legacyExpectedMarkers = [...(fromFile.expectedMarkers || []), ...(args.markers || [])].filter(Boolean);
  const manifest = {
    ...fromFile,
    excludedLaunchDependencies: releaseManifest.excludedLaunchDependencies || fromFile.excludedLaunchDependencies || [],
    changedFiles: args.changedFiles || fromFile.changedFiles || [],
    decisionRequested: args.decisionRequested || fromFile.decisionRequested || "Approve this preview for the next review step, or reply with exact revisions.",
    estimatedReviewTime: args.estimatedReviewTime || fromFile.estimatedReviewTime || "8 minutes",
    expectedMarkers: hasRouteChecks ? [] : legacyExpectedMarkers,
    issueId,
    knownLimitations: fromFile.knownLimitations || ["Protected preview access may require an authorized Vercel session."],
    manifestVersion: releaseManifest.manifestVersion || fromFile.manifestVersion || null,
    primaryRouteId: releaseManifest.primaryRouteId || fromFile.primaryRouteId || null,
    releaseManifestPath: release?.path || fromFile.releaseManifestPath || null,
    route: route.route,
    routeChecks: rawRouteChecks,
    staleGlobalMarkers: releaseManifest.staleGlobalMarkers || fromFile.staleGlobalMarkers || null,
    supersedesPreviousPackage: fromFile.supersedesPreviousPackage || releaseManifest.supersedesPreviousPackage || null,
    textMatching: releaseManifest.textMatching || fromFile.textMatching || "case-sensitive",
    worktreePath: args.worktreePath || fromFile.worktree || fromFile.worktreePath,
  };
  const normalized = routeChecksForManifest({
    ...manifest,
    expectedMarkers: hasRouteChecks ? legacyExpectedMarkers : manifest.expectedMarkers,
  });
  if (!normalized.ok) {
    throw new Error(normalized.reason);
  }
  const staleInvalidation = staleGlobalMarkerInvalidation({
    ...manifest,
    expectedMarkers: legacyExpectedMarkers,
    routeChecks: normalized.routeChecks,
  });
  return {
    ...manifest,
    routeChecks: normalized.routeChecks,
    staleGlobalMarkerInvalidation: staleInvalidation,
  };
}

function pidActive(pid) {
  const value = Number(pid || 0);
  if (!Number.isInteger(value) || value <= 0) return false;
  try {
    process.kill(value, 0);
    return true;
  } catch {
    return false;
  }
}

function acquirePublisherLock(issueId, worktreePath) {
  const lockDir = join(lockRoot, safeIssueSlug(issueId));
  const infoPath = join(lockDir, "lock.json");
  if (existsSync(lockDir)) {
    let existing = null;
    try {
      existing = JSON.parse(readFileSync(infoPath, "utf8"));
    } catch {
      existing = { createdAt: null, pid: null };
    }
    const state = publisherLockState({ existing, pidActive: pidActive(existing.pid) });
    if (state.action === "block") {
      throw new Error(state.reason);
    }
    if (state.action === "archive_stale") {
      renameSync(lockDir, `${lockDir}.stale-${timestamp()}`);
    }
  }
  mkdirSync(lockDir);
  writeFileSync(infoPath, `${JSON.stringify({
    createdAt: new Date().toISOString(),
    issueId,
    pid: process.pid,
    worktreePath,
  }, null, 2)}\n`);
  return lockDir;
}

async function releasePublisherLock(lockDir) {
  if (lockDir && existsSync(lockDir)) {
    rmSync(lockDir, { recursive: true });
  }
}

async function preflight(manifest) {
  if (process.getuid?.() !== 501 && process.env.USER !== "ryanfox") {
    throw new Error(`Trusted publisher must run as ryanfox; current user is ${process.env.USER || process.getuid?.()}`);
  }
  if (!manifest.issueId) throw new Error("Missing issue identifier.");
  const reviewRoute = validateReviewRoute(manifest.route);
  if (!reviewRoute.ok) throw new Error(reviewRoute.reason);
  manifest.route = reviewRoute.route;
  if (!manifest.worktreePath || !existsSync(manifest.worktreePath)) {
    throw new Error(`Worktree does not exist: ${manifest.worktreePath || "(missing)"}`);
  }

  const top = await git(["rev-parse", "--show-toplevel"], manifest.worktreePath, 30000);
  const gitDir = await git(["rev-parse", "--git-dir"], manifest.worktreePath, 30000);
  const commonDir = await git(["rev-parse", "--git-common-dir"], manifest.worktreePath, 30000);
  const branch = await git(["branch", "--show-current"], manifest.worktreePath, 30000);
  if (isProductionBranch(branch)) throw new Error(`Refusing to publish production branch ${branch}.`);
  const publicationState = await cleanRemotePublicationState(manifest.worktreePath, branch);

  if (!publicationState.branchAlreadyPushed) {
    await mustRun("test", ["-w", gitDir], { cwd: manifest.worktreePath, timeoutMs: 10000 });
    await mustRun("test", ["-w", commonDir], { cwd: manifest.worktreePath, timeoutMs: 10000 });
    await ensureGithubGitAuth(manifest.worktreePath);
  } else {
    logLine(manifest.issueId, "git_write_preflight_skipped", {
      branch,
      commitSha: publicationState.headSha,
      reason: "clean branch already matches origin",
    });
  }
  await git(["ls-remote", "origin", "HEAD"], manifest.worktreePath, 30000);

  const vc = await vercelCommand();
  const noForbidden = assertNoForbiddenVercelArgs(["deploy", "--yes", "--scope", defaultScope]);
  if (!noForbidden.ok) throw new Error(noForbidden.reason);
  const credential = vercelCredentialState();
  if (!credential.ok) throw new Error(credential.reason);
  await mustRun(vc.command, vercelArgs(vc, ["whoami"]), { cwd: manifest.worktreePath, timeoutMs: 20000 });
  const publishTarget = resolvePublishTarget();
  await mustRun(vc.command, vercelArgs(vc, ["link", "--yes", "--project", publishTarget.project, "--scope", defaultScope]), {
    cwd: manifest.worktreePath,
    timeoutMs: 60000,
  });
  await removeVercelLinkGitignoreNoise(manifest.issueId, manifest.worktreePath);

  return { branch, commonDir, gitDir, publicationState, top, vercel: vc };
}

function validationCommands() {
  return [
    { args: ["--yes", "tsc", "--noEmit"], command: "npx", label: "npx tsc --noEmit" },
    { args: ["run", "build"], command: "npm", label: "npm run build" },
  ];
}

async function runValidation(worktreePath) {
  const results = [];
  for (const item of validationCommands()) {
    const result = await run(item.command, item.args, { cwd: worktreePath, timeoutMs: 30 * 60 * 1000 });
    const record = {
      code: result.code,
      command: item.label,
      ok: result.code === 0 && !result.timedOut,
      stderr: commandText({ stderr: result.stderr }, 1200),
      stdout: commandText({ stdout: result.stdout }, 1200),
      timedOut: result.timedOut,
    };
    results.push(record);
    if (!record.ok) {
      const error = new Error(`Validation failed: ${item.label}\n${record.stderr || record.stdout}`);
      error.validationResults = results;
      throw error;
    }
  }
  return results;
}

async function stageCommitPush(manifest, branch, publicationState = null) {
  const status = await git(["status", "--short"], manifest.worktreePath, 30000);
  const dirty = classifyDirtyFiles(status, manifest.changedFiles);
  if (dirty.unrelated.length) {
    throw new Error(`Unrelated dirty files block publishing: ${dirty.unrelated.join(", ")}`);
  }

  let commitCreated = false;
  if (dirty.intended.length) {
    await git(["add", "--", ...dirty.intended], manifest.worktreePath, 120000);
    await git(["commit", "-m", `${manifest.issueId}: publish preview package`], manifest.worktreePath, 120000);
    commitCreated = true;
  }

  const commitSha = await git(["rev-parse", "HEAD"], manifest.worktreePath, 30000);
  const alreadyPushed = publicationState?.branchAlreadyPushed
    || (await remoteBranchSha(manifest.worktreePath, branch)) === commitSha;
  if (alreadyPushed) {
    return {
      branchPushed: true,
      changedFiles: dirty.intended.length ? dirty.intended : manifest.changedFiles || [],
      commitCreated,
      commitSha,
      pushSkipped: true,
    };
  }

  await ensureGithubGitAuth(manifest.worktreePath);
  await git(["push", "-u", "origin", `HEAD:${branch}`], manifest.worktreePath, 180000);
  return {
    branchPushed: true,
    changedFiles: dirty.intended.length ? dirty.intended : manifest.changedFiles || [],
    commitCreated,
    commitSha,
    pushSkipped: false,
  };
}

function extractPreviewUrl(text) {
  const urls = [...String(text || "").matchAll(/\bhttps?:\/\/[^\s<>)\]`"']+/gi)].map((match) => match[0].replace(/[),.;\]]+$/, ""));
  return urls.find((url) => /\.vercel\.app(?:\/|$)/i.test(url)) || null;
}

function previewDeploymentBaseUrl(manifest = {}) {
  const value = manifest.deploymentUrl || manifest.previewDeploymentUrl || manifest.previewUrl;
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

async function deployPreview(worktreePath, vc) {
  const safe = assertNoForbiddenVercelArgs(["deploy", "--yes", "--scope", defaultScope]);
  if (!safe.ok) throw new Error(safe.reason);
  const result = await run(vc.command, vercelArgs(vc, ["deploy", "--yes", "--scope", defaultScope]), {
    cwd: worktreePath,
    timeoutMs: 30 * 60 * 1000,
  });
  const previewUrl = extractPreviewUrl(`${result.stdout}\n${result.stderr}`);
  if (result.code !== 0 || result.timedOut || !previewUrl) {
    throw new Error(`Vercel preview deployment failed${result.timedOut ? " by timeout" : ""}: ${commandText(result)}`);
  }
  return previewUrl;
}

async function inspectDeployment(worktreePath, vc, previewUrl) {
  const result = await run(vc.command, vercelArgs(vc, ["inspect", previewUrl, "--json", "--scope", defaultScope]), {
    cwd: worktreePath,
    timeoutMs: 120000,
  });
  if (result.code !== 0) {
    return { deploymentId: previewUrl.replace(/^https?:\/\//, "").split(".")[0], readyState: "UNKNOWN" };
  }
  try {
    const parsed = JSON.parse(result.stdout);
    return {
      deploymentId: parsed.uid || parsed.id || parsed.name || previewUrl.replace(/^https?:\/\//, "").split(".")[0],
      readyState: parsed.readyState || parsed.state || "UNKNOWN",
    };
  } catch {
    return { deploymentId: previewUrl.replace(/^https?:\/\//, "").split(".")[0], readyState: "UNKNOWN" };
  }
}

function linkedProjectId(worktreePath) {
  const projectPath = join(worktreePath, ".vercel", "project.json");
  if (!existsSync(projectPath)) {
    throw new Error("Vercel project link is missing .vercel/project.json.");
  }
  const parsed = JSON.parse(readFileSync(projectPath, "utf8"));
  if (!parsed.projectId) {
    throw new Error("Vercel project link is missing projectId.");
  }
  return parsed.projectId;
}

function automationBypassTokenFromProject(project) {
  const entries = Object.entries(project?.protectionBypass || {});
  const match = entries.find(([key, value]) => (
    hasTokenLikeValue(key) && value?.scope === "automation-bypass"
  ));
  return match?.[0] || null;
}

async function existingProjectAutomationBypass(worktreePath, vc, projectId) {
  const endpoints = [
    `/v9/projects/${encodeURIComponent(projectId)}`,
    `/v10/projects/${encodeURIComponent(projectId)}`,
  ];
  for (const endpoint of endpoints) {
    const result = await run(vc.command, vercelArgs(vc, ["api", endpoint, "--scope", defaultScope, "--raw"]), {
      cwd: worktreePath,
      timeoutMs: 120000,
    });
    if (result.code !== 0 || result.timedOut) continue;
    let parsed = null;
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      continue;
    }
    const token = automationBypassTokenFromProject(parsed);
    if (hasTokenLikeValue(token)) {
      return {
        source: "vercel_project_existing_automation_bypass",
        token,
      };
    }
  }
  return null;
}

async function getAutomationBypass(worktreePath, vc) {
  if (hasTokenLikeValue(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)) {
    return {
      source: "VERCEL_AUTOMATION_BYPASS_SECRET",
      token: process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    };
  }

  const projectId = linkedProjectId(worktreePath);
  const existing = await existingProjectAutomationBypass(worktreePath, vc, projectId);
  if (existing) return existing;

  const endpoint = `/v1/projects/${encodeURIComponent(projectId)}/protection-bypass?slug=${encodeURIComponent(defaultScope)}`;
  const result = await run(vc.command, vercelArgs(vc, ["api", endpoint, "-X", "PATCH", "--input", "-", "--raw"]), {
    cwd: worktreePath,
    input: "{}",
    timeoutMs: 120000,
  });
  if (result.code !== 0 || result.timedOut) {
    throw new Error(`Vercel automation bypass lookup failed${result.timedOut ? " by timeout" : ""}: ${commandText(result)}`);
  }

  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new Error("Vercel automation bypass lookup returned invalid JSON.");
  }

  const token = Object.keys(parsed.protectionBypass || {})
    .find((key) => parsed.protectionBypass?.[key]?.scope === "automation-bypass");
  if (!hasTokenLikeValue(token)) {
    throw new Error("Vercel automation bypass lookup did not return an automation-bypass token.");
  }
  return {
    source: "vercel_project_automation_bypass",
    token,
  };
}

function routeUrl(previewUrl, route) {
  const target = new URL(route || "/", previewUrl);
  return target.toString();
}

function shouldPostPrimaryPreview(manifest) {
  return manifest.postPrimaryPreviewImmediately !== false
    && manifest.issueId === "USA-82"
    && Boolean(manifest.primaryRouteId);
}

function buildPrimaryPreviewComment(manifest, routeResult) {
  const method = routeResult.verificationMethod === "vercel_authenticated_rendered_fetch"
    ? "Authenticated rendered preview check"
    : "Browser verification";
  return [
    `## ${manifest.issueId} Direct ${routeResult.path} Preview`,
    "",
    manifest.supersedesPreviousPackage ? `Supersedes previous package: ${manifest.supersedesPreviousPackage}` : null,
    manifest.supersedesPreviousPackage ? "" : null,
    `Preview URL: ${routeResult.target}`,
    `Verified route: \`${routeResult.path}\``,
    `Route check: ${routeResult.label || routeResult.id}`,
    "",
    `${method} passed for this direct preview route. Remaining release-matrix checks are continuing in the same publisher run.`,
  ].filter((line) => line !== null).join("\n");
}

async function postPrimaryPreviewIfNeeded(manifest, routeResult, primaryCheck) {
  if (routeResult.id !== primaryCheck?.id || !shouldPostPrimaryPreview(manifest)) {
    return null;
  }

  try {
    const commentId = await postLinearComment(manifest.issueId, buildPrimaryPreviewComment(manifest, routeResult));
    logLine(manifest.issueId, "primary_preview_url_posted", {
      commentId,
      route: routeResult.path,
      target: routeResult.target,
      verificationMethod: routeResult.verificationMethod,
    });
    return commentId;
  } catch (error) {
    logLine(manifest.issueId, "primary_preview_url_post_failed", {
      error: tailForFailure(error),
      route: routeResult.path,
      target: routeResult.target,
    });
    return null;
  }
}

async function verifyWithRenderedFetch(manifest, previewUrl, checks, primaryCheck, outDir, browserLaunchError) {
  const verifiedRoutes = [];
  let primaryPreviewCommentId = null;

  logLine(manifest.issueId, "browser_verification_unavailable_falling_back", {
    error: tailForFailure(browserLaunchError),
    method: "vercel_authenticated_rendered_fetch",
  });

  for (const check of checks.routeChecks) {
    const target = routeUrl(previewUrl, check.targetPath);
    const result = await run("npx", ["--yes", "vercel", "curl", target], {
      cwd: manifest.worktreePath,
      timeoutMs: 120000,
    });
    if (result.code !== 0 || result.timedOut) {
      throw new Error(`Rendered fetch verification failed for ${target}: ${commandText(result)}`);
    }

    const {
      missingMarkers,
      presentForbiddenMarkers,
    } = markerContentResult(result.stdout, check);
    const routeResult = routeVerificationResult({
      browserOk: true,
      httpOk: true,
      missingMarkers,
      presentForbiddenMarkers,
    });
    if (!routeResult.ok) {
      throw new Error(`Rendered fetch verification failed for ${target}: ${routeResult.failures.join("; ")}`);
    }

    const safeCheckId = check.id.replace(/[^a-z0-9-]/g, "-");
    const renderedAsset = join(outDir, `${safeCheckId}.html`);
    writeFileSync(renderedAsset, result.stdout);
    const verified = {
      directPreviewPath: check.directPreviewPath || null,
      host: check.host,
      id: check.id,
      label: check.label,
      path: check.path,
      renderedAsset,
      rendersExperience: check.rendersExperience,
      safeResolution: check.safeResolution,
      target,
      targetPath: check.targetPath,
      verificationMethod: "vercel_authenticated_rendered_fetch",
    };
    verifiedRoutes.push(verified);
    logLine(manifest.issueId, "route_verified", {
      host: check.host,
      id: check.id,
      method: "vercel_authenticated_rendered_fetch",
      path: check.path,
      target,
    });

    if (!primaryPreviewCommentId) {
      primaryPreviewCommentId = await postPrimaryPreviewIfNeeded(manifest, verified, primaryCheck);
    }
  }

  const primary = verifiedRoutes.find((check) => check.id === primaryCheck?.id) || verifiedRoutes[0];
  return {
    browserFallbackReason: tailForFailure(browserLaunchError),
    desktopRenderedAsset: primary.renderedAsset,
    desktopScreenshot: primary.renderedAsset,
    mobileRenderedAsset: primary.renderedAsset,
    mobileScreenshot: primary.renderedAsset,
    primaryPreviewCommentId,
    status: 200,
    target: primary.target,
    verificationMethod: "vercel_authenticated_rendered_fetch",
    verifiedRoutes,
  };
}

async function scopeVerificationHeaders(page, previewUrl, verificationHeaders = {}) {
  if (!Object.keys(verificationHeaders).length) return;
  const previewOrigin = new URL(previewUrl).origin;
  await page.route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (requestUrl.origin === previewOrigin) {
      await route.continue({
        headers: {
          ...request.headers(),
          ...verificationHeaders,
        },
      });
      return;
    }
    await route.continue();
  });
}

async function verifyInBrowser(manifest, previewUrl, verificationHeaders = {}) {
  const { chromium } = await import("playwright");
  const checks = routeChecksForManifest(manifest);
  if (!checks.ok) {
    throw new Error(checks.reason);
  }
  const primaryCheck = primaryRouteCheck(checks.routeChecks, manifest);
  const outDir = join(stateDir, `${safeIssueSlug(manifest.issueId)}-${timestamp()}`);
  mkdirSync(outDir, { recursive: true });
  const verifiedRoutes = [];
  let primaryPreviewCommentId = null;

  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    return verifyWithRenderedFetch(manifest, previewUrl, checks, primaryCheck, outDir, error);
  }
  try {
    for (const check of checks.routeChecks) {
      const target = routeUrl(previewUrl, check.targetPath);
      const consoleErrors = [];
      const pageErrors = [];
      const safeCheckId = check.id.replace(/[^a-z0-9-]/g, "-");

      const desktop = await browser.newPage({ viewport: { height: 1000, width: 1440 } });
      await scopeVerificationHeaders(desktop, previewUrl, verificationHeaders);
      desktop.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      desktop.on("pageerror", (error) => pageErrors.push(error.message));
      const response = await desktop.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 });
      await desktop.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      const body = await desktop.locator("body").innerText({ timeout: 30000 }).catch(() => "");
      const {
        missingMarkers,
        presentForbiddenMarkers,
      } = markerContentResult(body, check);
      const desktopScreenshot = join(outDir, `${safeCheckId}-desktop.png`);
      await desktop.screenshot({ fullPage: true, path: desktopScreenshot });

      const mobile = await browser.newPage({ isMobile: true, viewport: { height: 844, width: 390 } });
      await scopeVerificationHeaders(mobile, previewUrl, verificationHeaders);
      mobile.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      mobile.on("pageerror", (error) => pageErrors.push(error.message));
      const mobileResponse = await mobile.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 });
      await mobile.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      const mobileScreenshot = join(outDir, `${safeCheckId}-mobile.png`);
      await mobile.screenshot({ fullPage: true, path: mobileScreenshot });
      await desktop.close();
      await mobile.close();

      const result = routeVerificationResult({
        browserOk: Boolean(response?.ok() && mobileResponse?.ok()),
        consoleErrors,
        httpOk: Boolean(response?.ok() && mobileResponse?.ok()),
        missingMarkers,
        pageErrors,
        presentForbiddenMarkers,
      });
      if (!result.ok) {
        throw new Error(`Browser verification failed for ${target}: ${result.failures.join("; ")}`);
      }

      verifiedRoutes.push({
        desktopScreenshot,
        directPreviewPath: check.directPreviewPath || null,
        host: check.host,
        id: check.id,
        label: check.label,
        mobileScreenshot,
        path: check.path,
        rendersExperience: check.rendersExperience,
        safeResolution: check.safeResolution,
        status: response.status(),
        target,
        targetPath: check.targetPath,
        verificationMethod: "browser",
      });

      logLine(manifest.issueId, "route_verified", {
        host: check.host,
        id: check.id,
        path: check.path,
        target,
      });

      if (!primaryPreviewCommentId) {
        primaryPreviewCommentId = await postPrimaryPreviewIfNeeded(manifest, verifiedRoutes.at(-1), primaryCheck);
      }
    }

    const primary = verifiedRoutes.find((check) => check.id === primaryCheck?.id) || verifiedRoutes[0];
    return {
      desktopScreenshot: primary.desktopScreenshot,
      mobileScreenshot: primary.mobileScreenshot,
      status: primary.status,
      target: primary.target,
      primaryPreviewCommentId,
      verificationMethod: "browser",
      verifiedRoutes,
    };
  } finally {
    await browser.close();
  }
}

async function linearIssueId(identifier) {
  const query = `
query PublisherIssue($identifier: String!) {
  issue(id: $identifier) { id identifier }
}`;
  const response = await fetch("https://api.linear.app/graphql", {
    body: JSON.stringify({ query, variables: { identifier } }),
    headers: {
      Authorization: process.env.LINEAR_API_KEY,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length || !payload.data?.issue?.id) {
    throw new Error(payload.errors?.map((item) => item.message).join("; ") || `Linear issue lookup failed for ${identifier}`);
  }
  return payload.data.issue.id;
}

async function postLinearComment(identifier, body) {
  if (!process.env.LINEAR_API_KEY) {
    throw new Error("LINEAR_API_KEY is not configured for review-package posting.");
  }
  const issueId = await linearIssueId(identifier);
  const mutation = `
mutation PublisherComment($input: CommentCreateInput!) {
  commentCreate(input: $input) { success comment { id } }
}`;
  const response = await fetch("https://api.linear.app/graphql", {
    body: JSON.stringify({ query: mutation, variables: { input: { body, issueId } } }),
    headers: {
      Authorization: process.env.LINEAR_API_KEY,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length || !payload.data?.commentCreate?.success) {
    throw new Error(payload.errors?.map((item) => item.message).join("; ") || "Linear comment post failed");
  }
  return payload.data.commentCreate.comment.id;
}

async function main() {
  loadDotEnv(join(rootDir, ".env"));
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const manifest = readManifest(args);
  let lockDir = null;
  let publication = null;
  try {
    lockDir = acquirePublisherLock(manifest.issueId, manifest.worktreePath);
    logLine(manifest.issueId, "publisher_started", { worktreePath: manifest.worktreePath });
    const pre = await preflight(manifest);
    const validationResults = await runValidation(manifest.worktreePath);
    const gitResult = await stageCommitPush(manifest, pre.branch, pre.publicationState);
    const existingPreviewUrl = previewDeploymentBaseUrl(manifest);
    const previewUrl = existingPreviewUrl || await deployPreview(manifest.worktreePath, pre.vercel);
    if (existingPreviewUrl) {
      logLine(manifest.issueId, "existing_preview_reused", { previewUrl });
    }
    const deployment = await inspectDeployment(manifest.worktreePath, pre.vercel, previewUrl);
    const bypass = await getAutomationBypass(manifest.worktreePath, pre.vercel);
    const verification = await verifyInBrowser(manifest, previewUrl, {
      "x-vercel-protection-bypass": bypass.token,
      "x-vercel-set-bypass-cookie": "samesitenone",
    });
    publication = {
      branch: pre.branch,
      changedFiles: gitResult.changedFiles,
      commitCreated: gitResult.commitCreated,
      commitSha: gitResult.commitSha,
      deploymentId: deployment.deploymentId,
      deploymentUrl: previewUrl,
      browserFallbackReason: verification.browserFallbackReason || null,
      desktopRenderedAsset: verification.desktopRenderedAsset || null,
      desktopScreenshot: verification.desktopScreenshot,
      estimatedReviewTime: manifest.estimatedReviewTime,
      issueId: manifest.issueId,
      knownLimitations: manifest.knownLimitations,
      mobileScreenshot: verification.mobileScreenshot,
      mobileRenderedAsset: verification.mobileRenderedAsset || null,
      primaryPreviewCommentId: verification.primaryPreviewCommentId,
      previewUrl: verification.target,
      protectionBypass: {
        source: bypass.source,
        type: "vercel_automation_bypass",
        usedForBrowserVerification: true,
      },
      pushSkipped: gitResult.pushSkipped,
      readyState: deployment.readyState,
      releaseManifestPath: manifest.releaseManifestPath,
      routeCheckCount: verification.verifiedRoutes.length,
      route: manifest.route,
      staleGlobalMarkerInvalidation: manifest.staleGlobalMarkerInvalidation,
      targetUrl: verification.target,
      validationResults,
      verificationMethod: verification.verificationMethod,
      verifiedRoutes: verification.verifiedRoutes,
      worktreePath: manifest.worktreePath,
      decisionRequested: manifest.decisionRequested,
      supersedesPreviousPackage: manifest.supersedesPreviousPackage,
      publishedAt: new Date().toISOString(),
    };
    const packageStatus = reviewPackageStatus(publication);
    if (!packageStatus.complete) {
      throw new Error(`Publication manifest missing required fields: ${packageStatus.missing.join(", ")}`);
    }
    const outPath = join(stateDir, `${safeIssueSlug(manifest.issueId)}-${timestamp()}.json`);
    publication.manifestPath = outPath;
    writeFileSync(outPath, `${JSON.stringify(publication, null, 2)}\n`);
    const commentId = await postLinearComment(manifest.issueId, buildReviewPackageComment(publication));
    publication.linearCommentId = commentId;
    writeFileSync(outPath, `${JSON.stringify(publication, null, 2)}\n`);
    logLine(manifest.issueId, "publisher_completed", { deploymentUrl: previewUrl, manifestPath: outPath });
    console.log(JSON.stringify({ ok: true, publication }, null, 2));
  } catch (error) {
    const failure = {
      at: new Date().toISOString(),
      error: tailForFailure(error),
      issueId: manifest.issueId,
      publication,
      worktreePath: manifest.worktreePath,
    };
    const outPath = join(stateDir, `${safeIssueSlug(manifest.issueId)}-${timestamp()}.failed.json`);
    writeFileSync(outPath, `${JSON.stringify(failure, null, 2)}\n`);
    logLine(manifest.issueId || "unknown", "publisher_failed", { error: failure.error, manifestPath: outPath });
    console.error(JSON.stringify({ failure, ok: false }, null, 2));
    process.exitCode = 1;
  } finally {
    await releasePublisherLock(lockDir);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
