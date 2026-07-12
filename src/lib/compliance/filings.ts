import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getSeedFiling, seedComplianceFilings, type ComplianceFiling, type ComplianceFilingStatus, type ComplianceWorkflowStage } from "./types";

export * from "./types";

type ComplianceFilingRow = {
  agency: string;
  assigned_person: string | null;
  confirmation_number: string | null;
  extended_due_date: string | null;
  extra: Record<string, string> | null;
  filing_key: string;
  filing_name: string;
  filing_period: string;
  filing_receipt_path: string | null;
  id: string;
  jurisdiction: string | null;
  last_filed_date: string | null;
  missing_documents: string[] | null;
  official_filing_url: string | null;
  open_questions: string[] | null;
  original_due_date: string | null;
  period_key: string;
  readiness_percentage: number;
  status: ComplianceFilingStatus;
  workflow_stage: ComplianceWorkflowStage;
};

/**
 * The compliance_filings migration is created on this branch but has not
 * been applied to any database. Every write action checks this before
 * touching Supabase, matching the same gate used for Finance Documents
 * (see src/lib/finance-documents.ts).
 */
export function isComplianceFilingsWriteEnabled() {
  return process.env.COMPLIANCE_FILINGS_MIGRATION_APPLIED === "true";
}

function mapRow(row: ComplianceFilingRow): ComplianceFiling {
  return {
    agency: row.agency,
    assignedPerson: row.assigned_person,
    confirmationNumber: row.confirmation_number,
    extendedDueDate: row.extended_due_date,
    extra: row.extra ?? {},
    filingKey: row.filing_key,
    filingName: row.filing_name,
    filingPeriod: row.filing_period,
    filingReceiptPath: row.filing_receipt_path,
    id: row.id,
    isPersisted: true,
    jurisdiction: row.jurisdiction,
    lastFiledDate: row.last_filed_date,
    missingDocuments: row.missing_documents ?? [],
    officialFilingUrl: row.official_filing_url ?? "",
    openQuestions: row.open_questions ?? [],
    originalDueDate: row.original_due_date,
    periodKey: row.period_key,
    readinessPercentage: row.readiness_percentage,
    status: row.status,
    workflowStage: row.workflow_stage,
  };
}

const selectColumns = "id, filing_key, period_key, filing_name, agency, jurisdiction, filing_period, original_due_date, extended_due_date, status, workflow_stage, assigned_person, readiness_percentage, official_filing_url, last_filed_date, confirmation_number, filing_receipt_path, open_questions, missing_documents, extra";

function isMissingComplianceTable(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.includes("compliance_filings"));
}

/**
 * Returns the filing for (filingKey, periodKey): the real, persisted row if
 * the migration has been applied and one exists, otherwise the read-only
 * seed default. This is the only place seed and persisted state are merged,
 * so every page renders the same source of truth.
 */
export async function getComplianceFiling(filingKey: string, periodKey: string): Promise<ComplianceFiling | null> {
  const seed = getSeedFiling(filingKey, periodKey);

  if (!seed) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("compliance_filings")
    .select(selectColumns)
    .eq("filing_key", filingKey)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (error || !data) {
    if (error && !isMissingComplianceTable(error)) {
      console.error("Failed to load compliance filing:", error.message);
    }

    return seed;
  }

  return mapRow(data as ComplianceFilingRow);
}

/**
 * Lists every filing to show on the Compliance overview: the initial
 * seeded programs (AZ 2026, Form 990 unknown) plus any additional
 * persisted periods (e.g. AZ 2027 once that year's row is created).
 */
export async function listComplianceFilings(): Promise<ComplianceFiling[]> {
  const seeds = seedComplianceFilings();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("compliance_filings")
    .select(selectColumns)
    .order("original_due_date", { ascending: true });

  if (error || !data) {
    if (error && !isMissingComplianceTable(error)) {
      console.error("Failed to list compliance filings:", error.message);
    }

    return seeds;
  }

  const rows = (data as ComplianceFilingRow[]).map(mapRow);
  const rowKeys = new Set(rows.map((row) => `${row.filingKey}:${row.periodKey}`));
  const remainingSeeds = seeds.filter((seed) => !rowKeys.has(`${seed.filingKey}:${seed.periodKey}`));

  return [...rows, ...remainingSeeds];
}
