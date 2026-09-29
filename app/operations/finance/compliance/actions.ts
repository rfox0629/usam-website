"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  complianceFactKeys,
  recordComplianceFact,
  type ComplianceFactKey,
  type ComplianceVerificationState,
} from "@/src/lib/finance/facts";
import {
  loadComplianceCalendar,
  loadFinanceOrganization,
  loadTaxPeriods,
} from "@/src/lib/finance/workspace";
import {
  isAssignedDateSource,
  isFactSource,
  isFilingEvidenceSource,
  isUsamDeterminationSource,
  usamDeterminationLetterFacts,
  type ComplianceDocumentCandidate,
} from "@/src/lib/finance/compliance";
import { latestClosedRecurringTaxPeriod } from "@/src/lib/finance/tax-period";
import { loadOperationsDocuments, type OperationsDocument } from "@/src/lib/documents/library";

function fail(message: string): never {
  redirect(`/operations/finance/compliance?error=${encodeURIComponent(message)}`);
}

function text(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function stateValue(value: string): ComplianceVerificationState {
  return value === "verified" || value === "needs_cpa_review" || value === "cpa_confirmed"
    ? value
    : "suggested";
}

const determinationWorkflowFacts = new Set<ComplianceFactKey>([
  "exemption_classification",
  "exemption_effective_date",
  "fiscal_year_end_month",
  "form_990_required",
  "tax_year_type",
]);

function documentCandidate(document: OperationsDocument): ComplianceDocumentCandidate {
  return {
    category: document.category,
    documentType: document.documentType,
    id: document.id,
    title: document.title,
  };
}

async function authorizedDocument({
  authorization,
  documentId,
  organizationId,
}: {
  authorization: Awaited<ReturnType<typeof getOperationsAuthorization>>;
  documentId: string;
  organizationId: string;
}) {
  const { documents } = await loadOperationsDocuments({ authorization, organizationId });

  return documents.find((document) => document.id === documentId) ?? null;
}

async function linkDocument({
  actor,
  contextNote,
  documentId,
  referenceId,
  referenceType,
}: {
  actor: string;
  contextNote: string;
  documentId: string;
  referenceId: string;
  referenceType: "compliance_fact" | "compliance_filing" | "tax_period";
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("document_references").upsert({
    context_note: contextNote,
    created_by: actor,
    document_id: documentId,
    reference_id: referenceId,
    reference_type: referenceType,
  }, { onConflict: "document_id,reference_type,reference_id" });

  return error?.message ?? null;
}

async function loadRule(ruleKey: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("compliance_rules")
    .select("rule_key, rule_version, jurisdiction")
    .eq("rule_key", ruleKey)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { error: error?.message ?? null, rule: data };
}

async function ensureObligation({
  jurisdiction,
  organizationId,
  ruleKey,
}: {
  jurisdiction: string;
  organizationId: string;
  ruleKey: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("compliance_obligations")
    .upsert({
      jurisdiction,
      organization_id: organizationId,
      rule_key: ruleKey,
    }, { onConflict: "organization_id,rule_key" })
    .select("id")
    .single();

  return { error: error?.message ?? null, id: data?.id as string | undefined };
}

async function currentCalendar({ organizationId, today }: { organizationId: string; today: string }) {
  const periods = await loadTaxPeriods(organizationId);

  return loadComplianceCalendar({ organizationId, periods, today });
}

function saved(kind: string): never {
  revalidatePath("/operations/finance/compliance");
  revalidatePath("/operations/finance");
  revalidatePath("/operations/documents");
  redirect(`/operations/finance/compliance?saved=${encodeURIComponent(kind)}`);
}

/**
 * Confirm/correct a compliance fact. The database function atomically appends
 * the replacement and links the superseded row; no current value is overwritten.
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

  const factKeyValue = text(formData, "factKey");

  if (!complianceFactKeys.includes(factKeyValue as ComplianceFactKey)) {
    fail("Unknown compliance fact.");
  }

  const factKey = factKeyValue as ComplianceFactKey;

  if (determinationWorkflowFacts.has(factKey)) {
    fail("Use the accounting-period workflow to confirm the IRS determination facts together.");
  }

  const value = text(formData, "value");

  if (!value) {
    fail("Enter a value before confirming.");
  }

  const verificationState = stateValue(text(formData, "verificationState"));
  const sourceDocumentId = text(formData, "sourceDocumentId");

  if ((verificationState === "verified" || verificationState === "cpa_confirmed") && !sourceDocumentId) {
    fail("Select the source document before marking this fact verified.");
  }

  let sourceDocument: OperationsDocument | null = null;

  if (sourceDocumentId) {
    sourceDocument = await authorizedDocument({
      authorization,
      documentId: sourceDocumentId,
      organizationId: organization.id,
    });

    if (!sourceDocument) {
      fail("That source document is unavailable at your access level.");
    }

    if (!isFactSource(documentCandidate(sourceDocument), factKey)) {
      fail(`${sourceDocument.title} is not an appropriate source for ${factKey.replace(/_/g, " ")}.`);
    }
  }

  const result = await recordComplianceFact({
    actor: authorization.email,
    factKey,
    notes: text(formData, "notes") || null,
    organizationId: organization.id,
    sourceDocumentId: sourceDocument?.id ?? null,
    sourceReference: text(formData, "sourceReference") || null,
    value,
    verificationState,
  });

  if (result.error || !result.id) {
    fail(result.error ?? "Could not record the fact.");
  }

  if (sourceDocument) {
    const linkError = await linkDocument({
      actor: authorization.email,
      contextNote: `Source for ${factKey}`,
      documentId: sourceDocument.id,
      referenceId: result.id,
      referenceType: "compliance_fact",
    });

    if (linkError) {
      fail(`Fact saved, but its document link failed: ${linkError}`);
    }
  }

  saved("fact");
}

/** Records the date a state agency assigned, with its own authorized evidence. */
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
  const dueDate = text(formData, "assignedDueDate");
  const sourceDocumentId = text(formData, "sourceDocumentId");

  if (!ruleKey || !isDate(dueDate)) {
    fail("Enter the date the agency assigned.");
  }

  if (!sourceDocumentId) {
    fail("Select the agency record or filed report that shows this date.");
  }

  const [{ rule, error: ruleError }, sourceDocument] = await Promise.all([
    loadRule(ruleKey),
    authorizedDocument({ authorization, documentId: sourceDocumentId, organizationId: organization.id }),
  ]);

  if (ruleError || !rule) {
    fail(ruleError ?? "Compliance rule is unavailable.");
  }

  if (!sourceDocument) {
    fail("That source document is unavailable at your access level.");
  }

  if (!isAssignedDateSource(documentCandidate(sourceDocument))) {
    fail("Use an agency record or state filing document as the assigned-date source.");
  }

  const supabase = createSupabaseAdminClient();
  const verifiedAt = new Date().toISOString();
  const { data: obligation, error } = await supabase
    .from("compliance_obligations")
    .upsert({
      assigned_date_source_document_id: sourceDocument.id,
      assigned_date_verified_at: verifiedAt,
      assigned_date_verified_by: authorization.email,
      jurisdiction: rule.jurisdiction,
      organization_assigned_due_date: dueDate,
      organization_id: organization.id,
      rule_key: ruleKey,
    }, { onConflict: "organization_id,rule_key" })
    .select("id")
    .single();

  if (error || !obligation) {
    fail(error?.message ?? "Could not record the assigned date.");
  }

  const calendar = await currentCalendar({ organizationId: organization.id, today: verifiedAt.slice(0, 10) });
  const filing = calendar.find((item) => item.ruleKey === ruleKey);

  if (!filing?.dueDate) {
    fail("The assigned date was saved, but the filing deadline could not be calculated.");
  }

  const { data: filingRow, error: filingError } = await supabase
    .from("compliance_filings")
    .upsert({
      computed_due_date: filing.dueDate,
      computed_inputs: {
        ...filing.computedInputs,
        assignedDateSourceDocumentId: sourceDocument.id,
        assignedDateVerifiedAt: verifiedAt,
      },
      obligation_id: obligation.id,
      rule_version: filing.ruleVersion,
      status: filing.status === "filed_needs_evidence" ? "ready_for_review" : filing.status,
    }, { onConflict: "obligation_id,computed_due_date" })
    .select("id")
    .single();

  if (filingError || !filingRow) {
    fail(filingError?.message ?? "Could not preserve the assigned deadline snapshot.");
  }

  const linkError = await linkDocument({
    actor: authorization.email,
    contextNote: "Evidence for agency-assigned due date",
    documentId: sourceDocument.id,
    referenceId: filingRow.id,
    referenceType: "compliance_filing",
  });

  if (linkError) {
    fail(`Date saved, but its document link failed: ${linkError}`);
  }

  saved("assigned-date");
}

/**
 * Confirms the real USAM determination-letter facts and creates the latest
 * completed recurring fiscal year in one database transaction.
 */
export async function confirmAccountingPeriodAction(formData: FormData) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "finance")) {
    fail("Not authorized to verify tax periods.");
  }

  const organization = await loadFinanceOrganization();

  if (!organization) {
    fail("Organization record is unavailable.");
  }

  const sourceDocumentId = text(formData, "sourceDocumentId");

  if (!sourceDocumentId) {
    fail("Select the 501(c)(3) Approval Letter before confirming.");
  }

  const sourceDocument = await authorizedDocument({
    authorization,
    documentId: sourceDocumentId,
    organizationId: organization.id,
  });

  if (!sourceDocument) {
    fail("That source document is unavailable at your access level.");
  }

  if (!isUsamDeterminationSource(documentCandidate(sourceDocument))) {
    fail("Use the canonical 501(c)(3) Approval Letter for this confirmation.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const period = latestClosedRecurringTaxPeriod({
    asOf: today,
    fiscalYearEndMonth: usamDeterminationLetterFacts.fiscalYearEndMonth,
    taxYearType: usamDeterminationLetterFacts.taxYearType,
  });

  if (!period) {
    fail("The recurring fiscal year could not be constructed.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("confirm_recurring_tax_year", {
    p_actor: authorization.email,
    p_exemption_classification: usamDeterminationLetterFacts.publicCharityStatus,
    p_exemption_effective_date: usamDeterminationLetterFacts.exemptionEffectiveDate,
    p_fiscal_year_end_month: usamDeterminationLetterFacts.fiscalYearEndMonth,
    p_form_990_required: usamDeterminationLetterFacts.form990Required,
    p_organization_id: organization.id,
    p_period_end: period.periodEnd,
    p_period_start: period.periodStart,
    p_source_document_id: sourceDocument.id,
    p_source_reference: `IRS determination letter dated ${usamDeterminationLetterFacts.determinationDate}`,
    p_tax_year_type: usamDeterminationLetterFacts.taxYearType,
  });

  if (error) {
    fail(error.message);
  }

  saved("accounting-period");
}

/** Records a completed filing separately from its deadline and rule source. */
export async function recordComplianceFilingAction(formData: FormData) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "finance")) {
    fail("Not authorized to record filings.");
  }

  const organization = await loadFinanceOrganization();

  if (!organization) {
    fail("Organization record is unavailable.");
  }

  const ruleKey = text(formData, "ruleKey");
  const filedAt = text(formData, "filedAt");
  const confirmationReference = text(formData, "confirmationReference");
  const sourceDocumentId = text(formData, "sourceDocumentId");

  if (!ruleKey || !isDate(filedAt)) {
    fail("Enter the date the filing was submitted or accepted.");
  }

  if (filedAt > new Date().toISOString().slice(0, 10)) {
    fail("A filing date cannot be in the future.");
  }

  if (!confirmationReference) {
    fail("Enter the agency confirmation or receipt reference.");
  }

  if (!sourceDocumentId) {
    fail("Select the filing document or receipt used as evidence.");
  }

  const { rule, error: ruleError } = await loadRule(ruleKey);

  if (ruleError || !rule) {
    fail(ruleError ?? "Compliance rule is unavailable.");
  }

  const ensured = await ensureObligation({
    jurisdiction: rule.jurisdiction,
    organizationId: organization.id,
    ruleKey,
  });

  if (ensured.error || !ensured.id) {
    fail(ensured.error ?? "Could not create the filing obligation.");
  }

  const calendar = await currentCalendar({
    organizationId: organization.id,
    today: new Date().toISOString().slice(0, 10),
  });
  const filing = calendar.find((item) => item.ruleKey === ruleKey);

  if (!filing?.dueDate) {
    fail("Verify the filing deadline before recording completion.");
  }

  const sourceDocument = await authorizedDocument({
    authorization,
    documentId: sourceDocumentId,
    organizationId: organization.id,
  });

  if (!sourceDocument) {
    fail("That source document is unavailable at your access level.");
  }

  if (!isFilingEvidenceSource(documentCandidate(sourceDocument), filing.jurisdiction)) {
    fail("Select a filing confirmation document from the matching jurisdiction.");
  }

  const supabase = createSupabaseAdminClient();
  const reviewedAt = new Date().toISOString();
  const filingPayload = {
    computed_due_date: filing.dueDate,
    computed_inputs: filing.computedInputs,
    confirmation_reference: confirmationReference,
    filed_at: filedAt,
    filing_status: "filed",
    obligation_id: ensured.id,
    reviewed_at: reviewedAt,
    reviewed_by: authorization.email,
    rule_version: filing.ruleVersion,
    status: "filed",
    tax_period_id: filing.taxPeriod?.id ?? null,
    source_document_id: sourceDocument.id,
  };
  const { data: filingRow, error } = await supabase
    .from("compliance_filings")
    .upsert(filingPayload, { onConflict: "obligation_id,computed_due_date" })
    .select("id")
    .single();

  if (error || !filingRow) {
    fail(error?.message ?? "Could not record the filing.");
  }

  const linkError = await linkDocument({
    actor: authorization.email,
    contextNote: `Filed ${filedAt}; confirmation ${confirmationReference}`,
    documentId: sourceDocument.id,
    referenceId: filingRow.id,
    referenceType: "compliance_filing",
  });

  if (linkError) {
    fail(`Filing saved, but its document link failed: ${linkError}`);
  }

  saved("filing");
}
