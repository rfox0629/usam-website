"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export type FormControlRow = {
  formName: string;
  formType: string;
  lastSubmissionLabel: string;
  routesTo: "Prayer Team" | "Support Team" | "System/Auth";
  status: "Draft" | "Live";
  submissionsHref?: string;
  totalSubmissions: number | string;
  url: string;
};

function StatusBadge({ status }: { status: FormControlRow["status"] }) {
  const isLive = status === "Live";

  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center border px-2 text-[9px] uppercase tracking-[0.14em] ${
        isLive
          ? "border-green-500/25 bg-green-950/30 text-green-300"
          : "border-stone-700 bg-stone-900/70 text-stone-300"
      }`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {isLive ? "Live" : "Draft"}
    </span>
  );
}

function RouteBadge({ routesTo }: { routesTo: FormControlRow["routesTo"] }) {
  const isPrayer = routesTo === "Prayer Team";
  const isSystem = routesTo === "System/Auth";

  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center border px-2 text-[9px] uppercase tracking-[0.14em] ${
        isPrayer
          ? "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]"
          : isSystem
            ? "border-green-500/25 bg-green-950/30 text-green-300"
            : "border-blue-400/25 bg-blue-950/30 text-blue-300"
      }`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {routesTo}
    </span>
  );
}

function ActionLink({
  children,
  href,
  variant = "outline",
}: {
  children: string;
  href: string;
  variant?: "gold" | "outline";
}) {
  return (
    <Link
      className={`inline-flex min-h-8 items-center justify-center whitespace-nowrap px-3 text-[10px] uppercase tracking-[0.16em] transition-colors ${
        variant === "gold"
          ? "border border-transparent bg-[#D4A63D] text-black hover:bg-[#F5B942]"
          : "border border-stone-700 text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]"
      }`}
      href={href}
      onClick={(event) => event.stopPropagation()}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </Link>
  );
}

function uniqueValues(rows: readonly FormControlRow[], key: keyof FormControlRow) {
  return Array.from(new Set(rows.map((row) => String(row[key])))).sort((first, second) => first.localeCompare(second));
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

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <div className="mt-1 text-sm leading-6 text-stone-300">{value || "—"}</div>
    </div>
  );
}

function DetailDrawer({
  form,
  onClose,
}: {
  form: FormControlRow | null;
  onClose: () => void;
}) {
  if (!form) {
    return (
      <aside className="hidden border border-stone-800/75 bg-[#080808]/85 p-5 xl:block xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)]">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Form Detail
        </p>
        <p className="mt-4 text-sm leading-7 text-stone-400">
          Select a row to inspect routing, submission totals, and control actions.
        </p>
      </aside>
    );
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-stone-800 bg-[#070707] p-5 shadow-[0_0_80px_rgba(0,0,0,0.55)] md:p-6 xl:sticky xl:top-8 xl:z-auto xl:max-h-[calc(100vh-4rem)] xl:border xl:border-stone-800/75 xl:bg-[#080808]/85 xl:shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Form Detail
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight text-stone-100">
            {form.formName}
          </h2>
        </div>
        <button
          className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.16em] text-stone-300 hover:border-[#D4A63D] hover:text-[#F5B942]"
          onClick={onClose}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          Close
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <DetailItem label="URL" value={<Link className="hover:text-[#F5B942]" href={form.url}>{form.url}</Link>} />
        <DetailItem label="Form Type" value={form.formType} />
        <DetailItem label="Status" value={<StatusBadge status={form.status} />} />
        <DetailItem label="Routes To" value={<RouteBadge routesTo={form.routesTo} />} />
        <DetailItem label="Submissions Count" value={form.totalSubmissions} />
        <DetailItem label="Last Submission Date" value={form.lastSubmissionLabel} />
      </div>

      <div className="mt-7 grid gap-3">
        <ActionLink href={form.url}>View Form</ActionLink>
        {form.submissionsHref ? (
          <ActionLink href={form.submissionsHref} variant="gold">View Submissions</ActionLink>
        ) : null}
        <ActionLink href={form.submissionsHref ?? form.url}>Edit Routing</ActionLink>
        <button
          className="inline-flex min-h-10 items-center justify-center border border-stone-800 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-500"
          disabled
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          Disable Form
        </button>
      </div>
    </aside>
  );
}

export function FormsControlTable({ rows }: { rows: readonly FormControlRow[] }) {
  const [query, setQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [selectedFormType, setSelectedFormType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const selectedRow = rows.find((row) => row.formType === selectedFormType) ?? null;
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const searchable = `${row.formName} ${row.url}`.toLowerCase();

      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (!statusFilter || row.status === statusFilter)
        && (!routeFilter || row.routesTo === routeFilter)
        && (!typeFilter || row.formType === typeFilter);
    });
  }, [query, routeFilter, rows, statusFilter, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 border border-stone-800/75 bg-[#080808]/85 p-3 md:grid-cols-[minmax(220px,1.3fr)_0.7fr_0.8fr_0.9fr]">
        <label className="block">
          <span className="sr-only">Search forms</span>
          <input
            className="min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or URL"
            value={query}
          />
        </label>
        <SelectFilter label="All Statuses" onChange={setStatusFilter} options={uniqueValues(rows, "status")} value={statusFilter} />
        <SelectFilter label="All Routes" onChange={setRouteFilter} options={uniqueValues(rows, "routesTo")} value={routeFilter} />
        <SelectFilter label="All Form Types" onChange={setTypeFilter} options={uniqueValues(rows, "formType")} value={typeFilter} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-stone-800/70 text-[10px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  <th className="px-4 py-3 font-bold">Form Name</th>
                  <th className="px-4 py-3 font-bold">URL</th>
                  <th className="px-4 py-3 font-bold">Form Type</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Routes To</th>
                  <th className="px-4 py-3 text-right font-bold">Submissions Count</th>
                  <th className="px-4 py-3 font-bold">Last Submission Date</th>
                  <th className="px-4 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-900">
                {filteredRows.length > 0 ? filteredRows.map((row) => (
                  <tr
                    className={`cursor-pointer transition-colors hover:bg-stone-950/80 ${
                      selectedRow?.formType === row.formType ? "bg-[#C9A24A]/5" : ""
                    }`}
                    key={row.formType}
                    onClick={() => setSelectedFormType(row.formType)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedFormType(row.formType);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-100">{row.formName}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-400">{row.url}</td>
                    <td className="px-4 py-3 text-sm text-stone-400">{row.formType}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3"><RouteBadge routesTo={row.routesTo} /></td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-stone-200">{row.totalSubmissions}</td>
                    <td className="px-4 py-3 text-sm text-stone-400">{row.lastSubmissionLabel}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <ActionLink href={row.url}>View Form</ActionLink>
                        {row.submissionsHref ? (
                          <ActionLink href={row.submissionsHref} variant="gold">View Submissions</ActionLink>
                        ) : null}
                        <ActionLink href={row.submissionsHref ?? row.url}>Edit Routing</ActionLink>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="px-4 py-8 text-sm text-stone-400" colSpan={8}>
                      No forms match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DetailDrawer form={selectedRow} onClose={() => setSelectedFormType("")} />
      </div>
    </div>
  );
}
