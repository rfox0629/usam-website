import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function UsamOrganizationApplicationsPage() {
  redirect("/admin/organizations/usa-missionaries?tab=applications");
}
