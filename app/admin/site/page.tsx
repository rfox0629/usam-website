import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SiteAdminPage() {
  redirect("/admin/public-experience?tab=pages");
}
