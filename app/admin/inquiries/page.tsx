import { redirect } from "next/navigation";

export default function LegacyInquiriesAdminPage() {
  redirect("/admin/public-experience?tab=forms");
}
