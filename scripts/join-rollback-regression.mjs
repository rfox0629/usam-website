import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function loadRollbackPolicyModule() {
  const filename = new URL("../src/lib/join/rollback-policy.ts", import.meta.url);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename.pathname,
  });
  const sandbox = {
    exports: {},
    module: { exports: {} },
    require(specifier) {
      throw new Error(`Unexpected runtime import in join rollback policy test: ${specifier}`);
    },
  };

  sandbox.module.exports = sandbox.exports;
  vm.runInNewContext(outputText, sandbox, { filename: filename.pathname });

  return sandbox.module.exports;
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

function assertNotIncludes(source, needle, message) {
  assert(!source.includes(needle), message);
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);

  assert.notEqual(start, -1, `function ${name} not found`);

  const braceStart = source.indexOf("{", start);
  let depth = 0;

  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(braceStart, index + 1);
      }
    }
  }

  throw new Error(`could not close function ${name}`);
}

function stepIndex(plan, typeOrTable) {
  return plan.findIndex((step) => step.type === typeOrTable || step.table === typeOrTable);
}

function idStep(plan, table) {
  return plan.find((step) => step.type === "ids" && step.table === table);
}

function hasIdStep(plan, table, id) {
  return Boolean(idStep(plan, table)?.ids.includes(id));
}

function applyRollbackPlan(plan, state) {
  for (const step of plan) {
    if (step.type === "authUsers") {
      for (const authUserId of step.authUserIds) {
        state.authUsers.delete(authUserId);
      }
    }

    if (step.type === "ids") {
      for (const id of step.ids) {
        state[step.table].delete(id);
      }
    }
  }
}

function canCreateAuthForEmail(state, email) {
  return !state.authEmails.has(email);
}

function createAuthUser(state, id, email) {
  if (!canCreateAuthForEmail(state, email)) {
    throw new Error("duplicate auth email");
  }

  state.authUsers.set(id, email);
  state.authEmails.add(email);
}

function deleteAuthEmailIndexForMissingUsers(state) {
  for (const [id, email] of Array.from(state.authUsers.entries())) {
    if (!state.authUsers.has(id)) {
      state.authEmails.delete(email);
    }
  }

  state.authEmails = new Set(state.authUsers.values());
}

const {
  buildJoinRollbackDeletePlan,
  createEmptyJoinRollbackResources,
} = loadRollbackPolicyModule();

{
  const resources = createEmptyJoinRollbackResources();

  resources.authUserIds.push("auth-created");
  resources.organizationIds.push("org-created");
  resources.collectiveIds.push("collective-created");
  resources.retainedProfileIds.push("profile-created");
  resources.collectiveMemberships.push({ collectiveId: "collective-created", profileId: "profile-created" });
  resources.householdIds.push("household-created");
  resources.teamMemberIds.push("team-member-created");

  const plan = buildJoinRollbackDeletePlan(resources);

  assert.equal(plan[0]?.type, "authUsers", "Rollback after auth creation must delete the current request auth user first.");
  assert.equal(JSON.stringify(plan[0]?.authUserIds), JSON.stringify(["auth-created"]), "Only the current request auth user is targeted.");
  assert(plan.some((step) => step.type === "collectiveMemberships"), "Created collective memberships are removed.");
  assert(hasIdStep(plan, "missionary_team_members", "team-member-created"), "Created team members are removed by exact ID.");
  assert(hasIdStep(plan, "missionary_households", "household-created"), "Created households can be removed when unreferenced.");
  assert(hasIdStep(plan, "collectives", "collective-created"), "Created collectives can be removed when unreferenced.");
  assert(hasIdStep(plan, "organizations", "org-created"), "Created organizations can be removed when unreferenced.");
  assert(!plan.some((step) => step.table === "profiles"), "Profiles are retained for reconciliation, never deleted by rollback.");
  assert(stepIndex(plan, "authUsers") < stepIndex(plan, "collective_memberships"), "Auth cleanup should run before database cleanup.");
}

{
  const plan = buildJoinRollbackDeletePlan(createEmptyJoinRollbackResources());

  assert.equal(plan.length, 0, "Auth creation failure has no created resources and therefore no rollback delete.");
}

{
  const resources = createEmptyJoinRollbackResources();

  resources.authUserIds.push("auth-created-before-org-failure");

  const plan = buildJoinRollbackDeletePlan(resources);

  assert.equal(
    JSON.stringify(plan),
    JSON.stringify([{ authUserIds: ["auth-created-before-org-failure"], type: "authUsers" }]),
    "Organization failure after auth creation rolls back only the created auth user.",
  );
}

{
  const resources = createEmptyJoinRollbackResources();

  resources.authUserIds.push("auth-created-before-profile-failure");
  resources.organizationIds.push("org-created-before-profile-failure");
  resources.collectiveIds.push("collective-created-before-profile-failure");

  const plan = buildJoinRollbackDeletePlan(resources);

  assert.equal(plan[0].type, "authUsers", "Profile failure after auth creation must not leave an orphan auth user.");
  assert(hasIdStep(plan, "collectives", "collective-created-before-profile-failure"), "Created collectives remain cleanup candidates after profile failure.");
  assert(hasIdStep(plan, "organizations", "org-created-before-profile-failure"), "Created organizations remain cleanup candidates after profile failure.");
}

{
  const resources = createEmptyJoinRollbackResources();

  resources.organizationIds.push("org-shared");
  resources.collectiveIds.push("collective-shared");
  resources.householdIds.push("household-shared");

  const plan = buildJoinRollbackDeletePlan(resources, {
    blockedCollectiveIds: ["collective-shared"],
    blockedHouseholdIds: ["household-shared"],
    blockedOrganizationIds: ["org-shared"],
  });

  assert(!hasIdStep(plan, "organizations", "org-shared"), "Ambiguous/shared organizations fail closed.");
  assert(!hasIdStep(plan, "collectives", "collective-shared"), "Ambiguous/shared collectives fail closed.");
  assert(!hasIdStep(plan, "missionary_households", "household-shared"), "Ambiguous/shared households fail closed.");
}

{
  const resources = createEmptyJoinRollbackResources();

  resources.authUserIds.push("auth-created", "auth-created");
  resources.teamMemberIds.push("team-member-created", "team-member-created");
  resources.collectiveMemberships.push(
    { collectiveId: "collective-created", profileId: "profile-created" },
    { collectiveId: "collective-created", profileId: "profile-created" },
  );

  const plan = buildJoinRollbackDeletePlan(resources);

  assert.equal(plan.find((step) => step.type === "authUsers")?.authUserIds.length, 1, "Auth rollback is idempotent.");
  assert.equal(idStep(plan, "missionary_team_members")?.ids.length, 1, "Team-member rollback is idempotent.");
  assert.equal(plan.find((step) => step.type === "collectiveMemberships")?.refs.length, 1, "Membership rollback is idempotent.");
}

{
  const email = "applicant@example.invalid";
  const state = {
    authEmails: new Set(),
    authUsers: new Map(),
    collectives: new Set(),
    missionary_households: new Set(),
    missionary_team_members: new Set(),
    organizations: new Set(),
  };
  const resources = createEmptyJoinRollbackResources();

  createAuthUser(state, "auth-created", email);
  resources.authUserIds.push("auth-created");

  const plan = buildJoinRollbackDeletePlan(resources);

  applyRollbackPlan(plan, state);
  deleteAuthEmailIndexForMissingUsers(state);

  assert.equal(state.authUsers.has("auth-created"), false, "No orphan auth account remains after rollback.");
  assert.equal(canCreateAuthForEmail(state, email), true, "Retry after auth rollback can create the same email again.");

  createAuthUser(state, "auth-retry", email);
  assert.equal(state.authUsers.get("auth-retry"), email, "Retry can proceed after the current request auth account was removed.");
}

{
  const resources = createEmptyJoinRollbackResources();

  resources.retainedProfileIds.push("existing-legitimate-profile");

  const plan = buildJoinRollbackDeletePlan(resources);

  assert.equal(plan.length, 0, "Existing legitimate production records are never represented as rollback targets.");
}

const joinRoute = read("app/api/join/submit/route.ts");
const cleanup = functionBody(joinRoute, "cleanupCreatedResources");
const rollbackStep = functionBody(joinRoute, "deleteRollbackStep");
const postBody = joinRoute.slice(joinRoute.indexOf("export async function POST"));
const packageJson = read("package.json");

assertIncludes(
  joinRoute,
  "createEmptyJoinRollbackResources()",
  "The /join route must initialize the created-resource rollback ledger.",
);
assertIncludes(
  joinRoute,
  "createdResources.authUserIds.push(authData.user.id)",
  "The /join route must record the auth user only after createUser succeeds.",
);
assertIncludes(
  rollbackStep,
  "supabase.auth.admin.deleteUser(authUserId)",
  "Rollback must delete the auth user created by the current request.",
);
assertIncludes(
  joinRoute,
  "createdResources.retainedProfileIds.push(profile.id)",
  "Created profiles must be recorded as retained for reconciliation.",
);
assertNotIncludes(
  rollbackStep,
  ".from(\"profiles\").delete()",
  "Rollback must not delete profiles.",
);
assertNotIncludes(
  rollbackStep,
  ".from(\"missionary_team_members\").delete().eq(\"household_id\"",
  "Rollback must not delete team members through household-wide ownership assumptions.",
);
assertIncludes(
  joinRoute,
  "createdResources.teamMemberIds.push(await insertTeamMember",
  "Rollback must track created team-member IDs.",
);
assertIncludes(
  joinRoute,
  "Profiles are intentionally retained for reconciliation",
  "The route must document the interim no-profile-deletion rollback model.",
);
assertIncludes(
  joinRoute,
  "Join rollback skipped ${skippedCount} ${resourceName} delete(s) because ownership was ambiguous.",
  "Ambiguous rollback skips must be recorded without exposing identifiers.",
);
assertIncludes(
  postBody,
  "An account, household invitation, or application already exists for this email",
  "Explicit duplicate-email protection must remain for existing profiles, applications, and team members.",
);
assertIncludes(
  postBody,
  "authMessage.toLowerCase().includes(\"already\") ? 409",
  "Supabase duplicate-account errors must still return the intentional duplicate-email 409.",
);
assertNotIncludes(
  joinRoute,
  "organizationWasCreated",
  "The old scalar organization rollback flag must be replaced by created-resource tracking.",
);
assertIncludes(
  packageJson,
  "\"test:join-rollback\": \"node scripts/join-rollback-regression.mjs\"",
  "The focused /join rollback regression must be runnable from package scripts.",
);

console.log("join-rollback-regression: all checks passed.");
