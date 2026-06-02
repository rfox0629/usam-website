"use client";

import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type {
  AdminWorkspaceIndexData,
  AdminWorkspaceIndexItem,
} from "@/src/lib/admin/workspace-index";

type WorkspacesAdminClientProps = {
  data: AdminWorkspaceIndexData;
};

const statCards = [
  {
    key: "totalWorkspaces",
    label: "Total workspaces",
  },
  {
    key: "activeWorkspaces",
    label: "Active workspaces",
  },
  {
    key: "organizationConnected",
    label: "Organization connected",
  },
  {
    key: "independentUsers",
    label: "Independent users",
  },
] as const;

function formatDate(value: string | null) {
  if (!value) {
    return "No activity yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
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
    workspace.workspaceName,
    workspace.userName,
    workspace.email,
    workspace.organizationName,
    workspace.householdName,
    workspace.slug,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function WorkspacesAdminClient({ data }: WorkspacesAdminClientProps) {
  const [search, setSearch] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const normalizedSearch = search.trim().toLowerCase();

  const filteredWorkspaces = useMemo(
    () =>
      data.workspaces.filter((workspace) => {
        if (!matchesSearch(workspace, normalizedSearch)) {
          return false;
        }

        if (
          organizationFilter === "independent" &&
          workspace.organizationId !== null
        ) {
          return false;
        }

        if (
          organizationFilter !== "all" &&
          organizationFilter !== "independent" &&
          workspace.organizationId !== organizationFilter
        ) {
          return false;
        }

        if (statusFilter !== "all" && workspace.status !== statusFilter) {
          return false;
        }

        return true;
      }),
    [data.workspaces, normalizedSearch, organizationFilter, statusFilter],
  );

  return (
    <div className="space-y-6">
      {data.error ? (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {data.error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {data.stats[card.key].toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-[1.5rem] border border-white/10 bg-[#101010] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.16)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b25e]">
              DOS workspaces
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold text-white">
              Workspace index
            </h2>
          </div>

          <div className="grid gap-2.5 md:grid-cols-[minmax(220px,1fr)_180px_150px] lg:min-w-[660px]">
            <label className="relative block">
              <span className="sr-only">Search workspaces</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, or workspace"
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/30 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#d6b25e]/60"
              />
            </label>

            <label className="block">
              <span className="sr-only">Organization filter</span>
              <select
                value={organizationFilter}
                onChange={(event) => setOrganizationFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-[#d6b25e]/60"
              >
                <option value="all">All organizations</option>
                <option value="independent">Independent</option>
                {data.organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="sr-only">Status filter</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-[#d6b25e]/60"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="setup">Setup</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <div className="hidden lg:block">
            <table className="min-w-full divide-y divide-white/[0.08]">
              <thead className="bg-white/[0.03]">
                <tr>
                  {[
                    "Workspace",
                    "Connection",
                    "Activity",
                    "Open",
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08] bg-black/5">
                {filteredWorkspaces.map((workspace) => (
                  <tr key={workspace.id} className="align-top transition hover:bg-white/[0.025]">
                    <td className="px-4 py-4">
                      <p className="text-lg font-semibold leading-tight text-white">
                        {workspace.userName ?? workspace.workspaceName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {workspace.email ?? "No email available"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full border border-[#d6b25e]/25 bg-[#d6b25e]/10 px-2.5 py-1 text-[10px] font-semibold text-[#f2d99a]">
                          {statusLabel(workspace.status)}
                        </span>
                        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-zinc-400">
                          {workspace.slug ?? workspace.workspaceName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <p className="font-medium text-zinc-200">
                        {workspace.organizationName ?? "Independent"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Household: {workspace.householdName ?? "Not available"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-white">
                          {workspace.peopleCount.toLocaleString()} people
                        </span>
                        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-white">
                          {workspace.meetingsCount.toLocaleString()} meetings
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        Last active: {formatDate(workspace.lastActiveAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={workspace.previewHref}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-[#d6b25e]/50 hover:text-[#f2d99a]"
                      >
                        Open preview
                        <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
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
                key={workspace.id}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold leading-tight text-white">
                      {workspace.userName ?? workspace.workspaceName}
                    </h3>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {workspace.email ?? workspace.slug ?? "No email available"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#d6b25e]/30 bg-[#d6b25e]/10 px-3 py-1 text-xs font-semibold text-[#f2d99a]">
                    {statusLabel(workspace.status)}
                  </span>
                </div>

                <dl className="mt-3 grid gap-2.5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                      Organization
                    </dt>
                    <dd className="mt-1 text-zinc-200">
                      {workspace.organizationName ?? "Independent"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                      Household
                    </dt>
                    <dd className="mt-1 text-zinc-200">
                      {workspace.householdName ?? "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                      People
                    </dt>
                    <dd className="mt-1 font-semibold text-white">
                      {workspace.peopleCount.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                      Meetings
                    </dt>
                    <dd className="mt-1 font-semibold text-white">
                      {workspace.meetingsCount.toLocaleString()}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <p className="text-xs text-zinc-500">
                    Last active: {formatDate(workspace.lastActiveAt)}
                  </p>
                  <Link
                    href={workspace.previewHref}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Preview
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
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
                Try a different search or filter combination.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
