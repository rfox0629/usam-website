"use client";

import Link from "next/link";
import { BarChart3, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type {
  AdminWorkspaceIndexData,
  AdminWorkspaceIndexItem,
  AdminWorkspaceType,
} from "@/src/lib/admin/workspace-index";

type WorkspacesAdminClientProps = {
  data: AdminWorkspaceIndexData;
};

type WorkspaceTypeFilter = "all" | AdminWorkspaceType;

const statCards: Array<{
  filter: WorkspaceTypeFilter;
  key: keyof AdminWorkspaceIndexData["stats"];
  label: string;
}> = [
  { filter: "all", key: "totalWorkspaces", label: "Total Workspaces" },
  { filter: "USA Missionaries", key: "usamMissionaries", label: "USA Missionaries" },
  { filter: "Church", key: "churchWorkspaces", label: "Church" },
  { filter: "Partner Organization", key: "partnerOrganizations", label: "Partner Organizations" },
  { filter: "Independent", key: "independent", label: "Independent" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "No activity";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: AdminWorkspaceIndexItem["status"]) {
  return status === "active" ? "Active" : "Setup";
}

function matchesSearch(workspace: AdminWorkspaceIndexItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    workspace.displayName,
    workspace.email,
    workspace.householdName,
    workspace.organizationName,
    workspace.slug,
    workspace.userName,
    workspace.workspaceName,
    workspace.workspaceType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
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

function StatusPill({ status }: { status: AdminWorkspaceIndexItem["status"] }) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-full border border-white/10 bg-black/30 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
      {statusLabel(status)}
    </span>
  );
}

function ActivitySummary({ metrics }: { metrics: AdminWorkspaceIndexItem["metrics"] }) {
  const items = [
    ["People", metrics.people],
    ["Meetings", metrics.meetings],
    ["Prayer", metrics.prayerRequests],
    ["Fruit", metrics.fruitReviews],
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 xl:grid-cols-4">
      {items.map(([label, value]) => (
        <span
          className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2"
          key={label}
        >
          <span className="font-semibold text-white">{value}</span>{" "}
          <span className="text-zinc-500">{label}</span>
        </span>
      ))}
    </div>
  );
}

export function WorkspacesAdminClient({ data }: WorkspacesAdminClientProps) {
  const [search, setSearch] = useState("");
  const [workspaceTypeFilter, setWorkspaceTypeFilter] = useState<WorkspaceTypeFilter>("all");
  const normalizedSearch = search.trim().toLowerCase();

  const filteredWorkspaces = useMemo(
    () =>
      data.workspaces.filter((workspace) => {
        if (!matchesSearch(workspace, normalizedSearch)) {
          return false;
        }

        return workspaceTypeFilter === "all" || workspace.workspaceType === workspaceTypeFilter;
      }),
    [data.workspaces, normalizedSearch, workspaceTypeFilter],
  );

  return (
    <div className="space-y-6">
      {data.error ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {data.error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => {
          const selected = workspaceTypeFilter === card.filter;

          return (
            <button
              className={`rounded-2xl border p-3.5 text-left transition ${
                selected
                  ? "border-[#C2A14E] bg-[#C2A14E] text-black"
                  : "border-white/10 bg-white/[0.035] text-white hover:border-[#C2A14E]/45"
              }`}
              key={card.key}
              onClick={() => setWorkspaceTypeFilter(card.filter)}
              type="button"
            >
              <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${selected ? "text-black/70" : "text-zinc-500"}`}>
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {data.stats[card.key].toLocaleString()}
              </p>
            </button>
          );
        })}
      </div>

      <section className="rounded-[1.5rem] border border-white/10 bg-[#101010] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.16)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#C2A14E]">
              National Command Center
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold text-white">
              Workspace intelligence
            </h2>
          </div>

          <label className="relative block lg:w-[360px]">
            <span className="sr-only">Search workspaces</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            />
            <input
              className="h-11 w-full rounded-2xl border border-white/10 bg-black/30 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#C2A14E]/60"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search workspace, org, household"
              value={search}
            />
          </label>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1120px] divide-y divide-white/[0.08]">
              <thead className="bg-white/[0.03]">
                <tr>
                  {[
                    "Workspace",
                    "Type",
                    "Organization",
                    "Household",
                    "Activity",
                    "Last Active",
                    "Action",
                  ].map((heading) => (
                    <th
                      className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                      key={heading}
                      scope="col"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08] bg-black/5">
                {filteredWorkspaces.map((workspace) => (
                  <tr className="align-middle transition hover:bg-white/[0.025]" key={workspace.id}>
                    <td className="px-4 py-4">
                      <div className="min-w-[180px]">
                        <p className="text-base font-semibold leading-tight text-white">
                          {workspace.displayName}
                        </p>
                        {workspace.workspaceName !== workspace.displayName ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            {workspace.workspaceName}
                          </p>
                        ) : null}
                        {workspace.isDemoData ? (
                          <span className="mt-2 inline-flex min-h-6 items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                            Demo/Test
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <TypePill type={workspace.workspaceType} />
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-zinc-100">
                      {workspace.organizationName ?? "Independent"}
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-300">
                      {workspace.householdName ?? "Not linked"}
                    </td>
                    <td className="px-4 py-4">
                      <ActivitySummary metrics={workspace.metrics} />
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-300">
                      <div className="flex flex-col gap-2">
                        <span>{formatDate(workspace.lastActiveAt)}</span>
                        <StatusPill status={workspace.status} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-[#C2A14E]/50 hover:text-[#C2A14E]"
                        href={`/admin/workspaces/${workspace.id}`}
                      >
                        View Dashboard
                        <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 lg:hidden">
            {filteredWorkspaces.map((workspace) => (
              <article
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5"
                key={workspace.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold leading-tight text-white">
                      {workspace.displayName}
                    </h3>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {workspace.organizationName ?? "Independent"} · {workspace.householdName ?? "Not linked"}
                    </p>
                  </div>
                  <TypePill type={workspace.workspaceType} />
                </div>

                <div className="mt-3">
                  <ActivitySummary metrics={workspace.metrics} />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={workspace.status} />
                    {workspace.isDemoData ? (
                      <span className="inline-flex min-h-7 items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                        Demo/Test
                      </span>
                    ) : null}
                  </div>
                  <Link
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white"
                    href={`/admin/workspaces/${workspace.id}`}
                  >
                    View Dashboard
                    <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {filteredWorkspaces.length === 0 ? (
            <div className="border-t border-white/10 px-5 py-12 text-center">
              <p className="text-sm font-semibold text-white">
                No workspaces match those filters.
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Try a different search or workspace type.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
