import { detectProductionAuthorization } from "./production-authorization.mjs";
import { isGeneratedDispatcherComment } from "./routing-policy.mjs";
import { websiteAutoPreviewAuthorization } from "./website-auto-publish-policy.mjs";

const defaultFounderAuthorNames = ["Ryan Fox"];

function labelNames(issue) {
  return (issue.labels?.nodes || []).map((label) => label.name).filter(Boolean);
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function issueCoreText(issue) {
  return [issue.title, issue.description].map(normalizeText).filter(Boolean).join("\n\n");
}

function commentAllowedByAuthor(comment, founderAuthorNames) {
  const names = founderAuthorNames.length ? founderAuthorNames : defaultFounderAuthorNames;
  const authorName = comment.author?.name || comment.author?.displayName || comment.user?.name || comment.user?.displayName || "";
  if (!authorName) {
    return false;
  }
  return names.some((name) => authorName.toLowerCase() === name.toLowerCase());
}

function commentTexts(issue, founderAuthorNames) {
  return (issue.comments?.nodes || [])
    .filter((comment) => commentAllowedByAuthor(comment, founderAuthorNames))
    .filter((comment) => !isGeneratedDispatcherComment(comment))
    .map((comment) => normalizeText(comment.body))
    .filter(Boolean);
}

function allRelevantText(issue, founderAuthorNames = defaultFounderAuthorNames) {
  return [issueCoreText(issue), ...commentTexts(issue, founderAuthorNames)]
    .filter(Boolean)
    .join("\n\n");
}

function firstMatchingSource(issue, founderAuthorNames, matcher) {
  const sources = [
    { kind: "issue_description", text: issueCoreText(issue) },
    ...(issue.comments?.nodes || [])
      .filter((comment) => commentAllowedByAuthor(comment, founderAuthorNames))
      .filter((comment) => !isGeneratedDispatcherComment(comment))
      .map((comment) => ({
        createdAt: comment.createdAt || null,
        kind: "founder_comment",
        text: normalizeText(comment.body),
      })),
  ].filter((source) => source.text);

  for (const source of sources) {
    if (matcher(source.text)) {
      return source;
    }
  }

  return null;
}

export function detectReviewAuthorization(issue, options = {}) {
  const founderAuthorNames = options.founderAuthorNames || defaultFounderAuthorNames;
  const productionAuthorization = options.productionAuthorization || detectProductionAuthorization(issue, options);

  // Founder Approved — Production is an explicit, machine-readable label and
  // is issue-scoped by construction (detectProductionAuthorization only reads
  // labels on this issue). It is a stronger, canonical signal than the text
  // heuristics below, and it already grants the underlying branch/PR/preview
  // actions those heuristics exist to detect, so it short-circuits them.
  if (productionAuthorization.production.allowed) {
    return {
      allowed: true,
      allowedActions: [
        "commit validated changes",
        "push only the issue branch",
        "create or update a protected Vercel preview",
        "generate screenshots",
        "attach or expose review assets",
        "post preview URLs and review instructions",
        "create or update a pull request",
        "merge to main after required validation/CI",
        "normal Vercel production deployment",
        "confirm production deployment status",
      ],
      productionAuthorization,
      reason: `"${productionAuthorization.production.label}" label authorizes scoped branch/PR/merge/deploy actions for this issue.`,
      source: {
        createdAt: null,
        kind: "label:founder_approved_production",
        snippet: productionAuthorization.production.label,
      },
    };
  }

  const authorizationRe = /\b(authori[sz](?:e|es|ed|ation|ing))\b/i;
  const approvedActionRe = /\bapproved\s+(?:to|for)\s+(?:commit|push|create|deploy|publish)\b/i;
  const scopedActionRe = /\b(push(?:ing)?\s+(?:the\s+)?(?:existing\s+)?(?:issue\s+)?branch|branch\s+push|commit(?:ted|ting)?\s+(?:the\s+)?(?:existing\s+)?validated\s+changes|commit\s*,\s*push\s*,\s*deploy\s+(?:a\s+)?(?:protected\s+)?(?:vercel\s+)?preview|protected\s+vercel\s+preview|vercel\s+preview\s+deployment|push\s+and\s+deploy\s+preview|create\s+(?:or\s+update\s+)?(?:a\s+)?protected\s+vercel\s+preview|review\s+assets?|screenshots?)\b/i;
  const explicitFounderRe = /\bexplicit(?:ly)?\s+(?:founder\s+)?authori[sz](?:ed|es|ation)\b/i;

  const source = firstMatchingSource(issue, founderAuthorNames, (text) => (
    (authorizationRe.test(text) && scopedActionRe.test(text))
    || approvedActionRe.test(text)
    || (explicitFounderRe.test(text) && scopedActionRe.test(text))
  ));

  if (!source) {
    const automatic = websiteAutoPreviewAuthorization(issue, options);
    if (automatic.allowed) {
      return { ...automatic, productionAuthorization };
    }

    return {
      allowed: false,
      productionAuthorization,
      reason: "No explicit founder authorization for branch push/protected preview review actions was found.",
      source: null,
    };
  }

  return {
    allowed: true,
    allowedActions: [
      "commit validated changes",
      "push only the issue branch",
      "create or update a protected Vercel preview",
      "generate screenshots",
      "attach or expose review assets",
      "post preview URLs and review instructions",
    ],
    productionAuthorization,
    reason: "Explicit founder authorization found for scoped review-package actions.",
    source: {
      createdAt: source.createdAt || null,
      kind: source.kind,
      snippet: source.text.slice(0, 600),
    },
  };
}

export function buildRunnerSafetyLines(issue, lock, options = {}) {
  const authorization = options.authorization || detectReviewAuthorization(issue, options);
  const productionAuthorization = authorization.productionAuthorization
    || options.productionAuthorization
    || detectProductionAuthorization(issue, options);
  const productionAllowed = productionAuthorization.production.allowed;
  const productionDataAllowed = productionAuthorization.productionData.allowed;
  const productionDataSafetyLine = productionDataAllowed
    ? `- Production data authorization (via the "${productionAuthorization.productionData.label}" label) permits only the exact production data mutations documented in this issue, after pre-write validation and a rollback/revocation plan; no other production database or schema write is authorized.`
    : `- Production database/schema writes remain prohibited: the "${productionAuthorization.productionData.label}" label is not present on this issue.`;
  if (authorization.allowed) {
    const previewFirstIteration = isPreviewFirstIterationCycle({ lock, config: options.config });
    return [
      "- Work only in this isolated worktree.",
      `- Founder-authorized review actions are permitted for this issue only: commit validated changes, push only the issue branch \`${lock.branch}\`, create or update a protected Vercel preview deployment, generate screenshots, attach or expose review assets, and post preview URLs/review instructions back to Linear.`,
      productionAllowed
        ? `- Founder-authorized production actions are additionally permitted for this issue only (via the "${productionAuthorization.production.label}" label), after required validation/CI passes and branch protection stays intact: create/update a pull request, merge to \`main\`, perform a normal (non-promotion) Vercel production deployment, and confirm production deployment status.`
        : "- Production merge, production deployment, deployment promotion, DNS changes, destructive filesystem/repository actions, unrelated worktrees, and unrelated external communications remain prohibited.",
      productionDataSafetyLine,
      productionAllowed || productionDataAllowed
        ? "- Deployment promotion, DNS changes, destructive filesystem/repository actions, financial/legal actions, unrelated worktrees, and unrelated external communications are never authorized by these labels and remain prohibited."
        : null,
      "- Do not use production secrets or change production configuration. Use existing protected preview/project settings and report any access notes needed for review.",
      previewFirstIteration
        ? "- Active website iteration uses the preview-first gate: keep the issue In Progress and post the verified protected preview URL with one concise update sentence; do not wait for screenshots, long review packages, changed-file summaries, validation narratives, known-limitations sections, estimated review time, formal In Review status, or test submissions unless merge-readiness was explicitly requested."
        : "- Do not claim the issue is review-ready unless the founder can open the review package: working preview URL or directly viewable review assets, validation summary, and exact founder decision requested.",
    ].filter((line) => line !== null);
  }

  return [
    "- Work only in this isolated worktree.",
    productionDataAllowed
      ? `- Production data authorization (via the "${productionAuthorization.productionData.label}" label) permits only the exact production data mutations documented in this issue, after pre-write validation and a rollback/revocation plan; commit, push, PR, merge/deploy, DNS changes, destructive filesystem/repository actions, unrelated worktrees, and unrelated external communications remain prohibited.`
      : "- Do not commit, push, deploy, change DNS, change production database/schema, perform destructive filesystem/repository actions, send external communications, or touch unrelated worktrees.",
  ];
}

export function buildPickupSafetyNote(issue, lock, options = {}) {
  const authorization = options.authorization || detectReviewAuthorization(issue, options);
  const productionAuthorization = authorization.productionAuthorization
    || options.productionAuthorization
    || detectProductionAuthorization(issue, options);
  if (authorization.allowed) {
    const lines = [
      "Safety: founder-authorized review actions are allowed for this issue only: commit validated changes, push the issue branch, create/update a protected Vercel preview, generate screenshots, expose review assets, and post review links/details.",
    ];
    if (productionAuthorization.production.allowed) {
      lines.push(`Production authorization: the "${productionAuthorization.production.label}" label additionally allows creating/updating a pull request, merging to main after required validation/CI, a normal Vercel production deployment, and confirming production deployment status.`);
      lines.push(productionAuthorization.productionData.allowed
        ? `Production data authorization: the "${productionAuthorization.productionData.label}" label allows only the exact production data mutations documented in this issue, after pre-write validation and a rollback/revocation plan.`
        : `Production data writes remain blocked: the "${productionAuthorization.productionData.label}" label is not present on this issue.`);
      lines.push("Still prohibited: deployment promotion, DNS changes, destructive actions, financial/legal actions, and unrelated external communications.");
    } else {
      lines.push("Still prohibited: production merge/deployment/promotion, DNS changes, production database/schema changes, destructive actions, unrelated worktrees, and unrelated external communications.");
    }
    return lines.join("\n");
  }

  if (productionAuthorization.productionData.allowed) {
    return [
      `Production data authorization: the "${productionAuthorization.productionData.label}" label allows only the exact production data mutations documented in this issue, after pre-write validation and a rollback/revocation plan.`,
      "Safety: no commit, push, deploy, DNS, financial/legal, destructive, or non-Linear external communication actions are allowed.",
    ].join("\n");
  }

  return "Safety: no commit, push, deploy, DNS, production database, financial/legal, destructive, or non-Linear external communication actions are allowed.";
}

function issueNeedsReviewPackage(issue, authorization) {
  const labels = new Set(labelNames(issue));
  const text = allRelevantText(issue).toLowerCase();
  return Boolean(
    authorization.allowed
    || (labels.has("Founder Approval") && /\b(review package|preview url|protected preview|screenshots?|review assets?)\b/i.test(text))
  );
}

function issueRequiresPreview(issue) {
  const text = allRelevantText(issue);
  const preview = String.raw`(?:protected\s+(?:vercel\s+)?preview|(?:verified\s+|working\s+)?(?:vercel\s+)?preview\s+(?:urls?|links?)|working\s+preview)`;
  const explicitPreviewDeliverablePatterns = [
    new RegExp(String.raw`\brequired\s+review\s+package\b[\s\S]{0,500}\b${preview}\b`, "i"),
    new RegExp(String.raw`\breview\s+package\b[\s\S]{0,160}\b(?:with|include|includes|including|requires?|must)\b[\s\S]{0,160}\b${preview}\b`, "i"),
    new RegExp(String.raw`\breturn\s+with\b[\s\S]{0,240}\b${preview}\b`, "i"),
    new RegExp(String.raw`\bdeliverables?\b[\s\S]{0,240}\b${preview}\b`, "i"),
    new RegExp(String.raw`\bdo\s+not\s+move\b[\s\S]{0,240}\bIn\s+Review\b[\s\S]{0,240}\b${preview}\b`, "i"),
  ];

  return explicitPreviewDeliverablePatterns.some((pattern) => pattern.test(text));
}

function cleanUrl(url) {
  return url.replace(/[),.;\]]+$/, "");
}

function extractUrls(text) {
  return [...String(text || "").matchAll(/\bhttps?:\/\/[^\s<>)\]`"']+/gi)]
    .map((match) => cleanUrl(match[0]));
}

function previewFirstPolicy(config = {}) {
  const policy = config.linear?.previewFirstIteration || config.previewFirstIteration || {};
  return {
    enabled: policy.enabled !== false,
    minimumRevisionCycle: Number(policy.minimumRevisionCycle || 2),
    repositoryNames: policy.repositoryNames || ["website"],
  };
}

export function isPreviewFirstIterationCycle(input = {}) {
  const policy = previewFirstPolicy(input.config || {});
  if (!policy.enabled) {
    return false;
  }

  const repositoryName = input.repositoryName || input.lock?.repositoryName || input.repository?.name || null;
  const revisionCycle = Number(input.revisionCycle || input.lock?.revisionCycle || 0);
  return policy.repositoryNames.includes(repositoryName) && revisionCycle >= policy.minimumRevisionCycle;
}

function previewVerified(text) {
  return /\b(?:verified|rendered|renders|loaded|opened|browser-accessible|http\s*200|status\s*200|ready)\b/i.test(String(text || ""));
}

function firstSentence(text) {
  const cleaned = normalizeText(text)
    .replace(/\bhttps?:\/\/[^\s<>)\]`"']+/gi, "")
    .trim();
  const sentence = cleaned.match(/[^.!?]+[.!?]/)?.[0] || cleaned;
  return sentence.slice(0, 240).trim();
}

export function evaluatePreviewFirstIteration(issue, finalText, options = {}) {
  const active = isPreviewFirstIterationCycle(options);
  const text = String(finalText || "");
  const urls = extractUrls(text);
  const previewUrls = urls.filter((url) => /\.vercel\.app(?:\/|$)/i.test(url));
  const missing = [];

  if (active) {
    if (!previewUrls.length) {
      missing.push("verified protected Vercel preview URL");
    } else if (!previewVerified(text)) {
      missing.push("statement that the exact preview URL was verified to render");
    }
  }

  return {
    active,
    blocker: missing.length ? missing.join(", ") : "None.",
    missing,
    passed: !active || missing.length === 0,
    previewUrls,
    summarySentence: firstSentence(text) || `${issue.identifier} revision was updated.`,
    urls,
  };
}

export function evaluateReviewPackage(issue, finalText, options = {}) {
  const authorization = options.authorization || detectReviewAuthorization(issue, options);
  const required = issueNeedsReviewPackage(issue, authorization);
  const text = String(finalText || "");
  const urls = extractUrls(text);
  const previewUrls = urls.filter((url) => /\.vercel\.app(?:\/|$)/i.test(url));
  const assetUrls = urls.filter((url) => /\.(?:png|jpe?g|webp|gif|pdf)(?:[?#].*)?$/i.test(url));
  const assetReferences = [
    ...assetUrls,
    ...[...text.matchAll(/(?:^|\s)(\/Users\/[^\s`]+?\.(?:png|jpe?g|webp|gif|pdf))/gim)].map((match) => match[1]),
  ];
  const hasAssets = assetReferences.length > 0 || /\b(screenshots?|review assets?|comparison image|mockup)\b/i.test(text);
  const hasValidation = /\b(validation|validated|typecheck|build passed|npm run|npm ci|tsc --noEmit|git diff --check)\b/i.test(text);
  const hasDecision = /\b(exact founder decision requested|decision requested|founder decision|approve|request changes|hold)\b/i.test(text);
  const requiresPreview = issueRequiresPreview(issue);
  const missing = [];

  if (required) {
    if (requiresPreview && !previewUrls.length) {
      missing.push("working protected Vercel preview URL");
    } else if (!requiresPreview && !previewUrls.length && !hasAssets) {
      missing.push("working preview URL or directly viewable review assets");
    }
    if (!hasValidation) {
      missing.push("validation summary");
    }
    if (!hasDecision) {
      missing.push("exact founder decision requested");
    }
  }

  return {
    assetReferences,
    hasAssets,
    hasDecision,
    hasValidation,
    missing,
    passed: missing.length === 0,
    previewUrls,
    required,
    requiresPreview,
    urls,
  };
}
