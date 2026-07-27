import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const pagePath = "app/admin/operations-center/page.tsx";
const actionsPath = "app/admin/operations-center/actions.ts";
const loadingPath = "app/admin/operations-center/loading.tsx";
const libPath = "src/lib/operations-center/operations-center.ts";
const shellPath = "app/admin/_components/AdminShell.tsx";
const envPath = ".env.example";
const docPath = "docs/qa/usa-54/founder-command-center-design-principles.md";

for (const filePath of [pagePath, actionsPath, loadingPath, libPath, docPath]) {
  assert(exists(filePath), `${filePath} must exist.`);
}

const page = read(pagePath);
const actions = read(actionsPath);
const lib = read(libPath);
const shell = read(shellPath);
const envExample = read(envPath);
const doc = read(docPath);

assert(page.includes("<AdminShell"), "Operations Center page must use the shared AdminShell.");
assert(page.includes('workspace="light"'), "Founder Command Center must render the light workspace variant.");
assert(shell.includes('activeKey: "operations-center"'), "Admin nav must expose the protected Founder Center route.");
assert(shell.includes('workspace?: "dark" | "light"'), "AdminShell must keep light workspace support explicit.");

assert(!page.toLowerCase().includes("start something new"), "V1 must not include a Start Something New box.");
assert(!page.includes("<textarea"), "V1 must not include an embedded chat or large freeform prompt.");
assert(!page.includes("LINEAR_API_KEY"), "Linear server token names must not appear in the browser page component.");
assert(!page.includes("OPERATIONS_CENTER_DISPATCHER_HEALTH_PATH"), "Dispatcher file paths must stay out of the browser page component.");

assert(lib.includes('import "server-only";'), "Operations data loader must be server-only.");
assert(lib.includes("https://api.linear.app/graphql"), "Operations data loader must support server-side live Linear ingestion.");
assert(envExample.includes("LINEAR_API_KEY="), ".env.example must document optional server-only Linear ingestion.");
assert(!envExample.includes("NEXT_PUBLIC_LINEAR"), "Linear credentials must not be documented as public env vars.");

assert(actions.includes('"use server";'), "Review and override controls must use server actions.");
assert(actions.includes("OPERATIONS_CENTER_DECISION_OUTBOX_PATH"), "Founder decisions must write only to a configured decision outbox.");
assert(actions.includes("OPERATIONS_CENTER_RUNNER_OVERRIDE_OUTBOX_PATH"), "Runner override must write only to a configured override outbox.");
assert(actions.includes("Does not bypass cooldown"), "Runner override must preserve cooldown/lock safety language.");

const routeSurface = `${page}\n${actions}\n${lib}`;

for (const required of ["Approve", "Request Changes", "Hold", "Next Runner", "Codex", "Claude"]) {
  assert(routeSurface.includes(required), `Route surface must include ${required}.`);
}

for (const category of [
  "USA Missionaries / Ministry Strategy",
  "Public Website / Marketing",
  "DOS — Discipleship Operating System",
  "Kitchen Table Gospel",
  "NCC / Operations",
  "Communications",
  "AI Workforce / Automation",
  "Finance / Compliance",
]) {
  assert(lib.includes(category), `Active Work must include ${category}.`);
}

assert(!/([1-9]\d?|100)% remaining/i.test(routeSurface), "Dashboard must not show inferred remaining usage percentages.");
assert(!routeSurface.includes("child_process"), "Dashboard must not expose shell execution.");
assert(!/\bexec(Sync|File)?\s*\(/.test(routeSurface), "Dashboard must not call exec-style shell APIs.");
assert(!routeSurface.includes("SUPABASE_SERVICE_ROLE_KEY"), "Operations Center route must not require or expose Supabase service role.");

for (const source of [
  "https://linear.app/developers/graphql",
  "https://vercel.com/docs/deployments/generated-urls",
  "https://service-manual.ons.gov.uk/data-visualisation/guidance/dashboards",
  "https://carbondesignsystem.com/components/data-table/usage/",
]) {
  assert(doc.includes(source), `Design principles doc must cite ${source}.`);
}

console.log("Founder Command Center regression checks passed.");
