import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadPolicyModule() {
  const filename = new URL("../src/lib/dos/portal-provisioning-auth-policy.ts", import.meta.url);
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
      throw new Error(`Unexpected runtime import in auth policy test: ${specifier}`);
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

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} Expected ${expected}, received ${actual}.`);
}

function probe(value) {
  let calls = 0;

  return {
    fn() {
      calls += 1;

      return value;
    },
    get calls() {
      return calls;
    },
  };
}

const { decideDosPortalProvisioningAuthorization } = loadPolicyModule();

function decide(input) {
  return decideDosPortalProvisioningAuthorization(input);
}

{
  const serviceRole = probe(true);
  const result = decide({
    authorization: { status: "unauthenticated" },
    hasOperatorAccess: false,
    isServiceRoleConfigured: serviceRole.fn,
  });

  assertEqual(result.status, "rejected", "Unauthenticated authorization must be rejected.");
  assertEqual(result.httpStatus, 401, "Unauthenticated authorization must return HTTP 401.");
  assertEqual(result.error, "Authentication required.", "Unauthenticated authorization must use a generic message.");
  assertEqual(serviceRole.calls, 0, "Unauthenticated rejection must not reach service-role configuration or provisioning.");
}

{
  const serviceRole = probe(true);
  const result = decide({
    authorization: { email: "operator@example.invalid", status: "unauthorized" },
    hasOperatorAccess: false,
    isServiceRoleConfigured: serviceRole.fn,
  });

  assertEqual(result.status, "rejected", "Unauthorized authenticated callers must be rejected.");
  assertEqual(result.httpStatus, 403, "Unauthorized authenticated callers must return HTTP 403.");
  assertEqual(result.error, "Access denied.", "Unauthorized rejection must not leak role details.");
  assertEqual(serviceRole.calls, 0, "Unauthorized rejection must not reach service-role configuration or provisioning.");
}

{
  const serviceRole = probe(true);
  const result = decide({
    authorization: {
      email: "viewer@example.invalid",
      isActive: true,
      prayerPermissions: [],
      role: "viewer",
      status: "authorized",
      userId: "user-viewer",
    },
    hasOperatorAccess: false,
    isServiceRoleConfigured: serviceRole.fn,
  });

  assertEqual(result.status, "rejected", "Authenticated viewers must be rejected.");
  assertEqual(result.httpStatus, 403, "Authenticated viewers must return HTTP 403.");
  assertEqual(result.error, "Access denied.", "Viewer rejection must use the generic forbidden response.");
  assertEqual(serviceRole.calls, 0, "Viewer rejection must not reach service-role configuration or provisioning.");
}

{
  const serviceRole = probe(true);
  const result = decide({
    authorization: { message: "database policy error", status: "configuration_error" },
    hasOperatorAccess: false,
    isServiceRoleConfigured: serviceRole.fn,
  });

  assertEqual(result.status, "rejected", "Configuration failures must be rejected.");
  assertEqual(result.httpStatus, 500, "Configuration failures must return HTTP 500.");
  assertEqual(result.error, "Unable to verify access.", "Configuration failures must not leak internal messages.");
  assertEqual(serviceRole.calls, 0, "Auth configuration failures must not reach service-role configuration or provisioning.");
}

{
  const serviceRole = probe(false);
  const result = decide({
    authorization: {
      email: "editor@example.invalid",
      isActive: true,
      prayerPermissions: [],
      role: "editor",
      status: "authorized",
      userId: "user-editor",
    },
    hasOperatorAccess: true,
    isServiceRoleConfigured: serviceRole.fn,
  });

  assertEqual(result.status, "rejected", "Authorized operators must fail closed when service-role provisioning is unavailable.");
  assertEqual(result.httpStatus, 500, "Missing service-role configuration must return HTTP 500.");
  assertEqual(result.error, "Provisioning is not available.", "Service-role configuration failures must stay generic.");
  assertEqual(serviceRole.calls, 1, "Service-role configuration should be checked only after admin/editor authorization.");
}

{
  const serviceRole = probe(true);
  const result = decide({
    authorization: {
      email: "admin@example.invalid",
      isActive: true,
      prayerPermissions: [],
      role: "admin",
      status: "authorized",
      userId: "user-admin",
    },
    hasOperatorAccess: true,
    isServiceRoleConfigured: serviceRole.fn,
  });

  assertEqual(result.status, "allowed", "Authenticated admin/editor operators must be accepted.");
  assertEqual(serviceRole.calls, 1, "Authorized operators may reach the service-role availability check.");
}

console.log("dos-portal-provisioning-auth-behavior: all checks passed.");
