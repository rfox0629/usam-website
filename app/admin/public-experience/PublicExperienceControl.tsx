"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AdminBadge, adminFont } from "../_components/AdminUI";

export type PublicExperienceTab = "access" | "forms" | "pages" | "routing";

export type PublicPageRow = {
  id: string;
  lastUpdated: string;
  manageHref: string;
  owner: string;
  pageName: string;
  status: "Draft" | "Live";
  url: string;
};

export type PublicFormRow = {
  appearsOn: string;
  formName: string;
  formType: string;
  lastSubmission: string;
  previewHref: string;
  routesTo: "Prayer Team" | "Profile Admin / Support Team" | "Support Team";
  status: "Draft" | "Live";
  submissions: number;
  submissionsHref: string;
};

export type AccessGateRow = {
  accessType: "Protected Page" | "System/Auth";
  editHref: string;
  gateName: string;
  managedIn: string;
  status: "Active" | "Draft" | "Live";
  url: string;
  viewHref: string;
};

export type RoutingRuleRow = {
  description: string;
  destination: "Prayer Team" | "Profile Admin / Support Team" | "Support Team" | "System/Auth";
  id: string;
  source: string;
};

type DetailRecord =
  | { type: "access"; row: AccessGateRow }
  | { type: "form"; row: PublicFormRow }
  | { type: "page"; row: PublicPageRow }
  | { type: "routing"; row: RoutingRuleRow };

const tabs: Array<{ id: PublicExperienceTab; label: string }> = [
  { id: "pages", label: "Pages" },
  { id: "forms", label: "Forms" },
  { id: "access", label: "Access" },
  { id: "routing", label: "Routing" },
];

const tabButtonBaseClass = "inline-flex h-10 w-[132px] shrink-0 items-center justify-center rounded-lg border px-3 text-center text-[10px] uppercase tracking-[0.16em] transition-colors";

function routeTone(route: PublicFormRow["routesTo"] | RoutingRuleRow["destination"] | "System/Auth") {
  if (route === "Prayer Team") return "amber";
  if (route === "Support Team") return "blue";
  if (route === "System/Auth") return "green";
  return "muted";
}

function StatusBadge({ status }: { status: "Active" | "Draft" | "Live" }) {
  return <AdminBadge tone={status === "Draft" ? "muted" : "green"}>{status.toUpperCase()}</AdminBadge>;
}

function RouteBadge({ route }: { route: PublicFormRow["routesTo"] | RoutingRuleRow["destination"] | "System/Auth" }) {
  return <AdminBadge tone={routeTone(route)}>{route}</AdminBadge>;
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
      className={`inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-[10px] uppercase tracking-[0.14em] transition-colors ${
        variant === "gold"
          ? "border-transparent bg-[#D4A63D] text-black hover:bg-[#F5B942]"
          : "border-stone-700 text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]"
      }`}
      href={href}
      onClick={(event) => event.stopPropagation()}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </Link>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-6 text-sm leading-7 text-stone-400">
      {label}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <p
        className="text-[10px] uppercase tracking-[0.16em] text-stone-400"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold leading-none text-stone-50">
        {value}
      </p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.18em] text-stone-500"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        {label}
      </p>
      <div className="mt-1 text-sm leading-6 text-stone-300">{value || "-"}</div>
    </div>
  );
}

function DetailDrawer({
  onClose,
  record,
}: {
  onClose: () => void;
  record: DetailRecord | null;
}) {
  if (!record) {
    return null;
  }

  const title = record.type === "page"
    ? record.row.pageName
    : record.type === "form"
      ? record.row.formName
      : record.type === "access"
        ? record.row.gateName
        : record.row.source;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm">
      <aside className="ml-auto h-full w-full max-w-lg overflow-y-auto border-l border-stone-800 bg-[#070707] p-5 shadow-[0_0_80px_rgba(0,0,0,0.55)] md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              Detail
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-stone-100">{title}</h2>
          </div>
          <button
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-stone-700 px-3 text-[10px] uppercase tracking-[0.16em] text-stone-300 hover:border-[#D4A63D] hover:text-[#F5B942]"
            onClick={onClose}
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            type="button"
          >
            Close
          </button>
        </div>

        {record.type === "page" ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <DetailItem label="URL" value={<Link className="hover:text-[#F5B942]" href={record.row.url}>{record.row.url}</Link>} />
              <DetailItem label="Status" value={<StatusBadge status={record.row.status} />} />
              <DetailItem label="Owner" value={record.row.owner} />
              <DetailItem label="Last Updated" value={record.row.lastUpdated} />
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <ActionLink href={record.row.manageHref} variant="gold">Manage</ActionLink>
              <ActionLink href={record.row.url}>View</ActionLink>
            </div>
          </>
        ) : null}

        {record.type === "form" ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <DetailItem label="Appears On" value={record.row.appearsOn} />
              <DetailItem label="Form Type" value={record.row.formType} />
              <DetailItem label="Status" value={<StatusBadge status={record.row.status} />} />
              <DetailItem label="Routes To" value={<RouteBadge route={record.row.routesTo} />} />
              <DetailItem label="Submissions" value={record.row.submissions} />
              <DetailItem label="Last Submission" value={record.row.lastSubmission} />
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <ActionLink href={record.row.submissionsHref} variant="gold">Submissions</ActionLink>
              <ActionLink href={record.row.previewHref}>Preview</ActionLink>
              <ActionLink href="/admin/public-experience?tab=routing">Routing</ActionLink>
            </div>
          </>
        ) : null}

        {record.type === "access" ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <DetailItem label="URL" value={<Link className="hover:text-[#F5B942]" href={record.row.url}>{record.row.url}</Link>} />
              <DetailItem label="Access Type" value={record.row.accessType} />
              <DetailItem label="Status" value={<StatusBadge status={record.row.status} />} />
              <DetailItem label="Managed In" value={record.row.managedIn} />
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <ActionLink href={record.row.editHref} variant="gold">Manage</ActionLink>
              <ActionLink href={record.row.viewHref}>View</ActionLink>
            </div>
          </>
        ) : null}

        {record.type === "routing" ? (
          <div className="mt-6 grid gap-4">
            <DetailItem label="Routes To" value={<RouteBadge route={record.row.destination} />} />
            <DetailItem label="Rule" value={record.row.source} />
            <DetailItem label="Description" value={record.row.description} />
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function DetailButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="inline-flex min-h-8 items-center justify-center rounded-lg border border-stone-700 px-3 text-[10px] uppercase tracking-[0.14em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      type="button"
    >
      Details
    </button>
  );
}

function RecordCard({
  children,
  onClick,
  selected,
}: {
  children: ReactNode;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <article
      className={`min-w-0 cursor-pointer rounded-xl border p-4 transition-colors ${
        selected
          ? "border-[#D4A63D]/55 bg-[#C9A24A]/[0.07]"
          : "border-stone-800/75 bg-[#080808]/90 hover:border-stone-700 hover:bg-stone-950/80"
      }`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {children}
    </article>
  );
}

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p
        className="text-[9px] uppercase tracking-[0.14em] text-stone-500"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        {label}
      </p>
      <div className="mt-1 truncate text-sm text-stone-300">{value}</div>
    </div>
  );
}

function PagesList({
  onSelect,
  rows,
  selectedId,
}: {
  onSelect: (record: DetailRecord) => void;
  rows: readonly PublicPageRow[];
  selectedId: string;
}) {
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <RecordCard key={row.id} onClick={() => onSelect({ row, type: "page" })} selected={selectedId === row.id}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.3fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-stone-50">{row.pageName}</h3>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-1 truncate text-sm text-stone-400">{row.url}</p>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <MetaItem label="Owner" value={row.owner} />
              <MetaItem label="Updated" value={row.lastUpdated} />
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <ActionLink href={row.manageHref} variant="gold">Manage</ActionLink>
              <ActionLink href={row.url}>View</ActionLink>
              <DetailButton onClick={() => onSelect({ row, type: "page" })} />
            </div>
          </div>
        </RecordCard>
      ))}
    </div>
  );
}

function FormsList({
  onSelect,
  rows,
  selectedId,
}: {
  onSelect: (record: DetailRecord) => void;
  rows: readonly PublicFormRow[];
  selectedId: string;
}) {
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <RecordCard key={row.formType} onClick={() => onSelect({ row, type: "form" })} selected={selectedId === row.formType}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.45fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-stone-50">{row.formName}</h3>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-1 truncate text-sm text-stone-400">{row.appearsOn}</p>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <MetaItem label="Routes To" value={<RouteBadge route={row.routesTo} />} />
              <MetaItem label="Submissions" value={row.submissions} />
              <MetaItem label="Last" value={row.lastSubmission} />
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <ActionLink href={row.submissionsHref} variant="gold">Submissions</ActionLink>
              <ActionLink href={row.previewHref}>Preview</ActionLink>
              <DetailButton onClick={() => onSelect({ row, type: "form" })} />
            </div>
          </div>
        </RecordCard>
      ))}
    </div>
  );
}

function AccessList({
  onSelect,
  rows,
  selectedId,
}: {
  onSelect: (record: DetailRecord) => void;
  rows: readonly AccessGateRow[];
  selectedId: string;
}) {
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <RecordCard key={row.gateName} onClick={() => onSelect({ row, type: "access" })} selected={selectedId === row.gateName}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.3fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-stone-50">{row.gateName}</h3>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-1 truncate text-sm text-stone-400">{row.url}</p>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <MetaItem label="Type" value={row.accessType} />
              <MetaItem label="Managed In" value={row.managedIn} />
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <ActionLink href={row.editHref} variant="gold">Manage</ActionLink>
              <ActionLink href={row.viewHref}>View</ActionLink>
              <DetailButton onClick={() => onSelect({ row, type: "access" })} />
            </div>
          </div>
        </RecordCard>
      ))}
    </div>
  );
}

function RoutingList({
  onSelect,
  rows,
  selectedId,
}: {
  onSelect: (record: DetailRecord) => void;
  rows: readonly RoutingRuleRow[];
  selectedId: string;
}) {
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <RecordCard key={row.id} onClick={() => onSelect({ row, type: "routing" })} selected={selectedId === row.id}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-center">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-stone-50">{row.source}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-400">{row.description}</p>
            </div>
            <RouteBadge route={row.destination} />
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <DetailButton onClick={() => onSelect({ row, type: "routing" })} />
            </div>
          </div>
        </RecordCard>
      ))}
    </div>
  );
}

function selectedRecordId(record: DetailRecord | null) {
  if (!record) return "";
  if (record.type === "page") return record.row.id;
  if (record.type === "form") return record.row.formType;
  if (record.type === "access") return record.row.gateName;
  return record.row.id;
}

export function PublicExperienceControl({
  accessGates,
  forms,
  initialTab,
  pages,
  routingRules,
}: {
  accessGates: readonly AccessGateRow[];
  forms: readonly PublicFormRow[];
  initialTab: PublicExperienceTab;
  pages: readonly PublicPageRow[];
  routingRules: readonly RoutingRuleRow[];
}) {
  const [activeTab, setActiveTab] = useState<PublicExperienceTab>(initialTab);
  const [selectedRecord, setSelectedRecord] = useState<DetailRecord | null>(null);
  const [query, setQuery] = useState("");
  const selectedId = selectedRecordId(selectedRecord);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    setActiveTab(initialTab);
    setSelectedRecord(null);
  }, [initialTab]);

  const filteredPages = useMemo(() => (
    pages.filter((row) => `${row.pageName} ${row.url} ${row.owner}`.toLowerCase().includes(normalizedQuery))
  ), [normalizedQuery, pages]);
  const filteredForms = useMemo(() => (
    forms.filter((row) => `${row.formName} ${row.appearsOn} ${row.routesTo} ${row.formType}`.toLowerCase().includes(normalizedQuery))
  ), [forms, normalizedQuery]);
  const filteredAccessGates = useMemo(() => (
    accessGates.filter((row) => `${row.gateName} ${row.url} ${row.accessType}`.toLowerCase().includes(normalizedQuery))
  ), [accessGates, normalizedQuery]);
  const filteredRoutingRules = useMemo(() => (
    routingRules.filter((row) => `${row.source} ${row.destination} ${row.description}`.toLowerCase().includes(normalizedQuery))
  ), [normalizedQuery, routingRules]);
  const activeCount = {
    access: filteredAccessGates.length,
    forms: filteredForms.length,
    pages: filteredPages.length,
    routing: filteredRoutingRules.length,
  }[activeTab];

  return (
    <div className="min-w-0 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Pages" value={pages.length} />
        <SummaryCard label="Forms" value={forms.length} />
        <SummaryCard label="Access" value={accessGates.length} />
        <SummaryCard label="Routes" value={routingRules.length} />
      </div>

      <div className="flex max-w-full flex-wrap items-center gap-2 border-b border-stone-800/75 pb-4" role="tablist" aria-label="Public Experience sections">
          {tabs.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={`${tabButtonBaseClass} ${
                activeTab === tab.id
                  ? "border-[#D4A63D] bg-[#D4A63D] text-black"
                  : "border-stone-800 bg-[#090909] text-stone-300 hover:border-stone-600 hover:bg-stone-900/80 hover:text-stone-100"
              }`}
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedRecord(null);
              }}
              role="tab"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              type="button"
            >
              {tab.label}
            </button>
          ))}
      </div>

      <div className="grid min-w-0 gap-3 rounded-xl border border-stone-800/75 bg-[#080808]/90 p-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto] lg:items-center">
        <label className="block min-w-0">
          <span className="sr-only">Search public experience records</span>
          <input
            className="min-h-11 w-full rounded-lg border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search current tab"
            value={query}
          />
        </label>
        <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          {activeCount} shown
        </p>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <ActionLink href="/admin/public-experience?tab=forms" variant="gold">Add New Form</ActionLink>
          <ActionLink href="/admin/public-experience?tab=routing">Routing</ActionLink>
        </div>
      </div>

      <div className="min-w-0">
        {activeTab === "pages" ? (
          filteredPages.length > 0
            ? <PagesList onSelect={setSelectedRecord} rows={filteredPages} selectedId={selectedId} />
            : <EmptyState label="No public pages match this search." />
        ) : null}

        {activeTab === "forms" ? (
          filteredForms.length > 0
            ? <FormsList onSelect={setSelectedRecord} rows={filteredForms} selectedId={selectedId} />
            : <EmptyState label="No public forms match this search." />
        ) : null}

        {activeTab === "access" ? (
          filteredAccessGates.length > 0
            ? <AccessList onSelect={setSelectedRecord} rows={filteredAccessGates} selectedId={selectedId} />
            : <EmptyState label="No access gates match this search." />
        ) : null}

        {activeTab === "routing" ? (
          filteredRoutingRules.length > 0
            ? <RoutingList onSelect={setSelectedRecord} rows={filteredRoutingRules} selectedId={selectedId} />
            : <EmptyState label="No routing rules match this search." />
        ) : null}
      </div>

      <DetailDrawer onClose={() => setSelectedRecord(null)} record={selectedRecord} />
    </div>
  );
}
