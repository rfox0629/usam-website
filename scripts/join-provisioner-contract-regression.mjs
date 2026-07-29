#!/usr/bin/env node
/**
 * USA-110 — /join provisioner behaviour-parity contract.
 *
 * WHY THIS EXISTS
 * The `/join` provisioning sequence in app/api/join/submit/route.ts is about to be
 * extracted into a reusable service (Workspace V2, Stage 2). Extraction must be a
 * PURE REFACTOR: identical writes, identical order, identical rollback, identical
 * status codes. This file pins that observable contract so any behavioural drift
 * during extraction fails loudly.
 *
 * WHAT IT IS NOT
 * This is a STATIC contract test. It does not call the route, open a database,
 * read a secret, or touch the network. A true end-to-end parity run needs a
 * disposable database and is specified — but deliberately not executed — in the
 * USA-110 packet under "Runtime parity matrix (deferred)".
 *
 * IMPORTANT: several assertions below pin CURRENT behaviour that is known to be
 * temporary or defective where marked. USA-111 intentionally fixes the orphan
 * auth-account rollback defect and updates these assertions in the same change.
 * Duplicate-email 409 handling remains intentional until identity resolution
 * exists in a later Workspace V2 stage.
 *
 * Run: node scripts/join-provisioner-contract-regression.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const ROUTE = path.join(process.cwd(), "app", "api", "join", "submit", "route.ts");
const src = readFileSync(ROUTE, "utf8");

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
}

/** Extract the body of a named function declaration. */
function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} not found`);
  const braceStart = source.indexOf("{", start);
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  throw new Error(`could not close function ${name}`);
}

/** Ordered list of `.from("table")` targets within a source slice. */
function fromSequence(slice) {
  return [...slice.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]);
}

/**
 * Ordered list of tables the slice INSERTS into.
 * Deliberately excludes `.select()` reads — the duplicate-email pre-check reads
 * `profiles` and `usam_missionary_applications` before any write occurs, so a
 * naive `.from()` scan reports the wrong provisioning order.
 */
function insertSequence(slice) {
  return [...slice.matchAll(/\.from\("([a-z_]+)"\)\s*\.insert\(/g)].map((m) => m[1]);
}

// ---------------------------------------------------------------------------
// 1. Provisioning sequence — the core parity contract
// ---------------------------------------------------------------------------

const postStart = src.indexOf("export async function POST(");
assert.notEqual(postStart, -1, "POST handler not found");
const postBody = src.slice(postStart);

check("provisioning: account is created via auth.admin.createUser", () => {
  assert.match(postBody, /supabase\.auth\.admin\.createUser\(/);
});

check("provisioning: writes occur in the exact expected order", () => {
  const observed = [];
  for (const t of insertSequence(postBody)) {
    if (!observed.includes(t)) observed.push(t);
  }
  assert.deepEqual(
    observed,
    ["collectives", "profiles", "collective_memberships", "missionary_households"],
    "provisioning write order changed — extraction must preserve it",
  );
});

check("provisioning: duplicate pre-check READS before any write occurs", () => {
  const firstInsert = postBody.search(/\.from\("[a-z_]+"\)\s*\.insert\(/);
  const dupCheck = postBody.indexOf('.from("profiles")');
  assert.ok(dupCheck !== -1 && firstInsert !== -1, "expected both a profiles read and an insert");
  assert.ok(
    dupCheck < firstInsert,
    "the duplicate-email pre-check must run before any provisioning write",
  );
});

check("provisioning: organization is resolved, never assumed", () => {
  assert.match(postBody, /findOrCreateUsamOrganization\(/);
});

check("provisioning: application row is written to usam_missionary_applications", () => {
  assert.match(postBody, /\.from\("usam_missionary_applications"\)/);
});

check("provisioning: collective is created with type 'family'", () => {
  assert.match(postBody, /type:\s*"family"/);
});

check("provisioning: collective membership is created as pending owner", () => {
  assert.match(postBody, /role:\s*"owner"/);
  assert.match(postBody, /status:\s*"pending"/);
});

// ---------------------------------------------------------------------------
// 2. Organization resolution — currently single-tenant (pinned)
// ---------------------------------------------------------------------------

check("org resolution: resolves by branding_mode='usam' or slug (⚠ single-tenant)", () => {
  const body = functionBody(src, "findOrCreateUsamOrganization");
  assert.match(body, /branding_mode\.eq\.usam/, "branding_mode='usam' lookup is load-bearing");
  assert.match(body, /slug\.eq\.usa-missionaries/);
});

// ---------------------------------------------------------------------------
// 3. Compensating rollback — creation-scoped after USA-111
// ---------------------------------------------------------------------------

const cleanup = functionBody(src, "cleanupCreatedResources");
const rollbackStep = functionBody(src, "deleteRollbackStep");

check("rollback: uses the join created-resource delete plan", () => {
  assert.match(src, /createEmptyJoinRollbackResources\(\)/);
  assert.match(cleanup, /buildJoinRollbackDeletePlan\(resources\)/);
});

check("rollback: deletes created auth user from the current request", () => {
  assert.match(rollbackStep, /supabase\.auth\.admin\.deleteUser\(authUserId\)/);
  assert.match(src, /createdResources\.authUserIds\.push\(authData\.user\.id\)/);
});

check("rollback: deletes created team members only by exact row id", () => {
  assert.match(src, /createdResources\.teamMemberIds\.push\(await insertTeamMember/);
  assert.match(src, /\.from\("missionary_team_members"\)[\s\S]{0,120}\.insert\(candidate\)[\s\S]{0,120}\.select\("id"\)/);
  assert.doesNotMatch(cleanup, /\.from\("missionary_team_members"\)\.delete\(\)\.eq\("household_id"/);
});

check("rollback: deletes collective membership and never deletes profiles", () => {
  assert.match(src, /createdResources\.collectiveMemberships\.push\(\{ collectiveId: collective\.id, profileId: profile\.id \}\)/);
  assert.match(rollbackStep, /\.from\(step\.table\)[\s\S]{0,120}\.delete\(\)[\s\S]{0,160}\.eq\("collective_id"/);
  assert.match(src, /createdResources\.retainedProfileIds\.push\(profile\.id\)/);
  assert.doesNotMatch(rollbackStep, /\.from\("profiles"\)\.delete\(\)/);
});

check("rollback: deletes the organization ONLY when this request created it", () => {
  assert.match(src, /if \(wasCreated\) \{\s*createdResources\.organizationIds\.push\(organization\.id\);/);
  assert.doesNotMatch(src, /organizationWasCreated/);
});

check("rollback: ambiguous references fail closed before parent deletes", () => {
  assert.match(src, /householdHasRemainingReferences/);
  assert.match(src, /collectiveHasRemainingReferences/);
  assert.match(src, /organizationHasRemainingReferences/);
});

check("⚠ DEFECT PINNED — happy path never INSERTS organization_memberships", () => {
  // The cleanup deletes a row the success path never creates. Pinned so Stage 2
  // preserves it; Stage 4 (USA-109) writes the membership and updates this test.
  const inserts = [...postBody.matchAll(/\.from\("organization_memberships"\)\s*\.insert/g)];
  assert.equal(inserts.length, 0, "organization_memberships is now inserted — update this contract (Stage 4)");
});

check("USA-111 FIXED — rollback deletes only the auth user created by this request", () => {
  // Pre-existing auth accounts are never looked up for deletion. Only the ID
  // returned by this request's createUser call enters the rollback ledger.
  assert.match(rollbackStep, /deleteUser\(authUserId\)/);
  assert.match(src, /createdResources\.authUserIds\.push\(authData\.user\.id\)/);
  assert.doesNotMatch(src, /listUsers|getUserByEmail|getUser\(email/);
});

// ---------------------------------------------------------------------------
// 4. Duplicate handling — the behaviour Stage 3 will replace
// ---------------------------------------------------------------------------

check("duplicate pre-check: existing profile/application/team member still returns intentional 409", () => {
  // Path A: our own pre-check across profiles / applications / team members.
  assert.match(postBody, /status:\s*409/, "409 duplicate response missing");
  assert.match(
    postBody,
    /An account, household invitation, or application already exists for this email/,
    "pre-check duplicate copy changed — identity resolution must be a later, intentional change",
  );
});

check("duplicate auth account: Supabase 'already registered' remains a SECOND intentional 409 path", () => {
  // Path B: even if the pre-check is removed, Supabase's own duplicate-account
  // error is mapped to 409 by friendlyAuthError. USA-111 removes the false
  // duplicate trap caused by current-request rollback orphans; it does not
  // implement identity resolution for legitimate existing accounts.
  assert.match(src, /An account already exists for this email/, "friendlyAuthError duplicate copy changed");
  assert.match(
    postBody,
    /authMessage\.toLowerCase\(\)\.includes\("already"\)\s*\?\s*409/,
    "the auth-error 409 mapping changed — Stage 3 must address this path too",
  );
});

check("duplicate detection considers profile, application, and team member", () => {
  assert.match(postBody, /\.from\("profiles"\)[\s\S]{0,200}ilike\("email"/);
  assert.match(postBody, /\.from\("usam_missionary_applications"\)[\s\S]{0,300}ilike\("applicant_email"/);
  assert.match(postBody, /findExistingTeamMemberForEmail\(/);
});

// ---------------------------------------------------------------------------
// 5. Guards and status codes
// ---------------------------------------------------------------------------

check("guard: missing Supabase admin env returns 500", () => {
  assert.match(postBody, /Supabase admin environment variables are not configured[\s\S]{0,80}status:\s*500/);
});

check("guard: invalid payload returns 400", () => {
  assert.match(postBody, /Invalid application payload[\s\S]{0,60}status:\s*400/);
});

check("guard: only selectedPath 'usam' is accepted (⚠ single-path)", () => {
  assert.match(src, /selectedPath !== "usam"/);
  assert.match(src, /Only USA Missionaries setup can be submitted from this form right now/);
});

check("guard: password strength is enforced before any write", () => {
  assert.match(src, /passwordIsStrongEnough\(/);
});

check("failure path invokes the compensating rollback", () => {
  assert.match(postBody, /cleanupCreatedResources\(supabase, createdResources\)/);
});

// ---------------------------------------------------------------------------
// 6. Extraction-boundary guards — these protect the Stage 2 refactor
// ---------------------------------------------------------------------------

check("extraction boundary: rollback tracks created resources through the join ledger", () => {
  const policy = readFileSync(path.join(process.cwd(), "src", "lib", "join", "rollback-policy.ts"), "utf8");

  for (const field of [
    "authUserIds",
    "collectiveIds",
    "collectiveMemberships",
    "householdIds",
    "organizationIds",
    "retainedProfileIds",
    "teamMemberIds",
  ]) {
    assert.match(policy, new RegExp(field), `JoinRollbackResources lost ${field}`);
  }
});

check("extraction boundary: provisioner still uses the admin client", () => {
  assert.match(src, /createSupabaseAdminClient/);
});

// ---------------------------------------------------------------------------

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "  ok" : "FAIL"}  ${r.name}${r.ok ? "" : `\n        ${r.error}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} contract assertions passed`);

if (failed.length) {
  console.error(
    "\n/join provisioner contract drift detected.\n" +
      "If this change is intentional (Stage 2 extraction, Stage 3 identity resolution,\n" +
      "or Stage 4 membership write), update this file IN THE SAME COMMIT and say so\n" +
      "in the PR description. Do not silently relax an assertion.",
  );
  process.exit(1);
}
console.log("join provisioner contract regression passed");
