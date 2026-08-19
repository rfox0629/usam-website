"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  financeDocumentTypes,
  FINANCE_DOCUMENTS_BUCKET,
  loadFinanceOrganization,
  type FinanceDocumentType,
} from "@/src/lib/finance/workspace";

function fail(message: string): never {
  redirect(`/operations/finance/documents?error=${encodeURIComponent(message)}`);
}

function documentTypeValue(value: FormDataEntryValue | null): FinanceDocumentType {
  return financeDocumentTypes.includes(value as FinanceDocumentType)
    ? (value as FinanceDocumentType)
    : "other";
}

export async function uploadFinanceDocumentAction(formData: FormData) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "finance")) {
    fail("Not authorized to upload finance documents.");
  }

  const organization = await loadFinanceOrganization();

  if (!organization) {
    fail("Organization record is unavailable.");
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    fail("Choose a file to upload.");
  }

  const documentType = documentTypeValue(formData.get("documentType"));
  const titleValue = formData.get("title");
  const title = typeof titleValue === "string" && titleValue.trim()
    ? titleValue.trim()
    : file.name;

  const bytes = Buffer.from(await file.arrayBuffer());
  // Hash the original bytes so the same file uploaded twice is recognised as a
  // duplicate rather than silently stored as a second copy.
  const fileHash = createHash("sha256").update(bytes).digest("hex");
  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase
    .from("finance_documents")
    .select("id, title")
    .eq("organization_id", organization.id)
    .eq("file_hash", fileHash)
    .maybeSingle();

  if (existing) {
    fail(`That exact file is already stored as "${existing.title}".`);
  }

  const storagePath = `${organization.id}/${documentType}/${fileHash.slice(0, 16)}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(FINANCE_DOCUMENTS_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream", upsert: false });

  if (uploadError) {
    fail(`Upload failed: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase
    .from("finance_documents")
    .insert({
      document_type: documentType,
      file_hash: fileHash,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      organization_id: organization.id,
      status: "uploaded",
      storage_path: storagePath,
      title,
      uploaded_by: authorization.email,
    });

  if (insertError) {
    // Keep storage and the table consistent if the row could not be written.
    await supabase.storage.from(FINANCE_DOCUMENTS_BUCKET).remove([storagePath]);
    fail(`Could not record the document: ${insertError.message}`);
  }

  revalidatePath("/operations/finance/documents");
  redirect("/operations/finance/documents?uploaded=1");
}

/** Short-lived signed URL. Finance documents are never publicly reachable. */
export async function openFinanceDocumentAction(formData: FormData) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "finance")) {
    fail("Not authorized to open finance documents.");
  }

  const id = formData.get("id");

  if (typeof id !== "string" || !id) {
    fail("Document not found.");
  }

  const supabase = createSupabaseAdminClient();
  const { data: document } = await supabase
    .from("finance_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!document) {
    fail("Document not found.");
  }

  const { data: signed, error } = await supabase.storage
    .from(FINANCE_DOCUMENTS_BUCKET)
    .createSignedUrl(document.storage_path as string, 120);

  if (error || !signed?.signedUrl) {
    fail("Could not open that document.");
  }

  redirect(signed.signedUrl);
}
