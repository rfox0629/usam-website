import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminBadge, AdminEmptyState, adminFont } from "../../../_components/AdminUI";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadWorkspacePreviewData } from "@/src/lib/admin/organization-data";
import { WorkspaceV2Shell } from "@/src/components/dos/WorkspaceV2Shell";
import type { WorkspaceV2Query } from "@/src/components/dos/WorkspaceV2Shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace Preview | National Command Center",
};

export default async function WorkspacePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<WorkspaceV2Query>;
}) {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const { id } = await params;
  const query = await searchParams;
  const { error, preview } = await loadWorkspacePreviewData(id);

  if (!preview && !error) {
    notFound();
  }

  if (error || !preview) {
    return (
      <main className="min-h-screen bg-[#050505] px-4 py-6 text-stone-100">
        <section className="mx-auto max-w-2xl">
          <AdminEmptyState
            description={error ?? "Workspace not found."}
            title="Preview unavailable"
          />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <section className="border-b border-stone-800/80 bg-[#060606] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-stone-400 transition-colors hover:text-usam-gold"
            href="/admin/organizations"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Command Center
          </Link>
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone="amber">Workspace v2</AdminBadge>
            <AdminBadge tone="muted">User view</AdminBadge>
            <AdminBadge tone="muted">Preview mode</AdminBadge>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        <WorkspaceV2Shell
          basePath={`/admin/workspaces/${preview.workspace.id}/preview`}
          dosHref={`/dos/${encodeURIComponent(preview.workspace.slug)}`}
          mode="admin-preview"
          preview={preview}
          publicProfileHref={`/missionaries/${preview.workspace.slug}`}
          query={query}
          workspaceHref={`/admin/missionary-profiles?profile=${preview.workspace.slug}`}
        />
      </section>
    </main>
  );
}
