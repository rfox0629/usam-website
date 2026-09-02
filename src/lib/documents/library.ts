import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { type OperationsAuthorization } from "@/src/lib/operations/auth";
import { canReadSensitivity } from "./access";

export const OPERATIONS_DOCUMENTS_BUCKET = "operations-documents";

export const documentCategories = [
  "corporate_legal",
  "irs_tax",
  "state_compliance",
  "governance_board",
  "finance_banking",
  "insurance",
  "policies",
  "contracts_agreements",
  "missionaries_personnel",
  "ministry_programs",
  "other",
] as const;

export type DocumentCategory = typeof documentCategories[number];

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  contracts_agreements: "Contracts & Agreements",
  corporate_legal: "Corporate & Legal",
  finance_banking: "Finance & Banking",
  governance_board: "Governance & Board",
  insurance: "Insurance",
  irs_tax: "IRS & Tax",
  ministry_programs: "Ministry / Programs",
  missionaries_personnel: "Missionaries / Personnel",
  other: "Other",
  policies: "Policies",
  state_compliance: "State Compliance",
};

/** Categories Finance surfaces in its contextual view of the shared library. */
export const financeDocumentCategories: DocumentCategory[] = [
  "irs_tax",
  "state_compliance",
  "finance_banking",
  "corporate_legal",
];

export const documentSensitivities = [
  "normal",
  "finance_restricted",
  "personnel_restricted",
  "case_restricted",
  "system_restricted",
] as const;

export type DocumentSensitivity = typeof documentSensitivities[number];

export const documentSensitivityLabels: Record<DocumentSensitivity, string> = {
  case_restricted: "Case restricted",
  finance_restricted: "Finance restricted",
  normal: "Internal",
  personnel_restricted: "Personnel restricted",
  system_restricted: "System restricted",
};

export { canReadSensitivity } from "./access";

export type OperationsDocument = {
  category: DocumentCategory;
  categoryLabel: string;
  documentDate: string | null;
  documentType: string;
  fileName: string;
  fileSize: number | null;
  id: string;
  isLegacy: boolean;
  sensitivity: DocumentSensitivity;
  sensitivityLabel: string;
  status: string;
  title: string;
  uploadedAt: string;
  uploadedBy: string | null;
  /** Where Operations is using this document. */
  usedFor: string[];
};

type DocumentRow = {
  category: string;
  document_date: string | null;
  document_type: string;
  file_name: string;
  file_size: number | null;
  id: string;
  legacy_source_id: string | null;
  sensitivity: string;
  source: string;
  status: string;
  title: string;
  uploaded_at: string;
  uploaded_by: string | null;
};

const referenceLabels: Record<string, string> = {
  bank_statement: "Bank statement",
  compliance_fact: "Compliance fact",
  compliance_filing: "Filing deadline",
  form_990_workpaper: "990 workpaper",
  governance_record: "Governance",
  missionary_application: "Missionary application",
  organization: "Organization profile",
  reconciliation: "Reconciliation",
  submission: "Submission",
  tax_period: "Tax period",
};

function asCategory(value: string): DocumentCategory {
  return documentCategories.includes(value as DocumentCategory)
    ? (value as DocumentCategory)
    : "other";
}

function asSensitivity(value: string): DocumentSensitivity {
  return documentSensitivities.includes(value as DocumentSensitivity)
    ? (value as DocumentSensitivity)
    : "normal";
}

export async function loadOperationsDocuments({
  authorization,
  categories,
  organizationId,
  search,
}: {
  authorization: OperationsAuthorization;
  categories?: DocumentCategory[];
  organizationId: string;
  search?: string;
}): Promise<{ documents: OperationsDocument[]; error?: string; hiddenCount: number }> {
  if (!isSupabaseAdminConfigured()) {
    return { documents: [], error: "Supabase admin environment variables are not configured.", hiddenCount: 0 };
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("operations_documents")
    .select("id, title, file_name, file_size, document_type, category, sensitivity, source, status, document_date, uploaded_by, uploaded_at, legacy_source_id")
    .eq("organization_id", organizationId)
    .is("superseded_at", null)
    .order("uploaded_at", { ascending: false })
    .limit(500);

  if (categories && categories.length > 0) {
    query = query.in("category", categories);
  }

  if (search && search.trim()) {
    const term = search.trim().replace(/[%,]/g, " ");
    query = query.or(`title.ilike.%${term}%,file_name.ilike.%${term}%`);
  }

  const [documentsResult, referencesResult] = await Promise.all([
    query,
    supabase.from("document_references").select("document_id, reference_type"),
  ]);

  if (documentsResult.error) {
    return { documents: [], error: documentsResult.error.message, hiddenCount: 0 };
  }

  const usage = new Map<string, Set<string>>();

  for (const row of (referencesResult.data ?? []) as { document_id: string; reference_type: string }[]) {
    const set = usage.get(row.document_id) ?? new Set<string>();
    set.add(referenceLabels[row.reference_type] ?? row.reference_type);
    usage.set(row.document_id, set);
  }

  const rows = (documentsResult.data ?? []) as DocumentRow[];
  // Documents above the reader's clearance are counted, never listed.
  const visible = rows.filter((row) => canReadSensitivity(authorization, row.sensitivity));

  return {
    documents: visible.map((row) => {
      const category = asCategory(row.category);
      const sensitivity = asSensitivity(row.sensitivity);

      return {
        category,
        categoryLabel: documentCategoryLabels[category],
        documentDate: row.document_date,
        documentType: row.document_type,
        fileName: row.file_name,
        fileSize: row.file_size,
        id: row.id,
        isLegacy: row.source === "legacy_migration",
        sensitivity,
        sensitivityLabel: documentSensitivityLabels[sensitivity],
        status: row.status,
        title: row.title,
        uploadedAt: row.uploaded_at,
        uploadedBy: row.uploaded_by,
        usedFor: Array.from(usage.get(row.id) ?? []),
      };
    }),
    hiddenCount: rows.length - visible.length,
  };
}

/**
 * Mints a short-lived signed URL, but only after the sensitivity check. The URL
 * is never created for a document the caller may not read.
 */
export async function createDocumentAccessUrl({
  authorization,
  documentId,
}: {
  authorization: OperationsAuthorization;
  documentId: string;
}): Promise<{ error?: string; url?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Document storage is not configured." };
  }

  const supabase = createSupabaseAdminClient();
  const { data: document } = await supabase
    .from("operations_documents")
    .select("storage_path, storage_bucket, sensitivity")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) {
    return { error: "Document not found." };
  }

  if (!canReadSensitivity(authorization, document.sensitivity as string)) {
    return { error: "This document is outside your access level." };
  }

  const { data, error } = await supabase.storage
    .from((document.storage_bucket as string) || OPERATIONS_DOCUMENTS_BUCKET)
    .createSignedUrl(document.storage_path as string, 120);

  if (error || !data?.signedUrl) {
    return { error: "Could not open that document." };
  }

  return { url: data.signedUrl };
}
