"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  { id: "access", label: "Access Gates" },
  { id: "routing", label: "Routing" },
];

function routeTone(route: PublicFormRow["routesTo"] | RoutingRuleRow["destination"] | "System/Auth") {
  if (route === "Prayer Team") return "amber";
  if (route === "Support Team") return "blue";
  if (route === "System/Auth") return "green";
  return "muted";
}

function StatusBadge({ status }: { status: "Active" | "Draft" | "Live" }) {
  return <AdminBadge tone={status === "Draft" ? "muted" : "green"}>{status}</AdminBadge>;
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
      className={`inline-flex min-h-8 items-center justify-center whitespace-nowrap border px-3 text-[10px] uppercase tracking-[0.16em] transition-colors ${
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
    <div className="border border-stone-800/75 bg-[#080808]/85 p-6 text-sm leading-7 text-stone-400">
      {label}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
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
    return (
      <aside className="hidden border border-stone-800/75 bg-[#080808]/85 p-5 xl:block xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)]">
        <p
          className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          Public Experience
        </p>
        <p className="mt-4 text-sm leading-7 text-stone-400">
          Select a row to inspect the public URL, routing owner, and next action.
        </p>
      </aside>
    );
  }

  const title = record.type === "page"
    ? record.row.pageName
    : record.type === "form"
      ? record.row.formName
      : record.type === "access"
        ? record.row.gateName
        : record.row.source;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-stone-800 bg-[#070707] p-5 shadow-[0_0_80px_rgba(0,0,0,0.55)] md:p-6 xl:sticky xl:top-8 xl:z-auto xl:max-h-[calc(100vh-4rem)] xl:border xl:border-stone-800/75 xl:bg-[#080808]/85 xl:shadow-none">
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
          className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.16em] text-stone-300 hover:border-[#D4A63D] hover:text-[#F5B942]"
          onClick={onClose}
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          type="button"
        >
          Close
        </button>
      </div>

      {record.type === "page" ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <DetailItem label="URL" value={<Link className="hover:text-[#F5B942]" href={record.row.url}>{record.row.url}</Link>} />
            <DetailItem label="Status" value={<StatusBadge status={record.row.status} />} />
            <DetailItem label="Owner" value={record.row.owner} />
            <DetailItem label="Last Updated" value={record.row.lastUpdated} />
          </div>
          <div className="mt-7 grid gap-3">
            <ActionLink href={record.row.url} variant="gold">View Page</ActionLink>
            <ActionLink href={record.row.manageHref}>Manage Page</ActionLink>
          </div>
        </>
      ) : null}

      {record.type === "form" ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <DetailItem label="Appears On" value={record.row.appearsOn} />
            <DetailItem label="Form Type" value={record.row.formType} />
            <DetailItem label="Status" value={<StatusBadge status={record.row.status} />} />
            <DetailItem label="Routes To" value={<RouteBadge route={record.row.routesTo} />} />
            <DetailItem label="Submissions" value={record.row.submissions} />
            <DetailItem label="Last Submission" value={record.row.lastSubmission} />
          </div>
          <div className="mt-7 grid gap-3">
            <ActionLink href={record.row.previewHref} variant="gold">Preview Form</ActionLink>
            <ActionLink href={record.row.submissionsHref}>View Submissions</ActionLink>
            <ActionLink href="/admin/public-experience?tab=routing">Edit Routing</ActionLink>
          </div>
        </>
      ) : null}

      {record.type === "access" ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <DetailItem label="URL" value={<Link className="hover:text-[#F5B942]" href={record.row.url}>{record.row.url}</Link>} />
            <DetailItem label="Access Type" value={record.row.accessType} />
            <DetailItem label="Status" value={<StatusBadge status={record.row.status} />} />
            <DetailItem label="Managed In" value={record.row.managedIn} />
          </div>
          <div className="mt-7 grid gap-3">
            <ActionLink href={record.row.viewHref} variant="gold">View Gate</ActionLink>
            <ActionLink href={record.row.editHref}>Edit Access Code</ActionLink>
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
  );
}

function PagesTable({
  onSelect,
  rows,
  selectedId,
}: {
  onSelect: (record: DetailRecord) => void;
  rows: readonly PublicPageRow[];
  selectedId: string;
}) {
  return (
    <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] border-collapse text-left">
          <thead>
            <tr className="border-b border-stone-800/70 text-[10px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              <th className="w-[24%] px-4 py-3">Page Name</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Last Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-900">
            {rows.map((row) => (
              <tr
                className={`cursor-pointer transition-colors hover:bg-stone-950/80 ${selectedId === row.id ? "bg-[#C9A24A]/5" : ""}`}
                key={row.id}
                onClick={() => onSelect({ row, type: "page" })}
              >
                <td className="px-4 py-3 font-medium text-stone-100">{row.pageName}</td>
                <td className="px-4 py-3 text-sm text-stone-400">{row.url}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-sm text-stone-300">{row.owner}</td>
                <td className="px-4 py-3 text-sm text-stone-500">{row.lastUpdated}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <ActionLink href={row.url}>View Page</ActionLink>
                    <ActionLink href={row.manageHref}>Manage Page</ActionLink>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormsTable({
  onSelect,
  rows,
  selectedId,
}: {
  onSelect: (record: DetailRecord) => void;
  rows: readonly PublicFormRow[];
  selectedId: string;
}) {
  return (
    <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-stone-800/70 text-[10px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              <th className="w-[24%] px-4 py-3">Form Name</th>
              <th className="px-4 py-3">Appears On</th>
              <th className="px-4 py-3">Routes To</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Submissions</th>
              <th className="px-4 py-3">Last Submission</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-900">
            {rows.map((row) => (
              <tr
                className={`cursor-pointer transition-colors hover:bg-stone-950/80 ${selectedId === row.formType ? "bg-[#C9A24A]/5" : ""}`}
                key={row.formType}
                onClick={() => onSelect({ row, type: "form" })}
              >
                <td className="px-4 py-3 font-medium text-stone-100">{row.formName}</td>
                <td className="px-4 py-3 text-sm text-stone-400">{row.appearsOn}</td>
                <td className="px-4 py-3"><RouteBadge route={row.routesTo} /></td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-right text-sm tabular-nums text-stone-200">{row.submissions}</td>
                <td className="px-4 py-3 text-sm text-stone-500">{row.lastSubmission}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <ActionLink href={row.previewHref}>Preview Form</ActionLink>
                    <ActionLink href={row.submissionsHref} variant="gold">View Submissions</ActionLink>
                    <ActionLink href="/admin/public-experience?tab=routing">Edit Routing</ActionLink>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccessTable({
  onSelect,
  rows,
  selectedId,
}: {
  onSelect: (record: DetailRecord) => void;
  rows: readonly AccessGateRow[];
  selectedId: string;
}) {
  return (
    <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] border-collapse text-left">
          <thead>
            <tr className="border-b border-stone-800/70 text-[10px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              <th className="w-[25%] px-4 py-3">Gate Name</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Access Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Managed In</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-900">
            {rows.map((row) => (
              <tr
                className={`cursor-pointer transition-colors hover:bg-stone-950/80 ${selectedId === row.gateName ? "bg-[#C9A24A]/5" : ""}`}
                key={row.gateName}
                onClick={() => onSelect({ row, type: "access" })}
              >
                <td className="px-4 py-3 font-medium text-stone-100">{row.gateName}</td>
                <td className="px-4 py-3 text-sm text-stone-400">{row.url}</td>
                <td className="px-4 py-3 text-sm text-stone-300">{row.accessType}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-sm text-stone-300">{row.managedIn}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <ActionLink href={row.viewHref}>View Gate</ActionLink>
                    <ActionLink href={row.editHref} variant="gold">Edit Access Code</ActionLink>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoutingTable({
  onSelect,
  rows,
  selectedId,
}: {
  onSelect: (record: DetailRecord) => void;
  rows: readonly RoutingRuleRow[];
  selectedId: string;
}) {
  return (
    <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-stone-800/70 text-[10px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              <th className="w-[30%] px-4 py-3">Form / Gate</th>
              <th className="px-4 py-3">Routes To</th>
              <th className="px-4 py-3">Routing Rule</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-900">
            {rows.map((row) => (
              <tr
                className={`cursor-pointer transition-colors hover:bg-stone-950/80 ${selectedId === row.id ? "bg-[#C9A24A]/5" : ""}`}
                key={row.id}
                onClick={() => onSelect({ row, type: "routing" })}
              >
                <td className="px-4 py-3 font-medium text-stone-100">{row.source}</td>
                <td className="px-4 py-3"><RouteBadge route={row.destination} /></td>
                <td className="px-4 py-3 text-sm leading-6 text-stone-400">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 border border-stone-800/75 bg-[#080808]/85 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              className={`min-h-10 shrink-0 border px-4 text-[11px] uppercase tracking-[0.16em] transition-colors ${
                activeTab === tab.id
                  ? "border-[#D4A63D]/50 bg-[#D4A63D]/10 text-[#F5B942]"
                  : "border-stone-800 text-stone-300 hover:border-stone-700 hover:text-stone-100"
              }`}
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedRecord(null);
              }}
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="block w-full lg:max-w-sm">
          <span className="sr-only">Search public experience records</span>
          <input
            className="min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search current tab"
            value={query}
          />
        </label>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {activeTab === "pages" ? (
          filteredPages.length > 0
            ? <PagesTable onSelect={setSelectedRecord} rows={filteredPages} selectedId={selectedId} />
            : <EmptyState label="No public pages match this search." />
        ) : null}

        {activeTab === "forms" ? (
          filteredForms.length > 0
            ? <FormsTable onSelect={setSelectedRecord} rows={filteredForms} selectedId={selectedId} />
            : <EmptyState label="No public forms match this search." />
        ) : null}

        {activeTab === "access" ? (
          filteredAccessGates.length > 0
            ? <AccessTable onSelect={setSelectedRecord} rows={filteredAccessGates} selectedId={selectedId} />
            : <EmptyState label="No access gates match this search." />
        ) : null}

        {activeTab === "routing" ? (
          filteredRoutingRules.length > 0
            ? <RoutingTable onSelect={setSelectedRecord} rows={filteredRoutingRules} selectedId={selectedId} />
            : <EmptyState label="No routing rules match this search." />
        ) : null}

        <DetailDrawer onClose={() => setSelectedRecord(null)} record={selectedRecord} />
      </div>
    </div>
  );
}
