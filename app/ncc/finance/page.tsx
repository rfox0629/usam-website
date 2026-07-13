import type { Metadata } from "next";
import { AdminActionLink, AdminEmptyState, AdminMetricCard } from "../../admin/_components/AdminUI";
import { NccShell } from "../_components/NccShell";
import { NccTabBar, type NccTab } from "../_components/NccTabs";
import { getCurrentOrganization } from "../_lib/organization-context";
import { FinanceDocumentsAdmin } from "./FinanceDocumentsAdmin";
import { FinanceTeamPanel } from "./FinanceTeamPanel";
import { MonthlyChecklistPrototype } from "./MonthlyChecklistPrototype";
import { isFinancePermissionsWriteEnabled, requireAnyFinanceAccess } from "@/src/lib/finance-auth";
import {
  FINANCE_DOCUMENT_CATEGORIES,
  isFinanceDocumentsWriteEnabled,
  listFinanceDocuments,
} from "@/src/lib/finance-documents";
import { listComplianceFilings } from "@/src/lib/compliance/filings";
import { hasFinanceCapability } from "@/src/lib/finance-ops/roles";
import { listFinanceTeamMembers } from "@/src/lib/finance-ops/team";
import { resolveUsamOrganizationId } from "@/src/lib/finance-ops/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Finance | National Command Center",
};

const tabs: readonly NccTab[] = [
  { key: "overview", label: "Overview", status: "live" },
  { key: "documents", label: "Documents", status: "live" },
  { key: "checklist", label: "Monthly Checklist", status: "live" },
  { href: "/ncc/finance/compliance", key: "compliance", label: "Compliance", status: "live" },
  { key: "reports", label: "Reports", status: "planned" },
  { key: "team", label: "Finance Team", status: "live" },
];

type SearchParams = { tab?: string };

const restrictedDocumentCategories = new Set(["Payroll Records", "W-2s & 1099s", "Donor Acknowledgment Letters"]);

export default async function NccFinancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const financeAccess = await requireAnyFinanceAccess();
  const navScope = financeAccess.source === "finance_team_members" ? "finance-only" : "full";
  const canViewPayroll = hasFinanceCapability(financeAccess.role, "view_payroll_and_donor_detail");
  const canUploadDocs = hasFinanceCapability(financeAccess.role, "upload_documents");
  const canManageTeam = hasFinanceCapability(financeAccess.role, "manage_finance_team");

  const params = await searchParams;
  const currentTab = tabs.some((tab) => tab.key === params.tab) ? (params.tab as string) : "overview";
  const allDocuments = await listFinanceDocuments();
  const documents = canViewPayroll ? allDocuments : allDocuments.filter((doc) => !restrictedDocumentCategories.has(doc.groupName));
  const documentCategories = canViewPayroll ? FINANCE_DOCUMENT_CATEGORIES : FINANCE_DOCUMENT_CATEGORIES.filter((category) => !restrictedDocumentCategories.has(category));
  const writeEnabled = isFinanceDocumentsWriteEnabled() && canUploadDocs;
  const complianceFilings = currentTab === "overview" ? await listComplianceFilings() : [];
  const organizationId = currentTab === "team" ? await resolveUsamOrganizationId() : null;
  const teamMembers = organizationId ? await listFinanceTeamMembers(organizationId) : [];

  return (
    <NccShell active="finance" navScope={navScope} organization={getCurrentOrganization()} title="Finance">
      <div className="space-y-6">
        <NccTabBar basePath="/ncc/finance" currentTab={currentTab} tabs={tabs} />

        {currentTab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminMetricCard href="/ncc/finance?tab=documents" label="Documents on File" value={documents.length} />
              <AdminMetricCard href="/ncc/finance?tab=documents" label="Document Categories" value={documentCategories.length} />
              <AdminMetricCard href="/ncc/finance?tab=checklist" label="Monthly Checklist" value="Prototype" />
              <AdminMetricCard href="/ncc/finance/compliance" label="Compliance Filings Tracked" value={complianceFilings.length} />
            </div>
            <AdminEmptyState
              title="Phase 1 — Document Operations, Not Bookkeeping"
              description="This department deliberately does not replace QuickBooks or build a competing ledger (per docs/ncc-architecture.md §20). Phase 1 is a secure document portal plus a monthly close checklist. Budgeting, restricted funds, and QuickBooks-API reporting are later phases, evaluated only once this foundation is in real use."
            />
          </div>
        ) : null}

        {currentTab === "documents" ? (
          <div className="space-y-4">
            {!canViewPayroll ? (
              <p className="text-xs uppercase tracking-[0.14em] text-stone-600">
                Payroll, W-2/1099, and donor-acknowledgment documents are hidden for your role.
              </p>
            ) : null}
            <FinanceDocumentsAdmin documents={documents} groupOptions={documentCategories} writeEnabled={writeEnabled} />
          </div>
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
            action={<AdminActionLink href="/ncc/finance/compliance" variant="gold">Open Compliance Center</AdminActionLink>}
            description="Compliance now has its own page."
            title="Moved"
          />
        ) : null}

        {currentTab === "team" ? (
          <FinanceTeamPanel canManage={canManageTeam} members={teamMembers} writeEnabled={isFinancePermissionsWriteEnabled()} />
        ) : null}
      </div>
    </NccShell>
  );
}
