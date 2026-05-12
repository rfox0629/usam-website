"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { adminFont, type AdminBadgeTone } from "../_components/AdminUI";
import type { AdminResourceControlRow } from "../_components/AdminResourceControlTable";

const badgeToneClassName: Record<AdminBadgeTone, string> = {
  amber: "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]",
  blue: "border-blue-400/25 bg-blue-950/30 text-blue-300",
  green: "border-green-500/25 bg-green-950/30 text-green-300",
  muted: "border-stone-700 bg-stone-900/70 text-stone-300",
  red: "border-red-500/35 bg-red-950/25 text-red-200",
};

const toolbarInputClassName = "min-h-10 w-full rounded-lg border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]";
const primaryActionClassName = "inline-flex min-h-10 items-center justify-center rounded-lg border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.14em] text-black transition-colors hover:bg-[#F5B942]";
const secondaryActionClassName = "inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-700 px-4 text-[11px] uppercase tracking-[0.14em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]";
const rowActionClassName = "inline-flex min-h-9 items-center justify-center rounded-lg border border-stone-700 px-3 text-[10px] uppercase tracking-[0.13em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]";

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

function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: AdminBadgeTone;
}) {
  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center rounded-full border px-2 text-[9px] uppercase tracking-[0.13em] ${badgeToneClassName[tone]}`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </span>
  );
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
    <label>
      <span className="sr-only">{label}</span>
      <select className={toolbarInputClassName} onChange={(event) => onChange(event.target.value)} value={value}>
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

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-[0.13em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <div className="mt-1 truncate text-sm text-stone-300">{value || "-"}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-6">
      <p className="text-sm font-semibold text-stone-100">No storage areas found</p>
      <p className="mt-2 text-sm leading-6 text-stone-500">Try a different search or filter.</p>
    </div>
  );
}

function DetailDrawer({
  onClose,
  row,
}: {
  onClose: () => void;
  row: AdminResourceControlRow | null;
}) {
  if (!row) {
    return null;
  }

  const isNavigableUrl = row.url?.startsWith("/");

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm">
      <aside className="ml-auto h-full w-full max-w-2xl overflow-y-auto border-l border-stone-800 bg-[#070707] p-5 shadow-[0_0_80px_rgba(0,0,0,0.55)] md:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-stone-800/70 pb-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#D4A63D]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Media Detail
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-100">{row.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>
              <Badge>{row.owner}</Badge>
            </div>
          </div>
          <button className={secondaryActionClassName} onClick={onClose} style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }} type="button">
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <MetaItem
            label="Area"
            value={row.url
              ? isNavigableUrl
                ? <Link className="hover:text-[#F5B942]" href={row.url}>{row.url}</Link>
                : row.url
              : "-"}
          />
          <MetaItem label="Updated" value={row.updatedAt} />
        </div>

        <div className="mt-6 rounded-xl border border-stone-900 bg-[#050505] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            Notes
          </p>
          <p className="mt-2 text-sm leading-7 text-stone-300">{row.detail}</p>
        </div>

        {(row.metadata ?? []).length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {row.metadata?.map((item) => (
              <div className="rounded-lg border border-stone-900 bg-[#050505] p-3" key={item.label}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                  {item.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-stone-300">{item.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 border-t border-stone-800/70 pt-5 sm:grid-cols-2">
          {row.actionHref ? (
            <Link className={primaryActionClassName} href={row.actionHref} style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              {row.actionLabel ?? "Manage"}
            </Link>
          ) : null}
          {row.secondaryHref ? (
            <Link className={secondaryActionClassName} href={row.secondaryHref} style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              {row.secondaryLabel ?? "View"}
            </Link>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function StorageRow({
  onManage,
  row,
}: {
  onManage: () => void;
  row: AdminResourceControlRow;
}) {
  return (
    <article className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4 transition-colors hover:border-stone-700 hover:bg-stone-950/70">
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1.2fr)_140px_minmax(150px,0.75fr)_110px_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            <Badge>{row.owner}</Badge>
          </div>
          <p className="mt-3 truncate text-base font-semibold text-stone-100">{row.title}</p>
          <p className="mt-1 line-clamp-1 text-sm leading-6 text-stone-500">{row.detail}</p>
        </div>
        <MetaItem label={row.metadata?.[0]?.label ?? "Type"} value={row.metadata?.[0]?.value ?? "Storage"} />
        <MetaItem label="Area" value={row.url ?? "-"} />
        <MetaItem label="Updated" value={row.updatedAt} />
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button className={rowActionClassName} onClick={onManage} style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }} type="button">
            Manage
          </button>
          {row.secondaryHref ? (
            <Link className={rowActionClassName} href={row.secondaryHref} style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              {row.secondaryLabel ?? "View"}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function UploadsControl({ rows }: { rows: readonly AdminResourceControlRow[] }) {
  const [ownerFilter, setOwnerFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;
  const statuses = useMemo(() => Array.from(new Set(rows.map((row) => row.status))).sort(), [rows]);
  const owners = useMemo(() => Array.from(new Set(rows.map((row) => row.owner))).sort(), [rows]);
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const searchable = `${row.title} ${row.url ?? ""} ${row.detail} ${row.owner} ${row.metadata?.map((item) => `${item.label} ${item.value}`).join(" ") ?? ""}`.toLowerCase();

      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (!statusFilter || row.status === statusFilter)
        && (!ownerFilter || row.owner === ownerFilter);
    });
  }, [ownerFilter, query, rows, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-stone-800/75 bg-[#080808]/85 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search uploads and documents</span>
            <input
              className={toolbarInputClassName}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search storage areas"
              value={query}
            />
          </label>
          <details className="group rounded-lg border border-stone-800 bg-[#050505] lg:w-[190px]">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-3 text-[11px] uppercase tracking-[0.14em] text-stone-300 group-open:border-b group-open:border-stone-800" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Filters
              <span className="text-[#D4A63D]">+</span>
            </summary>
            <div className="grid gap-2 p-3">
              <SelectFilter label="All Statuses" onChange={setStatusFilter} options={statuses} value={statusFilter} />
              <SelectFilter label="All Owners" onChange={setOwnerFilter} options={owners} value={ownerFilter} />
            </div>
          </details>
          <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
            <Link className={primaryActionClassName} href="/admin/missionary-profiles" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Upload Media
            </Link>
            {(query || statusFilter || ownerFilter) ? (
              <button
                className={secondaryActionClassName}
                onClick={() => {
                  setOwnerFilter("");
                  setQuery("");
                  setStatusFilter("");
                }}
                style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                type="button"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-stone-800/75 bg-[#050505]/75 p-3">
        <div className="flex flex-col gap-3 px-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#D4A63D]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            Storage Areas
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="green">{rows.filter((row) => row.status === "Active" || row.status === "Live").length} Active</Badge>
            <Badge tone="muted">{rows.filter((row) => row.status === "Draft").length} Draft</Badge>
          </div>
        </div>
        <div className="grid gap-3">
          {filteredRows.length > 0 ? filteredRows.map((row) => (
            <StorageRow key={row.id} onManage={() => setSelectedId(row.id)} row={row} />
          )) : <EmptyState />}
        </div>
      </section>

      <DetailDrawer onClose={() => setSelectedId(null)} row={selectedRow} />
    </div>
  );
}
