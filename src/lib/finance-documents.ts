import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

// Directly reuses the proven partners_documents pattern (private storage
// bucket, category grouping, service-role-only access) per
// docs/ncc-architecture.md §20 Phase 1. A parallel table/bucket was created
// rather than generalizing partners-documents.ts in place, so the existing,
// working Partnerships document flow is never put at risk by Finance changes.
export const FINANCE_DOCUMENTS_BUCKET = "finance-documents";

export const FINANCE_DOCUMENT_CATEGORIES = [
  "Bank Statements",
  "Monthly Financial Statements",
  "Board Reports",
  "Board Meeting Minutes",
  "Annual Budget",
  "Form 990 Filings",
  "Audit Workpapers",
  "Audited Financial Statements",
  "Insurance Policies",
  "Payroll Records",
  "W-2s & 1099s",
  "Vendor Contracts",
  "Grant Agreements",
  "Donor Acknowledgment Letters",
  "Reconciliation Reports",
  "Tax Exemption Documents",
  "State Charitable Registrations",
  "Expense Reports",
  "Policy Documents",
] as const;

export type FinanceDocument = {
  createdAt: string;
  docName: string;
  filePath: string;
  fileSize: number | null;
  fileType: string | null;
  groupName: string;
  id: string;
  sortOrder: number;
};

type FinanceDocumentRow = {
  created_at: string;
  doc_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  group_name: string;
  id: string;
  sort_order: number;
};

const selectColumns = "id, group_name, doc_name, file_path, file_type, file_size, sort_order, created_at";

function mapRow(row: FinanceDocumentRow): FinanceDocument {
  return {
    createdAt: row.created_at,
    docName: row.doc_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    fileType: row.file_type,
    groupName: row.group_name,
    id: row.id,
    sortOrder: row.sort_order,
  };
}

function isMissingFinanceDocumentsTable(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.includes("finance_documents"));
}

/**
 * The finance_documents migration is created on this branch but has not
 * been applied to any database (production Supabase is the only Supabase
 * project this repo has, and this task must not write to it). Upload/delete
 * actions check this before touching the database at all, so the failure
 * mode is a clear, intentional message instead of a raw Postgres error.
 */
export function isFinanceDocumentsWriteEnabled() {
  return process.env.FINANCE_DOCUMENTS_MIGRATION_APPLIED === "true";
}

export async function listFinanceDocuments(): Promise<FinanceDocument[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("finance_documents")
    .select(selectColumns)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (!isMissingFinanceDocumentsTable(error)) {
      console.error("Failed to list finance documents:", error.message);
    }

    return [];
  }

  return ((data ?? []) as FinanceDocumentRow[]).map(mapRow);
}

export function groupFinanceDocuments(documents: readonly FinanceDocument[]) {
  const byGroup = new Map<string, FinanceDocument[]>();

  for (const doc of documents) {
    const existing = byGroup.get(doc.groupName) ?? [];
    existing.push(doc);
    byGroup.set(doc.groupName, existing);
  }

  const knownGroups = FINANCE_DOCUMENT_CATEGORIES as readonly string[];
  const orderedGroupNames = [
    ...FINANCE_DOCUMENT_CATEGORIES.filter((group) => byGroup.has(group)),
    ...Array.from(byGroup.keys()).filter((group) => !knownGroups.includes(group)),
  ];

  return orderedGroupNames.map((groupName) => ({
    documents: byGroup.get(groupName) ?? [],
    groupName,
  }));
}
