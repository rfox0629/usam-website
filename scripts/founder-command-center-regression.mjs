import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const page = readFileSync("app/admin/operations-center/page.tsx", "utf8");
const actions = readFileSync("app/admin/operations-center/actions.ts", "utf8");
const data = readFileSync("src/lib/operations-center/operations-center.ts", "utf8");
const shell = readFileSync("app/admin/_components/AdminShell.tsx", "utf8");
const envExample = readFileSync(".env.example", "utf8");

const categories = [
  "USA Missionaries / Ministry Strategy",
  "Public Website / Marketing",
  "DOS - Discipleship Operating System",
  "Kitchen Table Gospel",
  "NCC / Operations Center",
  "Communications",
  "AI Workforce / Automation",
  "Finance / Compliance",
  "SAVE Standard",
];

for (const category of categories) {
  assert(data.includes(category), `Missing active-work category: ${category}`);
}

for (const issueId of ["USA-50", "USA-51", "USA-52", "USA-53", "USA-54", "USA-55", "USA-60", "USA-61", "USA-62", "USA-63", "USA-64", "USA-68"]) {
  assert(data.includes(`"${issueId}"`), `Missing tracked Linear issue ${issueId}`);
}

assert(shell.includes("operations-center"), "AdminShell should expose Operations Center navigation.");
assert(shell.includes("surface?: \"dark\" | \"light\""), "AdminShell should support the white Operations Center workspace.");

assert(page.includes("surface=\"light\""), "Founder Command Center should render on the white admin surface.");
assert(page.includes("Needs My Attention"), "Needs My Attention section is required.");
assert(page.includes("Open Work"), "Open Work running list is required.");
assert(page.includes("Completed Recently"), "Completed Recently section is required.");
assert(page.includes("Runner Health"), "Runner Health section is required.");
assert(page.includes("Today"), "Today brief is required.");
assert(page.includes("No raw logs, secrets, shell controls, or unrestricted execution controls are exposed."), "Safety footer is required.");

assert(!page.includes("Active Work"), "Simplified V1 should not use the old Active Work section label.");
assert(!page.includes("AI Workforce Capacity"), "Runner health should not dominate the page as AI Workforce Capacity.");
assert(!page.includes("Recent Activity"), "Completed Recently should replace noisy recent activity UI.");
assert(!page.includes("Start Something New"), "V1 must not include a Start Something New workflow.");
assert(!page.includes("<textarea"), "V1 must not include an embedded chat or large instruction box.");
assert(!page.includes("chat box"), "V1 should not describe an embedded chat box.");
assert(!page.match(/\b\d{2}% remaining\b/i), "Do not hardcode inferred runner capacity percentages.");

assert(data.includes("usageRemainingPercent") && data.includes("usageSource"), "Exact usage percentages must require a provider/account source.");
assert(data.includes("parseReviewPackage") && data.includes("decisionRequested") && data.includes("estimatedReviewTime"), "Review items must require a decision and review time.");
assert(data.includes("filter((url) => !url.includes(\"linear.app/\"))"), "Needs My Attention must not use bare Linear issue links as review packages.");
assert(data.includes("buildCompletedRecently"), "Completed Recently data should be derived separately.");
assert(data.includes("blockerForIssue"), "Open Work rows should expose blockers when present.");
assert(data.includes("filter((issue) => issue.status !== \"Complete\")"), "Open Work must exclude completed issues.");

assert(actions.includes("canEditAdminContent"), "Server actions must enforce admin/editor authorization.");
assert(actions.includes("appendOperationsCenterAction"), "Server actions should write to the safe dispatcher outbox.");
assert(!actions.includes("issueUpdate"), "Founder decisions should not mutate Linear directly in V1.");
assert(!actions.includes("child_process"), "Operations Center actions must not expose shell execution.");

for (const envName of [
  "OPERATIONS_CENTER_LINEAR_API_KEY",
  "LINEAR_API_KEY",
  "OPERATIONS_CENTER_DISPATCHER_HEALTH_PATH",
  "OPERATIONS_CENTER_ACTION_OUTBOX_PATH",
]) {
  assert(envExample.includes(`${envName}=`), `.env.example missing ${envName}.`);
}

console.log("Founder Command Center regression passed.");
