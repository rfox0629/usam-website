import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const applicationModel = readFileSync("src/lib/join/application-steps.ts", "utf8");
const applicationFields = readFileSync("app/join/application-fields.ts", "utf8");
const applicationClient = readFileSync("app/join/UsamApplicationClient.tsx", "utf8");
const submission = readFileSync("src/lib/join/submit-application.ts", "utf8");
const operations = readFileSync("src/lib/operations/onboarding.ts", "utf8");
const joinPage = readFileSync("app/join/page.tsx", "utf8");

const expectedBudgetKeys = [
  "housing",
  "foodHousehold",
  "utilities",
  "transportation",
  "insuranceMedical",
  "childrenEducation",
  "debtPayments",
  "givingTithe",
  "savings",
  "retirement",
  "otherPersonalNeeds",
  "hospitalityMeals",
  "localTravel",
  "trainingResources",
  "eventsGatherings",
  "communicationsSoftware",
  "otherMinistryNeeds",
];

console.log("USA-167 guided application regression\n");

function check(label, condition) {
  assert.ok(condition, label);
  console.log(`  ok    ${label}`);
}

check("the canonical private worksheet has exactly 17 categories", (applicationModel.match(/group: "(?:household|ministry)", key:/g) ?? []).length === 17);

for (const key of expectedBudgetKeys) {
  check(`worksheet includes ${key}`, applicationModel.includes(`key: "${key}"`));
}

check("all application steps define guided parts", ["about", "story", "calling", "experience", "mission", "support", "profile"].every((step) => applicationFields.includes(`${step}: [`)));
check("Support and Fundraising has path, budget, picture, and readiness parts", ["Your support path", "Monthly budget", "Your support picture", "Fundraising readiness"].every((title) => applicationFields.includes(`title: "${title}"`)));
check("the UI progressively branches for yes, unsure, and no support paths", ["path === \"yes\"", "path === \"unsure\"", "path === \"no\""].every((source) => applicationClient.includes(source)));
check("the worksheet renders from the canonical category list", applicationClient.includes("supportBudgetCategories.filter"));
check("the proposed need can copy the worksheet total only by applicant action", applicationClient.includes('label: "Use budget total"') && applicationClient.includes('onAnswer("supportMonthlyNeed", String(summary.budgetTotal))'));
check("the applicant requested goal remains a separate input", applicationClient.includes('id="supportRequestedGoal"') && applicationClient.includes('onAnswer("supportRequestedGoal", value)'));
check("the Operations-approved public goal is explained separately", applicationClient.includes("Operations reviews the application and owns the approved public goal"));
check("the overflow acknowledgement is restored on the fundraising path", applicationClient.includes("excessSupportAgreement") && applicationClient.includes("Support overflow acknowledgement"));
check("submission writes a structured private budget object", submission.includes("categories: supportBudgetValues") && submission.includes("total: supportBudgetTotals.total"));
check("submission never derives the applicant requested goal from the budget", submission.includes('money(draft, "supportRequestedGoal")') && !submission.includes("requestedGoal = supportBudgetTotals"));
check("a no-support path cannot submit stale proposed or requested goals", submission.includes('const proposedMonthlyNeed = expectsFundraising ? money(draft, "supportMonthlyNeed") : null') && submission.includes('const requestedGoal = expectsFundraising ? money(draft, "supportRequestedGoal") : null'));
check("Operations reads both the legacy and V2 support payload shapes", operations.includes("contactPayload.support_json") && operations.includes("contactPayload.support"));
check("Operations labels the applicant request separately from its approved figure", operations.includes("Applicant Requested Goal") && operations.includes("Approved Ministry Budget"));
// The approved figure is a ministry budget, so the target that has to be raised
// for it and the allocation it carries are derived and shown, never stored and
// never folded back into the budget itself.
check("Operations derives the fundraising target from the approved ministry budget", operations.includes("Fundraising Target") && operations.includes("planningFundraisingTarget(Number(row.admin_approved_monthly_goal))"));
check("Operations shows the organizational support the target carries", operations.includes("Organizational Support At Target") && operations.includes("planningOrganizationalSupport(Number(row.admin_approved_monthly_goal))"));
check("the founder preview gate still wraps /join", joinPage.includes("JoinPreviewGate"));

console.log("\nThe gated application preserves the V2 backend while restoring guided UX and the private finance worksheet.");

// The organizational support rate must stay a parameter of anything describing
// money that already moved. Baking the current constant into applied allocation
// would silently reprice history the day the rate changes.
const orgPolicy = readFileSync("src/lib/organizational-support.ts", "utf8");
const finance = readFileSync("src/lib/operations/finance.ts", "utf8");
check("applied organizational support takes the rate that was applied", orgPolicy.includes("export function appliedOrganizationalSupport(received: number, rate: number)") && orgPolicy.includes("export function appliedNetMinistryFunding(received: number, rate: number)"));
check("the fundraising target rounds up so rounding never underfunds the budget", orgPolicy.includes("Math.ceil(usable(ministryBudget) / ministryShare(rate))"));
check("Operations keeps cents on money that actually moved", finance.includes("exactMoneyLabel(appliedOrganizationalSupport(recurringMonthly, appliedRate))") && finance.includes("minimumFractionDigits: 2"));
