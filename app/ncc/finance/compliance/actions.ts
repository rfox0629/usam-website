"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  COMPLIANCE_DOCUMENTS_BUCKET,
  complianceWorkflowStages,
  getSeedFiling,
  isComplianceFilingsWriteEnabled,
  type ComplianceWorkflowStage,
} from "@/src/lib/compliance/filings";
import { complianceDocumentCategories, type ComplianceDocumentCategory } from "@/src/lib/compliance/documents";

const maxFileSize = 20 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

  if (!isComplianceFilingsWriteEnabled()) {
    throw new Error(
      "Compliance Center writes are unavailable in this preview: the compliance_filings migration has not been applied to any database yet. See supabase/migrations/20260713090000_compliance_filings_foundation.sql.",
    );
  }

  if (!isSupabaseAdminConfigured()) {
    throw new Error("Compliance storage is not configured yet.");
  }

  return createSupabaseAdminClient();
}

function revalidateFiling(filingKey: string, periodKey: string) {
  revalidatePath("/ncc/finance/compliance");

  if (filingKey === "arizona-annual-report") {
    revalidatePath(`/ncc/finance/compliance/arizona-annual-report/${periodKey}`);
  } else if (filingKey === "990") {
    revalidatePath(`/ncc/finance/990/${periodKey}`);
  }
}

async function ensureFilingRow(filingKey: string, periodKey: string) {
  const supabase = await requireAdminClient();
  const seed = getSeedFiling(filingKey, periodKey);

  if (!seed) {
    throw new Error("Unknown filing.");
  }

  const { error } = await supabase.from("compliance_filings").upsert(
    {
      agency: seed.agency,
      filing_key: seed.filingKey,
      filing_name: seed.filingName,
      filing_period: seed.filingPeriod,
      jurisdiction: seed.jurisdiction,
      missing_documents: seed.missingDocuments,
      official_filing_url: seed.officialFilingUrl,
      open_questions: seed.openQuestions,
      original_due_date: seed.originalDueDate,
      period_key: seed.periodKey,
    },
    { ignoreDuplicates: true, onConflict: "filing_key,period_key" },
  );

  if (error) {
    throw new Error(`Could not start tracking this filing: ${error.message}`);
  }

  return supabase;
}

export async function startTrackingComplianceFiling(filingKey: string, periodKey: string) {
  await ensureFilingRow(filingKey, periodKey);
  revalidateFiling(filingKey, periodKey);
}

export async function updateComplianceFilingFields(
  filingKey: string,
  periodKey: string,
  updates: {
    accountingYearEnd?: string;
    assignedPerson?: string;
    extendedDueDate?: string;
    extensionStatus?: string;
    filingType?: string;
    missingDocuments?: string[];
    openQuestions?: string[];
    originalDueDate?: string;
    readinessPercentage?: number;
    workflowStage?: ComplianceWorkflowStage;
  },
) {
  const supabase = await ensureFilingRow(filingKey, periodKey);

  if (updates.workflowStage && !complianceWorkflowStages.includes(updates.workflowStage)) {
    throw new Error("Invalid workflow stage.");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("compliance_filings")
    .select("extra")
    .eq("filing_key", filingKey)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Could not load filing: ${fetchError.message}`);
  }

  const nextExtra = {
    ...((existing?.extra as Record<string, string> | null) ?? {}),
    ...(updates.filingType !== undefined ? { filingType: updates.filingType } : {}),
    ...(updates.accountingYearEnd !== undefined ? { accountingYearEnd: updates.accountingYearEnd } : {}),
    ...(updates.extensionStatus !== undefined ? { extensionStatus: updates.extensionStatus } : {}),
  };

  const { error } = await supabase
    .from("compliance_filings")
    .update({
      assigned_person: updates.assignedPerson,
      extended_due_date: updates.extendedDueDate || null,
      extra: nextExtra,
      missing_documents: updates.missingDocuments,
      open_questions: updates.openQuestions,
      original_due_date: updates.originalDueDate || undefined,
      readiness_percentage: updates.readinessPercentage,
      workflow_stage: updates.workflowStage,
    })
    .eq("filing_key", filingKey)
    .eq("period_key", periodKey);

  if (error) {
    throw new Error(`Could not update filing: ${error.message}`);
  }

  revalidateFiling(filingKey, periodKey);
}

/**
 * The only action in this file that may set status = "filed" -- requires a
 * human-entered confirmation number. The compliance_filings_require_confirmation
 * trigger in the migration enforces this same rule at the database level as a
 * second layer, in case another code path ever writes to this table directly.
 */
export async function recordComplianceFilingConfirmation(
  filingKey: string,
  periodKey: string,
  input: { confirmationNumber: string; lastFiledDate: string },
) {
  const supabase = await ensureFilingRow(filingKey, periodKey);
  const confirmationNumber = input.confirmationNumber.trim();

  if (!confirmationNumber) {
    throw new Error("A confirmation number is required to mark this filing as filed.");
  }

  if (!input.lastFiledDate) {
    throw new Error("A filed date is required.");
  }

  const { error } = await supabase
    .from("compliance_filings")
    .update({
      confirmation_number: confirmationNumber,
      last_filed_date: input.lastFiledDate,
      status: "filed",
      workflow_stage: "filing_marked_complete",
    })
    .eq("filing_key", filingKey)
    .eq("period_key", periodKey);

  if (error) {
    throw new Error(`Could not record confirmation: ${error.message}`);
  }

  revalidateFiling(filingKey, periodKey);
}

export async function uploadComplianceDocument(filingKey: string, periodKey: string, formData: FormData) {
  const supabase = await ensureFilingRow(filingKey, periodKey);

  const { data: filingRow, error: filingError } = await supabase
    .from("compliance_filings")
    .select("id")
    .eq("filing_key", filingKey)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (filingError || !filingRow) {
    throw new Error("Filing record not found.");
  }

  const docCategory = String(formData.get("docCategory") ?? "") as ComplianceDocumentCategory;
  const docNameInput = String(formData.get("docName") ?? "").trim();
  const file = formData.get("file");

  if (!complianceDocumentCategories.includes(docCategory)) {
    throw new Error("Choose a document category.");
  }

  if (!(file instanceof File) || file.size <= 0) {
    throw new Error("Choose a file to upload.");
  }

  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Use a PDF, Word, Excel, or image file.");
  }

  if (file.size > maxFileSize) {
    throw new Error("Use a file smaller than 20 MB.");
  }

  const docName = docNameInput || safeFileName(file.name);
  const path = `${randomUUID()}-${safeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(COMPLIANCE_DOCUMENTS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase.from("compliance_filing_documents").insert({
    doc_category: docCategory,
    doc_name: docName,
    file_path: path,
    file_size: file.size,
    file_type: file.type,
    filing_id: (filingRow as { id: string }).id,
  });

  if (insertError) {
    await supabase.storage.from(COMPLIANCE_DOCUMENTS_BUCKET).remove([path]);
    throw new Error(`Could not save document record: ${insertError.message}`);
  }

  revalidateFiling(filingKey, periodKey);
}

export async function deleteComplianceDocument(id: string, filingKey: string, periodKey: string) {
  const supabase = await requireAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("compliance_filing_documents")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    throw new Error("Document not found.");
  }

  const { error: deleteRowError } = await supabase.from("compliance_filing_documents").delete().eq("id", id);

  if (deleteRowError) {
    throw new Error(`Could not delete document: ${deleteRowError.message}`);
  }

  await supabase.storage.from(COMPLIANCE_DOCUMENTS_BUCKET).remove([existing.file_path]);

  revalidateFiling(filingKey, periodKey);
}
