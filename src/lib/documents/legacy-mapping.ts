// Pure mapping from the legacy partners_documents library to the canonical
// model. No imports, so the regression can execute it directly.
//
// Mapping is explicit per document group and title. Nothing is guessed from
// free text, and anything unrecognised lands in "other" rather than being
// forced into a category it may not belong to.

export type LegacyDocumentInput = {
  docName: string;
  groupName: string;
};

export type LegacyMapping = {
  category: string;
  documentType: string;
  sensitivity: string;
};

const TITLE_RULES: { category: string; documentType: string; match: RegExp; sensitivity: string }[] = [
  {
    category: "irs_tax",
    documentType: "irs_determination_letter",
    match: /501\s*\(?c\)?\s*\(?3\)?|determination letter/i,
    sensitivity: "normal",
  },
  {
    category: "irs_tax",
    documentType: "ein_letter",
    match: /\bein\b/i,
    sensitivity: "normal",
  },
  {
    category: "corporate_legal",
    documentType: "articles_of_incorporation",
    match: /articles of incorporation|corporate formation/i,
    sensitivity: "normal",
  },
  {
    category: "governance_board",
    documentType: "other",
    match: /bylaws/i,
    sensitivity: "normal",
  },
  {
    category: "policies",
    documentType: "other",
    match: /conflict of interest|policy/i,
    sensitivity: "normal",
  },
  {
    // Compensation is personnel data. It sits in the legacy partner-visible set
    // today; the canonical record classifies it correctly.
    category: "missionaries_personnel",
    documentType: "other",
    match: /compensation|housing allowance|salary|payroll/i,
    sensitivity: "personnel_restricted",
  },
];

const GROUP_FALLBACK: Record<string, { category: string; sensitivity: string }> = {
  "Brand & Ministry": { category: "ministry_programs", sensitivity: "normal" },
  Finance: { category: "finance_banking", sensitivity: "finance_restricted" },
  Governance: { category: "governance_board", sensitivity: "normal" },
  "IRS & Nonprofit": { category: "irs_tax", sensitivity: "normal" },
  Operations: { category: "other", sensitivity: "normal" },
};

export function mapLegacyDocument({ docName, groupName }: LegacyDocumentInput): LegacyMapping {
  for (const rule of TITLE_RULES) {
    if (rule.match.test(docName)) {
      return {
        category: rule.category,
        documentType: rule.documentType,
        sensitivity: rule.sensitivity,
      };
    }
  }

  const fallback = GROUP_FALLBACK[groupName] ?? { category: "other", sensitivity: "normal" };

  return { category: fallback.category, documentType: "other", sensitivity: fallback.sensitivity };
}

/**
 * A legacy row is only importable when it still has its file. Anything else is
 * reported as unresolved rather than imported as a broken record.
 */
export function classifyLegacyRow({
  docName,
  filePath,
  hasStorageObject,
}: {
  docName: string;
  filePath: string | null;
  hasStorageObject: boolean;
}): "importable" | "unresolved" | "test_artifact" {
  if (/^\s*(test|sample|dummy|placeholder)\b/i.test(docName)) {
    return "test_artifact";
  }

  if (!filePath || !hasStorageObject) {
    return "unresolved";
  }

  return "importable";
}
