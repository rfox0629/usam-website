import assert from "node:assert/strict";
import { buildRunnerExecutionEnv, evaluateReviewAction, reviewActions } from "../src/execution-policy.mjs";
import {
  buildPickupSafetyNote,
  buildRunnerSafetyLines,
  detectReviewAuthorization,
  evaluatePreviewFirstIteration,
  evaluateReviewPackage,
} from "../src/review-policy.mjs";

function issue(overrides = {}) {
  return {
    comments: { nodes: [] },
    description: "Build a required review package with a protected Vercel preview URL, validation summary, and exact founder decision requested.",
    labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Founder Approval" }, { name: "Codex", parent: { name: "Runner" } }] },
    title: "Review package issue",
    ...overrides,
  };
}

const lock = {
  branch: "ryan/usa-69-create-distinct-favicons",
};

const authorizedIssue = issue({
  comments: {
    nodes: [{
      author: { name: "Ryan Fox" },
      body: "Founder authorization and workflow correction: You are explicitly authorized to push the existing USA-69 branch to GitHub and create a protected Vercel preview deployment for founder review.",
      createdAt: "2026-07-22T18:03:41.231Z",
    }],
  },
});

const authorization = detectReviewAuthorization(authorizedIssue);
assert.equal(authorization.allowed, true);
assert.equal(authorization.source.kind, "founder_comment");

const authorizesIssue = issue({
  comments: {
    nodes: [{
      author: { name: "Ryan Fox" },
      body: "Founder authorizes this issue to continue. Commit, push, deploy a protected preview, generate screenshots, and post the verified URL.",
      createdAt: "2026-07-25T03:36:07.811Z",
    }],
  },
});
assert.equal(
  detectReviewAuthorization(authorizesIssue).allowed,
  true,
  "authorizes plus commit, push, deploy a protected preview should grant review authorization",
);

const authorizedSafety = buildRunnerSafetyLines(authorizedIssue, lock, { authorization }).join("\n");
assert.match(authorizedSafety, /push only the issue branch `ryan\/usa-69-create-distinct-favicons`/);
assert.match(authorizedSafety, /protected Vercel preview deployment/);
assert.match(authorizedSafety, /Production merge, production deployment/);
assert.doesNotMatch(authorizedSafety, /Do not merge, push, deploy|no merge, push, deploy/i);

const pickupSafety = buildPickupSafetyNote(authorizedIssue, lock, { authorization });
assert.match(pickupSafety, /founder-authorized review actions are allowed/);
assert.match(pickupSafety, /production merge\/deployment\/promotion/);

const previewFirstSafety = buildRunnerSafetyLines(authorizedIssue, {
  ...lock,
  repositoryName: "website",
  revisionCycle: 2,
}, {
  authorization,
  config: {
    linear: {
      previewFirstIteration: {
        enabled: true,
        minimumRevisionCycle: 2,
        repositoryNames: ["website"],
      },
    },
  },
}).join("\n");
assert.match(previewFirstSafety, /preview-first gate/);
assert.match(previewFirstSafety, /keep the issue In Progress/);
assert.match(previewFirstSafety, /do not wait for screenshots/);

const missingPackage = evaluateReviewPackage(authorizedIssue, [
  "Validation: npm run build passed.",
  "Exact founder decision requested: approve or request changes.",
].join("\n"), { authorization });
assert.equal(missingPackage.required, true);
assert.equal(missingPackage.passed, false);
assert.deepEqual(missingPackage.missing, ["working protected Vercel preview URL"]);

const completePackage = evaluateReviewPackage(authorizedIssue, [
  "Preview: https://usam-website-usa-69-review.vercel.app",
  "Screenshots: /Users/ryanfox/USAM-Automation/worktrees/usa-69/public/favicons/review/brand-comparison.png",
  "Validation: npm run build passed and git diff --check passed.",
  "Exact founder decision requested: approve the favicon set or request changes.",
].join("\n"), { authorization });
assert.equal(completePackage.required, true);
assert.equal(completePackage.passed, true);
assert.deepEqual(completePackage.missing, []);

const previewFirstPass = evaluatePreviewFirstIteration(authorizedIssue, [
  "Verified https://usam-website-git-usa-71-preview.vercel.app renders the intended Kitchen Table Gospel page.",
  "Updated the homepage copy per Ryan's latest revisions.",
].join("\n"), {
  authorization,
  lock: {
    repositoryName: "website",
    revisionCycle: 2,
  },
});
assert.equal(previewFirstPass.active, true);
assert.equal(previewFirstPass.passed, true);
assert.deepEqual(previewFirstPass.missing, []);
assert.deepEqual(previewFirstPass.previewUrls, ["https://usam-website-git-usa-71-preview.vercel.app"]);

const previewFirstMissingVerification = evaluatePreviewFirstIteration(authorizedIssue, [
  "Preview: https://usam-website-git-usa-71-preview.vercel.app",
  "Updated the homepage copy per Ryan's latest revisions.",
].join("\n"), {
  authorization,
  lock: {
    repositoryName: "website",
    revisionCycle: 2,
  },
});
assert.equal(previewFirstMissingVerification.active, true);
assert.equal(previewFirstMissingVerification.passed, false);
assert.deepEqual(previewFirstMissingVerification.missing, ["statement that the exact preview URL was verified to render"]);

const normalIssue = issue({
  comments: { nodes: [{ author: { name: "Ryan Fox" }, body: "Please implement this normally." }] },
  labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Codex", parent: { name: "Runner" } }] },
});
const normalAuthorization = detectReviewAuthorization(normalIssue);
assert.equal(normalAuthorization.allowed, false);

const normalSafety = buildRunnerSafetyLines(normalIssue, lock, { authorization: normalAuthorization }).join("\n");
assert.match(normalSafety, /Do not commit, push, deploy/);

const dispatcherPickupCommentIssue = issue({
  comments: {
    nodes: [{
      user: { name: "Ryan Fox" },
      body: [
        "Dispatcher pickup started.",
        "",
        "Runner: claude",
        "Branch: `dispatcher/usa-71`",
        "Worktree: `/Users/ryanfox/USAM-Automation/worktrees/usa-71`",
        "",
        "Safety: founder-authorized review actions are allowed for this issue only: commit validated changes, push the issue branch, create/update a protected Vercel preview, generate screenshots, expose review assets, and post review links/details.",
      ].join("\n"),
      createdAt: "2026-07-24T21:10:06.226Z",
    }],
  },
  description: "Build a normal issue without scoped review authorization.",
  labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Claude", parent: { name: "Runner" } }] },
});
assert.equal(
  detectReviewAuthorization(dispatcherPickupCommentIssue).allowed,
  false,
  "generated dispatcher pickup comments must not become review authorization sources",
);

const localAutomationReviewIssue = issue({
  comments: { nodes: [] },
  description: "Do not claim the local dispatcher repair is review-ready unless the founder can open the review package: working preview URL or directly viewable review assets, validation summary, and exact founder decision requested.",
});
const localAutomationReviewPackage = evaluateReviewPackage(
  localAutomationReviewIssue,
  [
    "Review assets: `/Users/ryanfox/USAM-Automation/src/dispatcher.mjs`, `/Users/ryanfox/USAM-Automation/state/health.json`, and Linear proof comments.",
    "Validation: npm test passed.",
    "Exact founder decision requested: approve the local dispatcher repair or request changes.",
  ].join("\n"),
  { authorization },
);
assert.equal(localAutomationReviewPackage.passed, true, "local dispatcher review can use directly viewable assets when no preview is applicable");
assert.deepEqual(localAutomationReviewPackage.missing, []);

const approvalRequiredIssue = issue({
  comments: { nodes: [] },
  description: "Provide protected preview URLs for review. No production merge or deployment without founder approval.",
});
assert.equal(detectReviewAuthorization(approvalRequiredIssue).allowed, false);

assert.equal(evaluateReviewAction({
  action: reviewActions.PUSH_BRANCH,
  authorized: true,
  issueBranch: "dispatcher/usa-69",
  targetBranch: "dispatcher/usa-69",
}).allowed, true);
assert.equal(evaluateReviewAction({
  action: reviewActions.PUSH_BRANCH,
  authorized: true,
  issueBranch: "dispatcher/usa-69",
  targetBranch: "main",
}).allowed, false);
assert.equal(evaluateReviewAction({
  action: reviewActions.PRODUCTION_DEPLOY,
  authorized: true,
  issueBranch: "dispatcher/usa-69",
}).allowed, false);
assert.equal(evaluateReviewAction({
  action: reviewActions.CREATE_PROTECTED_PREVIEW,
  authorized: true,
  issueBranch: "dispatcher/usa-69",
  previewTarget: "preview",
  protectedPreview: true,
}).allowed, true);
assert.equal(evaluateReviewAction({
  action: reviewActions.CREATE_PROTECTED_PREVIEW,
  authorized: true,
  issueBranch: "dispatcher/usa-69",
  previewTarget: "production",
  protectedPreview: true,
}).allowed, false);

const runnerEnv = buildRunnerExecutionEnv({ authorization, lock });
assert.equal(runnerEnv.RUNNER_REVIEW_AUTHORIZED, "1");
assert.match(runnerEnv.RUNNER_ALLOWED_REVIEW_ACTIONS, /protected_vercel_preview/);

console.log("dispatcher review policy regression passed");
