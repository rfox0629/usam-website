#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const linearEndpoint = "https://api.linear.app/graphql";

function parseArgs(argv) {
  const parsed = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      parsed.set(key, "true");
      continue;
    }

    parsed.set(key, next);
    index += 1;
  }

  return parsed;
}

function argOrEnv(args, argName, envName, fallback = "") {
  return String(args.get(argName) ?? process.env[envName] ?? fallback).trim();
}

function normalizeUrl(value) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function slugifyVercelPart(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function getPackageProjectName() {
  try {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    return slugifyVercelPart(packageJson.name);
  } catch {
    return "";
  }
}

function getGitValue(args, argName, fallbackCommandArgs) {
  const explicit = String(args.get(argName) ?? "").trim();

  if (explicit) {
    return explicit;
  }

  try {
    return execFileSync("git", fallbackCommandArgs, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

async function resolvePreviewUrl(args) {
  const explicitUrl = normalizeUrl(
    args.get("preview-url")
      ?? process.env.PREVIEW_URL
      ?? process.env.VERCEL_BRANCH_URL
      ?? process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL
      ?? process.env.VERCEL_URL
      ?? process.env.NEXT_PUBLIC_VERCEL_URL
      ?? "",
  );

  if (explicitUrl) {
    return {
      derived: false,
      url: explicitUrl,
    };
  }

  const allowDerived = args.get("allow-derived-url") === "true" || process.env.ALLOW_DERIVED_PREVIEW_URL === "true";

  if (!allowDerived) {
    return {
      derived: false,
      url: "",
    };
  }

  const projectName = slugifyVercelPart(argOrEnv(args, "vercel-project", "VERCEL_PROJECT_NAME"))
    || await getPackageProjectName();
  const scopeSlug = slugifyVercelPart(
    argOrEnv(args, "vercel-scope", "VERCEL_SCOPE_SLUG")
      || argOrEnv(args, "vercel-team", "VERCEL_TEAM_SLUG")
      || argOrEnv(args, "vercel-org", "VERCEL_ORG_SLUG"),
  );
  const branchName = getGitValue(args, "branch", ["branch", "--show-current"]);
  const branchSlug = slugifyVercelPart(branchName);

  if (!projectName || !scopeSlug || !branchSlug) {
    return {
      derived: false,
      url: "",
    };
  }

  return {
    derived: true,
    url: `https://${projectName}-git-${branchSlug}-${scopeSlug}.vercel.app`,
  };
}

function splitNotes(value, fallback) {
  const source = String(value || fallback || "").trim();

  if (!source) {
    return [];
  }

  return source
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function bulletList(items, emptyText) {
  if (!items.length) {
    return `- ${emptyText}`;
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function buildReviewUrl(previewUrl, reviewRoute) {
  if (!previewUrl || !reviewRoute) {
    return "";
  }

  const normalizedRoute = reviewRoute.startsWith("/") ? reviewRoute : `/${reviewRoute}`;

  return `${previewUrl.replace(/\/+$/g, "")}${normalizedRoute}`;
}

function summarizeScreenshots(desktopScreenshot, mobileScreenshot) {
  const desktop = desktopScreenshot || "Not captured.";
  const mobile = mobileScreenshot || "Not captured.";

  return `- Desktop: ${desktop}\n- Mobile: ${mobile}`;
}

function buildLinearComment(report) {
  const heading = report.productPreviewStatus === "product-preview-ready"
    ? "Product Preview Ready"
    : "Preview Blocked";
  const previewLine = report.previewUrl
    ? `Preview URL: [Open protected preview](${report.previewUrl})`
    : `Preview URL: unavailable`;
  const reviewLine = report.reviewUrl
    ? `Review route: [${report.reviewRoute}](${report.reviewUrl})`
    : `Review route: \`${report.reviewRoute || "not provided"}\``;
  const blockedLines = report.previewBlockedReason
    ? `\nBlocked reason: ${report.previewBlockedReason}\nRequired action: ${report.requiredAction || "Provide a working protected preview URL or rerun after preview deployment is available."}\n`
    : "";
  const derivedNote = report.previewUrlDerived
    ? "\nNote: URL was derived from the Vercel Git branch URL convention because the dispatcher did not provide `VERCEL_BRANCH_URL`.\n"
    : "";

  return `## ${heading}

${previewLine}
${reviewLine}${blockedLines}${derivedNote}
Workflow status:
- Code review: \`${report.codeReviewStatus}\`
- Product preview: \`${report.productPreviewStatus}\`

Protection:
- Vercel preview access must remain protected by Vercel Deployment Protection or equivalent project access.
- Internal admin routes remain behind Supabase Auth and \`admin_users\` authorization.

Validation:
${report.validationSummary || "- Not provided."}

Screenshots:
${summarizeScreenshots(report.desktopScreenshot, report.mobileScreenshot)}

Live vs unavailable data:
${bulletList(report.liveDataNotes, "No live-data notes provided.")}
${bulletList(report.unavailableDataNotes, "No unavailable-data notes provided.")}
`;
}

async function readOptionalFile(filePath) {
  if (!filePath) {
    return "";
  }

  return readFile(filePath, "utf8");
}

async function linearRequest(apiKey, query, variables) {
  const response = await fetch(linearEndpoint, {
    body: JSON.stringify({ query, variables }),
    headers: {
      "Authorization": apiKey,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new Error(`Linear request failed: ${message}`);
  }

  return payload.data;
}

async function postLinearComment({ apiKey, body, issueIdentifier }) {
  const issueData = await linearRequest(
    apiKey,
    `query PreviewIssue($id: String!) {
      issue(id: $id) {
        id
      }
    }`,
    { id: issueIdentifier },
  );
  const issueId = issueData?.issue?.id;

  if (!issueId) {
    throw new Error(`Linear issue was not found: ${issueIdentifier}`);
  }

  await linearRequest(
    apiKey,
    `mutation PreviewComment($input: CommentCreateInput!) {
      commentCreate(input: $input) {
        success
      }
    }`,
    {
      input: {
        body,
        issueId,
      },
    },
  );
}

async function buildReport(args) {
  const preview = await resolvePreviewUrl(args);
  const previewBlockedReason = argOrEnv(args, "preview-blocked", "PREVIEW_BLOCKED_REASON");
  const validationStatus = argOrEnv(args, "validation-status", "VALIDATION_STATUS", "passed").toLowerCase();
  const reviewRoute = argOrEnv(args, "route", "PREVIEW_REVIEW_ROUTE", "/admin/operations-center");
  const validationSummaryFile = argOrEnv(args, "validation-summary-file", "VALIDATION_SUMMARY_FILE");
  const validationSummary = argOrEnv(args, "validation-summary", "VALIDATION_SUMMARY")
    || (await readOptionalFile(validationSummaryFile)).trim();
  const commit = getGitValue(args, "commit", ["rev-parse", "--short", "HEAD"]);
  const branch = getGitValue(args, "branch", ["branch", "--show-current"]);

  if (!preview.url && !previewBlockedReason) {
    throw new Error("Preview completion requires either a working preview URL or PREVIEW_BLOCKED_REASON.");
  }

  const codeReviewStatus = validationStatus === "passed" ? "code-review-ready" : "code-review-blocked";
  const productPreviewStatus = preview.url ? "product-preview-ready" : "preview-blocked";

  return {
    branch,
    codeReviewStatus,
    commit,
    desktopScreenshot: argOrEnv(args, "desktop-screenshot", "PREVIEW_DESKTOP_SCREENSHOT"),
    issueId: argOrEnv(args, "issue", "LINEAR_ISSUE_ID"),
    liveDataNotes: splitNotes(
      argOrEnv(args, "live-data-notes", "PREVIEW_LIVE_DATA_NOTES"),
      "Live only when preview environment variables and backing services are configured for the branch.",
    ),
    mobileScreenshot: argOrEnv(args, "mobile-screenshot", "PREVIEW_MOBILE_SCREENSHOT"),
    previewBlockedReason,
    previewUrl: preview.url,
    previewUrlDerived: preview.derived,
    productPreviewStatus,
    requiredAction: argOrEnv(args, "required-action", "PREVIEW_REQUIRED_ACTION"),
    reviewRoute,
    reviewUrl: buildReviewUrl(preview.url, reviewRoute),
    unavailableDataNotes: splitNotes(
      argOrEnv(args, "unavailable-data-notes", "PREVIEW_UNAVAILABLE_DATA_NOTES"),
      "Unavailable data must be called out rather than replaced with invented sample data.",
    ),
    validationStatus,
    validationSummary,
  };
}

async function writeOutput(filePath, report, comment) {
  if (!filePath) {
    return;
  }

  const absolutePath = path.resolve(filePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify({ comment, report }, null, 2)}\n`);
}

async function runSelfTest() {
  const originalEnv = { ...process.env };

  try {
    process.env.VERCEL_BRANCH_URL = "usa-missionaries-git-test-rfox.vercel.app";
    const envPreview = await resolvePreviewUrl(new Map());

    if (envPreview.url !== "https://usa-missionaries-git-test-rfox.vercel.app" || envPreview.derived) {
      throw new Error("VERCEL_BRANCH_URL resolution failed.");
    }

    process.env = {
      ...originalEnv,
      ALLOW_DERIVED_PREVIEW_URL: "true",
      VERCEL_PROJECT_NAME: "USA Missionaries",
      VERCEL_SCOPE_SLUG: "Ryan Fox",
    };
    const args = new Map([
      ["branch", "dispatcher/usa-52-codex-20260721154907"],
    ]);
    const derivedPreview = await resolvePreviewUrl(args);

    if (derivedPreview.url !== "https://usa-missionaries-git-dispatcher-usa-52-codex-20260721154907-ryan-fox.vercel.app") {
      throw new Error("Derived Vercel branch URL resolution failed.");
    }

    process.env = { ...originalEnv };
    const blockedReport = await buildReport(new Map([
      ["issue", "USA-52"],
      ["preview-blocked", "Branch was not pushed."],
      ["route", "/admin/operations-center"],
    ]));

    if (blockedReport.productPreviewStatus !== "preview-blocked") {
      throw new Error("Blocked report did not produce preview-blocked status.");
    }

    console.log("dispatcher-preview-completion self-test passed");
  } finally {
    process.env = originalEnv;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.get("self-test") === "true") {
    await runSelfTest();
    return;
  }

  const report = await buildReport(args);
  const comment = buildLinearComment(report);
  const outputPath = argOrEnv(args, "output", "PREVIEW_REPORT_OUTPUT");
  const shouldPostLinear = args.get("post-linear") === "true" || process.env.POST_LINEAR_COMMENT === "true";

  await writeOutput(outputPath, report, comment);

  if (shouldPostLinear) {
    const apiKey = argOrEnv(args, "linear-api-key", "LINEAR_API_KEY");

    if (!apiKey) {
      throw new Error("POST_LINEAR_COMMENT=true requires LINEAR_API_KEY.");
    }

    if (!report.issueId) {
      throw new Error("POST_LINEAR_COMMENT=true requires LINEAR_ISSUE_ID or --issue.");
    }

    await postLinearComment({
      apiKey,
      body: comment,
      issueIdentifier: report.issueId,
    });
  }

  console.log(comment);

  if (report.productPreviewStatus !== "product-preview-ready") {
    process.exitCode = 20;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
