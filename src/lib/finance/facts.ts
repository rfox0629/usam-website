import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { appendOnlyFactSnapshot } from "@/src/lib/finance/compliance";

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
  "form_990_required",
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
  form_990_required: "Form 990 / 990-EZ / 990-N required",
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
  "fiscal_year_end_month",
];

type FactRow = {
  operations_documents: { title: string } | null;
  created_at?: string;
  fact_key: string;
  id: string;
  notes: string | null;
  source_document_id: string | null;
  source_reference: string | null;
  superseded_at?: string | null;
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
    sourceDocumentTitle: row.operations_documents?.title ?? null,
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

/** Current facts plus version counts for visible append-only history. */
export async function loadComplianceFacts(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("compliance_facts")
    .select("id, fact_key, value_text, value_date, value_number, verification_state, source_document_id, source_reference, verified_by, verified_at, notes, superseded_at, created_at, operations_documents:source_document_id(title)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      error: error.message,
      facts: new Map<string, ComplianceFact>(),
      historyCounts: new Map<string, number>(),
    };
  }

  const rows = ((data ?? []) as unknown as FactRow[]).map((row) => ({
    factKey: row.fact_key,
    id: row.id,
    row,
    supersededAt: row.superseded_at,
  }));
  const { currentIds, historyCounts } = appendOnlyFactSnapshot(rows);
  const facts = new Map<string, ComplianceFact>();

  for (const item of rows) {
    if (currentIds.get(item.factKey) === item.id) {
      facts.set(item.factKey, factFromRow(item.row));
    }
  }

  return { facts, historyCounts };
}

export function isFactVerified(fact: ComplianceFact | undefined) {
  return fact?.verificationState === "verified" || fact?.verificationState === "cpa_confirmed";
}

/**
 * Records a fact through the USA-190 transactional database function. The
 * supersede and insert happen atomically, so the one-current-fact index cannot
 * reject corrections and a failed replacement cannot leave the fact missing.
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

  const { data: insertedId, error } = await supabase.rpc("record_compliance_fact", {
    p_created_by: actor,
    p_fact_key: factKey,
    p_notes: notes ?? null,
    p_organization_id: organizationId,
    p_source_document_id: sourceDocumentId ?? null,
    p_source_reference: sourceReference ?? null,
    p_value_date: isDate ? value.trim() : null,
    p_value_number: null,
    p_value_text: isDate ? null : value.trim(),
    p_verification_state: verificationState,
    p_verified_at: verified ? new Date().toISOString() : null,
    p_verified_by: verified ? actor : null,
  });

  if (error || !insertedId) {
    return { error: error?.message ?? "Could not record the fact." };
  }

  return { id: insertedId as string };
}

/** Full audit history for one fact, newest first. */
export async function loadFactHistory(organizationId: string, factKey: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("compliance_facts")
    .select("id, fact_key, value_text, value_date, value_number, verification_state, source_document_id, source_reference, verified_by, verified_at, notes, operations_documents:source_document_id(title)")
    .eq("organization_id", organizationId)
    .eq("fact_key", factKey)
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as FactRow[]).map(factFromRow);
}
