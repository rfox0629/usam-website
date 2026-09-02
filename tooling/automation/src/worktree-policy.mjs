import { join } from "node:path";
import { assertPathOutsideRoot } from "./dispatcher-paths.mjs";

function timestampedIssueName(identifier, runner, timestamp) {
  return `${String(identifier || "").toLowerCase()}-${runner}-${timestamp}`;
}

export function planIssueWorktree({
  defaultWorktreeRoot,
  issue,
  previousCompletedLock = null,
  previousCompletedWorktreeMissing = false,
  repository,
  reusableWorktree = null,
  runner,
  sourceRoot = null,
  timestamp,
}) {
  const replacementBranch = `${repository.branchPrefix}/${timestampedIssueName(issue.identifier, runner, timestamp)}`;
  const branch = reusableWorktree?.branch || issue.branchName || previousCompletedLock?.branch || replacementBranch;
  const missingPreviousWorktreePath = previousCompletedWorktreeMissing && previousCompletedLock?.worktreePath
    ? previousCompletedLock.worktreePath
    : null;
  const worktreeRoot = repository.worktreeRoot || defaultWorktreeRoot;
  const replacementWorktreePath = join(worktreeRoot, timestampedIssueName(issue.identifier, runner, timestamp));
  const worktreePath = reusableWorktree?.worktreePath || missingPreviousWorktreePath || replacementWorktreePath;
  if (repository.kind !== "local") {
    assertPathOutsideRoot(worktreePath, sourceRoot, "issue worktree path");
  }

  return {
    branch,
    recreateExistingBranch: !reusableWorktree && repository.kind !== "local" && Boolean(branch && (branch === issue.branchName || branch === previousCompletedLock?.branch)),
    reuseExistingWorktree: Boolean(reusableWorktree),
    reuseSource: reusableWorktree?.source || null,
    worktreePath,
  };
}
