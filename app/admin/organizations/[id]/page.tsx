import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "../../_components/AdminShell";
import { AdminEmptyState } from "../../_components/AdminUI";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadOrganizationDetail } from "@/src/lib/admin/organization-data";
import { UsamOrganizationHubClient } from "./UsamOrganizationHubClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Organization | National Command Center",
};

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ application?: string; tab?: string }>;
}) {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const { id } = await params;
  const { application, tab } = await searchParams;
  const { error, organization } = await loadOrganizationDetail(id);

  if (!organization && !error) {
    notFound();
  }

  return (
    <AdminShell
      active="organizations"
      title="Organization"
    >
      {error || !organization ? (
        <AdminEmptyState
          description={error ?? "Organization not found."}
          title="Organization unavailable"
        />
      ) : (
        <UsamOrganizationHubClient initialApplicationId={application} initialTab={tab} organization={organization} />
      )}
    </AdminShell>
  );
}
