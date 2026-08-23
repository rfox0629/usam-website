import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateReviewAction, reviewActions } from "../src/execution-policy.mjs";
import { detectReviewAuthorization, evaluateReviewPackage } from "../src/review-policy.mjs";
import { claudeArgsForAuthorization, codexArgsForAuthorization } from "../src/runner-invocation-policy.mjs";
import { classifyRunnerEnvironmentUnavailable } from "../src/runner-cooldowns.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(rootDir, "config", "dispatcher.config.json"), "utf8"));

function argsIncludePair(args, key, value) {
  return args.some((arg, index) => arg === key && args[index + 1] === value);
}

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_EMAIL: "dispatcher-regression@usa.local",
      GIT_AUTHOR_NAME: "USAM Dispatcher Regression",
      GIT_COMMITTER_EMAIL: "dispatcher-regression@usa.local",
      GIT_COMMITTER_NAME: "USAM Dispatcher Regression",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const codexArgs = config.runners.codex.args;
assert.equal(codexArgs[0], "exec");
assert(argsIncludePair(codexArgs, "--sandbox", "workspace-write"), "Codex must use bounded workspace-write sandbox.");
assert.equal(config.git.metadataPath, `${config.git.repositoryPath}/.git`);
assert(!argsIncludePair(codexArgs, "-c", "approval_policy=\"never\""), "Codex approval bypass must not be granted globally.");
assert(!argsIncludePair(codexArgs, "-c", "sandbox_workspace_write.network_access=true"), "Codex review network access must not be granted globally.");
assert(!argsIncludePair(codexArgs, "--add-dir", config.git.metadataPath), "Codex Git metadata write access must not be granted globally.");
assert(!codexArgs.includes("danger-full-access"), "Codex must not get unrestricted filesystem access.");
assert(!codexArgs.includes("--dangerously-bypass-approvals-and-sandbox"), "Codex must not bypass sandboxing.");

const claudeArgs = config.runners.claude.args;
assert(argsIncludePair(claudeArgs, "--permission-mode", "acceptEdits"), "Claude base config must stay conservative.");
assert(!argsIncludePair(claudeArgs, "--permission-mode", "bypassPermissions"), "Claude approval bypass must not be granted globally.");

const claudeLoginMissing = classifyRunnerEnvironmentUnavailable({
  code: 1,
  stderr: "Not logged in · Please run /login",
  stdout: "",
  timedOut: false,
}, {
  now: new Date("2026-07-24T22:40:00.000Z"),
  retryMs: 300000,
});
assert.equal(claudeLoginMissing.reason, "runner_environment_unavailable");
assert.equal(claudeLoginMissing.resumeAfter, "2026-07-24T22:45:00.000Z");

const successfulTranscriptMention = classifyRunnerEnvironmentUnavailable({
  code: 0,
  finalText: "Validation passed; no dispatcher restart is required.",
  stderr: "",
  stdout: [
    "src/dispatcher.mjs: message: runner has no available environments; retrying later.",
    "status snapshot: availability is available.",
  ].join("\n"),
  timedOut: false,
}, {
  now: new Date("2026-07-24T22:40:00.000Z"),
  retryMs: 300000,
});

assert.equal(successfulTranscriptMention, null);

const noAuthorization = { allowed: false };
assert.deepEqual(
  codexArgsForAuthorization(codexArgs, noAuthorization, { metadataPath: config.git.metadataPath }),
  codexArgs,
  "Unauthorized Codex runs must use the base conservative args.",
);
const localCodexArgs = codexArgsForAuthorization(codexArgs, noAuthorization, { skipGitRepoCheck: true });
assert(localCodexArgs.includes("--skip-git-repo-check"), "Local automation Codex runs must skip the git repo trust check.");
assert(localCodexArgs.indexOf("--skip-git-repo-check") < localCodexArgs.indexOf("--json"), "Local trust bypass flag must be passed before --json.");
assert(!argsIncludePair(localCodexArgs, "--add-dir", config.git.metadataPath), "Local automation runs must not inherit website Git metadata access.");
assert.deepEqual(
  claudeArgsForAuthorization(claudeArgs, noAuthorization),
  claudeArgs,
  "Unauthorized Claude runs must use the base conservative args.",
);

const explicitAuthorization = { allowed: true };
const authorizedCodexArgs = codexArgsForAuthorization(codexArgs, explicitAuthorization, { metadataPath: config.git.metadataPath });
assert(argsIncludePair(authorizedCodexArgs, "-c", "approval_policy=\"never\""), "Founder-authorized Codex review runs must not stall on approval prompts.");
assert(argsIncludePair(authorizedCodexArgs, "-c", "sandbox_workspace_write.network_access=true"), "Founder-authorized Codex review runs need preview/screenshot network access.");
assert(argsIncludePair(authorizedCodexArgs, "--add-dir", config.git.metadataPath), "Founder-authorized Codex review runs need Git metadata access for branch commits.");
assert(authorizedCodexArgs.indexOf("-c") < authorizedCodexArgs.indexOf("--json"), "Injected Codex config must be passed before --json.");
const authorizedLocalCodexArgs = codexArgsForAuthorization(codexArgs, explicitAuthorization, { skipGitRepoCheck: true });
assert(authorizedLocalCodexArgs.includes("--skip-git-repo-check"), "Founder-authorized local automation Codex runs must skip the git repo trust check.");
assert(authorizedLocalCodexArgs.indexOf("--skip-git-repo-check") < authorizedLocalCodexArgs.indexOf("--json"), "Local trust bypass flag must be passed before --json for authorized runs.");
assert(argsIncludePair(authorizedLocalCodexArgs, "-c", "approval_policy=\"never\""), "Founder-authorized local automation Codex runs must still be non-interactive.");
assert(argsIncludePair(authorizedLocalCodexArgs, "-c", "sandbox_workspace_write.network_access=true"), "Founder-authorized local automation Codex runs must keep review network access.");
assert(!argsIncludePair(authorizedLocalCodexArgs, "--add-dir", config.git.metadataPath), "Founder-authorized local automation runs must not inherit website Git metadata access.");
const authorizedClaudeArgs = claudeArgsForAuthorization(claudeArgs, explicitAuthorization);
assert(argsIncludePair(authorizedClaudeArgs, "--permission-mode", "bypassPermissions"), "Founder-authorized Claude review runs must not wait for unattended approvals.");
assert(!authorizedClaudeArgs.includes("acceptEdits"), "Founder-authorized Claude review runs must replace acceptEdits.");

const tempRoot = mkdtempSync(join(tmpdir(), "usam-dispatcher-git-"));
try {
  const repo = join(tempRoot, "repo");
  const worktree = join(tempRoot, "worktree");
  run("git", ["init", "-b", "main", repo], tempRoot);
  writeFileSync(join(repo, "README.md"), "dispatcher regression\n");
  run("git", ["add", "README.md"], repo);
  run("git", ["commit", "-m", "Initial commit"], repo);
  run("git", ["worktree", "add", "-b", "dispatcher/usa-test-authorized", worktree, "main"], repo);
  writeFileSync(join(worktree, "review.txt"), "authorized review change\n");
  run("git", ["add", "review.txt"], worktree);
  const commitOutput = run("git", ["commit", "-m", "Verify worktree index write"], worktree);
  assert.match(commitOutput, /Verify worktree index write|files? changed|file changed/);
  assert.match(run("git", ["status", "--short"], worktree), /^$/);
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}

const issueBranch = "dispatcher/usa-69-codex-20260722180412";
assert.equal(evaluateReviewAction({
  action: reviewActions.COMMIT,
  authorized: true,
  currentBranch: issueBranch,
  issueBranch,
}).allowed, true);
assert.equal(evaluateReviewAction({
  action: reviewActions.PUSH_BRANCH,
  authorized: true,
  issueBranch,
  targetBranch: issueBranch,
}).allowed, true);
assert.equal(evaluateReviewAction({
  action: reviewActions.CREATE_PROTECTED_PREVIEW,
  authorized: true,
  issueBranch,
  previewTarget: "preview",
  protectedPreview: true,
}).allowed, true);
assert.equal(evaluateReviewAction({
  action: reviewActions.PUSH_BRANCH,
  authorized: false,
  issueBranch,
  targetBranch: issueBranch,
}).allowed, false);
assert.equal(evaluateReviewAction({
  action: reviewActions.CREATE_PROTECTED_PREVIEW,
  authorized: false,
  issueBranch,
  previewTarget: "preview",
  protectedPreview: true,
}).allowed, false);
assert.equal(evaluateReviewAction({
  action: reviewActions.PUSH_BRANCH,
  authorized: true,
  issueBranch,
  targetBranch: "main",
}).allowed, false);
assert.equal(evaluateReviewAction({
  action: reviewActions.PRODUCTION_DEPLOY,
  authorized: true,
  issueBranch,
  previewTarget: "production",
  protectedPreview: false,
}).allowed, false);
assert.equal(evaluateReviewAction({
  action: reviewActions.DNS_CHANGE,
  authorized: true,
  issueBranch,
}).allowed, false);
assert.equal(evaluateReviewAction({
  action: reviewActions.PRODUCTION_DB_SCHEMA_CHANGE,
  authorized: true,
  issueBranch,
}).allowed, false);
assert.equal(evaluateReviewAction({
  action: reviewActions.DESTRUCTIVE_ACTION,
  authorized: true,
  issueBranch,
}).allowed, false);

const authorizedIssue = {
  comments: {
    nodes: [{
      author: { name: "Ryan Fox" },
      body: "Founder authorization: explicitly authorized to commit validated changes, push the issue branch, and create a protected Vercel preview with screenshots.",
      createdAt: "2026-07-22T18:03:41.231Z",
    }],
  },
  description: "Post a protected preview URL, validation summary, screenshots, and exact founder decision requested.",
  labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Founder Approval" }] },
  title: "Authorized review package",
};
const authorization = detectReviewAuthorization(authorizedIssue);
assert.equal(authorization.allowed, true);
const missingPackage = evaluateReviewPackage(authorizedIssue, "Validation: npm run build passed.", { authorization });
assert.equal(missingPackage.passed, false);
assert.equal(evaluateReviewAction({
  action: reviewActions.MOVE_TO_IN_REVIEW,
  authorized: true,
  issueBranch,
  reviewPackage: missingPackage,
}).allowed, false);
const completePackage = evaluateReviewPackage(authorizedIssue, [
  "Preview: https://usam-website-usa-69-review.vercel.app",
  "Screenshot: https://raw.githubusercontent.com/org/repo/refs/heads/dispatcher/usa-69/docs/qa/desktop.png",
  "Validation: npm run build passed and git diff --check passed.",
  "Exact founder decision requested: approve or request changes.",
].join("\n"), { authorization });
assert.equal(completePackage.passed, true);
assert.equal(evaluateReviewAction({
  action: reviewActions.MOVE_TO_IN_REVIEW,
  authorized: true,
  issueBranch,
  reviewPackage: completePackage,
}).allowed, true);

console.log("dispatcher execution environment regression passed");
