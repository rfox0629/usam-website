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
  partnerVisible: boolean;
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
  partner_visible: boolean | null;
  sort_order: number;
};

const selectColumns = "id, group_name, doc_name, file_path, file_type, file_size, sort_order, created_at, partner_visible";

function mapRow(row: PartnersDocumentRow): PartnersDocument {
  return {
    createdAt: row.created_at,
    docName: row.doc_name,
    partnerVisible: row.partner_visible !== false,
    filePath: row.file_path,
    fileSize: row.file_size,
    fileType: row.file_type,
    groupName: row.group_name,
    id: row.id,
    sortOrder: row.sort_order,
  };
}

/**
 * Documents served through the shared-passphrase partners surface.
 *
 * Filtered to partner_visible by default: the passphrase is not individual
 * identity, so personnel and IRS source letters stay out of it. Pass
 * includeHidden only from authenticated admin surfaces.
 */
export async function listPartnersDocuments(
  { includeHidden = false }: { includeHidden?: boolean } = {},
): Promise<PartnersDocument[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("partners_documents")
    .select(selectColumns);

  if (!includeHidden) {
    query = query.eq("partner_visible", true);
  }

  const { data, error } = await query
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

/** Lookup for the partner download route; hidden documents resolve to null. */
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
