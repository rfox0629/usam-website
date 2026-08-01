import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ExternalLink,
  GitBranch,
  RadioTower,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AdminShell } from "../_components/AdminShell";
import { AdminBadge, adminFont, type AdminBadgeTone } from "../_components/AdminUI";
import { loadOperationsCenterData } from "@/src/lib/operations-center/operations-center";
import type {
  FounderReviewItem,
  OperationsActivity,
  OperationsAlert,
  OperationsState,
  OperationsWorkItem,
  SourceStatus,
  WorkforceCard,
} from "@/src/lib/operations-center/workforce-status";

export const metadata: Metadata = {
  title: "Operations Center | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

const stateLabels: Record<OperationsState, string> = {
  blocked_failed: "Blocked / Failed",
  claimed: "Claimed",
  complete: "Complete",
  delegated: "Delegated",
  dispatcher_eligible: "Dispatcher Eligible",
  founder_review: "Founder Review",
  preview_ready: "Preview Ready",
  queued: "Queued",
  stale_offline: "Stale / Offline",
  unavailable: "Unavailable",
  working: "Working",
};

const stateTones: Record<OperationsState, AdminBadgeTone> = {
  blocked_failed: "red",
  claimed: "blue",
  complete: "green",
  delegated: "muted",
  dispatcher_eligible: "blue",
  founder_review: "amber",
  preview_ready: "green",
  queued: "blue",
  stale_offline: "red",
  unavailable: "muted",
  working: "green",
};

const sourceTones: Record<SourceStatus, AdminBadgeTone> = {
  error: "red",
  live: "green",
  stale: "amber",
  unavailable: "muted",
};

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
    timeZone: "America/Chicago",
  }).format(date);
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

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-stone-800/75 bg-[#080808]/90 ${className}`}>
      {children}
    </section>
  );
}

function StateIcon({ state }: { state: OperationsState }) {
  const Icon = state === "blocked_failed" || state === "stale_offline"
    ? AlertTriangle
    : state === "working"
      ? Bot
      : state === "complete" || state === "preview_ready"
        ? CheckCircle2
        : state === "queued" || state === "dispatcher_eligible" || state === "claimed"
          ? Clock3
          : CircleDashed;

  return <Icon aria-hidden="true" className="h-5 w-5 text-[#C9A24A]" strokeWidth={1.8} />;
}

function WorkforceCardView({ card }: { card: WorkforceCard }) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Label>{card.name}</Label>
          <h2 className="mt-2 flex min-w-0 items-center gap-2 text-lg font-semibold text-stone-100">
            <StateIcon state={card.state} />
            <span className="truncate">{stateLabels[card.state]}</span>
          </h2>
        </div>
        <AdminBadge tone={stateTones[card.state]}>{card.runner}</AdminBadge>
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-400">{card.detail}</p>
      <div className="mt-4 grid gap-2 border-t border-stone-800/70 pt-4 text-sm">
        <Meta label="Issue">{card.currentIssue || "None confirmed"}</Meta>
        <Meta label="Repository">{card.repository || "Unavailable"}</Meta>
        <Meta label="Latest">{formatDateTime(card.latestActivityAt)}</Meta>
      </div>
    </Panel>
  );
}

function Meta({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="grid min-w-0 gap-1 sm:grid-cols-[120px_minmax(0,1fr)]">
      <Label>{label}</Label>
      <div className="min-w-0 text-sm text-stone-300">{children}</div>
    </div>
  );
}

function SourcePanel({
  detail,
  fetchedAt,
  label,
  status,
}: {
  detail: string;
  fetchedAt: string | null;
  label: string;
  status: SourceStatus;
}) {
  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Label>{label}</Label>
          <p className="mt-2 text-sm leading-6 text-stone-300">{detail}</p>
        </div>
        <AdminBadge tone={sourceTones[status]}>{status}</AdminBadge>
      </div>
      <p className="mt-3 text-xs text-stone-500">Latest: {formatDateTime(fetchedAt)}</p>
    </Panel>
  );
}

function SummaryMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: AdminBadgeTone;
  value: number;
}) {
  return (
    <div className="border border-stone-800/75 bg-[#080808]/85 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.18em] text-stone-400"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            {label}
          </p>
          <p
            className="mt-2 text-3xl font-bold leading-none text-stone-100"
            style={{ fontFamily: adminFont.oswald }}
          >
            {value}
          </p>
        </div>
        <AdminBadge tone={tone}>{label}</AdminBadge>
      </div>
    </div>
  );
}

function WorkRows({ items }: { items: OperationsWorkItem[] }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800/70 px-4 py-3">
        <div>
          <Label>Active Work</Label>
          <h2 className="mt-1 text-lg font-semibold text-stone-100">Delegated, Eligible, Queued, Claimed, Executing</h2>
        </div>
        <AdminBadge tone="blue">{items.length} tracked</AdminBadge>
      </div>
      {items.length ? (
        <div className="divide-y divide-stone-900/95">
          {items.map((item) => (
            <div
              className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(0,1.35fr)_135px_150px_130px_minmax(0,1fr)] md:items-center"
              key={`${item.issue}-${item.state}-${item.runner}`}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-stone-100">
                  <ExternalTextLink href={item.linearUrl}>
                    {item.issue} - {item.title}
                  </ExternalTextLink>
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{item.stateDetail}</p>
              </div>
              <div>
                <Label>State</Label>
                <div className="mt-1">
                  <AdminBadge tone={stateTones[item.state]}>{stateLabels[item.state]}</AdminBadge>
                </div>
              </div>
              <div className="min-w-0">
                <Label>Runner</Label>
                <p className="mt-1 truncate text-stone-300">{item.runner}</p>
              </div>
              <div className="min-w-0">
                <Label>Repository</Label>
                <p className="mt-1 truncate text-stone-300">{item.repository || "Unavailable"}</p>
              </div>
              <div className="min-w-0">
                <Label>Branch / Latest</Label>
                <p className="mt-1 truncate text-stone-300">{item.branch || item.worktree || "Unavailable"}</p>
                <p className="mt-1 text-xs text-stone-500">{formatDateTime(item.latestActivityAt)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="p-4 text-sm text-stone-500">No delegated, queued, claimed, or executing work is visible from connected sources.</p>
      )}
    </Panel>
  );
}

function ReviewQueue({ items }: { items: FounderReviewItem[] }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800/70 px-4 py-3">
        <div>
          <Label>Founder Review</Label>
          <h2 className="mt-1 text-lg font-semibold text-stone-100">Review-Ready Deliverables</h2>
        </div>
        <AdminBadge tone="amber">{items.length} waiting</AdminBadge>
      </div>
      {items.length ? (
        <div className="divide-y divide-stone-900/95">
          {items.map((item) => (
            <article className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]" key={item.issue}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-100">{item.issue} - {item.title}</p>
                <p className="mt-2 text-xs leading-5 text-stone-500">{item.decisionRequired}</p>
              </div>
              <div className="grid gap-2">
                <Meta label="Branch">{item.branch || "Unavailable"}</Meta>
                <Meta label="Commit">{item.commit || "Unavailable"}</Meta>
                <Meta label="Production">{item.productionChanged === null ? "Unavailable" : item.productionChanged ? "Changed" : "Not changed"}</Meta>
              </div>
              <div className="grid gap-2">
                <Meta label="PR"><ExternalTextLink href={item.prUrl}>{item.prUrl ? "Open PR" : "Unavailable"}</ExternalTextLink></Meta>
                <Meta label="Preview"><ExternalTextLink href={item.previewUrl}>{item.previewUrl ? "Open Preview" : "Unavailable"}</ExternalTextLink></Meta>
                <Meta label="Screenshots">{item.screenshots.length ? `${item.screenshots.length} supplied` : "Unavailable"}</Meta>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="p-4 text-sm text-stone-500">No review-ready deliverables are visible from connected sources.</p>
      )}
    </Panel>
  );
}

function AlertList({ alerts }: { alerts: OperationsAlert[] }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800/70 px-4 py-3">
        <div>
          <Label>Alerts</Label>
          <h2 className="mt-1 text-lg font-semibold text-stone-100">Routing, Stale, Failed, Offline</h2>
        </div>
        <AdminBadge tone={alerts.some((alert) => alert.severity === "red") ? "red" : alerts.length ? "amber" : "green"}>
          {alerts.length}
        </AdminBadge>
      </div>
      {alerts.length ? (
        <div className="divide-y divide-stone-900/95">
          {alerts.slice(0, 10).map((alert, index) => (
            <div className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[130px_120px_minmax(0,1fr)]" key={`${alert.code}-${alert.issue}-${index}`}>
              <AdminBadge tone={alert.severity === "red" ? "red" : "amber"}>{alert.code}</AdminBadge>
              <p className="text-stone-300">{alert.issue || "System"}</p>
              <p className="min-w-0 text-stone-400">{alert.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="p-4 text-sm text-stone-500">No active alerts from connected sources.</p>
      )}
    </Panel>
  );
}

function ActivityTimeline({ items }: { items: OperationsActivity[] }) {
  return (
    <Panel>
      <div className="border-b border-stone-800/70 px-4 py-3">
        <Label>Recent Activity</Label>
      </div>
      {items.length ? (
        <div className="divide-y divide-stone-900/95">
          {items.slice(0, 12).map((item, index) => (
            <div className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[125px_150px_minmax(0,1fr)_135px]" key={`${item.event}-${item.issue}-${index}`}>
              <p className="text-stone-500">{formatDateTime(item.at)}</p>
              <p className="truncate font-medium text-stone-200">{item.event}</p>
              <p className="min-w-0 text-stone-400">{item.summary}</p>
              <p className="truncate text-stone-500">{item.issue || item.runner || "System"}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="p-4 text-sm text-stone-500">Recent dispatcher and Linear activity is unavailable.</p>
      )}
    </Panel>
  );
}

export default async function OperationsCenterPage() {
  const data = await loadOperationsCenterData();

  return (
    <AdminShell
      active="operations-center"
      description="Read-only AI workforce status from Linear and the sanitized USA-147 dispatcher feed."
      title="Operations Center"
    >
      <div className="space-y-6">
        <section className="flex flex-wrap gap-2">
          <AdminBadge tone="green">Admin Protected</AdminBadge>
          <AdminBadge tone="blue">Read Only</AdminBadge>
          <AdminBadge tone="muted">No Shell Controls</AdminBadge>
          <AdminBadge tone="muted">No Production Deploy</AdminBadge>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <SourcePanel
            detail={data.sources.workforceFeed.detail}
            fetchedAt={data.sources.workforceFeed.fetchedAt}
            label="USA-147 Feed"
            status={data.sources.workforceFeed.status}
          />
          <SourcePanel
            detail={data.sources.linear.detail}
            fetchedAt={data.sources.linear.fetchedAt}
            label="Linear"
            status={data.sources.linear.status}
          />
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {data.cards.map((card) => (
            <WorkforceCardView card={card} key={card.runner} />
          ))}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryMetric label="Working" tone="green" value={data.summary.working} />
          <SummaryMetric label="Queued" tone="blue" value={data.summary.queued + data.summary.dispatcherEligible} />
          <SummaryMetric label="Claimed" tone="blue" value={data.summary.claimed} />
          <SummaryMetric label="Review" tone="amber" value={data.summary.founderReview + data.summary.previewReady} />
          <SummaryMetric label="Blocked" tone="red" value={data.summary.blockedFailed + data.summary.staleOffline} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="space-y-6">
            <WorkRows items={data.activeWork} />
            <ReviewQueue items={data.founderReviewQueue} />
          </div>
          <div className="space-y-6">
            <AlertList alerts={data.alerts} />
            <Panel className="p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#C9A24A]" strokeWidth={1.8} />
                <div>
                  <Label>Security Boundary</Label>
                  <p className="mt-2 text-sm leading-6 text-stone-400">
                    Browser payloads contain normalized statuses, links, branches, commits, checks, and review metadata only.
                    Raw logs, prompts, local filesystem paths, shell handles, and secrets stay outside this page.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 border-t border-stone-800/70 pt-4 text-sm">
                <Meta label="Status API">
                  <Link className="inline-flex items-center gap-1.5 text-stone-100 hover:text-[#F5B942]" href="/api/admin/operations-center/status">
                    Sanitized JSON
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 text-[#C9A24A]" />
                  </Link>
                </Meta>
                <Meta label="Future Domain">app.usamissionaries.org after separate approval</Meta>
                <Meta label="Unavailable">
                  {data.unavailableData.length ? data.unavailableData.join("; ") : "All configured sources are live."}
                </Meta>
              </div>
            </Panel>
          </div>
        </div>

        <ActivityTimeline items={data.recentActivity} />

        <Panel className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <RadioTower aria-hidden="true" className="h-5 w-5 text-[#C9A24A]" strokeWidth={1.8} />
            <Label>Contract</Label>
            <AdminBadge tone="muted">{data.schemaVersion}</AdminBadge>
            <Sparkles aria-hidden="true" className="h-4 w-4 text-stone-600" strokeWidth={1.8} />
            <GitBranch aria-hidden="true" className="h-4 w-4 text-stone-600" strokeWidth={1.8} />
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
