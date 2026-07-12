import type { Metadata } from "next";
import { AdminEmptyState, AdminMetricCard } from "../../admin/_components/AdminUI";
import { NccShell } from "../_components/NccShell";
import { NccTabBar, type NccTab } from "../_components/NccTabs";
import { getCurrentOrganization } from "../_lib/organization-context";
import { FinanceDocumentsAdmin } from "./FinanceDocumentsAdmin";
import { MonthlyChecklistPrototype } from "./MonthlyChecklistPrototype";
import {
  FINANCE_DOCUMENT_CATEGORIES,
  isFinanceDocumentsWriteEnabled,
  listFinanceDocuments,
} from "@/src/lib/finance-documents";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Finance | National Command Center",
};

const tabs: readonly NccTab[] = [
  { key: "overview", label: "Overview", status: "live" },
  { key: "documents", label: "Documents", status: "live" },
  { key: "checklist", label: "Monthly Checklist", status: "live" },
  { key: "reports", label: "Reports", status: "planned" },
  { key: "compliance", label: "Compliance", status: "planned" },
  { key: "team", label: "Finance Team", status: "planned" },
];

type SearchParams = { tab?: string };

export default async function NccFinancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const currentTab = tabs.some((tab) => tab.key === params.tab) ? (params.tab as string) : "overview";
  const documents = await listFinanceDocuments();
  const writeEnabled = isFinanceDocumentsWriteEnabled();

  return (
    <NccShell active="finance" organization={getCurrentOrganization()} title="Finance">
      <div className="space-y-6">
        <NccTabBar basePath="/ncc/finance" currentTab={currentTab} tabs={tabs} />

        {currentTab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AdminMetricCard href="/ncc/finance?tab=documents" label="Documents on File" value={documents.length} />
              <AdminMetricCard href="/ncc/finance?tab=documents" label="Document Categories" value={FINANCE_DOCUMENT_CATEGORIES.length} />
              <AdminMetricCard href="/ncc/finance?tab=checklist" label="Monthly Checklist" value="Prototype" />
            </div>
            <AdminEmptyState
              title="Phase 1 — Document Operations, Not Bookkeeping"
              description="This department deliberately does not replace QuickBooks or build a competing ledger (per docs/ncc-architecture.md §20). Phase 1 is a secure document portal plus a monthly close checklist. Budgeting, restricted funds, and QuickBooks-API reporting are later phases, evaluated only once this foundation is in real use."
            />
          </div>
        ) : null}

        {currentTab === "documents" ? (
          <FinanceDocumentsAdmin documents={documents} groupOptions={FINANCE_DOCUMENT_CATEGORIES} writeEnabled={writeEnabled} />
        ) : null}

        {currentTab === "checklist" ? <MonthlyChecklistPrototype /> : null}

        {currentTab === "reports" ? (
          <AdminEmptyState
            title="Planned — Phase 4"
            description="Read-only P&L, balance sheet, and cash-flow reporting pulled from QuickBooks via its API. Explicitly out of scope for Phase 1."
          />
        ) : null}

        {currentTab === "compliance" ? (
          <AdminEmptyState
            title="Planned"
            description="990 prep tracking, audit prep, and insurance-policy status live here once Compliance & Legal is built out. Today, insurance and audit documents can already be filed under the Documents tab's categories."
          />
        ) : null}

        {currentTab === "team" ? (
          <AdminEmptyState
            title="Planned"
            description="A Finance-scoped team/permission view (Treasurer, ED, outside accountant) doesn't exist yet — today, Finance access is the same admin_users role model as every other admin page."
          />
        ) : null}
      </div>
    </NccShell>
  );
}
