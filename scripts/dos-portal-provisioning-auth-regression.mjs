import { readFileSync } from "node:fs";

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

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert(firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex, message);
}

const portalRoute = read("app/api/dos/portal/workspaces/route.ts");
const dosApiAuth = read("src/lib/dos/api-auth.ts");
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

assertIncludes(
  dosApiAuth,
  "export async function requireDosPortalProvisioningAuthorization()",
  "The portal provisioning authorization helper must exist.",
);
assertIncludes(
  dosApiAuth,
  "const authorization = await getAdminAuthorization();",
  "Provisioning authorization must authenticate through the existing server-side admin auth path.",
);
assertIncludes(
  dosApiAuth,
  "authorization.status === \"unauthenticated\"",
  "Anonymous callers must have an explicit rejection branch.",
);
assertIncludes(
  dosApiAuth,
  "NextResponse.json({ error: \"Authentication required.\" }, { status: 401 })",
  "Anonymous callers must receive HTTP 401.",
);
assertIncludes(
  dosApiAuth,
  "authorization.status === \"unauthorized\" || !canEditAdminContent(authorization)",
  "Authenticated non-admin/editor callers must be rejected.",
);
assertIncludes(
  dosApiAuth,
  "NextResponse.json({ error: \"Access denied.\" }, { status: 403 })",
  "Unauthorized authenticated callers must receive a generic HTTP 403.",
);
assertIncludes(
  dosApiAuth,
  "if (!isSupabaseAdminConfigured())",
  "Service-role configuration must be checked inside the authorized server-side boundary.",
);
assertBefore(
  dosApiAuth,
  "authorization.status === \"unauthorized\" || !canEditAdminContent(authorization)",
  "if (!isSupabaseAdminConfigured())",
  "Service-role environment checks must run only after authentication and authorization.",
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
assertIncludes(
  packageJson,
  "\"test:dos-portal-provisioning-auth\": \"node scripts/dos-portal-provisioning-auth-regression.mjs\"",
  "The focused DOS portal provisioning auth regression must be runnable from package scripts.",
);

console.log("dos-portal-provisioning-auth-regression: all checks passed.");
