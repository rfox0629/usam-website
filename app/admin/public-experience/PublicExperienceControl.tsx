"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AdminBadge, adminFont } from "../_components/AdminUI";

export type PublicExperienceTab = "access" | "forms" | "website";

export type PublicPageRow = {
  id: string;
  owner: string;
  pageName: string;
  route: string;
  status: "Draft" | "Live" | "Protected";
};

export type PublicFormRow = {
  formName: string;
  formType: string;
  inboxHref: string;
  lastSubmission: string;
  newPending: number;
  ownerInbox: string;
  publicRoute: string;
  submissions: number;
};

export type AccessGateRow = {
  actionHref: string;
  actionLabel: "Manage" | "View";
  gateName: string;
  route: string;
  status: "Protected" | "Public";
};

const tabs: Array<{ id: PublicExperienceTab; label: string }> = [
  { id: "website", label: "Website" },
  { id: "forms", label: "Forms" },
  { id: "access", label: "Access" },
];

const tabButtonBaseClass = "inline-flex h-10 w-[120px] shrink-0 items-center justify-center rounded-lg border px-3 text-center text-[10px] uppercase tracking-[0.16em] transition-colors";

function StatusBadge({ status }: { status: AccessGateRow["status"] | PublicPageRow["status"] }) {
  return (
    <AdminBadge tone={status === "Draft" ? "muted" : status === "Protected" ? "amber" : "green"}>
      {status}
    </AdminBadge>
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
      className={`inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-[10px] uppercase tracking-[0.14em] transition-colors ${
        variant === "gold"
          ? "border-transparent bg-[#D4A63D] text-black hover:bg-[#F5B942]"
          : "border-stone-700 text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]"
      }`}
      href={href}
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

function SummaryCard({ label, value }: { label: string; value: ReactNode }) {
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

function RegistryShell({
  children,
  header,
}: {
  children: ReactNode;
  header: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-800/75 bg-[#080808]/90">
      <div className="border-b border-stone-800/70 bg-[#050505]/65 px-4 py-3">
        {header}
      </div>
      <div className="divide-y divide-stone-900/95">
        {children}
      </div>
    </section>
  );
}

function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[9px] uppercase tracking-[0.16em] text-stone-500"
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </p>
  );
}

function MetaCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <HeaderCell>{label}</HeaderCell>
      <div className="mt-1 truncate text-sm text-stone-300">{value || "-"}</div>
    </div>
  );
}

function WebsiteRegistry({ rows }: { rows: readonly PublicPageRow[] }) {
  return (
    <RegistryShell
      header={(
        <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_120px_170px_90px]">
          <HeaderCell>Page</HeaderCell>
          <HeaderCell>Route</HeaderCell>
          <HeaderCell>Status</HeaderCell>
          <HeaderCell>Owner</HeaderCell>
          <HeaderCell>Action</HeaderCell>
        </div>
      )}
    >
      {rows.map((row) => (
        <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_120px_170px_90px] lg:items-center" key={row.id}>
          <MetaCell label="Page" value={<span className="font-semibold text-stone-100">{row.pageName}</span>} />
          <MetaCell label="Route" value={row.route} />
          <div>
            <HeaderCell>Status</HeaderCell>
            <div className="mt-1"><StatusBadge status={row.status} /></div>
          </div>
          <MetaCell label="Owner" value={row.owner} />
          <div className="flex lg:justify-end">
            <ActionLink href={row.route}>Open</ActionLink>
          </div>
        </div>
      ))}
    </RegistryShell>
  );
}

function FormsRegistry({ rows }: { rows: readonly PublicFormRow[] }) {
  return (
    <RegistryShell
      header={(
        <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_150px_90px_110px_120px_120px]">
          <HeaderCell>Form Name</HeaderCell>
          <HeaderCell>Public Route</HeaderCell>
          <HeaderCell>Owner Inbox</HeaderCell>
          <HeaderCell>Total</HeaderCell>
          <HeaderCell>New/Pending</HeaderCell>
          <HeaderCell>Last</HeaderCell>
          <HeaderCell>Action</HeaderCell>
        </div>
      )}
    >
      {rows.map((row) => (
        <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_150px_90px_110px_120px_120px] lg:items-center" key={row.formType}>
          <MetaCell label="Form Name" value={<span className="font-semibold text-stone-100">{row.formName}</span>} />
          <MetaCell label="Public Route" value={row.publicRoute} />
          <MetaCell label="Owner Inbox" value={row.ownerInbox} />
          <MetaCell label="Total" value={row.submissions} />
          <MetaCell label="New / Pending" value={row.newPending} />
          <MetaCell label="Last" value={row.lastSubmission} />
          <div className="flex lg:justify-end">
            <ActionLink href={row.inboxHref} variant="gold">Open Inbox</ActionLink>
          </div>
        </div>
      ))}
    </RegistryShell>
  );
}

function AccessRegistry({ rows }: { rows: readonly AccessGateRow[] }) {
  return (
    <RegistryShell
      header={(
        <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_150px_110px]">
          <HeaderCell>Access Item</HeaderCell>
          <HeaderCell>Route</HeaderCell>
          <HeaderCell>Status</HeaderCell>
          <HeaderCell>Action</HeaderCell>
        </div>
      )}
    >
      {rows.map((row) => (
        <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_150px_110px] lg:items-center" key={row.gateName}>
          <MetaCell label="Access Item" value={<span className="font-semibold text-stone-100">{row.gateName}</span>} />
          <MetaCell label="Route" value={row.route} />
          <div>
            <HeaderCell>Status</HeaderCell>
            <div className="mt-1"><StatusBadge status={row.status} /></div>
          </div>
          <div className="flex lg:justify-end">
            <ActionLink href={row.actionHref} variant={row.actionLabel === "Manage" ? "gold" : "outline"}>
              {row.actionLabel}
            </ActionLink>
          </div>
        </div>
      ))}
    </RegistryShell>
  );
}

export function PublicExperienceControl({
  accessGates,
  forms,
  initialTab,
  pages,
}: {
  accessGates: readonly AccessGateRow[];
  forms: readonly PublicFormRow[];
  initialTab: PublicExperienceTab;
  pages: readonly PublicPageRow[];
}) {
  const [activeTab, setActiveTab] = useState<PublicExperienceTab>(initialTab);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const filteredPages = useMemo(() => (
    pages.filter((row) => `${row.pageName} ${row.route} ${row.owner}`.toLowerCase().includes(normalizedQuery))
  ), [normalizedQuery, pages]);
  const filteredForms = useMemo(() => (
    forms.filter((row) => `${row.formName} ${row.publicRoute} ${row.ownerInbox} ${row.formType}`.toLowerCase().includes(normalizedQuery))
  ), [forms, normalizedQuery]);
  const filteredAccessGates = useMemo(() => (
    accessGates.filter((row) => `${row.gateName} ${row.route} ${row.status}`.toLowerCase().includes(normalizedQuery))
  ), [accessGates, normalizedQuery]);
  const activeCount = {
    access: filteredAccessGates.length,
    forms: filteredForms.length,
    website: filteredPages.length,
  }[activeTab];

  return (
    <div className="min-w-0 space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Website Pages" value={pages.length} />
        <SummaryCard label="Public Forms" value={forms.length} />
        <SummaryCard label="Access Items" value={accessGates.length} />
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
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid min-w-0 gap-3 rounded-xl border border-stone-800/75 bg-[#080808]/90 p-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
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
      </div>

      <div className="min-w-0">
        {activeTab === "website" ? (
          filteredPages.length > 0
            ? <WebsiteRegistry rows={filteredPages} />
            : <EmptyState label="No website pages match this search." />
        ) : null}

        {activeTab === "forms" ? (
          filteredForms.length > 0
            ? <FormsRegistry rows={filteredForms} />
            : <EmptyState label="No forms match this search." />
        ) : null}

        {activeTab === "access" ? (
          filteredAccessGates.length > 0
            ? <AccessRegistry rows={filteredAccessGates} />
            : <EmptyState label="No access items match this search." />
        ) : null}
      </div>
    </div>
  );
}
