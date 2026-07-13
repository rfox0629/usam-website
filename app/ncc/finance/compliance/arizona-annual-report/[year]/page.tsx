import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NccShell } from "../../../../_components/NccShell";
import { getCurrentOrganization } from "../../../../_lib/organization-context";
import { AgentCapabilitiesPanel } from "../../_components/AgentCapabilitiesPanel";
import { ComplianceDocumentsPanel } from "../../_components/ComplianceDocumentsPanel";
import { FilingConfirmationForm } from "../../_components/FilingConfirmationForm";
import { FilingFieldsGrid } from "../../_components/FilingFieldsGrid";
import { FilingProgressDashboard, type WorkflowStep } from "../../_components/FilingProgressDashboard";
import { FilingWorkspacePanel } from "../../_components/FilingWorkspacePanel";
import { ReminderSchedule } from "../../_components/ReminderSchedule";
import { WorkflowStageTracker } from "../../_components/WorkflowStageTracker";
import { requireAnyFinanceAccess } from "@/src/lib/finance-auth";
import { listComplianceFilingDocuments } from "@/src/lib/compliance/documents";
import { getComplianceFiling, isComplianceFilingsWriteEnabled, isValidArizonaAnnualReportYear } from "@/src/lib/compliance/filings";
import { hasFinanceCapability } from "@/src/lib/finance-ops/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Arizona Annual Report | National Command Center",
};

export default async function ArizonaAnnualReportPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const financeAccess = await requireAnyFinanceAccess();
  const navScope = financeAccess.source === "finance_team_members" ? "finance-only" : "full";
  const canUploadDocs = hasFinanceCapability(financeAccess.role, "upload_documents");
  const canEditFilingFields = hasFinanceCapability(financeAccess.role, "edit_filing_fields");
  const canRecordConfirmation = hasFinanceCapability(financeAccess.role, "record_filing_confirmation");

  const { year } = await params;
  const yearNumber = Number.parseInt(year, 10);

  if (!isValidArizonaAnnualReportYear(yearNumber)) {
    notFound();
  }

  const filing = await getComplianceFiling("arizona-annual-report", String(yearNumber));

  if (!filing) {
    notFound();
  }

  const documents = filing.id ? await listComplianceFilingDocuments(filing.id) : [];
  const writeEnabled = isComplianceFilingsWriteEnabled();

  const workflowSteps: WorkflowStep[] = [
    {
      cta: filing.isPersisted ? null : { href: "#filing-details", label: "Start Tracking" },
      detail: filing.isPersisted ? `Assigned to ${filing.assignedPerson ?? "no one yet"}` : "Not started",
      status: filing.isPersisted ? "done" : "not_started",
      title: "Start tracking this filing",
    },
    {
      cta: { href: "#documents", label: "Upload Documents" },
      detail: `${documents.length} document(s) on file`,
      status: documents.length > 0 ? "done" : "not_started",
      title: "Upload required documents",
    },
    {
      cta: canRecordConfirmation ? { href: "#confirmation", label: "Record Confirmation" } : null,
      detail: filing.status === "filed" ? `Filed ${filing.lastFiledDate ?? ""}, confirmation ${filing.confirmationNumber}` : "Not filed yet",
      status: !canRecordConfirmation && filing.status !== "filed" ? "blocked" : filing.status === "filed" ? "done" : "not_started",
      title: "File with the AZ Corporation Commission and record confirmation",
    },
  ];

  return (
    <NccShell active="finance" navScope={navScope} organization={getCurrentOrganization()} title={filing.filingName}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-400">
            <Link className="text-[#E4C465] hover:underline" href="/ncc/finance/compliance">
              Compliance
            </Link>{" "}
            / {filing.filingPeriod}
          </p>
          <div className="flex gap-2 text-xs uppercase tracking-[0.14em]">
            <Link className="text-stone-400 hover:text-[#C9A24A]" href={`/ncc/finance/compliance/arizona-annual-report/${yearNumber - 1}`}>
              ← {yearNumber - 1}
            </Link>
            <span className="text-stone-700">/</span>
            <Link className="text-stone-400 hover:text-[#C9A24A]" href={`/ncc/finance/compliance/arizona-annual-report/${yearNumber + 1}`}>
              {yearNumber + 1} →
            </Link>
          </div>
        </div>

        <FilingProgressDashboard periodLabel={`Filing year ${yearNumber}`} steps={workflowSteps} />

        <FilingFieldsGrid filing={filing} />
        <ReminderSchedule dueDateIso={filing.extendedDueDate ?? filing.originalDueDate} />
        <WorkflowStageTracker currentStage={filing.workflowStage} />
        <div id="filing-details">
          <FilingWorkspacePanel filing={filing} is990={false} writeEnabled={writeEnabled && canEditFilingFields} />
        </div>
        <div id="documents">
          <ComplianceDocumentsPanel
            documents={documents}
            filingKey={filing.filingKey}
            isPersisted={filing.isPersisted}
            periodKey={filing.periodKey}
            writeEnabled={writeEnabled && canUploadDocs}
          />
        </div>
        <div id="confirmation">
          <FilingConfirmationForm
            alreadyFiled={filing.status === "filed"}
            filingKey={filing.filingKey}
            periodKey={filing.periodKey}
            writeEnabled={writeEnabled && filing.isPersisted && canRecordConfirmation}
          />
        </div>
        <AgentCapabilitiesPanel />
      </div>
    </NccShell>
  );
}
