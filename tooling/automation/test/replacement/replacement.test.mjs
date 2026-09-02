/**
 * USA-97 minimal automation replacement — test suite.
 *
 * No production Linear, GitHub, Vercel, Supabase, or runtime access.
 * No production secrets. Fixtures, mocks, and temporary directories only.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { AutomationError, ERROR_CODES } from "../../src/replacement/shared/errors.mjs";
import {
  createRepositoryWriterLockStore,
  detectManualRepositoryProcesses,
} from "../../src/repository-writer-lock.mjs";
import { DEFAULT_CONFIG, loadConfig, validateConfig, createMutationGuard } from "../../src/replacement/shared/config.mjs";
import { LinearReadClient, loadLinearShadowData } from "../../src/replacement/shared/linear-client.mjs";
import { createLogger, redact, REDACTED } from "../../src/replacement/shared/logging.mjs";
import {
  CLAUDE_BRIDGE_COMMENT_FIRST,
  CLAUDE_BRIDGE_FOLLOW_UP_MARKER,
  CLAUDE_BRIDGE_MARKER,
  CLAUDE_FOLLOW_UP_STATES,
  PRODUCTION_CLAUDE_TIMEOUT_MS,
  VALIDATION_CLAUDE_TIMEOUT_MS,
  buildClaudeCodeArgs,
  buildClaudeBridgePrompt,
  ensureClaudeBridgeBranch,
  findClaudeBridgeCandidates,
  resolveClaudeBridgeBranch,
  resolveIssueRepositoryPath,
  runClaudeBridge,
  runClaudeBridgeDaemonPass,
  selectUnhandledClaudeMention,
} from "../../src/replacement/claude-bridge/index.mjs";
import {
  classifyEligibility,
  hasAcceptanceCriteria,
  resolveApplicationRepository,
  labelsInGroup,
  planBranchName,
} from "../../src/replacement/launcher/eligibility.mjs";
import { planLaunch, runLauncher, detectFounderRevision, buildClaimComment, CLAIM_MARKER, REVISION_MARKER } from "../../src/replacement/launcher/index.mjs";
import { buildReviewPacket, buildDigest, renderDigest, runDigest } from "../../src/replacement/digest/index.mjs";
import { assertInsideAllowlist, classifyWorktree, runJanitor } from "../../src/replacement/janitor/index.mjs";
import { preflight, interpretResult, runBackup, BACKUP_STATUS } from "../../src/replacement/backup/index.mjs";

// ----------------------------------------------------------------- fixtures
const cfg = validateConfig({
  ...DEFAULT_CONFIG,
  worktrees: { allowlistRoots: ["/tmp/usam-wt"], protectedPaths: ["/Users/ryanfox/Code", "/Users/ryanfox/USAM-Automation"] },
});

const registry = {
  schemaVersion: 2,
  applications: [
    {
      application: "USAM Website / DOS / Kitchen Table Gospel",
      githubOwner: "rfox0629", repository: "usam-website", slug: "rfox0629/usam-website",
      defaultBranch: "main", visibility: "public", vercelProject: "usam-website",
      supabaseProject: "usam-website", linearApplication: ["USAM Website", "DOS", "Kitchen Table Gospel", "Infrastructure", "Automation"],
      runtimePath: "/tmp/x", status: "active-production",
    },
    {
      application: "DOS (legacy)",
      githubOwner: "USA-Missionaries", repository: "dos-platform", slug: "USA-Missionaries/dos-platform",
      defaultBranch: "main", visibility: "private", vercelProject: null,
      supabaseProject: "dos-platform", linearApplication: ["DOS"],
      runtimePath: "/tmp/y", status: "legacy-reference",
    },
    {
      application: "Automation",
      githubOwner: "rfox0629", repository: "usam-automation", slug: "rfox0629/usam-automation",
      defaultBranch: "preservation/initial-20260727", visibility: "private", vercelProject: null,
      supabaseProject: null, linearApplication: [],
      sourcePath: "/tmp/x/tooling/automation", runtimePath: "/tmp/x/tooling/automation", status: "archived",
    },
    {
      application: "Stewardship Capital",
      githubOwner: "rfox0629", repository: "stewardship.capital", slug: "rfox0629/stewardship.capital",
      defaultBranch: "main", visibility: "public", vercelProject: "stewardship.capital",
      supabaseProject: null, linearApplication: ["Stewardship Capital"],
      runtimePath: "/tmp/stewardship.capital", status: "active",
    },
  ],
};

const issue = (over = {}) => ({
  id: "USA-200",
  title: "Do a thing",
  description: "## Acceptance criteria\n\n* it works",
  state: { name: "Ready" },
  labels: [
    { name: "DOS", parent: { name: "Application" } },
    { name: "Claude", parent: { name: "Runner" } },
  ],
  ...over,
});

function createMemoryClaudeBridgeStateStore({ paused = false, active = null } = {}) {
  let state = {};
  let activeTask = active;
  return {
    isPaused: () => paused,
    readActive: () => activeTask,
    writeActive: (next) => {
      activeTask = next;
      return activeTask;
    },
    clearActive: () => {
      activeTask = null;
    },
    readState: () => state,
    writeState: (patch) => {
      state = { ...state, ...patch };
      return state;
    },
  };
}

function createTempRepositoryWriterLockStore({ processList = [] } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "repo-writer-locks-"));
  const livePids = new Set();
  const processInfoByPid = new Map();
  const events = [];
  const store = createRepositoryWriterLockStore({
    lockRoot: path.join(root, "locks"),
    logger: (event, fields) => events.push({ event, fields }),
    pidExists: (pid) => livePids.has(Number(pid)),
    processInfo: (pid) => processInfoByPid.get(Number(pid)) || null,
    processList,
  });
  return {
    events,
    livePids,
    processInfoByPid,
    root,
    store,
  };
}

function registerProcess(fixture, { command, cwd, pid, ppid = 1 }) {
  fixture.livePids.add(pid);
  fixture.processInfoByPid.set(pid, { command, cwd, pid, ppid });
}

function acquireWriter(store, over = {}) {
  return store.acquire({
    branch: over.branch || "usa/test",
    command: over.command || `${over.runner || "claude"} -p`,
    cwd: over.cwd || over.repositoryPath || "/tmp/save-website",
    issueId: over.issueId || "USA-1",
    owner: "dispatcher",
    pendingLaunch: over.pendingLaunch ?? false,
    pid: over.pid || 101,
    repositoryPath: over.repositoryPath || "/tmp/save-website",
    runner: over.runner || "claude",
    startedAt: over.startedAt || new Date().toISOString(),
  });
}

const noopClaudeBranchManager = async ({ branch, cwd }) => ({ action: "test_noop", branch, cwd });

function runGitForTest(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_EMAIL: "replacement-test@usa.local",
      GIT_AUTHOR_NAME: "USAM Replacement Test",
      GIT_COMMITTER_EMAIL: "replacement-test@usa.local",
      GIT_COMMITTER_NAME: "USAM Replacement Test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

// ------------------------------------------------------------ config schema
test("config: dry-run is the default posture", () => {
  assert.equal(DEFAULT_CONFIG.dryRun, true);
});

test("config: malformed JSON fails closed", () => {
  const d = mkdtempSync(path.join(tmpdir(), "cfg-"));
  const p = path.join(d, "c.json");
  writeFileSync(p, "{not json");
  assert.throws(() => loadConfig(p), (e) => e.code === ERROR_CODES.CONFIG_MALFORMED);
});

test("config: missing file fails closed", () => {
  assert.throws(() => loadConfig("/nonexistent/c.json"), (e) => e.code === ERROR_CODES.CONFIG_MISSING);
});

test("config: empty allowlist is rejected — janitor must never run unbounded", () => {
  assert.throws(
    () => validateConfig({ ...DEFAULT_CONFIG, worktrees: { allowlistRoots: [], protectedPaths: [] } }),
    (e) => e.code === ERROR_CODES.CONFIG_INVALID_FIELD,
  );
});

test("config: relative allowlist root is rejected", () => {
  assert.throws(
    () => validateConfig({ ...DEFAULT_CONFIG, worktrees: { allowlistRoots: ["relative/path"], protectedPaths: [] } }),
    (e) => e.code === ERROR_CODES.CONFIG_INVALID_FIELD,
  );
});

test("config: non-positive WIP limit is rejected", () => {
  assert.throws(
    () => validateConfig({ ...DEFAULT_CONFIG, limits: { perRunnerWip: 0, founderReviewCap: 7 } }),
    (e) => e.code === ERROR_CODES.CONFIG_INVALID_FIELD,
  );
});

// ------------------------------------------------ repository writer locks
test("repository writer guard: first writer acquires the repository lock", () => {
  const fixture = createTempRepositoryWriterLockStore();
  registerProcess(fixture, { pid: 101, command: "claude -p", cwd: "/tmp/save-website" });

  const acquired = acquireWriter(fixture.store, { pid: 101, repositoryPath: "/tmp/save-website", runner: "claude" });

  assert.equal(acquired.acquired, true);
  assert.equal(acquired.lock.repositoryPath, "/tmp/save-website");
  assert.equal(acquired.lock.issueId, "USA-1");
});

test("repository writer guard: second Claude job waits on the same repository", () => {
  const fixture = createTempRepositoryWriterLockStore();
  registerProcess(fixture, { pid: 101, command: "claude -p", cwd: "/tmp/save-website" });
  registerProcess(fixture, { pid: 202, command: "claude -p", cwd: "/tmp/save-website" });

  acquireWriter(fixture.store, { issueId: "USA-1", pid: 101, repositoryPath: "/tmp/save-website", runner: "claude" });
  const second = acquireWriter(fixture.store, { issueId: "USA-2", pid: 202, repositoryPath: "/tmp/save-website", runner: "claude" });

  assert.equal(second.acquired, false);
  assert.equal(second.code, ERROR_CODES.REPOSITORY_WRITER_ACTIVE);
  assert.equal(second.occupant.issueId, "USA-1");
});

test("repository writer guard: Codex waits when Claude owns the same repository", () => {
  const fixture = createTempRepositoryWriterLockStore();
  registerProcess(fixture, { pid: 101, command: "claude -p", cwd: "/tmp/save-website" });
  registerProcess(fixture, { pid: 202, command: "codex --cd /tmp/save-website", cwd: "/tmp/save-website" });

  acquireWriter(fixture.store, { issueId: "USA-1", pid: 101, repositoryPath: "/tmp/save-website", runner: "claude" });
  const second = acquireWriter(fixture.store, { issueId: "USA-2", pid: 202, repositoryPath: "/tmp/save-website", runner: "codex" });

  assert.equal(second.acquired, false);
  assert.equal(second.occupant.runner, "claude");
});

test("repository writer guard: Claude waits when Codex owns the same repository", () => {
  const fixture = createTempRepositoryWriterLockStore();
  registerProcess(fixture, { pid: 101, command: "codex --cd /tmp/save-website", cwd: "/tmp/save-website" });
  registerProcess(fixture, { pid: 202, command: "claude -p", cwd: "/tmp/save-website" });

  acquireWriter(fixture.store, { issueId: "USA-1", pid: 101, repositoryPath: "/tmp/save-website", runner: "codex" });
  const second = acquireWriter(fixture.store, { issueId: "USA-2", pid: 202, repositoryPath: "/tmp/save-website", runner: "claude" });

  assert.equal(second.acquired, false);
  assert.equal(second.occupant.runner, "codex");
});

test("repository writer guard: different repositories may execute concurrently", () => {
  const fixture = createTempRepositoryWriterLockStore();
  registerProcess(fixture, { pid: 101, command: "claude -p", cwd: "/tmp/save-website" });
  registerProcess(fixture, { pid: 202, command: "codex --cd /tmp/usam-website", cwd: "/tmp/usam-website" });

  const first = acquireWriter(fixture.store, { pid: 101, repositoryPath: "/tmp/save-website", runner: "claude" });
  const second = acquireWriter(fixture.store, { pid: 202, repositoryPath: "/tmp/usam-website", runner: "codex" });

  assert.equal(first.acquired, true);
  assert.equal(second.acquired, true);
  assert.notEqual(first.lockPath, second.lockPath);
});

test("repository writer guard: normal completion releases the lock", () => {
  const fixture = createTempRepositoryWriterLockStore();
  registerProcess(fixture, { pid: 101, command: "claude -p", cwd: "/tmp/save-website" });
  registerProcess(fixture, { pid: 202, command: "claude -p", cwd: "/tmp/save-website" });

  const first = acquireWriter(fixture.store, { pid: 101, repositoryPath: "/tmp/save-website", runner: "claude" });
  assert.equal(fixture.store.release(first), true);
  const second = acquireWriter(fixture.store, { issueId: "USA-2", pid: 202, repositoryPath: "/tmp/save-website", runner: "claude" });

  assert.equal(second.acquired, true);
});

test("repository writer guard: failure releases the lock", async () => {
  const fixture = createTempRepositoryWriterLockStore();
  registerProcess(fixture, { pid: 101, command: "claude -p", cwd: "/tmp/save-website" });
  registerProcess(fixture, { pid: 202, command: "codex --cd /tmp/save-website", cwd: "/tmp/save-website" });

  await assert.rejects(
    () => fixture.store.withLock(
      { branch: "usa/fail", cwd: "/tmp/save-website", issueId: "USA-1", pid: 101, repositoryPath: "/tmp/save-website", runner: "claude" },
      async () => {
        throw new Error("simulated failure");
      },
    ),
    /simulated failure/,
  );
  const second = acquireWriter(fixture.store, { issueId: "USA-2", pid: 202, repositoryPath: "/tmp/save-website", runner: "codex" });

  assert.equal(second.acquired, true);
});

test("repository writer guard: stale PID locks are recovered", () => {
  const fixture = createTempRepositoryWriterLockStore();
  registerProcess(fixture, { pid: 101, command: "claude -p", cwd: "/tmp/save-website" });

  const first = acquireWriter(fixture.store, { pid: 101, repositoryPath: "/tmp/save-website", runner: "claude" });
  assert.equal(first.acquired, true);
  fixture.livePids.delete(101);
  registerProcess(fixture, { pid: 202, command: "codex --cd /tmp/save-website", cwd: "/tmp/save-website" });

  const recovered = acquireWriter(fixture.store, { issueId: "USA-2", pid: 202, repositoryPath: "/tmp/save-website", runner: "codex" });

  assert.equal(recovered.acquired, true);
  assert.equal(fixture.events.some((entry) => entry.event === "repository_writer_stale_lock_removed"), true);
});

test("repository writer guard: unknown manual processes are reported but not killed", () => {
  const reported = detectManualRepositoryProcesses("/tmp/save-website", {
    currentPid: 999,
    processes: [
      { pid: 301, ppid: 1, command: "npm run dev", cwd: "/tmp/save-website" },
      { pid: 302, ppid: 1, command: "node /tmp/save-website/node_modules/.bin/next dev", cwd: "/tmp/save-website" },
    ],
  });

  assert.equal(reported.length, 2);
  assert.equal(reported[0].likelyOwnership, "development_server");
});

test("repository writer guard: restarted dispatcher respects valid existing locks", () => {
  const fixture = createTempRepositoryWriterLockStore();
  registerProcess(fixture, { pid: 101, command: "claude -p", cwd: "/tmp/save-website" });
  registerProcess(fixture, { pid: 202, command: "codex --cd /tmp/save-website", cwd: "/tmp/save-website" });

  const first = acquireWriter(fixture.store, { pid: 101, repositoryPath: "/tmp/save-website", runner: "claude" });
  assert.equal(first.acquired, true);

  const restartedStore = createRepositoryWriterLockStore({
    lockRoot: path.join(fixture.root, "locks"),
    pidExists: (pid) => fixture.livePids.has(Number(pid)),
    processInfo: (pid) => fixture.processInfoByPid.get(Number(pid)) || null,
    processList: [],
  });
  const second = acquireWriter(restartedStore, { issueId: "USA-2", pid: 202, repositoryPath: "/tmp/save-website", runner: "codex" });

  assert.equal(second.acquired, false);
  assert.equal(second.occupant.issueId, "USA-1");
});

// ----------------------------------------------------------- Linear shadow
test("linear shadow: missing API key fails closed", async () => {
  const client = new LinearReadClient({ apiKey: "", apiUrl: "https://linear.test/graphql", teamKey: "USA", fetchImpl: async () => ({}) });
  await assert.rejects(() => client.listTeamIssues(), (e) => e.code === ERROR_CODES.LINEAR_AUTH_MISSING);
});

test("linear shadow: maps labels, Ready issues, and queue context", async () => {
  const payload = {
    data: {
      issues: {
        nodes: [
          {
            id: "uuid-1", identifier: "USA-200", title: "Ready", description: "Acceptance criteria",
            branchName: "ryan/usa-200-ready", createdAt: "T", updatedAt: "T",
            state: { name: "Ready", type: "unstarted" },
            labels: { nodes: [{ name: "DOS", parent: { name: "Application" } }, { name: "Codex", parent: { name: "Runner" } }] },
          },
          {
            id: "uuid-2", identifier: "USA-201", title: "Active", description: "",
            branchName: null, createdAt: "T", updatedAt: "T",
            state: { name: "In Progress", type: "started" },
            labels: { nodes: [{ name: "Codex", parent: { name: "Runner" } }] },
          },
          {
            id: "uuid-3", identifier: "USA-202", title: "Review", description: "",
            branchName: null, createdAt: "T", updatedAt: "T",
            state: { name: "Founder Review", type: "started" },
            labels: { nodes: [] },
          },
        ],
      },
    },
  };
  const client = new LinearReadClient({
    apiKey: "test",
    apiUrl: "https://linear.test/graphql",
    teamKey: "USA",
    fetchImpl: async () => ({ ok: true, json: async () => payload }),
  });
  const shadow = await loadLinearShadowData({ config: cfg, client });
  assert.equal(shadow.readyIssues.length, 1);
  assert.equal(shadow.readyIssues[0].id, "USA-200");
  assert.equal(shadow.readyIssues[0].identifier, "USA-200");
  assert.equal(shadow.readyIssues[0].linearId, "uuid-1");
  assert.deepEqual(shadow.readyIssues[0].labels[0], { name: "DOS", parent: { name: "Application" } });
  assert.equal(shadow.context.founderReviewCount, 1);
  assert.equal(shadow.context.inFlightByRunner.Codex, 1);
});

// --------------------------------------------------------- Claude bridge
test("claude bridge: selects unhandled plain-text @Claude comment", () => {
  const selected = selectUnhandledClaudeMention([
    { id: "c1", body: "ordinary comment", createdAt: "2026-07-01T10:00:00Z" },
    { id: "c2", body: "@Claude please validate", createdAt: "2026-07-01T11:00:00Z" },
  ]);
  assert.equal(selected.id, "c2");
});

test("claude bridge: does not relaunch an already handled mention", () => {
  const selected = selectUnhandledClaudeMention([
    { id: "c2", body: "@Claude please validate", createdAt: "2026-07-01T11:00:00Z" },
    { id: "c3", body: `${CLAUDE_BRIDGE_MARKER} source-comment:c2\nhandled`, createdAt: "2026-07-01T11:05:00Z" },
  ]);
  assert.equal(selected.code, ERROR_CODES.CLAUDE_ALREADY_HANDLED);
});

test("claude bridge: processes multiple unhandled follow-ups in queue order", () => {
  const selected = selectUnhandledClaudeMention([
    { id: "old-edit", body: "@Claude earlier completed trigger", createdAt: "2026-07-01T10:00:00Z" },
    { id: "old-result", body: `${CLAUDE_BRIDGE_MARKER} source-comment:old-edit\nhandled`, createdAt: "2026-07-01T10:05:00Z" },
    { id: "first-follow-up", body: "@Claude NEW FOUNDER EDIT — first queued item", createdAt: "2026-07-01T10:10:00Z" },
    { id: "second-follow-up", body: "@Claude NEW FOUNDER EDIT — second queued item", createdAt: "2026-07-01T10:20:00Z" },
  ]);
  assert.equal(selected.id, "first-follow-up");
});

test("claude bridge: initial pickup uses the newest fresh @Claude trigger", () => {
  const selected = selectUnhandledClaudeMention([
    { id: "older-direction", body: "@Claude detailed founder direction", createdAt: "2026-08-22T04:16:22.238Z" },
    { id: "fresh-start", body: "@Claude START NOW", createdAt: "2026-08-22T04:19:57.579Z" },
  ]);
  assert.equal(selected.id, "fresh-start");
});

test("claude bridge: active scans look past the running source comment", () => {
  const selected = selectUnhandledClaudeMention(
    [
      { id: "active-edit", body: "@Claude continue current work", createdAt: "2026-07-01T10:00:00Z" },
      { id: "first-follow-up", body: "@Claude NEW FOUNDER EDIT — first queued item", createdAt: "2026-07-01T10:10:00Z" },
      { id: "second-follow-up", body: "@Claude NEW FOUNDER EDIT — second queued item", createdAt: "2026-07-01T10:20:00Z" },
    ],
    { afterSourceCommentId: "active-edit", excludeSourceCommentIds: ["active-edit"] },
  );
  assert.equal(selected.id, "first-follow-up");
});

test("claude bridge: resolves automation labels through the website source checkout", () => {
  const r = resolveIssueRepositoryPath({
    issue: issue({ labels: [{ name: "Infrastructure", parent: { name: "Application" } }] }),
    registry,
  });
  assert.equal(r.repository, "rfox0629/usam-website");
  assert.equal(r.localPath, "/tmp/x");
});

test("claude bridge: prompt carries issue context without requiring copy/paste", () => {
  const p = buildClaudeBridgePrompt({
    issue: {
      ...issue({ identifier: "USA-133", url: "https://linear.test/USA-133" }),
      comments: [{ id: "c1", body: "prior context", createdAt: "2026-07-01T10:00:00Z", user: { name: "Ryan" } }],
    },
    mention: { id: "c2", body: "@Claude start authorized work", createdAt: "2026-07-01T11:00:00Z" },
    repository: { application: "SAVE", repository: "rfox0629/save-website", localPath: "/tmp/save-website", branch: "ryan/usa-133" },
    now: "T",
  });
  assert.match(p, /USAM Claude production-work bridge/);
  assert.match(p, /USA-133/);
  assert.match(p, /prior context/);
  assert.match(p, /rfox0629\/save-website/);
  assert.match(p, /\/tmp\/save-website/);
  assert.match(p, /Target branch: ryan\/usa-133/);
  assert.match(p, /controlled bridge validation request/);
  assert.doesNotMatch(p, /USA-98 Claude lane automatic-launch validation/);
  assert.doesNotMatch(p, /platform validation only/i);
  assert.doesNotMatch(p, /Do not edit files/i);
  assert.doesNotMatch(p, /Confirm no files were edited/i);
});

test("claude bridge: Claude Code launch args are not validation-only", () => {
  const args = buildClaudeCodeArgs();
  assert.deepEqual(args.slice(0, 4), ["-p", "--permission-mode", "bypassPermissions", "--output-format"]);
  assert.equal(args.includes("--allowedTools"), false);
  assert.equal(args.includes("--dangerously-skip-permissions"), false);
  assert.equal(args.some((arg) => String(arg).includes("git status --short --branch")), false);
});

test("claude bridge: Linear git branch name overrides registry default", () => {
  assert.equal(
    resolveClaudeBridgeBranch({
      issue: { gitBranchName: "ryan/usa-151-guided-journeys" },
      repository: { defaultBranch: "main" },
    }),
    "ryan/usa-151-guided-journeys",
  );
});

test("claude bridge: creates a new issue branch while preserving tracked edits", () => {
  const root = mkdtempSync(path.join(tmpdir(), "claude-bridge-branch-"));
  try {
    const repo = path.join(root, "repo");
    runGitForTest(root, ["init", "-b", "main", repo]);
    writeFileSync(path.join(repo, "README.md"), "initial\n");
    runGitForTest(repo, ["add", "README.md"]);
    runGitForTest(repo, ["commit", "-m", "Initial commit"]);
    writeFileSync(path.join(repo, "README.md"), "preserved tracked edit\n");

    const result = ensureClaudeBridgeBranch({ cwd: repo, branch: "ryan/usa-151-guided-journeys" });

    assert.equal(result.action, "created_with_tracked_changes");
    assert.equal(runGitForTest(repo, ["branch", "--show-current"]), "ryan/usa-151-guided-journeys");
    assert.match(runGitForTest(repo, ["status", "--short", "--untracked-files=no"]), /M README\.md/);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("claude bridge: production timeout is 30 minutes while validation stays explicit", async () => {
  const timeoutValues = [];
  const repositoryWriterLocks = createTempRepositoryWriterLockStore().store;
  const bridgeIssue = issue({
    id: "USA-310",
    identifier: "USA-310",
    linearId: "uuid-310",
    labels: [{ name: "Infrastructure", parent: { name: "Application" } }],
    comments: [{ id: "c310", body: "@Claude validate", createdAt: "2026-07-01T10:00:00Z" }],
    url: "https://linear.test/USA-310",
  });
  const linear = {
    getIssueWithComments: async () => bridgeIssue,
    setState: async () => {},
    createComment: async () => {},
  };

  await runClaudeBridge({
    branchManager: noopClaudeBranchManager,
    config: { ...cfg, dryRun: false },
    issueIdentifier: "USA-310",
    registry,
    linear,
    repositoryWriterLocks,
    runner: async ({ timeoutMs, cwd }) => {
      timeoutValues.push(timeoutMs);
      return { ok: true, stdout: "production timeout", stderr: "", cwd };
    },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
  });

  await runClaudeBridge({
    branchManager: noopClaudeBranchManager,
    config: { ...cfg, dryRun: false },
    issueIdentifier: "USA-310",
    registry,
    linear,
    repositoryWriterLocks,
    timeoutMs: VALIDATION_CLAUDE_TIMEOUT_MS,
    runner: async ({ timeoutMs, cwd }) => {
      timeoutValues.push(timeoutMs);
      return { ok: true, stdout: "validation timeout", stderr: "", cwd };
    },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
  });

  assert.deepEqual(timeoutValues, [PRODUCTION_CLAUDE_TIMEOUT_MS, VALIDATION_CLAUDE_TIMEOUT_MS]);
  assert.equal(PRODUCTION_CLAUDE_TIMEOUT_MS, 30 * 60 * 1000);
});

test("DRY-RUN: claude bridge records intended state, runner, and comment mutations only", async () => {
  let mutated = 0;
  const res = await runClaudeBridge({
    config: { ...cfg, dryRun: true },
    issueIdentifier: "USA-98",
    registry,
    linear: {
      getIssueWithComments: async () => ({
        ...issue({
          id: "USA-98",
          identifier: "USA-98",
          linearId: "uuid-98",
          labels: [{ name: "Infrastructure", parent: { name: "Application" } }],
          comments: [{ id: "c1", body: "@Claude validate", createdAt: "2026-07-01T10:00:00Z", user: { name: "Ryan" } }],
          url: "https://linear.test/USA-98",
        }),
      }),
      setState: async () => mutated++,
      createComment: async () => mutated++,
    },
    runner: async () => {
      mutated++;
      return { ok: true, stdout: "should not run in dry-run", stderr: "", cwd: "/tmp/x" };
    },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
  });
  assert.equal(mutated, 0);
  assert.equal(res.ok, true);
  assert.equal(res.plannedMutations.map((m) => m.type).join(","), "git,state,runner,comment");
});

test("LIVE: claude bridge launches injected runner, posts result, and updates finish state", async () => {
  const calls = [];
  const repositoryWriterLocks = createTempRepositoryWriterLockStore().store;
  const res = await runClaudeBridge({
    branchManager: noopClaudeBranchManager,
    config: { ...cfg, dryRun: false },
    finishStateName: "Founder Review",
    issueIdentifier: "USA-98",
    registry,
    linear: {
      getIssueWithComments: async () => ({
        ...issue({
          id: "USA-98",
          identifier: "USA-98",
          linearId: "uuid-98",
          labels: [{ name: "Infrastructure", parent: { name: "Application" } }],
          comments: [{ id: "c1", body: "@Claude validate", createdAt: "2026-07-01T10:00:00Z", user: { name: "Ryan" } }],
          url: "https://linear.test/USA-98",
        }),
      }),
      setState: async (_issueId, state) => calls.push(["state", state]),
      createComment: async (_issueId, body) => calls.push(["comment", body]),
    },
    repositoryWriterLocks,
    runner: async ({ prompt, cwd }) => {
      calls.push(["runner", cwd, prompt.includes("USA-98")]);
      return { ok: true, stdout: "Claude validation output", stderr: "", cwd };
    },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
  });
  assert.equal(res.ok, true);
  assert.deepEqual(calls[0], ["state", "In Progress"]);
  assert.deepEqual(calls[1], ["runner", "/tmp/x", true]);
  assert.equal(calls[2][0], "comment");
  assert.match(calls[2][1], /Claude validation output/);
  assert.deepEqual(calls[3], ["state", "Founder Review"]);
});

test("claude bridge: occupied repository posts queued hold without launching Claude", async () => {
  const calls = [];
  const fixture = createTempRepositoryWriterLockStore();
  registerProcess(fixture, { pid: 777, command: "claude -p", cwd: "/tmp/x" });
  const owner = acquireWriter(fixture.store, {
    issueId: "USA-900",
    pid: 777,
    repositoryPath: "/tmp/x",
    runner: "claude",
  });
  const res = await runClaudeBridge({
    config: { ...cfg, dryRun: false },
    issueIdentifier: "USA-98",
    registry,
    linear: {
      getIssueWithComments: async () => ({
        ...issue({
          id: "USA-98",
          identifier: "USA-98",
          linearId: "uuid-98",
          labels: [{ name: "Infrastructure", parent: { name: "Application" } }],
          comments: [{ id: "c1", body: "@Claude validate", createdAt: "2026-07-01T10:00:00Z", user: { name: "Ryan" } }],
          url: "https://linear.test/USA-98",
        }),
      }),
      setState: async (_issueId, state) => calls.push(["state", state]),
      createComment: async (_issueId, body) => calls.push(["comment", body]),
    },
    repositoryWriterLocks: fixture.store,
    runner: async () => assert.fail("Claude must not launch while repository writer lock is occupied"),
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
  });

  assert.equal(res.held, true);
  assert.equal(res.code, ERROR_CODES.REPOSITORY_WRITER_ACTIVE);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "comment");
  assert.match(calls[0][1], /Repository writer guard queued/);
  assert.match(calls[0][1], /USA-900/);
  assert.doesNotMatch(calls[0][1], /source-comment:c1/);
  fixture.store.release(owner);
});

test("claude bridge daemon: selects only eligible Claude requests", () => {
  const eligible = issue({
    id: "USA-310",
    identifier: "USA-310",
    linearId: "uuid-310",
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments: [{ id: "c310", body: "@Claude validate the bridge", createdAt: "2026-07-01T10:00:00Z" }],
  });
  const malformed = issue({
    id: "USA-311",
    identifier: "USA-311",
    linearId: "uuid-311",
    labels: [{ name: "Claude", parent: { name: "Runner" } }],
    comments: [{ id: "c311", body: "@Claude missing app", createdAt: "2026-07-01T10:01:00Z" }],
  });
  const scan = findClaudeBridgeCandidates({ config: cfg, issues: [malformed, eligible], registry });
  assert.equal(scan.candidates.length, 1);
  assert.equal(scan.candidates[0].issue.identifier, "USA-310");
  assert.equal(scan.refused.some((item) => item.issueId === "USA-311" && item.code === ERROR_CODES.APPLICATION_MISSING), true);
});

test("LIVE: claude bridge daemon pass launches one eligible issue and records success", async () => {
  const calls = [];
  const repositoryWriterLocks = createTempRepositoryWriterLockStore().store;
  const bridgeIssue = issue({
    id: "USA-310",
    identifier: "USA-310",
    linearId: "uuid-310",
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments: [{ id: "c310", body: "@Claude validate", createdAt: "2026-07-01T10:00:00Z", user: { name: "Ryan" } }],
    url: "https://linear.test/USA-310",
  });
  const stateStore = createMemoryClaudeBridgeStateStore();
  let listArgs = null;
  const res = await runClaudeBridgeDaemonPass({
    branchManager: noopClaudeBranchManager,
    config: { ...cfg, dryRun: false },
    finishStateName: "Founder Review",
    registry,
    stateStore,
    linear: {
      listIssuesWithRecentComments: async (args) => {
        listArgs = args;
        return [bridgeIssue];
      },
      getIssueWithComments: async () => bridgeIssue,
      setState: async (_issueId, state) => calls.push(["state", state]),
      createComment: async (_issueId, body) => calls.push(["comment", body]),
    },
    repositoryWriterLocks,
    runner: async ({ prompt, cwd }) => {
      calls.push(["runner", cwd, prompt.includes("USA-310")]);
      return { ok: true, stdout: "daemon validation output", stderr: "", cwd };
    },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
    now: (() => {
      const times = ["T0", "T1", "T2", "T3"];
      return () => times.shift() ?? "Tn";
    })(),
  });
  assert.equal(res.ok, true);
  assert.equal(listArgs.commentFirst, CLAUDE_BRIDGE_COMMENT_FIRST);
  assert.equal(calls[0][0], "comment");
  assert.match(calls[0][1], /Claude follow-up detected/);
  assert.match(calls[0][1], /Status: active/);
  assert.deepEqual(calls[1], ["state", "In Progress"]);
  assert.deepEqual(calls[2], ["runner", "/tmp/x", true]);
  assert.equal(calls[3][0], "comment");
  assert.match(calls[3][1], /daemon validation output/);
  assert.match(calls[3][1], /Follow-up state: completed/);
  assert.deepEqual(calls[4], ["state", "Founder Review"]);
  assert.equal(stateStore.readState().activeTask, null);
  assert.equal(stateStore.readState().lastSuccess.issueId, "USA-310");
  assert.equal(stateStore.readState().followUps[0].status, CLAUDE_FOLLOW_UP_STATES.COMPLETED);
});

test("claude bridge daemon: active Claude run queues a newer founder edit and acknowledges it", async () => {
  const comments = [
    { id: "old-active", body: "@Claude continue current work", createdAt: "2026-07-01T10:00:00Z", user: { name: "Ryan" } },
    { id: "new-edit", body: "@Claude NEW FOUNDER EDIT — follow-up", createdAt: "2026-07-01T10:05:00Z", user: { name: "Ryan" } },
  ];
  const bridgeIssue = issue({
    id: "USA-320",
    identifier: "USA-320",
    linearId: "uuid-320",
    state: { name: "In Progress" },
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments,
    url: "https://linear.test/USA-320",
  });
  const calls = [];
  const stateStore = createMemoryClaudeBridgeStateStore({
    active: {
      branch: "ryan/usa-320",
      issueId: "USA-320",
      pid: process.pid,
      repository: "rfox0629/usam-website",
      sourceCommentId: "old-active",
      startedAt: "T-active",
    },
  });

  const res = await runClaudeBridgeDaemonPass({
    branchManager: noopClaudeBranchManager,
    config: { ...cfg, dryRun: false },
    registry,
    stateStore,
    linear: {
      listIssuesWithRecentComments: async () => [bridgeIssue],
      createComment: async (_issueId, body) => {
        calls.push(["comment", body]);
        comments.unshift({ id: "ack-new-edit", body, createdAt: "2026-07-01T10:06:00Z", user: { name: "Bridge" } });
        return { success: true, comment: { id: "ack-new-edit" } };
      },
    },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
    runner: async () => assert.fail("active bridge must not launch a duplicate Claude process"),
    now: () => "T-queue",
  });

  assert.equal(res.ok, true);
  assert.equal(res.queuedFollowUps.length, 1);
  assert.equal(res.queuedFollowUps[0].sourceCommentId, "new-edit");
  assert.equal(res.queuedFollowUps[0].status, CLAUDE_FOLLOW_UP_STATES.QUEUED);
  assert.equal(stateStore.readState().queueDepth, 1);
  assert.equal(stateStore.readState().followUps[0].status, CLAUDE_FOLLOW_UP_STATES.QUEUED);
  assert.equal(calls.length, 1);
  assert.match(calls[0][1], new RegExp(`${CLAUDE_BRIDGE_FOLLOW_UP_MARKER} source-comment:new-edit`));
  assert.match(calls[0][1], /Status: queued_follow_up/);
  assert.match(calls[0][1], /Queue position: 1/);
});

test("claude bridge daemon: idle bridge queues founder edit when repository writer lock is held", async () => {
  const comments = [
    { id: "locked-edit", body: "@Claude NEW FOUNDER EDIT — follow-up", createdAt: "2026-07-01T10:05:00Z", user: { name: "Ryan" } },
  ];
  const bridgeIssue = issue({
    id: "USA-324",
    identifier: "USA-324",
    linearId: "uuid-324",
    state: { name: "In Progress" },
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments,
    url: "https://linear.test/USA-324",
  });
  const fixture = createTempRepositoryWriterLockStore();
  registerProcess(fixture, { pid: 777, command: "claude -p", cwd: "/tmp/x" });
  const owner = acquireWriter(fixture.store, {
    issueId: "USA-900",
    pid: 777,
    repositoryPath: "/tmp/x",
    runner: "claude",
  });
  const calls = [];
  const stateStore = createMemoryClaudeBridgeStateStore();

  const res = await runClaudeBridgeDaemonPass({
    branchManager: noopClaudeBranchManager,
    config: { ...cfg, dryRun: false },
    registry,
    stateStore,
    linear: {
      listIssuesWithRecentComments: async () => [bridgeIssue],
      getIssueWithComments: async () => bridgeIssue,
      setState: async (_issueId, state) => calls.push(["state", state]),
      createComment: async (_issueId, body) => {
        calls.push(["comment", body]);
        return { success: true, comment: { id: `comment-${calls.length}` } };
      },
    },
    repositoryWriterLocks: fixture.store,
    runner: async () => assert.fail("locked repository must queue instead of launching Claude"),
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
    now: (() => {
      const times = ["T-start", "T-held"];
      return () => times.shift() ?? "Tn";
    })(),
  });

  assert.equal(res.held, true);
  assert.equal(res.code, ERROR_CODES.REPOSITORY_WRITER_ACTIVE);
  assert.equal(calls.length, 2);
  assert.match(calls[0][1], /Repository writer guard queued/);
  assert.match(calls[1][1], new RegExp(`${CLAUDE_BRIDGE_FOLLOW_UP_MARKER} source-comment:locked-edit`));
  assert.match(calls[1][1], /Status: queued_follow_up/);
  assert.match(calls[1][1], /Queue position: 1/);
  assert.equal(stateStore.readState().activeTask, null);
  assert.equal(stateStore.readState().followUps[0].status, CLAUDE_FOLLOW_UP_STATES.QUEUED);
  assert.equal(stateStore.readState().followUps[0].sourceCommentId, "locked-edit");
  fixture.store.release(owner);
});

test("claude bridge daemon: queued follow-up positions include previously detected records", async () => {
  const comments = [
    { id: "first-edit", body: "@Claude NEW FOUNDER EDIT — first queued item", createdAt: "2026-07-01T10:10:00Z", user: { name: "Ryan" } },
    { id: "second-edit", body: "@Claude NEW FOUNDER EDIT — second queued item", createdAt: "2026-07-01T10:20:00Z", user: { name: "Ryan" } },
  ];
  const bridgeIssue = issue({
    id: "USA-326",
    identifier: "USA-326",
    linearId: "uuid-326",
    state: { name: "In Progress" },
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments,
    url: "https://linear.test/USA-326",
  });
  const fixture = createTempRepositoryWriterLockStore();
  registerProcess(fixture, { pid: 778, command: "claude -p", cwd: "/tmp/x" });
  const owner = acquireWriter(fixture.store, {
    issueId: "USA-900",
    pid: 778,
    repositoryPath: "/tmp/x",
    runner: "claude",
  });
  const stateStore = createMemoryClaudeBridgeStateStore();
  stateStore.writeState({
    followUps: [
      {
        branch: "ryan/usa-326",
        detectedAt: "T-detected",
        issueId: "USA-326",
        queuePosition: 1,
        repository: "rfox0629/usam-website",
        repositoryPath: "/tmp/x",
        sourceCommentCreatedAt: "2026-07-01T10:20:00Z",
        sourceCommentId: "second-edit",
        status: CLAUDE_FOLLOW_UP_STATES.QUEUED,
        updatedAt: "T-detected",
      },
    ],
  });

  const res = await runClaudeBridgeDaemonPass({
    branchManager: noopClaudeBranchManager,
    config: { ...cfg, dryRun: false },
    registry,
    stateStore,
    linear: {
      listIssuesWithRecentComments: async () => [bridgeIssue],
      getIssueWithComments: async () => bridgeIssue,
      setState: async () => assert.fail("locked repository must not mutate issue state"),
      createComment: async () => ({ success: true, comment: { id: "ack-first" } }),
    },
    repositoryWriterLocks: fixture.store,
    runner: async () => assert.fail("locked repository must queue instead of launching Claude"),
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
    now: (() => {
      const times = ["T-start", "T-held"];
      return () => times.shift() ?? "Tn";
    })(),
  });

  assert.equal(res.held, true);
  const bySource = new Map(stateStore.readState().followUps.map((record) => [record.sourceCommentId, record]));
  assert.equal(bySource.get("first-edit").queuePosition, 1);
  assert.equal(bySource.get("second-edit").queuePosition, 2);
  fixture.store.release(owner);
});

test("claude bridge daemon: queued follow-up starts automatically after active run exits", async () => {
  const comments = [
    { id: "ack-new-edit", body: `${CLAUDE_BRIDGE_FOLLOW_UP_MARKER} source-comment:new-edit status:queued_follow_up`, createdAt: "2026-07-01T10:06:00Z" },
    { id: "new-edit", body: "@Claude NEW FOUNDER EDIT — follow-up", createdAt: "2026-07-01T10:05:00Z", user: { name: "Ryan" } },
    { id: "old-result", body: `${CLAUDE_BRIDGE_MARKER} source-comment:old-active\nhandled`, createdAt: "2026-07-01T10:04:00Z" },
    { id: "old-active", body: "@Claude continue current work", createdAt: "2026-07-01T10:00:00Z", user: { name: "Ryan" } },
  ];
  const bridgeIssue = issue({
    id: "USA-321",
    identifier: "USA-321",
    linearId: "uuid-321",
    state: { name: "In Progress" },
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments,
    url: "https://linear.test/USA-321",
  });
  const calls = [];
  const stateStore = createMemoryClaudeBridgeStateStore({
    active: {
      branch: "ryan/usa-321",
      issueId: "USA-321",
      pid: 99999999,
      repository: "rfox0629/usam-website",
      sourceCommentId: "old-active",
      startedAt: "T-old",
    },
  });

  const res = await runClaudeBridgeDaemonPass({
    branchManager: noopClaudeBranchManager,
    config: { ...cfg, dryRun: false },
    registry,
    stateStore,
    linear: {
      listIssuesWithRecentComments: async () => [bridgeIssue],
      getIssueWithComments: async () => bridgeIssue,
      setState: async (_issueId, state) => calls.push(["state", state]),
      createComment: async (_issueId, body) => {
        calls.push(["comment", body]);
        comments.unshift({ id: `comment-${calls.length}`, body, createdAt: "2026-07-01T10:07:00Z" });
        return { success: true, comment: { id: `comment-${calls.length}` } };
      },
    },
    repositoryWriterLocks: createTempRepositoryWriterLockStore().store,
    runner: async ({ prompt, cwd }) => {
      calls.push(["runner", cwd, prompt.includes("@Claude NEW FOUNDER EDIT")]);
      return { ok: true, stdout: "follow-up completed", stderr: "", cwd };
    },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
    now: (() => {
      const times = ["T-start", "T-finish"];
      return () => times.shift() ?? "Tn";
    })(),
  });

  assert.equal(res.ok, true);
  assert.deepEqual(calls[0], ["state", "In Progress"]);
  assert.deepEqual(calls[1], ["runner", "/tmp/x", true]);
  assert.equal(calls.filter((call) => call[0] === "comment" && String(call[1]).includes("Claude follow-up detected")).length, 0);
  assert.match(calls.find((call) => call[0] === "comment")?.[1], /source-comment:new-edit/);
  assert.equal(stateStore.readState().followUps[0].status, CLAUDE_FOLLOW_UP_STATES.COMPLETED);
  assert.equal(stateStore.readState().followUps[0].sourceCommentId, "new-edit");
});

test("claude bridge daemon: idle In Progress follow-up starts the newest unhandled trigger", async () => {
  const comments = [
    { id: "new-edit", body: "@Claude NEW FOUNDER EDIT — newest", createdAt: "2026-07-01T10:10:00Z", user: { name: "Ryan" } },
    { id: "old-result", body: `${CLAUDE_BRIDGE_MARKER} source-comment:old-edit\nhandled`, createdAt: "2026-07-01T10:05:00Z" },
    { id: "old-edit", body: "@Claude older handled trigger", createdAt: "2026-07-01T10:00:00Z", user: { name: "Ryan" } },
  ];
  const bridgeIssue = issue({
    id: "USA-322",
    identifier: "USA-322",
    linearId: "uuid-322",
    state: { name: "In Progress" },
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments,
    url: "https://linear.test/USA-322",
  });
  const calls = [];
  const stateStore = createMemoryClaudeBridgeStateStore();

  const res = await runClaudeBridgeDaemonPass({
    branchManager: noopClaudeBranchManager,
    config: { ...cfg, dryRun: false },
    registry,
    stateStore,
    linear: {
      listIssuesWithRecentComments: async () => [bridgeIssue],
      getIssueWithComments: async () => bridgeIssue,
      setState: async (_issueId, state) => calls.push(["state", state]),
      createComment: async (_issueId, body) => {
        calls.push(["comment", body]);
        return { success: true, comment: { id: `comment-${calls.length}` } };
      },
    },
    repositoryWriterLocks: createTempRepositoryWriterLockStore().store,
    runner: async ({ prompt, cwd }) => {
      calls.push(["runner", cwd, prompt.includes("newest") && !prompt.includes("older handled trigger\n\nIssue description")]);
      return { ok: true, stdout: "idle follow-up completed", stderr: "", cwd };
    },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
  });

  assert.equal(res.ok, true);
  assert.equal(calls.some((call) => call[0] === "runner" && call[2] === true), true);
  assert.match(calls[0][1], /Status: active/);
  assert.equal(stateStore.readState().lastSuccess.sourceCommentId, "new-edit");
});

test("claude bridge daemon: completed source comment does not relaunch and newer trigger is not hidden", () => {
  const issueWithNewer = issue({
    id: "USA-323",
    identifier: "USA-323",
    state: { name: "In Progress" },
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments: [
      { id: "new-edit", body: "@Claude NEW FOUNDER EDIT — newest", createdAt: "2026-07-01T10:10:00Z" },
      { id: "old-result", body: `${CLAUDE_BRIDGE_MARKER} source-comment:old-edit\nhandled`, createdAt: "2026-07-01T10:05:00Z" },
      { id: "old-edit", body: "@Claude older handled trigger", createdAt: "2026-07-01T10:00:00Z" },
    ],
  });
  const scan = findClaudeBridgeCandidates({ config: cfg, issues: [issueWithNewer], registry });
  assert.equal(scan.candidates.length, 1);
  assert.equal(scan.candidates[0].mention.id, "new-edit");

  const completed = {
    ...issueWithNewer,
    comments: [
      { id: "new-result", body: `${CLAUDE_BRIDGE_MARKER} source-comment:new-edit\nhandled`, createdAt: "2026-07-01T10:15:00Z" },
      ...issueWithNewer.comments,
    ],
  };
  const completedScan = findClaudeBridgeCandidates({ config: cfg, issues: [completed], registry });
  assert.equal(completedScan.candidates.length, 0);
  assert.equal(completedScan.refused[0].code, ERROR_CODES.CLAUDE_ALREADY_HANDLED);
});

test("claude bridge daemon: Done issue with canonical founder edit is eligible", () => {
  const doneIssueWithFounderEdit = issue({
    id: "USA-327",
    identifier: "USA-327",
    state: { name: "Done" },
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments: [
      { id: "new-edit", body: "@Claude NEW FOUNDER EDIT — reopen from Done", createdAt: "2026-07-01T10:10:00Z" },
      { id: "old-result", body: `${CLAUDE_BRIDGE_MARKER} source-comment:old-edit\nhandled`, createdAt: "2026-07-01T10:05:00Z" },
      { id: "old-edit", body: "@Claude older handled trigger", createdAt: "2026-07-01T10:00:00Z" },
    ],
  });
  const scan = findClaudeBridgeCandidates({ config: cfg, issues: [doneIssueWithFounderEdit], registry });
  assert.equal(scan.candidates.length, 1);
  assert.equal(scan.candidates[0].mention.id, "new-edit");
});

test("claude bridge daemon: Done issue with noncanonical mention remains terminal", () => {
  const doneIssueWithNoncanonicalMention = issue({
    id: "USA-328",
    identifier: "USA-328",
    state: { name: "Done" },
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments: [
      { id: "new-edit", body: "@Claude please look again", createdAt: "2026-07-01T10:10:00Z" },
    ],
  });
  const scan = findClaudeBridgeCandidates({ config: cfg, issues: [doneIssueWithNoncanonicalMention], registry });
  assert.equal(scan.candidates.length, 0);
  assert.equal(scan.refused[0].code, ERROR_CODES.ISSUE_TERMINAL);
});

test("claude bridge daemon: Ready Stewardship issue accepts Success criteria and canonical Claude labels", () => {
  const stewardshipIssue = issue({
    id: "USA-184",
    identifier: "USA-184",
    labels: [
      { name: "Stewardship Capital", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
      { name: "Ready for Dispatcher", parent: null },
      { name: "Ready for Claude", parent: null },
    ],
    description: "## Success criteria\n\n- Spark branding is implemented.\n",
    comments: [{ id: "fresh-claude", body: "@Claude START NOW.", createdAt: "2026-08-22T04:19:57.579Z" }],
  });
  const scan = findClaudeBridgeCandidates({ config: cfg, issues: [stewardshipIssue], registry });
  assert.equal(scan.candidates.length, 1);
  assert.equal(scan.candidates[0].issue.identifier, "USA-184");
  assert.equal(scan.candidates[0].repository.repository, "rfox0629/stewardship.capital");
  assert.equal(scan.candidates[0].repository.localPath, "/tmp/stewardship.capital");
  assert.equal(scan.candidates[0].mention.id, "fresh-claude");
});

test("claude bridge daemon: idle Done follow-up starts canonical founder edit", async () => {
  const comments = [
    { id: "new-edit", body: "@Claude NEW FOUNDER EDIT — terminal follow-up", createdAt: "2026-07-01T10:10:00Z", user: { name: "Ryan" } },
    { id: "old-result", body: `${CLAUDE_BRIDGE_MARKER} source-comment:old-edit\nhandled`, createdAt: "2026-07-01T10:05:00Z" },
    { id: "old-edit", body: "@Claude older handled trigger", createdAt: "2026-07-01T10:00:00Z", user: { name: "Ryan" } },
  ];
  const bridgeIssue = issue({
    id: "USA-329",
    identifier: "USA-329",
    linearId: "uuid-329",
    state: { name: "Done" },
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments,
    url: "https://linear.test/USA-329",
  });
  const calls = [];
  const stateStore = createMemoryClaudeBridgeStateStore();

  const res = await runClaudeBridgeDaemonPass({
    branchManager: noopClaudeBranchManager,
    config: { ...cfg, dryRun: false },
    registry,
    stateStore,
    linear: {
      listIssuesWithRecentComments: async () => [bridgeIssue],
      getIssueWithComments: async () => bridgeIssue,
      setState: async (_issueId, state) => calls.push(["state", state]),
      createComment: async (_issueId, body) => {
        calls.push(["comment", body]);
        return { success: true, comment: { id: `comment-${calls.length}` } };
      },
    },
    repositoryWriterLocks: createTempRepositoryWriterLockStore().store,
    runner: async ({ prompt, cwd }) => {
      calls.push(["runner", cwd, prompt.includes("terminal follow-up")]);
      return { ok: true, stdout: "done follow-up completed", stderr: "", cwd };
    },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
  });

  assert.equal(res.ok, true);
  assert.deepEqual(calls.find((call) => call[0] === "state"), ["state", "In Progress"]);
  assert.equal(calls.some((call) => call[0] === "runner" && call[2] === true), true);
  assert.match(calls[0][1], /Status: active/);
  assert.equal(stateStore.readState().lastSuccess.sourceCommentId, "new-edit");
});

test("claude bridge daemon: result marker reconciles tracked follow-up to completed", async () => {
  const bridgeIssue = issue({
    id: "USA-325",
    identifier: "USA-325",
    linearId: "uuid-325",
    state: { name: "Founder Review" },
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments: [
      {
        id: "done-result",
        body: `${CLAUDE_BRIDGE_MARKER} source-comment:done-edit\n## Claude lane bridge result`,
        createdAt: "2026-07-01T10:10:00Z",
      },
      { id: "done-edit", body: "@Claude NEW FOUNDER EDIT — done", createdAt: "2026-07-01T10:00:00Z", user: { name: "Ryan" } },
    ],
    url: "https://linear.test/USA-325",
  });
  const stateStore = createMemoryClaudeBridgeStateStore();
  stateStore.writeState({
    followUps: [
      {
        acknowledgementCommentId: "ack-done-edit",
        branch: "ryan/usa-325",
        issueId: "USA-325",
        queuePosition: 0,
        repository: "rfox0629/usam-website",
        repositoryPath: "/tmp/x",
        sourceCommentId: "done-edit",
        status: CLAUDE_FOLLOW_UP_STATES.ACTIVE,
        updatedAt: "2026-07-01T10:01:00Z",
      },
    ],
    lastFailure: {
      at: "2026-07-01T09:00:00Z",
      code: "LINEAR_AUTH_MISSING",
      message: "stale failure",
      stage: "linear_read",
    },
  });

  const res = await runClaudeBridgeDaemonPass({
    branchManager: noopClaudeBranchManager,
    config: { ...cfg, dryRun: false },
    registry,
    stateStore,
    linear: {
      listIssuesWithRecentComments: async () => [bridgeIssue],
      getIssueWithComments: async () => assert.fail("handled result marker should not refetch issue for launch"),
      createComment: async () => assert.fail("completed reconciliation should not post a new comment"),
    },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
    runner: async () => assert.fail("completed trigger must not relaunch"),
    now: () => "T-reconcile",
  });

  assert.equal(res.ok, true);
  assert.equal(res.launched, false);
  const [followUp] = stateStore.readState().followUps;
  assert.equal(followUp.sourceCommentId, "done-edit");
  assert.equal(followUp.status, CLAUDE_FOLLOW_UP_STATES.COMPLETED);
  assert.equal(followUp.resultCommentId, "done-result");
  assert.equal(followUp.acknowledgementCommentId, "ack-done-edit");
  assert.equal(followUp.queuePosition, null);
  assert.equal(stateStore.readState().lastFailure, null);
});

test("claude bridge daemon: temporary Linear read failure records failure and mutates nothing", async () => {
  const stateStore = createMemoryClaudeBridgeStateStore();
  const res = await runClaudeBridgeDaemonPass({
    config: { ...cfg, dryRun: false },
    registry,
    stateStore,
    linear: {
      listIssuesWithRecentComments: async () => {
        throw new AutomationError(ERROR_CODES.LINEAR_QUERY_FAILED, "temporary Linear outage");
      },
    },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
    runner: async () => assert.fail("runner must not be called when Linear read fails"),
    now: () => "T0",
  });
  assert.equal(res.ok, false);
  assert.equal(res.code, ERROR_CODES.LINEAR_QUERY_FAILED);
  assert.equal(stateStore.readState().lastFailure.stage, "linear_read");
  assert.equal(stateStore.readState().activeTask, null);
});

test("claude bridge daemon: missing repository mapping is refused without launch", async () => {
  const stateStore = createMemoryClaudeBridgeStateStore();
  const res = await runClaudeBridgeDaemonPass({
    config: { ...cfg, dryRun: false },
    registry,
    stateStore,
    linear: {
      listIssuesWithRecentComments: async () => [
        issue({
          id: "USA-312",
          identifier: "USA-312",
          linearId: "uuid-312",
          labels: [
            { name: "Unknown Application", parent: { name: "Application" } },
            { name: "Claude", parent: { name: "Runner" } },
          ],
          comments: [{ id: "c312", body: "@Claude validate", createdAt: "2026-07-01T10:00:00Z" }],
        }),
      ],
      getIssueWithComments: async () => assert.fail("issue should not be fetched when repository mapping is missing"),
    },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
    runner: async () => assert.fail("runner must not be called for missing repository mapping"),
    now: () => "T0",
  });
  assert.equal(res.ok, true);
  assert.equal(res.launched, false);
  assert.equal(stateStore.readState().refused[0].code, ERROR_CODES.REPO_UNRESOLVED);
});

test("claude bridge daemon: Claude launch failure posts marker and blocks duplicate retry", async () => {
  const comments = [{ id: "c313", body: "@Claude validate", createdAt: "2026-07-01T10:00:00Z", user: { name: "Ryan" } }];
  const repositoryWriterLocks = createTempRepositoryWriterLockStore().store;
  const bridgeIssue = issue({
    id: "USA-313",
    identifier: "USA-313",
    linearId: "uuid-313",
    labels: [
      { name: "Infrastructure", parent: { name: "Application" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
    comments,
    url: "https://linear.test/USA-313",
  });
  const calls = [];
  const stateStore = createMemoryClaudeBridgeStateStore();
  const linear = {
    listIssuesWithRecentComments: async () => [bridgeIssue],
    getIssueWithComments: async () => bridgeIssue,
    setState: async (_issueId, state) => calls.push(["state", state]),
    createComment: async (_issueId, body) => {
      calls.push(["comment", body]);
      comments.push({ id: "failure-marker", body, createdAt: "2026-07-01T10:02:00Z" });
    },
  };
  const first = await runClaudeBridgeDaemonPass({
    branchManager: noopClaudeBranchManager,
    config: { ...cfg, dryRun: false },
    registry,
    stateStore,
    linear,
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
    repositoryWriterLocks,
    runner: async () => {
      throw new AutomationError(ERROR_CODES.CLAUDE_RUN_FAILED, "simulated launch failure");
    },
    now: (() => {
      const times = ["T0", "T1", "T2"];
      return () => times.shift() ?? "Tn";
    })(),
  });
  assert.equal(first.ok, false);
  assert.equal(first.code, ERROR_CODES.CLAUDE_RUN_FAILED);
  assert.match(calls[0][1], /Claude follow-up detected/);
  assert.equal(calls[1][1], "In Progress");
  assert.match(calls[2][1], /source-comment:c313/);
  assert.match(calls[2][1], /failed closed/);
  assert.equal(stateStore.readState().followUps[0].status, CLAUDE_FOLLOW_UP_STATES.BLOCKED);

  const second = await runClaudeBridgeDaemonPass({
    config: { ...cfg, dryRun: false },
    registry,
    stateStore,
    linear,
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
    repositoryWriterLocks,
    runner: async () => assert.fail("duplicate failure marker must prevent relaunch"),
    now: () => "T3",
  });
  assert.equal(second.ok, true);
  assert.equal(second.launched, false);
  assert.equal(stateStore.readState().refused[0].code, ERROR_CODES.CLAUDE_ALREADY_HANDLED);
});

// -------------------------------------------------------- secret redaction
test("logging: secrets are redacted by key name", () => {
  const out = redact({ password: "hunter2", api_key: "abc", nested: { serviceRoleKey: "x" }, safe: "ok" });
  assert.equal(out.password, REDACTED);
  assert.equal(out.api_key, REDACTED);
  assert.equal(out.nested.serviceRoleKey, REDACTED);
  assert.equal(out.safe, "ok");
});

test("logging: secrets are redacted by shape even under innocent keys", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
  assert.equal(redact({ note: jwt }).note, REDACTED);
  assert.equal(redact({ note: "ghp_abcdefghijklmnopqrstuvwxyz0123" }).note, REDACTED);
});

test("logging: emitted lines never contain a secret", () => {
  let captured = "";
  const logger = createLogger({ job: "t", stream: { write: (s) => (captured += s) }, clock: () => "T" });
  logger.info("event", { password: "hunter2", ok: "visible" });
  assert.ok(!captured.includes("hunter2"));
  assert.ok(captured.includes("visible"));
});

// -------------------------------------------------------- registry / repos
test("registry: Application resolves to a fully-qualified slug", () => {
  const r = resolveApplicationRepository("USAM Website", registry);
  assert.equal(r.ok, true);
  assert.equal(r.slug, "rfox0629/usam-website");
  assert.equal(r.owner, "rfox0629");
  assert.equal(r.repo, "usam-website");
  assert.ok(r.slug.includes("/"), "slug must be fully qualified");
});

test("registry: unknown Application fails closed", () => {
  const r = resolveApplicationRepository("Nonexistent App", registry);
  assert.equal(r.ok, false);
  assert.equal(r.code, ERROR_CODES.REPO_UNRESOLVED);
});

test("registry: legacy-only Application does not resolve to the legacy repo", () => {
  // "DOS" maps to both the active monorepo and the legacy repo; the active one wins.
  const r = resolveApplicationRepository("DOS", registry);
  assert.equal(r.ok, true);
  assert.equal(r.slug, "rfox0629/usam-website", "must never resolve DOS to dos-platform");
});

test("registry: an Application mapping only to legacy fails closed", () => {
  const legacyOnly = { schemaVersion: 2, applications: [registry.applications[1]] };
  const r = resolveApplicationRepository("DOS", legacyOnly);
  assert.equal(r.ok, false);
  assert.equal(r.code, ERROR_CODES.REPO_UNRESOLVED);
});

// ------------------------------------------------------------- eligibility
test("eligibility: a well-formed Ready issue is eligible", () => {
  const v = classifyEligibility(issue(), cfg, {});
  assert.equal(v.eligible, true);
  assert.equal(v.application, "DOS");
  assert.equal(v.runner, "Claude");
});

test("eligibility: non-Ready issue is refused", () => {
  const v = classifyEligibility(issue({ state: { name: "Backlog" } }), cfg, {});
  assert.equal(v.code, ERROR_CODES.ISSUE_NOT_READY);
});

test("eligibility: terminal issues are never operated on", () => {
  for (const s of ["Done", "Canceled", "Duplicate"]) {
    const v = classifyEligibility(issue({ state: { name: s } }), cfg, {});
    assert.equal(v.code, ERROR_CODES.ISSUE_TERMINAL, `${s} must be terminal`);
  }
});

test("eligibility: archived issues are never operated on", () => {
  const v = classifyEligibility(issue({ archivedAt: "2026-01-01" }), cfg, {});
  assert.equal(v.code, ERROR_CODES.ISSUE_ARCHIVED);
});

test("eligibility: missing Application fails closed", () => {
  const v = classifyEligibility(issue({ labels: [{ name: "Claude", parent: { name: "Runner" } }] }), cfg, {});
  assert.equal(v.code, ERROR_CODES.APPLICATION_MISSING);
});

test("eligibility: MULTIPLE Application labels fail closed", () => {
  const v = classifyEligibility(
    issue({
      labels: [
        { name: "DOS", parent: { name: "Application" } },
        { name: "SAVE", parent: { name: "Application" } },
        { name: "Claude", parent: { name: "Runner" } },
      ],
    }),
    cfg,
    {},
  );
  assert.equal(v.code, ERROR_CODES.APPLICATION_AMBIGUOUS);
});

test("eligibility: missing Runner fails closed", () => {
  const v = classifyEligibility(issue({ labels: [{ name: "DOS", parent: { name: "Application" } }] }), cfg, {});
  assert.equal(v.code, ERROR_CODES.RUNNER_MISSING);
});

test("eligibility: missing acceptance criteria fails closed", () => {
  const v = classifyEligibility(issue({ description: "just do it" }), cfg, {});
  assert.equal(v.code, ERROR_CODES.ACCEPTANCE_CRITERIA_MISSING);
});

test("eligibility: acceptance tests section satisfies acceptance criteria gate", () => {
  assert.equal(hasAcceptanceCriteria(issue({ description: "# Acceptance tests\n\n* it works" })), true);
});

test("eligibility: Success criteria section satisfies acceptance criteria gate", () => {
  assert.equal(hasAcceptanceCriteria(issue({ description: "## Success criteria\n\n* Spark launches" })), true);
});

test("eligibility: Deliverable section satisfies acceptance criteria gate", () => {
  assert.equal(hasAcceptanceCriteria(issue({ description: "## Deliverable\n\n1. Preview link\n2. Founder-review notes" })), true);
});

test("eligibility: retired routing labels are NOT consulted", () => {
  // An issue carrying ONLY legacy labels must not become eligible.
  const legacy = issue({ labels: [{ name: "Ready for Codex" }, { name: "Ready for Dispatcher" }] });
  const v = classifyEligibility(legacy, cfg, {});
  assert.equal(v.eligible, false);
  assert.equal(v.code, ERROR_CODES.APPLICATION_MISSING);
});

// ---------------------------------------------------------------- capacity
test("capacity: per-runner WIP limit is enforced", () => {
  const v = classifyEligibility(issue(), cfg, { inFlightByRunner: { Claude: 2 } });
  assert.equal(v.code, ERROR_CODES.WIP_LIMIT_REACHED);
});

test("capacity: Founder Review cap of 7 creates backpressure", () => {
  const v = classifyEligibility(issue(), cfg, { founderReviewCount: 7 });
  assert.equal(v.code, ERROR_CODES.REVIEW_CAP_REACHED);
});

test("capacity: cap of 6 still allows pickup", () => {
  assert.equal(classifyEligibility(issue(), cfg, { founderReviewCount: 6 }).eligible, true);
});

// -------------------------------------------------------- USA-68 cooldown
test("USA-68: an active cooldown blocks pickup", () => {
  const now = Date.now();
  const v = classifyEligibility(issue(), cfg, {
    now,
    cooldowns: { Claude: { until: new Date(now + 60_000).toISOString() } },
  });
  assert.equal(v.code, ERROR_CODES.RUNNER_COOLING_DOWN);
});

test("USA-68: pickup resumes after the reset time passes", () => {
  const now = Date.now();
  const v = classifyEligibility(issue(), cfg, {
    now,
    cooldowns: { Claude: { until: new Date(now - 60_000).toISOString() } },
  });
  assert.equal(v.eligible, true, "must resume once the cooldown window has elapsed");
});

test("USA-68: a cooldown on one runner does not block the other", () => {
  const now = Date.now();
  const codexIssue = issue({
    labels: [
      { name: "DOS", parent: { name: "Application" } },
      { name: "Codex", parent: { name: "Runner" } },
    ],
  });
  const v = classifyEligibility(codexIssue, cfg, {
    now,
    cooldowns: { Claude: { until: new Date(now + 60_000).toISOString() } },
  });
  assert.equal(v.eligible, true);
});

// ------------------------------------------------------- USA-73 revisions
const fr = { ...cfg.linear, founderReviewStateName: "Founder Review" };

test("USA-73: founder change request triggers re-pickup", () => {
  const r = detectFounderRevision(
    issue({ state: { name: "Founder Review" } }),
    [{ id: "c1", body: "Please revise the header spacing", createdAt: "2026-07-01T10:00:00Z", author: { name: "Ryan Fox" } }],
    {},
  );
  assert.equal(r.revisionRequested, true);
});

test("USA-73: founder approval does NOT trigger re-pickup", () => {
  const r = detectFounderRevision(
    issue({ state: { name: "Founder Review" } }),
    [{ id: "c1", body: "Approved, looks good", createdAt: "2026-07-01T10:00:00Z", author: { name: "Ryan Fox" } }],
    {},
  );
  assert.equal(r.revisionRequested, false);
});

test("USA-73: non-founder comments are ignored", () => {
  const r = detectFounderRevision(
    issue({ state: { name: "Founder Review" } }),
    [{ id: "c1", body: "please change this", createdAt: "2026-07-01T10:00:00Z", author: { name: "Someone Else" } }],
    {},
  );
  assert.equal(r.revisionRequested, false);
});

test("USA-73: our own generated comments never trigger a loop", () => {
  const r = detectFounderRevision(
    issue({ state: { name: "Founder Review" } }),
    [{ id: "c1", body: `${CLAIM_MARKER}\nplease change`, createdAt: "2026-07-01T10:00:00Z", author: { name: "Ryan Fox" } }],
    {},
  );
  assert.equal(r.revisionRequested, false, "generated comments must be skipped to avoid a feedback loop");
});

test("USA-73: an already-handled revision is not re-picked-up (no duplicate sessions)", () => {
  const r = detectFounderRevision(
    issue({ state: { name: "Founder Review" } }),
    [
      { id: "c1", body: "please revise", createdAt: "2026-07-01T10:00:00Z", author: { name: "Ryan Fox" } },
      { id: "c2", body: `${REVISION_MARKER}\nre-picked up`, createdAt: "2026-07-01T11:00:00Z", author: { name: "Ryan Fox" } },
    ],
    {},
  );
  assert.equal(r.revisionRequested, false);
});

test("USA-73: issues outside Founder Review are not considered", () => {
  const r = detectFounderRevision(issue({ state: { name: "In Progress" } }), [], {});
  assert.equal(r.revisionRequested, false);
});

// ------------------------------------------------------------- claim/plan
test("planLaunch: produces a complete, fully-qualified plan", () => {
  const p = planLaunch({ issue: issue(), config: cfg, registry, context: {} });
  assert.equal(p.ok, true);
  assert.equal(p.repository, "rfox0629/usam-website");
  assert.equal(p.runner, "Claude");
  assert.ok(p.branch.length > 0);
  assert.ok(p.worktree.startsWith("/tmp/usam-wt/"));
  assert.equal(p.mutations.length, 3);
});

test("planLaunch: duplicate session is prevented", () => {
  const p = planLaunch({
    issue: issue(),
    config: cfg,
    registry,
    context: { activeSessions: [{ issueId: "USA-200" }] },
  });
  assert.equal(p.code, ERROR_CODES.DUPLICATE_SESSION);
});

test("claim comment is a single consolidated comment", () => {
  const c = buildClaimComment({ issue: issue(), runner: "Claude", repository: "rfox0629/usam-website", branch: "b", worktree: "/tmp/usam-wt/x" });
  assert.ok(c.includes(CLAIM_MARKER));
  assert.ok(c.includes("rfox0629/usam-website"));
  assert.equal(c.split(CLAIM_MARKER).length - 1, 1);
});

// --------------------------------------------------------- dry-run guarantee
test("DRY-RUN: launcher performs no mutation and records every intent", async () => {
  let mutated = 0;
  const linear = { createComment: async () => mutated++, setState: async () => mutated++ };
  const git = { createWorktree: async () => mutated++ };
  const res = await runLauncher({
    config: { ...cfg, dryRun: true },
    registry,
    issues: [issue()],
    linear,
    git,
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
  });
  assert.equal(mutated, 0, "dry-run must not mutate anything");
  assert.equal(res.launched.length, 1);
  assert.equal(res.plannedMutations.length, 3, "all three intended mutations must be recorded");
});

test("LIVE: production launcher observes Founder Review cap but still dispatches", async () => {
  let dispatched = false;
  let logText = "";
  const res = await runLauncher({
    config: { ...cfg, dryRun: false, limits: { ...cfg.limits, founderReviewCap: 7 } },
    productionAdapter: {
      inspectQueue: async () => ({
        health: { candidateCount: 1, classifiedIssueCount: 1, founderReviewCount: 8, readyCount: 1 },
        inspection: { candidateCount: 1, issues: [{ id: "USA-111", state: "Ready" }] },
      }),
      runOnce: async () => {
        dispatched = true;
        return {
          events: [{ event: "issue_claimed", issueId: "USA-111" }],
          exitStatus: 0,
          stderr: "",
          timedOut: false,
        };
      },
    },
    logger: createLogger({ job: "t", stream: { write: (s) => (logText += s) } }),
  });
  assert.equal(dispatched, true);
  assert.equal(res.health.backpressureEngaged, true);
  assert.equal(res.dispatch.exitStatus, 0);
  assert.equal(res.dispatch.skipped, undefined);
  assert.match(logText, /production_backpressure_observed/);
});

test("mutation guard: non-dry-run actually performs", async () => {
  const g = createMutationGuard({ dryRun: false });
  let ran = false;
  const r = await g.perform("x", async () => { ran = true; return 1; });
  assert.equal(ran, true);
  assert.equal(r.performed, true);
});

// ------------------------------------------------------------------ digest
test("digest: packet flags missing PR / CI / preview rather than inventing them", () => {
  const p = buildReviewPacket(issue({ state: { name: "Founder Review" } }), { branch: "b" }, cfg);
  assert.equal(p.complete, false);
  assert.deepEqual(p.missingFields.sort(), ["ciStatus", "previewUrl", "pullRequest"]);
});

test("digest: complete evidence yields a review-ready packet", () => {
  const p = buildReviewPacket(
    issue({ state: { name: "Founder Review" } }),
    { branch: "b", pullRequest: "#1", ciStatus: "green", previewUrl: "https://x" },
    cfg,
  );
  assert.equal(p.complete, true);
});

test("digest: reports queue size and flags over-cap", () => {
  const many = Array.from({ length: 9 }, (_, i) => issue({ id: `USA-${300 + i}`, state: { name: "Founder Review" } }));
  const d = buildDigest({ issues: many, config: cfg });
  assert.equal(d.queueSize, 9);
  assert.equal(d.overCap, true);
  assert.ok(renderDigest(d).includes("OVER CAP"));
});

test("digest: only Founder Review issues are included", () => {
  const d = buildDigest({ issues: [issue(), issue({ id: "USA-301", state: { name: "Founder Review" } })], config: cfg });
  assert.equal(d.queueSize, 1);
});

test("digest: empty queue renders cleanly", () => {
  const d = buildDigest({ issues: [], config: cfg });
  assert.equal(d.queueSize, 0);
  assert.ok(renderDigest(d).includes("empty"));
});

test("DRY-RUN: digest does not post", async () => {
  let posted = 0;
  const res = await runDigest({
    config: { ...cfg, dryRun: true },
    issues: [issue({ state: { name: "Founder Review" } })],
    linear: { createComment: async () => posted++ },
    target: "USA-1",
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
  });
  assert.equal(posted, 0);
  assert.ok(res.rendered.includes("Daily Review Digest"));
});

// ----------------------------------------------------------------- janitor
const wtRoot = mkdtempSync(path.join(tmpdir(), "usam-wt-"));
const jcfg = validateConfig({
  ...DEFAULT_CONFIG,
  worktrees: { allowlistRoots: [wtRoot], protectedPaths: ["/Users/ryanfox/Code", "/Users/ryanfox/USAM-Automation"] },
});
const clean = (over = {}) => ({
  path: path.join(wtRoot, "usa-200-claude"),
  issueId: "USA-200", issueState: "Done",
  dirty: false, untracked: false, unpushed: false, pullRequestOpen: false, repositoryResolved: true,
  ...over,
});

test("janitor: a clean worktree for a Done issue is safe", () => {
  assert.equal(classifyWorktree(clean(), jcfg).safe, true);
});

test("janitor: refuses a dirty worktree", () => {
  assert.equal(classifyWorktree(clean({ dirty: true }), jcfg).code, ERROR_CODES.WORKTREE_DIRTY);
});

test("janitor: refuses untracked files", () => {
  assert.equal(classifyWorktree(clean({ untracked: true }), jcfg).code, ERROR_CODES.WORKTREE_UNTRACKED);
});

test("janitor: refuses unpushed commits", () => {
  assert.equal(classifyWorktree(clean({ unpushed: true }), jcfg).code, ERROR_CODES.WORKTREE_UNPUSHED);
});

test("janitor: refuses when a PR is open", () => {
  assert.equal(classifyWorktree(clean({ pullRequestOpen: true }), jcfg).code, ERROR_CODES.WORKTREE_PR_OPEN);
});

test("janitor: refuses when the issue is still active", () => {
  assert.equal(classifyWorktree(clean({ issueState: "In Progress" }), jcfg).code, ERROR_CODES.WORKTREE_ISSUE_ACTIVE);
});

test("janitor: Canceled issues are prunable", () => {
  assert.equal(classifyWorktree(clean({ issueState: "Canceled" }), jcfg).safe, true);
});

test("janitor: refuses when the issue state is unknown — never guesses", () => {
  assert.equal(classifyWorktree(clean({ issueState: null }), jcfg).code, ERROR_CODES.WORKTREE_ISSUE_ACTIVE);
});

test("janitor: refuses when the repository cannot be resolved", () => {
  assert.equal(classifyWorktree(clean({ repositoryResolved: false }), jcfg).code, ERROR_CODES.REPO_UNRESOLVED);
});

test("janitor: refuses a path outside the allowlist", () => {
  assert.equal(classifyWorktree(clean({ path: "/tmp/somewhere-else/x" }), jcfg).code, ERROR_CODES.WORKTREE_OUTSIDE_ALLOWLIST);
});

test("janitor: refuses raw path traversal", () => {
  // Deliberately NOT path.join — that would collapse ".." before the call and
  // silently turn this into a plain outside-allowlist case.
  const r = assertInsideAllowlist(`${wtRoot}/../escape`, jcfg);
  assert.equal(r.ok, false);
  assert.equal(r.code, ERROR_CODES.WORKTREE_PATH_TRAVERSAL);
});

test("janitor: a traversal that normalizes outside the allowlist is still refused", () => {
  // Even when ".." is collapsed by the caller, the allowlist check must catch it.
  const r = assertInsideAllowlist(path.join(wtRoot, "..", "escape"), jcfg);
  assert.equal(r.ok, false);
  assert.equal(r.code, ERROR_CODES.WORKTREE_OUTSIDE_ALLOWLIST);
});

test("janitor: refuses relative paths", () => {
  assert.equal(assertInsideAllowlist("relative/x", jcfg).code, ERROR_CODES.WORKTREE_OUTSIDE_ALLOWLIST);
});

test("janitor: NEVER operates on canonical /Users/ryanfox/Code clones", () => {
  const r = assertInsideAllowlist("/Users/ryanfox/Code/usam-website", jcfg);
  assert.equal(r.ok, false);
  assert.equal(r.code, ERROR_CODES.WORKTREE_PROTECTED_PATH);
});

test("janitor: NEVER operates on the ~/USAM-Automation runtime", () => {
  const r = assertInsideAllowlist("/Users/ryanfox/USAM-Automation/src", jcfg);
  assert.equal(r.ok, false);
  assert.equal(r.code, ERROR_CODES.WORKTREE_PROTECTED_PATH);
});

test("janitor: refuses the allowlist root itself", () => {
  assert.equal(assertInsideAllowlist(wtRoot, jcfg).ok, false);
});

test("janitor: a symlink escaping the allowlist is rejected", () => {
  const outside = mkdtempSync(path.join(tmpdir(), "outside-"));
  const link = path.join(wtRoot, "sneaky");
  try { symlinkSync(outside, link); } catch { return; }
  const r = assertInsideAllowlist(link, jcfg);
  // realpath resolves the link out of the allowlist, so it must be refused.
  assert.equal(r.ok, false, "symlink pointing outside the allowlist must be refused");
  rmSync(link, { force: true });
});

test("DRY-RUN: janitor prunes nothing and reports retained worktrees", async () => {
  let removed = 0;
  const res = await runJanitor({
    config: { ...jcfg, dryRun: true },
    worktrees: [clean(), clean({ path: path.join(wtRoot, "dirty"), dirty: true })],
    git: { removeWorktree: async () => removed++, prune: async () => removed++ },
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
  });
  assert.equal(removed, 0);
  assert.equal(res.pruned.length, 1);
  assert.equal(res.retained.length, 1);
  assert.equal(res.retained[0].code, ERROR_CODES.WORKTREE_DIRTY);
});

// ------------------------------------------------------------------ backup
const bcfg = (over = {}) => validateConfig({ ...DEFAULT_CONFIG, backup: { ...DEFAULT_CONFIG.backup, ...over } });

function fakeFs({ script = true, envText = "", lock = false }) {
  return {
    existsSync: (p) => {
      if (p.endsWith("usam-backup.sh")) return script;
      if (p.endsWith("backup.env")) return envText !== "";
      if (p.includes("lock")) return lock;
      return false;
    },
    readFileSync: () => envText,
  };
}

test("backup: missing DB password is detected and blocks", () => {
  const r = preflight({ config: bcfg(), root: "/r", env: {}, fs: fakeFs({ envText: "USAM_BACKUP_PASSPHRASE=x\nUSAM_BACKUP_OFFSITE_DEST=y\n" }) });
  assert.equal(r.ready, false);
  assert.ok(r.problems.some((p) => p.code === ERROR_CODES.BACKUP_DB_PASSWORD_MISSING));
});

test("backup: missing passphrase is detected", () => {
  const r = preflight({ config: bcfg(), root: "/r", env: {}, fs: fakeFs({ envText: "SUPABASE_DB_PASSWORD=x\nUSAM_BACKUP_OFFSITE_DEST=y\n" }) });
  assert.ok(r.problems.some((p) => p.code === ERROR_CODES.BACKUP_PASSPHRASE_MISSING));
});

test("backup: missing offsite destination is detected", () => {
  const r = preflight({ config: bcfg(), root: "/r", env: {}, fs: fakeFs({ envText: "SUPABASE_DB_PASSWORD=x\nUSAM_BACKUP_PASSPHRASE=y\n" }) });
  assert.ok(r.problems.some((p) => p.code === ERROR_CODES.BACKUP_OFFSITE_MISSING));
});

test("backup: preflight NEVER returns credential values", () => {
  const r = preflight({
    config: bcfg(),
    root: "/r",
    env: {},
    fs: fakeFs({ envText: "SUPABASE_DB_PASSWORD=supersecret\nUSAM_BACKUP_PASSPHRASE=alsosecret\nUSAM_BACKUP_OFFSITE_DEST=s3://b\n" }),
  });
  const serialized = JSON.stringify(r);
  assert.ok(!serialized.includes("supersecret"));
  assert.ok(!serialized.includes("alsosecret"));
  assert.ok(r.configuredKeys.includes("SUPABASE_DB_PASSWORD"), "key NAMES are reported, values are not");
});

test("backup: overlapping runs are prevented by the lock", () => {
  const r = preflight({
    config: bcfg(),
    root: "/r",
    env: {},
    fs: fakeFs({ lock: true, envText: "SUPABASE_DB_PASSWORD=x\nUSAM_BACKUP_PASSPHRASE=y\nUSAM_BACKUP_OFFSITE_DEST=z\n" }),
  });
  assert.ok(r.problems.some((p) => p.code === ERROR_CODES.BACKUP_ALREADY_RUNNING));
});

test("backup: missing script is detected", () => {
  const r = preflight({ config: bcfg(), root: "/r", env: {}, fs: fakeFs({ script: false, envText: "SUPABASE_DB_PASSWORD=x\nUSAM_BACKUP_PASSPHRASE=y\nUSAM_BACKUP_OFFSITE_DEST=z\n" }) });
  assert.ok(r.problems.some((p) => p.code === ERROR_CODES.BACKUP_SCRIPT_MISSING));
});

test("backup: Keychain-stored credentials are detected via presence probe, not env vars", () => {
  const envText =
    'KEYCHAIN_ACCOUNT="usam-backup"\nKEYCHAIN_DB_PASSWORD_SERVICE="usam-supabase-db-password"\n' +
    'KEYCHAIN_GPG_PASSPHRASE_SERVICE="usam-backup-gpg-passphrase"\nOFFSITE_MODE="rclone"\n';
  const probed = [];
  const r = preflight({
    config: bcfg(),
    root: "/r",
    env: {},
    fs: fakeFs({ envText }),
    keychainLookup: { probe: (s, a) => { probed.push([s, a]); return true; } },
  });
  assert.equal(r.ready, true, "Keychain-backed credentials must count as configured");
  assert.equal(probed.length, 2, "both db password and gpg passphrase must be probed");
  assert.ok(!JSON.stringify(r).includes("password-value"));
});

test("backup: Keychain probe returning false is reported as missing, with the service named", () => {
  const envText =
    'KEYCHAIN_DB_PASSWORD_SERVICE="usam-supabase-db-password"\n' +
    'KEYCHAIN_GPG_PASSPHRASE_SERVICE="usam-backup-gpg-passphrase"\nOFFSITE_MODE="rclone"\n';
  const r = preflight({ config: bcfg(), root: "/r", env: {}, fs: fakeFs({ envText }), keychainLookup: { probe: () => false } });
  assert.equal(r.ready, false);
  assert.ok(r.problems.some((p) => p.code === ERROR_CODES.BACKUP_DB_PASSWORD_MISSING));
  assert.match(r.problems.find((p) => p.code === ERROR_CODES.BACKUP_DB_PASSWORD_MISSING).detail, /Keychain/);
});

test('backup: OFFSITE_MODE="none" is treated as an explicit, loud gap', () => {
  const envText =
    'KEYCHAIN_DB_PASSWORD_SERVICE="s"\nKEYCHAIN_GPG_PASSPHRASE_SERVICE="g"\nOFFSITE_MODE="none"\n';
  const r = preflight({ config: bcfg(), root: "/r", env: {}, fs: fakeFs({ envText }), keychainLookup: { probe: () => true } });
  assert.equal(r.ready, false);
  const p = r.problems.find((x) => x.code === ERROR_CODES.BACKUP_OFFSITE_MISSING);
  assert.ok(p, "OFFSITE_MODE=none must be reported");
  assert.match(p.detail, /explicitly not configured/);
});

test("backup: HONESTY — exit 0 without dump evidence is NOT healthy", () => {
  const r = interpretResult({ exitCode: 0, stdout: "started backup\n" });
  assert.equal(r.healthy, false);
  assert.equal(r.status, BACKUP_STATUS.INCOMPLETE);
});

test("backup: HONESTY — db dump alone is not enough", () => {
  const r = interpretResult({ exitCode: 0, stdout: "database dump complete\n" });
  assert.equal(r.healthy, false);
  assert.match(r.reason, /storage export/);
});

test("backup: both dump and storage export yield complete", () => {
  const r = interpretResult({ exitCode: 0, stdout: "database dump complete\nstorage export complete\n" });
  assert.equal(r.healthy, true);
  assert.equal(r.status, BACKUP_STATUS.COMPLETE);
});

test("backup: non-zero exit is never healthy", () => {
  assert.equal(interpretResult({ exitCode: 3, stdout: "database dump complete\nstorage export complete\n" }).healthy, false);
});

test("DRY-RUN: backup runs preflight but never executes the script", async () => {
  let executed = 0;
  const r = await runBackup({
    config: { ...bcfg(), dryRun: true },
    root: "/r",
    env: {},
    exec: async () => { executed++; return { exitCode: 0, stdout: "" }; },
    fs: fakeFs({ envText: "SUPABASE_DB_PASSWORD=x\nUSAM_BACKUP_PASSPHRASE=y\nUSAM_BACKUP_OFFSITE_DEST=z\n" }),
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
  });
  assert.equal(executed, 0, "dry-run must never execute the backup script");
  assert.equal(r.healthy, false, "dry-run must never claim healthy");
  assert.equal(r.dryRun, true);
});

test("backup: blocked preflight yields non-zero exit status", async () => {
  const r = await runBackup({
    config: { ...bcfg(), dryRun: true },
    root: "/r",
    env: {},
    exec: async () => ({ exitCode: 0, stdout: "" }),
    fs: fakeFs({ envText: "" }),
    logger: createLogger({ job: "t", stream: { write: () => {} } }),
  });
  assert.equal(r.exitStatus, 1);
  assert.equal(r.healthy, false);
});

// --------------------------------------------------------------- utilities
test("labelsInGroup handles string labels without crashing", () => {
  assert.deepEqual(labelsInGroup({ labels: ["Bug", { name: "DOS", parent: { name: "Application" } }] }, "Application"), ["DOS"]);
});

test("planBranchName prefers Linear's branch name", () => {
  assert.equal(planBranchName({ id: "USA-1", title: "x", gitBranchName: "ryan/usa-1-x" }), "ryan/usa-1-x");
});

test("planBranchName derives a safe slug when absent", () => {
  const b = planBranchName({ id: "USA-1", title: "Fix the Thing!! (urgent)" });
  assert.match(b, /^ryan\/usa-1-fix-the-thing-urgent$/);
});
