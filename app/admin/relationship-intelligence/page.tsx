import type { Metadata } from "next";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadCircleData } from "@/src/lib/dos/circle-scoring";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { AdminShell } from "../_components/AdminShell";
import { CircleEngineClient } from "./CircleEngineClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Circle Engine | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

async function loadWorkspaces() {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data } = await createSupabaseAdminClient()
    .from("missionary_households")
    .select("id, display_name, slug")
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true });

  return (data ?? []).map((workspace) => ({
    id: workspace.id as string,
    label: (workspace.display_name || workspace.slug || "Workspace") as string,
  }));
}

export default async function RelationshipIntelligencePage() {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const workspaces = await loadWorkspaces();
  const firstWorkspaceId = workspaces[0]?.id;
  const initialData = firstWorkspaceId ? await loadCircleData(firstWorkspaceId).catch(() => null) : null;

  return (
    <AdminShell
      active="relationship-intelligence"
      description="Tune focus, investment, and multiplication signals across My 3, My 12, My 70, and Field."
      title="Relationship Intelligence"
    >
      <CircleEngineClient initialData={initialData} workspaces={workspaces} />
    </AdminShell>
  );
}
