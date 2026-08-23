import { isAbsolute, join, relative, resolve } from "node:path";

export const defaultAutomationRepositoryPath = "/Users/ryanfox/Code/usam-website/tooling/automation";
export const defaultIssueWorktreeRoot = "/Users/ryanfox/USAM-Worktrees";
export const defaultReleaseWorktreeRoot = "/Users/ryanfox/USAM-Releases";
export const defaultRuntimeStateRoot = "/Users/ryanfox/.usam-dispatcher";
export const defaultWebsiteRepositoryPath = "/Users/ryanfox/Code/usam-website";

export function pathContains(parentPath, childPath) {
  const parent = resolve(parentPath);
  const child = resolve(childPath);
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function assertPathOutsideRoot(path, forbiddenRoot, label = "path") {
  if (!path || !forbiddenRoot) {
    return;
  }
  if (pathContains(forbiddenRoot, path)) {
    throw new Error(`${label} must not be inside automation source repository: ${path}`);
  }
}

function configuredRoot(config, key, fallback) {
  return process.env[key.env]
    || config[key.config]
    || config.roots?.[key.root]
    || fallback;
}

export function dispatcherLayout(config = {}, sourceRoot = defaultAutomationRepositoryPath) {
  const runtimeRoot = resolve(configuredRoot(config, {
    config: "runtimeStateRoot",
    env: "USAM_RUNTIME_ROOT",
    root: "runtimeState",
  }, defaultRuntimeStateRoot));
  const issueWorktreeRoot = resolve(process.env.USAM_ISSUE_WORKTREE_ROOT
    || config.worktreeRoots?.issues
    || config.worktreeRoots?.issue
    || config.roots?.issueWorktrees
    || defaultIssueWorktreeRoot);
  const releaseWorktreeRoot = resolve(process.env.USAM_RELEASE_WORKTREE_ROOT
    || config.worktreeRoots?.releases
    || config.worktreeRoots?.release
    || config.roots?.releaseWorktrees
    || defaultReleaseWorktreeRoot);
  const automationRepositoryPath = resolve(config.repositories?.automation?.repositoryPath
    || config.automationRepositoryPath
    || sourceRoot
    || defaultAutomationRepositoryPath);

  assertPathOutsideRoot(runtimeRoot, automationRepositoryPath, "runtime state root");
  assertPathOutsideRoot(issueWorktreeRoot, automationRepositoryPath, "issue worktree root");
  assertPathOutsideRoot(releaseWorktreeRoot, automationRepositoryPath, "release worktree root");

  return {
    automationRepositoryPath,
    dirs: {
      completions: join(runtimeRoot, "manifests", "completions"),
      control: join(runtimeRoot, "control"),
      events: join(runtimeRoot, "events"),
      handoffs: join(runtimeRoot, "handoffs"),
      locks: join(runtimeRoot, "locks"),
      logs: join(runtimeRoot, "logs"),
      publications: join(runtimeRoot, "publications"),
      releaseWorktrees: releaseWorktreeRoot,
      runtime: runtimeRoot,
      state: join(runtimeRoot, "state"),
      tmp: join(runtimeRoot, "tmp"),
      worktrees: issueWorktreeRoot,
    },
    issueWorktreeRoot,
    releaseWorktreeRoot,
    runtimeRoot,
  };
}
