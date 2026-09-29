import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  computeFilingDueDate,
  deriveFilingStatus,
  type ComplianceRule,
  type FilingStatus,
} from "@/src/lib/finance/deadlines";
import { selectFilingForCycle, type FilingRecordCandidate } from "@/src/lib/finance/compliance";
import { isFactVerified, loadComplianceFacts, type ComplianceFact } from "@/src/lib/finance/facts";
import { taxPeriodTypes, type TaxPeriodType } from "@/src/lib/finance/tax-period";

// Finance no longer owns storage; the canonical library does.
export { OPERATIONS_DOCUMENTS_BUCKET as FINANCE_DOCUMENTS_BUCKET } from "@/src/lib/documents/library";
export const USA_MISSIONARIES_SLUG = "usa-missionaries";

export const financeDocumentTypes = [
  "articles_of_incorporation",
  "irs_determination_letter",
  "form_1023",
  "ein_letter",
  "prior_990",
  "extension_confirmation",
  "state_annual_report",
  "charity_registration",
  "accounting_period_election",
  "cpa_letter",
  "bank_statement",
  "receipt",
  "other",
] as const;

export type FinanceDocumentType = typeof financeDocumentTypes[number];

export const financeDocumentTypeLabels: Record<FinanceDocumentType, string> = {
  accounting_period_election: "Accounting period election",
  articles_of_incorporation: "Articles of incorporation",
  bank_statement: "Bank statement",
  charity_registration: "Charity registration",
  cpa_letter: "CPA letter",
  ein_letter: "EIN confirmation letter",
  extension_confirmation: "Extension confirmation",
  form_1023: "Form 1023 / 1023-EZ",
  irs_determination_letter: "IRS determination letter",
  other: "Other",
  prior_990: "Prior Form 990",
  receipt: "Receipt",
  state_annual_report: "State annual report",
};

export type FinanceTaxPeriod = {
  id: string;
  isVerified: boolean;
  label: string;
  periodEnd: string | null;
  periodStart: string | null;
  periodType: TaxPeriodType;
  shortPeriodReason: string | null;
  sourceDocumentId: string | null;
  status: string;
};

export type FinanceFiling = {
  agency: string;
  assignedDateSourceDocumentId: string | null;
  assignedDateVerifiedAt: string | null;
  assignedDateVerifiedBy: string | null;
  confirmationReference: string | null;
  computedInputs: Record<string, unknown>;
  dueDate: string | null;
  extensionDueDate: string | null;
  filedAt: string | null;
  filingState: "not_filed" | "reported_filed" | "filed";
  filingName: string;
  filingSourceDocumentId: string | null;
  id: string | null;
  jurisdiction: string;
  obligationId: string | null;
  reason: string;
  ruleKey: string;
  ruleLastVerifiedAt: string | null;
  ruleLastVerifiedBy: string | null;
  ruleVersion: string;
  sourceNote: string | null;
  sourceUrl: string | null;
  status: FilingStatus;
  taxPeriod: FinanceTaxPeriod | null;
};

export type FinanceOrganization = {
  id: string;
  name: string;
  slug: string;
};

function documentTypeLabel(value: string) {
  return financeDocumentTypeLabels[value as FinanceDocumentType] ?? "Document";
}

export async function loadFinanceOrganization(): Promise<FinanceOrganization | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", USA_MISSIONARIES_SLUG)
    .maybeSingle();

  return data ? (data as FinanceOrganization) : null;
}

export async function loadTaxPeriods(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("tax_periods")
    .select("id, label, period_start, period_end, period_type, short_period_reason, is_verified, source_document_id, status")
    .eq("organization_id", organizationId)
    .order("period_end", { ascending: false, nullsFirst: false });

  return ((data ?? []) as {
    id: string;
    is_verified: boolean;
    label: string;
    period_end: string | null;
    period_start: string | null;
    period_type: string;
    short_period_reason: string | null;
    source_document_id: string | null;
    status: string;
  }[]).map((row) => ({
    id: row.id,
    isVerified: row.is_verified,
    label: row.label,
    periodEnd: row.period_end,
    periodStart: row.period_start,
    periodType: taxPeriodTypes.includes(row.period_type as TaxPeriodType)
      ? (row.period_type as TaxPeriodType)
      : "calendar",
    shortPeriodReason: row.short_period_reason,
    sourceDocumentId: row.source_document_id,
    status: row.status,
  })) satisfies FinanceTaxPeriod[];
}

type RuleRow = {
  agency: string;
  authoritative_source_note: string | null;
  authoritative_source_url: string | null;
  business_day_adjustment: boolean;
  calculation_config: Record<string, unknown>;
  calculation_type: ComplianceRule["calculationType"];
  extension_available: boolean;
  extension_form: string | null;
  extension_months: number | null;
  filing_name: string;
  jurisdiction: string;
  last_verified_at: string | null;
  last_verified_by: string | null;
  rule_key: string;
  rule_version: string;
};

function ruleFromRow(row: RuleRow): ComplianceRule {
  return {
    businessDayAdjustment: row.business_day_adjustment,
    calculationConfig: row.calculation_config ?? {},
    calculationType: row.calculation_type,
    extensionAvailable: row.extension_available,
    extensionForm: row.extension_form,
    extensionMonths: row.extension_months,
    filingName: row.filing_name,
    jurisdiction: row.jurisdiction,
    ruleKey: row.rule_key,
    ruleVersion: row.rule_version,
  };
}

/**
 * Builds the filing calendar from curated rules plus verified organization
 * facts. Rules are read from the registry; nothing is researched at runtime.
 */
export async function loadComplianceCalendar({
  organizationId,
  periods,
  today,
}: {
  organizationId: string;
  periods: FinanceTaxPeriod[];
  today: string;
}) {
  const supabase = createSupabaseAdminClient();
  const [rulesResult, obligationsResult] = await Promise.all([
    supabase
      .from("compliance_rules")
      .select("rule_key, rule_version, jurisdiction, filing_name, agency, calculation_type, calculation_config, business_day_adjustment, extension_available, extension_form, extension_months, authoritative_source_url, authoritative_source_note, last_verified_at, last_verified_by")
      .order("jurisdiction"),
    supabase
      .from("compliance_obligations")
      .select("id, rule_key, is_applicable, organization_assigned_due_date, assigned_date_source_document_id, assigned_date_verified_by, assigned_date_verified_at")
      .eq("organization_id", organizationId),
  ]);

  type ObligationRow = {
    assigned_date_source_document_id: string | null;
    assigned_date_verified_at: string | null;
    assigned_date_verified_by: string | null;
    id: string;
    is_applicable: boolean;
    organization_assigned_due_date: string | null;
    rule_key: string;
  };
  type FilingRow = {
    computed_due_date: string | null;
    computed_inputs: Record<string, unknown> | null;
    confirmation_reference: string | null;
    extension_due_date: string | null;
    extension_filed: boolean;
    filed_at: string | null;
    filing_status: string | null;
    id: string;
    obligation_id: string;
    rule_version: string | null;
    source_document_id: string | null;
    status: string;
    tax_period_id: string | null;
    updated_at: string;
  };

  const obligationRows = (obligationsResult.data ?? []) as ObligationRow[];
  const obligationIds = obligationRows.map((row) => row.id);
  const filingsResult = obligationIds.length > 0
    ? await supabase
      .from("compliance_filings")
      .select("id, obligation_id, tax_period_id, rule_version, computed_due_date, computed_inputs, status, filing_status, filed_at, extension_filed, extension_due_date, confirmation_reference, source_document_id, updated_at")
      .in("obligation_id", obligationIds)
    : { data: [] as FilingRow[], error: null };
  const filingRows = (filingsResult.data ?? []) as FilingRow[];
  const obligations = new Map(
    (obligationRows as {
      assigned_date_source_document_id: string | null;
      assigned_date_verified_at: string | null;
      assigned_date_verified_by: string | null;
      id: string;
      is_applicable: boolean;
      organization_assigned_due_date: string | null;
      rule_key: string;
    }[]).map((row) => [row.rule_key, row]),
  );
  const filingCandidates: FilingRecordCandidate[] = filingRows.map((row) => ({
    computedDueDate: row.computed_due_date,
    filedAt: row.filed_at,
    filingState: row.filing_status,
    id: row.id,
    obligationId: row.obligation_id,
    taxPeriodId: row.tax_period_id,
    updatedAt: row.updated_at,
  }));

  // Only a verified period may drive a federal deadline.
  const verifiedPeriod = periods.find((period) => period.isVerified && period.periodEnd) ?? null;
  const filings: FinanceFiling[] = [];

  for (const row of (rulesResult.data ?? []) as RuleRow[]) {
    const rule = ruleFromRow(row);
    const obligation = obligations.get(rule.ruleKey);

    if (obligation && obligation.is_applicable === false) {
      continue;
    }

    // A deadline requires a concrete, verified tax_period. A standalone first
    // period fact is not enough and can never make formation/exemption dates
    // act as a tax-period start.
    const periodEnd = verifiedPeriod?.periodEnd ?? null;
    const periodEndVerified = Boolean(verifiedPeriod);

    const computed = computeFilingDueDate(rule, {
      organizationAssignedDueDate: obligation?.organization_assigned_due_date ?? null,
      periodEnd,
      periodEndVerified,
    });
    const existingCandidate = obligation
      ? selectFilingForCycle(filingCandidates, {
        dueDate: computed.dueDate,
        obligationId: obligation.id,
        taxPeriodId: verifiedPeriod?.id ?? null,
      })
      : null;
    const existing = existingCandidate
      ? filingRows.find((filing) => filing.id === existingCandidate.id) ?? null
      : null;

    filings.push({
      agency: row.agency,
      assignedDateSourceDocumentId: obligation?.assigned_date_source_document_id ?? null,
      assignedDateVerifiedAt: obligation?.assigned_date_verified_at ?? null,
      assignedDateVerifiedBy: obligation?.assigned_date_verified_by ?? null,
      confirmationReference: existing?.confirmation_reference ?? null,
      computedInputs: computed.computedInputs,
      dueDate: computed.dueDate,
      extensionDueDate: existing?.extension_due_date ?? computed.extensionDueDate,
      filedAt: existing?.filed_at ?? null,
      filingState: existing?.filing_status === "filed" || existing?.filing_status === "reported_filed"
        ? existing.filing_status
        : "not_filed",
      filingName: rule.filingName,
      filingSourceDocumentId: existing?.source_document_id ?? null,
      id: existing?.id ?? null,
      jurisdiction: rule.jurisdiction,
      obligationId: obligation?.id ?? null,
      reason: computed.reason,
      ruleKey: rule.ruleKey,
      ruleLastVerifiedAt: row.last_verified_at,
      ruleLastVerifiedBy: row.last_verified_by,
      ruleVersion: rule.ruleVersion,
      sourceNote: row.authoritative_source_note,
      sourceUrl: row.authoritative_source_url,
      status: deriveFilingStatus({
        dueDate: computed.dueDate,
        extensionDueDate: existing?.extension_due_date ?? computed.extensionDueDate,
        extensionFiled: existing?.extension_filed ?? false,
        filingEvidenceComplete: Boolean(
          existing?.filed_at
          && existing.confirmation_reference
          && existing.source_document_id,
        ),
        filingState: existing?.filing_status === "filed" || existing?.filing_status === "reported_filed"
          ? existing.filing_status
          : "not_filed",
        filedAt: existing?.filed_at ?? null,
        today,
      }),
      taxPeriod: verifiedPeriod,
    });
  }

  return filings;
}

export type FinanceBankingSummary = {
  accounts: { id: string; institution: string | null; last4: string | null; name: string }[];
  missingStatements: number;
  statementsByStatus: Record<string, number>;
  unreconciledTransactions: number;
};

export async function loadBankingSummary(organizationId: string): Promise<FinanceBankingSummary> {
  const supabase = createSupabaseAdminClient();
  const [accountsResult, statementsResult, transactionsResult] = await Promise.all([
    supabase
      .from("bank_accounts")
      .select("id, name, institution, last4")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("bank_statements")
      .select("status")
      .eq("organization_id", organizationId),
    supabase
      .from("bank_transactions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .neq("review_status", "reconciled"),
  ]);

  const statementsByStatus: Record<string, number> = {};

  for (const row of (statementsResult.data ?? []) as { status: string }[]) {
    statementsByStatus[row.status] = (statementsByStatus[row.status] ?? 0) + 1;
  }

  return {
    accounts: (accountsResult.data ?? []) as FinanceBankingSummary["accounts"],
    missingStatements: statementsByStatus.missing ?? 0,
    statementsByStatus,
    unreconciledTransactions: transactionsResult.count ?? 0,
  };
}

export type FinanceOverview = {
  banking: FinanceBankingSummary;
  documentCount: number;
  facts: Map<string, ComplianceFact>;
  filings: FinanceFiling[];
  givingTotalLabel: string;
  organization: FinanceOrganization | null;
  periods: FinanceTaxPeriod[];
  unverifiedFactCount: number;
};

export async function loadFinanceOverview({ today }: { today: string }): Promise<FinanceOverview | null> {
  const organization = await loadFinanceOrganization();

  if (!organization) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const [{ facts }, periods, banking, documentsCount, givingResult] = await Promise.all([
    loadComplianceFacts(organization.id),
    loadTaxPeriods(organization.id),
    loadBankingSummary(organization.id),
    supabase
      .from("operations_documents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .is("superseded_at", null),
    supabase
      .from("pco_giving_records")
      .select("gross_amount, attribution_kind, refunded"),
  ]);

  const filings = await loadComplianceCalendar({
    organizationId: organization.id,
    periods,
    today,
  });

  const givingTotal = ((givingResult.data ?? []) as {
    attribution_kind: string | null;
    gross_amount: number | string | null;
    refunded: boolean | null;
  }[])
    .filter((row) => row.refunded !== true)
    .reduce((sum, row) => sum + (Number(row.gross_amount) || 0), 0);

  const unverifiedFactCount = Array.from(facts.values())
    .filter((fact) => !isFactVerified(fact)).length;

  return {
    banking,
    documentCount: documentsCount.count ?? 0,
    facts,
    filings,
    givingTotalLabel: new Intl.NumberFormat("en-US", {
      currency: "USD",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(givingTotal),
    organization,
    periods,
    unverifiedFactCount,
  };
}
