"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminActionLink, AdminBadge, AdminEmptyState, adminFont, type AdminBadgeTone } from "./AdminUI";

export type AdminResourceControlRow = {
  actionHref?: string;
  actionLabel?: string;
  detail: string;
  id: string;
  metadata?: Array<{ label: string; value: string }>;
  owner: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  status: "Active" | "Archived" | "Draft" | "Inactive" | "Live" | "Pending";
  title: string;
  updatedAt: string;
  url?: string;
};

function statusTone(status: AdminResourceControlRow["status"]): AdminBadgeTone {
  switch (status) {
    case "Active":
    case "Live":
      return "green";
    case "Pending":
      return "amber";
    case "Archived":
    case "Draft":
    case "Inactive":
    default:
      return "muted";
  }
}

function SelectFilter({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        className="min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DetailDrawer({
  row,
}: {
  row: AdminResourceControlRow | null;
}) {
  if (!row) {
    return (
      <aside className="border border-stone-800/75 bg-[#080808]/85 p-6 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)]">
        <p
          className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          Detail Drawer
        </p>
        <p className="mt-4 text-sm leading-7 text-stone-400">
          Select a row to review key metadata, routing, and the next available action.
        </p>
      </aside>
    );
  }

  const isNavigableUrl = row.url?.startsWith("/");

  return (
    <aside className="border border-stone-800/75 bg-[#080808]/85 p-5 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
      <div className="border-b border-stone-800/70 pb-4">
        <p
          className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          Record Detail
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-100">
          {row.title}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminBadge tone={statusTone(row.status)}>{row.status}</AdminBadge>
          <AdminBadge tone="muted">{row.owner}</AdminBadge>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            Description
          </p>
          <p className="mt-1 text-sm leading-7 text-stone-300">
            {row.detail}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              URL / Area
            </p>
            <p className="mt-1 break-words text-sm leading-6 text-stone-300">
              {row.url
                ? isNavigableUrl
                  ? <Link className="hover:text-[#F5B942]" href={row.url}>{row.url}</Link>
                  : row.url
                : "-"}
            </p>
          </div>
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              Last Updated
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-300">{row.updatedAt}</p>
          </div>
        </div>

        {(row.metadata ?? []).length > 0 ? (
          <div className="grid gap-3">
            {row.metadata?.map((item) => (
              <div className="border border-stone-900 bg-[#050505] p-3" key={item.label}>
                <p
                  className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
                  style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                >
                  {item.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-stone-300">{item.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 border-t border-stone-800/70 pt-5">
          {row.actionHref ? (
            <AdminActionLink href={row.actionHref} variant="gold">
              {row.actionLabel ?? "Open"}
            </AdminActionLink>
          ) : null}
          {row.secondaryHref ? (
            <AdminActionLink href={row.secondaryHref}>
              {row.secondaryLabel ?? "View"}
            </AdminActionLink>
          ) : null}
          <button
            className="inline-flex min-h-10 items-center justify-center border border-stone-800 px-4 text-[11px] uppercase tracking-[0.16em] text-stone-500"
            disabled
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            type="button"
          >
            Edit Settings
          </button>
        </div>
      </div>
    </aside>
  );
}

export function AdminResourceControlTable({
  emptyDescription,
  emptyTitle,
  rows,
}: {
  emptyDescription: string;
  emptyTitle: string;
  rows: readonly AdminResourceControlRow[];
}) {
  const [ownerFilter, setOwnerFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState("");
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;
  const statuses = useMemo(() => Array.from(new Set(rows.map((row) => row.status))).sort(), [rows]);
  const owners = useMemo(() => Array.from(new Set(rows.map((row) => row.owner))).sort(), [rows]);
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const searchable = `${row.title} ${row.url ?? ""} ${row.detail} ${row.owner}`.toLowerCase();

      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (!statusFilter || row.status === statusFilter)
        && (!ownerFilter || row.owner === ownerFilter);
    });
  }, [ownerFilter, query, rows, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 border border-stone-800 bg-[#080808]/85 p-3 md:grid-cols-[minmax(220px,1fr)_220px_220px]">
        <label className="block">
          <span className="sr-only">Search records</span>
          <input
            className="min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, URL, or owner"
            value={query}
          />
        </label>
        <SelectFilter label="All Statuses" onChange={setStatusFilter} options={statuses} value={statusFilter} />
        <SelectFilter label="All Owners" onChange={setOwnerFilter} options={owners} value={ownerFilter} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
          <div
            className="hidden grid-cols-[1fr_1fr_0.55fr_0.7fr_0.7fr_0.65fr] gap-3 border-b border-stone-800/70 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-stone-500 lg:grid"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            {["Name", "URL / Area", "Status", "Owner", "Last Updated", "Actions"].map((heading) => (
              <span key={heading}>{heading}</span>
            ))}
          </div>
          <div className="divide-y divide-stone-900">
            {filteredRows.length > 0 ? filteredRows.map((row) => (
              <div
                className={`grid w-full gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-stone-950/80 lg:grid-cols-[1fr_1fr_0.55fr_0.7fr_0.7fr_0.65fr] lg:items-center ${
                  selectedRow?.id === row.id ? "bg-[#C9A24A]/5" : ""
                }`}
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(row.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-stone-100">{row.title}</span>
                  <span className="mt-1 line-clamp-1 text-xs text-stone-500">{row.detail}</span>
                </span>
                <span className="truncate text-stone-400">{row.url ?? "-"}</span>
                <span><AdminBadge tone={statusTone(row.status)}>{row.status}</AdminBadge></span>
                <span className="text-stone-400">{row.owner}</span>
                <span className="text-stone-500">{row.updatedAt}</span>
                <span className="flex flex-wrap gap-2">
                  {row.actionHref ? (
                    <Link
                      className="inline-flex min-h-8 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
                      href={row.actionHref}
                      onClick={(event) => event.stopPropagation()}
                      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                    >
                      {row.actionLabel ?? "View"}
                    </Link>
                  ) : null}
                  {row.secondaryHref ? (
                    <Link
                      className="inline-flex min-h-8 items-center justify-center border border-stone-800 px-3 text-[10px] uppercase tracking-[0.16em] text-stone-300 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
                      href={row.secondaryHref}
                      onClick={(event) => event.stopPropagation()}
                      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                    >
                      {row.secondaryLabel ?? "Open"}
                    </Link>
                  ) : null}
                  {!row.actionHref && !row.secondaryHref ? (
                    <span
                      className="text-[10px] uppercase tracking-[0.16em] text-[#F5B942]"
                      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                    >
                      Open
                    </span>
                  ) : null}
                </span>
              </div>
            )) : (
              <div className="p-4">
                <AdminEmptyState description={emptyDescription} title={emptyTitle} />
              </div>
            )}
          </div>
        </section>

        <DetailDrawer row={selectedRow} />
      </div>
    </div>
  );
}
