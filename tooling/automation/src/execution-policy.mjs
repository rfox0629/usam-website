const productionBranches = new Set(["main", "master", "production", "prod"]);
const mainBranchNames = new Set(["main", "master"]);
// DNS changes, destructive actions, and deployment promotion are never granted
// by Founder Approved — Production or Founder Approved — Production Data;
// they always require separate, explicit authorization outside this policy.
const alwaysBlockedActions = new Set([
  "destructive_action",
  "dns_change",
  "production_promotion",
]);

export const reviewActions = {
  ATTACH_REVIEW_ASSETS: "attach_review_assets",
  COMMIT: "commit",
  CONFIRM_PRODUCTION_DEPLOY_STATUS: "confirm_production_deploy_status",
  CREATE_OR_UPDATE_PR: "create_or_update_pr",
  CREATE_PROTECTED_PREVIEW: "create_protected_preview",
  DESTRUCTIVE_ACTION: "destructive_action",
  DNS_CHANGE: "dns_change",
  MERGE_TO_MAIN: "merge_to_main",
  MOVE_TO_IN_REVIEW: "move_to_in_review",
  POST_LINEAR_REVIEW_COMMENT: "post_linear_review_comment",
  PRODUCTION_DB_SCHEMA_CHANGE: "production_db_schema_change",
  PRODUCTION_DEPLOY: "production_deploy",
  PRODUCTION_PROMOTION: "production_promotion",
  PUSH_BRANCH: "push_branch",
};

export function isProductionBranch(branch) {
  return productionBranches.has(String(branch || "").replace(/^refs\/heads\//, ""));
}

function normalizeBranch(branch) {
  return String(branch || "").replace(/^refs\/heads\//, "");
}

function allowed(reason) {
  return { allowed: true, reason };
}

function blocked(reason) {
  return { allowed: false, reason };
}

export function evaluateReviewAction(input = {}) {
  const action = input.action;
  const issueBranch = normalizeBranch(input.issueBranch);
  const targetBranch = normalizeBranch(input.targetBranch || input.currentBranch || issueBranch);

  if (alwaysBlockedActions.has(action)) {
    return blocked(`${action} is always prohibited for dispatcher runners.`);
  }

  if (action === reviewActions.MERGE_TO_MAIN) {
    if (!input.productionAuthorized) {
      return blocked("Merge to main requires explicit Founder Approved — Production authorization.");
    }
    if (!mainBranchNames.has(targetBranch)) {
      return blocked("Merge to main is only allowed when the target branch is main.");
    }
    if (input.ciPassed !== true) {
      return blocked("Merge to main requires required validation/CI to pass first.");
    }
    if (input.branchProtectionBypassed === true) {
      return blocked("Branch protection must not be bypassed for merge to main.");
    }
    return allowed("Authorized merge to main is allowed after required validation/CI.");
  }

  if (action === reviewActions.PRODUCTION_DEPLOY) {
    if (!input.productionAuthorized) {
      return blocked("Production deploy requires explicit Founder Approved — Production authorization.");
    }
    if (input.promote === true) {
      return blocked("Deployment promotion is never authorized by production labels.");
    }
    if (input.dnsChange === true) {
      return blocked("DNS changes are never authorized by production labels.");
    }
    return allowed("Authorized normal Vercel production deployment is allowed.");
  }

  if (action === reviewActions.PRODUCTION_DB_SCHEMA_CHANGE) {
    if (!input.productionDataAuthorized) {
      return blocked("Production database/schema writes require explicit Founder Approved — Production Data authorization.");
    }
    if (input.documentedMutation !== true) {
      return blocked("Production data writes must match a mutation explicitly documented in the issue.");
    }
    return allowed("Authorized, issue-documented production data write is allowed after pre-write validation and rollback planning.");
  }

  if (action === reviewActions.CREATE_OR_UPDATE_PR) {
    if (!input.authorized && !input.productionAuthorized) {
      return blocked("Creating or updating a pull request requires founder authorization.");
    }
    return allowed("Authorized pull request creation/update is allowed.");
  }

  if (action === reviewActions.CONFIRM_PRODUCTION_DEPLOY_STATUS) {
    if (!input.productionAuthorized) {
      return blocked("Confirming production deployment status requires explicit Founder Approved — Production authorization.");
    }
    return allowed("Authorized production deployment status confirmation is allowed.");
  }

  if (!input.authorized) {
    return blocked("Founder authorization is required for commit, push, preview, asset, or Linear review actions.");
  }

  if (isProductionBranch(targetBranch)) {
    return blocked(`Production branch ${targetBranch} is prohibited.`);
  }

  if (action === reviewActions.COMMIT) {
    if (!issueBranch || targetBranch !== issueBranch) {
      return blocked("Commits are allowed only on the issue branch.");
    }
    return allowed("Authorized issue branch commit is allowed.");
  }

  if (action === reviewActions.PUSH_BRANCH) {
    if (!issueBranch || targetBranch !== issueBranch) {
      return blocked("Push is allowed only for the issue branch.");
    }
    return allowed("Authorized issue branch push is allowed.");
  }

  if (action === reviewActions.CREATE_PROTECTED_PREVIEW) {
    if (input.previewTarget && input.previewTarget !== "preview") {
      return blocked("Only preview Vercel deployments are allowed.");
    }
    if (input.production === true || input.promote === true) {
      return blocked("Production deploys and promotions are prohibited.");
    }
    if (input.protectedPreview !== true) {
      return blocked("Preview must remain protected for founder review.");
    }
    return allowed("Authorized protected preview is allowed.");
  }

  if (action === reviewActions.ATTACH_REVIEW_ASSETS) {
    return allowed("Authorized review asset exposure is allowed.");
  }

  if (action === reviewActions.POST_LINEAR_REVIEW_COMMENT) {
    return allowed("Authorized Linear review comment is allowed.");
  }

  if (action === reviewActions.MOVE_TO_IN_REVIEW) {
    if (!input.reviewPackage?.passed) {
      return blocked("Issue cannot enter In Review without a usable review package.");
    }
    return allowed("Review package gate passed.");
  }

  return blocked(`Unknown review action: ${action || "missing"}.`);
}

export function buildRunnerExecutionEnv({ authorization, lock }) {
  const authorized = authorization?.allowed === true;
  const productionAuthorization = authorization?.productionAuthorization || null;
  const productionAllowed = productionAuthorization?.production?.allowed === true;
  const productionDataAllowed = productionAuthorization?.productionData?.allowed === true;

  const allowedActions = authorized
    ? ["commit", "push_issue_branch", "protected_vercel_preview", "screenshots", "review_assets", "linear_review_comment"]
    : [];
  if (productionAllowed) {
    allowedActions.push("create_or_update_pr", "merge_to_main_after_ci", "production_deploy", "confirm_production_deploy_status");
  }
  if (productionDataAllowed) {
    allowedActions.push("documented_production_data_write");
  }

  const blockedActions = ["production_promotion", "dns_change", "destructive_action", "unrelated_worktrees", "unrelated_external_comms"];
  if (!productionAllowed) {
    blockedActions.unshift("merge_to_main", "production_deploy");
  }
  if (!productionDataAllowed) {
    blockedActions.push("production_db_schema_change");
  }

  return {
    RUNNER_ALLOWED_REVIEW_ACTIONS: allowedActions.join(","),
    RUNNER_BLOCKED_ACTIONS: blockedActions.join(","),
    RUNNER_ISSUE_BRANCH: lock?.branch || "",
    RUNNER_PRODUCTION_AUTHORIZED: productionAllowed ? "1" : "0",
    RUNNER_PRODUCTION_DATA_AUTHORIZED: productionDataAllowed ? "1" : "0",
    RUNNER_REVIEW_AUTHORIZED: authorized ? "1" : "0",
  };
}
