#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

const migration = read("supabase", "migrations", "20260818162143_usa_174_operations_launch_safety_fundraising_finance.sql");
const joinClient = read("app", "join", "usam", "UsamJoinClient.tsx");
const joinRoute = read("app", "api", "join", "submit", "route.ts");
const applicationWriter = read("src", "lib", "dos", "usam-application.ts");
const onboarding = read("src", "lib", "operations", "onboarding.ts");
const submissions = read("src", "lib", "operations", "submissions.ts");
const financeLoader = read("src", "lib", "operations", "finance.ts");
const financePage = read("app", "operations", "finance", "page.tsx");

const results = [];

function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
}

check("migration extends applications without creating a finance ledger", () => {
  assert.match(migration, /proposed_monthly_need/);
  assert.match(migration, /admin_approved_monthly_goal/);
  assert.match(migration, /excess_support_agreement_accepted/);
  assert.doesNotMatch(migration, /create table/i);
  assert.doesNotMatch(migration, /ledger/i);
});

check("/join uses simple proposed monthly need and explicit excess-support agreement", () => {
  assert.match(joinClient, /Proposed monthly need/);
  assert.match(joinClient, /excessSupportAgreement/);
  assert.match(joinClient, /not automatically assigned to my household/);
  assert.doesNotMatch(joinClient, /Budget Helper/);
  assert.doesNotMatch(joinClient, /Choose a support goal to submit/);
});

check("join API requires and persists the agreement", () => {
  assert.match(joinRoute, /excessSupportAgreement/);
  assert.match(joinRoute, /Confirm the excess-support agreement/);
  assert.match(joinRoute, /excessSupportAgreementAccepted/);
  assert.match(joinRoute, /proposedMonthlyNeed/);
  assert.match(joinRoute, /adminApprovedMonthlyGoal:\s*null/);
});

check("public support settings use only the admin-approved monthly goal", () => {
  assert.match(applicationWriter, /admin_approved_monthly_goal/);
  assert.match(applicationWriter, /const monthlyGoal = adminApprovedMonthlyGoal/);
  assert.doesNotMatch(applicationWriter, /const monthlyGoal = payload\.supportGoal \?\? payload\.monthlyBudget/);
});

check("Operations applications expose safe archive, restore, and test-only delete", () => {
  assert.match(onboarding, /archiveOperationsOnboardingApplication/);
  assert.match(onboarding, /restoreOperationsOnboardingApplication/);
  assert.match(onboarding, /deleteTestOperationsOnboardingApplication/);
  assert.match(onboarding, /Only test missionary applications can be deleted/);
  assert.match(onboarding, /testApplication/);
});

check("Operations submissions expose safe archive, restore, and test-only delete", () => {
  assert.match(submissions, /archiveOperationsSubmission/);
  assert.match(submissions, /restoreOperationsSubmission/);
  assert.match(submissions, /deleteTestOperationsSubmission/);
  assert.match(submissions, /Only test submissions can be deleted/);
  assert.match(submissions, /isTestRecord/);
});

check("Operations finance is native read-only over Planning Center Giving records", () => {
  assert.match(financeLoader, /pco_giving_records/);
  assert.match(financeLoader, /pco_giving_sync_runs/);
  assert.match(financeLoader, /support_commitment_matches/);
  assert.match(financePage, /loadOperationsFinanceOverview/);
  assert.doesNotMatch(financePage, /<form/);
  assert.doesNotMatch(financePage, /action=/);
});

check("forbidden launch scope is absent", () => {
  const touchedSource = [
    migration,
    joinClient,
    joinRoute,
    applicationWriter,
    onboarding,
    submissions,
    financeLoader,
    financePage,
  ].join("\n");

  assert.doesNotMatch(touchedSource, /project needs/i);
  assert.doesNotMatch(touchedSource, /automated redistribution/i);
  assert.doesNotMatch(touchedSource, /new donor ledger/i);
});

const failed = results.filter((result) => !result.ok);

for (const result of results) {
  console.log(`${result.ok ? "  ok" : "FAIL"}  ${result.name}${result.ok ? "" : `\n        ${result.error}`}`);
}

if (failed.length) {
  process.exitCode = 1;
}
