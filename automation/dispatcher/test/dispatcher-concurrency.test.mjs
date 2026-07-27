import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const dispatcherPath = resolve(testDir, "../src/dispatcher.mjs");
const mockRunnerPath = resolve(testDir, "fixtures/mock-runner.mjs");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    ...options,
    env: {
      ...process.env,
      GIT_AUTHOR_EMAIL: "dispatcher-test@example.test",
      GIT_AUTHOR_NAME: "Dispatcher Test",
      GIT_COMMITTER_EMAIL: "dispatcher-test@example.test",
      GIT_COMMITTER_NAME: "Dispatcher Test",
      ...(options.env || {}),
    },
  });

  assert.equal(result.status, 0, `${command} ${args.join(" ")}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  return result;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function makeTempRoot(name) {
  return mkdtempSync(join(os.tmpdir(), `usam-dispatcher-${name}-`));
}

function initRepo(root) {
  const repo = join(root, "repo");
  mkdirSync(join(repo, "docs"), { recursive: true });
  writeFileSync(join(repo, "AGENTS.md"), "# Test instructions\n");
  writeFileSync(join(repo, "package.json"), "{\"name\":\"dispatcher-test\",\"private\":true}\n");
  writeFileSync(join(repo, "docs", "seed.md"), "seed\n");
  run("git", ["init"], { cwd: repo });
  run("git", ["add", "."], { cwd: repo });
  run("git", ["commit", "-m", "seed"], { cwd: repo });
  return repo;
}

function issue(identifier, runner, description, extra = {}) {
  return {
    branchName: null,
    createdAt: extra.createdAt || "2026-07-21T00:00:00.000Z",
    description,
    id: identifier.toLowerCase(),
    identifier,
    labels: {
      nodes: [
        { name: "Ready for Dispatcher" },
        { name: runner === "codex" ? "Ready for Codex" : "Ready for Claude" },
        ...(extra.labels || []).map((name) => ({ name })),
      ],
    },
    priority: extra.priority || 0,
    priorityLabel: extra.priorityLabel || "No priority",
    state: { name: extra.state || "Todo", type: "unstarted" },
    title: extra.title || `${identifier} test packet`,
    updatedAt: extra.updatedAt || "2026-07-21T00:00:00.000Z",
    url: `https://linear.example/${identifier}`,
  };
}

function writeConfig(root, repo, issues, overrides = {}) {
  const fixturePath = join(root, "fixtures", "issues.json");
  const configPath = join(root, "config", "dispatcher.config.json");
  writeJson(fixturePath, { issues });
  writeJson(configPath, {
    testMode: true,
    linear: {
      backend: "fixture",
      fixturePath,
      labelReadyForClaude: "Ready for Claude",
      labelReadyForCodex: "Ready for Codex",
      labelReadyForDispatcher: "Ready for Dispatcher",
      statusInProgress: "In Progress",
      statusInReview: "In Review",
      statusTodo: "Todo",
      teamKey: "USA",
    },
    git: {
      baseRef: "HEAD",
      branchPrefix: "dispatcher-test",
      fetchBeforeWorktree: false,
      repositoryPath: repo,
    },
    paths: {
      rootDir: root,
    },
    pollIntervalMs: 25,
    heartbeatIntervalMs: 25,
    lockStaleAfterMs: 100,
    runnerTimeoutMs: 5000,
    maxRetries: 0,
    concurrency: {
      globalMax: 2,
      refillOnWorkerExit: true,
    },
    maxWorkers: {
      codex: 2,
      claude: 2,
    },
    queue: {
      reviewCeiling: 20,
      reviewCountFirst: 50,
      urgentLabels: ["Urgent"],
    },
    resources: {
      enabled: false,
    },
    runners: {
      codex: {
        args: [mockRunnerPath, "350"],
        command: process.execPath,
        protocol: "stdio",
      },
      claude: {
        args: [mockRunnerPath, "350"],
        command: process.execPath,
        protocol: "stdio",
      },
    },
    ...overrides,
  });
  return { configPath, fixturePath };
}

function runDispatcher(configPath, args = ["--once"]) {
  return run(process.execPath, [dispatcherPath, "--config", configPath, ...args], {
    cwd: dirname(configPath),
    timeout: 15000,
  });
}

function lock(root, identifier) {
  return readJson(join(root, "locks", `${identifier.toLowerCase()}.json`));
}

test("starts two non-conflicting packets concurrently in isolated worktrees", () => {
  const root = makeTempRoot("parallel");
  const repo = initRepo(root);
  const { configPath } = writeConfig(root, repo, [
    issue("USA-100", "codex", "Update docs/dispatcher-fixtures/a.md for a harmless Codex packet."),
    issue("USA-101", "claude", "Update sandbox/dispatcher-fixtures/b.html for a harmless Claude packet."),
  ]);

  runDispatcher(configPath);

  const first = lock(root, "USA-100");
  const second = lock(root, "USA-101");
  assert.equal(first.status, "completed");
  assert.equal(second.status, "completed");
  assert.notEqual(first.worktreePath, second.worktreePath);
  assert.notEqual(first.branch, second.branch);
  assert.ok(existsSync(join(first.worktreePath, "docs", "dispatcher-fixtures", "usa-100.md")));
  assert.ok(existsSync(join(second.worktreePath, "docs", "dispatcher-fixtures", "usa-101.md")));

  const firstStarted = Date.parse(first.runnerStartedAt);
  const secondStarted = Date.parse(second.runnerStartedAt);
  const firstCompleted = Date.parse(first.completedAt);
  const secondCompleted = Date.parse(second.completedAt);
  assert.ok(firstStarted < secondCompleted, "first worker should overlap second completion window");
  assert.ok(secondStarted < firstCompleted, "second worker should overlap first completion window");
});

test("holds overlapping paths while unrelated capacity remains usable", () => {
  const root = makeTempRoot("conflict");
  const repo = initRepo(root);
  const { configPath, fixturePath } = writeConfig(root, repo, [
    issue("USA-110", "codex", "Update docs/shared.md for the first packet."),
    issue("USA-111", "claude", "Update docs/shared.md for the conflicting packet."),
    issue("USA-112", "codex", "Update app/unrelated/page.tsx for an unrelated packet."),
  ]);

  runDispatcher(configPath);

  assert.equal(lock(root, "USA-110").status, "completed");
  assert.equal(lock(root, "USA-112").status, "completed");
  assert.equal(existsSync(join(root, "locks", "usa-111.json")), false);

  const fixture = readJson(fixturePath);
  assert.equal(fixture.issues.find((item) => item.identifier === "USA-111").state.name, "Todo");
  const holds = readJson(join(root, "state", "queue-holds.json")).held;
  assert.ok(holds.some((hold) => hold.issue === "USA-111" && hold.reason.includes("conflict with USA-110")));
});

test("refills capacity after a worker exits when draining the queue", () => {
  const root = makeTempRoot("refill");
  const repo = initRepo(root);
  const { configPath } = writeConfig(root, repo, [
    issue("USA-120", "codex", "Update docs/refill-a.md for the first packet."),
    issue("USA-121", "codex", "Update docs/refill-b.md for the second packet."),
  ], {
    concurrency: {
      globalMax: 1,
      refillOnWorkerExit: true,
    },
    maxWorkers: {
      codex: 1,
      claude: 1,
    },
  });

  runDispatcher(configPath, ["--once", "--drain-queue"]);

  const first = lock(root, "USA-120");
  const second = lock(root, "USA-121");
  assert.equal(first.status, "completed");
  assert.equal(second.status, "completed");
  assert.ok(Date.parse(second.runnerStartedAt) >= Date.parse(first.completedAt));
});

test("resource pressure and review ceiling hold eligible packets", () => {
  const resourceRoot = makeTempRoot("resource");
  const resourceRepo = initRepo(resourceRoot);
  const resourceConfig = writeConfig(resourceRoot, resourceRepo, [
    issue("USA-130", "codex", "Update docs/resource.md for a harmless packet."),
  ], {
    resources: {
      enabled: true,
      minFreeDiskGb: 999999,
    },
  }).configPath;

  runDispatcher(resourceConfig);
  assert.equal(existsSync(join(resourceRoot, "locks", "usa-130.json")), false);
  assert.ok(readJson(join(resourceRoot, "state", "queue-holds.json")).held[0].reason.includes("resource pressure"));

  const reviewRoot = makeTempRoot("review");
  const reviewRepo = initRepo(reviewRoot);
  const reviewConfig = writeConfig(reviewRoot, reviewRepo, [
    issue("USA-131", "codex", "Update docs/review.md for a harmless packet."),
    issue("USA-132", "codex", "Already waiting for founder approval.", { state: "In Review" }),
  ], {
    queue: {
      reviewCeiling: 1,
      reviewCountFirst: 50,
      urgentLabels: ["Urgent"],
    },
  }).configPath;

  runDispatcher(reviewConfig);
  assert.equal(existsSync(join(reviewRoot, "locks", "usa-131.json")), false);
  assert.ok(readJson(join(reviewRoot, "state", "queue-holds.json")).held[0].reason.includes("review queue ceiling"));
});

test("stale active locks are recovered as crashed on startup", () => {
  const root = makeTempRoot("recovery");
  const repo = initRepo(root);
  const { configPath } = writeConfig(root, repo, []);
  const lockPath = join(root, "locks", "usa-140.json");
  mkdirSync(dirname(lockPath), { recursive: true });
  writeJson(lockPath, {
    attempts: 1,
    branch: "dispatcher-test/usa-140-codex-old",
    createdAt: "2026-07-21T00:00:00.000Z",
    heartbeatAt: "2026-07-21T00:00:00.000Z",
    identifier: "USA-140",
    runner: "codex",
    status: "running",
    worktreePath: join(root, "missing-worktree"),
  });

  runDispatcher(configPath);
  const recovered = lock(root, "USA-140");
  assert.equal(recovered.status, "crashed");
  assert.match(recovered.note, /worktree was missing|heartbeat was stale/);
});
