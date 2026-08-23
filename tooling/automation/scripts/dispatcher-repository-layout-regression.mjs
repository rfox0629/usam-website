import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dispatcherLayout, pathContains } from "../src/dispatcher-paths.mjs";
import { planIssueWorktree } from "../src/worktree-policy.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(rootDir, "config", "dispatcher.config.json"), "utf8"));
const registry = JSON.parse(readFileSync(join(rootDir, "config", "repository-registry.json"), "utf8"));
const layout = dispatcherLayout(config, rootDir);

assert.equal(registry.canonicalRepositories.automation.repositoryPath, "/Users/ryanfox/Code/usam-website/tooling/automation");
assert.equal(registry.canonicalRepositories.website.repositoryPath, "/Users/ryanfox/Code/usam-website");
assert.equal(registry.roots.issueWorktrees, "/Users/ryanfox/USAM-Worktrees");
assert.equal(registry.roots.releaseWorktrees, "/Users/ryanfox/USAM-Releases");
assert.equal(registry.roots.runtimeState, "/Users/ryanfox/.usam-dispatcher");

assert.equal(config.repositories.automation.repositoryPath, registry.canonicalRepositories.automation.repositoryPath);
assert.equal(config.repositories.website.repositoryPath, registry.canonicalRepositories.website.repositoryPath);
assert.equal(config.git.repositoryPath, registry.canonicalRepositories.website.repositoryPath);
assert.equal(config.git.metadataPath, registry.canonicalRepositories.website.metadataPath);
const saveApplication = registry.applications.find((item) => item.slug === "rfox0629/save-website");
assert.equal(config.repositories.save.repositoryPath, saveApplication.runtimePath);
assert.equal(config.repositories.save.baseRef, saveApplication.defaultBranch === "main" ? "origin/main" : saveApplication.defaultBranch);
assert.ok(config.linear.pollFirst >= 100, "dispatcher candidate window must not silently hide Ready issues behind a 30-issue cap");

for (const [label, path] of Object.entries({
  completionManifests: layout.dirs.completions,
  control: layout.dirs.control,
  events: layout.dirs.events,
  handoffs: layout.dirs.handoffs,
  issueWorktrees: layout.dirs.worktrees,
  locks: layout.dirs.locks,
  logs: layout.dirs.logs,
  publications: layout.dirs.publications,
  releaseWorktrees: layout.dirs.releaseWorktrees,
  runtimeState: layout.dirs.runtime,
  state: layout.dirs.state,
  tmp: layout.dirs.tmp,
})) {
  assert.equal(
    pathContains(layout.automationRepositoryPath, path),
    false,
    `${label} must not be inside the automation source repo`,
  );
}

const issue = { branchName: null, identifier: "USA-83" };
const websiteRepository = config.repositories.website;
const issuePlan = planIssueWorktree({
  defaultWorktreeRoot: layout.dirs.worktrees,
  issue,
  repository: websiteRepository,
  runner: "codex",
  sourceRoot: layout.automationRepositoryPath,
  timestamp: "20260726192312",
});
assert.equal(issuePlan.worktreePath, "/Users/ryanfox/USAM-Worktrees/usa-83-codex-20260726192312");

const releasePlan = planIssueWorktree({
  defaultWorktreeRoot: layout.dirs.releaseWorktrees,
  issue: { branchName: null, identifier: "USA-82" },
  repository: { ...websiteRepository, worktreeRoot: layout.dirs.releaseWorktrees },
  runner: "codex",
  sourceRoot: layout.automationRepositoryPath,
  timestamp: "20260726193027",
});
assert.equal(releasePlan.worktreePath, "/Users/ryanfox/USAM-Releases/usa-82-codex-20260726193027");

assert.throws(
  () => planIssueWorktree({
    defaultWorktreeRoot: "/Users/ryanfox/Code/usam-website/tooling/automation/worktrees",
    issue,
    repository: { ...websiteRepository, worktreeRoot: "/Users/ryanfox/Code/usam-website/tooling/automation/worktrees" },
    runner: "codex",
    sourceRoot: layout.automationRepositoryPath,
    timestamp: "20260726192312",
  }),
  /must not be inside automation source repository/,
);

console.log("dispatcher repository layout regression passed");
