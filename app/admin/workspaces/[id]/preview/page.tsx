import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Workspace Preview | National Command Center",
};

export default function LegacyWorkspacePreviewPage() {
  redirect("/admin/organizations/usa-missionaries?tab=workspaces");
}
