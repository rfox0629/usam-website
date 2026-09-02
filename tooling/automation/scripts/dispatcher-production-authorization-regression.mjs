import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildClaimAcknowledgment, buildCompletionReport } from "../src/dispatcher-observability.mjs";
import { buildRunnerExecutionEnv, evaluateReviewAction, reviewActions } from "../src/execution-policy.mjs";
import { detectProductionAuthorization } from "../src/production-authorization.mjs";
import { buildPickupSafetyNote, buildRunnerSafetyLines, detectReviewAuthorization } from "../src/review-policy.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(rootDir, "config", "dispatcher.config.json"), "utf8"));

const PRODUCTION_LABEL = "Founder Approved — Production";
const PRODUCTION_DATA_LABEL = "Founder Approved — Production Data";

function labels(names) {
  return { nodes: names.map((name) => ({ name })) };
}

function issue(overrides = {}) {
  return {
    comments: { nodes: [] },
    description: "Implement the requested change and validate it before review.",
    identifier: "USA-159T",
    labels: labels(["Ready for Dispatcher", "Ready for Codex"]),
    title: "Production authorization fixture issue",
    url: "https://linear.test/USA-159T",
    ...overrides,
  };
}

const lock = {
  branch: "ryan/usa-159-fixture-branch",
  createdAt: "2026-08-08T12:00:00.000Z",
  repositoryKind: "git-worktree",
  repositoryName: "website",
  runner: "codex",
  worktreePath: "/Users/ryanfox/USAM-Worktrees/usa-159-fixture",
};

// --- Acceptance test 1: issue without the production label -> review/preview actions only.
{
  const plainIssue = issue();
  const production = detectProductionAuthorization(plainIssue, { config });
  assert.equal(production.production.allowed, false);
  assert.equal(production.productionData.allowed, false);

  const review = detectReviewAuthorization(plainIssue, { config, lock });
  assert.equal(review.allowed, false, "plain issue text must not grant review authorization either");
  assert.equal(review.productionAuthorization.production.allowed, false);

  assert.equal(evaluateReviewAction({
    action: reviewActions.MERGE_TO_MAIN,
    ciPassed: true,
    productionAuthorized: production.production.allowed,
    targetBranch: "main",
  }).allowed, false);
  assert.equal(evaluateReviewAction({
    action: reviewActions.PRODUCTION_DEPLOY,
    productionAuthorized: production.production.allowed,
  }).allowed, false);

  const safety = buildRunnerSafetyLines(plainIssue, lock, { authorization: review }).join("\n");
  assert.match(safety, /Do not commit, push, deploy/);
}

// --- Acceptance test 2: Founder Approved — Production -> commit/push/PR/merge/deploy allowed after validation.
const productionOnlyIssue = issue({
  description: [
    "Implement the requested change.",
    "Merge to main and confirm production deployment Ready once validated.",
  ].join(" "),
  labels: labels(["Ready for Dispatcher", "Ready for Codex", PRODUCTION_LABEL]),
});
{
  const production = detectProductionAuthorization(productionOnlyIssue, { config });
  assert.equal(production.production.allowed, true);
  assert.equal(production.production.label, PRODUCTION_LABEL);
  assert.equal(production.productionData.allowed, false, "production label alone must not authorize data writes");

  const review = detectReviewAuthorization(productionOnlyIssue, { config, lock });
  assert.equal(review.allowed, true, "production label alone must satisfy branch/PR/preview authorization too");
  assert.equal(review.source.kind, "label:founder_approved_production");

  assert.equal(evaluateReviewAction({
    action: reviewActions.COMMIT,
    authorized: review.allowed,
    currentBranch: lock.branch,
    issueBranch: lock.branch,
  }).allowed, true);
  assert.equal(evaluateReviewAction({
    action: reviewActions.PUSH_BRANCH,
    authorized: review.allowed,
    issueBranch: lock.branch,
    targetBranch: lock.branch,
  }).allowed, true);
  assert.equal(evaluateReviewAction({
    action: reviewActions.CREATE_OR_UPDATE_PR,
    authorized: review.allowed,
  }).allowed, true);
  assert.equal(evaluateReviewAction({
    action: reviewActions.MERGE_TO_MAIN,
    ciPassed: true,
    productionAuthorized: production.production.allowed,
    targetBranch: "main",
  }).allowed, true);
  assert.equal(evaluateReviewAction({
    action: reviewActions.MERGE_TO_MAIN,
    ciPassed: false,
    productionAuthorized: production.production.allowed,
    targetBranch: "main",
  }).allowed, false, "merge to main must still require required validation/CI to pass");
  assert.equal(evaluateReviewAction({
    action: reviewActions.MERGE_TO_MAIN,
    branchProtectionBypassed: true,
    ciPassed: true,
    productionAuthorized: production.production.allowed,
    targetBranch: "main",
  }).allowed, false, "branch protection must never be bypassed even when authorized");
  assert.equal(evaluateReviewAction({
    action: reviewActions.PRODUCTION_DEPLOY,
    productionAuthorized: production.production.allowed,
  }).allowed, true);
  assert.equal(evaluateReviewAction({
    action: reviewActions.PRODUCTION_DEPLOY,
    productionAuthorized: production.production.allowed,
    promote: true,
  }).allowed, false, "deployment promotion is never authorized by the production label");
  assert.equal(evaluateReviewAction({
    action: reviewActions.CONFIRM_PRODUCTION_DEPLOY_STATUS,
    productionAuthorized: production.production.allowed,
  }).allowed, true);
  assert.equal(evaluateReviewAction({
    action: reviewActions.DNS_CHANGE,
    productionAuthorized: production.production.allowed,
  }).allowed, false, "DNS changes are never implicitly authorized");
  assert.equal(evaluateReviewAction({
    action: reviewActions.DESTRUCTIVE_ACTION,
    productionAuthorized: production.production.allowed,
  }).allowed, false, "destructive actions are never implicitly authorized");

  const safety = buildRunnerSafetyLines(productionOnlyIssue, lock, { authorization: review }).join("\n");
  assert.match(safety, /Founder-authorized production actions are additionally permitted/);
  assert.match(safety, /merge to `main`/);
  assert.match(safety, /Deployment promotion, DNS changes.*never authorized/);

  const pickupSafety = buildPickupSafetyNote(productionOnlyIssue, lock, { authorization: review });
  assert.match(pickupSafety, /Production authorization: the "Founder Approved — Production" label additionally allows/);

  const runnerEnv = buildRunnerExecutionEnv({ authorization: review, lock });
  assert.equal(runnerEnv.RUNNER_PRODUCTION_AUTHORIZED, "1");
  assert.match(runnerEnv.RUNNER_ALLOWED_REVIEW_ACTIONS, /merge_to_main_after_ci/);
  assert.match(runnerEnv.RUNNER_ALLOWED_REVIEW_ACTIONS, /production_deploy/);
  assert.match(runnerEnv.RUNNER_BLOCKED_ACTIONS, /production_promotion/);
  assert.match(runnerEnv.RUNNER_BLOCKED_ACTIONS, /dns_change/);
  assert.match(runnerEnv.RUNNER_BLOCKED_ACTIONS, /destructive_action/);
  assert.doesNotMatch(runnerEnv.RUNNER_BLOCKED_ACTIONS, /\bmerge_to_main\b/);
  assert.doesNotMatch(runnerEnv.RUNNER_BLOCKED_ACTIONS, /\bproduction_deploy\b/);
}

// --- Acceptance test 3: production label present, no data label -> production DB writes remain blocked.
{
  const production = detectProductionAuthorization(productionOnlyIssue, { config });
  assert.equal(evaluateReviewAction({
    action: reviewActions.PRODUCTION_DB_SCHEMA_CHANGE,
    documentedMutation: true,
    productionDataAuthorized: production.productionData.allowed,
  }).allowed, false);

  const runnerEnv = buildRunnerExecutionEnv({ authorization: detectReviewAuthorization(productionOnlyIssue, { config, lock }), lock });
  assert.equal(runnerEnv.RUNNER_PRODUCTION_DATA_AUTHORIZED, "0");
  assert.match(runnerEnv.RUNNER_BLOCKED_ACTIONS, /production_db_schema_change/);
}

// --- Acceptance test 4: both labels present -> only issue-documented production data writes are permitted.
const bothLabelsIssue = issue({
  description: [
    "Migrate legacy participant rows to the new schema exactly as documented here:",
    "UPDATE participants SET status = 'active' WHERE status = 'legacy_active'.",
    "Merge to main and confirm production deployment Ready once validated.",
  ].join(" "),
  labels: labels(["Ready for Dispatcher", "Ready for Codex", PRODUCTION_LABEL, PRODUCTION_DATA_LABEL]),
});
const dataOnlyIssue = issue({
  description: [
    "Run only the documented production data mutation after previewing the target rows:",
    "UPDATE participants SET status = 'active' WHERE status = 'legacy_active'.",
    "Do not merge, deploy, or change DNS.",
  ].join(" "),
  labels: labels(["Ready for Dispatcher", "Ready for Codex", PRODUCTION_DATA_LABEL]),
});
{
  const production = detectProductionAuthorization(bothLabelsIssue, { config });
  assert.equal(production.production.allowed, true);
  assert.equal(production.productionData.allowed, true);

  assert.equal(evaluateReviewAction({
    action: reviewActions.PRODUCTION_DB_SCHEMA_CHANGE,
    documentedMutation: true,
    productionDataAuthorized: production.productionData.allowed,
  }).allowed, true);
  assert.equal(evaluateReviewAction({
    action: reviewActions.PRODUCTION_DB_SCHEMA_CHANGE,
    documentedMutation: false,
    productionDataAuthorized: production.productionData.allowed,
  }).allowed, false, "only the exact issue-documented mutation is authorized, not an arbitrary write");

  const review = detectReviewAuthorization(bothLabelsIssue, { config, lock });
  const safety = buildRunnerSafetyLines(bothLabelsIssue, lock, { authorization: review }).join("\n");
  assert.match(safety, /Production data authorization.*exact production data mutations documented in this issue/);

  const runnerEnv = buildRunnerExecutionEnv({ authorization: review, lock });
  assert.equal(runnerEnv.RUNNER_PRODUCTION_DATA_AUTHORIZED, "1");
  assert.doesNotMatch(runnerEnv.RUNNER_BLOCKED_ACTIONS, /production_db_schema_change/);
}

{
  const production = detectProductionAuthorization(dataOnlyIssue, { config });
  assert.equal(production.production.allowed, false, "data label alone must not authorize merge/deploy");
  assert.equal(production.productionData.allowed, true, "data label alone authorizes documented production data writes");
  assert.equal(evaluateReviewAction({
    action: reviewActions.MERGE_TO_MAIN,
    ciPassed: true,
    productionAuthorized: production.production.allowed,
    targetBranch: "main",
  }).allowed, false);
  assert.equal(evaluateReviewAction({
    action: reviewActions.PRODUCTION_DEPLOY,
    productionAuthorized: production.production.allowed,
  }).allowed, false);
  assert.equal(evaluateReviewAction({
    action: reviewActions.PRODUCTION_DB_SCHEMA_CHANGE,
    documentedMutation: true,
    productionDataAuthorized: production.productionData.allowed,
  }).allowed, true);
  assert.equal(evaluateReviewAction({
    action: reviewActions.PRODUCTION_DB_SCHEMA_CHANGE,
    documentedMutation: false,
    productionDataAuthorized: production.productionData.allowed,
  }).allowed, false);

  const review = detectReviewAuthorization(dataOnlyIssue, { config, lock });
  const safety = buildRunnerSafetyLines(dataOnlyIssue, lock, { authorization: review }).join("\n");
  assert.match(safety, /Production data authorization.*exact production data mutations documented in this issue/);
  assert.match(safety, /commit, push, PR, merge\/deploy, DNS changes.*remain prohibited/);

  const pickupSafety = buildPickupSafetyNote(dataOnlyIssue, lock, { authorization: review });
  assert.match(pickupSafety, /Production data authorization: the "Founder Approved — Production Data" label allows only the exact production data mutations documented in this issue/);

  const runnerEnv = buildRunnerExecutionEnv({ authorization: review, lock });
  assert.equal(runnerEnv.RUNNER_PRODUCTION_AUTHORIZED, "0");
  assert.equal(runnerEnv.RUNNER_PRODUCTION_DATA_AUTHORIZED, "1");
  assert.match(runnerEnv.RUNNER_ALLOWED_REVIEW_ACTIONS, /documented_production_data_write/);
  assert.match(runnerEnv.RUNNER_BLOCKED_ACTIONS, /merge_to_main/);
  assert.match(runnerEnv.RUNNER_BLOCKED_ACTIONS, /production_deploy/);
  assert.doesNotMatch(runnerEnv.RUNNER_BLOCKED_ACTIONS, /production_db_schema_change/);
}

// --- Acceptance test 5: adding the production label while In Progress updates eligibility without duplicate execution.
{
  const beforeLabels = labels(["Ready for Dispatcher", "Ready for Codex"]);
  const afterLabels = labels(["Ready for Dispatcher", "Ready for Codex", PRODUCTION_LABEL]);
  const before = detectProductionAuthorization(issue({ labels: beforeLabels }), { config });
  const after = detectProductionAuthorization(issue({ labels: afterLabels }), { config });
  assert.equal(before.production.allowed, false);
  assert.equal(after.production.allowed, true, "adding the label must immediately flip authorization on the next evaluation");

  // Production authorization is orthogonal to dispatcher eligibility/routing: adding the
  // label must not change how many times an issue is picked up, only what it may do once claimed.
  const { classifyDispatchEligibility } = await import("../src/dispatch-policy.mjs");
  const eligibilityBefore = classifyDispatchEligibility(issue({ labels: beforeLabels, state: { name: "Ready" } }), { config });
  const eligibilityAfter = classifyDispatchEligibility(issue({ labels: afterLabels, state: { name: "Ready" } }), { config });
  assert.equal(eligibilityBefore.eligible, eligibilityAfter.eligible, "adding the production label must not change base dispatcher eligibility");
}

// --- Acceptance test 6: removing the label prevents new production actions after the removal point.
{
  const stillLabeled = detectProductionAuthorization(productionOnlyIssue, { config });
  assert.equal(stillLabeled.production.allowed, true);
  const afterRemoval = detectProductionAuthorization(issue({ labels: labels(["Ready for Dispatcher", "Ready for Codex"]) }), { config });
  assert.equal(afterRemoval.production.allowed, false);
  assert.equal(evaluateReviewAction({
    action: reviewActions.MERGE_TO_MAIN,
    ciPassed: true,
    productionAuthorized: afterRemoval.production.allowed,
    targetBranch: "main",
  }).allowed, false, "once the label is gone, a fresh evaluation must block merge/deploy again");
}

// --- Acceptance test 7: claim comments accurately reflect effective permissions.
{
  const plainReview = detectReviewAuthorization(issue(), { config, lock });
  const plainClaim = buildClaimAcknowledgment({ config, issue: issue(), lock, reviewAuthorization: plainReview });
  assert.match(plainClaim, /No production action is authorized by this claim\./);

  const productionReview = detectReviewAuthorization(productionOnlyIssue, { config, lock });
  const productionClaim = buildClaimAcknowledgment({ config, issue: productionOnlyIssue, lock, reviewAuthorization: productionReview });
  assert.match(productionClaim, /Production authorization: "Founder Approved — Production" label present\./);
  assert.match(productionClaim, /Production database\/schema writes remain blocked/);

  const bothReview = detectReviewAuthorization(bothLabelsIssue, { config, lock });
  const bothClaim = buildClaimAcknowledgment({ config, issue: bothLabelsIssue, lock, reviewAuthorization: bothReview });
  assert.match(bothClaim, /Production authorization: "Founder Approved — Production" and "Founder Approved — Production Data" labels present\./);
  assert.match(bothClaim, /only the issue-documented production data mutations are authorized/);

  const dataOnlyReview = detectReviewAuthorization(dataOnlyIssue, { config, lock });
  const dataOnlyClaim = buildClaimAcknowledgment({ config, issue: dataOnlyIssue, lock, reviewAuthorization: dataOnlyReview });
  assert.match(dataOnlyClaim, /Production data authorization: "Founder Approved — Production Data" label present\./);
  assert.match(dataOnlyClaim, /Production branch\/PR\/merge\/deploy actions remain blocked/);

  const completionReport = buildCompletionReport({
    finalText: "Validation passed.",
    issue: productionOnlyIssue,
    lock: { ...lock, publishHealth: {} },
    reviewAuthorization: productionReview,
    reviewPackage: { required: false },
    summary: { changedFiles: [], headCommit: "abc1234", status: "" },
  });
  assert.match(completionReport, /production delivery actions \(commit, push, PR, merge to main after required validation\/CI, normal Vercel production deploy\) may have been performed/);
}

// --- Acceptance test 8: USA-157 / USA-158 style flows.
{
  // The bug this issue fixes: explicit founder delivery language in the issue body
  // ("merge to main", "confirm production deployment Ready") must NOT by itself grant
  // production authorization -- only the canonical label does. This guards against
  // regressing to either extreme (always-blocked, or inferred-from-keywords).
  const usa157NoLabel = issue({
    description: "Connect Tanner to the member record so participant identity is stable across journeys. Merge to main and confirm production deployment Ready once validated.",
    identifier: "USA-157",
    title: "Participant identity: stable journey access; connect Tanner to member",
  });
  const usa157NoLabelAuth = detectProductionAuthorization(usa157NoLabel, { config });
  assert.equal(usa157NoLabelAuth.production.allowed, false, "delivery language alone (no label) must not authorize production actions");
  const usa157NoLabelClaim = buildClaimAcknowledgment({
    config,
    issue: usa157NoLabel,
    lock,
    reviewAuthorization: detectReviewAuthorization(usa157NoLabel, { config, lock }),
  });
  assert.match(usa157NoLabelClaim, /No production action is authorized by this claim\./);

  const usa157Labeled = issue({
    description: usa157NoLabel.description,
    identifier: "USA-157",
    labels: labels(["Ready for Dispatcher", "Ready for Codex", PRODUCTION_LABEL]),
    title: usa157NoLabel.title,
  });
  const usa157LabeledAuth = detectProductionAuthorization(usa157Labeled, { config });
  assert.equal(usa157LabeledAuth.production.allowed, true, "the canonical label must authorize the exact same delivery language that was previously blocked");
  const usa157LabeledClaim = buildClaimAcknowledgment({
    config,
    issue: usa157Labeled,
    lock,
    reviewAuthorization: detectReviewAuthorization(usa157Labeled, { config, lock }),
  });
  assert.match(usa157LabeledClaim, /Production authorization: "Founder Approved — Production" label present\./);

  const usa158Labeled = issue({
    description: "Multi-journey group layout, assignment flow, and inline editing. Merge to main and confirm production deployment Ready once validation passes.",
    identifier: "USA-158",
    labels: labels(["Ready for Dispatcher", "Ready for Claude", PRODUCTION_LABEL]),
    title: "Journey UX v1.2: multi-journey group layout, assignment flow, and inline",
  });
  assert.equal(detectProductionAuthorization(usa158Labeled, { config }).production.allowed, true);
  assert.equal(evaluateReviewAction({
    action: reviewActions.MERGE_TO_MAIN,
    ciPassed: true,
    productionAuthorized: detectProductionAuthorization(usa158Labeled, { config }).production.allowed,
    targetBranch: "main",
  }).allowed, true);

  // Issue-scoping / no cross-issue inheritance: referencing a labeled issue's identifier in
  // an unrelated issue's text must not borrow that issue's production authorization.
  const unrelatedIssueReferencingUsa157 = issue({
    description: `See USA-157 for the pattern; do not merge or deploy this issue's changes without separate review.`,
    identifier: "USA-160",
    labels: labels(["Ready for Dispatcher", "Ready for Codex"]),
  });
  assert.equal(
    detectProductionAuthorization(unrelatedIssueReferencingUsa157, { config }).production.allowed,
    false,
    "authorization must never be inherited from a related/referenced issue",
  );
}

console.log("dispatcher production authorization regression passed");
