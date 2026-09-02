/**
 * Job 3 — Worktree janitor.
 *
 * SAFETY IS THE ENTIRE POINT OF THIS MODULE. It reports far more than it
 * deletes. Every refusal reason is named. It will not act on any path that is
 * not inside an explicit allowlist root, and it refuses outright on protected
 * canonical paths, symlink escapes, and traversal attempts.
 */

import path from "node:path";
import { realpathSync, existsSync } from "node:fs";
import { ERROR_CODES } from "../shared/errors.mjs";
import { createMutationGuard } from "../shared/config.mjs";
import { createLogger } from "../shared/logging.mjs";

/**
 * Resolve a candidate path and confirm it is genuinely inside an allowlist root.
 * Uses realpath so a symlink pointing outside the allowlist is rejected.
 */
export function assertInsideAllowlist(candidate, config, { realpath = realpathSync } = {}) {
  if (typeof candidate !== "string" || candidate.trim() === "") {
    return { ok: false, code: ERROR_CODES.WORKTREE_OUTSIDE_ALLOWLIST, reason: "empty path" };
  }
  if (!path.isAbsolute(candidate)) {
    return { ok: false, code: ERROR_CODES.WORKTREE_OUTSIDE_ALLOWLIST, reason: `not absolute: ${candidate}` };
  }

  // Check the RAW input before normalizing. path.normalize() collapses ".."
  // inside absolute paths, so a post-normalization check would almost never
  // fire and the caller would get a vaguer "outside allowlist" error instead
  // of knowing a traversal was attempted.
  if (candidate.split(/[\\/]/).includes("..")) {
    return { ok: false, code: ERROR_CODES.WORKTREE_PATH_TRAVERSAL, reason: `traversal segment in ${candidate}` };
  }

  const normalized = path.normalize(candidate);

  // Protected canonical paths are refused before any allowlist consideration.
  for (const p of config.worktrees.protectedPaths ?? []) {
    const prot = path.normalize(p);
    if (normalized === prot || normalized.startsWith(prot + path.sep)) {
      return {
        ok: false,
        code: ERROR_CODES.WORKTREE_PROTECTED_PATH,
        reason: `${candidate} is inside protected path ${p}`,
      };
    }
  }

  let resolved = normalized;
  if (existsSync(normalized)) {
    try {
      resolved = realpath(normalized);
    } catch {
      return { ok: false, code: ERROR_CODES.WORKTREE_OUTSIDE_ALLOWLIST, reason: `cannot resolve ${candidate}` };
    }
  }

  // Re-check protected paths against the REAL path (defeats symlink tricks).
  for (const p of config.worktrees.protectedPaths ?? []) {
    const prot = path.normalize(p);
    if (resolved === prot || resolved.startsWith(prot + path.sep)) {
      return {
        ok: false,
        code: ERROR_CODES.WORKTREE_PROTECTED_PATH,
        reason: `${candidate} resolves into protected path ${p}`,
      };
    }
  }

  for (const root of config.worktrees.allowlistRoots) {
    const r = path.normalize(root);
    if (resolved === r) {
      return { ok: false, code: ERROR_CODES.WORKTREE_OUTSIDE_ALLOWLIST, reason: "refusing to act on the allowlist root itself" };
    }
    if (resolved.startsWith(r + path.sep)) return { ok: true, resolved };
  }

  return {
    ok: false,
    code: ERROR_CODES.WORKTREE_OUTSIDE_ALLOWLIST,
    reason: `${candidate} (real: ${resolved}) is not inside any allowlist root`,
  };
}

/**
 * Decide whether one worktree is safe to prune.
 * `status` describes observed git/Linear state; every unknown is a refusal.
 */
export function classifyWorktree(worktree, config, options = {}) {
  const guard = assertInsideAllowlist(worktree.path, config, options);
  if (!guard.ok) {
    return { path: worktree.path, safe: false, code: guard.code, reason: guard.reason };
  }

  const refuse = (code, reason) => ({ path: worktree.path, safe: false, code, reason });

  if (worktree.repositoryResolved === false) {
    return refuse(ERROR_CODES.REPO_UNRESOLVED, "repository could not be resolved through the registry");
  }
  if (worktree.dirty) return refuse(ERROR_CODES.WORKTREE_DIRTY, "uncommitted changes present");
  if (worktree.untracked) return refuse(ERROR_CODES.WORKTREE_UNTRACKED, "untracked files present");
  if (worktree.unpushed) return refuse(ERROR_CODES.WORKTREE_UNPUSHED, "branch has unpushed commits");
  if (worktree.pullRequestOpen) return refuse(ERROR_CODES.WORKTREE_PR_OPEN, "an open pull request references this branch");

  const terminal = config.linear.terminalStateNames;
  if (!worktree.issueState) {
    return refuse(ERROR_CODES.WORKTREE_ISSUE_ACTIVE, "issue state unknown — refusing to guess");
  }
  if (!terminal.includes(worktree.issueState)) {
    return refuse(ERROR_CODES.WORKTREE_ISSUE_ACTIVE, `issue is "${worktree.issueState}", not terminal`);
  }

  return {
    path: worktree.path,
    safe: true,
    reason: `issue ${worktree.issueId ?? "?"} is ${worktree.issueState}; clean, pushed, no open PR`,
  };
}

export async function runJanitor({
  config,
  worktrees,
  git = null,
  logger = createLogger({ job: "janitor" }),
  options = {},
}) {
  const guard = createMutationGuard({ dryRun: config.dryRun });
  const safe = [];
  const unsafe = [];

  for (const wt of worktrees ?? []) {
    const verdict = classifyWorktree(wt, config, options);
    if (verdict.safe) safe.push(verdict);
    else {
      unsafe.push(verdict);
      logger.info("worktree_retained", { path: wt.path, code: verdict.code, reason: verdict.reason });
    }
  }

  for (const s of safe) {
    await guard.perform(`prune worktree ${s.path}`, () => git.removeWorktree(s.path), {
      type: "worktree_remove",
      path: s.path,
    });
    logger.info("worktree_pruned", { path: s.path, dryRun: config.dryRun });
  }

  // Git metadata pruning only after per-worktree verification succeeded.
  if (safe.length > 0) {
    await guard.perform("git worktree prune", () => git.prune(), { type: "git_prune" });
  }

  return {
    dryRun: config.dryRun,
    pruned: safe.map((s) => s.path),
    retained: unsafe,
    plannedMutations: guard.planned,
  };
}
