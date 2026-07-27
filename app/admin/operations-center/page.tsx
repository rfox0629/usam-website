import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  RadioTower,
} from "lucide-react";
import { AdminShell } from "../_components/AdminShell";
import { AdminBadge, AdminEmptyState, AdminMetricCard, adminFont, type AdminBadgeTone } from "../_components/AdminUI";
import {
  loadOperationsCenterData,
  type OperationAgentState,
  type OperationDepartment,
  type OperationIssue,
  type OperationMilestone,
  type OperationSourceStatus,
  type OperationState,
} from "@/src/lib/operations-center/operations-center";

export const metadata: Metadata = {
  title: "Operations Center | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

const stateLabels: Record<OperationState, string> = {
  blocked: "Blocked",
  executing: "Executing",
  idle: "Idle / Monitoring",
  in_review: "In Review",
  queued: "Queued",
  stale_offline: "Stale / Offline",
  unavailable: "Unavailable",
};

const stateTones: Record<OperationState, AdminBadgeTone> = {
  blocked: "red",
  executing: "green",
  idle: "muted",
  in_review: "amber",
  queued: "blue",
  stale_offline: "red",
  unavailable: "muted",
};

const sourceTones: Record<OperationSourceStatus, AdminBadgeTone> = {
  error: "red",
  live: "green",
  stale: "amber",
  unavailable: "muted",
};

const stateIcons = {
  blocked: AlertTriangle,
  executing: PlayCircle,
  idle: PauseCircle,
  in_review: CheckCircle2,
  queued: Clock3,
  stale_offline: RadioTower,
  unavailable: CircleDashed,
} satisfies Record<OperationState, typeof AlertTriangle>;

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function formatCount(value: number | null) {
  return value === null ? "-" : String(value);
}

function statusValue(value: number | null, noun: string) {
  return value === null ? "Unavailable" : `${value} ${noun}${value === 1 ? "" : "s"}`;
}

function progressLabel(milestone: OperationMilestone) {
  if (milestone.progress === null) {
    return milestone.status || "Progress unavailable";
  }

  return `${Math.round(milestone.progress * 100)}%`;
}

function ExternalTextLink({
  children,
  href,
}: {
  children: ReactNode;
  href: string | null;
}) {
  if (!href) {
    return <span>{children}</span>;
  }

  return (
    <a
      className="inline-flex min-w-0 items-center gap-1.5 text-stone-100 transition-colors hover:text-[#F5B942]"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <span className="min-w-0 truncate">{children}</span>
      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#C9A24A]" strokeWidth={1.8} />
    </a>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[9px] uppercase tracking-[0.16em] text-stone-500"
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </p>
  );
}

function SourcePanel({
  detail,
  fetchedAt,
  label,
  status,
  timeLabel = "Latest signal",
}: {
  detail: string;
  fetchedAt: string | null;
  label: string;
  status: OperationSourceStatus;
  timeLabel?: string;
}) {
  return (
    <section className="border border-stone-800/75 bg-[#080808]/90 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Label>{label}</Label>
          <p className="mt-2 text-sm leading-6 text-stone-300">{detail}</p>
        </div>
        <AdminBadge tone={sourceTones[status]}>{status}</AdminBadge>
      </div>
      <p className="mt-3 text-xs text-stone-500">{timeLabel}: {formatDateTime(fetchedAt)}</p>
    </section>
  );
}

function StatusMetric({
  detail,
  state,
  value,
}: {
  detail: string;
  state: OperationState;
  value: number | null;
}) {
  const Icon = stateIcons[state];

  return (
    <div className="border border-stone-800/75 bg-[#080808]/85 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.18em] text-stone-400"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            {stateLabels[state]}
          </p>
          <p
            className="mt-2 text-3xl font-bold leading-none text-stone-100"
            style={{ fontFamily: adminFont.oswald }}
          >
            {formatCount(value)}
          </p>
        </div>
        <Icon aria-hidden="true" className="h-5 w-5 text-[#C9A24A]" strokeWidth={1.8} />
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">{detail}</p>
    </div>
  );
}

function AgentCard({ lane }: { lane: OperationAgentState }) {
  return (
    <section className="border border-stone-800/75 bg-[#080808]/90 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Label>{lane.agent}</Label>
          <h2 className="mt-2 text-lg font-semibold text-stone-100">{stateLabels[lane.state]}</h2>
        </div>
        <AdminBadge tone={stateTones[lane.state]}>{lane.source}</AdminBadge>
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-400">{lane.detail}</p>
      {lane.issue ? (
        <div className="mt-4 space-y-2 border-t border-stone-800/70 pt-4">
          <MetaLine label="Current Issue">
            <ExternalTextLink href={lane.issue.url}>
              {lane.issue.identifier} - {lane.issue.title}
            </ExternalTextLink>
          </MetaLine>
          <MetaLine label="Started">{formatDateTime(lane.issue.startTime)}</MetaLine>
          <MetaLine label="Latest">{formatDateTime(lane.issue.latestActivityAt)}</MetaLine>
        </div>
      ) : null}
    </section>
  );
}

function MetaLine({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)]">
      <Label>{label}</Label>
      <div className="min-w-0 text-sm text-stone-300">{children}</div>
    </div>
  );
}

function IssueRows({
  empty,
  issues,
  title,
}: {
  empty: string;
  issues: readonly OperationIssue[];
  title: string;
}) {
  return (
    <section className="border border-stone-800/75 bg-[#080808]/90">
      <div className="border-b border-stone-800/70 px-4 py-3">
        <Label>{title}</Label>
      </div>
      {issues.length > 0 ? (
        <div className="divide-y divide-stone-900/95">
          {issues.map((issue) => (
            <div className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_150px_135px]" key={issue.identifier}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-100">
                  <ExternalTextLink href={issue.url}>
                    {issue.identifier} - {issue.title}
                  </ExternalTextLink>
                </p>
                <p className="mt-1 truncate text-xs text-stone-500">{issue.projectName || "No project"}</p>
              </div>
              <div>
                <Label>Agent</Label>
                <p className="mt-1 text-sm text-stone-300">{issue.agent || "Unassigned"}</p>
              </div>
              <div>
                <Label>Latest</Label>
                <p className="mt-1 text-sm text-stone-300">{formatDateTime(issue.latestActivityAt)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="p-4 text-sm text-stone-500">{empty}</p>
      )}
    </section>
  );
}

function MilestoneLine({ milestone }: { milestone: OperationMilestone | null }) {
  if (!milestone) {
    return <span className="text-stone-500">Milestone unavailable</span>;
  }

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span className="truncate">{milestone.name}</span>
      <span className="text-stone-500">{progressLabel(milestone)}</span>
      {milestone.targetDate ? <span className="text-stone-500">{formatDateTime(milestone.targetDate)}</span> : null}
    </span>
  );
}

function DepartmentCard({ department }: { department: OperationDepartment }) {
  return (
    <section className="border border-stone-800/75 bg-[#080808]/90 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Label>Department</Label>
          <h2 className="mt-2 truncate text-lg font-semibold text-stone-100">
            <ExternalTextLink href={department.url}>{department.name}</ExternalTextLink>
          </h2>
        </div>
        <AdminBadge tone={stateTones[department.status]}>{stateLabels[department.status]}</AdminBadge>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <MetaLine label="Project State">{department.projectState || "Unavailable"}</MetaLine>
        <MetaLine label="Executing Agent">{department.currentIssue?.agent || "None confirmed"}</MetaLine>
        <MetaLine label="Current Issue">
          {department.currentIssue ? (
            <ExternalTextLink href={department.currentIssue.url}>
              {department.currentIssue.identifier}
            </ExternalTextLink>
          ) : (
            "No active Linear issue"
          )}
        </MetaLine>
        <MetaLine label="Milestone"><MilestoneLine milestone={department.currentMilestone} /></MetaLine>
        <MetaLine label="Checklist">
          {department.completedCount} done / {department.executingCount} started / {department.inReviewCount} review / {department.queuedCount} queued / {department.blockedCount} blocked
        </MetaLine>
        <MetaLine label="Latest">{formatDateTime(department.lastActivityAt)}</MetaLine>
      </div>
    </section>
  );
}

export default async function OperationsCenterPage() {
  const data = await loadOperationsCenterData();
  const hasLinearData = data.linear.status === "live";

  return (
    <AdminShell
      active="operations-center"
      title="Operations Center"
    >
      <div className="space-y-6">
        <section className="grid gap-3 lg:grid-cols-2">
          <SourcePanel
            detail={`Mode: ${data.dispatcher.mode}. ${data.dispatcher.detail}`}
            fetchedAt={data.dispatcher.heartbeatAt}
            label="Dispatcher"
            status={data.dispatcher.status}
            timeLabel="Last heartbeat"
          />
          <SourcePanel
            detail={data.linear.detail}
            fetchedAt={data.linear.fetchedAt}
            label="Linear"
            status={data.linear.status}
          />
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <StatusMetric detail={statusValue(data.summary.executing, "started issue")} state="executing" value={data.summary.executing} />
          <StatusMetric detail={statusValue(data.summary.queued, "queued issue")} state="queued" value={data.summary.queued} />
          <StatusMetric detail={statusValue(data.summary.inReview, "review issue")} state="in_review" value={data.summary.inReview} />
          <StatusMetric detail={statusValue(data.summary.blocked, "blocked issue")} state="blocked" value={data.summary.blocked} />
          <StatusMetric detail={statusValue(data.summary.idle, "idle department")} state="idle" value={data.summary.idle} />
          <StatusMetric detail="Sources or departments needing fresh signal." state="stale_offline" value={data.summary.staleOffline} />
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <AdminMetricCard label="Active Queue" value={formatCount(data.summary.queued)} />
          <AdminMetricCard label="Founder Review" value={formatCount(data.summary.inReview)} />
          <AdminMetricCard label="Linear Projects" value={data.linear.projectCount === null ? "-" : data.linear.projectCount} />
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          {data.agentStates.map((lane) => (
            <AgentCard key={lane.agent} lane={lane} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <IssueRows
            empty={hasLinearData ? "No executing Linear issues found." : "Linear issue source unavailable."}
            issues={data.currentIssues}
            title="Executing Now"
          />
          <IssueRows
            empty={hasLinearData ? "No founder review issues found." : "Linear issue source unavailable."}
            issues={data.reviewIssues}
            title="In Review"
          />
          <IssueRows
            empty={hasLinearData ? "No queued Linear issues found." : "Linear issue source unavailable."}
            issues={data.queueIssues}
            title="Queued"
          />
          <IssueRows
            empty={hasLinearData ? "No blocked Linear issues found." : "Linear issue source unavailable."}
            issues={data.blockedIssues}
            title="Blocked"
          />
        </section>

        {data.departments.length > 0 ? (
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <Label>Linear Projects</Label>
                <h2 className="mt-2 text-xl font-semibold text-stone-100">Departments</h2>
              </div>
              <AdminBadge tone="muted">Dynamic</AdminBadge>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {data.departments.map((department) => (
                <DepartmentCard department={department} key={department.name} />
              ))}
            </div>
          </section>
        ) : (
          <AdminEmptyState
            description={hasLinearData ? "No Linear projects were returned." : "Connect Linear server credentials to show project-generated department cards."}
            title="No Department Cards"
          />
        )}
      </div>
    </AdminShell>
  );
}
