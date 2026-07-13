import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { dedupeKeyFor, parseTransactionCsv } from "./logic";
import type {
  AccountantPackageSummary,
  AiSuggestion,
  AiSuggestionType,
  DraftWorkpaper,
  FinancialAccount,
  FinanceTransaction,
  ReviewStatus,
  WorkpaperType,
  WorksheetType,
} from "./types";

export * from "./types";
export * from "./logic";

/**
 * The finance_operations migration is created on this branch but has not
 * been applied to any database. Every write action checks this before
 * touching Supabase, matching the finance_documents / compliance_filings
 * gate pattern.
 */
export function isFinanceOperationsWriteEnabled() {
  return process.env.FINANCE_OPERATIONS_MIGRATION_APPLIED === "true";
}

let cachedUsamOrganizationId: string | null | undefined;

/**
 * Resolves the single USA Missionaries organization row, matching the exact
 * lookup already established by the dos_groups / usam_missionary_applications
 * migrations (select id from organizations where slug = 'usa-missionaries').
 * Cached per server instance since this rarely changes.
 */
export async function resolveUsamOrganizationId(): Promise<string | null> {
  if (cachedUsamOrganizationId !== undefined) {
    return cachedUsamOrganizationId;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", "usa-missionaries")
    .maybeSingle();

  if (error || !data) {
    cachedUsamOrganizationId = null;
    return null;
  }

  cachedUsamOrganizationId = (data as { id: string }).id;
  return cachedUsamOrganizationId;
}

function isMissingTable(error: { message?: string } | null | undefined, table: string) {
  return Boolean(error?.message?.includes(table));
}

// --- Financial accounts ------------------------------------------------

type FinancialAccountRow = {
  account_type: FinancialAccount["accountType"];
  id: string;
  institution: string | null;
  is_active: boolean;
  last_four: string | null;
  name: string;
  organization_id: string;
};

function mapAccountRow(row: FinancialAccountRow): FinancialAccount {
  return {
    accountType: row.account_type,
    id: row.id,
    institution: row.institution,
    isActive: row.is_active,
    lastFour: row.last_four,
    name: row.name,
    organizationId: row.organization_id,
  };
}

export async function createFinancialAccount(input: {
  accountType: FinancialAccount["accountType"];
  institution?: string;
  lastFour?: string;
  name: string;
  organizationId: string;
}): Promise<FinancialAccount> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("finance_financial_accounts")
    .insert({
      account_type: input.accountType,
      institution: input.institution || null,
      last_four: input.lastFour || null,
      name: input.name,
      organization_id: input.organizationId,
    })
    .select("id, organization_id, name, institution, account_type, last_four, is_active")
    .single();

  if (error || !data) {
    throw new Error(`Could not create financial account: ${error?.message ?? "unknown error"}`);
  }

  return mapAccountRow(data as FinancialAccountRow);
}

export async function listFinancialAccounts(): Promise<FinancialAccount[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("finance_financial_accounts")
    .select("id, organization_id, name, institution, account_type, last_four, is_active")
    .order("name", { ascending: true });

  if (error || !data) {
    if (error && !isMissingTable(error, "finance_financial_accounts")) {
      console.error("Failed to list financial accounts:", error.message);
    }

    return [];
  }

  return (data as FinancialAccountRow[]).map(mapAccountRow);
}

// --- Transactions --------------------------------------------------------

type FinanceTransactionRow = {
  amount: number;
  approved_category: string | null;
  created_at: string;
  description: string;
  external_transaction_id: string | null;
  financial_account_id: string;
  fund_or_restriction: string | null;
  functional_classification: FinanceTransaction["functionalClassification"];
  id: string;
  import_batch_id: string | null;
  notes: string | null;
  organization_id: string;
  posted_date: string | null;
  proposed_category: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_status: ReviewStatus;
  source_document_id: string | null;
  transaction_date: string;
  transaction_type: FinanceTransaction["transactionType"];
};

function mapTransactionRow(row: FinanceTransactionRow): FinanceTransaction {
  return {
    amount: row.amount,
    approvedCategory: row.approved_category,
    createdAt: row.created_at,
    description: row.description,
    externalTransactionId: row.external_transaction_id,
    financialAccountId: row.financial_account_id,
    fundOrRestriction: row.fund_or_restriction,
    functionalClassification: row.functional_classification,
    id: row.id,
    importBatchId: row.import_batch_id,
    notes: row.notes,
    organizationId: row.organization_id,
    postedDate: row.posted_date,
    proposedCategory: row.proposed_category,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    reviewStatus: row.review_status,
    sourceDocumentId: row.source_document_id,
    transactionDate: row.transaction_date,
    transactionType: row.transaction_type,
  };
}

const transactionSelectColumns = "id, organization_id, financial_account_id, transaction_date, posted_date, description, amount, transaction_type, source_document_id, import_batch_id, external_transaction_id, proposed_category, approved_category, functional_classification, fund_or_restriction, review_status, reviewed_by, reviewed_at, notes, created_at";

export async function listTransactions(filters?: {
  periodEnd?: string;
  periodStart?: string;
}): Promise<FinanceTransaction[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("finance_transactions").select(transactionSelectColumns).order("transaction_date", { ascending: true });

  if (filters?.periodStart) {
    query = query.gte("transaction_date", filters.periodStart);
  }

  if (filters?.periodEnd) {
    query = query.lte("transaction_date", filters.periodEnd);
  }

  const { data, error } = await query;

  if (error || !data) {
    if (error && !isMissingTable(error, "finance_transactions")) {
      console.error("Failed to list transactions:", error.message);
    }

    return [];
  }

  return (data as FinanceTransactionRow[]).map(mapTransactionRow);
}

export type ImportTransactionsResult = {
  duplicateCount: number;
  errorCount: number;
  errors: string[];
  importedCount: number;
  rowCount: number;
};

export async function importTransactionsFromCsv(input: {
  csvText: string;
  fileName: string;
  financialAccountId: string;
  importedBy: string;
  organizationId: string;
}): Promise<ImportTransactionsResult> {
  const parsed = parseTransactionCsv(input.csvText);
  const supabase = createSupabaseAdminClient();

  const { data: importRow, error: importError } = await supabase
    .from("finance_transaction_imports")
    .insert({
      file_name: input.fileName,
      financial_account_id: input.financialAccountId,
      imported_by: input.importedBy,
      row_count: parsed.rows.length,
    })
    .select("id")
    .single();

  if (importError || !importRow) {
    throw new Error(`Could not record import batch: ${importError?.message ?? "unknown error"}`);
  }

  const importBatchId = (importRow as { id: string }).id;
  let importedCount = 0;
  let duplicateCount = 0;
  const errors = [...parsed.errors.map((error) => `Row ${error.rowNumber}: ${error.message}`)];

  for (const row of parsed.rows) {
    const dedupeKey = dedupeKeyFor(row);
    const { error: insertError } = await supabase.from("finance_transactions").insert({
      amount: row.amount,
      dedupe_key: dedupeKey,
      description: row.description,
      external_transaction_id: row.externalTransactionId,
      financial_account_id: input.financialAccountId,
      import_batch_id: importBatchId,
      organization_id: input.organizationId,
      posted_date: row.postedDate,
      review_status: "imported",
      transaction_date: row.transactionDate,
      transaction_type: row.transactionType,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        duplicateCount += 1;
      } else {
        errors.push(`Row ${row.rowNumber}: ${insertError.message}`);
      }
      continue;
    }

    importedCount += 1;
  }

  await supabase
    .from("finance_transaction_imports")
    .update({
      duplicate_count: duplicateCount,
      error_count: errors.length,
      imported_count: importedCount,
    })
    .eq("id", importBatchId);

  return {
    duplicateCount,
    errorCount: errors.length,
    errors,
    importedCount,
    rowCount: parsed.rows.length,
  };
}

export async function updateTransactionReview(
  transactionId: string,
  updates: {
    approvedCategory?: string | null;
    fundOrRestriction?: string | null;
    functionalClassification?: FinanceTransaction["functionalClassification"];
    notes?: string | null;
    reviewedBy: string;
    reviewStatus: ReviewStatus;
  },
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("finance_transactions")
    .update({
      approved_category: updates.approvedCategory,
      fund_or_restriction: updates.fundOrRestriction,
      functional_classification: updates.functionalClassification,
      notes: updates.notes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: updates.reviewedBy,
      review_status: updates.reviewStatus,
    })
    .eq("id", transactionId);

  if (error) {
    throw new Error(`Could not update transaction: ${error.message}`);
  }
}

export async function recordProposedCategory(transactionId: string, proposedCategory: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.from("finance_transactions").update({ proposed_category: proposedCategory }).eq("id", transactionId);
}

// --- AI suggestions --------------------------------------------------------

type AiSuggestionRow = {
  confidence: number | null;
  created_at: string;
  filing_id: string | null;
  id: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  status: AiSuggestion["status"];
  subject_id: string;
  subject_type: string;
  suggested_value: Record<string, unknown>;
  suggestion_type: AiSuggestionType;
};

function mapSuggestionRow(row: AiSuggestionRow): AiSuggestion {
  return {
    confidence: row.confidence,
    createdAt: row.created_at,
    filingId: row.filing_id,
    id: row.id,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    status: row.status,
    subjectId: row.subject_id,
    subjectType: row.subject_type,
    suggestedValue: row.suggested_value,
    suggestionType: row.suggestion_type,
  };
}

export async function recordAiSuggestion(input: {
  confidence?: number;
  filingId?: string;
  subjectId: string;
  subjectType: string;
  suggestedValue: Record<string, unknown>;
  suggestionType: AiSuggestionType;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("finance_ai_suggestions").insert({
    confidence: input.confidence,
    filing_id: input.filingId,
    subject_id: input.subjectId,
    subject_type: input.subjectType,
    suggested_value: input.suggestedValue,
    suggestion_type: input.suggestionType,
  });

  if (error) {
    console.error("Failed to record AI suggestion:", error.message);
  }
}

export async function listAiSuggestions(filingId: string): Promise<AiSuggestion[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("finance_ai_suggestions")
    .select("id, filing_id, subject_type, subject_id, suggestion_type, suggested_value, confidence, status, created_at, reviewed_by, reviewed_at")
    .eq("filing_id", filingId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error && !isMissingTable(error, "finance_ai_suggestions")) {
      console.error("Failed to list AI suggestions:", error.message);
    }

    return [];
  }

  return (data as AiSuggestionRow[]).map(mapSuggestionRow);
}

// --- Draft workpapers --------------------------------------------------

type DraftWorkpaperRow = {
  data: Record<string, unknown>;
  filing_id: string | null;
  id: string;
  missing_data_warnings: string[];
  prepared_at: string;
  prepared_by: string;
  reviewed_by: string | null;
  review_status: DraftWorkpaper["reviewStatus"];
  source_period_end: string;
  source_period_start: string;
  workpaper_type: WorkpaperType;
};

function mapWorkpaperRow(row: DraftWorkpaperRow): DraftWorkpaper {
  return {
    data: row.data,
    filingId: row.filing_id,
    id: row.id,
    missingDataWarnings: row.missing_data_warnings,
    preparedAt: row.prepared_at,
    preparedBy: row.prepared_by,
    reviewedBy: row.reviewed_by,
    reviewStatus: row.review_status,
    sourcePeriodEnd: row.source_period_end,
    sourcePeriodStart: row.source_period_start,
    workpaperType: row.workpaper_type,
  };
}

export async function listWorkpapers(filingId: string): Promise<DraftWorkpaper[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("finance_draft_workpapers")
    .select("id, filing_id, workpaper_type, source_period_start, source_period_end, prepared_at, prepared_by, data, missing_data_warnings, reviewed_by, review_status")
    .eq("filing_id", filingId)
    .order("prepared_at", { ascending: false });

  if (error || !data) {
    if (error && !isMissingTable(error, "finance_draft_workpapers")) {
      console.error("Failed to list workpapers:", error.message);
    }

    return [];
  }

  return (data as DraftWorkpaperRow[]).map(mapWorkpaperRow);
}

export async function storeDraftWorkpaper(input: {
  data: Record<string, unknown>;
  filingId: string;
  missingDataWarnings: string[];
  preparedBy: string;
  sourcePeriodEnd: string;
  sourcePeriodStart: string;
  workpaperType: WorkpaperType;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("finance_draft_workpapers").insert({
    data: input.data,
    filing_id: input.filingId,
    missing_data_warnings: input.missingDataWarnings,
    prepared_by: input.preparedBy,
    source_period_end: input.sourcePeriodEnd,
    source_period_start: input.sourcePeriodStart,
    workpaper_type: input.workpaperType,
  });

  if (error) {
    throw new Error(`Could not store draft workpaper: ${error.message}`);
  }
}

export async function approveWorkpaper(workpaperId: string, reviewedBy: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("finance_draft_workpapers")
    .update({ review_status: "approved", reviewed_by: reviewedBy })
    .eq("id", workpaperId);

  if (error) {
    throw new Error(`Could not approve workpaper: ${error.message}`);
  }
}

// --- 990 worksheets --------------------------------------------------

export async function getWorksheet(filingId: string, worksheetType: WorksheetType): Promise<Record<string, unknown> | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("finance_990_worksheets")
    .select("data")
    .eq("filing_id", filingId)
    .eq("worksheet_type", worksheetType)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return (data as { data: Record<string, unknown> }).data;
}

export async function saveWorksheet(input: {
  data: Record<string, unknown>;
  filingId: string;
  updatedBy: string;
  worksheetType: WorksheetType;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("finance_990_worksheets").upsert(
    {
      data: input.data,
      filing_id: input.filingId,
      updated_at: new Date().toISOString(),
      updated_by: input.updatedBy,
      worksheet_type: input.worksheetType,
    },
    { onConflict: "filing_id,worksheet_type" },
  );

  if (error) {
    throw new Error(`Could not save worksheet: ${error.message}`);
  }
}

// --- Accountant package --------------------------------------------------

/**
 * Always inserted as "draft" -- only markAccountantPackageReady() (a
 * separate, finance_owner-only action) may set status to "ready", per the
 * role matrix calling that out as an owner-only capability distinct from
 * generating the package itself.
 */
export async function recordAccountantPackage(input: {
  filingId: string;
  generatedBy: string;
  manifest: Record<string, unknown>;
}): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("finance_accountant_packages")
    .insert({
      filing_id: input.filingId,
      generated_by: input.generatedBy,
      manifest: input.manifest,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not record accountant package: ${error.message}`);
  }

  return (data as { id: string } | null)?.id ?? null;
}

export async function markAccountantPackageReady(packageId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("finance_accountant_packages").update({ status: "ready" }).eq("id", packageId);

  if (error) {
    throw new Error(`Could not mark package ready: ${error.message}`);
  }
}

export async function listAccountantPackages(filingId: string): Promise<AccountantPackageSummary[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("finance_accountant_packages")
    .select("id, generated_at, status")
    .eq("filing_id", filingId)
    .order("generated_at", { ascending: false });

  if (error || !data) {
    if (error && !isMissingTable(error, "finance_accountant_packages")) {
      console.error("Failed to list accountant packages:", error.message);
    }

    return [];
  }

  return (data as Array<{ generated_at: string; id: string; status: "draft" | "ready" }>).map((row) => ({
    generatedAt: row.generated_at,
    id: row.id,
    status: row.status,
  }));
}
