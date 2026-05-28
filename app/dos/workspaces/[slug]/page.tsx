import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getDosAuthorization, getDosWorkspaceAccess } from "@/src/lib/dos/auth";
import { loadWorkspacePreviewDataBySlug } from "@/src/lib/admin/organization-data";
import { isWorkspaceShellV2Enabled } from "@/src/lib/admin/workspace-feature-flags";
import { WorkspaceV2Shell, type WorkspaceV2Query } from "@/src/components/dos/WorkspaceV2Shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS Workspace",
  robots: {
    follow: false,
    index: false,
  },
};

function WorkspaceMessage({
  detail,
  title,
}: {
  detail: string;
  title: string;
}) {
  return (
    <main className="dos-workspace-route min-h-screen bg-[#FAFBFD] px-4 py-10 text-[#0F172A]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(.dos-workspace-route) {
              background: #FAFBFD !important;
              color: #0F172A;
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }

            body:has(.dos-workspace-route) > footer {
              display: none !important;
            }
          `,
        }}
      />
      <section className="mx-auto max-w-md rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]">DOS</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#64748B]">{detail}</p>
      </section>
    </main>
  );
}

export default async function DosWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<WorkspaceV2Query>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const dosAppPath = `/dos/app?workspace=${encodeURIComponent(slug)}`;

  if (!isWorkspaceShellV2Enabled()) {
    redirect(dosAppPath);
  }

  const nextPath = `/dos/workspaces/${encodeURIComponent(slug)}`;
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (authorization.status === "configuration_error") {
    return <WorkspaceMessage detail={authorization.message} title="Workspace unavailable" />;
  }

  if (authorization.status === "unauthorized") {
    return <WorkspaceMessage detail="This account is not approved for DOS workspace access yet." title="Access pending" />;
  }

  const workspaceAccess = await getDosWorkspaceAccess(authorization, slug);

  if (workspaceAccess.status === "configuration_error") {
    return <WorkspaceMessage detail={workspaceAccess.message} title="Workspace unavailable" />;
  }

  if (workspaceAccess.status === "not_found") {
    notFound();
  }

  if (workspaceAccess.status === "forbidden") {
    return <WorkspaceMessage detail="You do not have access to this workspace." title="Workspace unavailable" />;
  }

  const { error, preview } = await loadWorkspacePreviewDataBySlug(slug);

  if (!preview && !error) {
    notFound();
  }

  if (error || !preview) {
    return <WorkspaceMessage detail={error ?? "Workspace not found."} title="Workspace unavailable" />;
  }

  return (
    <main className="dos-workspace-route min-h-screen bg-[#FAFBFD] text-[#0F172A]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(.dos-workspace-route) {
              background: #FAFBFD !important;
              color: #0F172A;
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }

            .dos-workspace-route,
            .dos-workspace-route * {
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            }

            .dos-workspace-route :where(button, a, input, textarea, select):focus-visible {
              outline: 2px solid rgba(37, 99, 235, 0.34);
              outline-offset: 2px;
            }

            body:has(.dos-workspace-route) > footer {
              display: none !important;
            }

            body:has(.dos-workspace-route) > div:first-child {
              min-height: 100dvh;
            }
          `,
        }}
      />
      <WorkspaceV2Shell
        basePath={`/dos/workspaces/${preview.workspace.slug}`}
        dosHref={`/dos/app?workspace=${encodeURIComponent(preview.workspace.slug)}`}
        mode="portal"
        preview={preview}
        publicProfileHref={`/missionaries/${preview.workspace.slug}`}
        query={query}
        workspaceHref={`/dos/workspaces/${preview.workspace.slug}`}
      />
    </main>
  );
}
