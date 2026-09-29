#!/usr/bin/env node
// USA-190: production compliance regressions across status selection, evidence,
// persistence, explainability, and the targeted repair workflows.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");
const {
  appendOnlyFactSnapshot,
  complianceCardStatus,
  complianceNextAction,
  isAssignedDateSource,
  isFactSource,
  isFilingEvidenceSource,
  isTaxPeriodSource,
  isUsamDeterminationSource,
  selectFilingForCycle,
  usamDeterminationLetterFacts,
} = await import(pathToFileURL(path.join(root, "src/lib/finance/compliance.ts")).href);
const { computeFilingDueDate, deriveFilingStatus } = await import(
  pathToFileURL(path.join(root, "src/lib/finance/deadlines.ts")).href
);
const { latestClosedRecurringTaxPeriod } = await import(
  pathToFileURL(path.join(root, "src/lib/finance/tax-period.ts")).href
);

const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
};

const determination = {
  category: "irs_tax",
  documentType: "irs_determination_letter",
  id: "determination",
  title: "501(c)(3) Approval Letter",
};
const ein = {
  category: "irs_tax",
  documentType: "ein_letter",
  id: "ein",
  title: "EIN",
};
const formation = {
  category: "corporate_legal",
  documentType: "articles_of_incorporation",
  id: "formation",
  title: "Arizona Articles of Incorporation",
};
const stateReport = {
  category: "state_compliance",
  documentType: "state_annual_report",
  id: "state-report",
  title: "2026 Arizona Annual Report",
};

check("a filed item wins over an expired due date", () => {
  assert.equal(
    deriveFilingStatus({ dueDate: "2026-08-03", filedAt: "2026-08-01", today: "2026-08-25" }),
    "filed",
  );
  assert.equal(complianceCardStatus("filed"), "filed");
});

check("a founder-reported Arizona filing never renders as overdue", () => {
  assert.equal(
    deriveFilingStatus({
      dueDate: "2026-08-03",
      filingState: "reported_filed",
      today: "2026-09-02",
    }),
    "filed_needs_evidence",
  );
  assert.equal(complianceCardStatus("filed_needs_evidence"), "filed_needs_evidence");
  assert.match(complianceNextAction("filed_needs_evidence").detail, /not overdue/i);
  assert.equal(
    deriveFilingStatus({
      dueDate: "2026-08-03",
      filingState: "filed",
      filedAt: null,
      today: "2026-09-02",
    }),
    "filed_needs_evidence",
    "a malformed completed row without a date must ask for evidence rather than claim full verification",
  );
  assert.equal(
    deriveFilingStatus({
      dueDate: "2026-08-03",
      filedAt: "2026-08-01",
      filingEvidenceComplete: false,
      filingState: "filed",
      today: "2026-09-02",
    }),
    "filed_needs_evidence",
    "a filed date without its required receipt/reference must remain an obvious founder action",
  );
});

check("filing selection matches the concrete due-date cycle", () => {
  const rows = [
    {
      computedDueDate: "2025-08-03",
      filedAt: "2025-08-01",
      filingState: "filed",
      id: "old-filed",
      obligationId: "az",
      taxPeriodId: null,
      updatedAt: "2025-08-01T00:00:00Z",
    },
    {
      computedDueDate: "2026-08-03",
      filedAt: "2026-08-02",
      filingState: "filed",
      id: "current-filed",
      obligationId: "az",
      taxPeriodId: null,
      updatedAt: "2026-08-02T00:00:00Z",
    },
  ];
  assert.equal(
    selectFilingForCycle(rows, { dueDate: "2026-08-03", obligationId: "az", taxPeriodId: null })?.id,
    "current-filed",
  );
  assert.equal(
    selectFilingForCycle(rows, { dueDate: "2027-08-03", obligationId: "az", taxPeriodId: null }),
    null,
    "a prior filed year must not mark a new cycle filed",
  );
});

check("the IRS determination letter is eligible for tax-period verification", () => {
  assert.equal(isTaxPeriodSource(determination), true);
  assert.equal(isTaxPeriodSource(ein), false, "an EIN does not establish an accounting period");
  assert.equal(isTaxPeriodSource(formation), false, "formation evidence cannot establish a tax period");
  assert.equal(isUsamDeterminationSource(determination), true);
  assert.equal(isUsamDeterminationSource({ ...determination, title: "Other determination letter" }), false);
});

check("the real determination facts produce the exact USAM 990 deadline", () => {
  assert.deepEqual(usamDeterminationLetterFacts, {
    accountingPeriodEnding: "August 31",
    determinationDate: "2025-09-22",
    exemptionEffectiveDate: "2025-08-06",
    fiscalYearEndMonth: 8,
    form990Required: "Yes",
    publicCharityStatus: "170(b)(1)(A)(vi)",
    taxYearType: "fiscal",
  });
  const period = latestClosedRecurringTaxPeriod({
    asOf: "2026-09-02",
    fiscalYearEndMonth: usamDeterminationLetterFacts.fiscalYearEndMonth,
    taxYearType: usamDeterminationLetterFacts.taxYearType,
  });
  assert.deepEqual(period, {
    periodEnd: "2026-08-31",
    periodStart: "2025-09-01",
    periodType: "fiscal",
  });
  const deadline = computeFilingDueDate({
    businessDayAdjustment: true,
    calculationConfig: { day_of_month: 15, months: 5 },
    calculationType: "months_after_period_end",
    extensionAvailable: true,
    extensionForm: "Form 8868",
    extensionMonths: 6,
    filingName: "Form 990 / 990-EZ / 990-PF",
    jurisdiction: "US",
    ruleKey: "US_FORM_990",
    ruleVersion: "v1",
  }, { periodEnd: period.periodEnd, periodEndVerified: true });
  assert.equal(deadline.dueDate, "2027-01-15");
});

check("fact sources are purpose-specific instead of one generic document list", () => {
  assert.equal(isFactSource(ein, "ein"), true);
  assert.equal(isFactSource(determination, "ein"), false);
  assert.equal(isFactSource(formation, "formation_date"), true);
  assert.equal(isFactSource(determination, "fiscal_year_end_month"), true);
  assert.equal(isFactSource(formation, "fiscal_year_end_month"), false);
  assert.equal(
    isFactSource(determination, "first_period_start"),
    false,
    "the letter does not establish the initial short-period start",
  );
  assert.equal(isFactSource(determination, "first_period_end"), false);
});

check("Arizona assigned-date and filing evidence use state records", () => {
  assert.equal(isAssignedDateSource(stateReport), true);
  assert.equal(isAssignedDateSource(formation), false);
  assert.equal(isFilingEvidenceSource(stateReport, "AZ"), true);
  assert.equal(isFilingEvidenceSource(determination, "AZ"), false);
  assert.equal(isFilingEvidenceSource(determination, "US"), true);
});

check("every required card state has an explicit next action", () => {
  for (const status of ["needs_verification", "needs_review", "upcoming", "overdue", "filed_needs_evidence", "filed"]) {
    const action = complianceNextAction(status);
    assert.ok(action.label.length > 3, `${status} needs a label`);
    assert.ok(action.detail.length > 10, `${status} needs guidance`);
  }
  assert.equal(complianceCardStatus("due_soon"), "needs_review");
});

check("completed filings persist due date, filed date, status, and evidence separately", () => {
  const actions = read("app", "operations", "finance", "compliance", "actions.ts");
  const filingAction = actions.slice(actions.indexOf("export async function recordComplianceFilingAction"));
  assert.match(filingAction, /computed_due_date: filing\.dueDate/);
  assert.match(filingAction, /filed_at: filedAt/);
  assert.match(filingAction, /filing_status: "filed"/);
  assert.match(filingAction, /status: "filed"/);
  assert.match(filingAction, /confirmation_reference: confirmationReference/);
  assert.match(filingAction, /source_document_id: sourceDocument\.id/);
  assert.match(filingAction, /onConflict: "obligation_id,computed_due_date"/);
});

check("the loader cannot pick an arbitrary filing per obligation", () => {
  const workspace = read("src", "lib", "finance", "workspace.ts");
  assert.match(workspace, /selectFilingForCycle/);
  assert.doesNotMatch(workspace, /filingsByObligation/);
  assert.match(workspace, /\.in\("obligation_id", obligationIds\)/);
});

check("Arizona assigned-date saves its source and a dated filing snapshot", () => {
  const actions = read("app", "operations", "finance", "compliance", "actions.ts");
  const assigned = actions.slice(
    actions.indexOf("export async function recordAssignedDueDateAction"),
    actions.indexOf("export async function confirmAccountingPeriodAction"),
  );
  assert.match(assigned, /assigned_date_source_document_id: sourceDocument\.id/);
  assert.match(assigned, /assigned_date_verified_at: verifiedAt/);
  assert.match(assigned, /assignedDateSourceDocumentId: sourceDocument\.id/);
  assert.match(assigned, /document_references|linkDocument/);
});

check("Form 990 has a real canonical-document tax-period workflow", () => {
  const actions = read("app", "operations", "finance", "compliance", "actions.ts");
  const page = read("app", "operations", "finance", "compliance", "page.tsx");
  assert.match(actions, /export async function confirmAccountingPeriodAction/);
  assert.match(actions, /latestClosedRecurringTaxPeriod/);
  assert.match(actions, /\.rpc\("confirm_recurring_tax_year"/);
  assert.match(actions, /determinationWorkflowFacts\.has\(factKey\)/);
  assert.match(page, /action=\{confirmAccountingPeriodAction\}/);
  assert.match(page, /isUsamDeterminationSource/);
  assert.match(page, /Needs Verification[\s\S]*Select source document[\s\S]*Review source facts[\s\S]*Confirm[\s\S]*Verified[\s\S]*Calculated deadline/);
  assert.doesNotMatch(actions, /formation_date|incorporation/i);
});

check("tax-year calculation never falls back to formation or incorporation date", () => {
  const workspace = read("src", "lib", "finance", "workspace.ts");
  const deadlines = read("src", "lib", "finance", "deadlines.ts");
  assert.doesNotMatch(workspace.slice(workspace.indexOf("loadComplianceCalendar")), /facts\.get\("formation_date"\)/);
  assert.doesNotMatch(workspace.slice(workspace.indexOf("loadComplianceCalendar")), /facts\.get\("first_period_end"\)/);
  assert.match(deadlines, /Incorporation date is never/);
});

check("rule and source presentation is meaningful and drillable", () => {
  const page = read("app", "operations", "finance", "compliance", "page.tsx");
  assert.doesNotMatch(page, />\s*Authority\s*</);
  assert.match(page, /15th day of the 5th month/);
  assert.match(page, /IRS rule · \{filing\.ruleVersion\}/);
  assert.match(page, /Operations Documents/);
  assert.match(page, /\/operations\/documents\/\$\{encodeURIComponent\(document\.id\)\}/);
  assert.match(read("app", "operations", "documents", "[id]", "route.ts"), /createDocumentAccessUrl/);
});

check("How this is calculated explains inputs, rule, result, and non-inference", () => {
  const page = read("app", "operations", "finance", "compliance", "page.tsx");
  assert.match(page, /Verified tax period/);
  assert.match(page, /IRS rule/);
  assert.match(page, /Formation and incorporation dates are never substituted/);
  assert.match(page, /Calendar adjustment/);
  assert.doesNotMatch(page, /Object\.entries\(inputs\)/);
});

check("fact correction is transactional and append-only", () => {
  const migration = read("supabase", "migrations", "20260825153213_usa_190_compliance_repairs.sql");
  const facts = read("src", "lib", "finance", "facts.ts");
  assert.match(migration, /for update/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /set superseded_at = changed_at/);
  assert.match(migration, /returning id into replacement_fact_id/);
  assert.match(migration, /set superseded_by_fact_id = replacement_fact_id/);
  assert.match(migration, /revoke all on function public\.record_compliance_fact[\s\S]*from public, anon, authenticated/);
  assert.match(facts, /\.rpc\("record_compliance_fact"/);
  assert.doesNotMatch(facts, /\.insert\(\{[\s\S]{0,300}superseded_by_fact_id/);
  assert.match(migration, /confirm_recurring_tax_year/);
  assert.doesNotMatch(
    migration.slice(migration.indexOf("create or replace function public.confirm_recurring_tax_year")),
    /'first_period_start'|'first_period_end'/,
  );
});

check("save and reload keep the latest verified fact plus append-only history", () => {
  const snapshot = appendOnlyFactSnapshot([
    { factKey: "fiscal_year_end_month", id: "new", supersededAt: null },
    { factKey: "fiscal_year_end_month", id: "old", supersededAt: "2026-09-02T12:00:00Z" },
    { factKey: "tax_year_type", id: "fiscal", supersededAt: null },
  ]);
  assert.equal(snapshot.currentIds.get("fiscal_year_end_month"), "new");
  assert.equal(snapshot.historyCounts.get("fiscal_year_end_month"), 2);
  const factsLoader = read("src", "lib", "finance", "facts.ts");
  assert.match(factsLoader, /appendOnlyFactSnapshot/);
  assert.match(factsLoader, /superseded_at, created_at/);
});

check("Arizona due date, completion state, filed date, evidence, and next filing are separate", () => {
  const migration = read("supabase", "migrations", "20260825153213_usa_190_compliance_repairs.sql");
  const page = read("app", "operations", "finance", "compliance", "page.tsx");
  assert.match(migration, /filing_status in \('not_filed', 'reported_filed', 'filed'\)/);
  assert.match(migration, /Founder reports the 2026 Arizona Annual Report was filed/);
  assert.match(page, /Assigned due date/);
  assert.match(page, /Filing status/);
  assert.match(page, /Filed \/ completed date/);
  assert.match(page, /Filing evidence/);
  assert.match(page, /Next filing/);
  assert.match(page, /filingDisplayName/);
});

check("sensitivity is checked for both rendering and every evidence save", () => {
  const page = read("app", "operations", "finance", "compliance", "page.tsx");
  const actions = read("app", "operations", "finance", "compliance", "actions.ts");
  assert.match(page, /loadOperationsDocuments\(\{ authorization/);
  assert.match(page, /Restricted source document/);
  assert.match(page, /Source facts remain hidden until an authorized determination letter is available/);
  assert.match(actions, /async function authorizedDocument/);
  assert.match(actions, /loadOperationsDocuments\(\{ authorization, organizationId \}\)/);
  assert.match(actions, /unavailable at your access level/);
});

check("save actions revalidate and reload from the database", () => {
  const actions = read("app", "operations", "finance", "compliance", "actions.ts");
  assert.match(actions, /revalidatePath\("\/operations\/finance\/compliance"\)/);
  assert.match(actions, /redirect\(`\/operations\/finance\/compliance\?saved=/);
  assert.match(read("app", "operations", "finance", "compliance", "page.tsx"), /dynamic = "force-dynamic"/);
});

check("forms stack on mobile and introduce no horizontal-scroll table", () => {
  const page = read("app", "operations", "finance", "compliance", "page.tsx");
  const subnav = read("app", "operations", "finance", "_components", "FinanceSubnav.tsx");
  assert.doesNotMatch(page, /min-w-\[[^\]]+\]|overflow-x-auto/);
  assert.doesNotMatch(subnav, /min-w-max|overflow-x-auto/);
  assert.match(subnav, /flex-wrap/);
  assert.match(page, /lg:grid-cols-/);
  assert.match(page, /sm:grid-cols-2/);
});

const failed = results.filter((entry) => !entry.ok);
for (const entry of results) {
  console.log(`${entry.ok ? "PASS" : "FAIL"}  ${entry.name}${entry.ok ? "" : `\n      ${entry.error}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
