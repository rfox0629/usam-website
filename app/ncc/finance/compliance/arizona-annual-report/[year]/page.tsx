import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NccShell } from "../../../../_components/NccShell";
import { getCurrentOrganization } from "../../../../_lib/organization-context";
import { AgentCapabilitiesPanel } from "../../_components/AgentCapabilitiesPanel";
import { ComplianceDocumentsPanel } from "../../_components/ComplianceDocumentsPanel";
import { FilingConfirmationForm } from "../../_components/FilingConfirmationForm";
import { FilingFieldsGrid } from "../../_components/FilingFieldsGrid";
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

        <FilingFieldsGrid filing={filing} />
        <ReminderSchedule dueDateIso={filing.extendedDueDate ?? filing.originalDueDate} />
        <WorkflowStageTracker currentStage={filing.workflowStage} />
        <FilingWorkspacePanel filing={filing} is990={false} writeEnabled={writeEnabled && canEditFilingFields} />
        <ComplianceDocumentsPanel
          documents={documents}
          filingKey={filing.filingKey}
          isPersisted={filing.isPersisted}
          periodKey={filing.periodKey}
          writeEnabled={writeEnabled && canUploadDocs}
        />
        <FilingConfirmationForm
          alreadyFiled={filing.status === "filed"}
          filingKey={filing.filingKey}
          periodKey={filing.periodKey}
          writeEnabled={writeEnabled && filing.isPersisted && canRecordConfirmation}
        />
        <AgentCapabilitiesPanel />
      </div>
    </NccShell>
  );
}
