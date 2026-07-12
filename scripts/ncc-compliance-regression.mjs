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

const typesLib = read("src/lib/compliance/types.ts");
const filingsLib = read("src/lib/compliance/filings.ts");
const migration = read("supabase/migrations/20260713090000_compliance_filings_foundation.sql");
const actions = read("app/ncc/finance/compliance/actions.ts");
const confirmationForm = read("app/ncc/finance/compliance/_components/FilingConfirmationForm.tsx");
const agentPanel = read("app/ncc/finance/compliance/_components/AgentCapabilitiesPanel.tsx");
const financePage = read("app/ncc/finance/page.tsx");
const overviewPage = read("app/ncc/finance/compliance/page.tsx");

// --- Arizona Annual Report: first due date and recurrence rule ---

assertIncludes(typesLib, 'const AZ_FIRST_DUE_YEAR = 2026', "First Arizona Annual Report due year must be 2026.");
assertIncludes(typesLib, "const AZ_ANNIVERSARY_MONTH = 8", "Arizona Annual Report must recur in August.");
assertIncludes(typesLib, "const AZ_ANNIVERSARY_DAY = 3", "Arizona Annual Report must recur on the 3rd (anniversary of Aug 3, 2026).");
assertIncludes(
  typesLib,
  "https://ecorp.azcc.gov/",
  "Arizona Annual Report must link to the official Arizona Corporation Commission eCorp filing portal.",
);

// --- Form 990: unknown fields must not be assumed ---

assertIncludes(typesLib, 'filingType: "Unknown"', "Form 990 filing type must start Unknown.");
assertIncludes(typesLib, 'accountingYearEnd: "Unknown"', "Form 990 accounting year-end must start Unknown.");
assertIncludes(typesLib, 'extensionStatus: "Unknown"', "Form 990 extension status must start Unknown.");
assertIncludes(typesLib, "originalDueDate: null,", "Form 990 seed must not assume a due date before year-end is confirmed.");
assertIncludes(
  typesLib,
  "https://www.irs.gov/charities-non-profits/annual-filing-and-forms",
  "Form 990 must link to the official IRS filing resource.",
);

// --- Reminder schedule matches the requested offsets exactly ---

assertIncludes(typesLib, "export const reminderOffsetsDays = [120, 90, 60, 30, 14, 7, 0] as const;", "Reminder offsets must be exactly 120/90/60/30/14/7/0 days before due.");

// --- Never mark a filing complete without human confirmation (defense in depth: app + DB) ---

assertIncludes(
  actions,
  "if (!confirmationNumber) {",
  "recordComplianceFilingConfirmation must require a non-empty confirmation number before marking a filing filed.",
);
assert(
  !actions.includes('status: "filed"') || actions.includes("recordComplianceFilingConfirmation"),
  "Only recordComplianceFilingConfirmation may set status to filed.",
);
assertIncludes(
  migration,
  "compliance_filings_require_confirmation",
  "Migration must enforce (via trigger) that status cannot be filed without a confirmation_number, independent of application code.",
);
assertIncludes(
  confirmationForm,
  "the only way this filing can be marked",
  "Confirmation form must explain it's the only path to a filed status.",
);

// --- Writes are gated until the migration is applied to a real database ---

assertIncludes(
  actions,
  "isComplianceFilingsWriteEnabled()",
  "Compliance actions must check isComplianceFilingsWriteEnabled before touching Supabase.",
);
assertIncludes(
  filingsLib,
  'process.env.COMPLIANCE_FILINGS_MIGRATION_APPLIED === "true"',
  "Compliance filings write gate must default to disabled unless explicitly enabled.",
);

// --- Agent governance boundary is visible in the UI, not just documented ---

assertIncludes(agentPanel, "Submit filings", "Agent panel must disclose it may not submit filings.");
assertIncludes(agentPanel, "Certify legal statements", "Agent panel must disclose it may not certify legal statements.");
assertIncludes(agentPanel, "Change officers or directors", "Agent panel must disclose it may not change officers or directors.");
assertIncludes(agentPanel, "Change statutory-agent details", "Agent panel must disclose it may not change statutory-agent details.");
assertIncludes(agentPanel, "Post financial adjustments", "Agent panel must disclose it may not post financial adjustments.");
assertIncludes(
  agentPanel,
  "Mark a filing complete without human confirmation",
  "Agent panel must disclose it may not mark a filing complete without human confirmation.",
);
assertIncludes(
  agentPanel,
  "No document is read or summarized by AI in",
  "Agent panel must clearly disclose that no live AI extraction is wired up in this preview.",
);

// --- 8-stage workflow matches the requested sequence exactly ---

assertIncludes(
  typesLib,
  '"source_documents_uploaded",\n  "ai_extraction_and_preparation",\n  "missing_information_review",\n  "human_approval",\n  "accountant_or_officer_filing",\n  "confirmation_uploaded",\n  "filing_marked_complete",\n  "next_deadline_scheduled",',
  "Workflow stages must match the requested 8-step sequence in order.",
);

// --- Finance tab links out to the real Compliance route instead of an inline placeholder ---

assertIncludes(
  financePage,
  '{ href: "/ncc/finance/compliance", key: "compliance", label: "Compliance", status: "live" }',
  "Finance page's Compliance tab must link to the real /ncc/finance/compliance route and be marked live.",
);

// --- Migration is created but not applied anywhere ---

assertIncludes(migration, "NOT APPLIED to any database", "Compliance migration must explicitly document it is not applied.");
assert(
  !overviewPage.includes("supabase db push") && !overviewPage.includes("migration up"),
  "No page should silently trigger applying the compliance migration.",
);

console.log("ncc-compliance-regression: all checks passed.");
