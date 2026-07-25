import { redirect } from "next/navigation";

export default function LegacySystemRedirectPage() {
  redirect("/system");
}
