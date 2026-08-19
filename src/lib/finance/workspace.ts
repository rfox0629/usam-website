import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  computeFilingDueDate,
  deriveFilingStatus,
  type ComplianceRule,
  type FilingStatus,
} from "@/src/lib/finance/deadlines";
import { isFactVerified, loadComplianceFacts, type ComplianceFact } from "@/src/lib/finance/facts";
import { taxPeriodTypes, type TaxPeriodType } from "@/src/lib/finance/tax-period";

export const FINANCE_DOCUMENTS_BUCKET = "finance-documents";
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

export type FinanceDocument = {
  documentType: string;
  documentTypeLabel: string;
  fileName: string;
  fileSize: number | null;
  id: string;
  status: string;
  title: string;
  uploadedAt: string;
  uploadedBy: string | null;
  /** Where this document is currently used, for the evidence trail. */
  usedFor: string[];
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
  computedInputs: Record<string, unknown>;
  dueDate: string | null;
  extensionDueDate: string | null;
  filingName: string;
  id: string | null;
  jurisdiction: string;
  reason: string;
  ruleKey: string;
  ruleVersion: string;
  sourceNote: string | null;
  sourceUrl: string | null;
  status: FilingStatus;
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

export async function loadFinanceDocuments(organizationId: string, limit = 100) {
  const supabase = createSupabaseAdminClient();
  const [documentsResult, factsResult, obligationsResult, periodsResult] = await Promise.all([
    supabase
      .from("finance_documents")
      .select("id, document_type, title, file_name, file_size, status, uploaded_by, uploaded_at")
      .eq("organization_id", organizationId)
      .is("superseded_at", null)
      .order("uploaded_at", { ascending: false })
      .limit(limit),
    supabase
      .from("compliance_facts")
      .select("source_document_id, fact_key")
      .eq("organization_id", organizationId)
      .is("superseded_at", null)
      .not("source_document_id", "is", null),
    supabase
      .from("compliance_obligations")
      .select("assigned_date_source_document_id, rule_key")
      .eq("organization_id", organizationId)
      .not("assigned_date_source_document_id", "is", null),
    supabase
      .from("tax_periods")
      .select("source_document_id, label")
      .eq("organization_id", organizationId)
      .not("source_document_id", "is", null),
  ]);

  if (documentsResult.error) {
    return { documents: [] as FinanceDocument[], error: documentsResult.error.message };
  }

  // Reverse index: everything that cites a document declares what it is used for.
  const usage = new Map<string, string[]>();
  const addUsage = (id: string | null, label: string) => {
    if (!id) {
      return;
    }

    usage.set(id, [...(usage.get(id) ?? []), label]);
  };

  for (const row of (factsResult.data ?? []) as { fact_key: string; source_document_id: string }[]) {
    addUsage(row.source_document_id, row.fact_key.replace(/_/g, " "));
  }

  for (const row of (obligationsResult.data ?? []) as { assigned_date_source_document_id: string; rule_key: string }[]) {
    addUsage(row.assigned_date_source_document_id, `${row.rule_key.replace(/_/g, " ")} due date`);
  }

  for (const row of (periodsResult.data ?? []) as { label: string; source_document_id: string }[]) {
    addUsage(row.source_document_id, `Tax period ${row.label}`);
  }

  const documents = ((documentsResult.data ?? []) as {
    document_type: string;
    file_name: string;
    file_size: number | null;
    id: string;
    status: string;
    title: string;
    uploaded_at: string;
    uploaded_by: string | null;
  }[]).map((row) => ({
    documentType: row.document_type,
    documentTypeLabel: documentTypeLabel(row.document_type),
    fileName: row.file_name,
    fileSize: row.file_size,
    id: row.id,
    status: row.status,
    title: row.title,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
    usedFor: usage.get(row.id) ?? [],
  }));

  return { documents };
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
  facts,
  organizationId,
  periods,
  today,
}: {
  facts: Map<string, ComplianceFact>;
  organizationId: string;
  periods: FinanceTaxPeriod[];
  today: string;
}) {
  const supabase = createSupabaseAdminClient();
  const [rulesResult, obligationsResult, filingsResult] = await Promise.all([
    supabase
      .from("compliance_rules")
      .select("rule_key, rule_version, jurisdiction, filing_name, agency, calculation_type, calculation_config, business_day_adjustment, extension_available, extension_form, extension_months, authoritative_source_url, authoritative_source_note")
      .order("jurisdiction"),
    supabase
      .from("compliance_obligations")
      .select("id, rule_key, is_applicable, organization_assigned_due_date")
      .eq("organization_id", organizationId),
    supabase
      .from("compliance_filings")
      .select("id, obligation_id, status, filed_at, extension_filed, extension_due_date, confirmation_reference"),
  ]);

  const obligations = new Map(
    ((obligationsResult.data ?? []) as {
      id: string;
      is_applicable: boolean;
      organization_assigned_due_date: string | null;
      rule_key: string;
    }[]).map((row) => [row.rule_key, row]),
  );
  const filingsByObligation = new Map(
    ((filingsResult.data ?? []) as {
      confirmation_reference: string | null;
      extension_due_date: string | null;
      extension_filed: boolean;
      filed_at: string | null;
      id: string;
      obligation_id: string;
      status: string;
    }[]).map((row) => [row.obligation_id, row]),
  );

  // Only a verified period may drive a federal deadline.
  const verifiedPeriod = periods.find((period) => period.isVerified && period.periodEnd) ?? null;
  const firstPeriodEndFact = facts.get("first_period_end");

  const filings: FinanceFiling[] = [];

  for (const row of (rulesResult.data ?? []) as RuleRow[]) {
    const rule = ruleFromRow(row);
    const obligation = obligations.get(rule.ruleKey);

    if (obligation && obligation.is_applicable === false) {
      continue;
    }

    const periodEnd = verifiedPeriod?.periodEnd
      ?? (isFactVerified(firstPeriodEndFact) ? firstPeriodEndFact?.value ?? null : null);
    const periodEndVerified = Boolean(verifiedPeriod) || isFactVerified(firstPeriodEndFact);

    const computed = computeFilingDueDate(rule, {
      organizationAssignedDueDate: obligation?.organization_assigned_due_date ?? null,
      periodEnd,
      periodEndVerified,
    });
    const existing = obligation ? filingsByObligation.get(obligation.id) : undefined;

    filings.push({
      agency: row.agency,
      computedInputs: computed.computedInputs,
      dueDate: computed.dueDate,
      extensionDueDate: computed.extensionDueDate,
      filingName: rule.filingName,
      id: existing?.id ?? null,
      jurisdiction: rule.jurisdiction,
      reason: computed.reason,
      ruleKey: rule.ruleKey,
      ruleVersion: rule.ruleVersion,
      sourceNote: row.authoritative_source_note,
      sourceUrl: row.authoritative_source_url,
      status: deriveFilingStatus({
        dueDate: computed.dueDate,
        extensionDueDate: existing?.extension_due_date ?? computed.extensionDueDate,
        extensionFiled: existing?.extension_filed ?? false,
        filedAt: existing?.filed_at ?? null,
        today,
      }),
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
      .from("finance_documents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .is("superseded_at", null),
    supabase
      .from("pco_giving_records")
      .select("gross_amount, attribution_kind, refunded"),
  ]);

  const filings = await loadComplianceCalendar({
    facts,
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
