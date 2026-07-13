import type { Metadata } from "next";
import { AdminEmptyState, AdminMetricCard } from "../../admin/_components/AdminUI";
import { PartnersDocumentsAdmin } from "../../admin/partners-documents/PartnersDocumentsAdmin";
import { NccShell } from "../_components/NccShell";
import { NccTabBar, type NccTab } from "../_components/NccTabs";
import { getCurrentOrganization } from "../_lib/organization-context";
import { requireFullNccAccess } from "../_lib/require-full-ncc-access";
import { PARTNERS_DOCUMENT_GROUPS, listPartnersDocuments } from "@/src/lib/partners-documents";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Partnerships | National Command Center",
};

const tabs: readonly NccTab[] = [
  { key: "overview", label: "Overview", status: "live" },
  { key: "partners", label: "Partners", status: "planned" },
  { key: "documents", label: "Documents", status: "live" },
  { key: "pipeline", label: "Relationship Pipeline", status: "planned" },
  { key: "contacts", label: "Contacts", status: "planned" },
  { key: "meetings", label: "Meetings", status: "planned" },
  { key: "tasks", label: "Tasks", status: "planned" },
  { key: "initiatives", label: "Shared Initiatives", status: "planned" },
];

type SearchParams = { tab?: string };

function PlannedTab({ description, title }: { description: string; title: string }) {
  return (
    <AdminEmptyState
      description={description}
      title={title}
    />
  );
}

export default async function NccPartnershipsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireFullNccAccess();

  const params = await searchParams;
  const currentTab = tabs.some((tab) => tab.key === params.tab) ? (params.tab as string) : "overview";
  const documents = await listPartnersDocuments();

  return (
    <NccShell active="partnerships" organization={getCurrentOrganization()} title="Partnerships">
      <div className="space-y-6">
        <NccTabBar basePath="/ncc/partnerships" currentTab={currentTab} tabs={tabs} />

        {currentTab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminMetricCard href="/ncc/partnerships?tab=documents" label="Documents on File" value={documents.length} />
              <AdminMetricCard label="Tracked Partner Organizations" value={0} />
            </div>
            <AdminEmptyState
              title="No Partner Intake Source Yet"
              description="There is no public partner-intake form or partners table in the repository today (confirmed during the Phase 0 gap analysis). This Overview tab will surface real relationship-stage and pipeline data once that intake and the underlying partner-organization records exist. The Documents tab below is real and functional today."
            />
          </div>
        ) : null}

        {currentTab === "partners" ? (
          <PlannedTab
            title="No Partner Records Exist"
            description="There is no partners table in the database yet — this tab intentionally shows no records rather than fabricating any. Once organizations can be modeled as partner tenants (see docs/ncc-architecture.md §10-11), this becomes a real roster."
          />
        ) : null}

        {currentTab === "documents" ? (
          <PartnersDocumentsAdmin documents={documents} groupOptions={PARTNERS_DOCUMENT_GROUPS} />
        ) : null}

        {currentTab === "pipeline" ? (
          <PlannedTab
            title="No Pipeline Data Yet"
            description="A real relationship-stage workflow requires the Partners table above to exist first."
          />
        ) : null}

        {currentTab === "contacts" ? (
          <PlannedTab
            title="No Contact Records Yet"
            description="Partner contact records (name, role, email, phone) don't exist in the schema yet."
          />
        ) : null}

        {currentTab === "meetings" ? (
          <PlannedTab
            title="No Meeting Log Yet"
            description="A partner-relationship meeting log doesn't exist yet. This is distinct from DOS's discipleship meetings table by design — partner-org meetings are an organizational-relationship concern, not a ministry one."
          />
        ) : null}

        {currentTab === "tasks" ? (
          <PlannedTab
            title="No Tasks Yet"
            description="Partner follow-up tasks don't exist as real work items yet."
          />
        ) : null}

        {currentTab === "initiatives" ? (
          <PlannedTab
            title="No Shared Initiatives Yet"
            description="Trackable joint-initiative records (e.g. a shared-services pilot) don't exist yet."
          />
        ) : null}
      </div>
    </NccShell>
  );
}
