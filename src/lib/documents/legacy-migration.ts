import "server-only";

import { createHash } from "node:crypto";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { PARTNERS_DOCUMENTS_BUCKET } from "@/src/lib/partners-documents";
import { classifyLegacyRow, mapLegacyDocument } from "./legacy-mapping";

export type LegacyMigrationItem = {
  action: "create" | "already_imported" | "duplicate_content" | "test_artifact" | "unresolved";
  category: string;
  detail: string;
  documentType: string;
  legacyId: string;
  sensitivity: string;
  title: string;
};

export type LegacyMigrationReport = {
  alreadyImported: number;
  created: number;
  dryRun: boolean;
  duplicates: number;
  error?: string;
  filesMovedOrDeleted: 0;
  items: LegacyMigrationItem[];
  testArtifacts: number;
  toCreate: number;
  unresolved: number;
};

type LegacyRow = {
  created_at: string;
  doc_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  group_name: string;
  id: string;
};

/**
 * Imports the legacy partners_documents library into the canonical library.
 *
 * Reference-first: the canonical record points at the legacy bucket and path,
 * so no file is copied, moved, renamed, or deleted. The legacy table, bucket,
 * and UI keep working exactly as they do today, which is what makes this safe
 * to run before anyone has verified parity.
 *
 * Re-running is safe: a unique index on (legacy_source_table, legacy_source_id)
 * means a second run reports already_imported instead of creating a twin.
 */
export async function runLegacyDocumentMigration({
  actor,
  dryRun,
  organizationId,
}: {
  actor: string;
  dryRun: boolean;
  organizationId: string;
}): Promise<LegacyMigrationReport> {
  const empty: LegacyMigrationReport = {
    alreadyImported: 0,
    created: 0,
    dryRun,
    duplicates: 0,
    filesMovedOrDeleted: 0,
    items: [],
    testArtifacts: 0,
    toCreate: 0,
    unresolved: 0,
  };

  if (!isSupabaseAdminConfigured()) {
    return { ...empty, error: "Supabase admin environment variables are not configured." };
  }

  const supabase = createSupabaseAdminClient();
  const [legacyResult, existingResult] = await Promise.all([
    supabase
      .from("partners_documents")
      .select("id, doc_name, group_name, file_path, file_type, file_size, created_at")
      .order("created_at"),
    supabase
      .from("operations_documents")
      .select("legacy_source_id, file_hash")
      .eq("organization_id", organizationId),
  ]);

  if (legacyResult.error) {
    return { ...empty, error: legacyResult.error.message };
  }

  const existingLegacyIds = new Set(
    ((existingResult.data ?? []) as { legacy_source_id: string | null }[])
      .map((row) => row.legacy_source_id)
      .filter((id): id is string => Boolean(id)),
  );
  const existingHashes = new Set(
    ((existingResult.data ?? []) as { file_hash: string | null }[])
      .map((row) => row.file_hash)
      .filter((hash): hash is string => Boolean(hash)),
  );

  const items: LegacyMigrationItem[] = [];
  let created = 0;
  let toCreate = 0;
  let duplicates = 0;
  let alreadyImported = 0;
  let testArtifacts = 0;
  let unresolved = 0;

  for (const row of (legacyResult.data ?? []) as LegacyRow[]) {
    const mapping = mapLegacyDocument({ docName: row.doc_name, groupName: row.group_name });

    if (existingLegacyIds.has(row.id)) {
      alreadyImported += 1;
      items.push({
        action: "already_imported",
        category: mapping.category,
        detail: "Canonical record already exists for this legacy id.",
        documentType: mapping.documentType,
        legacyId: row.id,
        sensitivity: mapping.sensitivity,
        title: row.doc_name,
      });
      continue;
    }

    // Read the original once to compute a real sha256, so duplicate detection
    // works identically for legacy and future uploads.
    const { data: blob, error: downloadError } = await supabase.storage
      .from(PARTNERS_DOCUMENTS_BUCKET)
      .download(row.file_path);

    const classification = classifyLegacyRow({
      docName: row.doc_name,
      filePath: row.file_path,
      hasStorageObject: Boolean(blob) && !downloadError,
    });

    if (classification === "test_artifact") {
      testArtifacts += 1;
      items.push({
        action: "test_artifact",
        category: mapping.category,
        detail: "Title marks this as a test or sample artifact.",
        documentType: mapping.documentType,
        legacyId: row.id,
        sensitivity: mapping.sensitivity,
        title: row.doc_name,
      });
      continue;
    }

    if (classification === "unresolved" || !blob) {
      unresolved += 1;
      items.push({
        action: "unresolved",
        category: mapping.category,
        detail: downloadError?.message ?? "Legacy file is missing from storage.",
        documentType: mapping.documentType,
        legacyId: row.id,
        sensitivity: mapping.sensitivity,
        title: row.doc_name,
      });
      continue;
    }

    const bytes = Buffer.from(await blob.arrayBuffer());
    const fileHash = createHash("sha256").update(bytes).digest("hex");

    if (existingHashes.has(fileHash)) {
      duplicates += 1;
      items.push({
        action: "duplicate_content",
        category: mapping.category,
        detail: "An existing canonical document already has identical content.",
        documentType: mapping.documentType,
        legacyId: row.id,
        sensitivity: mapping.sensitivity,
        title: row.doc_name,
      });
      continue;
    }

    toCreate += 1;
    items.push({
      action: "create",
      category: mapping.category,
      detail: `${(bytes.length / 1024).toFixed(0)} KB · references legacy file in place`,
      documentType: mapping.documentType,
      legacyId: row.id,
      sensitivity: mapping.sensitivity,
      title: row.doc_name,
    });

    if (dryRun) {
      continue;
    }

    const { error: insertError } = await supabase
      .from("operations_documents")
      .insert({
        category: mapping.category,
        document_type: mapping.documentType,
        file_hash: fileHash,
        file_name: row.file_path.replace(/^[0-9a-f-]{36}-/i, ""),
        file_size: row.file_size,
        legacy_etag: null,
        legacy_source_id: row.id,
        legacy_source_table: "partners_documents",
        legacy_storage_bucket: PARTNERS_DOCUMENTS_BUCKET,
        legacy_storage_path: row.file_path,
        mime_type: row.file_type,
        organization_id: organizationId,
        sensitivity: mapping.sensitivity,
        source: "legacy_migration",
        status: "uploaded",
        // Points at the legacy file in place. Nothing is copied or moved.
        storage_bucket: PARTNERS_DOCUMENTS_BUCKET,
        storage_path: row.file_path,
        title: row.doc_name,
        // Preserve the original upload time rather than stamping today.
        uploaded_at: row.created_at,
        uploaded_by: `${actor} (imported from legacy)`,
      });

    if (insertError) {
      unresolved += 1;
      items[items.length - 1] = {
        ...items[items.length - 1],
        action: "unresolved",
        detail: insertError.message,
      };
      toCreate -= 1;
      continue;
    }

    created += 1;
    existingHashes.add(fileHash);
  }

  return {
    alreadyImported,
    created,
    dryRun,
    duplicates,
    filesMovedOrDeleted: 0,
    items,
    testArtifacts,
    toCreate,
    unresolved,
  };
}
