import type { Metadata } from "next";

import { AdminShell } from "@/app/admin/_components/AdminShell";
import { WorkspacesAdminClient } from "@/app/admin/workspaces/WorkspacesAdminClient";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadAdminWorkspaceIndex } from "@/src/lib/admin/workspace-index";

export const metadata: Metadata = {
  title: "Workspaces | National Command Center",
};

export const dynamic = "force-dynamic";

export default async function AdminWorkspacesPage() {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const data = await loadAdminWorkspaceIndex();

  return (
    <AdminShell
      active="workspaces"
      title="Workspaces"
      description="Read-only admin view of DOS workspaces, organization connections, and recent activity."
    >
      <WorkspacesAdminClient data={data} />
    </AdminShell>
  );
}
