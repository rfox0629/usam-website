"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { loadFinanceOrganization } from "@/src/lib/finance/workspace";
import {
  createDocumentAccessUrl,
  documentCategories,
  documentSensitivities,
  OPERATIONS_DOCUMENTS_BUCKET,
  type DocumentCategory,
  type DocumentSensitivity,
} from "@/src/lib/documents/library";
import { runLegacyDocumentMigration } from "@/src/lib/documents/legacy-migration";

function fail(message: string): never {
  redirect(`/operations/documents?error=${encodeURIComponent(message)}`);
}

function text(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

export async function uploadOperationsDocumentAction(formData: FormData) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "documents")) {
    fail("Not authorized to upload documents.");
  }

  const organization = await loadFinanceOrganization();

  if (!organization) {
    fail("Organization record is unavailable.");
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    fail("Choose a file to upload.");
  }

  const categoryValue = text(formData, "category");
  const category: DocumentCategory = documentCategories.includes(categoryValue as DocumentCategory)
    ? (categoryValue as DocumentCategory)
    : "other";
  const sensitivityValue = text(formData, "sensitivity");
  const sensitivity: DocumentSensitivity = documentSensitivities.includes(sensitivityValue as DocumentSensitivity)
    ? (sensitivityValue as DocumentSensitivity)
    : "normal";
  const title = text(formData, "title") || file.name;

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(bytes).digest("hex");
  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase
    .from("operations_documents")
    .select("id, title")
    .eq("organization_id", organization.id)
    .eq("file_hash", fileHash)
    .maybeSingle();

  if (existing) {
    fail(`That exact file is already in the library as "${existing.title}".`);
  }

  const storagePath = `${organization.id}/${category}/${fileHash.slice(0, 16)}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(OPERATIONS_DOCUMENTS_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream", upsert: false });

  if (uploadError) {
    fail(`Upload failed: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase
    .from("operations_documents")
    .insert({
      category,
      document_type: text(formData, "documentType") || "other",
      file_hash: fileHash,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      organization_id: organization.id,
      sensitivity,
      source: "operations_upload",
      status: "uploaded",
      storage_bucket: OPERATIONS_DOCUMENTS_BUCKET,
      storage_path: storagePath,
      title,
      uploaded_by: authorization.email,
    });

  if (insertError) {
    await supabase.storage.from(OPERATIONS_DOCUMENTS_BUCKET).remove([storagePath]);
    fail(`Could not record the document: ${insertError.message}`);
  }

  revalidatePath("/operations/documents");
  revalidatePath("/operations/finance/documents");
  redirect("/operations/documents?uploaded=1");
}

/** Opens a document through a short-lived signed URL after a sensitivity check. */
export async function openOperationsDocumentAction(formData: FormData) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized") {
    fail("Not authorized.");
  }

  const id = text(formData, "id");

  if (!id) {
    fail("Document not found.");
  }

  const { error, url } = await createDocumentAccessUrl({ authorization, documentId: id });

  if (error || !url) {
    fail(error ?? "Could not open that document.");
  }

  redirect(url);
}

export async function runLegacyMigrationAction(formData: FormData) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "documents")) {
    fail("Not authorized to run the legacy import.");
  }

  const organization = await loadFinanceOrganization();

  if (!organization) {
    fail("Organization record is unavailable.");
  }

  // Applying requires an explicit confirm; the default is always a dry run.
  const dryRun = text(formData, "mode") !== "apply";
  const report = await runLegacyDocumentMigration({
    actor: authorization.email,
    dryRun,
    organizationId: organization.id,
  });

  if (report.error) {
    fail(report.error);
  }

  revalidatePath("/operations/documents");
  revalidatePath("/operations/finance/documents");
  redirect(
    `/operations/documents?migration=${dryRun ? "dry" : "applied"}`
    + `&create=${report.toCreate}&created=${report.created}&dupes=${report.duplicates}`
    + `&already=${report.alreadyImported}&tests=${report.testArtifacts}&unresolved=${report.unresolved}`,
  );
}
