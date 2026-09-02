import assert from "node:assert/strict";
import { classifyDispatchEligibility } from "../src/dispatch-policy.mjs";
import { evaluateReviewAction, reviewActions } from "../src/execution-policy.mjs";
import { orderCandidateIssues } from "../src/queue-policy.mjs";
import { evaluatePreviewFirstIteration, evaluateReviewPackage } from "../src/review-policy.mjs";
import {
  buildFounderRevisionReclaimComment,
  buildFounderRevisionPromptSection,
  completedCycleTime,
  continuedFounderRevisionFromLock,
  founderRevisionInfo,
  latestRevisionCycle,
  revisionCycleAfter,
  resolveFounderRevisionContext,
  supersedeLockRecord,
} from "../src/routing-policy.mjs";
import { planIssueWorktree } from "../src/worktree-policy.mjs";

const config = {
  linear: {
    blockedLabels: ["Blocked", "Needs Discussion"],
    deprecatedRoutingLabels: ["Ready for Codex", "Ready for Claude"],
    labelReadyForDispatcher: "Ready for Dispatcher",
    runnerLabelGroup: "Runner",
    statusInProgress: "In Progress",
    statusInReview: "In Review",
    statusTodo: "Todo",
  },
};

const repository = {
  branchPrefix: "dispatcher",
  kind: "git-worktree",
  repositoryPath: "/repo",
  worktreeRoot: "/worktrees",
};

const completedLock = {
  branch: "dispatcher/usa-71-claude-20260722183220",
  completedAt: "2026-07-24T18:00:00.000Z",
  identifier: "USA-71",
  revisionCycle: 1,
  status: "completed",
  worktreePath: "/worktrees/usa-71-claude-20260722183220",
};

function comment(body, createdAt, author = "Ryan Fox") {
  return {
    author: { name: author },
    body,
    createdAt,
  };
}

function issue(overrides = {}) {
  return {
    branchName: completedLock.branch,
    comments: { nodes: [] },
    description: "A dispatcher issue with enough detail for deterministic founder revision loop regression coverage.",
    id: "issue-id",
    identifier: "USA-71",
    labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Codex", parent: { name: "Runner" } }] },
    state: { name: "In Progress" },
    title: "Founder revision loop issue",
    url: "https://linear.app/usa-missionaries/issue/USA-71/test",
    ...overrides,
  };
}

function classify(testIssue, options = {}) {
  return classifyDispatchEligibility(testIssue, {
    config,
    expectedPaths: ["app/page.tsx"],
    previousCompletedLock: completedLock,
    repository,
    ...options,
  });
}

const revisionIssue = issue({
  comments: {
    nodes: [
      comment("Founder revision request: apply the following revisions and return a fresh verified preview.", "2026-07-24T19:00:00.000Z"),
    ],
  },
});
const revisionAfterCompleted = classify(revisionIssue);
assert.equal(revisionAfterCompleted.eligible, true, "founder revision after completed cycle should reclaim");
assert.equal(revisionAfterCompleted.reclaim.reclaim, true);
assert.equal(revisionAfterCompleted.runner, "codex");

const currentRunnerLabelIssue = issue({
  labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Codex", parent: { name: "Runner" } }] },
  state: { name: "Todo" },
});
const currentRunnerLabel = classify(currentRunnerLabelIssue);
assert.equal(currentRunnerLabel.eligible, true, "current Runner -> Codex label should be eligible");
assert.equal(currentRunnerLabel.runner, "codex");

const duplicateRunnerLabelIssue = issue({
  labels: {
    nodes: [
      { name: "Ready for Dispatcher" },
      { name: "Codex", parent: { name: "Runner" } },
      { name: "Claude", parent: { name: "Runner" } },
    ],
  },
  state: { name: "Todo" },
});
const duplicateRunnerLabel = classify(duplicateRunnerLabelIssue);
assert.equal(duplicateRunnerLabel.eligible, false, "multiple current Runner labels must fail closed");
assert.equal(duplicateRunnerLabel.reason, "both ownership labels present");

const orderedIssues = orderCandidateIssues([
  { identifier: "USA-72" },
  { identifier: "USA-38" },
  { identifier: "USA-71" },
  { identifier: "USA-36" },
], {
  priorityIdentifiers: ["USA-38", "USA-36", "USA-71"],
});
assert.deepEqual(orderedIssues.map((item) => item.identifier), ["USA-38", "USA-36", "USA-71", "USA-72"]);

const revisionInReview = classify(issue({
  comments: {
    nodes: [
      comment("Please take another pass and rework the hero copy.", "2026-07-24T19:05:00.000Z"),
    ],
  },
  labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Claude", parent: { name: "Runner" } }] },
  state: { name: "In Review" },
}));
assert.equal(revisionInReview.eligible, true, "founder revision after In Review should reclaim");
assert.equal(revisionInReview.runner, "claude");

const nonFounder = classify(issue({
  comments: {
    nodes: [
      comment("Founder revision request: rework this page.", "2026-07-24T19:10:00.000Z", "Other Person"),
    ],
  },
  state: { name: "In Review" },
}));
assert.equal(nonFounder.eligible, false, "non-founder comments must not reclaim");
assert.match(nonFounder.reason, /no founder revision comment/);

const automatedDispatcher = classify(issue({
  comments: {
    nodes: [
      comment([
        "Dispatcher runner completed successfully.",
        "",
        "Runner: codex",
        "Worktree: `/Users/ryanfox/USAM-Automation/worktrees/usa-71-codex`",
      ].join("\n"), "2026-07-24T19:20:00.000Z"),
    ],
  },
  state: { name: "In Review" },
}));
assert.equal(automatedDispatcher.eligible, false, "automated dispatcher comments must not reclaim");

const automatedReclaimComment = classify(issue({
  comments: {
    nodes: [
      comment("Founder revisions detected. Reclaiming the existing worktree and beginning revision cycle 2.", "2026-07-24T19:25:00.000Z"),
    ],
  },
  state: { name: "In Review" },
}));
assert.equal(automatedReclaimComment.eligible, false, "dispatcher reclaim comments must not retrigger themselves");

const noRevisionIntent = classify(issue({
  comments: {
    nodes: [
      comment("Thanks for the update. I will look later.", "2026-07-24T19:30:00.000Z"),
    ],
  },
  state: { name: "In Review" },
}));
assert.equal(noRevisionIntent.eligible, false, "founder comments without revision intent should hold");
assert.match(noRevisionIntent.reason, /does not clearly request revisions/);

const founderStatusNote = classify(issue({
  comments: {
    nodes: [
      comment([
        "Corrected the DOS preview to use the actual Claude Desktop artifact Ryan pointed to.",
        "",
        "What changed:",
        "- Replaced worktree `dos.html` with `/Users/ryanfox/Desktop/dos-v4.html` byte-for-byte.",
        "- Updated the DOS route source hash header.",
        "",
        "New preview deployment:",
        "- DOS: https://usam-website-usa-65-preview-cmgdlimnl.vercel.app/domain-sites/discipleship-operating-system",
        "",
        "Validation: npm run build passed.",
        "Exact founder decision requested: approve the preview or request changes.",
      ].join("\n"), "2026-07-24T19:32:00.000Z"),
    ],
  },
  state: { name: "In Review" },
}));
assert.equal(founderStatusNote.eligible, false, "founder-authored status notes must not reclaim");
assert.match(founderStatusNote.reason, /no founder revision comment/);

const validationPackageStatusNote = classify(issue({
  comments: {
    nodes: [
      comment([
        "USA-70 follow-up validation package.",
        "",
        "Implementation verified in `/Users/ryanfox/USAM-Automation`.",
        "Changed files: `src/dispatcher.mjs`, `src/routing-policy.mjs`.",
        "Validation run: `npm test` passed.",
        "Exact founder decision requested: approve this dispatcher policy behavior or request changes.",
      ].join("\n"), "2026-07-24T19:33:00.000Z"),
    ],
  },
  state: { name: "In Progress" },
}));
assert.equal(validationPackageStatusNote.eligible, false, "validation package comments must not reclaim");
assert.match(validationPackageStatusNote.reason, /no founder revision comment/);

const permanentPublisherFixStatusNote = classify(issue({
  comments: {
    nodes: [
      comment([
        "## USA-81 Permanent Publisher Fix and Live Recovery",
        "",
        "Root cause: the trusted publisher could not authenticate to Vercel as the ryanfox host user.",
        "Live proof:",
        "- USA-38 verified route: https://example.vercel.app/system",
        "- USA-36 verified route: https://example.vercel.app/domain-sites/discipleship-operating-system",
        "Known limitations:",
        "- Preview URLs remain protected.",
        "Exact founder decision requested: approve this trusted host publisher architecture as the permanent publishing path for website review packages, or reply with exact revisions required before it is treated as complete.",
      ].join("\n"), "2026-07-24T19:34:00.000Z"),
    ],
  },
  state: { name: "In Review" },
}));
assert.equal(permanentPublisherFixStatusNote.eligible, false, "permanent publisher fix proof comments must not reclaim");
assert.match(permanentPublisherFixStatusNote.reason, /no founder revision comment/);

const dispatcherResumeGuardStatusNote = classify(issue({
  comments: {
    nodes: [
      comment([
        "## USA-81 follow-up: dispatcher resume guard verified",
        "",
        "The dispatcher briefly re-claimed USA-81 because a status report contained revision-like language.",
        "Additional changed files:",
        "- `src/routing-policy.mjs`",
        "Exact founder decision requested: approve USA-81 with this additional guard included, or reply with exact revisions required.",
      ].join("\n"), "2026-07-24T19:35:00.000Z"),
    ],
  },
  state: { name: "In Review" },
}));
assert.equal(dispatcherResumeGuardStatusNote.eligible, false, "dispatcher resume guard follow-up comments must not reclaim");
assert.match(dispatcherResumeGuardStatusNote.reason, /no founder revision comment/);

const verifiedPreviewStatusNote = classify(issue({
  comments: {
    nodes: [
      comment([
        "## USA-38 verified preview and screenshots",
        "",
        "Use this fresh protected branch-preview link for review:",
        "https://usam-website-git-dispatcher-5ae1eb-ryan-foxs-projects-9a51a4d5.vercel.app/ecosystem?_vercel_share=abc",
        "",
        "Validation from this recovery pass:",
        "- Browser render verified on the branch alias.",
        "",
        "Decision requested: approve USA-38 for merge if acceptable; otherwise request specific revisions.",
      ].join("\n"), "2026-07-24T19:34:00.000Z"),
    ],
  },
  state: { name: "In Progress" },
}));
assert.equal(verifiedPreviewStatusNote.eligible, false, "verified preview review-package comments must not reclaim");
assert.match(verifiedPreviewStatusNote.reason, /no founder revision comment/);

const dispatcherPreviewFirstDeliveryNote = classify(issue({
  comments: {
    nodes: [
      comment([
        "USA-38 - Website C — replace System with Ecosystem and integrate domains",
        "Verified preview URL: https://usam-website-l9h8x8prl-ryan-foxs-projects-9a51a4d5.vercel.app/ecosystem?_vercel_share=abc",
        "Updated: Verified working preview URL: `` This exact URL returned HTTP 200, final path `/ecosystem`, `x-matched-path: /ecosystem`, and rendered the Ecosystem page markers.",
        "Blocker: None.",
      ].join("\n"), "2026-07-24T19:34:30.000Z"),
    ],
  },
  state: { name: "In Progress" },
}));
assert.equal(dispatcherPreviewFirstDeliveryNote.eligible, false, "preview-first delivery comments must not reclaim");
assert.match(dispatcherPreviewFirstDeliveryNote.reason, /no founder revision comment/);

const activeLock = classify(revisionIssue, {
  blockingLock: {
    runner: "codex",
    status: "running",
  },
});
assert.equal(activeLock.eligible, false, "active lock should prevent duplicate reclaim");
assert.equal(activeLock.reason, "running lock exists");

const unclearedFailedLock = classify(revisionIssue, {
  blockingLock: {
    failedAt: "2026-07-24T19:35:00.000Z",
    runner: "codex",
    status: "failed",
  },
  blockingLockSupersedable: false,
});
assert.equal(unclearedFailedLock.eligible, false, "failed lock without a safe clear check should still block");
assert.equal(unclearedFailedLock.reason, "failed lock exists");

const terminalFailedLock = classify(revisionIssue, {
  blockingLock: {
    failedAt: "2026-07-24T19:35:00.000Z",
    lastExitCode: 1,
    runner: "codex",
    stderrPath: "/logs/usa-71-codex-attempt-1.stderr.log",
    status: "failed",
    stdoutPath: "/logs/usa-71-codex-attempt-1.stdout.log",
  },
  blockingLockSupersedable: true,
});
assert.equal(terminalFailedLock.eligible, true, "terminal failed locks can be superseded for a founder revision reclaim");
assert.equal(terminalFailedLock.supersedeFailedLock.status, "failed");

const priorPackage = {
  ...completedLock,
  reviewPackageGate: {
    previewUrls: ["https://example-preview.vercel.app"],
    validation: "npm run build passed",
  },
};
const superseded = supersedeLockRecord(priorPackage, {
  at: "2026-07-24T19:40:00.000Z",
  branch: completedLock.branch,
  lockPath: "/locks/usa-71.json",
  revisionCycle: 2,
});
assert.equal(superseded.status, "superseded", "completed lock should be marked superseded");
assert.equal(superseded.supersededPreviousStatus, "completed");
assert.equal(completedCycleTime(superseded), completedLock.completedAt, "superseded locks should remain valid completion history");

const supersededFailure = supersedeLockRecord({
  failedAt: "2026-07-24T19:35:00.000Z",
  lastExitCode: 1,
  status: "failed",
  stderrPath: "/logs/usa-71-codex-attempt-1.stderr.log",
}, {
  at: "2026-07-24T19:41:00.000Z",
  branch: completedLock.branch,
  lockPath: "/locks/usa-71.json",
  revisionCycle: 2,
});
assert.equal(supersededFailure.status, "superseded", "terminal failed lock should be labeled superseded when safely cleared");
assert.equal(supersededFailure.supersededPreviousStatus, "failed");
assert.equal(supersededFailure.lastExitCode, 1, "failed lock exit details should be preserved");
assert.equal(supersededFailure.stderrPath, "/logs/usa-71-codex-attempt-1.stderr.log");

const reusablePlan = planIssueWorktree({
  defaultWorktreeRoot: "/worktrees",
  issue: revisionIssue,
  previousCompletedLock: completedLock,
  repository,
  reusableWorktree: {
    branch: completedLock.branch,
    source: "previous_completed_lock",
    worktreePath: completedLock.worktreePath,
  },
  runner: "codex",
  timestamp: "20260724194000",
});
assert.equal(reusablePlan.reuseExistingWorktree, true, "healthy existing worktree should be reused");
assert.equal(reusablePlan.worktreePath, completedLock.worktreePath);

const replacementPlan = planIssueWorktree({
  defaultWorktreeRoot: "/worktrees",
  issue: issue({ branchName: null }),
  previousCompletedLock: completedLock,
  previousCompletedWorktreeMissing: true,
  repository,
  reusableWorktree: null,
  runner: "codex",
  timestamp: "20260724194500",
});
assert.equal(replacementPlan.reuseExistingWorktree, false, "missing worktree should not be marked reused");
assert.equal(replacementPlan.worktreePath, completedLock.worktreePath, "missing worktree should get one replacement at the prior path");
assert.equal(new Set([replacementPlan.worktreePath]).size, 1, "missing worktree path planning should produce exactly one replacement");
assert.equal(replacementPlan.branch, completedLock.branch, "replacement should keep the existing issue branch");
assert.equal(replacementPlan.recreateExistingBranch, true);

const multiCommentRevision = founderRevisionInfo(issue({
  comments: {
    nodes: [
      comment("Preserve the current page structure and update the Great Commission section copy.", "2026-07-24T19:50:00.000Z"),
      comment("Also remove the awkward phrase from the disciple-making section.", "2026-07-24T19:55:00.000Z"),
    ],
  },
}), completedLock);
assert.equal(multiCommentRevision.reclaim, true);
assert.equal(multiCommentRevision.comments.length, 2, "all new founder comments should be captured");
const promptSection = buildFounderRevisionPromptSection({
  repositoryName: "website",
  revisionCycle: 2,
  revisionFounderComments: multiCommentRevision.comments,
  revisionPreviousCompletedAt: completedLock.completedAt,
  supersedesFailedLockPath: "/locks/usa-71.json.456.failed",
  supersedesLockPath: "/locks/usa-71.json.123.completed",
});
assert.match(promptSection, /Great Commission section copy/);
assert.match(promptSection, /awkward phrase/);
assert.match(promptSection, /preview-first gate/);
assert.match(promptSection, /Supersedes terminal failed lock/);
assert.doesNotMatch(promptSection, /known limitations, estimated review time/);

const reclaimComment = buildFounderRevisionReclaimComment({
  branch: completedLock.branch,
  repositoryName: "website",
  reuseExistingWorktree: true,
  revisionCycle: 2,
  revisionPreviousCompletedAt: completedLock.completedAt,
  runner: "claude",
  supersedesFailedLockPath: "/locks/usa-71.json.456.failed",
  worktreePath: completedLock.worktreePath,
});
assert.match(reclaimComment, /Founder revisions detected/);
assert.match(reclaimComment, /Supersedes terminal failed lock/);

const revisionCooldown = {
  revisionCycle: 2,
  revisionFounderComments: multiCommentRevision.comments,
  revisionPreviousCompletedAt: completedLock.completedAt,
  status: "cooldown",
  supersedesFailedLockPath: "/locks/usa-71.json.456.failed",
  supersedesLockPath: "/locks/usa-71.json.123.completed",
};
const continuedRevision = continuedFounderRevisionFromLock(revisionCooldown);
assert.equal(continuedRevision.reclaim, true, "expired revision cooldown retry should preserve reclaim context");
assert.equal(continuedRevision.revisionCycle, 2, "expired revision cooldown retry should keep the same revision cycle");
assert.equal(continuedRevision.previousCompletedAt, completedLock.completedAt);
assert.equal(continuedRevision.comments.length, 2);
assert.equal(continuedRevision.supersedesLockPath, "/locks/usa-71.json.123.completed");
assert.equal(
  continuedFounderRevisionFromLock({ ...revisionCooldown, status: "completed" }),
  null,
  "completed locks should not be treated as revision retries",
);

const retryContext = resolveFounderRevisionContext({
  continuedRevision,
  previousCompletedLock: completedLock,
  previousRevisionCycle: 2,
  reclaim: founderRevisionInfo(issue({
    comments: {
      nodes: [
        comment("Founder revision request: rework this page and return a fresh preview.", "2026-07-24T20:00:00.000Z"),
      ],
    },
  }), completedLock),
});
assert.equal(retryContext.revisionCycle, 2, "expired cooldown retry should continue the same revision cycle instead of starting a fresh cycle");
assert.equal(retryContext.revision.comments.length, 2, "expired cooldown retry should preserve the captured founder comments");
assert.match(retryContext.revision.reason, /continuing founder revision cycle 2/);

const legacyRetryHistoryCycle = latestRevisionCycle([
  {
    lock: {
      ...completedLock,
      completedAt: "2026-07-24T22:45:57.951Z",
      status: "review_blocked",
      revisionCycle: null,
    },
  },
  {
    lock: {
      revisionCycle: 2,
      status: "cooldown",
      supersedesLockPath: "/locks/usa-71.json.123.completed",
    },
  },
]);
assert.equal(legacyRetryHistoryCycle, 2, "lock history should retain the highest prior revision cycle");
assert.equal(
  revisionCycleAfter({ ...completedLock, revisionCycle: null }, legacyRetryHistoryCycle),
  3,
  "new founder feedback after a legacy retry lock should advance instead of resetting the revision cycle",
);

assert.deepEqual(
  superseded.reviewPackageGate.previewUrls,
  priorPackage.reviewPackageGate.previewUrls,
  "prior review package details should remain visible after superseding",
);
assert.equal(superseded.supersededByRevisionCycle, 2);

const authorizedIssue = issue({
  description: "Founder authorization requires protected preview URL, validation summary, changed files, known limitations, review time, and exact founder decision requested.",
  labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Codex", parent: { name: "Runner" } }, { name: "Founder Approval" }] },
});
const missingReviewPackage = evaluateReviewPackage(
  authorizedIssue,
  "Validation: npm run build passed.",
  { authorization: { allowed: true } },
);
assert.equal(missingReviewPackage.passed, false);
const previewFirstIteration = evaluatePreviewFirstIteration(
  authorizedIssue,
  [
    "Verified https://usa-71-review.vercel.app renders the intended page.",
    "Updated the copy preservation instructions from Ryan's latest comments.",
  ].join("\n"),
  { lock: { repositoryName: "website", revisionCycle: 2 } },
);
assert.equal(previewFirstIteration.active, true);
assert.equal(previewFirstIteration.passed, true, "active website iteration should pass with a verified preview URL only");
assert.equal(evaluateReviewAction({
  action: reviewActions.MOVE_TO_IN_REVIEW,
  authorized: true,
  issueBranch: completedLock.branch,
  reviewPackage: missingReviewPackage,
}).allowed, false, "new cycle cannot enter Founder Review without a complete package");

const completeReviewPackage = evaluateReviewPackage(
  authorizedIssue,
  [
    "Preview: https://usa-71-review.vercel.app",
    "Screenshots: /Users/ryanfox/USAM-Automation/worktrees/usa-71/docs/qa/mobile.png",
    "Validation: npm run build passed.",
    "Changed files: app/page.tsx.",
    "Known limitations: none.",
    "Estimated review time: 5 minutes.",
    "Exact founder decision requested: approve this revision cycle or request changes.",
  ].join("\n"),
  { authorization: { allowed: true } },
);
assert.equal(completeReviewPackage.passed, true);
assert.equal(evaluateReviewAction({
  action: reviewActions.MOVE_TO_IN_REVIEW,
  authorized: true,
  issueBranch: completedLock.branch,
  reviewPackage: completeReviewPackage,
}).allowed, true);

console.log("dispatcher founder revision regression passed");
