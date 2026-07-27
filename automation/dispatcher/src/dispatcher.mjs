import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(import.meta.url);
const defaultRootDir = resolve(dirname(modulePath), "..");
const defaultConfigPath = join(defaultRootDir, "config", "dispatcher.config.json");

const runnerNames = ["codex", "claude"];
const activeStatuses = new Set(["claimed", "running", "retrying"]);
const blockingStatuses = new Set(["claimed", "running", "retrying", "crashed", "failed"]);
const safeStatusKeys = new Set([
  "active",
  "attempts",
  "baseCommit",
  "branch",
  "completedAt",
  "createdAt",
  "failedAt",
  "firstOutputAt",
  "identifier",
  "issueCreatedAt",
  "issueUpdatedAt",
  "lane",
  "lastAttemptAt",
  "lastExitCode",
  "lastSignal",
  "resourceClass",
  "runner",
  "runnerStartedAt",
  "status",
  "timedOut",
  "title",
  "url",
  "worktreeCreatedAt",
]);

function parseArgs(argv) {
  const values = new Map();
  const flags = new Set();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    if (arg.includes("=")) {
      const [key, value] = arg.split(/=(.*)/s, 2);
      values.set(key, value);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      values.set(arg, next);
      index += 1;
    } else {
      flags.add(arg);
    }
  }

  return {
    drainQueue: flags.has("--drain-queue"),
    once: flags.has("--once"),
    statusOnly: flags.has("--status"),
    unsafeStatus: flags.has("--unsafe-status"),
    configPath: values.get("--config") || process.env.DISPATCHER_CONFIG || defaultConfigPath,
    maxRuntimeMs: Number(values.get("--max-runtime-ms") || 0),
  };
}

function isoNow() {
  return new Date().toISOString();
}

function dateStamp() {
  return isoNow().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function positiveNumber(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function normalizeConfig(rawConfig = {}, configPath = defaultConfigPath) {
  const rootDir = resolve(rawConfig.paths?.rootDir || process.env.DISPATCHER_ROOT || defaultRootDir);
  const concurrency = {
    globalMax: positiveNumber(rawConfig.concurrency?.globalMax ?? rawConfig.maxGlobalWorkers, 1),
    refillOnWorkerExit: rawConfig.concurrency?.refillOnWorkerExit !== false,
  };

  const config = {
    ...rawConfig,
    configPath,
    rootDir,
    testMode: Boolean(rawConfig.testMode),
    linear: {
      apiUrl: "https://api.linear.app/graphql",
      blockedLabels: ["Blocked", "Needs Discussion"],
      labelReadyForClaude: "Ready for Claude",
      labelReadyForCodex: "Ready for Codex",
      labelReadyForDispatcher: "Ready for Dispatcher",
      pollFirst: 30,
      statusInProgress: "In Progress",
      statusInReview: "In Review",
      statusTodo: "Todo",
      teamKey: "USA",
      ...rawConfig.linear,
    },
    git: {
      baseRef: "origin/main",
      branchPrefix: "dispatcher",
      fetchBeforeWorktree: true,
      repositoryPath: process.cwd(),
      ...rawConfig.git,
    },
    paths: {
      control: "control",
      locks: "locks",
      logs: "logs",
      state: "state",
      tmp: "tmp",
      worktrees: "worktrees",
      ...rawConfig.paths,
    },
    pollIntervalMs: positiveNumber(rawConfig.pollIntervalMs, 30000),
    credentialRetryMs: positiveNumber(rawConfig.credentialRetryMs, 300000),
    heartbeatIntervalMs: positiveNumber(rawConfig.heartbeatIntervalMs, 15000),
    lockStaleAfterMs: positiveNumber(rawConfig.lockStaleAfterMs, 2700000),
    runnerTimeoutMs: positiveNumber(rawConfig.runnerTimeoutMs, 1800000),
    maxRetries: Math.max(0, Number(rawConfig.maxRetries ?? 1)),
    maxWorkers: {
      codex: positiveNumber(rawConfig.maxWorkers?.codex, 1),
      claude: positiveNumber(rawConfig.maxWorkers?.claude, 1),
    },
    concurrency,
    queue: {
      dependencyMarkers: ["depends on", "blocked by", "after"],
      reviewCeiling: null,
      reviewCountFirst: 50,
      urgentLabels: ["Urgent", "P0", "P1", "High Priority"],
      ...rawConfig.queue,
    },
    resources: {
      activeBuildMode: "resourceClass",
      diskPath: rootDir,
      enabled: true,
      heavyBuildMarkers: [
        "npm install",
        "npm ci",
        "package-lock",
        "dependency",
        "dependencies",
        "next build",
        "full build",
        "playwright",
        "migration",
        "supabase",
      ],
      maxActiveBuilds: 1,
      maxLoadAvg1: null,
      maxLoadPerCpu: 1.8,
      minFreeDiskGb: 20,
      minFreeMemoryMb: 512,
      ...rawConfig.resources,
    },
    routing: {
      allowFallbackReroute: false,
      fastTrackLabels: ["Fast Track"],
      productionTrackLabels: ["Production Track"],
      ...rawConfig.routing,
    },
    conflicts: {
      useConflictKeys: true,
      usePathPrefixes: true,
      useWorktreeStatus: true,
      ...rawConfig.conflicts,
    },
    runners: rawConfig.runners || {},
    pauses: {
      global: false,
      codex: false,
      claude: false,
      ...rawConfig.pauses,
    },
  };

  if (config.concurrency.globalMax < 1) {
    config.concurrency.globalMax = 1;
  }

  return config;
}

function resolveDir(rootDir, dirValue) {
  return resolve(rootDir, dirValue);
}

function safeIssueFile(identifier) {
  return identifier.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function labelsFor(issue) {
  return issue.labels?.nodes?.map((label) => label.name).filter(Boolean) || [];
}

function labelSetFor(issue) {
  return new Set(labelsFor(issue));
}

function issueText(issue) {
  return `${issue.title || ""}\n\n${issue.description || ""}`;
}

function extractMentionedPaths(text) {
  const paths = new Set();
  const re = /(?:^|[\s`'"])((?:(?:app|src|components|docs|scripts|public|supabase|config|bin|sandbox|automation)\/[A-Za-z0-9._/\-[\]]+)|(?:AGENTS\.md|package(?:-lock)?\.json|next\.config\.js|tsconfig\.json|middleware\.ts|tailwind\.config\.js))/gm;

  for (const match of text.matchAll(re)) {
    paths.add(match[1].replace(/[.,;:)]$/, ""));
  }

  return [...paths].sort();
}

function extractDependencyRefs(text) {
  const refs = new Set();
  const lower = text.toLowerCase();
  if (!/(depends on|blocked by|after)\s+usa-\d+/i.test(text)) {
    return [];
  }

  const re = /(?:depends on|blocked by|after)\s+(USA-\d+)/gi;
  for (const match of lower.matchAll(re)) {
    refs.add(match[1].toUpperCase());
  }

  return [...refs].sort();
}

function inferConflictKeys(issue) {
  const text = `${labelsFor(issue).join(" ")} ${issue.title || ""} ${issue.description || ""}`.toLowerCase();
  const keys = new Set();
  const addIf = (key, patterns) => {
    if (patterns.some((pattern) => text.includes(pattern))) {
      keys.add(key);
    }
  };

  addIf("product:automation", ["dispatcher", "codex", "claude", "ai workforce", "worker pool"]);
  addIf("product:dos", ["dos", "discipleship operating system", "field app", "table", "meeting"]);
  addIf("product:website", ["website", "public site", "homepage", "domain", "landing"]);
  addIf("product:operations-center", ["operations center", "command center"]);
  addIf("area:profiles", ["missionary profile", "profiles", "profile publishing"]);
  addIf("area:groups", ["group", "groups", "community"]);
  addIf("area:giving", ["support", "giving", "financial freedom", "major gift", "donor"]);
  addIf("area:communications", ["communication", "newsletter", "resend", "email"]);
  addIf("area:database", ["supabase", "migration", "rls", "schema"]);

  return [...keys].sort();
}

function inferResourceClass(issue, config) {
  const text = issueText(issue).toLowerCase();
  return config.resources.heavyBuildMarkers.some((marker) => text.includes(marker.toLowerCase()))
    ? "build"
    : "standard";
}

function laneFor(issue, config) {
  const labels = labelSetFor(issue);
  if (config.routing.productionTrackLabels.some((label) => labels.has(label))) {
    return "production";
  }
  if (config.routing.fastTrackLabels.some((label) => labels.has(label))) {
    return "fast_track";
  }
  return "standard";
}

function pathOverlaps(a, b, usePrefixes) {
  if (a === b) {
    return true;
  }

  if (!usePrefixes) {
    return false;
  }

  return a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function changedFilesFromGitStatus(status) {
  return status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

function sanitizeLock(lock, unsafeStatus = false) {
  const output = {};
  for (const [key, value] of Object.entries(lock)) {
    if (safeStatusKeys.has(key) || unsafeStatus) {
      output[key] = value;
    }
  }
  return output;
}

function sanitizeReason(reason) {
  return String(reason || "unknown").replace(/\/Users\/[^`\s]+/g, "[path]");
}

function createFixtureLinear(config, jsonLog) {
  const fixturePath = resolve(config.rootDir, config.linear.fixturePath || "fixtures/linear-issues.json");
  let fixture = existsSync(fixturePath) ? readJson(fixturePath) : { issues: [] };

  function saveFixture() {
    mkdirSync(dirname(fixturePath), { recursive: true });
    writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
  }

  return {
    async listCandidateIssues() {
      return fixture.issues.filter((issue) => {
        const labels = labelSetFor(issue);
        return issue.state?.name === config.linear.statusTodo
          && labels.has(config.linear.labelReadyForDispatcher);
      });
    },
    async updateIssueState(issue, stateName) {
      const target = fixture.issues.find((item) => item.id === issue.id || item.identifier === issue.identifier);
      if (target) {
        target.state = { ...(target.state || {}), name: stateName };
        target.updatedAt = isoNow();
        saveFixture();
      }
      jsonLog("linear_state_updated", { issue: issue.identifier, state: stateName, fixture: true });
    },
    async postIssueComment(issue, body) {
      fixture.comments ||= [];
      fixture.comments.push({
        at: isoNow(),
        body,
        issue: issue.identifier,
      });
      saveFixture();
      jsonLog("linear_comment_recorded", { issue: issue.identifier, fixture: true });
    },
    async countReviewQueue() {
      return fixture.issues.filter((issue) => issue.state?.name === config.linear.statusInReview).length;
    },
  };
}

function createLinearClient(config, jsonLog) {
  if (config.linear.backend === "fixture" || config.linear.fixturePath) {
    return createFixtureLinear(config, jsonLog);
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
      state: { name: { eq: "Todo" } }
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
      priority
      priorityLabel
      state { name type }
      labels { nodes { name } }
    }
  }
}`;

  const reviewQueueQuery = `
query DispatcherReviewQueue($teamKey: String!, $first: Int!, $stateName: String!) {
  issues(
    first: $first
    filter: {
      team: { key: { eq: $teamKey } }
      state: { name: { eq: $stateName } }
    }
  ) {
    nodes { id }
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

  return {
    async listCandidateIssues() {
      const data = await linearGraphql(issuesQuery, {
        first: config.linear.pollFirst,
        teamKey: config.linear.teamKey,
      });

      return data.issues.nodes;
    },
    async updateIssueState(issue, stateName) {
      const stateId = await getWorkflowStateId(stateName);
      await linearGraphql(issueUpdateMutation, {
        id: issue.id,
        input: { stateId },
      });
      jsonLog("linear_state_updated", { issue: issue.identifier, state: stateName });
    },
    async postIssueComment(issue, body) {
      await linearGraphql(commentMutation, {
        input: {
          body,
          issueId: issue.id,
        },
      });
      jsonLog("linear_comment_posted", { issue: issue.identifier });
    },
    async countReviewQueue() {
      const data = await linearGraphql(reviewQueueQuery, {
        first: config.queue.reviewCountFirst,
        stateName: config.linear.statusInReview,
        teamKey: config.linear.teamKey,
      });
      return data.issues.nodes.length;
    },
  };
}

export function createDispatcher(rawConfig, options = {}) {
  const config = normalizeConfig(rawConfig, options.configPath);
  const dirs = {
    control: resolveDir(config.rootDir, config.paths.control),
    locks: resolveDir(config.rootDir, config.paths.locks),
    logs: resolveDir(config.rootDir, config.paths.logs),
    state: resolveDir(config.rootDir, config.paths.state),
    tmp: resolveDir(config.rootDir, config.paths.tmp),
    worktrees: resolveDir(config.rootDir, config.paths.worktrees),
  };

  for (const dir of Object.values(dirs)) {
    mkdirSync(dir, { recursive: true });
  }
  mkdirSync(join(dirs.locks, "archive"), { recursive: true });

  const activeRuns = new Map();
  const currentHolds = [];

  function jsonLog(event, fields = {}) {
    const entry = {
      at: isoNow(),
      event,
      ...fields,
    };
    const line = `${JSON.stringify(entry)}\n`;
    writeFileSync(join(dirs.logs, `dispatcher-${dateStamp()}.jsonl`), line, { flag: "a" });
    if (options.logToStdout !== false) {
      process.stdout.write(line);
    }
  }

  const linear = createLinearClient(config, jsonLog);

  function writeState(name, value) {
    writeFileSync(join(dirs.state, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
  }

  function lockPath(identifier) {
    return join(dirs.locks, `${safeIssueFile(identifier)}.json`);
  }

  function readLocks() {
    return readdirSync(dirs.locks)
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const path = join(dirs.locks, file);
        try {
          return { file, path, lock: readJson(path) };
        } catch (error) {
          jsonLog("lock_read_failed", { file, error: error.message });
          return null;
        }
      })
      .filter(Boolean);
  }

  function isActiveLock(lock) {
    if (!activeStatuses.has(lock.status)) {
      return false;
    }

    const heartbeat = Date.parse(lock.heartbeatAt || lock.createdAt || 0);
    if (!Number.isFinite(heartbeat)) {
      return true;
    }

    return Date.now() - heartbeat < config.lockStaleAfterMs;
  }

  function isBlockingLock(lock) {
    return isActiveLock(lock) || blockingStatuses.has(lock.status);
  }

  function updateLock(lockPathValue, patch) {
    const current = readJson(lockPathValue);
    const next = {
      ...current,
      ...patch,
      heartbeatAt: isoNow(),
    };
    writeFileSync(lockPathValue, `${JSON.stringify(next, null, 2)}\n`);
    return next;
  }

  function recoverStaleLocks() {
    for (const item of readLocks()) {
      if (!activeStatuses.has(item.lock.status)) {
        continue;
      }

      const worktreeMissing = item.lock.worktreePath && !existsSync(item.lock.worktreePath);
      if (isActiveLock(item.lock) && !worktreeMissing) {
        continue;
      }

      const recovered = {
        ...item.lock,
        crashedAt: isoNow(),
        heartbeatAt: isoNow(),
        note: worktreeMissing
          ? "Recovered by dispatcher startup because the worktree was missing."
          : "Recovered by dispatcher startup because heartbeat was stale.",
        status: "crashed",
      };
      writeFileSync(item.path, `${JSON.stringify(recovered, null, 2)}\n`);
      jsonLog("lock_recovered", { issue: item.lock.identifier, runner: item.lock.runner });
    }
  }

  function pauseFile(runner) {
    return join(dirs.control, `${runner}.pause`);
  }

  function isPaused(runner) {
    if (config.pauses?.global || existsSync(pauseFile("global"))) {
      return true;
    }

    return Boolean(config.pauses?.[runner] || existsSync(pauseFile(runner)));
  }

  function activeRunnerCount(runner) {
    return readLocks().filter((item) => item.lock.runner === runner && isActiveLock(item.lock)).length;
  }

  function activeGlobalCount() {
    return readLocks().filter((item) => isActiveLock(item.lock)).length;
  }

  function activeBuildCount() {
    const locks = readLocks().filter((item) => isActiveLock(item.lock));
    if (config.resources.activeBuildMode === "activeWorkers") {
      return locks.length;
    }

    return locks.filter((item) => item.lock.resourceClass === "build").length;
  }

  function completedIssueSet() {
    return new Set(readLocks().filter((item) => item.lock.status === "completed").map((item) => item.lock.identifier));
  }

  async function runCommand(command, args, optionsForCommand = {}) {
    const {
      cwd = config.rootDir,
      env = {},
      input = "",
      onFirstOutput = null,
      timeoutMs = config.runnerTimeoutMs,
    } = optionsForCommand;

    return new Promise((resolvePromise) => {
      const child = spawn(command, args, {
        cwd,
        env: {
          ...process.env,
          NO_COLOR: "1",
          TERM: process.env.TERM || "xterm-256color",
          ...env,
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let firstOutputSeen = false;
      const markFirstOutput = () => {
        if (!firstOutputSeen) {
          firstOutputSeen = true;
          onFirstOutput?.();
        }
      };
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 5000).unref();
      }, timeoutMs);

      child.stdout.on("data", (chunk) => {
        markFirstOutput();
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        markFirstOutput();
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

  async function worktreeChangedPaths(lock) {
    if (!config.conflicts.useWorktreeStatus || !lock.worktreePath || !existsSync(lock.worktreePath)) {
      return [];
    }

    const result = await runCommand("git", ["status", "--short"], {
      cwd: lock.worktreePath,
      timeoutMs: 30000,
    });

    return result.code === 0 ? changedFilesFromGitStatus(result.stdout) : [];
  }

  async function hasConflict(classification) {
    for (const item of readLocks()) {
      if (!isActiveLock(item.lock)) {
        continue;
      }

      const activePaths = new Set([
        ...(item.lock.expectedPaths || []),
        ...(item.lock.touchedPaths || []),
        ...(await worktreeChangedPaths(item.lock)),
      ]);
      const candidatePaths = classification.expectedPaths || [];
      const overlap = candidatePaths.filter((candidatePath) => (
        [...activePaths].some((activePath) => pathOverlaps(candidatePath, activePath, config.conflicts.usePathPrefixes))
      ));

      if (overlap.length) {
        return {
          issue: item.lock.identifier,
          kind: "path",
          overlap,
        };
      }

      if (config.conflicts.useConflictKeys && (!candidatePaths.length || !activePaths.size)) {
        const candidateKeys = classification.conflictKeys || [];
        const activeKeys = item.lock.conflictKeys || [];
        const keyOverlap = candidateKeys.filter((key) => activeKeys.includes(key));
        if (keyOverlap.length) {
          return {
            issue: item.lock.identifier,
            kind: "metadata",
            overlap: keyOverlap,
          };
        }
      }
    }

    return null;
  }

  async function resourceSnapshot() {
    const cpus = (() => {
      try {
        return os.cpus()?.length || null;
      } catch {
        return null;
      }
    })();
    const loadAvg1 = os.loadavg()[0] || 0;
    const freeMemoryMb = Math.round(os.freemem() / 1024 / 1024);
    const totalMemoryMb = Math.round(os.totalmem() / 1024 / 1024);
    const buildCount = activeBuildCount();
    let availableMemoryMb = null;
    let compressedMemoryMb = null;
    let memorySource = "node";
    let freeDiskGb = null;
    let diskCapacityPercent = null;

    try {
      const result = await runCommand("vm_stat", [], {
        cwd: config.rootDir,
        timeoutMs: 10000,
      });
      if (result.code === 0) {
        const pageSize = Number(result.stdout.match(/page size of (\d+) bytes/)?.[1]);
        const pageValue = (label) => {
          const match = result.stdout.match(new RegExp(`${label}:\\s+([0-9]+)\\.`));
          return Number(match?.[1] || 0);
        };
        if (Number.isFinite(pageSize) && pageSize > 0) {
          const availablePages = pageValue("Pages free") + pageValue("Pages inactive") + pageValue("Pages speculative");
          availableMemoryMb = Math.round((availablePages * pageSize) / 1024 / 1024);
          compressedMemoryMb = Math.round((pageValue("Pages occupied by compressor") * pageSize) / 1024 / 1024);
          memorySource = "vm_stat";
        }
      }
    } catch {
      availableMemoryMb = null;
    }

    try {
      const result = await runCommand("df", ["-k", config.resources.diskPath || config.rootDir], {
        cwd: config.rootDir,
        timeoutMs: 10000,
      });
      if (result.code === 0) {
        const lines = result.stdout.trim().split("\n");
        const columns = lines.at(-1)?.split(/\s+/) || [];
        const availableKb = Number(columns[3]);
        const capacity = columns[4];
        if (Number.isFinite(availableKb)) {
          freeDiskGb = Math.round((availableKb / 1024 / 1024) * 10) / 10;
        }
        if (capacity?.endsWith("%")) {
          diskCapacityPercent = Number(capacity.slice(0, -1));
        }
      }
    } catch {
      freeDiskGb = null;
    }

    return {
      activeBuildCount: buildCount,
      availableMemoryMb: availableMemoryMb ?? freeMemoryMb,
      compressedMemoryMb,
      cpuCount: cpus,
      diskCapacityPercent,
      freeDiskGb,
      freeMemoryMb,
      loadAvg1: Math.round(loadAvg1 * 100) / 100,
      loadPerCpu: cpus ? Math.round((loadAvg1 / cpus) * 100) / 100 : null,
      memorySource,
      totalMemoryMb,
    };
  }

  async function resourceHoldReason() {
    if (!config.resources.enabled) {
      return null;
    }

    const snapshot = await resourceSnapshot();
    const reasons = [];
    if (config.resources.maxLoadAvg1 && snapshot.loadAvg1 > config.resources.maxLoadAvg1) {
      reasons.push(`load average ${snapshot.loadAvg1} exceeds ${config.resources.maxLoadAvg1}`);
    }
    if (config.resources.maxLoadPerCpu && snapshot.loadPerCpu !== null && snapshot.loadPerCpu > config.resources.maxLoadPerCpu) {
      reasons.push(`load per CPU ${snapshot.loadPerCpu} exceeds ${config.resources.maxLoadPerCpu}`);
    }
    if (config.resources.minFreeMemoryMb && snapshot.availableMemoryMb < config.resources.minFreeMemoryMb) {
      reasons.push(`available memory ${snapshot.availableMemoryMb} MB below ${config.resources.minFreeMemoryMb} MB`);
    }
    if (config.resources.minFreeDiskGb && snapshot.freeDiskGb !== null && snapshot.freeDiskGb < config.resources.minFreeDiskGb) {
      reasons.push(`free disk ${snapshot.freeDiskGb} GB below ${config.resources.minFreeDiskGb} GB`);
    }
    if (config.resources.maxActiveBuilds !== null && snapshot.activeBuildCount >= config.resources.maxActiveBuilds) {
      reasons.push(`active build count ${snapshot.activeBuildCount} at limit ${config.resources.maxActiveBuilds}`);
    }

    return reasons.length ? { reasons, snapshot } : null;
  }

  function classifyIssue(issue) {
    const labels = labelSetFor(issue);
    const hasCodex = labels.has(config.linear.labelReadyForCodex);
    const hasClaude = labels.has(config.linear.labelReadyForClaude);
    const blocked = config.linear.blockedLabels.filter((label) => labels.has(label));
    const existingIssueLock = readLocks().find((item) => item.lock.identifier === issue.identifier && isBlockingLock(item.lock));
    const dependencies = extractDependencyRefs(issueText(issue));
    const completed = completedIssueSet();
    const unresolvedDependencies = dependencies.filter((identifier) => !completed.has(identifier));

    if (issue.state?.name !== config.linear.statusTodo) {
      return { eligible: false, reason: `state is ${issue.state?.name || "unknown"}` };
    }
    if (!labels.has(config.linear.labelReadyForDispatcher)) {
      return { eligible: false, reason: "missing Ready for Dispatcher" };
    }
    if (hasCodex === hasClaude) {
      return { eligible: false, reason: hasCodex ? "both runner labels present" : "missing runner label" };
    }
    if (blocked.length) {
      return { eligible: false, reason: `blocked labels present: ${blocked.join(", ")}` };
    }
    if (!issue.description || issue.description.trim().length < 20) {
      return { eligible: false, reason: "scope is too thin" };
    }
    if (existingIssueLock) {
      return { eligible: false, reason: `${existingIssueLock.lock.status} lock exists` };
    }
    if (unresolvedDependencies.length) {
      return { eligible: false, reason: `unresolved dependencies: ${unresolvedDependencies.join(", ")}` };
    }

    const runner = hasCodex ? "codex" : "claude";
    return {
      conflictKeys: inferConflictKeys(issue),
      eligible: true,
      expectedPaths: extractMentionedPaths(issueText(issue)),
      lane: laneFor(issue, config),
      resourceClass: inferResourceClass(issue, config),
      runner,
    };
  }

  function archiveLock(path, existing) {
    const archivePath = join(dirs.locks, "archive", `${basename(path)}.${Date.now()}.${existing.status || "old"}`);
    renameSync(path, archivePath);
  }

  function acquireLock(issue, classification) {
    const path = lockPath(issue.identifier);
    if (existsSync(path)) {
      const existing = readJson(path);
      if (isBlockingLock(existing)) {
        return null;
      }
      archiveLock(path, existing);
    }

    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const branch = `${config.git.branchPrefix}/${issue.identifier.toLowerCase()}-${classification.runner}-${timestamp}`;
    const worktreePath = join(dirs.worktrees, `${issue.identifier.toLowerCase()}-${classification.runner}-${timestamp}`);
    if (existsSync(worktreePath)) {
      return null;
    }

    const lock = {
      attempts: 0,
      baseRef: config.git.baseRef,
      branch,
      conflictKeys: classification.conflictKeys,
      createdAt: isoNow(),
      expectedPaths: classification.expectedPaths,
      heartbeatAt: isoNow(),
      id: issue.id,
      identifier: issue.identifier,
      issueCreatedAt: issue.createdAt,
      issueUpdatedAt: issue.updatedAt,
      lane: classification.lane,
      resourceClass: classification.resourceClass,
      runner: classification.runner,
      status: "claimed",
      title: issue.title,
      url: issue.url,
      worktreePath,
    };

    const fd = openSync(path, "wx");
    try {
      writeFileSync(fd, `${JSON.stringify(lock, null, 2)}\n`);
    } finally {
      closeSync(fd);
    }
    return { lock, path };
  }

  async function createWorktree(lock, lockPathValue) {
    mkdirSync(dirname(lock.worktreePath), { recursive: true });
    if (config.git.fetchBeforeWorktree) {
      await git(["fetch", "origin"], config.git.repositoryPath, 120000);
    }
    await git(["worktree", "add", "-b", lock.branch, lock.worktreePath, config.git.baseRef], config.git.repositoryPath, 120000);
    const baseCommit = await git(["rev-parse", "HEAD"], lock.worktreePath, 30000);
    return updateLock(lockPathValue, {
      baseCommit,
      status: "running",
      worktreeCreatedAt: isoNow(),
    });
  }

  function buildPrompt(issue, lock) {
    const lane = lock.runner === "codex"
      ? "Codex engineering and validation lane"
      : "Claude Code product-experience lane";

    return [
      `You are running from the USAM automatic Linear dispatcher in the ${lane}.`,
      "",
      "Hard rules:",
      "- Work only in this isolated worktree.",
      "- Do not merge, push, deploy, change DNS, change production database/schema, send external communications, or touch unrelated worktrees.",
      "- Keep the smallest complete implementation that satisfies the Linear issue.",
      "- Preserve existing repo patterns and AGENTS.md instructions.",
      "- At the end, report changed files, validation commands, risks, and whether founder approval is still required.",
      "- Avoid dependency installs and full builds unless the issue truly requires them; prefer targeted validation first.",
      "",
      `Linear issue: ${issue.identifier} - ${issue.title}`,
      `URL: ${issue.url}`,
      "",
      issue.description || "",
    ].join("\n");
  }

  function runnerInvocation(runner, worktreePath, outputPath, prompt, issue) {
    const runnerConfig = config.runners[runner];
    if (!runnerConfig?.command) {
      throw new Error(`Runner command is not configured for ${runner}`);
    }

    const protocol = runnerConfig.protocol || runner;
    if (protocol === "codex") {
      return {
        args: [
          ...(runnerConfig.args || []),
          "--cd",
          worktreePath,
          "--output-last-message",
          outputPath,
          "-",
        ],
        command: runnerConfig.command,
        cwd: worktreePath,
        env: runnerConfig.env || {},
        input: prompt,
      };
    }

    if (protocol === "claude") {
      return {
        args: [
          ...(runnerConfig.args || []),
          "--debug-file",
          join(dirs.logs, `claude-${dateStamp()}.debug.log`),
          prompt,
        ],
        command: runnerConfig.command,
        cwd: worktreePath,
        env: runnerConfig.env || {},
        input: "",
      };
    }

    if (protocol === "argv") {
      return {
        args: [...(runnerConfig.args || []), prompt],
        command: runnerConfig.command,
        cwd: worktreePath,
        env: runnerConfig.env || {},
        input: "",
      };
    }

    return {
      args: runnerConfig.args || [],
      command: runnerConfig.command,
      cwd: worktreePath,
      env: {
        ...(runnerConfig.env || {}),
        DISPATCHER_ISSUE_IDENTIFIER: issue.identifier,
        DISPATCHER_OUTPUT_PATH: outputPath,
        DISPATCHER_RUNNER: runner,
        DISPATCHER_WORKTREE: worktreePath,
      },
      input: prompt,
    };
  }

  function startHeartbeat(lockPathValue) {
    const timer = setInterval(() => {
      try {
        const current = readJson(lockPathValue);
        if (!activeStatuses.has(current.status)) {
          clearInterval(timer);
          return;
        }
        updateLock(lockPathValue, { heartbeatAt: isoNow() });
      } catch (error) {
        jsonLog("heartbeat_failed", { error: error.message });
      }
    }, config.heartbeatIntervalMs);
    timer.unref?.();
    return () => clearInterval(timer);
  }

  async function runAgent(issue, lock, lockPathValue, attempt) {
    const prompt = buildPrompt(issue, lock);
    const promptPath = join(dirs.tmp, `${safeIssueFile(issue.identifier)}-${lock.runner}-prompt.txt`);
    const outputPath = join(dirs.tmp, `${safeIssueFile(issue.identifier)}-${lock.runner}-last-message.txt`);
    writeFileSync(promptPath, prompt);
    const invocation = runnerInvocation(lock.runner, lock.worktreePath, outputPath, prompt, issue);
    jsonLog("runner_start", {
      attempt,
      issue: issue.identifier,
      protocol: config.runners[lock.runner]?.protocol || lock.runner,
      runner: lock.runner,
    });
    updateLock(lockPathValue, {
      attempts: attempt,
      lastAttemptAt: isoNow(),
      promptPath,
      runnerStartedAt: isoNow(),
      status: attempt > 1 ? "retrying" : "running",
    });

    let firstOutputRecorded = false;
    const stopHeartbeat = startHeartbeat(lockPathValue);
    const result = await runCommand(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      env: invocation.env,
      input: invocation.input,
      onFirstOutput: () => {
        if (firstOutputRecorded) {
          return;
        }
        firstOutputRecorded = true;
        updateLock(lockPathValue, { firstOutputAt: isoNow() });
        jsonLog("runner_first_output", { attempt, issue: issue.identifier, runner: lock.runner });
      },
      timeoutMs: config.runnerTimeoutMs,
    });
    stopHeartbeat();

    const stdoutPath = join(dirs.logs, `${safeIssueFile(issue.identifier)}-${lock.runner}-attempt-${attempt}.stdout.log`);
    const stderrPath = join(dirs.logs, `${safeIssueFile(issue.identifier)}-${lock.runner}-attempt-${attempt}.stderr.log`);
    writeFileSync(stdoutPath, result.stdout || "");
    writeFileSync(stderrPath, result.stderr || "");
    updateLock(lockPathValue, {
      lastExitCode: result.code,
      lastSignal: result.signal,
      stderrPath,
      stdoutPath,
      timedOut: result.timedOut,
    });
    jsonLog("runner_exit", {
      attempt,
      code: result.code,
      issue: issue.identifier,
      runner: lock.runner,
      signal: result.signal,
      timedOut: result.timedOut,
    });

    return {
      ...result,
      outputPath: existsSync(outputPath) ? outputPath : stdoutPath,
      stderrPath,
      stdoutPath,
    };
  }

  async function gitSummary(worktreePath) {
    const status = await git(["status", "--short"], worktreePath, 30000);
    const diffStat = await git(["diff", "--stat"], worktreePath, 30000).catch((error) => `diff stat failed: ${error.message}`);
    const changedFiles = changedFilesFromGitStatus(status);
    return { changedFiles, diffStat, status };
  }

  function tailText(path, maxChars = 4000) {
    if (!path || !existsSync(path)) {
      return "";
    }

    const text = readFileSync(path, "utf8");
    return text.length > maxChars ? text.slice(-maxChars) : text;
  }

  async function processIssue(issue, lock, lockPathValue) {
    try {
      lock = await createWorktree(lock, lockPathValue);
      await linear.updateIssueState(issue, config.linear.statusInProgress);
      await linear.postIssueComment(issue, [
        "Dispatcher pickup started.",
        "",
        `Runner: ${lock.runner}`,
        `Branch: \`${lock.branch}\``,
        `Base: \`${config.git.baseRef}\` (${lock.baseCommit})`,
        `Lane: ${lock.lane}`,
        `Test mode: ${config.testMode ? "on" : "off"}`,
        "",
        "Safety: no merge, push, deploy, DNS, production database, financial/legal, or non-Linear external communication actions are allowed.",
      ].join("\n"));

      let result = null;
      const maxAttempts = Math.max(1, config.maxRetries + 1);
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        result = await runAgent(issue, lock, lockPathValue, attempt);
        if (result.code === 0 && !result.timedOut) {
          break;
        }

        if (attempt < maxAttempts) {
          await linear.postIssueComment(issue, `Dispatcher runner attempt ${attempt} failed${result.timedOut ? " by timeout" : ""}. Retrying once in the same isolated worktree.`);
        }
      }

      const summary = await gitSummary(lock.worktreePath);
      const finalText = tailText(result.outputPath);

      if (result.code === 0 && !result.timedOut) {
        updateLock(lockPathValue, {
          completedAt: isoNow(),
          status: "completed",
          touchedPaths: summary.changedFiles,
        });
        await linear.postIssueComment(issue, [
          "Dispatcher runner completed successfully.",
          "",
          `Runner: ${lock.runner}`,
          `Branch: \`${lock.branch}\``,
          `Changed files: ${summary.changedFiles.length ? summary.changedFiles.map((file) => `\`${file}\``).join(", ") : "none reported by git status"}`,
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
          "No merge, push, deploy, DNS, production database, or external communication action was performed.",
        ].join("\n"));
        await linear.updateIssueState(issue, config.linear.statusInReview);
        jsonLog("issue_completed", { issue: issue.identifier, runner: lock.runner });
        return;
      }

      updateLock(lockPathValue, { failedAt: isoNow(), status: "failed" });
      await linear.postIssueComment(issue, [
        `Dispatcher runner failed after ${Math.max(1, config.maxRetries + 1)} attempt(s).`,
        "",
        `Runner: ${lock.runner}`,
        `Branch: \`${lock.branch}\``,
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
      await linear.updateIssueState(issue, config.linear.statusTodo);
      jsonLog("issue_failed", { code: result.code, issue: issue.identifier, runner: lock.runner, timedOut: result.timedOut });
    } catch (error) {
      updateLock(lockPathValue, { error: error.message, failedAt: isoNow(), status: "failed" });
      jsonLog("issue_error", { error: error.message, issue: issue.identifier, runner: lock.runner });
      try {
        await linear.postIssueComment(issue, `Dispatcher failed before completion.\n\n\`\`\`text\n${error.message}\n\`\`\``);
        await linear.updateIssueState(issue, config.linear.statusTodo);
      } catch (commentError) {
        jsonLog("issue_error_comment_failed", { error: commentError.message, issue: issue.identifier });
      }
    } finally {
      activeRuns.delete(issue.identifier);
      jsonLog("worker_slot_freed", { issue: issue.identifier, runner: lock.runner });
    }
  }

  function recordHold(issue, reason, details = {}) {
    const hold = {
      at: isoNow(),
      details,
      issue: issue.identifier,
      reason: sanitizeReason(reason),
      runner: details.runner || null,
    };
    currentHolds.push(hold);
    jsonLog("issue_held", hold);
  }

  async function reviewQueueHold() {
    const ceiling = config.queue.reviewCeiling;
    if (ceiling === null || ceiling === undefined) {
      return null;
    }
    const count = await linear.countReviewQueue();
    return count >= ceiling ? { count, ceiling } : null;
  }

  function sortCandidates(issues) {
    const urgentLabels = new Set(config.queue.urgentLabels);
    return [...issues].sort((a, b) => {
      const aUrgent = labelsFor(a).some((label) => urgentLabels.has(label)) ? 1 : 0;
      const bUrgent = labelsFor(b).some((label) => urgentLabels.has(label)) ? 1 : 0;
      if (aUrgent !== bUrgent) {
        return bUrgent - aUrgent;
      }

      const aPriority = Number(a.priority ?? 0);
      const bPriority = Number(b.priority ?? 0);
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0);
    });
  }

  async function handleIssue(issue, classification) {
    if (isPaused(classification.runner)) {
      recordHold(issue, "runner paused", { runner: classification.runner });
      return false;
    }

    const reviewHold = await reviewQueueHold();
    if (reviewHold) {
      recordHold(issue, "review queue ceiling reached", {
        reviewCount: reviewHold.count,
        reviewCeiling: reviewHold.ceiling,
        runner: classification.runner,
      });
      return false;
    }

    const resourceHold = await resourceHoldReason();
    if (resourceHold) {
      recordHold(issue, `resource pressure: ${resourceHold.reasons.join("; ")}`, {
        resources: resourceHold.snapshot,
        runner: classification.runner,
      });
      return false;
    }

    const workerCount = activeRunnerCount(classification.runner);
    if (workerCount >= config.maxWorkers[classification.runner]) {
      recordHold(issue, "runner capacity full", {
        runner: classification.runner,
        workerCount,
        workerLimit: config.maxWorkers[classification.runner],
      });
      return false;
    }

    const globalCount = activeGlobalCount();
    if (globalCount >= config.concurrency.globalMax) {
      recordHold(issue, "global capacity full", {
        globalCount,
        globalLimit: config.concurrency.globalMax,
        runner: classification.runner,
      });
      return false;
    }

    const conflict = await hasConflict(classification);
    if (conflict) {
      recordHold(issue, `conflict with ${conflict.issue}`, {
        conflict,
        runner: classification.runner,
      });
      return false;
    }

    const acquired = acquireLock(issue, classification);
    if (!acquired) {
      recordHold(issue, "issue lock or worktree already exists", { runner: classification.runner });
      return false;
    }

    const lock = acquired.lock;
    const lockPathValue = acquired.path;
    jsonLog("issue_claimed", { issue: issue.identifier, runner: lock.runner });
    const promise = processIssue(issue, lock, lockPathValue);
    activeRuns.set(issue.identifier, promise);
    return true;
  }

  async function pollOnce() {
    recoverStaleLocks();
    currentHolds.length = 0;

    if (isPaused("codex") && isPaused("claude")) {
      jsonLog("poll_skipped_paused");
      writeState("queue-holds", {
        at: isoNow(),
        held: [],
        reason: "global pause active",
      });
      return { started: 0 };
    }

    const issues = sortCandidates(await linear.listCandidateIssues());
    writeState("last-poll", {
      active: activeGlobalCount(),
      at: isoNow(),
      candidateCount: issues.length,
      configuredGlobalMax: config.concurrency.globalMax,
    });
    jsonLog("poll_candidates", {
      active: activeGlobalCount(),
      count: issues.length,
      globalMax: config.concurrency.globalMax,
    });

    let started = 0;
    for (const issue of issues) {
      const classification = classifyIssue(issue);
      if (!classification.eligible) {
        recordHold(issue, classification.reason);
        continue;
      }

      const didStart = await handleIssue(issue, classification);
      if (didStart) {
        started += 1;
      }
    }

    writeState("queue-holds", {
      at: isoNow(),
      held: currentHolds,
    });
    return { started };
  }

  async function waitForAnyWorkerOrDelay(delayMs) {
    if (!activeRuns.size) {
      await sleep(delayMs);
      return;
    }

    await Promise.race([
      sleep(delayMs),
      Promise.race([...activeRuns.values()].map((promise) => promise.catch(() => null))),
    ]);
  }

  async function waitForWorkers() {
    while (activeRuns.size) {
      await Promise.race([...activeRuns.values()].map((promise) => promise.catch(() => null)));
    }
  }

  async function drainQueueUntilIdle() {
    while (true) {
      if (activeRuns.size) {
        await waitForWorkers();
      }
      const result = await pollOnce();
      if (!result.started) {
        break;
      }
    }
  }

  async function dispatcherStatus(unsafeStatus = false) {
    const locks = readLocks().map((item) => ({
      ...sanitizeLock(item.lock, unsafeStatus),
      active: isActiveLock(item.lock),
    }));
    const active = locks.filter((lock) => lock.active);
    const queueHoldsPath = join(dirs.state, "queue-holds.json");
    const lastPollPath = join(dirs.state, "last-poll.json");
    const resources = await resourceSnapshot();
    const recentFailures = locks
      .filter((lock) => ["failed", "crashed"].includes(lock.status))
      .slice(-10)
      .map((lock) => ({
        at: lock.failedAt || lock.crashedAt || lock.heartbeatAt || lock.createdAt,
        attempts: lock.attempts,
        issue: lock.identifier,
        runner: lock.runner,
        status: lock.status,
      }));

    const status = {
      config: {
        globalMax: config.concurrency.globalMax,
        maxWorkers: config.maxWorkers,
        reviewCeiling: config.queue.reviewCeiling,
        testMode: config.testMode,
      },
      linearApiConfigured: Boolean(process.env.LINEAR_API_KEY) || config.linear.backend === "fixture",
      paused: {
        global: isPaused("codex") && isPaused("claude"),
        codex: isPaused("codex"),
        claude: isPaused("claude"),
      },
      resources,
      runners: Object.fromEntries(runnerNames.map((runner) => [
        runner,
        {
          active: active.filter((lock) => lock.runner === runner).length,
          assignments: active
            .filter((lock) => lock.runner === runner)
            .map((lock) => ({
              attempts: lock.attempts,
              issue: lock.identifier,
              lane: lock.lane,
              resourceClass: lock.resourceClass,
              startedAt: lock.runnerStartedAt || lock.createdAt,
              status: lock.status,
            })),
          limit: config.maxWorkers[runner],
        },
      ])),
      totals: {
        active: active.length,
        configuredGlobalMax: config.concurrency.globalMax,
        locks: locks.length,
      },
      queue: {
        holds: existsSync(queueHoldsPath) ? readJson(queueHoldsPath).held || [] : [],
        lastPoll: existsSync(lastPollPath) ? readJson(lastPollPath) : null,
        queueDepth: existsSync(lastPollPath) ? readJson(lastPollPath).candidateCount ?? null : null,
      },
      recentFailures,
      recentRetries: locks
        .filter((lock) => Number(lock.attempts || 0) > 1)
        .slice(-10)
        .map((lock) => ({
          attempts: lock.attempts,
          issue: lock.identifier,
          runner: lock.runner,
          status: lock.status,
        })),
      timings: locks
        .filter((lock) => lock.createdAt)
        .slice(-20)
        .map((lock) => {
          const createdAt = Date.parse(lock.createdAt || 0);
          const issueCreatedAt = Date.parse(lock.issueCreatedAt || 0);
          const runnerStartedAt = Date.parse(lock.runnerStartedAt || 0);
          const firstOutputAt = Date.parse(lock.firstOutputAt || 0);
          const completedAt = Date.parse(lock.completedAt || 0);
          return {
            issue: lock.identifier,
            runner: lock.runner,
            status: lock.status,
            timeToPickupMs: Number.isFinite(createdAt) && Number.isFinite(issueCreatedAt)
              ? createdAt - issueCreatedAt
              : null,
            timeToFirstOutputMs: Number.isFinite(firstOutputAt) && Number.isFinite(runnerStartedAt)
              ? firstOutputAt - runnerStartedAt
              : null,
            timeToInReviewMs: Number.isFinite(completedAt) && Number.isFinite(createdAt)
              ? completedAt - createdAt
              : null,
          };
        }),
    };

    if (unsafeStatus) {
      status.paths = dirs;
      status.configPath = config.configPath;
      status.rootDir = config.rootDir;
    }

    return status;
  }

  async function main(args = {}) {
    if (args.statusOnly) {
      process.stdout.write(`${JSON.stringify(await dispatcherStatus(args.unsafeStatus), null, 2)}\n`);
      return;
    }

    const startedAt = Date.now();
    jsonLog("dispatcher_start", {
      configPath: config.configPath,
      globalMax: config.concurrency.globalMax,
      once: Boolean(args.once),
      testMode: config.testMode,
    });

    while (true) {
      let nextDelayMs = config.pollIntervalMs;
      try {
        await pollOnce();
      } catch (error) {
        jsonLog("poll_error", { code: error.code || null, error: error.message });
        if (args.once && error.code === "MISSING_LINEAR_API_KEY") {
          process.exitCode = 2;
        }
        if (!args.once && error.code === "MISSING_LINEAR_API_KEY") {
          nextDelayMs = config.credentialRetryMs || config.pollIntervalMs;
        }
      }

      if (args.once) {
        if (args.drainQueue) {
          await drainQueueUntilIdle();
        } else {
          await waitForWorkers();
        }
        break;
      }

      if (args.maxRuntimeMs && Date.now() - startedAt >= args.maxRuntimeMs) {
        jsonLog("dispatcher_max_runtime_reached", { maxRuntimeMs: args.maxRuntimeMs });
        await waitForWorkers();
        break;
      }

      await waitForAnyWorkerOrDelay(config.concurrency.refillOnWorkerExit ? nextDelayMs : config.pollIntervalMs);
    }
  }

  return {
    classifyIssue,
    config,
    dirs,
    dispatcherStatus,
    main,
    pollOnce,
    readLocks,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  const args = parseArgs(process.argv.slice(2));
  const rawConfig = readJson(args.configPath);
  const dispatcher = createDispatcher(rawConfig, { configPath: args.configPath });

  dispatcher.main(args).catch((error) => {
    const line = `${JSON.stringify({ at: isoNow(), event: "dispatcher_fatal", error: error.message, stack: error.stack })}\n`;
    process.stderr.write(line);
    process.exitCode = 1;
  });
}
