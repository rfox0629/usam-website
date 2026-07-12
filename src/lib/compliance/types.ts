// Pure types, constants, and DB-free functions shared by server and client
// compliance components. Deliberately has NO "server-only" import and makes
// no Supabase calls -- src/lib/compliance/filings.ts and documents.ts (both
// server-only) layer real database reads on top of what's defined here.

export const COMPLIANCE_DOCUMENTS_BUCKET = "compliance-documents";

export const complianceFilingStatuses = [
  "not_started",
  "gathering_documents",
  "ai_prepared",
  "missing_information",
  "ready_for_review",
  "approved",
  "filed_pending_confirmation",
  "filed",
  "archived",
] as const;
export type ComplianceFilingStatus = (typeof complianceFilingStatuses)[number];

export const complianceWorkflowStages = [
  "source_documents_uploaded",
  "ai_extraction_and_preparation",
  "missing_information_review",
  "human_approval",
  "accountant_or_officer_filing",
  "confirmation_uploaded",
  "filing_marked_complete",
  "next_deadline_scheduled",
] as const;
export type ComplianceWorkflowStage = (typeof complianceWorkflowStages)[number];

export const workflowStageLabels: Record<ComplianceWorkflowStage, string> = {
  accountant_or_officer_filing: "Accountant or Authorized Officer Filing",
  ai_extraction_and_preparation: "AI Extraction and Preparation",
  confirmation_uploaded: "Confirmation Uploaded",
  filing_marked_complete: "Filing Marked Complete",
  human_approval: "Human Approval",
  missing_information_review: "Missing-Information Review",
  next_deadline_scheduled: "Next Annual Deadline Scheduled",
  source_documents_uploaded: "Source Documents Uploaded",
};

export const reminderOffsetsDays = [120, 90, 60, 30, 14, 7, 0] as const;

export type ComplianceFiling = {
  agency: string;
  assignedPerson: string | null;
  confirmationNumber: string | null;
  extendedDueDate: string | null;
  extra: Record<string, string>;
  filingKey: string;
  filingName: string;
  filingPeriod: string;
  filingReceiptPath: string | null;
  id: string | null;
  isPersisted: boolean;
  jurisdiction: string | null;
  lastFiledDate: string | null;
  missingDocuments: string[];
  officialFilingUrl: string;
  openQuestions: string[];
  originalDueDate: string | null;
  periodKey: string;
  readinessPercentage: number;
  status: ComplianceFilingStatus;
  workflowStage: ComplianceWorkflowStage;
};

export const complianceDocumentCategories = [
  "formation_document",
  "bank_statement",
  "payroll_report",
  "donation_report",
  "board_record",
  "governing_document",
  "filing_receipt",
  "other",
] as const;
export type ComplianceDocumentCategory = (typeof complianceDocumentCategories)[number];

export const complianceDocumentCategoryLabels: Record<ComplianceDocumentCategory, string> = {
  bank_statement: "Bank Statement",
  board_record: "Board Record",
  donation_report: "Donation Report",
  filing_receipt: "Filing Receipt",
  formation_document: "Formation Document",
  governing_document: "Governing Document",
  other: "Other",
  payroll_report: "Payroll Report",
};

export type ComplianceFilingDocument = {
  createdAt: string;
  docCategory: ComplianceDocumentCategory;
  docName: string;
  filePath: string;
  fileSize: number | null;
  fileType: string | null;
  filingId: string;
  id: string;
};

const AZ_FILING_KEY = "arizona-annual-report";
const FORM_990_FILING_KEY = "990";

// Arizona Corporation Commission's electronic filing system (eCorp).
const AZ_ECORP_URL = "https://ecorp.azcc.gov/";
// IRS's official landing page for nonprofit annual filing requirements and forms.
const IRS_990_URL = "https://www.irs.gov/charities-non-profits/annual-filing-and-forms";

const AZ_ANNIVERSARY_MONTH = 8; // August
const AZ_ANNIVERSARY_DAY = 3;
const AZ_FIRST_DUE_YEAR = 2026;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * The Arizona Corporation Commission Annual Report is due annually on the
 * anniversary of the first report's due date (per the formation approval
 * letter: August 3, 2026, then every August 3rd thereafter). This is the
 * only filing allowed to compute its own due date -- the recurrence rule is
 * fixed and known, unlike Form 990 below.
 */
export function arizonaAnnualReportDueDate(year: number): string {
  return `${year}-${pad2(AZ_ANNIVERSARY_MONTH)}-${pad2(AZ_ANNIVERSARY_DAY)}`;
}

export function isValidArizonaAnnualReportYear(year: number): boolean {
  return Number.isInteger(year) && year >= AZ_FIRST_DUE_YEAR && year <= AZ_FIRST_DUE_YEAR + 100;
}

export type ReminderMilestone = {
  daysBefore: number;
  date: string;
  label: string;
};

export function reminderMilestonesForDueDate(dueDateIso: string): ReminderMilestone[] {
  const dueDate = new Date(`${dueDateIso}T00:00:00Z`);

  return reminderOffsetsDays.map((daysBefore) => {
    const milestone = new Date(dueDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);

    return {
      daysBefore,
      date: milestone.toISOString().slice(0, 10),
      label: daysBefore === 0 ? "Due date" : `${daysBefore} days before due`,
    };
  });
}

function seedArizonaAnnualReport(year: number): ComplianceFiling {
  return {
    agency: "Arizona Corporation Commission",
    assignedPerson: null,
    confirmationNumber: null,
    extendedDueDate: null,
    extra: {},
    filingKey: AZ_FILING_KEY,
    filingName: "Arizona Corporation Commission Annual Report",
    filingPeriod: `Annual Report Year ${year}`,
    filingReceiptPath: null,
    id: null,
    isPersisted: false,
    jurisdiction: "Arizona",
    lastFiledDate: null,
    missingDocuments: [
      "Confirmed current statutory agent acceptance",
      "Confirmed current officer/director roster",
      "Confirmed current principal office address",
    ],
    officialFilingUrl: AZ_ECORP_URL,
    openQuestions: [],
    originalDueDate: arizonaAnnualReportDueDate(year),
    periodKey: String(year),
    readinessPercentage: 0,
    status: "not_started",
    workflowStage: "source_documents_uploaded",
  };
}

function seedForm990(periodKey: string): ComplianceFiling {
  return {
    agency: "Internal Revenue Service",
    assignedPerson: null,
    confirmationNumber: null,
    extendedDueDate: null,
    extra: {
      accountingYearEnd: "Unknown",
      extensionStatus: "Unknown",
      filingType: "Unknown",
    },
    filingKey: FORM_990_FILING_KEY,
    filingName: "IRS Form 990 Series",
    filingPeriod: periodKey === "unknown" ? "Tax Year: Unknown (pending confirmation)" : `Tax Year ${periodKey}`,
    filingReceiptPath: null,
    id: null,
    isPersisted: false,
    jurisdiction: "Federal",
    lastFiledDate: null,
    missingDocuments: [
      "Confirmed accounting year-end",
      "EIN confirmation letter",
      "Prior-year filing, if any",
    ],
    officialFilingUrl: IRS_990_URL,
    openQuestions: [
      "Which form applies: 990-N, 990-EZ, or 990?",
      "What is the organization's accounting year-end?",
      "Has an extension (Form 8868) been filed or is one anticipated?",
    ],
    originalDueDate: null,
    periodKey,
    readinessPercentage: 0,
    status: "not_started",
    workflowStage: "source_documents_uploaded",
  };
}

export function getSeedFiling(filingKey: string, periodKey: string): ComplianceFiling | null {
  if (filingKey === AZ_FILING_KEY) {
    const year = Number.parseInt(periodKey, 10);

    return isValidArizonaAnnualReportYear(year) ? seedArizonaAnnualReport(year) : null;
  }

  if (filingKey === FORM_990_FILING_KEY) {
    return seedForm990(periodKey);
  }

  return null;
}

export function seedComplianceFilings(): ComplianceFiling[] {
  return [seedArizonaAnnualReport(AZ_FIRST_DUE_YEAR), seedForm990("unknown")];
}
