import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RelationshipIntelligenceRedirect() {
  redirect("/admin/circle-engine");
}
