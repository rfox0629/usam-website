import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "../../../_components/AdminShell";
import { AdminActionLink, AdminBadge, AdminEmptyState, AdminMetricCard, adminFont } from "../../../_components/AdminUI";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadWorkspacePreviewData } from "@/src/lib/admin/organization-data";
import type { WorkspacePreviewData } from "@/src/lib/admin/organization-shared";

export const dynamic = "force-dynamic";

const workspacesHref = "/admin/organizations/usa-missionaries?tab=workspaces";

export const metadata: Metadata = {
  title: "Workspace Intelligence | National Command Center",
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "No activity";
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

function Section({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-stone-800/75 bg-[#080808]/85">
      <div className="border-b border-stone-800/75 px-4 py-3">
        {eyebrow ? (
          <p
            className="text-[10px] uppercase tracking-[0.18em] text-[#D4A63D]"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-base font-semibold text-stone-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EmptyList({ children }: { children: ReactNode }) {
  return <p className="px-4 py-5 text-sm text-stone-500">{children}</p>;
}

function RecentActivity({ activity }: { activity: WorkspacePreviewData["activity"] }) {
  return (
    <Section eyebrow="Signal" title="Recent Activity">
      {activity.length ? (
        <div className="divide-y divide-stone-800/70">
          {activity.slice(0, 6).map((item) => (
            <Link
              className="grid gap-3 px-4 py-3 text-sm transition-colors hover:bg-stone-900/60 md:grid-cols-[8rem_minmax(0,1fr)_8rem]"
              href={item.href}
              key={item.id}
            >
              <span
                className="text-[10px] uppercase tracking-[0.16em] text-[#D4A63D]"
                style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              >
                {item.label}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-stone-100">{item.title}</span>
                <span className="mt-1 block truncate text-stone-500">{item.detail}</span>
              </span>
              <span className="text-stone-500 md:text-right">{formatDate(item.timestamp)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyList>No recent activity yet.</EmptyList>
      )}
    </Section>
  );
}

function FieldPeople({ people }: { people: WorkspacePreviewData["field"]["people"] }) {
  return (
    <Section eyebrow="Field" title="People">
      {people.length ? (
        <div className="divide-y divide-stone-800/70">
          {people.slice(0, 8).map((person) => (
            <div
              className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_6rem_8rem]"
              key={person.id}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-stone-100">{person.name}</span>
                <span className="mt-1 block truncate text-stone-500">{person.phone ?? person.email ?? "No contact detail"}</span>
              </span>
              <span className="text-stone-400">{person.relationshipType ?? "Relationship pending"}</span>
              <span className="text-stone-400">{person.meetingCount} tables</span>
              <span className="text-stone-500 md:text-right">{formatDate(person.lastActivityAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyList>No field contacts yet.</EmptyList>
      )}
    </Section>
  );
}

function RecentTables({ meetings }: { meetings: WorkspacePreviewData["field"]["meetings"] }) {
  return (
    <Section eyebrow="Tables" title="Recent Tables">
      {meetings.length ? (
        <div className="divide-y divide-stone-800/70">
          {meetings.slice(0, 6).map((meeting) => (
            <div
              className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_8rem]"
              key={meeting.id}
            >
              <span className="font-semibold text-stone-100">{meeting.type ?? "Table"}</span>
              <span className="min-w-0 truncate text-stone-400">
                {meeting.participantNames.length ? meeting.participantNames.join(", ") : "No people linked"}
              </span>
              <span className="text-stone-500 md:text-right">{formatDate(meeting.date)}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyList>No tables logged yet.</EmptyList>
      )}
    </Section>
  );
}

function PrayerSnapshot({ prayer }: { prayer: WorkspacePreviewData["prayer"] }) {
  return (
    <Section eyebrow="Prayer" title="Prayer">
      <div className="grid gap-3 border-b border-stone-800/70 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-stone-500">Requests</p>
          <p className="mt-1 text-2xl font-semibold text-stone-100">{prayer.requests.length}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Active Partners</p>
          <p className="mt-1 text-2xl font-semibold text-stone-100">{prayer.stats.activePartners}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-stone-100">{prayer.stats.pendingRequests}</p>
        </div>
      </div>
      {prayer.requests.length ? (
        <div className="divide-y divide-stone-800/70">
          {prayer.requests.slice(0, 5).map((request) => (
            <div
              className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_8rem_8rem]"
              key={request.id}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-stone-100">{request.title}</span>
                <span className="mt-1 block truncate text-stone-500">{request.personName ?? request.summary}</span>
              </span>
              <AdminBadge tone={request.status === "answered" ? "green" : "blue"}>{request.status}</AdminBadge>
              <span className="text-stone-500 md:text-right">{formatDate(request.updatedAt ?? request.createdAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyList>No prayer requests yet.</EmptyList>
      )}
    </Section>
  );
}

function Members({ members }: { members: WorkspacePreviewData["members"] }) {
  return (
    <Section eyebrow="Access" title="Members">
      {members.length ? (
        <div className="divide-y divide-stone-800/70">
          {members.map((member) => (
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm" key={member.id}>
              <span className="font-semibold text-stone-100">{member.name}</span>
              <span className="text-stone-500">{member.role ?? "Member"}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyList>No members connected yet.</EmptyList>
      )}
    </Section>
  );
}

function WorkspaceIntelligence({ preview }: { preview: WorkspacePreviewData }) {
  const metrics = [
    { label: "People", value: preview.counts.fieldPeople },
    { label: "Tables", value: preview.counts.meetings },
    { label: "Prayer", value: preview.counts.prayerRequests },
    { label: "Fruit", value: preview.counts.fruit },
    { label: "Follow Ups", value: preview.counts.followUps },
    { label: "Members", value: preview.counts.members },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-stone-800/75 bg-[#080808]/85 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.18em] text-[#D4A63D]"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              DOS Intelligence
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-stone-100 md:text-3xl">
              {preview.workspace.displayName}
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              {preview.organizationName} · {preview.workspace.slug}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone={preview.features.dosEnabled ? "green" : "muted"}>DOS</AdminBadge>
            <AdminBadge tone={preview.features.prayerEnabled ? "blue" : "muted"}>Prayer</AdminBadge>
            <AdminBadge tone={preview.features.publicProfileEnabled ? "green" : "muted"}>Profile</AdminBadge>
            <AdminBadge tone={preview.features.supportEnabled ? "amber" : "muted"}>Support</AdminBadge>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <AdminMetricCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>

      <RecentActivity activity={preview.activity} />

      <div className="grid gap-5 xl:grid-cols-2">
        <FieldPeople people={preview.field.people} />
        <RecentTables meetings={preview.field.meetings} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <PrayerSnapshot prayer={preview.prayer} />
        <Members members={preview.members} />
      </div>
    </div>
  );
}

export default async function WorkspacePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const { id } = await params;
  const { error, preview } = await loadWorkspacePreviewData(id);

  return (
    <AdminShell
      active="organizations"
      action={<AdminActionLink href={workspacesHref}>Back to Workspaces</AdminActionLink>}
      title="Workspace Intelligence"
    >
      {error || !preview ? (
        <AdminEmptyState
          action={<AdminActionLink href={workspacesHref}>Back to Workspaces</AdminActionLink>}
          description={error ?? "This workspace intelligence view is not available."}
          title="Workspace unavailable"
        />
      ) : (
        <WorkspaceIntelligence preview={preview} />
      )}
    </AdminShell>
  );
}
