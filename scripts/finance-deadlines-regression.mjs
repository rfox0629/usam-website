#!/usr/bin/env node
// USA-181: proves the compliance deadline engine is explainable, refuses to
// guess unverified facts, and encodes no universal Arizona date.
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const {
  computeFilingDueDate,
  deriveFilingStatus,
  federalHolidays,
  isBusinessDay,
  nextBusinessDay,
} = await import(pathToFileURL(path.join(root, "src/lib/finance/deadlines.ts")).href);

const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
};

const federal990 = {
  businessDayAdjustment: true,
  calculationConfig: { months: 5, day_of_month: 15 },
  calculationType: "months_after_period_end",
  extensionAvailable: true,
  extensionForm: "Form 8868",
  extensionMonths: 6,
  filingName: "Form 990 / 990-EZ / 990-PF",
  jurisdiction: "US",
  ruleKey: "US_FORM_990",
  ruleVersion: "v1",
};

const arizona = {
  businessDayAdjustment: true,
  calculationConfig: { requires_organization_assigned_due_date: true },
  calculationType: "state_assigned",
  extensionAvailable: false,
  extensionForm: null,
  extensionMonths: null,
  filingName: "Arizona Annual Report",
  jurisdiction: "AZ",
  ruleKey: "AZ_ANNUAL_REPORT",
  ruleVersion: "v1",
};

check("USA-181 worked example: period ending 2026-08-03 is due 2027-01-15", () => {
  const result = computeFilingDueDate(federal990, {
    periodEnd: "2026-08-03",
    periodEndVerified: true,
  });
  assert.equal(result.status, "computed");
  assert.equal(result.dueDate, "2027-01-15");
});

check("calendar-year period ending 2025-12-31 is due 2026-05-15", () => {
  const result = computeFilingDueDate(federal990, {
    periodEnd: "2025-12-31",
    periodEndVerified: true,
  });
  assert.equal(result.dueDate, "2026-05-15");
});

check("an unverified period end returns needs_verification, never a date", () => {
  const result = computeFilingDueDate(federal990, {
    periodEnd: "2026-08-03",
    periodEndVerified: false,
  });
  assert.equal(result.status, "needs_verification");
  assert.equal(result.dueDate, null);
  assert.match(result.reason, /not verified/i);
});

check("a missing period end never falls back to another date", () => {
  const result = computeFilingDueDate(federal990, { periodEnd: null, periodEndVerified: true });
  assert.equal(result.status, "needs_verification");
  assert.equal(result.dueDate, null);
});

check("weekend and holiday due dates move to the next business day", () => {
  // 2027-05-15 is a Saturday.
  const result = computeFilingDueDate(federal990, {
    periodEnd: "2026-12-31",
    periodEndVerified: true,
  });
  assert.equal(result.computedInputs.unadjustedDueDate, "2027-05-15");
  assert.equal(result.dueDate, "2027-05-17");
  assert.ok(isBusinessDay(result.dueDate));
  assert.match(String(result.computedInputs.adjustmentReason), /business day/i);
});

check("every computed date records the inputs that produced it", () => {
  const result = computeFilingDueDate(federal990, {
    periodEnd: "2026-08-03",
    periodEndVerified: true,
  });
  const i = result.computedInputs;
  assert.equal(i.ruleKey, "US_FORM_990");
  assert.equal(i.ruleVersion, "v1");
  assert.equal(i.months, 5);
  assert.equal(i.dayOfMonth, 15);
  assert.equal(i.periodEnd, "2026-08-03");
  assert.equal(i.periodEndVerified, true);
  assert.equal(i.unadjustedDueDate, "2027-01-15");
});

check("Form 8868 extension is tracked separately from the original date", () => {
  const result = computeFilingDueDate(federal990, {
    periodEnd: "2025-12-31",
    periodEndVerified: true,
  });
  assert.equal(result.dueDate, "2026-05-15");
  assert.equal(result.extensionDueDate, "2026-11-16"); // 2026-11-15 is a Sunday
  assert.notEqual(result.dueDate, result.extensionDueDate);
  assert.equal(result.computedInputs.extensionForm, "Form 8868");
});

check("Arizona encodes no universal date and asks for the assigned one", () => {
  const result = computeFilingDueDate(arizona, {});
  assert.equal(result.status, "needs_verification");
  assert.equal(result.dueDate, null);
  assert.match(result.reason, /assigns this organization its own due date/i);
  assert.equal(result.computedInputs.requiresOrganizationAssignedDueDate, true);
});

check("Arizona uses the organization's assigned date once it is provided", () => {
  const result = computeFilingDueDate(arizona, { organizationAssignedDueDate: "2026-10-01" });
  assert.equal(result.status, "computed");
  assert.equal(result.dueDate, "2026-10-01");
  assert.equal(result.computedInputs.organizationAssignedDueDate, "2026-10-01");
});

check("no August 1 default leaks into the Arizona rule", () => {
  const result = computeFilingDueDate(arizona, {});
  assert.doesNotMatch(JSON.stringify(result), /08-01|August 1/);
});

check("federal holiday table observes weekend shifts", () => {
  const y2027 = federalHolidays(2027);
  assert.ok(y2027.has("2027-07-05"), "Independence Day 2027 falls Sunday, observed Monday");
  assert.ok(y2027.has("2027-12-24"), "Christmas 2027 falls Saturday, observed Friday");
  assert.ok(y2027.has("2027-11-25"), "Thanksgiving 2027");
  assert.equal(isBusinessDay("2027-07-05"), false);
});

check("nextBusinessDay skips holidays as well as weekends", () => {
  const { adjusted } = nextBusinessDay("2027-07-05");
  assert.equal(adjusted, "2027-07-06");
});

check("status derivation never claims filed without a filing date", () => {
  assert.equal(deriveFilingStatus({ dueDate: null, today: "2026-08-19" }), "needs_verification");
  assert.equal(deriveFilingStatus({ dueDate: "2026-09-01", today: "2026-08-19" }), "due_soon");
  assert.equal(deriveFilingStatus({ dueDate: "2027-01-15", today: "2026-08-19" }), "upcoming");
  assert.equal(deriveFilingStatus({ dueDate: "2026-08-01", today: "2026-08-19" }), "overdue");
  assert.equal(deriveFilingStatus({ dueDate: "2026-08-01", filedAt: "2026-07-30", today: "2026-08-19" }), "filed");
  assert.equal(deriveFilingStatus({ dueDate: "2026-08-01", extensionFiled: true, today: "2026-08-19" }), "extended");
});

check("engine performs no network or filesystem access", async () => {
  const source = (await import("node:fs")).readFileSync(
    path.join(root, "src/lib/finance/deadlines.ts"),
    "utf8",
  );
  assert.doesNotMatch(source, /\bfetch\s*\(|require\s*\(|import\s+.*from/);
  assert.doesNotMatch(source, /https?:\/\//);
});

const failed = results.filter((entry) => !entry.ok);
for (const entry of results) {
  console.log(`${entry.ok ? "PASS" : "FAIL"}  ${entry.name}${entry.ok ? "" : `\n      ${entry.error}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
