import { readFileSync } from "node:fs";
import {
  classifyDocumentByFilename,
  dedupeKeyFor,
  detectPayrollTransaction,
  draftMissingInformationQuestions,
  flagUnusualTransactions,
  generateBalanceSheetSkeleton,
  generateContributionSummary,
  generateExpenseDetail,
  generateFunctionalExpenseAllocation,
  generatePayrollSummary,
  generateProfitAndLoss,
  generateRestrictedFundWorksheet,
  generateRevenueSummary,
  generateUncategorizedTransactionsReport,
  generateYearEndCashReconciliation,
  identifyMissingMonthlyDocuments,
  parseCsv,
  parseTransactionCsv,
  suggestReportingPeriod,
  suggestTransactionCategory,
} from "../src/lib/finance-ops/logic";
import { arizonaAnnualReportDueDate, isValidArizonaAnnualReportYear, reminderMilestonesForDueDate } from "../src/lib/compliance/types";
import type { FinanceTransaction } from "../src/lib/finance-ops/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  assert(pass, `${message} -- expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

console.log("finance-ops-regression: running real unit tests against the pure functions\n");

// --- CSV parsing ---------------------------------------------------------

test("parseCsv handles quoted fields with embedded commas", () => {
  const rows = parseCsv('Date,Description,Amount\n2026-01-05,"Acme, Inc. Payment",-120.50\n');
  assertEqual(rows, [
    ["Date", "Description", "Amount"],
    ["2026-01-05", "Acme, Inc. Payment", "-120.50"],
  ], "quoted comma field");
});

test("parseTransactionCsv maps a signed Amount column and infers debit/credit", () => {
  const result = parseTransactionCsv("Date,Description,Amount\n01/05/2026,Office Depot,-45.20\n01/06/2026,Donor Gift,500.00\n");
  assertEqual(result.errors.length, 0, "no errors");
  assertEqual(result.rows.length, 2, "two rows parsed");
  assertEqual(result.rows[0].transactionType, "debit", "negative amount is debit");
  assertEqual(result.rows[0].amount, 45.2, "debit amount is stored positive");
  assertEqual(result.rows[1].transactionType, "credit", "positive amount is credit");
  assertEqual(result.rows[0].transactionDate, "2026-01-05", "US date format normalized to ISO");
});

test("parseTransactionCsv maps separate Debit/Credit columns", () => {
  const result = parseTransactionCsv("Date,Description,Debit,Credit\n2026-02-01,Rent,1200.00,\n2026-02-02,Donation,,300.00\n");
  assertEqual(result.rows[0].transactionType, "debit", "debit column row");
  assertEqual(result.rows[1].transactionType, "credit", "credit column row");
});

test("parseTransactionCsv reports a per-row error for an unparseable amount instead of skipping silently", () => {
  const result = parseTransactionCsv("Date,Description,Amount\n2026-01-05,Mystery Charge,not-a-number\n");
  assertEqual(result.rows.length, 0, "no rows produced");
  assert(result.errors.length === 1 && result.errors[0].rowNumber === 2, "error attributed to row 2");
});

test("parseTransactionCsv rejects a file with no recognizable columns", () => {
  const result = parseTransactionCsv("Foo,Bar\n1,2\n");
  assert(result.rows.length === 0 && result.errors.length === 1, "rejected with a single top-level error");
});

// --- Dedupe ----------------------------------------------------------------

test("dedupeKeyFor prefers external_transaction_id when present", () => {
  const key = dedupeKeyFor({ amount: 10, description: "Coffee", externalTransactionId: "TXN-123", transactionDate: "2026-01-01" });
  assertEqual(key, "ext:TXN-123", "external id key");
});

test("dedupeKeyFor falls back to a normalized composite key", () => {
  const keyA = dedupeKeyFor({ amount: 10, description: "  Coffee Shop  ", transactionDate: "2026-01-01" });
  const keyB = dedupeKeyFor({ amount: 10, description: "coffee shop", transactionDate: "2026-01-01" });
  assertEqual(keyA, keyB, "whitespace/case-insensitive composite key collapses to the same dedupe key");
});

test("dedupeKeyFor produces different keys for different amounts", () => {
  const keyA = dedupeKeyFor({ amount: 10, description: "Coffee", transactionDate: "2026-01-01" });
  const keyB = dedupeKeyFor({ amount: 11, description: "Coffee", transactionDate: "2026-01-01" });
  assert(keyA !== keyB, "different amounts produce different keys");
});

// --- Rule-based suggestions (deterministic, no document content read) ------

test("classifyDocumentByFilename matches on filename keywords only", () => {
  assertEqual(classifyDocumentByFilename("Chase_Bank_Statement_Jan.pdf")?.category, "bank_statement", "bank statement filename");
  assertEqual(classifyDocumentByFilename("Gusto_Payroll_Report.csv")?.category, "payroll_report", "payroll filename");
  assertEqual(classifyDocumentByFilename("random-file.pdf"), null, "no match returns null, not a guess");
});

test("suggestReportingPeriod returns the min/max of given dates", () => {
  const period = suggestReportingPeriod(["2026-03-01", "2026-01-15", "2026-06-30"]);
  assertEqual(period, { end: "2026-06-30", start: "2026-01-15" }, "min/max period");
});

test("identifyMissingMonthlyDocuments diffs uploaded against the expected checklist", () => {
  const missing = identifyMissingMonthlyDocuments(["bank_statement"]);
  assertEqual(missing, ["payroll_report", "donation_report", "board_record"], "missing categories listed");
});

test("suggestTransactionCategory matches known keywords", () => {
  assertEqual(suggestTransactionCategory("GUSTO PAYROLL RUN")?.category, "Payroll", "payroll keyword");
  assertEqual(suggestTransactionCategory("RANDOM VENDOR XYZ"), null, "unknown description returns null, not a guess");
});

test("detectPayrollTransaction flags known payroll processors", () => {
  assert(detectPayrollTransaction("ADP PAYROLL"), "ADP detected");
  assert(!detectPayrollTransaction("STARBUCKS COFFEE"), "coffee not flagged as payroll");
});

test("flagUnusualTransactions flags a statistical outlier and nothing else", () => {
  const transactions: Array<Pick<FinanceTransaction, "amount" | "id" | "reviewStatus">> = [
    { amount: 50, id: "a", reviewStatus: "approved" },
    { amount: 55, id: "b", reviewStatus: "approved" },
    { amount: 48, id: "c", reviewStatus: "approved" },
    { amount: 52, id: "d", reviewStatus: "approved" },
    { amount: 5000, id: "e", reviewStatus: "approved" },
  ];
  const flagged = flagUnusualTransactions(transactions);
  assertEqual(flagged, ["e"], "only the outlier is flagged");
});

test("draftMissingInformationQuestions combines existing questions, missing docs, and uncategorized count", () => {
  const questions = draftMissingInformationQuestions({
    missingDocuments: ["December bank statement"],
    openQuestions: ["Which form applies?"],
    uncategorizedTransactionCount: 3,
  });
  assertEqual(questions.length, 3, "three questions produced");
  assert(questions[0] === "Which form applies?", "existing open question preserved first");
  assert(questions.some((question) => question.includes("December bank statement")), "missing document question included");
  assert(questions.some((question) => question.includes("3 transaction")), "uncategorized count question included");
});

// --- Workpaper generation (approved transactions only) ---------------------

function makeTransaction(overrides: Partial<FinanceTransaction>): FinanceTransaction {
  return {
    amount: 100,
    approvedCategory: null,
    createdAt: "2026-01-01T00:00:00Z",
    description: "Test transaction",
    externalTransactionId: null,
    financialAccountId: "acct-1",
    fundOrRestriction: null,
    functionalClassification: null,
    id: "txn-1",
    importBatchId: null,
    notes: null,
    organizationId: "org-1",
    postedDate: null,
    proposedCategory: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewStatus: "approved",
    sourceDocumentId: null,
    transactionDate: "2026-01-15",
    transactionType: "credit",
    ...overrides,
  };
}

test("generateProfitAndLoss only sums approved transactions and warns about unreviewed ones", () => {
  const transactions = [
    makeTransaction({ amount: 1000, id: "t1", reviewStatus: "approved", transactionType: "credit" }),
    makeTransaction({ amount: 400, id: "t2", reviewStatus: "approved", transactionType: "debit" }),
    makeTransaction({ amount: 9999, id: "t3", reviewStatus: "needs_review", transactionType: "credit" }),
  ];
  const result = generateProfitAndLoss(transactions);
  assertEqual(result.total, 600, "net excludes the unreviewed 9999 credit");
  assert(result.missingDataWarnings.length === 1, "warns that some transactions are not yet approved");
});

test("generateRevenueSummary groups approved credits by approved_category", () => {
  const transactions = [
    makeTransaction({ amount: 500, approvedCategory: "Grants", id: "t1", transactionType: "credit" }),
    makeTransaction({ amount: 300, approvedCategory: "Grants", id: "t2", transactionType: "credit" }),
    makeTransaction({ amount: 200, approvedCategory: "Donations", id: "t3", transactionType: "credit" }),
    makeTransaction({ amount: 999, id: "t4", reviewStatus: "needs_review", transactionType: "credit" }),
  ];
  const result = generateRevenueSummary(transactions);
  assertEqual(result.total, 1000, "excludes unreviewed row");
  assertEqual(result.rows.find((row) => row.category === "Grants")?.total, 800, "grants grouped correctly");
});

test("generateExpenseDetail only includes approved debits", () => {
  const transactions = [
    makeTransaction({ amount: 100, approvedCategory: "Rent", id: "t1", transactionType: "debit" }),
    makeTransaction({ amount: 200, approvedCategory: "Rent", id: "t2", transactionType: "credit" }),
  ];
  const result = generateExpenseDetail(transactions);
  assertEqual(result.total, 100, "credit row excluded from expense detail");
});

test("generateFunctionalExpenseAllocation warns about unclassified approved expenses", () => {
  const transactions = [makeTransaction({ amount: 100, functionalClassification: null, id: "t1", transactionType: "debit" })];
  const result = generateFunctionalExpenseAllocation(transactions);
  assert(result.missingDataWarnings.length === 1, "warns about unclassified transaction");
});

test("generatePayrollSummary detects payroll by description among approved debits", () => {
  const transactions = [
    makeTransaction({ amount: 2000, description: "ADP PAYROLL", id: "t1", transactionType: "debit" }),
    makeTransaction({ amount: 50, description: "Office Supplies", id: "t2", transactionType: "debit" }),
  ];
  const result = generatePayrollSummary(transactions);
  assertEqual(result.total, 2000, "only payroll-detected transaction counted");
});

test("generateYearEndCashReconciliation always warns that balances aren't extracted automatically", () => {
  const result = generateYearEndCashReconciliation([makeTransaction({ amount: 100, id: "t1" })]);
  assert(result.missingDataWarnings[0].includes("not extracted automatically"), "explicit limitation disclosed");
});

test("generateRestrictedFundWorksheet only includes transactions tagged with a fund/restriction", () => {
  const transactions = [
    makeTransaction({ amount: 100, fundOrRestriction: "Building Fund", id: "t1" }),
    makeTransaction({ amount: 200, fundOrRestriction: null, id: "t2" }),
  ];
  const result = generateRestrictedFundWorksheet(transactions);
  assertEqual(result.total, 100, "unrestricted transaction excluded");
});

test("generateUncategorizedTransactionsReport counts transactions with no approved category regardless of status", () => {
  const transactions = [
    makeTransaction({ approvedCategory: null, id: "t1" }),
    makeTransaction({ approvedCategory: "Grants", id: "t2" }),
  ];
  const result = generateUncategorizedTransactionsReport(transactions);
  assertEqual(result.rows[0].total, 1, "one uncategorized transaction counted");
});

test("generateBalanceSheetSkeleton always discloses it is cash-only, not a real balance sheet", () => {
  const result = generateBalanceSheetSkeleton([makeTransaction({ amount: 100, id: "t1" })]);
  assert(result.missingDataWarnings[0].includes("not a complete balance sheet"), "limitation disclosed");
});

// --- Arizona due-date / reminder sanity (compliance module, reused here) ---

test("Arizona Annual Report due date is fixed to August 3rd of the given year", () => {
  assertEqual(arizonaAnnualReportDueDate(2026), "2026-08-03", "first year matches formation letter");
  assertEqual(arizonaAnnualReportDueDate(2027), "2027-08-03", "recurrence holds in later years");
  assert(isValidArizonaAnnualReportYear(2026), "2026 is a valid filing year");
  assert(!isValidArizonaAnnualReportYear(2025), "a year before the first filing is invalid");
});

test("reminder milestones are exactly 120/90/60/30/14/7/0 days before due", () => {
  const milestones = reminderMilestonesForDueDate("2026-08-03");
  assertEqual(milestones.map((milestone) => milestone.daysBefore), [120, 90, 60, 30, 14, 7, 0], "offsets in order");
  assertEqual(milestones[milestones.length - 1].date, "2026-08-03", "final milestone is the due date itself");
});

// --- Static assertions: gating, governance disclosure, migration status ----

const dbLib = read("src/lib/finance-ops/db.ts");
const actions = read("app/ncc/finance/990/actions.ts");
const migration = read("supabase/migrations/20260714090000_finance_operations_foundation.sql");
const agentPanel = read("app/ncc/finance/990/_components/FinanceAgentPanel.tsx");
const workspacePage = read("app/ncc/finance/990/[taxYear]/page.tsx");

test("finance-ops write gate defaults to disabled unless explicitly enabled", () => {
  assert(dbLib.includes('process.env.FINANCE_OPERATIONS_MIGRATION_APPLIED === "true"'), "env gate present");
});

test("every 990 action checks the write gate before touching Supabase", () => {
  assert(actions.includes("requireFinanceOperationsAccess"), "shared gate helper used");
  assert(actions.includes("isFinanceOperationsWriteEnabled()"), "gate function referenced");
});

test("migration explicitly documents it is not applied anywhere", () => {
  assert(migration.includes("NOT APPLIED to any database"), "explicit non-application notice present");
});

test("migration does not build a chart of accounts or double-entry posting", () => {
  assert(!migration.toLowerCase().includes("chart_of_accounts") && !migration.toLowerCase().includes("debit_credit_entry"), "no ledger-engine tables introduced");
});

test("finance agent panel discloses the exact bounded capability list", () => {
  for (const phrase of [
    "Submit a tax or state filing",
    "Mark a filing filed",
    "Create financial adjustments",
    "Change donor restrictions",
    "Approve transaction categories",
    "Modify officers, directors, or statutory-agent information",
    "Send documents externally without human approval",
  ]) {
    assert(agentPanel.includes(phrase), `panel discloses: ${phrase}`);
  }
});

test("990 workspace page explicitly warns draft workpapers are never a filed return", () => {
  assert(workspacePage.includes("Not A Filed Return"), "draft-vs-filed warning present");
});

test("990 workspace exposes all 12 requested sections", () => {
  for (const key of [
    "profile", "documents", "transactions", "statements", "functional-expenses",
    "payroll", "governance", "program", "questions", "review", "package", "confirmation",
  ]) {
    assert(workspacePage.includes(`key: "${key}"`), `section present: ${key}`);
  }
});

console.log(`\nfinance-ops-regression: ${passed} checks passed.`);
