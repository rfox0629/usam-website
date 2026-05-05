"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/src/lib/supabase/server";

const uploadBucket = "financial-freedom-uploads";
const maxUploadFiles = 3;
const maxTotalUploadBytes = 4 * 1024 * 1024;

const allowedFileTypes: Record<string, string> = {
  ".csv": "text/csv",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getOptionalString(formData: FormData, name: string) {
  const value = getString(formData, name);

  return value ? value : null;
}

function getBoolean(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function getOptionalNumber(formData: FormData, name: string) {
  const rawValue = getString(formData, name).replace(/[$,\s]/g, "");

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);

  return Number.isFinite(value) ? value : null;
}

function getExtension(fileName: string) {
  const normalizedName = fileName.toLowerCase();
  const dotIndex = normalizedName.lastIndexOf(".");

  return dotIndex >= 0 ? normalizedName.slice(dotIndex) : "";
}

function safeFileName(fileName: string) {
  const trimmedName = fileName.trim() || "upload";

  return trimmedName
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function getUploadFiles(formData: FormData) {
  return formData
    .getAll("uploads")
    .filter((value): value is File => value instanceof File && value.size > 0 && Boolean(value.name));
}

function validateUploadFiles(files: File[]) {
  if (files.length === 0) {
    return true;
  }

  if (files.length > maxUploadFiles) {
    return false;
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > maxTotalUploadBytes) {
    return false;
  }

  return files.every((file) => getExtension(file.name) in allowedFileTypes);
}

async function uploadInquiryFiles(inquiryId: string, files: File[]) {
  if (files.length === 0) {
    return true;
  }

  if (!validateUploadFiles(files) || !isSupabaseAdminConfigured()) {
    return false;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  let uploadedAllFiles = true;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const extension = getExtension(file.name);
    const contentType = allowedFileTypes[extension] ?? file.type;
    const filePath = `financial-freedom/${inquiryId}/${Date.now()}-${index}-${safeFileName(file.name)}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(uploadBucket)
      .upload(filePath, file, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      uploadedAllFiles = false;
      continue;
    }

    const { error: metadataError } = await supabaseAdmin
      .from("financial_freedom_uploads")
      .insert({
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: contentType,
        inquiry_id: inquiryId,
      });

    if (metadataError) {
      uploadedAllFiles = false;
    }
  }

  return uploadedAllFiles;
}

export async function submitFinancialFreedomInquiry(formData: FormData) {
  const inquiryId = randomUUID();
  const fullName = getString(formData, "full_name");
  const email = getString(formData, "email").toLowerCase();
  const acceptedAdviceScope = getBoolean(formData, "consent_not_advice");
  const acceptedVoluntarySubmission = getBoolean(formData, "consent_voluntary_submission");
  const acceptedRedactionResponsibility = getBoolean(formData, "consent_redacted_uploads");
  const uploadFiles = getUploadFiles(formData);

  if (!fullName || !email) {
    redirect("/financialfreedom?error=missing");
  }

  if (!acceptedAdviceScope || !acceptedVoluntarySubmission || !acceptedRedactionResponsibility) {
    redirect("/financialfreedom?error=consent");
  }

  if (!isSupabaseServerConfigured()) {
    redirect("/financialfreedom?error=config");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("financial_freedom_inquiries")
    .insert({
      current_savings: getOptionalNumber(formData, "current_savings"),
      consent_not_advice: acceptedAdviceScope,
      consent_voluntary_submission: acceptedVoluntarySubmission,
      desired_12_month_outcome: getOptionalString(formData, "desired_12_month_outcome"),
      email,
      full_name: fullName,
      help_budget: getBoolean(formData, "help_budget"),
      help_debt: getBoolean(formData, "help_debt"),
      help_generosity: getBoolean(formData, "help_generosity"),
      help_overall_plan: getBoolean(formData, "help_overall_plan"),
      help_retirement: getBoolean(formData, "help_retirement"),
      help_savings: getBoolean(formData, "help_savings"),
      id: inquiryId,
      main_financial_burden: getOptionalString(formData, "main_financial_burden"),
      monthly_debt_payments: getOptionalNumber(formData, "monthly_debt_payments"),
      monthly_expenses: getOptionalNumber(formData, "monthly_expenses"),
      monthly_giving: getOptionalNumber(formData, "monthly_giving"),
      monthly_income: getOptionalNumber(formData, "monthly_income"),
      phone: getOptionalString(formData, "phone"),
      status: "new",
      total_debt: getOptionalNumber(formData, "total_debt"),
    });

  if (error) {
    redirect("/financialfreedom?error=submit");
  }

  const uploadedAllFiles = await uploadInquiryFiles(inquiryId, uploadFiles);

  if (!uploadedAllFiles) {
    redirect("/financialfreedom?submitted=1&upload=partial");
  }

  redirect("/financialfreedom?submitted=1");
}
