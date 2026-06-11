"use client";

import Link from "next/link";
import { Building2, Layers, Users, Workflow, type LucideIcon } from "lucide-react";
import { adminFont } from "../_components/AdminUI";
import { type OrganizationSummary } from "@/src/lib/admin/organization-shared";

type OrganizationDisplayRecord = OrganizationSummary & {
  displayType?: string;
  isPreviewOnly?: boolean;
};

const previewOrganizations: OrganizationDisplayRecord[] = [
  {
    applicationCount: 4,
    approvedProfileCount: 0,
    brandingMode: "preview",
    createdAt: "2026-03-20T00:00:00.000Z",
    displayType: "Campus Ministry",
    id: "preview-crew-ministry",
    isPreviewOnly: true,
    lastActivityAt: "2026-06-03T00:00:00.000Z",
    memberCount: 18,
    name: "Crew Ministry",
    pendingApplicationCount: 2,
    slug: "crew-ministry",
    status: "active",
    type: "ministry",
    updatedAt: "2026-06-03T00:00:00.000Z",
    workspaceCount: 6,
  },
  {
    applicationCount: 7,
    approvedProfileCount: 0,
    brandingMode: "preview",
    createdAt: "2026-02-14T00:00:00.000Z",
    displayType: "Missions Organization",
    id: "preview-ywam",
    isPreviewOnly: true,
    lastActivityAt: "2026-06-02T00:00:00.000Z",
    memberCount: 32,
    name: "YWAM",
    pendingApplicationCount: 3,
    slug: "ywam",
    status: "active",
    type: "partner",
    updatedAt: "2026-06-02T00:00:00.000Z",
    workspaceCount: 11,
  },
  {
    applicationCount: 2,
    approvedProfileCount: 0,
    brandingMode: "preview",
    createdAt: "2026-04-01T00:00:00.000Z",
    displayType: "Church",
    id: "preview-ccv",
    isPreviewOnly: true,
    lastActivityAt: "2026-05-30T00:00:00.000Z",
    memberCount: 24,
    name: "Christ's Church of the Valley",
    pendingApplicationCount: 1,
    slug: "christs-church-of-the-valley",
    status: "active",
    type: "church",
    updatedAt: "2026-05-30T00:00:00.000Z",
    workspaceCount: 8,
  },
  {
    applicationCount: 3,
    approvedProfileCount: 0,
    brandingMode: "preview",
    createdAt: "2026-01-29T00:00:00.000Z",
    displayType: "Church",
    id: "preview-river-valley-church",
    isPreviewOnly: true,
    lastActivityAt: "2026-05-28T00:00:00.000Z",
    memberCount: 21,
    name: "River Valley Church",
    pendingApplicationCount: 1,
    slug: "river-valley-church",
    status: "active",
    type: "church",
    updatedAt: "2026-05-28T00:00:00.000Z",
    workspaceCount: 5,
  },
];

function formatDate(value: string | null) {
  if (!value) {
    return "None";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatOrganizationKind(organization: OrganizationDisplayRecord) {
  if (organization.displayType) {
    return organization.displayType;
  }

  if (organization.brandingMode === "usam" || organization.slug === "usa-missionaries") {
    return "Primary Ministry";
  }

  return {
    church: "Church",
    ministry: "Ministry",
    other: "Other",
    partner: "Partner",
  }[organization.type];
}

function statusLabel(status: OrganizationSummary["status"]) {
  return status === "active" ? "Active" : "Pending";
}

function applicationLabel(organization: OrganizationSummary) {
  if (organization.pendingApplicationCount > 0) {
    return `${organization.pendingApplicationCount} pending`;
  }

  return String(organization.applicationCount);
}

function realOrganizationsWithPreview(organizations: OrganizationSummary[]) {
  const visibleOrganizations: OrganizationDisplayRecord[] = organizations.map((organization) => ({ ...organization }));
  const existingNames = new Set(visibleOrganizations.map((organization) => organization.name.toLowerCase()));

  return [
    ...visibleOrganizations,
    ...previewOrganizations.filter((organization) => !existingNames.has(organization.name.toLowerCase())),
  ];
}

function StatusBadge({ status }: { status: OrganizationSummary["status"] }) {
  return (
    <span className="inline-flex w-fit items-center rounded-md border border-[#C2A14E]/35 bg-[#C2A14E]/10 px-1.5 py-0.5 text-xs font-medium text-[#E4C465]">
      {statusLabel(status)}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-stone-800/75 bg-[#080808]/90 p-3">
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-[10px] uppercase tracking-[0.15em] text-stone-500"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-[#C2A14E]" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold leading-none text-stone-50">{value}</p>
    </div>
  );
}

function organizationHref(organization: OrganizationDisplayRecord) {
  return `/admin/organizations/${organization.slug || organization.id}`;
}

function OrganizationMobileCard({ organization }: { organization: OrganizationDisplayRecord }) {
  const content = (
    <article className="rounded-lg border border-stone-800/75 bg-[#080808]/90 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-50">{organization.name}</p>
          <p className="mt-1 text-xs text-stone-500">{formatOrganizationKind(organization)}</p>
        </div>
        <StatusBadge status={organization.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-stone-500">Members</p>
          <p className="mt-0.5 font-semibold text-stone-100">{organization.memberCount}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Workspaces</p>
          <p className="mt-0.5 font-semibold text-stone-100">{organization.workspaceCount}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Applications</p>
          <p className="mt-0.5 font-semibold text-stone-100">{applicationLabel(organization)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Last Updated</p>
          <p className="mt-0.5 font-semibold text-stone-100">{formatDate(organization.updatedAt ?? organization.lastActivityAt)}</p>
        </div>
      </div>

    </article>
  );

  if (organization.isPreviewOnly) {
    return content;
  }

  return (
    <Link className="block transition-colors hover:border-[#C2A14E]" href={organizationHref(organization)}>
      {content}
    </Link>
  );
}

export function OrganizationsClient({
  organizations,
}: {
  organizations: OrganizationSummary[];
}) {
  const displayOrganizations = realOrganizationsWithPreview(organizations);
  const totalOrganizations = displayOrganizations.length;
  const activeOrganizations = displayOrganizations.filter((organization) => organization.status === "active").length;
  const pendingApplications = displayOrganizations.reduce((total, organization) => total + organization.pendingApplicationCount, 0);
  const connectedWorkspaces = displayOrganizations.reduce((total, organization) => total + organization.workspaceCount, 0);

  return (
    <div className="space-y-4">
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Total Organizations" value={totalOrganizations} />
        <StatCard icon={Layers} label="Active Organizations" value={activeOrganizations} />
        <StatCard icon={Workflow} label="Pending Applications" value={pendingApplications} />
        <StatCard icon={Users} label="Connected Workspaces" value={connectedWorkspaces} />
      </section>

      <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90">
        <div className="border-b border-stone-800/75 px-3 py-2.5">
          <p className="text-sm font-semibold text-stone-50">Organizations</p>
        </div>

        {displayOrganizations.length > 0 ? (
          <>
            <div className="hidden xl:block">
              <div
                className="grid grid-cols-[minmax(240px,1.45fr)_170px_82px_76px_96px_120px_120px] gap-3 border-b border-stone-800/75 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-stone-500"
                style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              >
                <span>Organization</span>
                <span>Type</span>
                <span>Status</span>
                <span>Members</span>
                <span>Workspaces</span>
                <span>Applications</span>
                <span>Last Updated</span>
              </div>
              <div className="divide-y divide-stone-800/70">
                {displayOrganizations.map((organization) => {
                  const rowClassName = "grid min-h-12 grid-cols-[minmax(240px,1.45fr)_170px_82px_76px_96px_120px_120px] items-center gap-3 px-3 py-2 text-sm";
                  const rowContent = (
                    <>
                      <p className="min-w-0 truncate font-semibold text-stone-50">{organization.name}</p>
                      <p className="truncate text-stone-300">{formatOrganizationKind(organization)}</p>
                      <StatusBadge status={organization.status} />
                      <p className="font-semibold text-stone-100">{organization.memberCount}</p>
                      <p className="font-semibold text-stone-100">{organization.workspaceCount}</p>
                      <p className="text-stone-300">{applicationLabel(organization)}</p>
                      <p className="text-stone-400">{formatDate(organization.updatedAt ?? organization.lastActivityAt)}</p>
                    </>
                  );

                  return organization.isPreviewOnly ? (
                    <div className={`${rowClassName} text-stone-500`} key={organization.id}>
                      {rowContent}
                    </div>
                  ) : (
                    <Link
                      className={`${rowClassName} transition-colors hover:bg-[#C2A14E]/[0.04]`}
                      href={organizationHref(organization)}
                      key={organization.id}
                    >
                      {rowContent}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 p-2 xl:hidden">
              {displayOrganizations.map((organization) => (
                <OrganizationMobileCard key={organization.id} organization={organization} />
              ))}
            </div>
          </>
        ) : (
          <div className="p-5 text-sm leading-6 text-stone-400">
            No parent organizations are ready for this admin layer yet.
          </div>
        )}
      </section>
    </div>
  );
}
