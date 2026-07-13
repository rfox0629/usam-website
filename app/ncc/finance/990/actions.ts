"use server";

import { revalidatePath } from "next/cache";
import { requireAnyFinanceAccess, requireFinanceCapability } from "@/src/lib/finance-auth";
import {
  approveWorkpaper,
  classifyDocumentByFilename,
  createFinancialAccount,
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
  importTransactionsFromCsv,
  isFinanceOperationsWriteEnabled,
  listTransactions,
  markAccountantPackageReady,
  recordAccountantPackage,
  recordAiSuggestion,
  resolveUsamOrganizationId,
  saveWorksheet,
  storeDraftWorkpaper,
  suggestTransactionCategory,
  updateTransactionReview,
  type FunctionalClassification,
  type ReviewStatus,
  type WorkpaperType,
  type WorksheetType,
} from "@/src/lib/finance-ops/db";
import type { FinanceCapability } from "@/src/lib/finance-ops/roles";

async function requireFinanceOperationsAccess(capability: FinanceCapability) {
  const access = await requireFinanceCapability(capability);

  if (!isFinanceOperationsWriteEnabled()) {
    throw new Error(
      "Finance Operations writes are unavailable in this preview: the finance_operations migration has not been applied to any database yet. See supabase/migrations/20260714090000_finance_operations_foundation.sql.",
    );
  }

  return access;
}

export async function createFinancialAccountAction(input: {
  accountType: "checking" | "savings" | "credit_card" | "other";
  institution?: string;
  lastFour?: string;
  name: string;
}) {
  await requireFinanceOperationsAccess("import_transactions");

  const organizationId = await resolveUsamOrganizationId();

  if (!organizationId) {
    throw new Error("Could not resolve the organization for this account.");
  }

  return createFinancialAccount({ ...input, organizationId });
}

export async function importTransactionsAction(financialAccountId: string, taxYear: string, formData: FormData) {
  const access = await requireFinanceOperationsAccess("import_transactions");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size <= 0) {
    throw new Error("Choose a CSV file to import.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Use a CSV file smaller than 5 MB.");
  }

  const csvText = await file.text();
  const organizationId = await resolveUsamOrganizationId();

  if (!organizationId) {
    throw new Error("Could not resolve the organization for these transactions.");
  }

  const result = await importTransactionsFromCsv({
    csvText,
    fileName: file.name,
    financialAccountId,
    importedBy: access.email,
    organizationId,
  });

  revalidatePath(`/ncc/finance/990/${taxYear}`);

  return result;
}

/**
 * Approving a transaction (review_status = "approved") requires the
 * approve_transactions capability -- everything else (needs_review,
 * categorized, needs_information, excluded) only requires
 * edit_transaction_categories, which bookkeeper also has. This is what
 * actually enforces "bookkeeper can suggest/edit categories but cannot
 * approve" at the data layer, not just in the UI.
 */
export async function updateTransactionReviewAction(
  taxYear: string,
  transactionId: string,
  updates: {
    approvedCategory?: string;
    fundOrRestriction?: string;
    functionalClassification?: FunctionalClassification;
    notes?: string;
    reviewStatus: ReviewStatus;
  },
) {
  const requiredCapability: FinanceCapability = updates.reviewStatus === "approved" ? "approve_transactions" : "edit_transaction_categories";
  const access = await requireFinanceOperationsAccess(requiredCapability);

  await updateTransactionReview(transactionId, {
    ...updates,
    reviewedBy: access.email,
  });

  revalidatePath(`/ncc/finance/990/${taxYear}`);
}

/**
 * Runs the bounded, rule-based suggestion pass over a batch of not-yet
 * -reviewed transactions: proposed category (keyword match), likely-payroll
 * flag, and unusual-amount flag. Writes only to proposed_category and
 * finance_ai_suggestions -- never to approved_category or review_status, so
 * nothing here can make a transaction look human-reviewed.
 */
export async function runTransactionSuggestionsAction(taxYear: string, periodStart: string, periodEnd: string) {
  await requireFinanceOperationsAccess("import_transactions");

  const transactions = await listTransactions({ periodEnd, periodStart });
  const unreviewed = transactions.filter((transaction) => transaction.reviewStatus === "imported");

  for (const transaction of unreviewed) {
    const suggestion = suggestTransactionCategory(transaction.description);

    if (suggestion) {
      await recordAiSuggestion({
        confidence: suggestion.confidence,
        subjectId: transaction.id,
        subjectType: "finance_transaction",
        suggestedValue: { category: suggestion.category },
        suggestionType: "transaction_category",
      });
    }

    if (detectPayrollTransaction(transaction.description)) {
      await recordAiSuggestion({
        confidence: 0.65,
        subjectId: transaction.id,
        subjectType: "finance_transaction",
        suggestedValue: { likelyPayroll: true },
        suggestionType: "payroll_detection",
      });
    }
  }

  const unusualIds = flagUnusualTransactions(transactions);

  for (const transactionId of unusualIds) {
    await recordAiSuggestion({
      subjectId: transactionId,
      subjectType: "finance_transaction",
      suggestedValue: { reason: "Amount is a statistical outlier relative to this period's other transactions." },
      suggestionType: "unusual_transaction",
    });
  }

  revalidatePath(`/ncc/finance/990/${taxYear}`);

  return { flaggedUnusual: unusualIds.length, suggestionsConsidered: unreviewed.length };
}

const workpaperGenerators: Record<WorkpaperType, ((transactions: Awaited<ReturnType<typeof listTransactions>>) => ReturnType<typeof generateProfitAndLoss>) | null> = {
  balance_sheet: generateBalanceSheetSkeleton,
  contribution_summary: generateContributionSummary,
  expense_detail: generateExpenseDetail,
  functional_expense_allocation: generateFunctionalExpenseAllocation,
  officer_compensation_summary: null,
  payroll_summary: generatePayrollSummary,
  profit_and_loss: generateProfitAndLoss,
  restricted_fund_worksheet: generateRestrictedFundWorksheet,
  revenue_summary: generateRevenueSummary,
  uncategorized_transactions_report: generateUncategorizedTransactionsReport,
  year_end_cash_reconciliation: generateYearEndCashReconciliation,
};

const payrollWorkpaperTypes: readonly WorkpaperType[] = ["payroll_summary"];

export async function generateWorkpaperAction(
  filingId: string,
  taxYear: string,
  workpaperType: WorkpaperType,
  periodStart: string,
  periodEnd: string,
) {
  // Payroll data is payroll-and-donor-sensitive per the role matrix -- bookkeeper
  // may prepare every other workpaper type but not this one.
  const capability: FinanceCapability = payrollWorkpaperTypes.includes(workpaperType) ? "view_payroll_and_donor_detail" : "prepare_workpapers";
  const access = await requireFinanceOperationsAccess(capability);
  const generator = workpaperGenerators[workpaperType];

  if (!generator) {
    throw new Error("This workpaper type requires manual worksheet data and isn't generated from transactions.");
  }

  const transactions = await listTransactions({ periodEnd, periodStart });
  const result = generator(transactions);

  await storeDraftWorkpaper({
    data: { rows: result.rows, total: result.total },
    filingId,
    missingDataWarnings: result.missingDataWarnings,
    preparedBy: access.email,
    sourcePeriodEnd: periodEnd,
    sourcePeriodStart: periodStart,
    workpaperType,
  });

  revalidatePath(`/ncc/finance/990/${taxYear}`);
}

export async function approveWorkpaperAction(workpaperId: string, taxYear: string) {
  const access = await requireFinanceOperationsAccess("approve_workpapers");
  await approveWorkpaper(workpaperId, access.email);
  revalidatePath(`/ncc/finance/990/${taxYear}`);
}

export async function saveWorksheetAction(
  filingId: string,
  taxYear: string,
  worksheetType: WorksheetType,
  data: Record<string, unknown>,
) {
  // officer_compensation is payroll-sensitive per the role matrix.
  const capability: FinanceCapability = worksheetType === "officer_compensation" ? "view_payroll_and_donor_detail" : "edit_worksheets";
  const access = await requireFinanceOperationsAccess(capability);

  await saveWorksheet({
    data,
    filingId,
    updatedBy: access.email,
    worksheetType,
  });

  revalidatePath(`/ncc/finance/990/${taxYear}`);
}

export async function draftMissingInformationQuestionsAction(
  taxYear: string,
  missingDocuments: readonly string[],
  openQuestions: readonly string[],
  periodStart: string,
  periodEnd: string,
) {
  await requireAnyFinanceAccess();

  const transactions = await listTransactions({ periodEnd, periodStart });
  const uncategorizedCount = transactions.filter((transaction) => !transaction.approvedCategory).length;

  return draftMissingInformationQuestions({
    missingDocuments,
    openQuestions,
    uncategorizedTransactionCount: uncategorizedCount,
  });
}

export async function suggestDocumentCategoryAction(fileName: string) {
  await requireAnyFinanceAccess();
  return classifyDocumentByFilename(fileName);
}

export async function identifyMissingDocumentsAction(uploadedCategories: readonly string[]) {
  await requireAnyFinanceAccess();
  return identifyMissingMonthlyDocuments(uploadedCategories);
}

/**
 * Compiles a manifest of everything currently available for this filing
 * (workpapers, worksheets, documents, open questions) and records that a
 * package was generated, as a draft. The actual bundle is rendered/downloaded
 * client-side from data already on the page -- this action does not send
 * anything anywhere. Includes payroll/donor-sensitive worksheets, so
 * generating one requires view_payroll_and_donor_detail (accountant/owner,
 * not bookkeeper).
 */
export async function generateAccountantPackageAction(filingId: string, taxYear: string, manifest: Record<string, unknown>) {
  const access = await requireFinanceOperationsAccess("view_payroll_and_donor_detail");

  const packageId = await recordAccountantPackage({
    filingId,
    generatedBy: access.email,
    manifest,
  });

  revalidatePath(`/ncc/finance/990/${taxYear}`);

  return packageId;
}

/**
 * The role matrix calls this out as finance_owner-only, distinct from
 * generating the package draft itself (which accountant can also do).
 */
export async function markAccountantPackageReadyAction(packageId: string, taxYear: string) {
  await requireFinanceOperationsAccess("mark_package_ready");
  await markAccountantPackageReady(packageId);
  revalidatePath(`/ncc/finance/990/${taxYear}`);
}
