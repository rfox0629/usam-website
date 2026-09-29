// Pure compliance-card helpers. Keeping selection, evidence eligibility, and
// display-state rules free of server imports makes the production edge cases
// directly executable in regression tests.

export type ComplianceCardStatus =
  | "needs_verification"
  | "needs_review"
  | "upcoming"
  | "overdue"
  | "filed_needs_evidence"
  | "filed";

export type ComplianceDocumentCandidate = {
  category: string;
  documentType: string;
  id: string;
  title: string;
};

export type FilingRecordCandidate = {
  computedDueDate: string | null;
  filedAt: string | null;
  filingState: string | null;
  id: string;
  obligationId: string;
  taxPeriodId: string | null;
  updatedAt: string;
};

const taxPeriodDocumentTypes = new Set([
  "accounting_period_election",
  "cpa_letter",
  "form_1023",
  "irs_determination_letter",
  "prior_990",
]);

const stateEvidenceDocumentTypes = new Set([
  "charity_registration",
  "state_annual_report",
]);

const initialPeriodDocumentTypes = new Set([
  "accounting_period_election",
  "cpa_letter",
  "form_1023",
  "prior_990",
]);

/** Manual transcription of the real USA Missionaries determination letter. */
export const usamDeterminationLetterFacts = {
  accountingPeriodEnding: "August 31",
  determinationDate: "2025-09-22",
  exemptionEffectiveDate: "2025-08-06",
  fiscalYearEndMonth: 8,
  form990Required: "Yes",
  publicCharityStatus: "170(b)(1)(A)(vi)",
  taxYearType: "fiscal" as const,
};

export function isUsamDeterminationSource(document: ComplianceDocumentCandidate) {
  return document.category === "irs_tax"
    && document.documentType === "irs_determination_letter"
    && document.title.trim().toLowerCase() === "501(c)(3) approval letter";
}

export function appendOnlyFactSnapshot<T extends {
  factKey: string;
  id: string;
  supersededAt?: string | null;
}>(rows: T[]) {
  const currentIds = new Map<string, string>();
  const historyCounts = new Map<string, number>();

  for (const row of rows) {
    historyCounts.set(row.factKey, (historyCounts.get(row.factKey) ?? 0) + 1);

    if (!row.supersededAt && !currentIds.has(row.factKey)) {
      currentIds.set(row.factKey, row.id);
    }
  }

  return { currentIds, historyCounts };
}

export function complianceCardStatus(status: string): ComplianceCardStatus {
  if (status === "filed") {
    return "filed";
  }

  if (status === "overdue") {
    return "overdue";
  }

  if (status === "filed_needs_evidence") {
    return "filed_needs_evidence";
  }

  if (status === "needs_verification") {
    return "needs_verification";
  }

  if (status === "due_soon" || status === "ready_for_review" || status === "extended") {
    return "needs_review";
  }

  return "upcoming";
}

export function complianceNextAction(status: ComplianceCardStatus) {
  switch (status) {
    case "needs_verification":
      return {
        detail: "Confirm the missing date against an authorized source.",
        label: "Verify source",
      };
    case "needs_review":
      return {
        detail: "Review the deadline and record the filing when it is submitted.",
        label: "Review filing",
      };
    case "overdue":
      return {
        detail: "Record the completed filing now, or confirm the deadline is still correct.",
        label: "Resolve overdue item",
      };
    case "filed_needs_evidence":
      return {
        detail: "Add the completed date and filing evidence. The filing is not overdue.",
        label: "Complete filing record",
      };
    case "filed":
      return {
        detail: "Keep the confirmation and source document with this filing record.",
        label: "View filing evidence",
      };
    default:
      return {
        detail: "Review before the due date and record the filing when complete.",
        label: "Prepare filing",
      };
  }
}

/**
 * Selects the filing for the concrete cycle on screen. A prior year's filed
 * row must never suppress the current year's overdue state.
 */
export function selectFilingForCycle(
  rows: FilingRecordCandidate[],
  {
    dueDate,
    obligationId,
    taxPeriodId,
  }: { dueDate: string | null; obligationId: string; taxPeriodId: string | null },
) {
  const candidates = rows.filter((row) => row.obligationId === obligationId);
  const periodMatches = taxPeriodId
    ? candidates.filter((row) => row.taxPeriodId === taxPeriodId)
    : [];
  const dueDateMatches = dueDate
    ? candidates.filter((row) => row.computedDueDate === dueDate)
    : [];
  const matches = periodMatches.length > 0 ? periodMatches : dueDateMatches;

  return [...matches].sort((left, right) => {
    const completionRank = (row: FilingRecordCandidate) => (
      row.filingState === "filed" || row.filedAt ? 2 : row.filingState === "reported_filed" ? 1 : 0
    );
    const filedDifference = completionRank(right) - completionRank(left);

    return filedDifference || right.updatedAt.localeCompare(left.updatedAt);
  })[0] ?? null;
}

export function isTaxPeriodSource(document: ComplianceDocumentCandidate) {
  return document.category === "irs_tax" && taxPeriodDocumentTypes.has(document.documentType);
}

export function isAssignedDateSource(document: ComplianceDocumentCandidate) {
  return document.category === "state_compliance"
    || stateEvidenceDocumentTypes.has(document.documentType);
}

export function isFilingEvidenceSource(
  document: ComplianceDocumentCandidate,
  jurisdiction: string,
) {
  return jurisdiction === "US"
    ? document.category === "irs_tax"
    : document.category === "state_compliance"
      || stateEvidenceDocumentTypes.has(document.documentType);
}

export function isFactSource(document: ComplianceDocumentCandidate, factKey: string) {
  if (factKey === "ein") {
    return document.documentType === "ein_letter";
  }

  if (factKey === "formation_date" || factKey === "formation_state") {
    return document.documentType === "articles_of_incorporation";
  }

  if (factKey === "exemption_classification" || factKey === "exemption_effective_date") {
    return document.documentType === "irs_determination_letter" || document.documentType === "form_1023";
  }

  if (
    factKey === "tax_year_type"
    || factKey === "fiscal_year_end_month"
    || factKey === "accounting_method"
  ) {
    return isTaxPeriodSource(document);
  }

  if (factKey === "first_period_start" || factKey === "first_period_end") {
    return document.category === "irs_tax" && initialPeriodDocumentTypes.has(document.documentType);
  }

  if (factKey === "form_990_required") {
    return document.documentType === "irs_determination_letter";
  }

  if (factKey === "legal_name" || factKey === "entity_type") {
    return document.documentType === "articles_of_incorporation"
      || document.documentType === "ein_letter"
      || document.documentType === "irs_determination_letter";
  }

  return false;
}
