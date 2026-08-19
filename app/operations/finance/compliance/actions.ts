"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { recordComplianceFact, type ComplianceVerificationState } from "@/src/lib/finance/facts";
import { loadFinanceOrganization } from "@/src/lib/finance/workspace";
import { validateTaxYearDefinition } from "@/src/lib/finance/tax-period";

function fail(message: string): never {
  redirect(`/operations/finance/compliance?error=${encodeURIComponent(message)}`);
}

function text(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function stateValue(value: string): ComplianceVerificationState {
  return value === "verified" || value === "needs_cpa_review" || value === "cpa_confirmed"
    ? value
    : "suggested";
}

/**
 * Confirm/correct a compliance fact. Always appends a new fact row; a verified
 * value is superseded with history, never overwritten.
 */
export async function recordComplianceFactAction(formData: FormData) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "finance")) {
    fail("Not authorized to record compliance facts.");
  }

  const organization = await loadFinanceOrganization();

  if (!organization) {
    fail("Organization record is unavailable.");
  }

  const factKey = text(formData, "factKey");
  const value = text(formData, "value");

  if (!factKey) {
    fail("Missing fact.");
  }

  if (!value) {
    fail("Enter a value before confirming.");
  }

  const verificationState = stateValue(text(formData, "verificationState"));
  const sourceDocumentId = text(formData, "sourceDocumentId");

  // Recurring tax-year facts are validated against the IRS accounting-period
  // rules before they can be recorded, so an incorporation anniversary cannot
  // be promoted into a recurring fiscal year end.
  if (factKey === "tax_year_type") {
    const validation = validateTaxYearDefinition({ taxYearType: value });

    if (!validation.ok) {
      fail(validation.errors[0]);
    }
  }

  if (factKey === "fiscal_year_end_month") {
    const validation = validateTaxYearDefinition({
      fiscalYearEndMonth: value,
      taxYearType: "fiscal",
    });

    if (!validation.ok) {
      fail(validation.errors[0]);
    }
  }

  // A verified compliance fact must cite the document that backs it.
  if ((verificationState === "verified" || verificationState === "cpa_confirmed") && !sourceDocumentId) {
    fail("Attach the source document before marking this fact verified.");
  }

  const { error } = await recordComplianceFact({
    actor: authorization.email,
    factKey,
    notes: text(formData, "notes") || null,
    organizationId: organization.id,
    sourceDocumentId: sourceDocumentId || null,
    sourceReference: text(formData, "sourceReference") || null,
    value,
    verificationState,
  });

  if (error) {
    fail(error);
  }

  revalidatePath("/operations/finance/compliance");
  revalidatePath("/operations/finance");
  redirect("/operations/finance/compliance?saved=1");
}

/** Records the due date a state agency assigned to this organization. */
export async function recordAssignedDueDateAction(formData: FormData) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "finance")) {
    fail("Not authorized to record filing dates.");
  }

  const organization = await loadFinanceOrganization();

  if (!organization) {
    fail("Organization record is unavailable.");
  }

  const ruleKey = text(formData, "ruleKey");
  const jurisdiction = text(formData, "jurisdiction");
  const dueDate = text(formData, "assignedDueDate");
  const sourceDocumentId = text(formData, "sourceDocumentId");

  if (!ruleKey || !dueDate) {
    fail("Enter the date the agency assigned.");
  }

  if (!sourceDocumentId) {
    fail("Attach the agency record or filed report that shows this date.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("compliance_obligations")
    .upsert({
      assigned_date_source_document_id: sourceDocumentId,
      assigned_date_verified_at: new Date().toISOString(),
      assigned_date_verified_by: authorization.email,
      jurisdiction,
      organization_assigned_due_date: dueDate,
      organization_id: organization.id,
      rule_key: ruleKey,
    }, { onConflict: "organization_id,rule_key" });

  if (error) {
    fail(error.message);
  }

  revalidatePath("/operations/finance/compliance");
  revalidatePath("/operations/finance");
  redirect("/operations/finance/compliance?saved=1");
}
