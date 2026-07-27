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

const adminShell = read("app/admin/_components/AdminShell.tsx");
const page = read("app/admin/operations-center/page.tsx");
const statusRoute = read("app/api/admin/operations-center/status/route.ts");
const contract = read("src/lib/ai-workforce/operations-center.ts");
const architectureDoc = read("docs/ai-workforce-operations-center-architecture.md");
const publicNav = read("components/PrimaryNav.tsx");

assertIncludes(page, 'export const dynamic = "force-dynamic"', "Operations Center page must stay server-rendered per request.");
assertIncludes(page, "robots:", "Operations Center page must define noindex metadata.");
assertIncludes(page, "<AdminShell", "Operations Center page must use the shared AdminShell.");
assertIncludes(page, 'active="operations-center"', "Operations Center page must use a hidden admin nav key.");
assertIncludes(page, "loadWorkforceSnapshot", "Operations Center page must load the server-side sanitized snapshot contract.");
assertIncludes(page, "No Controls", "Operations Center V1 must communicate that controls are out of scope.");

assertIncludes(adminShell, '"operations-center"', "Operations Center must be registered only as a hidden admin nav key.");
assertNotIncludes(adminShell, 'href: "/admin/operations-center"', "Operations Center must not be added to the admin sidebar yet.");
assertNotIncludes(publicNav, "/admin/operations-center", "Operations Center must not be linked from public navigation.");

assertIncludes(statusRoute, "getAdminAuthorization", "Status API must authorize server-side.");
assertIncludes(statusRoute, "status: 401", "Status API must reject unauthenticated access.");
assertIncludes(statusRoute, "status: 403", "Status API must reject non-admin access.");
assertIncludes(statusRoute, "private, no-store", "Status API must disable shared caching.");
assertIncludes(statusRoute, "loadWorkforceSnapshot", "Status API must return sanitized status snapshots.");
assertNotIncludes(statusRoute, "createSupabaseAdminClient", "Status API must not require Supabase service-role access in V1.");

for (const secretNeedle of [
  "LINEAR_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "process.env.LINEAR",
  "process.env.SUPABASE_SERVICE_ROLE",
  "child_process",
  "exec(",
  "spawn(",
]) {
  assertNotIncludes(statusRoute, secretNeedle, `Status API must not expose or execute ${secretNeedle}.`);
  assertNotIncludes(page, secretNeedle, `Operations Center page must not expose or execute ${secretNeedle}.`);
}

assertIncludes(contract, 'import "server-only"', "Workforce contracts must stay server-only.");
assertIncludes(contract, "sanitizeWorkforceSnapshot", "Workforce contract must expose a sanitizer.");
assertIncludes(contract, "sensitiveTextPattern", "Workforce sanitizer must redact sensitive-looking text.");
assertIncludes(contract, "\\/Users\\/", "Workforce sanitizer must treat local user paths as sensitive.");
assertIncludes(contract, "service_role", "Workforce sanitizer must treat service-role strings as sensitive.");
assertIncludes(contract, "createEmptyWorkforceSnapshot", "Empty/offline behavior must be explicit.");
assertIncludes(contract, "workforceSnapshotSources", "Canonical data source contracts must be represented in code.");
assertNotIncludes(contract, "readFile", "V1 web code must not read dispatcher files directly.");
assertNotIncludes(contract, "child_process", "V1 web code must not execute shell commands.");

for (const requiredDocText of [
  "Ryan -> ChatGPT -> Linear -> Dispatcher -> Claude/Codex -> QA -> Founder Review",
  "V1 route: `/admin/operations-center`",
  "V1 access: active Supabase Auth users",
  "Use push for V1",
  "must not poll the Mac mini",
  "Canonical Data Sources",
  "Secret Storage And Rotation",
  "Failure And Offline Behavior",
  "Release And Approval Gates",
  "Department Boundaries",
  "Founder Approval",
]) {
  assertIncludes(architectureDoc, requiredDocText, `Architecture doc must cover: ${requiredDocText}`);
}

console.log("ai-workforce-security-regression: all checks passed.");
