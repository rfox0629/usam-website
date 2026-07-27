import type { Metadata } from "next";
import { AdminBadge } from "../_components/AdminUI";
import { AdminShell } from "../_components/AdminShell";
import {
  loadWorkforceSnapshot,
  operationsCenterRoute,
  workforceSnapshotSources,
  type WorkforceFreshness,
  type WorkforceHealthStatus,
} from "@/src/lib/ai-workforce/operations-center";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operations Center | Command Center",
  robots: {
    follow: false,
    index: false,
  },
};

function freshnessLabel(freshness: WorkforceFreshness) {
  const labels: Record<WorkforceFreshness, string> = {
    empty: "No Snapshot",
    fresh: "Fresh",
    offline: "Offline",
    stale: "Stale",
  };

  return labels[freshness];
}

function statusTone(status: WorkforceHealthStatus) {
  if (status === "ok") {
    return "green";
  }

  if (status === "blocked" || status === "offline") {
    return "red";
  }

  if (status === "degraded") {
    return "amber";
  }

  return "muted";
}

export default async function OperationsCenterPage() {
  const snapshot = await loadWorkforceSnapshot();

  return (
    <AdminShell
      active="operations-center"
      description="Read-only foundation for AI workforce status. Runner controls are intentionally out of scope."
      title="Operations Center"
    >
      <div className="space-y-5">
        <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <AdminBadge tone="green">Admin Only</AdminBadge>
              <AdminBadge tone="blue">Read Only</AdminBadge>
              <AdminBadge tone="muted">No Controls</AdminBadge>
              <AdminBadge tone={snapshot.freshness === "fresh" ? "green" : "amber"}>
                {freshnessLabel(snapshot.freshness)}
              </AdminBadge>
            </div>
            <p className="text-xs text-stone-500">
              {operationsCenterRoute}
            </p>
          </div>
          {snapshot.warnings.length ? (
            <p className="mt-4 border-l border-[#D4A63D] pl-3 text-sm leading-6 text-stone-300">
              {snapshot.warnings[0]}
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4 md:p-5">
          <div className="flex flex-col gap-2 border-b border-stone-800/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-stone-100">
              V1 Boundary
            </h2>
            <AdminBadge tone={statusTone(snapshot.dispatcher.status)}>
              Dispatcher {snapshot.dispatcher.status}
            </AdminBadge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">Access</dt>
              <dd className="mt-1 text-stone-200">Active admin allowlist users</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">Auth Boundary</dt>
              <dd className="mt-1 text-stone-200">Server-side Supabase Auth</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">Read Model</dt>
              <dd className="mt-1 text-stone-200">Sanitized snapshots only</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">Controls</dt>
              <dd className="mt-1 text-stone-200">Founder approval required</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4 md:p-5">
          <div className="border-b border-stone-800/70 pb-4">
            <h2 className="text-base font-semibold text-stone-100">
              Data Contracts
            </h2>
          </div>
          <div className="mt-2 divide-y divide-stone-800/70">
            {workforceSnapshotSources.map((source) => (
              <div key={source.key} className="grid gap-2 py-3 text-sm md:grid-cols-[12rem_1fr_auto] md:items-center">
                <p className="font-medium text-stone-100">{source.label}</p>
                <p className="leading-6 text-stone-400">{source.description}</p>
                <AdminBadge tone="muted">Contracted</AdminBadge>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
