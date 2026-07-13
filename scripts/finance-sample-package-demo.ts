// Runs the synthetic sample package (docs/finance-sample-package/) through
// the REAL production parsing/suggestion/workpaper-generation code -- not a
// reimplementation -- entirely offline. No database is touched, because
// none exists yet to touch (see docs/finance-staging-setup.md). This is
// real evidence the logic layer of the pipeline works end-to-end; it is NOT
// evidence that storage, RLS, or role enforcement work, which require a
// real database and are covered by docs/finance-migration-test-plan.md
// instead.

import { readFileSync, writeFileSync } from "node:fs";
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
  parseTransactionCsv,
  suggestTransactionCategory,
} from "../src/lib/finance-ops/logic";
import type { FinanceTransaction } from "../src/lib/finance-ops/types";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function write(path: string, content: string) {
  writeFileSync(new URL(`../${path}`, import.meta.url), content);
}

console.log("Finance sample package demo -- offline, no database involved\n");

// --- 1. Document classification (filename-only, no content read) ----------

const sampleFileNames = [
  "Sample_Payroll_Summary.md",
  "Sample_Board_Roster.md",
  "Sample_Housing_Allowance_Approval.md",
  "Sample_Arizona_Formation_Metadata.md",
  "Sample_Donation_Summary.csv",
  "random-notes.txt",
];

console.log("--- Document classification (filename heuristic) ---");
const classifications: Record<string, unknown> = {};
for (const fileName of sampleFileNames) {
  const suggestion = classifyDocumentByFilename(fileName);
  classifications[fileName] = suggestion;
  console.log(`  ${fileName} -> ${suggestion ? `${suggestion.category} (confidence ${suggestion.confidence})` : "no match"}`);
}

const missingDocs = identifyMissingMonthlyDocuments(["board_record"]);
console.log(`\nMissing monthly documents (only "board_record" uploaded): ${missingDocs.join(", ")}\n`);

// --- 2. Parse the sample transaction CSV -----------------------------------

const csvText = read("docs/finance-sample-package/sample-transactions-2025.csv");
const parsed = parseTransactionCsv(csvText);

console.log("--- CSV parse ---");
console.log(`  ${parsed.rows.length} rows parsed, ${parsed.errors.length} errors\n`);

if (parsed.errors.length > 0) {
  throw new Error(`Unexpected parse errors in the sample CSV: ${JSON.stringify(parsed.errors)}`);
}

// --- 3. Simulate human review (deterministic, no AI) ------------------------

const financialAccountId = "demo-account";
const organizationId = "demo-org";

function classifyExpense(description: string): { functionalClassification: FinanceTransaction["functionalClassification"]; fundOrRestriction: string | null } {
  if (description.includes("Gusto Payroll") && !description.includes("Taxes")) {
    return { functionalClassification: "program", fundOrRestriction: null };
  }

  return { functionalClassification: "management_and_general", fundOrRestriction: null };
}

const transactions: FinanceTransaction[] = parsed.rows.map((row, index) => {
  const suggestion = suggestTransactionCategory(row.description);
  const isUnusual = row.description.includes("Unidentified Wire Transfer");
  const isRestrictedGift = row.description.includes("Donor D");
  const expenseTags = row.transactionType === "debit" ? classifyExpense(row.description) : { functionalClassification: null, fundOrRestriction: null };

  return {
    amount: row.amount,
    approvedCategory: isUnusual ? null : suggestion?.category ?? (row.transactionType === "credit" ? "Contributions" : "General Expense"),
    createdAt: new Date().toISOString(),
    description: row.description,
    externalTransactionId: row.externalTransactionId,
    financialAccountId,
    fundOrRestriction: isRestrictedGift ? "Building Fund" : expenseTags.fundOrRestriction,
    functionalClassification: expenseTags.functionalClassification,
    id: `demo-txn-${index}`,
    importBatchId: "demo-import",
    notes: null,
    organizationId,
    postedDate: row.postedDate,
    proposedCategory: suggestion?.category ?? null,
    reviewedAt: new Date().toISOString(),
    reviewedBy: "demo@sample.org",
    reviewStatus: isUnusual ? "needs_review" : "approved",
    sourceDocumentId: null,
    transactionDate: row.transactionDate,
    transactionType: row.transactionType,
  };
});

// --- 4. Dedupe key sanity check ---------------------------------------------

const dedupeKeys = new Set(transactions.map((transaction) => dedupeKeyFor(transaction)));
console.log("--- Dedupe ---");
console.log(`  ${transactions.length} transactions, ${dedupeKeys.size} unique dedupe keys${dedupeKeys.size === transactions.length ? " (no duplicates detected, as expected)" : " -- UNEXPECTED COLLISION"}\n`);

// --- 5. Payroll detection + category suggestion tally -----------------------

const payrollCount = transactions.filter((transaction) => detectPayrollTransaction(transaction.description)).length;
const categorizedCount = transactions.filter((transaction) => transaction.proposedCategory).length;
console.log("--- Rule-based suggestions ---");
console.log(`  Detected as payroll-related: ${payrollCount} of ${transactions.length}`);
console.log(`  Received a category suggestion: ${categorizedCount} of ${transactions.length}\n`);

// --- 6. Unusual-transaction detection ---------------------------------------

const unusualIds = flagUnusualTransactions(transactions);
const unusualDescriptions = transactions.filter((transaction) => unusualIds.includes(transaction.id)).map((transaction) => transaction.description);
console.log("--- Unusual-transaction detection ---");
console.log(`  Flagged: ${unusualDescriptions.join(", ") || "none"}\n`);

// --- 7. Draft missing-information questions ---------------------------------

const uncategorizedCount = transactions.filter((transaction) => !transaction.approvedCategory).length;
const questions = draftMissingInformationQuestions({
  missingDocuments: missingDocs,
  openQuestions: ["Which form applies: 990-N, 990-EZ, or 990?"],
  uncategorizedTransactionCount: uncategorizedCount,
});
console.log("--- Draft missing-information questions ---");
questions.forEach((question) => console.log(`  - ${question}`));
console.log("");

// --- 8. Generate all transaction-derived workpapers -------------------------

const workpapers = {
  balance_sheet: generateBalanceSheetSkeleton(transactions),
  contribution_summary: generateContributionSummary(transactions),
  expense_detail: generateExpenseDetail(transactions),
  functional_expense_allocation: generateFunctionalExpenseAllocation(transactions),
  payroll_summary: generatePayrollSummary(transactions),
  profit_and_loss: generateProfitAndLoss(transactions),
  restricted_fund_worksheet: generateRestrictedFundWorksheet(transactions),
  revenue_summary: generateRevenueSummary(transactions),
  uncategorized_transactions_report: generateUncategorizedTransactionsReport(transactions),
  year_end_cash_reconciliation: generateYearEndCashReconciliation(transactions),
};

console.log("--- Draft workpapers (approved transactions only) ---");
for (const [type, result] of Object.entries(workpapers)) {
  console.log(`  ${type}: total = ${result.total.toFixed(2)}, warnings = ${result.missingDataWarnings.length}`);
}

// --- 9. Write full output for review ----------------------------------------

const output = {
  dedupeKeyCollisions: transactions.length - dedupeKeys.size,
  documentClassifications: classifications,
  generatedAt: new Date().toISOString(),
  missingDocuments: missingDocs,
  missingInformationQuestions: questions,
  note: "SYNTHETIC DEMO OUTPUT -- generated offline from docs/finance-sample-package/, no database involved.",
  payrollDetectedCount: payrollCount,
  transactionCount: transactions.length,
  unusualTransactions: unusualDescriptions,
  workpapers,
};

write("docs/finance-sample-package/demo-output.json", `${JSON.stringify(output, null, 2)}\n`);

console.log("\nFull output written to docs/finance-sample-package/demo-output.json");
