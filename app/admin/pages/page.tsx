import { redirect } from "next/navigation";

export default function PublicPagesAdminRedirect() {
  redirect("/admin/public-experience?tab=pages");
}
