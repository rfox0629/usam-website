import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

/**
 * Compliance-critical fact keys. Open text in the database so new facts need no
 * migration, but enumerated here so application code stays type-safe.
 */
export const complianceFactKeys = [
  "legal_name",
  "ein",
  "entity_type",
  "exemption_classification",
  "formation_state",
  "formation_date",
  "exemption_effective_date",
  "accounting_method",
  "tax_year_type",
  "fiscal_year_end_month",
  "first_period_start",
  "first_period_end",
] as const;

export type ComplianceFactKey = typeof complianceFactKeys[number];

export type ComplianceVerificationState =
  | "suggested"
  | "verified"
  | "needs_cpa_review"
  | "cpa_confirmed";

export type ComplianceFact = {
  factKey: string;
  id: string;
  notes: string | null;
  sourceDocumentId: string | null;
  sourceDocumentTitle: string | null;
  sourceReference: string | null;
  value: string | null;
  verificationState: ComplianceVerificationState;
  verifiedAt: string | null;
  verifiedBy: string | null;
};

export const complianceFactLabels: Record<ComplianceFactKey, string> = {
  accounting_method: "Accounting method",
  ein: "EIN",
  entity_type: "Entity type",
  exemption_classification: "Exemption classification",
  exemption_effective_date: "IRS exemption effective date",
  first_period_end: "First tax period end",
  first_period_start: "First tax period start",
  formation_date: "Formation date",
  formation_state: "Formation state",
  legal_name: "Legal entity name",
  fiscal_year_end_month: "Fiscal year end month",
  tax_year_type: "Tax year type (calendar or fiscal)",
};

/**
 * Facts that must be verified before the product will state a 990 due date.
 * formation_date is deliberately absent: an incorporation date is not a tax
 * year end and never contributes to one.
 */
export const taxPeriodCriticalFacts: ComplianceFactKey[] = [
  "tax_year_type",
  "first_period_end",
];

type FactRow = {
  finance_documents: { title: string } | null;
  fact_key: string;
  id: string;
  notes: string | null;
  source_document_id: string | null;
  source_reference: string | null;
  value_date: string | null;
  value_number: number | string | null;
  value_text: string | null;
  verification_state: string;
  verified_at: string | null;
  verified_by: string | null;
};

function factValue(row: FactRow) {
  if (row.value_text) {
    return row.value_text;
  }

  if (row.value_date) {
    return row.value_date;
  }

  if (row.value_number !== null && row.value_number !== undefined) {
    return String(row.value_number);
  }

  return null;
}

function factFromRow(row: FactRow): ComplianceFact {
  const state = row.verification_state;

  return {
    factKey: row.fact_key,
    id: row.id,
    notes: row.notes,
    sourceDocumentId: row.source_document_id,
    sourceDocumentTitle: row.finance_documents?.title ?? null,
    sourceReference: row.source_reference,
    value: factValue(row),
    verificationState: (
      state === "verified" || state === "needs_cpa_review" || state === "cpa_confirmed"
        ? state
        : "suggested"
    ),
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
  };
}

/** Current (non-superseded) facts for an organization, keyed by fact_key. */
export async function loadComplianceFacts(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("compliance_facts")
    .select("id, fact_key, value_text, value_date, value_number, verification_state, source_document_id, source_reference, verified_by, verified_at, notes, finance_documents:source_document_id(title)")
    .eq("organization_id", organizationId)
    .is("superseded_at", null);

  if (error) {
    return { error: error.message, facts: new Map<string, ComplianceFact>() };
  }

  const facts = new Map<string, ComplianceFact>();

  for (const row of (data ?? []) as unknown as FactRow[]) {
    facts.set(row.fact_key, factFromRow(row));
  }

  return { facts };
}

export function isFactVerified(fact: ComplianceFact | undefined) {
  return fact?.verificationState === "verified" || fact?.verificationState === "cpa_confirmed";
}

/**
 * Records a fact by superseding the current row and inserting a new one. There
 * is no code path that updates a live fact in place, which is what makes
 * "never silently change a verified value" structural rather than a convention.
 */
export async function recordComplianceFact({
  actor,
  factKey,
  notes,
  organizationId,
  sourceDocumentId,
  sourceReference,
  value,
  verificationState,
}: {
  actor: string;
  factKey: string;
  notes?: string | null;
  organizationId: string;
  sourceDocumentId?: string | null;
  sourceReference?: string | null;
  value: string;
  verificationState: ComplianceVerificationState;
}) {
  const supabase = createSupabaseAdminClient();
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  const verified = verificationState === "verified" || verificationState === "cpa_confirmed";

  const { data: current } = await supabase
    .from("compliance_facts")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("fact_key", factKey)
    .is("superseded_at", null)
    .maybeSingle();

  const { data: inserted, error } = await supabase
    .from("compliance_facts")
    .insert({
      created_by: actor,
      fact_key: factKey,
      notes: notes ?? null,
      organization_id: organizationId,
      source_document_id: sourceDocumentId ?? null,
      source_reference: sourceReference ?? null,
      value_date: isDate ? value.trim() : null,
      value_text: isDate ? null : value.trim(),
      verification_state: verificationState,
      verified_at: verified ? new Date().toISOString() : null,
      verified_by: verified ? actor : null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Could not record the fact." };
  }

  if (current?.id) {
    await supabase
      .from("compliance_facts")
      .update({ superseded_at: new Date().toISOString(), superseded_by_fact_id: inserted.id })
      .eq("id", current.id);
  }

  return { id: inserted.id as string };
}

/** Full audit history for one fact, newest first. */
export async function loadFactHistory(organizationId: string, factKey: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("compliance_facts")
    .select("id, fact_key, value_text, value_date, value_number, verification_state, source_document_id, source_reference, verified_by, verified_at, notes, finance_documents:source_document_id(title)")
    .eq("organization_id", organizationId)
    .eq("fact_key", factKey)
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as FactRow[]).map(factFromRow);
}
