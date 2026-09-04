import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertNoForbiddenVercelArgs,
  buildReviewPackageComment,
  classifyDirtyFiles,
  isProductionBranch,
  markerContentResult,
  preflightResult,
  publisherLockState,
  reviewPackageStatus,
  routeVerificationResult,
  routeChecksForManifest,
  staleGlobalMarkerInvalidation,
  validateReviewRoute,
} from "../src/publisher-policy.mjs";

assert.equal(preflightResult({
  gitMetadataWritable: true,
  githubAuth: true,
  remoteAccess: true,
  vercelAuth: true,
}).ok, true, "writable Git metadata and valid auth should pass preflight");

assert.deepEqual(preflightResult({
  gitMetadataWritable: "git dir is not writable",
  githubAuth: true,
  remoteAccess: true,
  vercelAuth: true,
}).failures, ["gitMetadataWritable: git dir is not writable"], "non-writable Git metadata should block clearly");

assert.match(preflightResult({
  gitMetadataWritable: true,
  githubAuth: "gh auth status failed",
  remoteAccess: true,
  vercelAuth: true,
}).failures[0], /gh auth status failed/, "invalid GitHub auth should block before deployment");

assert.match(preflightResult({
  gitMetadataWritable: true,
  githubAuth: true,
  remoteAccess: true,
  vercelAuth: "vercel whoami failed",
}).failures[0], /vercel whoami failed/, "invalid Vercel auth should block before deployment");

assert.equal(isProductionBranch("main"), true, "publisher must refuse main");
assert.equal(assertNoForbiddenVercelArgs(["deploy", "--prod"]).ok, false, "publisher must refuse --prod");
assert.equal(assertNoForbiddenVercelArgs(["deploy", "--yes", "--scope", "team"]).ok, true, "preview deploy args should be accepted");
assert.deepEqual(validateReviewRoute("/system"), { ok: true, route: "/system" }, "/system is a valid browser review route");
assert.equal(validateReviewRoute("system").ok, false, "review routes must begin with slash");
assert.equal(
  validateReviewRoute("/Users/ryanfox/USAM-Automation/worktrees/usa-80-claude-20260725132842").ok,
  false,
  "local filesystem paths must be rejected as browser review routes",
);
assert.equal(validateReviewRoute("/admin/worktrees").ok, true, "ordinary site routes with similar words are still allowed");

assert.deepEqual(classifyDirtyFiles("", []).unrelated, [], "clean committed branch can proceed to push/deploy");
assert.deepEqual(
  classifyDirtyFiles(" M app/system/page.tsx\n?? app/system/RiverOfMinistries.tsx", [
    "app/system/page.tsx",
    "app/system/RiverOfMinistries.tsx",
  ]).intended,
  ["app/system/page.tsx", "app/system/RiverOfMinistries.tsx"],
  "valid uncommitted changes can be committed intentionally",
);

assert.deepEqual(
  classifyDirtyFiles(" M app/system/page.tsx\n M app/admin/secret.tsx", ["app/system/page.tsx"]).unrelated,
  ["app/admin/secret.tsx"],
  "unrelated dirty files should block publishing",
);

assert.equal(
  publisherLockState({ existing: { createdAt: new Date().toISOString(), pid: 123 }, pidActive: true }).action,
  "block",
  "active publisher lock should prevent duplicate publication",
);

assert.equal(
  routeVerificationResult({ browserOk: false, httpOk: true }).ok,
  false,
  "exact route browser verification is required",
);

assert.equal(
  routeVerificationResult({ browserOk: false, httpOk: true }).failures.includes("browser render failed"),
  true,
  "Vercel Ready without browser success must not pass",
);
assert.equal(
  routeVerificationResult({ browserOk: true, httpOk: true, presentForbiddenMarkers: ["RIVER OF MINISTRIES"] }).ok,
  false,
  "forbidden route-specific content should fail browser verification",
);
assert.equal(
  routeVerificationResult({ browserOk: true, httpOk: true }).ok,
  true,
  "successful browser verification is required before Founder Review",
);

const baseManifest = {
  branch: "dispatcher/usa-38-codex",
  changedFiles: ["app/system/page.tsx"],
  commitSha: "abc123",
  deploymentId: "dpl_123",
  desktopScreenshot: "/tmp/desktop.png",
  estimatedReviewTime: "8 minutes",
  issueId: "USA-38",
  knownLimitations: ["Protected preview requires Vercel access."],
  mobileScreenshot: "/tmp/mobile.png",
  previewUrl: "https://example.vercel.app",
  route: "/system",
  validationResults: [{ command: "npm run build", ok: true }],
  decisionRequested: "Approve the System preview or request exact revisions.",
};
assert.equal(reviewPackageStatus(baseManifest).complete, true, "desktop and mobile screenshots are required and present");

const missingScreens = { ...baseManifest, mobileScreenshot: "" };
assert.deepEqual(reviewPackageStatus(missingScreens).missing, ["mobileScreenshot"], "missing mobile screenshot should block");

const comment = buildReviewPackageComment(baseManifest);
for (const required of [
  "Preview URL:",
  "Deployment ID:",
  "Commit SHA:",
  "Changed files:",
  "Validation:",
  "Known limitations:",
  "Exact founder decision requested:",
]) {
  assert.match(comment, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `Linear review package should contain ${required}`);
}

assert.equal(preflightResult({
  agentCompletionManifest: true,
  hostPublisherInvoked: true,
}).ok, true, "agent completion should hand off to host publisher");

assert.equal(
  publisherLockState({
    existing: { createdAt: "2026-01-01T00:00:00.000Z", pid: 999999 },
    now: new Date("2026-07-25T00:00:00.000Z"),
    pidActive: false,
  }).action,
  "archive_stale",
  "prior publishing failure or stale lock history should be preserved by archive/rename",
);

const usa82Manifest = JSON.parse(readFileSync(new URL("../config/release-manifests/usa-82.json", import.meta.url), "utf8"));
const usa82Checks = routeChecksForManifest(usa82Manifest);
assert.equal(usa82Checks.ok, true, "USA-82 release manifest should normalize into route-specific checks");

const routeById = (id) => {
  const route = usa82Checks.routeChecks.find((check) => check.id === id);
  assert(route, `USA-82 release manifest should include ${id}`);
  return route;
};
const riverMarkers = ["RIVER OF MINISTRIES", "MANY STREAMS.", "ONE MOVEMENT."];
const systemV1 = routeById("system-v1");
const systemV2 = routeById("system-v2");
const systemCanonical = routeById("system");
const dos = routeById("dos-hostname");
const dosPrivate = routeById("dos-private-separation");
const ktg = routeById("ktg-hostname");

assert.deepEqual(
  systemV1.expectedMarkers,
  ["INFRASTRUCTURE IS BEING BUILT", "JOIN THE WAITING LIST", "ENTER WITH ACCESS CODE"],
  "/system/v1 should verify only the legacy waiting-list/operator-dashboard markers",
);
for (const marker of [...riverMarkers, "Kitchen Table Gospel", "Discipleship Operating System"]) {
  assert(!systemV1.expectedMarkers.includes(marker), `/system/v1 must not require ${marker}`);
}
assert.deepEqual(
  markerContentResult("The Infrastructure<br/>Is Being Built JOIN THE WAITING LIST ENTER WITH ACCESS CODE Kitchen Table Gospel", systemV1),
  { missingMarkers: [], presentForbiddenMarkers: [] },
  "/system/v1 should pass with legacy content and ordinary shared navigation labels",
);
assert.deepEqual(
  markerContentResult("INFRASTRUCTURE IS BEING BUILT JOIN THE WAITING LIST ENTER WITH ACCESS CODE RIVER OF MINISTRIES", systemV1).presentForbiddenMarkers,
  ["RIVER OF MINISTRIES"],
  "/system/v1 should fail if River content appears",
);

assert.equal(systemV2.path, "/system/v2", "/system/v2 should be the direct V2 route");
assert.equal(systemV2.rendersExperience, "system-v2", "/system/v2 should render the V2 experience");
assert.equal(systemCanonical.path, "/system", "/system should verify the canonical route");
assert.equal(systemCanonical.rendersExperience, "system-v2", "/system should resolve to V2");
for (const route of [systemV2, systemCanonical, dos, ktg]) {
  for (const marker of riverMarkers) {
    assert(!route.expectedMarkers.includes(marker), `${route.id} must not require River marker ${marker}`);
  }
}

assert.equal(dos.host, "discipleshipoperatingsystem.com", "DOS should track the DOS hostname");
assert.equal(dos.targetPath, "/domain-sites/discipleship-operating-system", "DOS protected preview should verify the direct domain route");
assert.deepEqual(
  markerContentResult("Discipleship Operating System The operating system for intentional discipleship Never lose a person or a moment that matters. Request Information USA Missionaries", dos),
  { missingMarkers: [], presentForbiddenMarkers: [] },
  "DOS should pass with DOS-specific markers",
);
assert.equal(dosPrivate.path, "/dos", "private /dos separation should be verified independently");
assert.deepEqual(
  markerContentResult("Start your DOS field Create your personal workspace Sign In", dosPrivate),
  { missingMarkers: [], presentForbiddenMarkers: [] },
  "private /dos should pass with portal markers and without public DOS marketing markers",
);

assert.equal(ktg.host, "kitchentablegospel.org", "KTG should track the KTG hostname");
assert.equal(ktg.targetPath, "/domain-sites/kitchen-table-gospel", "KTG protected preview should verify the direct domain route");
assert.deepEqual(
  markerContentResult("Kitchen Table Gospel USA Missionaries Discipleship Doesn't Start on a Stage. Schedule a Table Experience It at a Table", ktg),
  { missingMarkers: [], presentForbiddenMarkers: [] },
  "KTG should pass with KTG-specific markers",
);

const staleUsa82Completion = {
  ...usa82Manifest,
  expectedMarkers: [
    "RIVER OF MINISTRIES",
    "Kitchen Table Gospel",
    "Discipleship Operating System",
  ],
};
assert.deepEqual(
  staleGlobalMarkerInvalidation(staleUsa82Completion),
  {
    ignoredGlobalMarkers: staleUsa82Completion.expectedMarkers,
    invalidated: true,
    reason: "Route-specific checks supersede legacy global expectedMarkers.",
  },
  "USA-82 route matrix should invalidate stale global marker caches",
);

console.log("host publisher regression passed");
