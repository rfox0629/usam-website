import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function loadRollbackPolicyModule() {
  const filename = new URL("../src/lib/dos/portal-rollback-policy.ts", import.meta.url);
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
      throw new Error(`Unexpected runtime import in rollback policy test: ${specifier}`);
    },
  };

  sandbox.module.exports = sandbox.exports;
  vm.runInNewContext(outputText, sandbox, { filename: filename.pathname });

  return sandbox.module.exports;
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

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} Expected ${expected}, received ${actual}.`);
}

function assertNoDeleteStep(plan, table, id) {
  const step = plan.find((candidate) => candidate.table === table && candidate.type === "ids");

  assert(!step || !step.ids.includes(id), `${table} ${id} must not be deleted.`);
}

function assertIdDeleteStep(plan, table, id) {
  const step = plan.find((candidate) => candidate.table === table && candidate.type === "ids");

  assert(step?.ids.includes(id), `${table} ${id} must be deleted when it was created by this request.`);
}

function stepIndex(plan, table) {
  return plan.findIndex((step) => step.table === table);
}

const {
  buildPortalRollbackDeletePlan,
  createEmptyPortalRollbackResources,
} = loadRollbackPolicyModule();

{
  const resources = createEmptyPortalRollbackResources();

  resources.organizationIds.push("org-created");
  resources.collectiveIds.push("collective-created");
  resources.profileIds.push("profile-created");
  resources.householdIds.push("household-created");
  resources.teamMemberIds.push("team-member-created");
  resources.fieldPersonIds.push("field-person-created");
  resources.organizationMemberships.push({ organizationId: "org-created", profileId: "profile-created" });
  resources.collectiveMemberships.push({ collectiveId: "collective-created", profileId: "profile-created" });

  const plan = buildPortalRollbackDeletePlan(resources);

  assert(plan.some((step) => step.table === "collective_memberships" && step.type === "collectiveMemberships"), "Created collective memberships must be removed.");
  assert(plan.some((step) => step.table === "organization_memberships" && step.type === "organizationMemberships"), "Created organization memberships must be removed.");
  assertIdDeleteStep(plan, "missionary_team_members", "team-member-created");
  assertIdDeleteStep(plan, "missionary_field_people", "field-person-created");
  assertIdDeleteStep(plan, "missionary_households", "household-created");
  assertIdDeleteStep(plan, "profiles", "profile-created");
  assertIdDeleteStep(plan, "collectives", "collective-created");
  assertIdDeleteStep(plan, "organizations", "org-created");
  assert(stepIndex(plan, "organization_memberships") < stepIndex(plan, "profiles"), "Membership rows must be removed before profiles.");
  assert(stepIndex(plan, "missionary_team_members") < stepIndex(plan, "missionary_households"), "Team members must be removed before households.");
  assert(stepIndex(plan, "collectives") < stepIndex(plan, "organizations"), "Collectives must be removed before organizations.");
}

{
  const plan = buildPortalRollbackDeletePlan(createEmptyPortalRollbackResources());

  assertEqual(plan.length, 0, "Acquired resources are preserved because they are never represented in the created-resource ledger.");
}

{
  const resources = createEmptyPortalRollbackResources();

  resources.profileIds.push("profile-created");
  resources.organizationMemberships.push({ organizationId: "org-pre-existing", profileId: "profile-created" });

  const plan = buildPortalRollbackDeletePlan(resources);

  assertNoDeleteStep(plan, "organizations", "org-pre-existing");
  assertIdDeleteStep(plan, "profiles", "profile-created");
}

{
  const resources = createEmptyPortalRollbackResources();

  resources.organizationIds.push("org-shared");

  const plan = buildPortalRollbackDeletePlan(resources, { blockedOrganizationIds: ["org-shared"] });

  assertNoDeleteStep(plan, "organizations", "org-shared");
}

{
  const resources = createEmptyPortalRollbackResources();

  resources.organizationIds.push("org-ambiguous");

  const plan = buildPortalRollbackDeletePlan(resources, { blockedOrganizationIds: ["org-ambiguous"] });

  assertNoDeleteStep(plan, "organizations", "org-ambiguous");
}

{
  const acquiredProfilePlan = buildPortalRollbackDeletePlan(createEmptyPortalRollbackResources());

  assertNoDeleteStep(acquiredProfilePlan, "profiles", "profile-existing-acquired");
}

{
  const resources = createEmptyPortalRollbackResources();

  resources.organizationIds.push("org-created", "org-created");
  resources.householdIds.push("household-created", "household-created");
  resources.organizationMemberships.push(
    { organizationId: "org-created", profileId: "profile-created" },
    { organizationId: "org-created", profileId: "profile-created" },
  );

  const plan = buildPortalRollbackDeletePlan(resources);
  const organizationStep = plan.find((step) => step.table === "organizations" && step.type === "ids");
  const householdStep = plan.find((step) => step.table === "missionary_households" && step.type === "ids");
  const membershipStep = plan.find((step) => step.table === "organization_memberships" && step.type === "organizationMemberships");

  assertEqual(organizationStep?.ids.length, 1, "Rollback must be idempotent for duplicate organization IDs.");
  assertEqual(householdStep?.ids.length, 1, "Rollback must be idempotent for duplicate household IDs.");
  assertEqual(membershipStep?.refs.length, 1, "Rollback must be idempotent for duplicate membership refs.");
}

const portalRoute = read("app/api/dos/portal/workspaces/route.ts");
const packageJson = read("package.json");

assertIncludes(
  portalRoute,
  "createEmptyPortalRollbackResources()",
  "The DOS portal provisioner must initialize an explicit created-resource rollback ledger.",
);
assertIncludes(
  portalRoute,
  "buildPortalRollbackDeletePlan(resources)",
  "The DOS portal rollback path must execute the centralized rollback delete plan.",
);
assertIncludes(
  portalRoute,
  "createdResources.organizationIds.push(organization.id)",
  "Only organizations created by the current request may be entered into the rollback ledger.",
);
assertIncludes(
  portalRoute,
  "createdResources.teamMemberIds.push(await insertTeamMember(teamMemberPayload))",
  "Team member rollback must track created row IDs instead of assuming ownership by household.",
);
assertIncludes(
  portalRoute,
  "createdResources.fieldPersonIds.push(...await insertSetupPeople({",
  "Field person rollback must track created row IDs and preserve acquired people.",
);
assertIncludes(
  portalRoute,
  "organizationHasRemainingReferences",
  "Organization rollback must fail closed when references remain or ownership is ambiguous.",
);
assertNotIncludes(
  portalRoute,
  ".from(\"missionary_team_members\").delete().eq(\"household_id\", householdId)",
  "Rollback must not delete team members through household-wide ownership assumptions.",
);
assertNotIncludes(
  portalRoute,
  "cleanupCreatedResources({ collectiveId",
  "Rollback must not pass raw scalar IDs that blur created and acquired resources.",
);
assertNotIncludes(
  portalRoute,
  "organizationId: createdOrganizationId",
  "Rollback must not rely on the previous organization scalar cleanup contract.",
);
assertIncludes(
  packageJson,
  "\"test:dos-portal-rollback\": \"node scripts/dos-portal-rollback-regression.mjs\"",
  "The focused DOS portal rollback regression must be runnable from package scripts.",
);

console.log("dos-portal-rollback-regression: all checks passed.");
