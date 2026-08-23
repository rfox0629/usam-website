import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { ERROR_CODES } from "./replacement/shared/errors.mjs";

export const DEFAULT_REPOSITORY_WRITER_LOCK_ROOT = "/Users/ryanfox/.usam-dispatcher/locks/repository-writers";
export const REPOSITORY_WRITER_LOCK_SCHEMA_VERSION = 1;
export const REPOSITORY_WRITER_HOLD_MARKER = "<!-- usam-repository-writer-hold -->";

function isoNow() {
  return new Date().toISOString();
}

export function canonicalizeRepositoryPath(repositoryPath) {
  if (!repositoryPath || typeof repositoryPath !== "string") {
    throw new Error("repositoryPath is required for repository writer locking");
  }
  const resolved = path.resolve(repositoryPath);
  try {
    return realpathSync.native(resolved);
  } catch {
    try {
      return realpathSync(resolved);
    } catch {
      return resolved;
    }
  }
}

function pathWithin(candidate, parent) {
  if (!candidate || !parent) return false;
  const child = canonicalizeRepositoryPath(candidate);
  const root = canonicalizeRepositoryPath(parent);
  return child === root || child.startsWith(`${root}${path.sep}`);
}

function safeSlug(value) {
  return String(value || "repository").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "repository";
}

export function repositoryWriterLockFileName(repositoryPath) {
  const canonicalPath = canonicalizeRepositoryPath(repositoryPath);
  const hash = createHash("sha256").update(canonicalPath).digest("hex").slice(0, 20);
  return `${safeSlug(path.basename(canonicalPath))}-${hash}.json`;
}

function writeJsonAtomic(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(tmp, file);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function emit(logger, event, fields = {}) {
  if (!logger) return;
  if (typeof logger === "function") {
    logger(event, fields);
    return;
  }
  if (logger.info) logger.info(event, fields);
}

function runnerLabel(runner) {
  return String(runner || "unknown").toLowerCase();
}

function processCommand(info) {
  return String(info?.command || info?.args || "");
}

function matchesRunner(command, runner) {
  const text = String(command || "");
  if (runnerLabel(runner) === "claude") {
    return /(^|[^\w.-])(claude|claude-code|@anthropic-ai\/claude-code)([^\w.-]|$)/i.test(text);
  }
  if (runnerLabel(runner) === "codex") {
    return /(^|[^\w.-])codex([^\w.-]|$)/i.test(text);
  }
  return false;
}

function matchesDispatcherOwner(command) {
  return /usam-automation|dispatcher\.mjs|claude-bridge|replacement\/cli\.mjs|run-replacement-dispatcher/i.test(String(command || ""));
}

function defaultPidExists(pid) {
  const numeric = Number(pid);
  if (!Number.isInteger(numeric) || numeric <= 0) return false;
  try {
    process.kill(numeric, 0);
    return true;
  } catch {
    return false;
  }
}

function defaultProcessInfo(pid) {
  try {
    const command = execFileSync("ps", ["-p", String(pid), "-ww", "-o", "command="], {
      encoding: "utf8",
      timeout: 1000,
    }).trim();
    const cwd = readProcessCwd(pid);
    return { command, cwd, pid: Number(pid) };
  } catch {
    return null;
  }
}

function readProcessCwd(pid) {
  try {
    const out = execFileSync("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], {
      encoding: "utf8",
      timeout: 1000,
    });
    return out.split("\n").find((line) => line.startsWith("n"))?.slice(1) || null;
  } catch {
    return null;
  }
}

function listSystemProcesses() {
  try {
    const out = execFileSync("ps", ["-axww", "-o", "pid=,ppid=,command="], {
      encoding: "utf8",
      timeout: 1500,
    });
    return out.split("\n").map((line) => {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
      if (!match) return null;
      return {
        command: match[3],
        cwd: null,
        pid: Number(match[1]),
        ppid: Number(match[2]),
      };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeProcessRecord(record) {
  return {
    command: String(record?.command || ""),
    cwd: record?.cwd || null,
    pid: Number(record?.pid),
    ppid: record?.ppid === undefined ? null : Number(record.ppid),
  };
}

function commandMentionsRepository(command, repositoryPath) {
  const text = String(command || "");
  return text.includes(repositoryPath) || text.includes(repositoryPath.replaceAll(" ", "\\ "));
}

function likelyOwnershipForProcess(command) {
  const text = String(command || "");
  if (/\bcodex\b/i.test(text)) return "manual_codex";
  if (/\bclaude\b|claude-code|@anthropic-ai\/claude-code/i.test(text)) return "manual_claude";
  if (/\b(next dev|next-server|npm run dev|pnpm dev|yarn dev|vite|astro dev)\b/i.test(text)) {
    return "development_server";
  }
  return "unknown_manual_process";
}

function looksActiveInRepository(record, repositoryPath) {
  const command = processCommand(record);
  const cwdMatches = record.cwd ? pathWithin(record.cwd, repositoryPath) : false;
  const commandMatches = commandMentionsRepository(command, repositoryPath);
  if (!cwdMatches && !commandMatches) return false;
  return /\b(claude|claude-code|codex|next dev|next-server|npm run dev|pnpm dev|yarn dev|vite|astro dev|tsx|ts-node)\b/i.test(command)
    || commandMatches;
}

export function detectManualRepositoryProcesses(repositoryPath, {
  currentPid = process.pid,
  processes = null,
} = {}) {
  const canonicalPath = canonicalizeRepositoryPath(repositoryPath);
  const source = processes ?? listSystemProcesses().map((record) => ({
    ...record,
    cwd: readProcessCwd(record.pid),
  }));
  return source
    .map(normalizeProcessRecord)
    .filter((record) => Number.isInteger(record.pid) && record.pid > 0)
    .filter((record) => record.pid !== currentPid)
    .filter((record) => !matchesDispatcherOwner(record.command))
    .filter((record) => looksActiveInRepository(record, canonicalPath))
    .map((record) => ({
      command: record.command,
      cwd: record.cwd,
      likelyOwnership: likelyOwnershipForProcess(record.command),
      pid: record.pid,
      ppid: record.ppid,
    }));
}

function lockAgeMs(lock, nowMs) {
  const time = Date.parse(lock.updatedAt || lock.startedAt || lock.createdAt || "");
  return Number.isFinite(time) ? nowMs - time : Number.POSITIVE_INFINITY;
}

function processMatchesRepositoryLock({ info, lock, pendingLaunchGraceMs, repositoryPath, nowMs }) {
  const command = processCommand(info);
  if (lock.pendingLaunch) {
    const age = lockAgeMs(lock, nowMs);
    return age <= pendingLaunchGraceMs && matchesDispatcherOwner(command);
  }
  if (String(lock.ownerPhase || "").startsWith("dispatcher") && matchesDispatcherOwner(command)) {
    return true;
  }
  if (!matchesRunner(command, lock.runner)) {
    return false;
  }
  if (info?.cwd && (pathWithin(info.cwd, lock.cwd || repositoryPath) || pathWithin(info.cwd, repositoryPath))) {
    return true;
  }
  return commandMentionsRepository(command, repositoryPath) || commandMentionsRepository(command, lock.cwd || "");
}

function validateExistingLock(lock, {
  abandonedAfterMs,
  nowMs,
  pendingLaunchGraceMs,
  pidExists,
  processInfo,
  repositoryPath,
}) {
  if (!lock || typeof lock !== "object") {
    return { valid: false, reason: "malformed_lock" };
  }
  if (lock.lockType !== "repository-writer" || lock.schemaVersion !== REPOSITORY_WRITER_LOCK_SCHEMA_VERSION) {
    return { valid: false, reason: "wrong_lock_type" };
  }
  if (!lock.repositoryPath || canonicalizeRepositoryPath(lock.repositoryPath) !== repositoryPath) {
    return { valid: false, reason: "repository_path_mismatch" };
  }
  if (lockAgeMs(lock, nowMs) > abandonedAfterMs) {
    return { valid: false, reason: "abandoned_lock" };
  }
  const pid = Number(lock.pid);
  if (!Number.isInteger(pid) || pid <= 0) {
    return { valid: false, reason: "missing_pid" };
  }
  if (!pidExists(pid)) {
    return { valid: false, reason: "pid_not_running", pid };
  }
  const info = processInfo(pid);
  if (!info) {
    return { valid: false, reason: "process_info_unavailable", pid };
  }
  if (!processMatchesRepositoryLock({ info, lock, pendingLaunchGraceMs, repositoryPath, nowMs })) {
    return { valid: false, reason: "process_mismatch", pid, process: info };
  }
  return { valid: true, process: info };
}

function archiveStaleLock(lockPath, reason) {
  const archivePath = `${lockPath}.stale-${Date.now()}-${safeSlug(reason)}`;
  try {
    renameSync(lockPath, archivePath);
    return archivePath;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export function createRepositoryWriterLockStore({
  abandonedAfterMs = 12 * 60 * 60 * 1000,
  lockRoot = process.env.USAM_REPOSITORY_LOCK_ROOT || DEFAULT_REPOSITORY_WRITER_LOCK_ROOT,
  logger = null,
  now = isoNow,
  pendingLaunchGraceMs = 2 * 60 * 1000,
  pidExists = defaultPidExists,
  processInfo = defaultProcessInfo,
  processList = null,
} = {}) {
  function lockPathFor(repositoryPath) {
    return path.join(lockRoot, repositoryWriterLockFileName(repositoryPath));
  }

  function acquire({
    branch = null,
    command = null,
    cwd = null,
    issueId,
    metadata = {},
    owner = "dispatcher",
    pendingLaunch = true,
    pid = process.pid,
    repositoryPath,
    runner,
    startedAt = now(),
  }) {
    const canonicalPath = canonicalizeRepositoryPath(repositoryPath);
    const lockPath = lockPathFor(canonicalPath);
    mkdirSync(lockRoot, { recursive: true });

    const manualProcesses = detectManualRepositoryProcesses(canonicalPath, {
      processes: processList,
    });
    if (manualProcesses.length) {
      emit(logger, "repository_manual_activity_detected", {
        count: manualProcesses.length,
        manualProcesses,
        repositoryPath: canonicalPath,
      });
    }

    for (;;) {
      if (existsSync(lockPath)) {
        let existing;
        try {
          existing = readJson(lockPath);
        } catch {
          const archivePath = archiveStaleLock(lockPath, "malformed_lock");
          emit(logger, "repository_writer_stale_lock_removed", {
            archivePath,
            reason: "malformed_lock",
            repositoryPath: canonicalPath,
          });
          continue;
        }
        const parsedNow = Date.parse(now());
        const validation = validateExistingLock(existing, {
          abandonedAfterMs,
          nowMs: Number.isFinite(parsedNow) ? parsedNow : Date.now(),
          pendingLaunchGraceMs,
          pidExists,
          processInfo,
          repositoryPath: canonicalPath,
        });
        if (validation.valid) {
          return {
            acquired: false,
            code: ERROR_CODES.REPOSITORY_WRITER_ACTIVE,
            lockPath,
            manualProcesses,
            occupant: existing,
            repositoryPath: canonicalPath,
            validation,
          };
        }
        const archivePath = archiveStaleLock(lockPath, validation.reason);
        emit(logger, "repository_writer_stale_lock_removed", {
          archivePath,
          occupant: existing,
          reason: validation.reason,
          repositoryPath: canonicalPath,
        });
        continue;
      }

      const token = randomUUID();
      const record = {
        branch,
        command,
        createdAt: startedAt,
        cwd,
        issueId,
        lockType: "repository-writer",
        metadata,
        owner,
        ownerPid: process.pid,
        pendingLaunch,
        pid,
        repositoryPath: canonicalPath,
        runner: runnerLabel(runner),
        schemaVersion: REPOSITORY_WRITER_LOCK_SCHEMA_VERSION,
        startedAt,
        token,
        updatedAt: startedAt,
      };

      let fd = null;
      try {
        fd = openSync(lockPath, "wx", 0o600);
        writeFileSync(fd, `${JSON.stringify(record, null, 2)}\n`);
        emit(logger, "repository_writer_lock_acquired", {
          branch,
          issueId,
          lockPath,
          pid,
          repositoryPath: canonicalPath,
          runner: runnerLabel(runner),
        });
        return {
          acquired: true,
          lock: record,
          lockPath,
          manualProcesses,
          repositoryPath: canonicalPath,
          token,
        };
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
      } finally {
        if (fd !== null) closeSync(fd);
      }
    }
  }

  function update(acquired, patch = {}) {
    if (!acquired?.acquired || !acquired.lockPath) return null;
    let current;
    try {
      current = readJson(acquired.lockPath);
    } catch {
      return null;
    }
    if (current.token !== acquired.token) {
      return null;
    }
    const next = {
      ...current,
      ...patch,
      pendingLaunch: patch.pendingLaunch ?? false,
      updatedAt: now(),
    };
    writeJsonAtomic(acquired.lockPath, next);
    acquired.lock = next;
    return next;
  }

  function release(acquired, { reason = "completed" } = {}) {
    if (!acquired?.acquired || !acquired.lockPath) return false;
    let current;
    try {
      current = readJson(acquired.lockPath);
    } catch {
      return false;
    }
    if (current.token !== acquired.token) {
      return false;
    }
    rmSync(acquired.lockPath, { force: true });
    emit(logger, "repository_writer_lock_released", {
      issueId: current.issueId,
      lockPath: acquired.lockPath,
      reason,
      repositoryPath: current.repositoryPath,
      runner: current.runner,
    });
    return true;
  }

  async function withLock(options, run) {
    const acquired = acquire(options);
    if (!acquired.acquired) return acquired;
    try {
      return await run(acquired);
    } finally {
      release(acquired);
    }
  }

  return {
    acquire,
    detectManualProcesses: (repositoryPath) => detectManualRepositoryProcesses(repositoryPath, { processes: processList }),
    lockPathFor,
    release,
    update,
    withLock,
  };
}

function runnerDisplayName(runner) {
  const value = runnerLabel(runner);
  if (value === "codex") return "Codex";
  if (value === "claude") return "Claude";
  return runner || "unknown";
}

export function formatRepositoryWriterBusyComment({ issueId, occupant, repositoryPath }) {
  return [
    repositoryWriterHoldMarker({ issueId, occupant }),
    "Repository writer guard queued this request.",
    "",
    `Repository: \`${repositoryPath}\``,
    `Current owner: ${occupant.issueId || "unknown issue"} via ${runnerDisplayName(occupant.runner)}`,
    `Owner PID: ${occupant.pid || "unknown"}`,
    `Owner branch: \`${occupant.branch || "unknown"}\``,
    `Owner started: ${occupant.startedAt || occupant.createdAt || "unknown"}`,
    "",
    `I did not launch a second writer for ${issueId || "this issue"}. The dispatcher will retry automatically after the repository lock is released.`,
  ].join("\n");
}

export function repositoryWriterHoldMarker({ issueId, occupant }) {
  return [
    REPOSITORY_WRITER_HOLD_MARKER,
    `issue:${issueId || "unknown"}`,
    `owner:${occupant?.issueId || "unknown"}`,
    `pid:${occupant?.pid || "unknown"}`,
    `started:${occupant?.startedAt || occupant?.createdAt || "unknown"}`,
  ].join(" ");
}

export function hasRepositoryWriterHoldComment(comments = [], { issueId, occupant } = {}) {
  const marker = repositoryWriterHoldMarker({ issueId, occupant });
  return comments.some((comment) => String(comment?.body || comment || "").includes(marker));
}

export function formatManualRepositoryActivityComment({ manualProcesses, repositoryPath }) {
  if (!manualProcesses?.length) return "";
  const lines = manualProcesses.slice(0, 5).map((process) =>
    `- PID ${process.pid}${process.ppid ? ` (PPID ${process.ppid})` : ""}: ${process.likelyOwnership}; cwd: \`${process.cwd || "unknown"}\`; command: \`${process.command}\``,
  );
  return [
    "Repository activity notice.",
    "",
    `Repository: \`${repositoryPath}\``,
    "I found non-dispatcher processes that appear to be using this repository. I will not kill unknown manual processes automatically.",
    "",
    ...lines,
  ].join("\n");
}
