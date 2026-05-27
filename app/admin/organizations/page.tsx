import type { Metadata } from "next";
import { AdminShell } from "../_components/AdminShell";
import { AdminEmptyState } from "../_components/AdminUI";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadOrganizationsOverview } from "@/src/lib/admin/organization-data";
import { OrganizationsClient } from "./OrganizationsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Organizations | National Command Center",
};

export default async function OrganizationsPage() {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const data = await loadOrganizationsOverview();

  return (
    <AdminShell
      active="organizations"
      description="Manage organizations and preview the workspace layer before the full Command Center rebuild."
      title="Organizations"
    >
      {data.error ? (
        <AdminEmptyState
          description={data.error}
          title="Organizations unavailable"
        />
      ) : (
        <OrganizationsClient organizations={data.organizations} />
      )}
    </AdminShell>
  );
}
