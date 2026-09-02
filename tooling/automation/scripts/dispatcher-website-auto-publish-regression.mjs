import assert from "node:assert/strict";
import { evaluateReviewAction, reviewActions } from "../src/execution-policy.mjs";
import { detectReviewAuthorization } from "../src/review-policy.mjs";
import {
  buildHandoffRecord,
  buildVerifiedPreviewComment,
  classifyAutoPublishFailure,
  defaultPublishHealth,
  evaluateAutoPublishActions,
  expectedMarkersForReviewRoute,
  extractRequestedRoute,
  hasPreviewProhibition,
  previewDeploymentStrategy,
  previewUrlAppearsBeforeReviewDocumentation,
  publishFailureRecovery,
  validationCommandsForPackage,
  websiteAutoPreviewAuthorization,
  websiteAutoPublishEligibility,
} from "../src/website-auto-publish-policy.mjs";

const config = {
  linear: {
    deprecatedRoutingLabels: ["Ready for Codex", "Ready for Claude"],
    labelReadyForDispatcher: "Ready for Dispatcher",
    runnerLabelGroup: "Runner",
  },
  websiteAutoPublish: {
    enabled: true,
    maxRetries: 2,
    retryMs: 300000,
  },
};

function label(name) {
  return { name };
}

const codexLabel = { name: "Codex", parent: { name: "Runner" } };
const claudeLabel = { name: "Claude", parent: { name: "Runner" } };

function issue(overrides = {}) {
  return {
    comments: { nodes: [] },
    description: "Build the public website page and return a verified preview for the exact `/system` route.",
    identifier: "USA-100",
    labels: { nodes: [label("Website"), label("Ready for Dispatcher"), codexLabel] },
    title: "Website auto-publish issue",
    ...overrides,
  };
}

const lock = {
  branch: "dispatcher/usa-100-codex-20260725",
  expectedPaths: ["app/system/page.tsx"],
  identifier: "USA-100",
  repositoryKind: "git-worktree",
  repositoryName: "website",
  runner: "codex",
  worktreePath: "/Users/ryanfox/USAM-Automation/worktrees/usa-100-codex",
};

const websiteIssue = issue();
const eligibility = websiteAutoPublishEligibility(websiteIssue, lock, config);
assert.equal(eligibility.eligible, true, "qualifying Website issue should enter auto-publish");

const currentRunnerWebsiteIssue = issue({
  labels: { nodes: [label("Website"), label("Ready for Dispatcher"), codexLabel] },
});
const currentRunnerEligibility = websiteAutoPublishEligibility(currentRunnerWebsiteIssue, lock, config);
assert.equal(currentRunnerEligibility.eligible, true, "current Runner -> Codex label should enter auto-publish");
assert.equal(currentRunnerEligibility.runner, "codex");

const automaticAuthorization = websiteAutoPreviewAuthorization(websiteIssue, { config, lock });
assert.equal(automaticAuthorization.allowed, true, "Website auto-publish must not require a founder authorization comment");
assert.equal(automaticAuthorization.source.kind, "website_auto_preview_policy");
assert.equal(detectReviewAuthorization(websiteIssue, { config, lock }).source.kind, "website_auto_preview_policy");

const actions = evaluateAutoPublishActions({
  authorization: automaticAuthorization,
  branch: lock.branch,
});
assert.equal(actions.commit.allowed, true, "scoped issue commit should be allowed");
assert.equal(actions.push.allowed, true, "issue branch push should be allowed");
assert.equal(actions.preview.allowed, true, "protected preview should be allowed");
assert.equal(actions.productionDeploy.allowed, false, "production deploy must remain blocked");

const packageJson = {
  devDependencies: { typescript: "^5" },
  scripts: { build: "next build" },
};
assert.deepEqual(
  validationCommandsForPackage(packageJson).map((command) => command.label),
  ["npx tsc --noEmit", "npm run build"],
  "available type/build validation should run before publish",
);

const health = defaultPublishHealth({
  branchPushed: true,
  commitCreated: true,
  implementationComplete: true,
  previewReady: true,
  previewRequested: true,
  previewUrl: "https://example.vercel.app",
  previewUrlPosted: true,
  previewVerified: true,
});
assert.equal(health.implementationComplete, true);
assert.equal(health.commitCreated, true);
assert.equal(health.branchPushed, true);
assert.equal(health.previewRequested, true);
assert.equal(health.previewReady, true);
assert.equal(health.previewVerified, true);
assert.equal(health.previewUrlPosted, true);

const claudeIssue = issue({
  comments: {
    nodes: [{
      author: { name: "Ryan Fox" },
      body: "Claude should produce the component for USA-38 without waiting for a formal handoff.",
      createdAt: "2026-07-25T13:00:00.000Z",
    }],
  },
  identifier: "USA-80",
  labels: { nodes: [label("Website"), label("Ready for Dispatcher"), claudeLabel] },
  title: "Claude River component",
});
const handoff = buildHandoffRecord({
  changedFiles: ["app/system/RiverOfMinistries.tsx", "app/system/page.tsx"],
  sourceIssue: claudeIssue,
  sourceLock: {
    branch: "ryan/usa-80-river",
    runner: "claude",
    worktreePath: "/Users/ryanfox/USAM-Automation/worktrees/usa-80-claude",
  },
});
assert.equal(handoff.sourceIssue, "USA-80");
assert.equal(handoff.destinationIssue, "USA-38");
assert.equal(handoff.status, "available_to_codex");
assert.deepEqual(handoff.changedFiles, ["app/system/RiverOfMinistries.tsx", "app/system/page.tsx"]);

const prohibited = issue({
  description: "Website work only. Do not publish a preview for this issue.",
});
assert.equal(hasPreviewProhibition(prohibited), true);
assert.equal(websiteAutoPublishEligibility(prohibited, lock, config).eligible, false);

const buildFailure = classifyAutoPublishFailure("validation", {
  stderr: "Type error: app/system/page.tsx(12,4): broken",
});
assert.equal(buildFailure.kind, "build_validation_failed");
assert.equal(buildFailure.preventsPush, true, "build failure should prevent push");
assert.equal(buildFailure.retryable, false);
assert.match(buildFailure.exactBlocker, /Type error/);

const pushFailure = classifyAutoPublishFailure("push", {
  stderr: "fatal: Authentication failed for 'https://github.com/rfox0629/usam-website.git/'",
});
assert.equal(pushFailure.retryable, true, "credential push failure should retry");
const pushRecovery = publishFailureRecovery(pushFailure, { attempt: 1, config, runner: "codex" });
assert.equal(pushRecovery.retryAllowed, true);
assert.match(pushRecovery.nextRetryAt, /^\d{4}-\d{2}-\d{2}T/);

const vercelFailure = classifyAutoPublishFailure("vercel", {
  stderr: "Vercel deployment failed: 500 temporarily unavailable",
});
assert.equal(vercelFailure.retryable, true, "transient Vercel failure should retry");
assert.equal(publishFailureRecovery(vercelFailure, { attempt: 1, config, runner: "codex" }).retryAllowed, true);

const exhausted = publishFailureRecovery(vercelFailure, { attempt: 3, config, runner: "codex" });
assert.equal(exhausted.retryAllowed, false);
assert.equal(exhausted.routeAlternateRunner, true);
assert.equal(exhausted.alternateRunner, "claude", "alternate runner should be able to publish the existing completed worktree");

assert.equal(evaluateReviewAction({
  action: reviewActions.MERGE_TO_MAIN,
  authorized: true,
  issueBranch: lock.branch,
}).allowed, false);
assert.equal(evaluateReviewAction({
  action: reviewActions.PRODUCTION_DEPLOY,
  authorized: true,
  issueBranch: lock.branch,
  previewTarget: "production",
}).allowed, false);

const refresh = previewDeploymentStrategy({
  branchPushed: true,
  existingPreviewUrl: "https://usam-website-git-branch.vercel.app",
});
assert.equal(refresh.requestNewDeployment, false, "existing branch preview should be refreshed/reused instead of duplicated");
assert.equal(refresh.mode, "refresh_existing_branch_preview");

const routeIssue = issue({
  comments: {
    nodes: [{
      author: { name: "Ryan Fox" },
      body: "Please verify the exact `/system` preview in a real browser.",
      createdAt: "2026-07-25T18:19:54.352Z",
    }],
  },
  description: "The page includes `/ecosystem`, but this latest instruction names exact `/system`.",
});
assert.equal(extractRequestedRoute(routeIssue), "/system");

const localPathBeforeRouteIssue = issue({
  comments: {
    nodes: [
      {
        author: { name: "Ryan Fox" },
        body: "Dispatcher pickup started.\n\nWorktree: `/Users/ryanfox/USAM-Automation/worktrees/usa-80-claude-20260725132842`",
        createdAt: "2026-07-26T01:33:07.020Z",
      },
      {
        author: { name: "Ryan Fox" },
        body: "Founder authorization: verify `/system` in a real browser.",
        createdAt: "2026-07-25T18:19:41.986Z",
      },
    ],
  },
  description: "River of Ministries update.",
});
assert.equal(extractRequestedRoute(localPathBeforeRouteIssue), "/system", "local worktree paths must not become review routes");

assert.deepEqual(
  expectedMarkersForReviewRoute(localPathBeforeRouteIssue, "/system"),
  [
    "ONE RIVER, ONE MISSION",
    "Many streams are moving, each carrying its own story, calling, and purpose. USA Missionaries is helping bring those streams together into one river, flowing with greater unity, strength, and Kingdom purpose.",
  ],
  "System route marker set should match the current simplified River of Ministries revision",
);

const comment = [
  buildVerifiedPreviewComment({
    issue: websiteIssue,
    previewUrl: "https://example.vercel.app/system",
    route: "/system",
    summary: "Updated the System page.",
  }),
  "Screenshots: https://example.com/desktop.png",
  "Validation: npm run build passed.",
].join("\n");
assert.equal(previewUrlAppearsBeforeReviewDocumentation(comment), true, "founder should receive URL before screenshots or long documentation");

console.log("dispatcher website auto-publish regression passed");
