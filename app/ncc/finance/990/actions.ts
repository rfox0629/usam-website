"use server";

import { revalidatePath } from "next/cache";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import {
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

async function requireFinanceOperationsAccess() {
  const authorization = await getAdminAuthorization();

  if (!canEditAdminContent(authorization)) {
    throw new Error("Admin access is required.");
  }

  if (!isFinanceOperationsWriteEnabled()) {
    throw new Error(
      "Finance Operations writes are unavailable in this preview: the finance_operations migration has not been applied to any database yet. See supabase/migrations/20260714090000_finance_operations_foundation.sql.",
    );
  }

  return authorization;
}

export async function createFinancialAccountAction(input: {
  accountType: "checking" | "savings" | "credit_card" | "other";
  institution?: string;
  lastFour?: string;
  name: string;
}) {
  await requireFinanceOperationsAccess();

  const organizationId = await resolveUsamOrganizationId();

  if (!organizationId) {
    throw new Error("Could not resolve the organization for this account.");
  }

  return createFinancialAccount({ ...input, organizationId });
}

export async function importTransactionsAction(financialAccountId: string, taxYear: string, formData: FormData) {
  const authorization = await requireFinanceOperationsAccess();
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
    importedBy: authorization.status === "authorized" ? authorization.email : "unknown",
    organizationId,
  });

  revalidatePath(`/ncc/finance/990/${taxYear}`);

  return result;
}

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
  const authorization = await requireFinanceOperationsAccess();

  await updateTransactionReview(transactionId, {
    ...updates,
    reviewedBy: authorization.status === "authorized" ? authorization.email : "unknown",
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
  await requireFinanceOperationsAccess();

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

export async function generateWorkpaperAction(
  filingId: string,
  taxYear: string,
  workpaperType: WorkpaperType,
  periodStart: string,
  periodEnd: string,
) {
  const authorization = await requireFinanceOperationsAccess();
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
    preparedBy: authorization.status === "authorized" ? authorization.email : "unknown",
    sourcePeriodEnd: periodEnd,
    sourcePeriodStart: periodStart,
    workpaperType,
  });

  revalidatePath(`/ncc/finance/990/${taxYear}`);
}

export async function saveWorksheetAction(
  filingId: string,
  taxYear: string,
  worksheetType: WorksheetType,
  data: Record<string, unknown>,
) {
  const authorization = await requireFinanceOperationsAccess();

  await saveWorksheet({
    data,
    filingId,
    updatedBy: authorization.status === "authorized" ? authorization.email : "unknown",
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
  await requireFinanceOperationsAccess();

  const transactions = await listTransactions({ periodEnd, periodStart });
  const uncategorizedCount = transactions.filter((transaction) => !transaction.approvedCategory).length;

  return draftMissingInformationQuestions({
    missingDocuments,
    openQuestions,
    uncategorizedTransactionCount: uncategorizedCount,
  });
}

export async function suggestDocumentCategoryAction(fileName: string) {
  return classifyDocumentByFilename(fileName);
}

export async function identifyMissingDocumentsAction(uploadedCategories: readonly string[]) {
  return identifyMissingMonthlyDocuments(uploadedCategories);
}

/**
 * Compiles a manifest of everything currently available for this filing
 * (workpapers, worksheets, documents, open questions) and records that a
 * package was generated. The actual bundle is rendered/downloaded
 * client-side from data already on the page -- this action does not send
 * anything anywhere.
 */
export async function generateAccountantPackageAction(filingId: string, taxYear: string, manifest: Record<string, unknown>) {
  const authorization = await requireFinanceOperationsAccess();

  const packageId = await recordAccountantPackage({
    filingId,
    generatedBy: authorization.status === "authorized" ? authorization.email : "unknown",
    manifest,
  });

  revalidatePath(`/ncc/finance/990/${taxYear}`);

  return packageId;
}
