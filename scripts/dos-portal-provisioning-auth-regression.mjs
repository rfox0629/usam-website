import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function exists(path) {
  return existsSync(new URL(`../${path}`, import.meta.url));
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

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert(firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex, message);
}

const portalRoute = read("app/api/dos/portal/workspaces/route.ts");
const dosPortalClient = read("app/dos/DosPortalClient.tsx");
const dosSetupClientPath = "app/dos/setup/DosSetupClient.tsx";
const dosApiAuth = read("src/lib/dos/api-auth.ts");
const dosAuthPolicy = read("src/lib/dos/portal-provisioning-auth-policy.ts");
const packageJson = read("package.json");
const postBody = portalRoute.slice(portalRoute.indexOf("export async function POST"));

assertIncludes(
  portalRoute,
  "import { requireDosPortalProvisioningAuthorization } from \"@/src/lib/dos/api-auth\";",
  "The DOS portal provisioning route must use the centralized authorization helper.",
);
assertIncludes(
  postBody,
  "const authResult = await requireDosPortalProvisioningAuthorization();",
  "The DOS portal provisioning route must authorize before handling a request.",
);
assertBefore(
  postBody,
  "const authResult = await requireDosPortalProvisioningAuthorization();",
  "const payload = await readPayload(request);",
  "Anonymous requests must be rejected before request payload parsing reaches provisioning flow.",
);
assertBefore(
  postBody,
  "const authResult = await requireDosPortalProvisioningAuthorization();",
  "const supabase = createSupabaseAdminClient();",
  "The service-role client must not be created before authentication and authorization succeed.",
);
assertBefore(
  postBody,
  "if (\"response\" in authResult) {\n    return authResult.response;\n  }",
  "const supabase = createSupabaseAdminClient();",
  "Provisioning must fail closed before service-role usage when authz returns a response.",
);
assertNotIncludes(
  portalRoute,
  "isSupabaseAdminConfigured",
  "The route must not perform service-role configuration checks outside the auth boundary.",
);
assertNotIncludes(
  dosPortalClient,
  "/api/dos/portal/workspaces",
  "The public DOS portal client must not rely on anonymous access to the provisioning route.",
);
assert(
  !exists(dosSetupClientPath),
  "The dormant DOS setup client was removed (USA-138); it must not be reintroduced with an anonymous provisioning route caller.",
);
assertIncludes(
  read("app/dos/setup/page.tsx"),
  "redirect(\"/join\")",
  "/dos/setup must redirect into the working /join flow instead of rendering a dead onboarding form.",
);
assertIncludes(
  read("app/dos/onboarding/page.tsx"),
  "redirect(\"/join\")",
  "/dos/onboarding must redirect into the working /join flow instead of rendering a dead onboarding form.",
);

assertIncludes(
  dosApiAuth,
  "export async function requireDosPortalProvisioningAuthorization()",
  "The portal provisioning authorization helper must exist.",
);
assertIncludes(
  dosApiAuth,
  "decideDosPortalProvisioningAuthorization",
  "The portal provisioning helper must delegate to the executable authorization policy.",
);
assertIncludes(
  dosApiAuth,
  "const authorization = await getAdminAuthorization();",
  "Provisioning authorization must authenticate through the existing server-side admin auth path.",
);
assertIncludes(
  dosApiAuth,
  "USA-117 compatibility boundary",
  "The helper must document that this is an interim USA-117 containment boundary.",
);
assertIncludes(
  dosApiAuth,
  "current authenticated admin/editor operator model",
  "The helper must document the current admin/editor operator boundary.",
);
assertIncludes(
  dosApiAuth,
  "global by design for this stage",
  "The helper must document that the current boundary is global, not tenant-scoped.",
);
assertIncludes(
  dosApiAuth,
  "tenant membership + capability checks",
  "The helper must document the deferred Workspace V2 tenant/capability model.",
);
assertIncludes(
  dosApiAuth,
  "hasOperatorAccess: canEditAdminContent(authorization)",
  "The helper must authorize with the current admin/editor operator predicate.",
);
assertIncludes(
  dosApiAuth,
  "isServiceRoleConfigured: isSupabaseAdminConfigured",
  "Service-role availability must be passed through the authorization policy boundary.",
);
assertIncludes(
  dosApiAuth,
  "return { authorization };",
  "Authorized admin/editor callers must be allowed to continue into the existing provisioning flow.",
);
assertNotIncludes(
  dosApiAuth,
  "createSupabaseAdminClient",
  "The authorization helper must not create or use the service-role client.",
);
assertNotIncludes(
  dosAuthPolicy,
  "createSupabaseAdminClient",
  "The authorization policy must not create or use the service-role client.",
);
assertIncludes(
  dosAuthPolicy,
  "httpStatus: 401",
  "The policy must explicitly reject anonymous callers with HTTP 401.",
);
assertIncludes(
  dosAuthPolicy,
  "httpStatus: 403",
  "The policy must explicitly reject unauthorized authenticated callers with HTTP 403.",
);
assertIncludes(
  dosAuthPolicy,
  "httpStatus: 500",
  "The policy must explicitly fail closed on configuration errors.",
);
assertIncludes(
  dosAuthPolicy,
  "isServiceRoleConfigured()",
  "Service-role availability must only be consulted by the pure authorization policy.",
);
assertIncludes(
  packageJson,
  "\"test:dos-portal-provisioning-auth\": \"node scripts/dos-portal-provisioning-auth-regression.mjs\"",
  "The focused DOS portal provisioning auth regression must be runnable from package scripts.",
);
assertIncludes(
  packageJson,
  "\"test:dos-portal-provisioning-auth-behavior\": \"node scripts/dos-portal-provisioning-auth-behavior.mjs\"",
  "The behavioral DOS portal provisioning auth regression must be runnable from package scripts.",
);

console.log("dos-portal-provisioning-auth-regression: all checks passed.");
