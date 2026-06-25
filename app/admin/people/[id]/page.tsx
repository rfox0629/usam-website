import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "../../_components/AdminShell";
import { AdminActionLink, AdminBadge, AdminEmptyState, AdminMetricCard, adminFont } from "../../_components/AdminUI";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadOrganizationPersonDetail } from "@/src/lib/admin/organization-data";
import type { OrganizationPersonDetail } from "@/src/lib/admin/organization-shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Person | National Command Center",
};

const peopleHref = "/admin/organizations/usa-missionaries?tab=members";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "None";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatStatus(value: string | null | undefined) {
  return (value ?? "unknown")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function badgeTone(value: string | null | undefined) {
  if (value === "active" || value === "approved") {
    return "green" as const;
  }

  if (value === "archived" || value === "declined" || value === "inactive") {
    return "red" as const;
  }

  if (value === "hidden" || value === "pending" || value === "pending_review") {
    return "amber" as const;
  }

  return "muted" as const;
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <p
        className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        {label}
      </p>
      <p className="mt-1 break-words text-sm leading-6 text-stone-100">{value || "None"}</p>
    </div>
  );
}

function PersonWorkspace({ person }: { person: OrganizationPersonDetail }) {
  if (!person.workspace) {
    return (
      <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
        <p className="text-sm text-stone-500">No workspace is linked to this person.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p
            className="text-[10px] uppercase tracking-[0.16em] text-[#D4A63D]"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            Household Workspace
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold text-stone-100">{person.workspace.name}</h2>
          <p className="mt-1 text-sm text-stone-500">{person.workspace.slug}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <AdminActionLink href={person.workspace.intelligenceHref}>View Intelligence</AdminActionLink>
          <AdminActionLink href={`/dos/app?workspace=${encodeURIComponent(person.workspace.slug)}`}>Open DOS</AdminActionLink>
        </div>
      </div>
    </section>
  );
}

function RecentTables({ person }: { person: OrganizationPersonDetail }) {
  return (
    <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90">
      <div className="border-b border-stone-800/75 px-4 py-3">
        <p className="text-sm font-semibold text-stone-100">Individual Tables</p>
      </div>
      {person.recentTables.length ? (
        <div className="divide-y divide-stone-800/70">
          {person.recentTables.map((table) => (
            <div
              className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_8rem]"
              key={table.id}
            >
              <span className="font-semibold text-stone-100">{formatStatus(table.type)}</span>
              <span className="min-w-0 truncate text-stone-400">
                {table.participantNames.length ? table.participantNames.join(", ") : "No people linked"}
              </span>
              <span className="text-stone-500 md:text-right">{formatDate(table.date)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-5 text-sm leading-6 text-stone-500">
          {person.metrics.tableSignal === "auth-linked"
            ? "No individual tables are linked to this person yet."
            : "Individual table counts need this person to be linked to an auth user."}
        </p>
      )}
    </section>
  );
}

function PersonDetail({ person }: { person: OrganizationPersonDetail }) {
  return (
    <div className="space-y-4">
      <Link
        className="inline-flex items-center text-[11px] uppercase tracking-[0.16em] text-stone-500 transition-colors hover:text-[#D4A63D]"
        href={peopleHref}
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        Back to People
      </Link>

      <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold text-stone-50">{person.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminBadge tone={badgeTone(person.status)}>{formatStatus(person.status)}</AdminBadge>
              <AdminBadge>{person.role || "Member"}</AdminBadge>
              <AdminBadge>{person.identityKind === "team_member" ? "Team Member" : "Profile"}</AdminBadge>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-3">
        <AdminMetricCard label="Individual Tables" value={person.metrics.tables} />
        <AdminMetricCard label="Created Field People" value={person.metrics.fieldPeople} />
        <AdminMetricCard label="Metric Signal" value={person.metrics.tableSignal === "auth-linked" ? "Linked" : "Unlinked"} />
      </section>

      <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Detail label="Email" value={person.email} />
          <Detail label="Identity" value={person.identityValue} />
          <Detail label="Relationship" value={person.relationshipToWorkspace} />
          <Detail label="Source" value={person.source} />
          <Detail label="Public Team" value={person.isPublic === null ? "Unknown" : person.isPublic ? "Yes" : "No"} />
          <Detail label="Created" value={formatDate(person.createdAt)} />
          <Detail label="Updated" value={formatDate(person.updatedAt)} />
          <Detail label="Last Active" value={formatDate(person.lastActiveAt)} />
        </div>
      </section>

      <PersonWorkspace person={person} />
      <RecentTables person={person} />
    </div>
  );
}

export default async function AdminPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const { id } = await params;
  const { error, person } = await loadOrganizationPersonDetail(id);

  if (!person && !error) {
    notFound();
  }

  return (
    <AdminShell
      active="organizations"
      title="Person"
    >
      {error || !person ? (
        <AdminEmptyState
          description={error ?? "Person not found."}
          title="Person unavailable"
        />
      ) : (
        <PersonDetail person={person} />
      )}
    </AdminShell>
  );
}
