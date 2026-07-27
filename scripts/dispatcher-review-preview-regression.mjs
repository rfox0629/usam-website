#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildPushArgs,
  classifyDeploymentState,
  DEFAULT_REVIEW_BRANCH_PATTERN,
  previewUrlForRoute,
  reviewPushBlockedByMode,
  validateReviewBranchName,
} from "./dispatcher-review-preview.mjs";

const env = { DISPATCHER_REVIEW_BRANCH_ALLOWLIST: DEFAULT_REVIEW_BRANCH_PATTERN };

assert.equal(
  validateReviewBranchName("dispatcher/usa-52-codex-20260721154907", env).ok,
  true,
  "valid dispatcher Codex review branch should pass",
);
assert.equal(
  validateReviewBranchName("dispatcher/usa-41-claude-20260720200427", env).ok,
  true,
  "valid dispatcher Claude review branch should pass",
);

for (const branch of [
  "main",
  "master",
  "production",
  "prod",
  "release/usa-52",
  "deploy/preview",
  "codex/usa-52-codex-20260721154907",
  "dispatcher/main",
  "dispatcher/usa-52-codex-latest",
  "refs/heads/dispatcher/usa-52-codex-20260721154907",
]) {
  assert.equal(validateReviewBranchName(branch, env).ok, false, `${branch} should be rejected`);
}

assert.equal(
  reviewPushBlockedByMode({ DISPATCHER_REVIEW_PUSH_DISABLED: "true" }).blocked,
  true,
  "kill switch should block pushes",
);
assert.equal(
  reviewPushBlockedByMode({ DISPATCHER_TEST_MODE: "true" }).blocked,
  true,
  "test mode should block push side effects",
);
assert.equal(
  reviewPushBlockedByMode({ DISPATCHER_SINGLE_WORKER_MODE: "true" }).blocked,
  true,
  "single-worker fallback should block push side effects by default",
);
assert.equal(
  reviewPushBlockedByMode({ DISPATCHER_SINGLE_WORKER_MODE: "true", DISPATCHER_REVIEW_PUSH_IN_SINGLE_WORKER: "true" }).blocked,
  false,
  "single-worker override should permit pushes when explicitly configured",
);

const pushArgs = buildPushArgs("origin", "dispatcher/usa-52-codex-20260721154907");
assert.deepEqual(pushArgs, [
  "push",
  "--porcelain",
  "origin",
  "refs/heads/dispatcher/usa-52-codex-20260721154907:refs/heads/dispatcher/usa-52-codex-20260721154907",
]);
assert.equal(pushArgs.some((arg) => arg.includes("force") || arg.startsWith("+")), false, "push must not force");

assert.equal(
  previewUrlForRoute("usa-missionaries-git-dispatcher-usa-52.vercel.app", "/admin/operations-center"),
  "https://usa-missionaries-git-dispatcher-usa-52.vercel.app/admin/operations-center",
);

assert.equal(classifyDeploymentState({ readyState: "READY" }), "ready");
assert.equal(classifyDeploymentState({ readyState: "ERROR" }), "blocked");
assert.equal(classifyDeploymentState({ readyState: "BUILDING" }), "pending");

console.log("dispatcher review preview safeguards passed");

