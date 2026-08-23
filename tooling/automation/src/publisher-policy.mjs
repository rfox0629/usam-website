export const forbiddenVercelArgs = new Set([
  "--prod",
  "--production",
  "promote",
  "rollback",
  "domains",
  "dns",
]);

export const requiredReviewFields = [
  "previewUrl",
  "deploymentId",
  "commitSha",
  "branch",
  "route",
  "desktopScreenshot",
  "mobileScreenshot",
  "changedFiles",
  "validationResults",
  "knownLimitations",
  "estimatedReviewTime",
  "decisionRequested",
];

const productionBranches = new Set(["main", "master", "production", "prod"]);

export function normalizeIssueId(value) {
  return String(value || "").trim().toUpperCase();
}

export function safeIssueSlug(value) {
  return normalizeIssueId(value).toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

export function isProductionBranch(branch) {
  return productionBranches.has(String(branch || "").replace(/^refs\/heads\//, ""));
}

export function assertNoForbiddenVercelArgs(args = []) {
  const bad = args.find((arg) => forbiddenVercelArgs.has(String(arg)));
  if (bad) {
    return { ok: false, reason: `Forbidden Vercel argument/action: ${bad}` };
  }
  return { ok: true };
}

const localFilesystemRoutePatterns = [
  /^\/Users\//,
  /^\/home\//,
  /^\/private\//,
  /^\/tmp\//,
  /^\/var\//,
  /^\/Volumes\//,
  /^\/Applications\//,
  /^\/Library\//,
  /^\/System\//,
  /^\/opt\//,
  /^\/usr\//,
  /^\/bin\//,
  /^\/etc\//,
  /\/worktrees\//,
  /\/Documents\/GitHub\//,
  /\/USAM-Automation\//,
  /\/\.git(?:\/|$)/,
];

export function validateReviewRoute(route) {
  const value = String(route || "").trim().replace(/[),.;]+$/, "");
  if (!value) {
    return { ok: false, reason: "Review route is missing." };
  }
  if (!value.startsWith("/")) {
    return { ok: false, reason: `Review route must begin with '/': ${value}` };
  }
  if (value.startsWith("//")) {
    return { ok: false, reason: `Review route must be site-relative, not protocol-relative: ${value}` };
  }
  if (localFilesystemRoutePatterns.some((pattern) => pattern.test(value))) {
    return { ok: false, reason: `Review route appears to be a local filesystem path: ${value}` };
  }
  return { ok: true, route: value };
}

export function normalizeMarkerText(value, { textMatching = "case-sensitive" } = {}) {
  const normalized = String(value || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&apos;|&#x27;/g, "'")
    .replace(/&quot;|&#x22;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&ldquo;|&rdquo;/g, "\"")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&ndash;|&#x2013;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return textMatching === "case-insensitive" ? normalized.toUpperCase() : normalized;
}

export function markerContentResult(text = "", {
  expectedMarkers = [],
  forbiddenMarkers = [],
  textMatching = "case-sensitive",
} = {}) {
  const haystack = normalizeMarkerText(text, { textMatching });
  const includesMarker = (marker) => haystack.includes(normalizeMarkerText(marker, { textMatching }));
  return {
    missingMarkers: (expectedMarkers || []).filter((marker) => !includesMarker(marker)),
    presentForbiddenMarkers: (forbiddenMarkers || []).filter((marker) => includesMarker(marker)),
  };
}

export function normalizeRouteCheck(raw = {}, { fallbackRoute = "/", index = 0, textMatching = "case-sensitive" } = {}) {
  const logicalRoute = raw.path || raw.route || raw.requestedReviewRoute || fallbackRoute;
  const route = validateReviewRoute(logicalRoute);
  if (!route.ok) {
    return { ok: false, reason: `Route check ${raw.id || index + 1}: ${route.reason}` };
  }

  const directPreviewPath = raw.directPreviewPath || raw.previewPath || null;
  if (directPreviewPath) {
    const preview = validateReviewRoute(directPreviewPath);
    if (!preview.ok) {
      return { ok: false, reason: `Route check ${raw.id || index + 1} directPreviewPath: ${preview.reason}` };
    }
  }

  const id = String(raw.id || route.route || `route-${index + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || `route-${index + 1}`;

  return {
    ok: true,
    routeCheck: {
      directPreviewPath,
      expectedMarkers: [...(raw.expectedMarkers || raw.expectedContent || [])].filter(Boolean),
      forbiddenMarkers: [...(raw.forbiddenMarkers || raw.forbiddenContent || [])].filter(Boolean),
      host: raw.host || null,
      id,
      label: raw.label || raw.name || id,
      path: route.route,
      rendersExperience: raw.rendersExperience || null,
      safeResolution: raw.safeResolution || null,
      targetPath: directPreviewPath || route.route,
      textMatching: raw.textMatching || textMatching,
    },
  };
}

export function routeChecksForManifest(manifest = {}) {
  const fallbackRoute = manifest.route || manifest.requestedReviewRoute || "/";
  const textMatching = manifest.textMatching || "case-sensitive";
  const rawChecks = [
    ...(manifest.routeChecks || []),
    ...(manifest.routeChecks?.length ? [] : (manifest.routes || [])),
  ];
  if (!rawChecks.length) {
    const normalized = normalizeRouteCheck({
      expectedMarkers: manifest.expectedMarkers || [],
      forbiddenMarkers: manifest.forbiddenMarkers || [],
      id: "primary",
      path: fallbackRoute,
    }, { fallbackRoute, textMatching });
    if (!normalized.ok) return normalized;
    return { ok: true, routeChecks: [normalized.routeCheck] };
  }

  const routeChecks = [];
  for (const [index, raw] of rawChecks.entries()) {
    const normalized = normalizeRouteCheck(raw, { fallbackRoute, index, textMatching });
    if (!normalized.ok) return normalized;
    routeChecks.push(normalized.routeCheck);
  }
  return { ok: true, routeChecks };
}

export function primaryRouteCheck(routeChecks = [], manifest = {}) {
  if (!routeChecks.length) return null;
  const primaryRouteId = String(manifest.primaryRouteId || "").trim();
  return routeChecks.find((check) => check.id === primaryRouteId)
    || routeChecks.find((check) => check.path === (manifest.route || manifest.requestedReviewRoute))
    || routeChecks[0];
}

export function staleGlobalMarkerInvalidation(manifest = {}) {
  const routeChecks = routeChecksForManifest(manifest);
  if (!routeChecks.ok || routeChecks.routeChecks.length <= 1 || !(manifest.expectedMarkers || []).length) {
    return {
      ignoredGlobalMarkers: [],
      invalidated: false,
      reason: null,
    };
  }

  return {
    ignoredGlobalMarkers: [...manifest.expectedMarkers],
    invalidated: true,
    reason: "Route-specific checks supersede legacy global expectedMarkers.",
  };
}

export function parseStatusShort(status = "") {
  return String(status)
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2);
      const raw = line.slice(3).trim();
      const file = raw.includes(" -> ") ? raw.split(" -> ").at(-1).trim() : raw;
      return { code, file, raw };
    });
}

export function classifyDirtyFiles(status = "", intendedFiles = []) {
  const entries = parseStatusShort(status);
  const intended = new Set((intendedFiles || []).filter(Boolean));
  if (!intended.size) {
    return { entries, intended: entries.map((entry) => entry.file), unrelated: [] };
  }

  const unrelated = entries
    .map((entry) => entry.file)
    .filter((file) => !intended.has(file));
  return {
    entries,
    intended: entries.map((entry) => entry.file).filter((file) => intended.has(file)),
    unrelated,
  };
}

export function publisherLockState({ existing = null, now = new Date(), staleAfterMs = 2 * 60 * 60 * 1000, pidActive = false } = {}) {
  if (!existing) {
    return { action: "acquire" };
  }
  if (pidActive) {
    return { action: "block", reason: `Active publisher lock held by pid ${existing.pid || "unknown"}` };
  }
  const age = now.getTime() - Date.parse(existing.createdAt || 0);
  if (Number.isFinite(age) && age < staleAfterMs) {
    return { action: "block", reason: "Publisher lock is recent and no stale threshold has elapsed." };
  }
  return { action: "archive_stale", reason: "Publisher lock is stale and no active process was found." };
}

export function preflightResult(checks = {}) {
  const failures = Object.entries(checks)
    .filter(([, result]) => result !== true)
    .map(([name, result]) => `${name}: ${typeof result === "string" ? result : "failed"}`);
  return {
    ok: failures.length === 0,
    failures,
  };
}

export function routeVerificationResult({
  browserOk = false,
  consoleErrors = [],
  httpOk = false,
  missingMarkers = [],
  pageErrors = [],
  presentForbiddenMarkers = [],
} = {}) {
  const failures = [];
  if (!httpOk) failures.push("HTTP check failed");
  if (!browserOk) failures.push("browser render failed");
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join("; ")}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join("; ")}`);
  if (missingMarkers.length) failures.push(`missing expected content: ${missingMarkers.join(", ")}`);
  if (presentForbiddenMarkers.length) failures.push(`forbidden content present: ${presentForbiddenMarkers.join(", ")}`);
  return {
    ok: failures.length === 0,
    failures,
  };
}

export function reviewPackageStatus(manifest = {}) {
  const missing = requiredReviewFields.filter((field) => {
    const value = manifest[field];
    if (field === "desktopScreenshot" && !value && manifest.desktopRenderedAsset) return false;
    if (field === "mobileScreenshot" && !value && manifest.mobileRenderedAsset) return false;
    if (Array.isArray(value)) return value.length === 0;
    if (field === "validationResults") return !Array.isArray(value) || value.length === 0;
    return value === undefined || value === null || value === "";
  });
  return {
    complete: missing.length === 0,
    missing,
  };
}

export function buildReviewPackageComment(manifest = {}) {
  const validation = (manifest.validationResults || [])
    .map((item) => `- ${item.command || item.label}: ${item.ok || item.code === 0 ? "passed" : "failed"}`)
    .join("\n");
  const changed = (manifest.changedFiles || []).map((file) => `- \`${file}\``).join("\n") || "- none";
  const limitations = (manifest.knownLimitations || []).map((item) => `- ${item}`).join("\n") || "- None.";
  const verifiedRoutes = (manifest.verifiedRoutes || [])
    .map((item) => {
      const host = item.host ? ` on ${item.host}` : "";
      return `- ${item.id || item.path}: ${item.target}${host}`;
    })
    .join("\n");
  const supersedes = manifest.supersedesPreviousPackage
    ? [`Supersedes previous package: ${manifest.supersedesPreviousPackage}`, ""]
    : [];
  const screenshotLabel = manifest.verificationMethod === "vercel_authenticated_rendered_fetch"
    ? "Rendered verification asset"
    : "Desktop screenshot";
  const mobileLabel = manifest.verificationMethod === "vercel_authenticated_rendered_fetch"
    ? "Rendered verification asset"
    : "Mobile screenshot";

  return [
    `## ${manifest.issueId} Review Package`,
    "",
    ...supersedes,
    `Preview URL: ${manifest.previewUrl}`,
    manifest.deploymentUrl && manifest.deploymentUrl !== manifest.previewUrl ? `Deployment URL: ${manifest.deploymentUrl}` : null,
    `Deployment ID: \`${manifest.deploymentId}\``,
    `Commit SHA: \`${manifest.commitSha}\``,
    `Branch: \`${manifest.branch}\``,
    `Verified route: \`${manifest.route}\``,
    `Verification method: ${manifest.verificationMethod || "browser"}`,
    `${screenshotLabel}: \`${manifest.desktopScreenshot || manifest.desktopRenderedAsset}\``,
    `${mobileLabel}: \`${manifest.mobileScreenshot || manifest.mobileRenderedAsset}\``,
    verifiedRoutes ? "" : null,
    verifiedRoutes ? "Verified route matrix:" : null,
    verifiedRoutes || null,
    "",
    "Changed files:",
    changed,
    "",
    "Validation:",
    validation || "- none",
    "",
    "Known limitations:",
    limitations,
    "",
    `Estimated review time: ${manifest.estimatedReviewTime}`,
    "",
    `Exact founder decision requested: ${manifest.decisionRequested}`,
    "",
    "No merge to main, production deployment/promotion, DNS change, domain attachment, or production data/schema change was performed.",
  ].filter((line) => line !== null).join("\n");
}
