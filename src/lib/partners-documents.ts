import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const PARTNERS_DOCUMENTS_BUCKET = "partners-documents";

export const PARTNERS_DOCUMENT_GROUPS = [
  "Governance",
  "IRS & Nonprofit",
  "Finance",
  "Operations",
  "Brand & Ministry",
] as const;

export type PartnersDocument = {
  createdAt: string;
  docName: string;
  filePath: string;
  fileSize: number | null;
  fileType: string | null;
  groupName: string;
  id: string;
  sortOrder: number;
};

type PartnersDocumentRow = {
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

function mapRow(row: PartnersDocumentRow): PartnersDocument {
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

export async function listPartnersDocuments(): Promise<PartnersDocument[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("partners_documents")
    .select(selectColumns)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to list partners documents:", error.message);
    return [];
  }

  return ((data ?? []) as PartnersDocumentRow[]).map(mapRow);
}

export function groupPartnersDocuments(documents: readonly PartnersDocument[]) {
  const byGroup = new Map<string, PartnersDocument[]>();

  for (const doc of documents) {
    const existing = byGroup.get(doc.groupName) ?? [];
    existing.push(doc);
    byGroup.set(doc.groupName, existing);
  }

  const knownGroups = PARTNERS_DOCUMENT_GROUPS as readonly string[];
  const orderedGroupNames = [
    ...PARTNERS_DOCUMENT_GROUPS.filter((group) => byGroup.has(group)),
    ...Array.from(byGroup.keys()).filter((group) => !knownGroups.includes(group)),
  ];

  return orderedGroupNames.map((groupName) => ({
    documents: byGroup.get(groupName) ?? [],
    groupName,
  }));
}

export async function getPartnersDocumentById(id: string): Promise<PartnersDocument | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("partners_documents")
    .select(selectColumns)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRow(data as PartnersDocumentRow);
}
