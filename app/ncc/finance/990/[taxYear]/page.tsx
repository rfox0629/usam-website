import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NccShell } from "../../../_components/NccShell";
import { getCurrentOrganization } from "../../../_lib/organization-context";
import { AgentCapabilitiesPanel } from "../../compliance/_components/AgentCapabilitiesPanel";
import { ComplianceDocumentsPanel } from "../../compliance/_components/ComplianceDocumentsPanel";
import { FilingConfirmationForm } from "../../compliance/_components/FilingConfirmationForm";
import { FilingFieldsGrid } from "../../compliance/_components/FilingFieldsGrid";
import { FilingWorkspacePanel } from "../../compliance/_components/FilingWorkspacePanel";
import { ReminderSchedule } from "../../compliance/_components/ReminderSchedule";
import { WorkflowStageTracker } from "../../compliance/_components/WorkflowStageTracker";
import { listComplianceFilingDocuments } from "@/src/lib/compliance/documents";
import { getComplianceFiling, isComplianceFilingsWriteEnabled } from "@/src/lib/compliance/filings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "IRS Form 990 | National Command Center",
};

export default async function Form990Page({
  params,
}: {
  params: Promise<{ taxYear: string }>;
}) {
  const { taxYear } = await params;
  const filing = await getComplianceFiling("990", taxYear);

  if (!filing) {
    notFound();
  }

  const documents = filing.id ? await listComplianceFilingDocuments(filing.id) : [];
  const writeEnabled = isComplianceFilingsWriteEnabled();

  return (
    <NccShell active="finance" organization={getCurrentOrganization()} title={filing.filingName}>
      <div className="space-y-6">
        <p className="text-sm text-stone-400">
          <Link className="text-[#E4C465] hover:underline" href="/ncc/finance/compliance">
            Compliance
          </Link>{" "}
          / {filing.filingPeriod}
        </p>

        {taxYear === "unknown" ? (
          <div className="border border-[#C9A24A]/35 bg-[#C9A24A]/[0.06] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#E4C465]">Tax Year Not Yet Confirmed</p>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              The filing type, accounting year-end, and extension status are all Unknown until confirmed below.
              The due date is intentionally left blank rather than assumed — Form 990 due dates depend on the
              confirmed fiscal year-end, which this system does not calculate automatically.
            </p>
          </div>
        ) : null}

        <FilingFieldsGrid filing={filing} />
        <ReminderSchedule dueDateIso={filing.extendedDueDate ?? filing.originalDueDate} />
        <WorkflowStageTracker currentStage={filing.workflowStage} />
        <FilingWorkspacePanel filing={filing} is990 writeEnabled={writeEnabled} />
        <ComplianceDocumentsPanel
          documents={documents}
          filingKey={filing.filingKey}
          isPersisted={filing.isPersisted}
          periodKey={filing.periodKey}
          writeEnabled={writeEnabled}
        />
        <FilingConfirmationForm
          alreadyFiled={filing.status === "filed"}
          filingKey={filing.filingKey}
          periodKey={filing.periodKey}
          writeEnabled={writeEnabled && filing.isPersisted}
        />
        <AgentCapabilitiesPanel />
      </div>
    </NccShell>
  );
}
