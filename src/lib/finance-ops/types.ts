// Pure types/constants for the Finance Operations layer (990 preparation
// workspace). No "server-only" import, no Supabase calls -- see logic.ts for
// pure computation and db.ts (server-only) for the real database reads.

export const transactionTypes = ["debit", "credit"] as const;
export type TransactionType = (typeof transactionTypes)[number];

export const reviewStatuses = [
  "imported",
  "needs_review",
  "categorized",
  "needs_information",
  "approved",
  "excluded",
] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  approved: "Approved",
  categorized: "Categorized",
  excluded: "Excluded",
  imported: "Imported",
  needs_information: "Needs Information",
  needs_review: "Needs Review",
};

export const functionalClassifications = ["program", "management_and_general", "fundraising"] as const;
export type FunctionalClassification = (typeof functionalClassifications)[number];

export const functionalClassificationLabels: Record<FunctionalClassification, string> = {
  fundraising: "Fundraising",
  management_and_general: "Management & General",
  program: "Program",
};

export const workpaperTypes = [
  "profit_and_loss",
  "balance_sheet",
  "revenue_summary",
  "contribution_summary",
  "expense_detail",
  "functional_expense_allocation",
  "payroll_summary",
  "officer_compensation_summary",
  "year_end_cash_reconciliation",
  "restricted_fund_worksheet",
  "uncategorized_transactions_report",
] as const;
export type WorkpaperType = (typeof workpaperTypes)[number];

export const workpaperTypeLabels: Record<WorkpaperType, string> = {
  balance_sheet: "Balance Sheet (Draft)",
  contribution_summary: "Contribution Summary",
  expense_detail: "Expense Detail",
  functional_expense_allocation: "Functional-Expense Allocation",
  officer_compensation_summary: "Officer-Compensation Summary",
  payroll_summary: "Payroll Summary",
  profit_and_loss: "Profit & Loss (Draft)",
  restricted_fund_worksheet: "Restricted-Fund Worksheet",
  revenue_summary: "Revenue Summary",
  uncategorized_transactions_report: "Uncategorized-Transactions Report",
  year_end_cash_reconciliation: "Year-End Cash Reconciliation",
};

export const worksheetTypes = ["governance", "program_accomplishments", "officer_compensation"] as const;
export type WorksheetType = (typeof worksheetTypes)[number];

export const worksheetTypeLabels: Record<WorksheetType, string> = {
  governance: "Governance",
  officer_compensation: "Officer Compensation",
  program_accomplishments: "Program Accomplishments",
};

export const documentCategoryChecklist = [
  "bank_statement",
  "payroll_report",
  "donation_report",
  "board_record",
] as const;

export type FinancialAccount = {
  accountType: "checking" | "savings" | "credit_card" | "other";
  id: string;
  institution: string | null;
  isActive: boolean;
  lastFour: string | null;
  name: string;
  organizationId: string;
};

export type FinanceTransaction = {
  amount: number;
  approvedCategory: string | null;
  createdAt: string;
  description: string;
  externalTransactionId: string | null;
  financialAccountId: string;
  fundOrRestriction: string | null;
  functionalClassification: FunctionalClassification | null;
  id: string;
  importBatchId: string | null;
  notes: string | null;
  organizationId: string;
  postedDate: string | null;
  proposedCategory: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewStatus: ReviewStatus;
  sourceDocumentId: string | null;
  transactionDate: string;
  transactionType: TransactionType;
};

export type AiSuggestionType =
  | "document_classification"
  | "reporting_period"
  | "missing_document"
  | "transaction_category"
  | "payroll_detection"
  | "unusual_transaction"
  | "missing_information_question"
  | "workpaper_summary";

export type AiSuggestion = {
  confidence: number | null;
  createdAt: string;
  filingId: string | null;
  id: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  status: "pending" | "accepted" | "rejected";
  subjectId: string;
  subjectType: string;
  suggestedValue: Record<string, unknown>;
  suggestionType: AiSuggestionType;
};

export type DraftWorkpaper = {
  data: Record<string, unknown>;
  filingId: string | null;
  id: string;
  missingDataWarnings: string[];
  preparedAt: string;
  preparedBy: string;
  reviewedBy: string | null;
  reviewStatus: "draft" | "reviewed" | "approved";
  sourcePeriodEnd: string;
  sourcePeriodStart: string;
  workpaperType: WorkpaperType;
};

export type AccountantPackageSummary = {
  generatedAt: string;
  id: string;
  status: "draft" | "ready";
};
