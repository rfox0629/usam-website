import assert from "node:assert/strict";
import {
  buildGitPushArgs,
  buildLinearCommentBody,
  buildPreviewRouteUrl,
  buildPushRefspec,
  formatPreviewBlocked,
  validateReviewBranchName,
} from "./dispatcher-review-preview.mjs";

const validCodexBranch = "dispatcher/usa-52-codex-20260721154907";
const validClaudeBranch = "dispatcher/usa-61-claude-20260722024910";

assert.equal(validateReviewBranchName(validCodexBranch).ok, true, "codex dispatcher branch should be allowed");
assert.equal(validateReviewBranchName(validClaudeBranch).ok, true, "claude dispatcher branch should be allowed");
assert.equal(
  validateReviewBranchName(`refs/heads/${validCodexBranch}`).branch,
  validCodexBranch,
  "refs/heads branch refs should normalize safely",
);

for (const branch of [
  "main",
  "master",
  "production",
  "prod",
  "production/hotfix",
  "release/dos",
  "deploy/preview",
  "codex/usa-52-codex-20260721154907",
  "dispatcher/main",
  "dispatcher/usa-52-bot-20260721154907",
  "dispatcher/usa-52-codex-2026072115490",
  "dispatcher/usa-52-codex-202607211549071",
  "+dispatcher/usa-52-codex-20260721154907",
  "dispatcher/usa-52-codex-20260721154907:refs/heads/main",
  "dispatcher/usa-52-codex-20260721154907 ../main",
  `refs/heads/${validCodexBranch} `,
]) {
  assert.equal(validateReviewBranchName(branch).ok, false, `${branch} should be rejected`);
}

assert.equal(
  buildPushRefspec(validCodexBranch),
  `refs/heads/${validCodexBranch}:refs/heads/${validCodexBranch}`,
  "push refspec should target the same allowed review branch only",
);

const pushArgs = buildGitPushArgs(validCodexBranch);
assert.deepEqual(
  pushArgs,
  ["push", "--porcelain", "origin", `refs/heads/${validCodexBranch}:refs/heads/${validCodexBranch}`],
  "push command should be a non-force branch push",
);
assert.equal(pushArgs.some((arg) => arg === "--force" || arg === "-f" || arg.startsWith("+")), false, "push args must not force push");
assert.equal(pushArgs.includes("main"), false, "push args must not target main");
assert.equal(pushArgs.includes("production"), false, "push args must not target production");

assert.equal(
  validateReviewBranchName("refs/heads/dispatcher/usa-52-codex-20260721154907").ok,
  true,
  "full branch refs should validate when they point at a safe dispatcher branch",
);

assert.equal(
  buildPreviewRouteUrl("usam-git-dispatcher-usa-52.vercel.app", "/admin/operations-center"),
  "https://usam-git-dispatcher-usa-52.vercel.app/admin/operations-center",
  "preview URL should resolve the Operations Center route",
);

assert.equal(
  formatPreviewBlocked("branch has no commits ahead of origin/main"),
  "Preview Blocked: branch has no commits ahead of origin/main",
  "blocked failures should use the exact Preview Blocked prefix",
);

const readyBody = buildLinearCommentBody({
  branch: validCodexBranch,
  routeUrl: "https://usam-git-dispatcher-usa-52.vercel.app/admin/operations-center",
  status: "ready",
});
assert.match(readyBody, /\[Open protected preview\]\(https:\/\/usam-git-dispatcher-usa-52\.vercel\.app\/admin\/operations-center\)/);
assert.match(readyBody, /Do not merge or promote to production/);

const blockedBody = buildLinearCommentBody({
  branch: validCodexBranch,
  reason: "branch has no commits ahead of origin/main",
  status: "blocked",
});
assert.match(blockedBody, /^Preview Blocked: branch has no commits ahead of origin\/main/);
assert.match(blockedBody, new RegExp(validCodexBranch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

console.log("dispatcher review preview regression passed");
