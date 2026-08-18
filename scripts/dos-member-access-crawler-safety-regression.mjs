import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

function assertNotIncludes(source, needle, message) {
  assert(!source.includes(needle), message);
}

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);

  assert(start >= 0, `Could not find start marker: ${startNeedle}`);

  const end = source.indexOf(endNeedle, start + startNeedle.length);

  return end >= 0 ? source.slice(start, end) : source.slice(start);
}

// 1. GET must never be able to consume/rotate an invitation token again: the
// old route.ts redirect handler that called the mutating claim function
// directly from GET must not come back.
assert(
  !existsSync(new URL("../app/groups/[slug]/member/access/route.ts", import.meta.url)),
  "The invitation link must not be a GET route handler that can consume a token as a side effect of being fetched.",
);

const accessPage = read("app/groups/[slug]/member/access/page.tsx");
const accessOgImage = read("app/groups/[slug]/member/access/opengraph-image.tsx");
const memberActions = read("app/groups/[slug]/member/actions.ts");
const memberAccessLib = read("src/lib/groups/member-access.ts");
const recoveryPage = read("app/groups/[slug]/member/page.tsx");

const accessPageImports = sliceBetween(accessPage, "import {\n  peekDemoGroupMemberAccessToken", "from \"@/src/lib/groups/member-access\";");

assertIncludes(accessPageImports, "peekGroupMemberAccessToken", "The invitation confirmation page must use the read-only peek, not the mutating claim, to decide what to render.");
assertIncludes(accessPageImports, "peekDemoGroupMemberAccessToken", "The invitation confirmation page must peek demo tokens through the same safe shape as real tokens.");
assertNotIncludes(accessPageImports, "claimGroupMemberAccessToken", "The GET-rendered confirmation page must never import the mutating claim function directly.");
assertNotIncludes(accessPageImports, "claimDemoGroupMemberAccessToken", "The GET-rendered confirmation page must never import the mutating demo claim function directly.");
assertIncludes(accessPage, "redeemGroupMemberAccess", "The confirmation page must redeem access through the explicit human POST action, not automatically.");
assertIncludes(accessPage, "action={redeemGroupMemberAccess}", "Redemption must be wired to a <form> action (a real POST), not a link or automatic redirect.");

assertIncludes(memberActions, "export async function redeemGroupMemberAccess", "actions.ts must export the explicit human-triggered redemption action.");
assertIncludes(memberActions, "claimGroupMemberAccessToken", "The mutating claim must still be reachable, but only from the redemption action.");
assert(
  memberActions.indexOf("export async function redeemGroupMemberAccess") < memberActions.indexOf("claimGroupMemberAccessToken(createSupabaseAdminClient()"),
  "The mutating claim call must live inside redeemGroupMemberAccess, not in a GET-reachable path.",
);

const peekFnSource = sliceBetween(memberAccessLib, "export async function peekGroupMemberAccessToken", "export async function claimGroupMemberAccessToken");

assertNotIncludes(peekFnSource, ".update(", "peekGroupMemberAccessToken must be read-only: it must never write to the database.");
assertNotIncludes(peekFnSource, ".insert(", "peekGroupMemberAccessToken must be read-only: it must never write to the database.");

const claimFnSource = sliceBetween(memberAccessLib, "export async function claimGroupMemberAccessToken", "function mapGatheringStatus");

assertIncludes(claimFnSource, ".eq(\"status\", \"active\")", "Token consumption must be conditioned on the token still being active so two concurrent requests cannot both redeem it (closes the race a link-preview crawler's double fetch can trigger).");
assertIncludes(claimFnSource, "already been used", "A lost race must surface a clear 'already used' failure instead of silently minting a second session.");

for (const forbidden of ["#0B0D10", "#C2A14E", "#D4B665"]) {
  assertNotIncludes(recoveryPage, forbidden, `Recovery page must use DOS blue/white tokens, not legacy black/gold color ${forbidden}.`);
  assertNotIncludes(accessPage, forbidden, `Invitation confirmation page must use DOS blue/white tokens, not legacy black/gold color ${forbidden}.`);
}
assertNotIncludes(recoveryPage, "Sign in to your group.", "This is a leader-assisted/email recovery flow, not an authenticated sign-in — the page must not claim otherwise.");

const accessOgImageBody = sliceBetween(accessOgImage, "export default async function Image", "ImageResponse(");

for (const privateField of ["personName", "verified_email", "verified_phone", "reflection"]) {
  assertNotIncludes(accessOgImageBody, privateField, `The invitation link-preview card must never render participant-private field: ${privateField}.`);
}
assertIncludes(accessOgImage, "peekGroupMemberAccessToken", "The OG image must resolve its copy through the read-only peek, never the mutating claim.");
assertNotIncludes(accessOgImage, "claimGroupMemberAccessToken", "The OG image render path must never consume a token.");

console.log("dos-member-access-crawler-safety-regression: all checks passed.");
