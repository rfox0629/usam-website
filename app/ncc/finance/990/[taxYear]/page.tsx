import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminEmptyState } from "../../../../admin/_components/AdminUI";
import { NccShell } from "../../../_components/NccShell";
import { NccTabBar, type NccTab } from "../../../_components/NccTabs";
import { getCurrentOrganization } from "../../../_lib/organization-context";
import { AgentCapabilitiesPanel } from "../../compliance/_components/AgentCapabilitiesPanel";
import { ComplianceDocumentsPanel } from "../../compliance/_components/ComplianceDocumentsPanel";
import { FilingConfirmationForm } from "../../compliance/_components/FilingConfirmationForm";
import { FilingFieldsGrid } from "../../compliance/_components/FilingFieldsGrid";
import { FilingWorkspacePanel } from "../../compliance/_components/FilingWorkspacePanel";
import { ReminderSchedule } from "../../compliance/_components/ReminderSchedule";
import { WorkflowStageTracker } from "../../compliance/_components/WorkflowStageTracker";
import { AccountantPackagePanel } from "../_components/AccountantPackagePanel";
import { FinanceAgentPanel } from "../_components/FinanceAgentPanel";
import { MissingInfoQuestionsButton } from "../_components/MissingInfoQuestionsButton";
import { TransactionsWorkspace } from "../_components/TransactionsWorkspace";
import { GovernanceWorksheetPanel, OfficerCompensationPanel, ProgramAccomplishmentsPanel } from "../_components/WorksheetPanels";
import { WorkpapersPanel } from "../_components/WorkpapersPanel";
import { listComplianceFilingDocuments } from "@/src/lib/compliance/documents";
import { getComplianceFiling, isComplianceFilingsWriteEnabled } from "@/src/lib/compliance/filings";
import {
  getWorksheet,
  isFinanceOperationsWriteEnabled,
  listFinancialAccounts,
  listTransactions,
  listWorkpapers,
} from "@/src/lib/finance-ops/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "IRS Form 990 | National Command Center",
};

const tabs: readonly NccTab[] = [
  { key: "profile", label: "Filing Profile", status: "live" },
  { key: "documents", label: "Documents", status: "live" },
  { key: "transactions", label: "Transactions", status: "live" },
  { key: "statements", label: "Financial Statements", status: "live" },
  { key: "functional-expenses", label: "Functional Expenses", status: "live" },
  { key: "payroll", label: "Payroll & Compensation", status: "live" },
  { key: "governance", label: "Governance", status: "live" },
  { key: "program", label: "Program Accomplishments", status: "live" },
  { key: "questions", label: "Open Questions", status: "live" },
  { key: "review", label: "Accountant Review", status: "live" },
  { key: "package", label: "Export Package", status: "live" },
  { key: "confirmation", label: "Filing Confirmation", status: "live" },
];

type SearchParams = { tab?: string };

function resolvePeriodForTaxYear(taxYear: string): { periodEnd: string; periodStart: string } {
  const parsedYear = Number.parseInt(taxYear, 10);
  const year = Number.isInteger(parsedYear) ? parsedYear : new Date().getUTCFullYear();

  return { periodEnd: `${year}-12-31`, periodStart: `${year}-01-01` };
}

export default async function Form990Page({
  params,
  searchParams,
}: {
  params: Promise<{ taxYear: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { taxYear } = await params;
  const searchParamsResolved = await searchParams;
  const currentTab = tabs.some((tab) => tab.key === searchParamsResolved.tab) ? (searchParamsResolved.tab as string) : "profile";

  const filing = await getComplianceFiling("990", taxYear);

  if (!filing) {
    notFound();
  }

  const complianceWriteEnabled = isComplianceFilingsWriteEnabled();
  const operationsWriteEnabled = isFinanceOperationsWriteEnabled();
  const { periodEnd, periodStart } = resolvePeriodForTaxYear(taxYear);

  const documents = filing.id ? await listComplianceFilingDocuments(filing.id) : [];
  const accounts = await listFinancialAccounts();
  const transactions = await listTransactions({ periodEnd, periodStart });
  const workpapers = filing.id ? await listWorkpapers(filing.id) : [];
  const governanceData = filing.id ? (await getWorksheet(filing.id, "governance")) ?? {} : {};
  const programAccomplishmentsData = filing.id ? (await getWorksheet(filing.id, "program_accomplishments")) ?? {} : {};
  const officerCompensationData = filing.id ? (await getWorksheet(filing.id, "officer_compensation")) ?? {} : {};
  const arizonaFiling = await getComplianceFiling("arizona-annual-report", "2026");

  const approvedCount = transactions.filter((transaction) => transaction.reviewStatus === "approved").length;
  const needsReviewCount = transactions.filter((transaction) => transaction.reviewStatus === "needs_review" || transaction.reviewStatus === "imported").length;

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
              The due date is intentionally left blank rather than assumed. Transactions and workpapers on this
              page default to the current calendar year ({periodStart} to {periodEnd}) as a working period until
              the real fiscal year-end is confirmed.
            </p>
          </div>
        ) : null}

        <div className="border border-red-500/30 bg-red-950/15 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-red-200" style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }}>
            Draft Workpapers — Not A Filed Return
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            Everything generated on this page is preparation material for an accountant to review. No workpaper,
            worksheet, or export on this page is a filed tax return, and nothing here can become one without a
            human explicitly recording a real confirmation number on the Filing Confirmation tab.
          </p>
        </div>

        <NccTabBar basePath={`/ncc/finance/990/${taxYear}`} currentTab={currentTab} tabs={tabs} />

        {currentTab === "profile" ? (
          <div className="space-y-6">
            <FilingFieldsGrid filing={filing} />
            <ReminderSchedule dueDateIso={filing.extendedDueDate ?? filing.originalDueDate} />
            <WorkflowStageTracker currentStage={filing.workflowStage} />
            <FilingWorkspacePanel filing={filing} is990 writeEnabled={complianceWriteEnabled} />
          </div>
        ) : null}

        {currentTab === "documents" ? (
          <ComplianceDocumentsPanel
            documents={documents}
            filingKey={filing.filingKey}
            isPersisted={filing.isPersisted}
            periodKey={filing.periodKey}
            writeEnabled={complianceWriteEnabled}
          />
        ) : null}

        {currentTab === "transactions" ? (
          <TransactionsWorkspace
            accounts={accounts}
            periodEnd={periodEnd}
            periodStart={periodStart}
            taxYear={taxYear}
            transactions={transactions}
            writeEnabled={operationsWriteEnabled}
          />
        ) : null}

        {currentTab === "statements" ? (
          <WorkpapersPanel
            availableTypes={["profit_and_loss", "balance_sheet", "revenue_summary", "contribution_summary", "expense_detail", "year_end_cash_reconciliation", "restricted_fund_worksheet", "uncategorized_transactions_report"]}
            filingId={filing.id}
            periodEnd={periodEnd}
            periodStart={periodStart}
            taxYear={taxYear}
            title="Financial Statements (Draft)"
            workpapers={workpapers}
            writeEnabled={operationsWriteEnabled}
          />
        ) : null}

        {currentTab === "functional-expenses" ? (
          <WorkpapersPanel
            availableTypes={["functional_expense_allocation"]}
            filingId={filing.id}
            periodEnd={periodEnd}
            periodStart={periodStart}
            taxYear={taxYear}
            title="Functional-Expense Allocation"
            workpapers={workpapers}
            writeEnabled={operationsWriteEnabled}
          />
        ) : null}

        {currentTab === "payroll" ? (
          <div className="space-y-6">
            <WorkpapersPanel
              availableTypes={["payroll_summary"]}
              filingId={filing.id}
              periodEnd={periodEnd}
              periodStart={periodStart}
              taxYear={taxYear}
              title="Payroll Summary"
              workpapers={workpapers}
              writeEnabled={operationsWriteEnabled}
            />
            <OfficerCompensationPanel filingId={filing.id} initialData={officerCompensationData} taxYear={taxYear} writeEnabled={operationsWriteEnabled} />
          </div>
        ) : null}

        {currentTab === "governance" ? (
          <GovernanceWorksheetPanel filingId={filing.id} initialData={governanceData} taxYear={taxYear} writeEnabled={operationsWriteEnabled} />
        ) : null}

        {currentTab === "program" ? (
          <ProgramAccomplishmentsPanel filingId={filing.id} initialData={programAccomplishmentsData} taxYear={taxYear} writeEnabled={operationsWriteEnabled} />
        ) : null}

        {currentTab === "questions" ? (
          <div className="space-y-6">
            <FilingFieldsGrid filing={filing} />
            <MissingInfoQuestionsButton
              missingDocuments={filing.missingDocuments}
              openQuestions={filing.openQuestions}
              periodEnd={periodEnd}
              periodStart={periodStart}
              taxYear={taxYear}
              writeEnabled={operationsWriteEnabled}
            />
          </div>
        ) : null}

        {currentTab === "review" ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border border-stone-800/75 bg-[#080808]/85 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Approved Transactions</p>
                <p className="mt-2 text-3xl font-bold text-stone-100">{approvedCount}</p>
              </div>
              <div className="border border-stone-800/75 bg-[#080808]/85 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Needs Review</p>
                <p className="mt-2 text-3xl font-bold text-stone-100">{needsReviewCount}</p>
              </div>
              <div className="border border-stone-800/75 bg-[#080808]/85 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Draft Workpapers</p>
                <p className="mt-2 text-3xl font-bold text-stone-100">{workpapers.length}</p>
              </div>
            </div>
            <AdminEmptyState
              description="Accountant sign-off happens by moving the workflow stage to Human Approval or later on the Filing Profile tab, and is a real human action tracked on the filing record — not a status this page sets on its own."
              title="How Sign-Off Works"
            />
          </div>
        ) : null}

        {currentTab === "package" ? (
          <AccountantPackagePanel
            arizonaFiling={arizonaFiling}
            documents={documents}
            filingId={filing.id}
            form990Filing={filing}
            governanceData={governanceData}
            officerCompensationData={officerCompensationData}
            programAccomplishmentsData={programAccomplishmentsData}
            taxYear={taxYear}
            workpapers={workpapers}
            writeEnabled={operationsWriteEnabled}
          />
        ) : null}

        {currentTab === "confirmation" ? (
          <FilingConfirmationForm
            alreadyFiled={filing.status === "filed"}
            filingKey={filing.filingKey}
            periodKey={filing.periodKey}
            writeEnabled={complianceWriteEnabled && filing.isPersisted}
          />
        ) : null}

        <AgentCapabilitiesPanel />
        <FinanceAgentPanel />
      </div>
    </NccShell>
  );
}
