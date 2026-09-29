import Link from "next/link";
import { canAccessOperationsModule, canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import {
  complianceFactKeys,
  complianceFactLabels,
  isFactVerified,
  loadComplianceFacts,
  type ComplianceFact,
  type ComplianceFactKey,
} from "@/src/lib/finance/facts";
import {
  loadComplianceCalendar,
  loadFinanceOrganization,
  loadTaxPeriods,
  type FinanceFiling,
} from "@/src/lib/finance/workspace";
import {
  complianceCardStatus,
  complianceNextAction,
  isAssignedDateSource,
  isFactSource,
  isFilingEvidenceSource,
  isUsamDeterminationSource,
  usamDeterminationLetterFacts,
  type ComplianceCardStatus,
  type ComplianceDocumentCandidate,
} from "@/src/lib/finance/compliance";
import { loadOperationsDocuments, type OperationsDocument } from "@/src/lib/documents/library";
import { OperationsAccessDenied, OperationsShell } from "../../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsBadge,
  OperationsEmptyState,
  OperationsPanel,
  operationsFont,
  type OperationsTone,
} from "../../_components/OperationsUI";
import { FinanceSubnav } from "../_components/FinanceSubnav";
import {
  confirmAccountingPeriodAction,
  recordAssignedDueDateAction,
  recordComplianceFactAction,
  recordComplianceFilingAction,
} from "./actions";

export const dynamic = "force-dynamic";

type DocumentOption = Pick<OperationsDocument, "category" | "documentType" | "id" | "title">;

const fiscalMonths = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November",
].map((label, index) => ({
  label: `${label} (ends ${label} ${[31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30][index]})`,
  value: String(index + 1),
}));

const savedLabels: Record<string, string> = {
  "accounting-period": "Accounting period verified. The filing deadline has been recalculated.",
  "assigned-date": "Assigned date and evidence saved.",
  fact: "Fact saved. Prior versions remain in history.",
  filing: "Filing completion and evidence saved.",
};

const guidedIrsFactKeys = new Set<ComplianceFactKey>([
  "exemption_classification",
  "exemption_effective_date",
  "fiscal_year_end_month",
  "form_990_required",
  "tax_year_type",
]);

const organizationFactKeys = complianceFactKeys.filter((factKey) => !guidedIrsFactKeys.has(factKey));

function documentCandidate(document: DocumentOption): ComplianceDocumentCandidate {
  return document;
}

function statusTone(status: ComplianceCardStatus): OperationsTone {
  if (status === "filed") {
    return "green";
  }

  if (status === "overdue") {
    return "red";
  }

  if (status === "upcoming") {
    return "blue";
  }

  return "amber";
}

function stateTone(state: string): OperationsTone {
  if (state === "verified" || state === "cpa_confirmed") {
    return "green";
  }

  if (state === "needs_cpa_review") {
    return "red";
  }

  return "amber";
}

function stateLabel(state: string) {
  return state.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function SourceDocument({ document }: { document: DocumentOption }) {
  return (
    <Link className="font-medium text-[#815E12] underline decoration-[#D8A932]/60 underline-offset-2" href={`/operations/documents/${encodeURIComponent(document.id)}`}>
      {document.title}
    </Link>
  );
}

function SourceValue({
  documentId,
  documentsById,
  empty = "Not recorded",
}: {
  documentId: string | null;
  documentsById: Map<string, DocumentOption>;
  empty?: string;
}) {
  if (!documentId) {
    return <span className="text-slate-500">{empty}</span>;
  }

  const document = documentsById.get(documentId);

  return document
    ? <SourceDocument document={document} />
    : <span className="text-slate-500">Restricted source document</span>;
}

function SelectDocument({
  defaultValue,
  documents,
  label,
  name = "sourceDocumentId",
  required = false,
}: {
  defaultValue?: string;
  documents: DocumentOption[];
  label: string;
  name?: string;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">{label}</span>
      <select
        className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
        defaultValue={defaultValue ?? ""}
        name={name}
        required={required}
      >
        <option value="">{documents.length > 0 ? "Select a document" : "No eligible documents"}</option>
        {documents.map((document) => (
          <option key={document.id} value={document.id}>{document.title}</option>
        ))}
      </select>
    </label>
  );
}

function CalculationDetails({
  filing,
  documentsById,
}: {
  filing: FinanceFiling;
  documentsById: Map<string, DocumentOption>;
}) {
  const inputs = filing.computedInputs;
  const isAssigned = inputs.calculationType === "state_assigned";

  return (
    <details className="group border-t border-slate-200 pt-3">
      <summary
        className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 marker:hidden"
        style={{ fontFamily: operationsFont.rajdhani }}
      >
        How this is calculated <span aria-hidden="true" className="ml-1 text-[#9D7417] group-open:hidden">+</span>
      </summary>
      <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
        {isAssigned ? (
          <>
            <li>
              <span className="font-semibold text-slate-950">1. Agency input.</span>{" "}
              The Arizona Corporation Commission assigns this organization&apos;s date; formation date is not used.
            </li>
            <li>
              <span className="font-semibold text-slate-950">2. Verified date.</span>{" "}
              {filing.dueDate ? formatOperationsDate(filing.dueDate) : "No assigned date has been verified."}
              {filing.assignedDateSourceDocumentId ? (
                <> from <SourceValue documentId={filing.assignedDateSourceDocumentId} documentsById={documentsById} /></>
              ) : null}
              {filing.assignedDateVerifiedAt ? (
                <>; verified {formatOperationsDate(filing.assignedDateVerifiedAt)}{filing.assignedDateVerifiedBy ? ` by ${filing.assignedDateVerifiedBy}` : ""}.</>
              ) : null}
            </li>
            <li>
              <span className="font-semibold text-slate-950">3. Calendar adjustment.</span>{" "}
              {String(inputs.adjustmentReason ?? "No weekend or legal-holiday adjustment was required.")}
            </li>
          </>
        ) : (
          <>
            <li>
              <span className="font-semibold text-slate-950">1. Verified tax period.</span>{" "}
              {filing.taxPeriod?.periodEnd ? (
                <>
                  Period ending {formatOperationsDate(filing.taxPeriod.periodEnd)} from{" "}
                  <SourceValue documentId={filing.taxPeriod.sourceDocumentId} documentsById={documentsById} />.
                </>
              ) : (
                "Missing. Select the IRS or accounting-period document and enter the concrete period dates."
              )}
            </li>
            <li>
              <span className="font-semibold text-slate-950">2. IRS rule.</span>{" "}
              The return is due on the 15th day of the 5th month after that period ends. Formation and incorporation dates are never substituted.
            </li>
            <li>
              <span className="font-semibold text-slate-950">3. Result.</span>{" "}
              {filing.dueDate
                ? `${formatOperationsDate(String(inputs.unadjustedDueDate ?? filing.dueDate))}${inputs.adjustmentReason ? `; ${String(inputs.adjustmentReason)}` : "."}`
                : "No due date is stated until the tax period is verified."}
            </li>
            <li>
              <span className="font-semibold text-slate-950">4. Extension.</span>{" "}
              {filing.extensionDueDate
                ? `Form ${String(inputs.extensionForm ?? "8868")} extends the date to ${formatOperationsDate(filing.extensionDueDate)} when filed.`
                : "No extension date is active."}
            </li>
          </>
        )}
      </ol>
      {filing.sourceNote ? <p className="mt-3 text-xs leading-5 text-slate-600">Rule note: {filing.sourceNote}</p> : null}
    </details>
  );
}

function AccountingPeriodWorkflow({
  canManage,
  documents,
  facts,
  filing,
}: {
  canManage: boolean;
  documents: DocumentOption[];
  facts: Map<string, ComplianceFact>;
  filing: FinanceFiling;
}) {
  const taxYearFact = facts.get("tax_year_type");
  const fiscalMonthFact = facts.get("fiscal_year_end_month");
  const sourceDocuments = documents.filter((document) => isUsamDeterminationSource(documentCandidate(document)));
  const sourceDocumentId = filing.taxPeriod?.sourceDocumentId ?? taxYearFact?.sourceDocumentId ?? null;
  const sourceDocument = sourceDocumentId
    ? sourceDocuments.find((document) => document.id === sourceDocumentId) ?? null
    : null;
  const verified = Boolean(
    filing.taxPeriod?.isVerified
    && filing.taxPeriod.periodEnd
    && isFactVerified(taxYearFact)
    && taxYearFact?.value === usamDeterminationLetterFacts.taxYearType
    && isFactVerified(fiscalMonthFact)
    && Number(fiscalMonthFact?.value) === usamDeterminationLetterFacts.fiscalYearEndMonth,
  );
  const defaultDocumentId = sourceDocument?.id ?? (sourceDocuments.length === 1 ? sourceDocuments[0].id : "");

  const workflowSteps = [
    "Needs Verification",
    "Select source document",
    "Review source facts",
    "Confirm",
    "Verified",
    "Calculated deadline",
  ];

  return (
    <section className={`rounded-lg border ${verified ? "border-emerald-200 bg-emerald-50/60" : "border-[#D8A932]/40 bg-[#FFF9E9]"}`}>
      <div className="border-b border-current/10 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#815E12]">Accounting period verification</p>
            <h4 className="mt-1 text-sm font-semibold text-slate-950">August fiscal year</h4>
          </div>
          <OperationsBadge tone={verified ? "green" : "amber"}>{verified ? "Verified" : "Needs Verification"}</OperationsBadge>
        </div>
        <div aria-label="Verification workflow" className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
          {workflowSteps.map((step, index) => (
            <span className="contents" key={step}>
              <span className={`rounded-full border px-2 py-1 ${verified || index < 4 ? "border-[#D8A932]/40 bg-white text-slate-800" : "border-slate-200 bg-slate-50"}`}>{step}</span>
              {index < workflowSteps.length - 1 ? <span aria-hidden="true">→</span> : null}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">1 · Source document</p>
          {verified && sourceDocument ? (
            <p className="mt-2 text-sm"><SourceDocument document={sourceDocument} /></p>
          ) : canManage ? (
            <form action={confirmAccountingPeriodAction} className="mt-2 space-y-3">
              <SelectDocument defaultValue={defaultDocumentId} documents={sourceDocuments} label="Canonical IRS source" required />
              <button className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#D8A932] px-4 text-sm font-semibold text-[#101826] hover:bg-[#E7BF57]" disabled={sourceDocuments.length === 0} type="submit">
                Confirm accounting period
              </button>
            </form>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Awaiting founder confirmation.</p>
          )}
          {sourceDocuments.length === 0 ? (
            <Link className="mt-3 block text-sm font-medium text-[#815E12] underline" href="/operations/documents?category=irs_tax">
              Add the 501(c)(3) Approval Letter
            </Link>
          ) : null}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">2 · Review source facts</p>
          {sourceDocuments.length > 0 ? (
            <dl className="mt-2 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Letter date</dt><dd className="font-semibold text-slate-950">Sep 22, 2025</dd></div>
              <div><dt className="text-slate-500">Accounting period ending</dt><dd className="font-semibold text-slate-950">August 31</dd></div>
              <div><dt className="text-slate-500">Exemption effective</dt><dd className="font-semibold text-slate-950">Aug 6, 2025</dd></div>
              <div><dt className="text-slate-500">Annual return required</dt><dd className="font-semibold text-slate-950">Yes · 990 / 990-EZ / 990-N</dd></div>
              <div><dt className="text-slate-500">Public charity status</dt><dd className="font-semibold text-slate-950">170(b)(1)(A)(vi)</dd></div>
              <div><dt className="text-slate-500">Tax year type</dt><dd className="font-semibold text-slate-950">Fiscal</dd></div>
              <div><dt className="text-slate-500">Fiscal year-end month</dt><dd className="font-semibold text-slate-950">August</dd></div>
              <div><dt className="text-slate-500">Recurring year</dt><dd className="font-semibold text-slate-950">Sep 1 → Aug 31</dd></div>
            </dl>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600">Source facts remain hidden until an authorized determination letter is available.</p>
          )}
        </div>
      </div>

      <div className="border-t border-current/10 px-4 py-3 text-xs leading-5 text-slate-700">
        <span className="font-semibold text-slate-950">Initial short period: Needs Verification.</span>{" "}
        The letter does not establish its start date. Incorporation and exemption dates are not substituted.
      </div>
    </section>
  );
}

function AssignedDateForm({
  documents,
  filing,
  open,
}: {
  documents: DocumentOption[];
  filing: FinanceFiling;
  open: boolean;
}) {
  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50" open={open}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-950">
        {filing.dueDate ? "Update assigned date" : "Verify assigned date"}
      </summary>
      <form action={recordAssignedDueDateAction} className="grid gap-3 border-t border-slate-200 p-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] lg:items-end">
        <input name="ruleKey" type="hidden" value={filing.ruleKey} />
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Agency-assigned due date</span>
          <input className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950" defaultValue={filing.dueDate ?? ""} name="assignedDueDate" required type="date" />
        </label>
        <SelectDocument defaultValue={filing.assignedDateSourceDocumentId ?? ""} documents={documents} label="Agency record showing the date" required />
        <button className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#D8A932] px-4 text-sm font-semibold text-[#101826] hover:bg-[#E7BF57]" type="submit">
          Save date
        </button>
        {documents.length === 0 ? (
          <Link className="text-sm font-medium text-[#815E12] underline lg:col-span-3" href="/operations/documents?category=state_compliance">
            Add the ACC record or annual-report document first
          </Link>
        ) : null}
      </form>
    </details>
  );
}

function FilingForm({
  documents,
  filing,
  open,
  today,
}: {
  documents: DocumentOption[];
  filing: FinanceFiling;
  open: boolean;
  today: string;
}) {
  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50" id={`filing-${filing.ruleKey}`} open={open}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-950">
        {filing.filingState === "filed" ? "Correct filing record" : filing.filingState === "reported_filed" ? "Complete filing record" : "Record completed filing"}
      </summary>
      <form action={recordComplianceFilingAction} className="grid gap-3 border-t border-slate-200 p-4 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <input name="ruleKey" type="hidden" value={filing.ruleKey} />
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Filed date</span>
          <input className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950" defaultValue={filing.filedAt ?? ""} max={today} name="filedAt" required type="date" />
        </label>
        <label className="block min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Agency confirmation / receipt</span>
          <input className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950" defaultValue={filing.confirmationReference ?? ""} name="confirmationReference" placeholder="Confirmation number or receipt reference" required />
        </label>
        <SelectDocument defaultValue={filing.filingSourceDocumentId ?? ""} documents={documents} label="Filing document / receipt" required />
        <button className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#D8A932] px-4 text-sm font-semibold text-[#101826] hover:bg-[#E7BF57]" type="submit">
          {filing.filingState === "filed" ? "Save correction" : "Confirm filed"}
        </button>
        {documents.length === 0 ? (
          <Link className="text-sm font-medium text-[#815E12] underline lg:col-span-4" href={`/operations/documents?category=${filing.jurisdiction === "US" ? "irs_tax" : "state_compliance"}`}>
            Add a filing confirmation document
          </Link>
        ) : null}
      </form>
    </details>
  );
}

function FilingCard({
  canManage,
  documents,
  documentsById,
  facts,
  filing,
  today,
}: {
  canManage: boolean;
  documents: DocumentOption[];
  documentsById: Map<string, DocumentOption>;
  facts: Map<string, ComplianceFact>;
  filing: FinanceFiling;
  today: string;
}) {
  const status = complianceCardStatus(filing.status);
  const nextAction = complianceNextAction(status);
  const assignedDateDocuments = documents.filter((document) => isAssignedDateSource(documentCandidate(document)));
  const filingDocuments = documents.filter((document) => isFilingEvidenceSource(documentCandidate(document), filing.jurisdiction));
  const isAssigned = filing.computedInputs.calculationType === "state_assigned";
  const taxPeriodSourceId = filing.taxPeriod?.sourceDocumentId ?? facts.get("tax_year_type")?.sourceDocumentId ?? null;
  const filingDisplayName = isAssigned && filing.dueDate && !/^\d{4}\b/.test(filing.filingName)
    ? `${filing.dueDate.slice(0, 4)} ${filing.filingName}`
    : filing.filingName;
  const statusLabel = status === "filed_needs_evidence" ? "Filed · details needed" : stateLabel(status);
  const filingStatusLabel = status === "filed_needs_evidence"
    ? "Filed · details needed"
    : filing.filingState === "filed"
    ? "Filed"
    : filing.filingState === "reported_filed"
      ? "Filed · details needed"
      : stateLabel(filing.status);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#815E12]">{filing.jurisdiction}</p>
          <h3 className="mt-1 text-lg font-semibold leading-snug text-slate-950">{filingDisplayName}</h3>
          <p className="mt-1 text-sm text-slate-600">{filing.agency}</p>
        </div>
        <OperationsBadge tone={statusTone(status)}>{statusLabel}</OperationsBadge>
      </div>

      {filing.ruleKey === "US_FORM_990" ? (
        <div className="mt-4 grid gap-x-6 gap-y-3 border-y border-slate-200 py-4 sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Tax period</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {filing.taxPeriod?.periodEnd ? `Fiscal year ending ${formatOperationsDate(filing.taxPeriod.periodEnd)}` : "Needs Verification"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Due</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{filing.dueDate ? formatOperationsDate(filing.dueDate) : "Calculated after confirmation"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Status</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{statusLabel}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">IRS rule · {filing.ruleVersion}</p>
            {filing.sourceUrl ? (
              <a className="mt-1 block text-sm font-medium text-[#815E12] underline decoration-[#D8A932]/60 underline-offset-2" href={filing.sourceUrl} rel="noreferrer" target="_blank">
                15th day of the 5th month
              </a>
            ) : <p className="mt-1 text-sm text-slate-500">Rule source missing</p>}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Source evidence</p>
            <p className="mt-1 text-sm"><SourceValue documentId={taxPeriodSourceId} documentsById={documentsById} empty="Select the 501(c)(3) Approval Letter" /></p>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-x-6 gap-y-3 border-y border-slate-200 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Assigned due date</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{filing.dueDate ? formatOperationsDate(filing.dueDate) : "Needs Verification"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Filing status</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{filingStatusLabel}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Filed / completed date</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{filing.filedAt ? formatOperationsDate(filing.filedAt) : filing.filingState === "reported_filed" ? "Founder confirmation needed" : "Not filed"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Filing evidence</p>
            <p className="mt-1 text-sm"><SourceValue documentId={filing.filingSourceDocumentId} documentsById={documentsById} empty={filing.filingState === "reported_filed" ? "Founder action needed" : "Not recorded"} /></p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Next filing</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{filing.filingState === "not_filed" ? "Current filing shown above" : "Awaiting next ACC assigned date"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">ACC rule · {filing.ruleVersion}</p>
            {filing.sourceUrl ? (
              <a className="mt-1 block text-sm font-medium text-[#815E12] underline decoration-[#D8A932]/60 underline-offset-2" href={filing.sourceUrl} rel="noreferrer" target="_blank">
                Organization-assigned date
              </a>
            ) : <p className="mt-1 text-sm text-slate-500">Rule source missing</p>}
          </div>
        </div>
      )}

      <div className={`mt-4 rounded-lg border p-3 ${status === "overdue" ? "border-red-200 bg-red-50" : status === "filed" ? "border-emerald-200 bg-emerald-50" : "border-[#D8A932]/30 bg-[#FFF9E9]"}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Next: {nextAction.label}</p>
            <p className="mt-0.5 text-sm leading-5 text-slate-700">{nextAction.detail}</p>
          </div>
          {canManage && filing.dueDate ? (
            <a className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 hover:border-[#D8A932]" href={`#filing-${filing.ruleKey}`}>
              {status === "filed" ? "Evidence" : status === "filed_needs_evidence" ? "Add details" : "Record filing"}
            </a>
          ) : null}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-700">{filing.reason}</p>

      <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        {filing.assignedDateSourceDocumentId ? (
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-slate-800">Due-date evidence</dt>
            <dd><SourceValue documentId={filing.assignedDateSourceDocumentId} documentsById={documentsById} /></dd>
          </div>
        ) : null}
        {filing.confirmationReference ? (
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-slate-800">Confirmation</dt>
            <dd>{filing.confirmationReference}</dd>
          </div>
        ) : null}
        {filing.filingSourceDocumentId ? (
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-slate-800">Filing evidence</dt>
            <dd><SourceValue documentId={filing.filingSourceDocumentId} documentsById={documentsById} /></dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 space-y-3">
        <CalculationDetails documentsById={documentsById} filing={filing} />
        {filing.ruleKey === "US_FORM_990" ? (
          <AccountingPeriodWorkflow canManage={canManage} documents={documents} facts={facts} filing={filing} />
        ) : null}
        {canManage && isAssigned ? (
          <AssignedDateForm documents={assignedDateDocuments} filing={filing} open={!filing.dueDate} />
        ) : null}
        {canManage && filing.dueDate ? (
          <FilingForm documents={filingDocuments} filing={filing} open={status === "overdue" || status === "filed_needs_evidence"} today={today} />
        ) : null}
      </div>
    </article>
  );
}

function FactValueControl({ factKey, value }: { factKey: ComplianceFactKey; value: string }) {
  if (factKey === "tax_year_type") {
    return (
      <select className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950" defaultValue={value || "calendar"} name="value">
        <option value="calendar">Calendar year</option>
        <option value="fiscal">Fiscal year</option>
      </select>
    );
  }

  if (factKey === "fiscal_year_end_month") {
    return (
      <select className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950" defaultValue={value} name="value" required>
        <option value="">Select a month</option>
        {fiscalMonths.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
      </select>
    );
  }

  const isDateFact = ["formation_date", "exemption_effective_date", "first_period_start", "first_period_end"].includes(factKey);

  return (
    <input
      className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950"
      defaultValue={value}
      name="value"
      required
      type={isDateFact ? "date" : "text"}
    />
  );
}

export default async function OperationsFinanceCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const [query, authorization] = await Promise.all([searchParams, getOperationsAuthorization()]);

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "finance")) {
    return <OperationsAccessDenied active="finance" authorization={authorization} />;
  }

  const organization = await loadFinanceOrganization();

  if (!organization) {
    return (
      <OperationsShell active="finance" authorization={authorization} title="Finance">
        <FinanceSubnav active="compliance" />
        <OperationsEmptyState>Organization record is unavailable.</OperationsEmptyState>
      </OperationsShell>
    );
  }

  const canManage = canManageOperationsModule(authorization, "finance");
  const today = new Date().toISOString().slice(0, 10);
  const [{ facts, historyCounts }, periods, { documents, hiddenCount }] = await Promise.all([
    loadComplianceFacts(organization.id),
    loadTaxPeriods(organization.id),
    loadOperationsDocuments({ authorization, organizationId: organization.id }),
  ]);
  const filings = await loadComplianceCalendar({ organizationId: organization.id, periods, today });
  const documentOptions: DocumentOption[] = documents.map((document) => ({
    category: document.category,
    documentType: document.documentType,
    id: document.id,
    title: document.title,
  }));
  const documentsById = new Map(documentOptions.map((document) => [document.id, document]));

  return (
    <OperationsShell active="finance" authorization={authorization} title="Finance">
      <FinanceSubnav active="compliance" />

      <div className="space-y-4">
        {query.saved ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
            {savedLabels[query.saved] ?? "Saved."}
          </section>
        ) : null}
        {query.error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900">{query.error}</section>
        ) : null}

        <OperationsPanel
          action={<Link className="text-sm font-medium text-[#815E12] underline" href="/operations/documents">Operations Documents</Link>}
          eyebrow="Current obligations"
          title="Compliance"
        >
          {filings.length > 0 ? (
            <div className="grid gap-4">
              {filings.map((filing) => (
                <FilingCard
                  canManage={canManage}
                  documents={documentOptions}
                  documentsById={documentsById}
                  facts={facts}
                  filing={filing}
                  key={`${filing.ruleKey}-${filing.ruleVersion}`}
                  today={today}
                />
              ))}
            </div>
          ) : (
            <OperationsEmptyState>No compliance rules apply yet.</OperationsEmptyState>
          )}
          {hiddenCount > 0 ? (
            <p className="mt-3 text-xs text-slate-600">Restricted documents stay hidden and are never offered as evidence.</p>
          ) : null}
        </OperationsPanel>

        <OperationsPanel eyebrow="Canonical inputs" title="Organization Facts">
          <p className="mb-4 max-w-3xl text-sm leading-6 text-slate-600">
            Confirm facts only from an appropriate Operations Document. Corrections append a new version; prior values remain in history.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {organizationFactKeys.map((factKey) => {
              const fact = facts.get(factKey);
              const eligibleDocuments = documentOptions.filter((document) => isFactSource(documentCandidate(document), factKey));
              const versionCount = historyCounts.get(factKey) ?? 0;
              const visibleSource = fact?.sourceDocumentId ? documentsById.get(fact.sourceDocumentId) : null;

              return (
                <article className="rounded-lg border border-slate-200 bg-white p-4" key={factKey}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-950">{complianceFactLabels[factKey]}</h3>
                      <p className="mt-1 break-words text-sm text-slate-700">{fact?.value ?? "Not set"}</p>
                    </div>
                    <OperationsBadge tone={fact ? stateTone(fact.verificationState) : "muted"}>
                      {fact ? stateLabel(fact.verificationState) : "Not set"}
                    </OperationsBadge>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                    {fact?.sourceDocumentId ? (
                      <span>
                        Source: {visibleSource ? <SourceDocument document={visibleSource} /> : "Restricted document"}
                      </span>
                    ) : <span>No source recorded</span>}
                    {versionCount > 0 ? <span>{versionCount} version{versionCount === 1 ? "" : "s"}</span> : null}
                    {fact && isFactVerified(fact) ? (
                      <span>Verified {formatOperationsDate(fact.verifiedAt)} by {fact.verifiedBy}</span>
                    ) : null}
                  </div>

                  {canManage ? (
                    <details className="mt-3 border-t border-slate-200 pt-3">
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                        {fact ? "Confirm or correct" : "Add fact"}
                      </summary>
                      <form action={recordComplianceFactAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input name="factKey" type="hidden" value={factKey} />
                        <label className="block">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Value</span>
                          <FactValueControl factKey={factKey} value={fact?.value ?? ""} />
                        </label>
                        <SelectDocument defaultValue={visibleSource?.id ?? ""} documents={eligibleDocuments} label="Source document" required />
                        <label className="block">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Source reference</span>
                          <input className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950" defaultValue={fact?.sourceReference ?? ""} name="sourceReference" placeholder="Page, line, or field" />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Verification</span>
                          <select className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950" defaultValue={fact?.verificationState ?? "verified"} name="verificationState">
                            <option value="suggested">Suggested</option>
                            <option value="verified">Verified</option>
                            <option value="needs_cpa_review">Needs CPA review</option>
                            <option value="cpa_confirmed">CPA confirmed</option>
                          </select>
                        </label>
                        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs leading-5 text-slate-600">
                            {eligibleDocuments.length > 0 ? "Saving creates a new fact version." : "Add an appropriate source document first."}
                          </p>
                          <button className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:border-[#D8A932]" disabled={eligibleDocuments.length === 0} type="submit">
                            Save fact
                          </button>
                        </div>
                      </form>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
