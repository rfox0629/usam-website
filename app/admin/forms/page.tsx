import { redirect } from "next/navigation";

export default function FormsAdminRedirect() {
  redirect("/admin/public-experience?tab=forms");
}
