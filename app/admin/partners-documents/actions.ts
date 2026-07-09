"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { PARTNERS_DOCUMENTS_BUCKET } from "@/src/lib/partners-documents";

const maxFileSize = 20 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[/\\]/g, "-")
    .replace(/[^\w.\- ()]/g, "")
    .slice(0, 150) || "document";
}

async function requireAdminClient() {
  const authorization = await getAdminAuthorization();

  if (!canEditAdminContent(authorization)) {
    throw new Error("Admin access is required.");
  }

  if (!isSupabaseAdminConfigured()) {
    throw new Error("Document storage is not configured yet.");
  }

  return createSupabaseAdminClient();
}

export async function uploadPartnersDocument(formData: FormData) {
  const supabase = await requireAdminClient();

  const groupName = String(formData.get("groupName") ?? "").trim();
  const docNameInput = String(formData.get("docName") ?? "").trim();
  const file = formData.get("file");

  if (!groupName) {
    throw new Error("Choose a category for this document.");
  }

  if (!(file instanceof File) || file.size <= 0) {
    throw new Error("Choose a file to upload.");
  }

  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Use a PDF, Word document, or image file.");
  }

  if (file.size > maxFileSize) {
    throw new Error("Use a file smaller than 20 MB.");
  }

  const docName = docNameInput || safeFileName(file.name);
  const path = `${randomUUID()}-${safeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(PARTNERS_DOCUMENTS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase.from("partners_documents").insert({
    doc_name: docName,
    file_path: path,
    file_size: file.size,
    file_type: file.type,
    group_name: groupName,
  });

  if (insertError) {
    await supabase.storage.from(PARTNERS_DOCUMENTS_BUCKET).remove([path]);
    throw new Error(`Could not save document record: ${insertError.message}`);
  }

  revalidatePath("/admin/partners-documents");
  revalidatePath("/partners");
}

export async function deletePartnersDocument(id: string) {
  const supabase = await requireAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("partners_documents")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    throw new Error("Document not found.");
  }

  const { error: deleteRowError } = await supabase.from("partners_documents").delete().eq("id", id);

  if (deleteRowError) {
    throw new Error(`Could not delete document: ${deleteRowError.message}`);
  }

  await supabase.storage.from(PARTNERS_DOCUMENTS_BUCKET).remove([existing.file_path]);

  revalidatePath("/admin/partners-documents");
  revalidatePath("/partners");
}
