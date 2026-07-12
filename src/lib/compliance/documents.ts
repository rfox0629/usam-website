import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import type { ComplianceDocumentCategory, ComplianceFilingDocument } from "./types";

export * from "./types";

type ComplianceFilingDocumentRow = {
  created_at: string;
  doc_category: ComplianceDocumentCategory;
  doc_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  filing_id: string;
  id: string;
};

const selectColumns = "id, filing_id, doc_category, doc_name, file_path, file_type, file_size, created_at";

function mapRow(row: ComplianceFilingDocumentRow): ComplianceFilingDocument {
  return {
    createdAt: row.created_at,
    docCategory: row.doc_category,
    docName: row.doc_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    fileType: row.file_type,
    filingId: row.filing_id,
    id: row.id,
  };
}

function isMissingComplianceDocumentsTable(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.includes("compliance_filing_documents"));
}

export async function listComplianceFilingDocuments(filingId: string): Promise<ComplianceFilingDocument[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("compliance_filing_documents")
    .select(selectColumns)
    .eq("filing_id", filingId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    if (error && !isMissingComplianceDocumentsTable(error)) {
      console.error("Failed to list compliance filing documents:", error.message);
    }

    return [];
  }

  return (data as ComplianceFilingDocumentRow[]).map(mapRow);
}
