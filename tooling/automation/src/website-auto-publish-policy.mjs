import { reviewActions, evaluateReviewAction, isProductionBranch } from "./execution-policy.mjs";
import { validateReviewRoute } from "./publisher-policy.mjs";
import { issueLabels, issueText, normalizeText } from "./routing-policy.mjs";

const defaultLinearLabels = {
  deprecatedRoutingLabels: ["Ready for Codex", "Ready for Claude"],
  labelReadyForDispatcher: "Ready for Dispatcher",
  runnerLabelGroup: "Runner",
};

const transientCredentialRe = /\b(authentication failed|could not read username|permission denied|credential|unauthorized|forbidden|401|403|repository not found|not logged in|login required)\b/i;
const transientNetworkRe = /\b(etimedout|econnreset|econnrefused|network|timeout|timed out|temporar(?:y|ily)|try again|rate limit|5\d\d)\b/i;
const vercelFailureRe = /\b(vercel|deployment|build queued|deployment failed|deployment error|project not found|scope|token)\b/i;

function linearConfig(config = {}) {
  return {
    ...defaultLinearLabels,
    ...(config.linear || {}),
  };
}

function publishConfig(config = {}) {
  const policy = config.websiteAutoPublish || {};
  return {
    enabled: policy.enabled !== false,
    handoffDir: policy.handoffDir || "handoffs",
    maxRetries: Number.isFinite(Number(policy.maxRetries)) ? Number(policy.maxRetries) : 2,
    retryMs: Number.isFinite(Number(policy.retryMs)) ? Number(policy.retryMs) : 5 * 60 * 1000,
  };
}

function textWithNewestComments(issue) {
  const comments = (issue.comments?.nodes || [])
    .slice()
    .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
    .map((comment) => comment.body || "")
    .filter(Boolean)
    .join("\n\n");
  return [comments, issue.title, issue.description].filter(Boolean).join("\n\n");
}

function labelParentName(label) {
  return label?.parent?.name || label?.parent || null;
}

function runnerSelectionsForIssue(issue, linear) {
  const selections = new Set();

  for (const label of issue.labels?.nodes || []) {
    const name = label?.name;
    const parentName = labelParentName(label);
    const isRunnerGroup = parentName === linear.runnerLabelGroup;
    const isBareRunnerLabel = !parentName && ["Codex", "Claude"].includes(name);
    if (!isRunnerGroup && !isBareRunnerLabel) continue;
    if (name === "Codex") selections.add("codex");
    if (name === "Claude") selections.add("claude");
  }

  return [...selections];
}

function deprecatedRoutingLabelsForIssue(issue, linear) {
  const labels = issueLabels(issue);
  return (linear.deprecatedRoutingLabels || []).filter((label) => labels.has(label));
}

export function hasPreviewProhibition(issue) {
  const text = normalizeText(issueText(issue));
  const directNoPreview = /\b(?:do not|don't|no|without)\s+(?:create\s+|publish\s+|deploy\s+|refresh\s+|post\s+|share\s+)?(?:a\s+)?(?:protected\s+)?(?:vercel\s+)?preview\b/i;
  const localOnly = /\b(?:local[-\s]only|keep\s+(?:this\s+)?local|do\s+not\s+publish)\b/i;
  return directNoPreview.test(text) || localOnly.test(text);
}

export function websiteAutoPublishEligibility(issue, lock = {}, config = {}) {
  const policy = publishConfig(config);
  const linear = linearConfig(config);
  const labels = issueLabels(issue);
  const runnerSelections = runnerSelectionsForIssue(issue, linear);
  const deprecatedRoutingLabels = deprecatedRoutingLabelsForIssue(issue, linear);
  const reasons = [];

  if (!policy.enabled) {
    reasons.push("website auto-publish is disabled");
  }
  if (!labels.has("Website")) {
    reasons.push("missing Website label");
  }
  if (!labels.has(linear.labelReadyForDispatcher)) {
    reasons.push(`missing ${linear.labelReadyForDispatcher}`);
  }
  if (deprecatedRoutingLabels.length) {
    reasons.push(`deprecated routing labels present: ${deprecatedRoutingLabels.join(", ")}`);
  }
  if (runnerSelections.length !== 1) {
    reasons.push(runnerSelections.length ? "both ownership labels present" : "missing ownership label");
  }
  if ((lock.repositoryName || "website") !== "website") {
    reasons.push("repository is not website");
  }
  if (lock.repositoryKind === "local") {
    reasons.push("local repositories are not eligible for website previews");
  }
  if (!lock.branch) {
    reasons.push("missing issue branch");
  } else if (isProductionBranch(lock.branch)) {
    reasons.push(`production branch ${lock.branch} is prohibited`);
  }
  if (!lock.worktreePath) {
    reasons.push("missing isolated worktree");
  }
  if (hasPreviewProhibition(issue)) {
    reasons.push("founder instruction prohibits preview publishing");
  }

  return {
    eligible: reasons.length === 0,
    policy,
    reasons,
    runner: runnerSelections[0] || null,
  };
}

export function websiteAutoPreviewAuthorization(issue, options = {}) {
  const eligibility = websiteAutoPublishEligibility(issue, options.lock || {}, options.config || {});
  if (!eligibility.eligible) {
    return {
      allowed: false,
      reason: `Website auto-preview authorization not available: ${eligibility.reasons.join(", ") || "not eligible"}.`,
      source: null,
    };
  }

  return {
    allowed: true,
    allowedActions: [
      "run validation",
      "commit validated scoped files",
      "push only the issue branch",
      "create or refresh a protected Vercel preview",
      "verify the requested route",
      "post the preview URL to Linear",
    ],
    reason: "Website auto-preview policy pre-authorizes non-production review actions for this qualifying issue.",
    source: {
      createdAt: null,
      kind: "website_auto_preview_policy",
      snippet: "Website + Ready for Dispatcher + exactly one ownership label; no preview prohibition.",
    },
  };
}

export function defaultPublishHealth(overrides = {}) {
  return {
    branchPushed: false,
    commitCreated: false,
    exactBlocker: null,
    implementationComplete: false,
    nextRetryAt: null,
    previewReady: false,
    previewRequested: false,
    previewUrl: null,
    previewUrlPosted: false,
    previewVerified: false,
    stage: "not_started",
    ...overrides,
  };
}

export function mergePublishHealth(current = null, patch = {}) {
  return {
    ...defaultPublishHealth(current || {}),
    ...patch,
  };
}

export function validationCommandsForPackage(packageJson = {}) {
  const scripts = packageJson.scripts || {};
  const deps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  };
  const commands = [];

  if (scripts.typecheck) {
    commands.push({ args: ["run", "typecheck"], command: "npm", label: "npm run typecheck" });
  } else if (deps.typescript) {
    commands.push({ args: ["--yes", "tsc", "--noEmit"], command: "npx", label: "npx tsc --noEmit" });
  }

  if (scripts.build) {
    commands.push({ args: ["run", "build"], command: "npm", label: "npm run build" });
  }

  return commands;
}

export function classifyAutoPublishFailure(stage, result = {}) {
  const text = [result.stderr, result.stdout, result.error?.message, result.message]
    .map((value) => String(value || ""))
    .filter(Boolean)
    .join("\n")
    .trim();
  const tail = text.length > 1200 ? text.slice(-1200) : text;

  if (stage === "validation") {
    return {
      exactBlocker: tail || "Build/type validation failed.",
      kind: "build_validation_failed",
      preventsPush: true,
      retryable: false,
      stage,
    };
  }

  if (stage === "push") {
    const retryable = transientCredentialRe.test(text) || transientNetworkRe.test(text);
    return {
      exactBlocker: tail || "Git branch push failed.",
      kind: retryable ? "push_transient_or_credential_failed" : "push_failed",
      preventsPush: false,
      retryable,
      stage,
    };
  }

  if (stage === "vercel") {
    const retryable = vercelFailureRe.test(text) || transientCredentialRe.test(text) || transientNetworkRe.test(text);
    return {
      exactBlocker: tail || "Vercel protected preview creation failed.",
      kind: retryable ? "vercel_transient_failed" : "vercel_failed",
      preventsPush: false,
      retryable,
      stage,
    };
  }

  return {
    exactBlocker: tail || `${stage || "publish"} failed.`,
    kind: `${stage || "publish"}_failed`,
    preventsPush: false,
    retryable: transientNetworkRe.test(text),
    stage,
  };
}

export function nextRetryIso(now = new Date(), retryMs = 5 * 60 * 1000) {
  return new Date(now.getTime() + Math.max(0, Number(retryMs || 0))).toISOString();
}

export function alternateRunner(runner) {
  return runner === "codex" ? "claude" : "codex";
}

export function publishFailureRecovery(failure, { attempt = 1, config = {}, runner = "codex" } = {}) {
  const policy = publishConfig(config);
  const retryAllowed = failure.retryable && attempt <= policy.maxRetries;
  return {
    alternateRunner: retryAllowed ? null : alternateRunner(runner),
    nextRetryAt: retryAllowed ? nextRetryIso(new Date(), policy.retryMs) : null,
    retryAllowed,
    routeAlternateRunner: failure.retryable && !retryAllowed,
  };
}

export function extractRequestedRoute(issue) {
  const text = textWithNewestComments(issue);
  const firstValid = (patterns) => {
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const candidate = validateReviewRoute(match[1]);
        if (candidate.ok) return candidate.route;
      }
    }
    return null;
  };

  const exact = firstValid([
    /\bexact\s+`(\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]*)`/gi,
    /\bexact\s+(\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]*)\b/gi,
  ]);
  if (exact) {
    return exact;
  }

  return firstValid([
    /`(\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]*)`/g,
    /\b(?:route|path|page)\s+(\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]*)\b/gi,
  ]) || "/";
}

export const approvedRiverOfMinistriesParagraph = "Many streams are moving, each carrying its own story, calling, and purpose. USA Missionaries is helping bring those streams together into one river, flowing with greater unity, strength, and Kingdom purpose.";

export function expectedMarkersForReviewRoute(issue, route) {
  const text = `${issue.title || ""}\n${issue.description || ""}`.toLowerCase();
  if (route === "/system" || text.includes("river of ministries")) {
    return [
      "ONE RIVER, ONE MISSION",
      approvedRiverOfMinistriesParagraph,
    ];
  }
  if (route.includes("discipleship-operating-system") || text.includes("dos")) {
    return ["DISCIPLESHIP OPERATING SYSTEM", "Request Information", "You Will Know Them by Their Fruit"];
  }
  if (route.includes("kitchen-table-gospel")) {
    return ["Kitchen Table Gospel"];
  }
  return [];
}

export function previewDeploymentStrategy({ existingPreviewUrl = null, branchPushed = false } = {}) {
  if (existingPreviewUrl) {
    return {
      mode: branchPushed ? "refresh_existing_branch_preview" : "reuse_existing_verified_preview",
      requestNewDeployment: false,
    };
  }

  return {
    mode: "create_protected_preview",
    requestNewDeployment: true,
  };
}

export function buildVerifiedPreviewComment({ issue, previewUrl, route = "/", summary = "Implementation completed and preview verified." }) {
  return [
    `${issue.identifier} - ${issue.title}`,
    `Verified preview URL: ${previewUrl}`,
    `Verified route: ${route}`,
    `Updated: ${summary}`,
    "Blocker: None.",
  ].join("\n");
}

export function buildPreviewBlockedComment({ issue, blocker, nextRetryAt = null, stage = "preview" }) {
  return [
    `Dispatcher implementation complete, but preview publishing is blocked.`,
    "",
    `${issue.identifier} - ${issue.title}`,
    `Stage: ${stage}`,
    `Blocker: ${blocker || "unknown"}`,
    nextRetryAt ? `Next retry: ${nextRetryAt}` : "Next retry: not scheduled",
    "",
    "The issue remains `In Progress`; production merge/deployment/promotion, DNS changes, production database/schema changes, destructive actions, and unrelated communications remain prohibited.",
  ].join("\n");
}

export function previewUrlAppearsBeforeReviewDocumentation(comment) {
  const urlIndex = comment.indexOf("Verified preview URL:");
  if (urlIndex < 0) {
    return false;
  }
  const docs = ["Screenshots:", "Validation:", "Changed files:", "Known limitations:", "Exact founder decision requested:"]
    .map((marker) => comment.indexOf(marker))
    .filter((index) => index >= 0);
  return docs.every((index) => urlIndex < index);
}

export function inferDestinationIssueIdentifier(sourceIssue, fallback = null) {
  const source = sourceIssue.identifier;
  const ids = [...textWithNewestComments(sourceIssue).matchAll(/\bUSA-\d+\b/g)]
    .map((match) => match[0])
    .filter((identifier) => identifier !== source);
  return ids[0] || fallback;
}

export function buildHandoffRecord({ changedFiles = [], destinationIssue = null, sourceIssue, sourceLock }) {
  return {
    changedFiles: [...changedFiles],
    createdAt: new Date().toISOString(),
    destinationIssue: destinationIssue || inferDestinationIssueIdentifier(sourceIssue),
    sourceBranch: sourceLock.branch,
    sourceIssue: sourceIssue.identifier,
    sourceRunner: sourceLock.runner,
    sourceWorktree: sourceLock.worktreePath,
    status: "available_to_codex",
  };
}

export function handoffRecordEligible(sourceIssue, sourceLock, changedFiles = []) {
  if (sourceLock.runner !== "claude") {
    return false;
  }
  if ((sourceLock.repositoryName || "website") !== "website") {
    return false;
  }
  if (!changedFiles.length) {
    return false;
  }
  return Boolean(inferDestinationIssueIdentifier(sourceIssue));
}

export function evaluateAutoPublishActions({ authorization, branch, protectedPreview = true } = {}) {
  const authorized = authorization?.allowed === true;
  return {
    commit: evaluateReviewAction({
      action: reviewActions.COMMIT,
      authorized,
      currentBranch: branch,
      issueBranch: branch,
    }),
    preview: evaluateReviewAction({
      action: reviewActions.CREATE_PROTECTED_PREVIEW,
      authorized,
      issueBranch: branch,
      previewTarget: "preview",
      protectedPreview,
    }),
    productionDeploy: evaluateReviewAction({
      action: reviewActions.PRODUCTION_DEPLOY,
      authorized,
      issueBranch: branch,
      previewTarget: "production",
      protectedPreview: false,
    }),
    push: evaluateReviewAction({
      action: reviewActions.PUSH_BRANCH,
      authorized,
      issueBranch: branch,
      targetBranch: branch,
    }),
  };
}
