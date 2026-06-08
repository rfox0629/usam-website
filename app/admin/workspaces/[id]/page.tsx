import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft, Network, ShieldCheck } from "lucide-react";

import { AdminShell } from "@/app/admin/_components/AdminShell";
import { AdminEmptyState } from "@/app/admin/_components/AdminUI";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import {
  loadAdminWorkspaceIndex,
  type AdminWorkspaceIndexItem,
  type AdminWorkspaceType,
} from "@/src/lib/admin/workspace-index";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace Dashboard | National Command Center",
};

const circleCapacities = {
  my3: 3,
  my12: 12,
  my70: 70,
  my120: 120,
};

function formatDate(value: string | null) {
  if (!value) {
    return "No activity";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: AdminWorkspaceIndexItem["status"]) {
  return status === "active" ? "Active" : "Setup";
}

function TypePill({ type }: { type: AdminWorkspaceType }) {
  const tone = type === "USA Missionaries"
    ? "border-[#C2A14E]/35 bg-[#C2A14E]/10 text-[#C2A14E]"
    : type === "Church"
      ? "border-sky-400/25 bg-sky-950/30 text-sky-200"
      : type === "Partner Organization"
        ? "border-emerald-400/25 bg-emerald-950/25 text-emerald-200"
        : "border-white/10 bg-white/[0.035] text-zinc-300";

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone}`}>
      {type}
    </span>
  );
}

function InfoBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-white">
        {value ?? "Not available"}
      </p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold leading-none text-white">
        {value}
      </p>
    </div>
  );
}

function CircleHealthRow({
  capacity,
  label,
  value,
}: {
  capacity: number;
  label: string;
  value: number;
}) {
  const percent = Math.min(100, capacity > 0 ? (value / capacity) * 100 : 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-sm font-semibold text-[#C2A14E]">
          {value}/{capacity}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#C2A14E]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function WorkspaceDashboard({ workspace }: { workspace: AdminWorkspaceIndexItem }) {
  const metrics = [
    ["People", workspace.metrics.people],
    ["Meetings", workspace.metrics.meetings],
    ["Prayer Requests", workspace.metrics.prayerRequests],
    ["Fruit Reviews", workspace.metrics.fruitReviews],
    ["Follow-ups", workspace.metrics.followUps],
    ["Applications", workspace.metrics.applications],
    ["Profile Views", workspace.metrics.profileViews],
  ] as const;
  const connection = workspace.organizationConnections[0] ?? null;

  return (
    <div className="space-y-5">
      <Link
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 transition hover:text-[#C2A14E]"
        href="/admin/workspaces"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        Back to Workspaces
      </Link>

      <section className="rounded-[1.5rem] border border-[#C2A14E]/20 bg-[#0f0f0f] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.22)] md:p-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#C2A14E]">
              Workspace Dashboard
            </p>
            <h2 className="mt-2 break-words text-3xl font-semibold leading-tight text-white md:text-4xl">
              {workspace.displayName}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {workspace.workspaceName}
            </p>
            {workspace.isDemoData ? (
              <span className="mt-3 inline-flex rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                Demo/Test Data
              </span>
            ) : null}
          </div>
          <div className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-2 lg:min-w-[520px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Type
              </p>
              <div className="mt-2">
                <TypePill type={workspace.workspaceType} />
              </div>
            </div>
            <InfoBlock label="Organization" value={workspace.organizationName ?? "Independent"} />
            <InfoBlock label="Household" value={workspace.householdName} />
            <InfoBlock label="Status" value={statusLabel(workspace.status)} />
            <InfoBlock label="Last Active" value={formatDate(workspace.lastActiveAt)} />
            <InfoBlock label="Location / State" value={[workspace.location, workspace.state].filter(Boolean).join(" / ") || null} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {metrics.map(([label, value]) => (
            <MetricCard key={label} label={label} value={value} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-[1.5rem] border border-white/10 bg-[#101010] p-4">
          <div className="flex items-center gap-2">
            <Network aria-hidden="true" className="h-4 w-4 text-[#C2A14E]" />
            <h3 className="text-lg font-semibold text-white">Circle Health</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CircleHealthRow label="My 3" value={workspace.circleHealth.my3} capacity={circleCapacities.my3} />
            <CircleHealthRow label="My 12" value={workspace.circleHealth.my12} capacity={circleCapacities.my12} />
            <CircleHealthRow label="My 70" value={workspace.circleHealth.my70} capacity={circleCapacities.my70} />
            <CircleHealthRow label="My 120" value={workspace.circleHealth.my120} capacity={circleCapacities.my120} />
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-[#101010] p-4">
          <div className="flex items-center gap-2">
            <Activity aria-hidden="true" className="h-4 w-4 text-[#C2A14E]" />
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          </div>
          {workspace.recentActivity.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-500">
              No recent activity has been logged yet.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-white/10">
              {workspace.recentActivity.map((item) => (
                <div className="grid gap-2 py-3 sm:grid-cols-[110px_minmax(0,1fr)_170px]" key={item.id}>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C2A14E]">
                    {item.type}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{item.detail}</p>
                  </div>
                  <p className="text-xs text-zinc-500 sm:text-right">{formatDate(item.timestamp)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-[1.5rem] border border-white/10 bg-[#101010] p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 text-[#C2A14E]" />
          <h3 className="text-lg font-semibold text-white">Organization Connection</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoBlock label="Organization" value={connection?.label ?? workspace.organizationName ?? "Independent"} />
          <InfoBlock label="Role / Status" value={[connection?.role, connection?.status].filter(Boolean).join(" / ") || null} />
          <InfoBlock label="Assigned Admin" value={connection?.assignedAdmin} />
          <InfoBlock label="State / Region" value={[workspace.state, workspace.region].filter(Boolean).join(" / ") || null} />
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          {workspace.workspaceTypeReason}
        </p>
      </section>
    </div>
  );
}

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const { id } = await params;
  const data = await loadAdminWorkspaceIndex();
  const workspace = data.workspaces.find((item) => item.id === id);

  if (!workspace && !data.error) {
    notFound();
  }

  return (
    <AdminShell
      active="workspaces"
      description="Admin intelligence view of DOS workspaces, organization connections, and ministry activity."
      title={workspace?.displayName ?? "Workspace Dashboard"}
    >
      {data.error || !workspace ? (
        <AdminEmptyState
          description={data.error ?? "Workspace not found."}
          title="Workspace unavailable"
        />
      ) : (
        <WorkspaceDashboard workspace={workspace} />
      )}
    </AdminShell>
  );
}
