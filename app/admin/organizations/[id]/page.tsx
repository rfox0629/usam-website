import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Settings } from "lucide-react";
import { AdminShell } from "../../_components/AdminShell";
import { AdminBadge, AdminEmptyState, adminFont } from "../../_components/AdminUI";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadOrganizationDetail } from "@/src/lib/admin/organization-data";
import { formatOrganizationType } from "@/src/lib/admin/organization-shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Organization | National Command Center",
};

const tabs = ["Overview", "Workspaces", "Members", "Field Activity", "Prayer", "Settings"] as const;

function formatDate(value: string | null) {
  if (!value) {
    return "No activity";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold leading-none text-stone-50">{value}</p>
    </div>
  );
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const { id } = await params;
  const { error, organization } = await loadOrganizationDetail(id);

  if (!organization && !error) {
    notFound();
  }

  return (
    <AdminShell
      active="organizations"
      title={organization?.name ?? "Organization"}
    >
      {error || !organization ? (
        <AdminEmptyState
          description={error ?? "Organization not found."}
          title="Organization unavailable"
        />
      ) : (
        <div className="space-y-5">
          <Link
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-stone-400 transition-colors hover:text-[#E4C465]"
            href="/admin/organizations"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Organizations
          </Link>

          <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminBadge tone={organization.brandingMode === "usam" ? "amber" : "muted"}>
                    {formatOrganizationType(organization.type, organization.brandingMode)}
                  </AdminBadge>
                  <AdminBadge tone={organization.status === "active" ? "green" : "muted"}>
                    {organization.status}
                  </AdminBadge>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-400">
                  Organization route structure is in place. Deeper permission enforcement still belongs in the upcoming workspace membership schema.
                </p>
              </div>
              <Link
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-700 px-4 text-[11px] uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#E4C465]"
                href="/admin/organizations"
                style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                Manage
              </Link>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <DetailMetric label="Workspaces" value={organization.workspaceCount} />
            <DetailMetric label="Members" value={organization.memberCount} />
            <DetailMetric label="Last Activity" value={formatDate(organization.lastActivityAt)} />
          </section>

          <nav className="flex flex-wrap gap-2 rounded-xl border border-stone-800/75 bg-[#080808]/90 p-3" aria-label="Organization sections">
            {tabs.map((tab, index) => (
              <span
                className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-[10px] uppercase tracking-[0.14em] ${
                  index === 0
                    ? "border-[#D4A63D] bg-[#D4A63D] text-black"
                    : "border-stone-800 bg-stone-950 text-stone-400"
                }`}
                key={tab}
                style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              >
                {tab}
              </span>
            ))}
          </nav>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#D8B65D]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                    Workspaces
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-stone-50">Workspace preview</h2>
                </div>
              </div>

              {organization.workspaces.length > 0 ? (
                <div className="divide-y divide-stone-800/70 overflow-hidden rounded-lg border border-stone-800/70 bg-[#050505]">
                  {organization.workspaces.map((workspace) => (
                    <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={`${workspace.kind}-${workspace.id}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-stone-50">{workspace.name}</p>
                          <AdminBadge tone={workspace.kind === "workspace" ? "amber" : "muted"}>{workspace.sourceLabel}</AdminBadge>
                        </div>
                        <p className="mt-1 truncate text-sm text-stone-400">{workspace.slug}</p>
                        <p className="mt-1 text-xs text-stone-500">{formatDate(workspace.lastActivityAt)}</p>
                      </div>
                      {workspace.previewHref ? (
                        <Link
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#D4A63D]/60 px-3 text-[10px] uppercase tracking-[0.14em] text-[#E4C465] transition-colors hover:bg-[#D4A63D]/10"
                          href={workspace.previewHref}
                          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          View as User
                        </Link>
                      ) : (
                        <span className="text-xs text-stone-500">Preview after workspace bridge</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-stone-800/70 bg-[#050505] p-5 text-sm text-stone-400">
                  No workspaces yet.
                </div>
              )}
            </div>

            <div className="space-y-5">
              <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#D8B65D]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                  Field Activity
                </p>
                <p className="mt-3 text-sm leading-6 text-stone-400">
                  Rollups will use workspace-scoped people, meetings, prayer, reviews, and fruit once the org-workspace bridge is formalized.
                </p>
              </section>

              <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#D8B65D]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                  Settings
                </p>
                <dl className="mt-3 grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-stone-500">Slug</dt>
                    <dd className="text-stone-200">{organization.slug}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-stone-500">Branding</dt>
                    <dd className="text-stone-200">{organization.brandingMode}</dd>
                  </div>
                </dl>
              </section>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
