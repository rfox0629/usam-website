import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  Clock,
  ExternalLink,
  Pause,
  RefreshCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { AdminShell } from "../_components/AdminShell";
import { adminFont } from "../_components/AdminUI";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import {
  getOperationsCenterData,
  type ActiveWorkItem,
  type CompletedWorkItem,
  type DataSourceStatus,
  type ReviewItem,
  type RunnerCapacity,
  type RunnerStatus,
  type TodayBrief,
  type WorkStatus,
} from "@/src/lib/operations-center/operations-center";
import { saveFounderDecisionAction, setRunnerOverrideAction } from "./actions";

export const metadata: Metadata = {
  title: "Founder Command Center | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

const sourceClassName: Record<DataSourceStatus, string> = {
  available: "border-blue-200 bg-blue-50 text-blue-700",
  estimated: "border-amber-200 bg-amber-50 text-amber-800",
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  unavailable: "border-stone-200 bg-stone-50 text-stone-500",
};

const workStatusClassName: Record<WorkStatus, string> = {
  Blocked: "border-red-200 bg-red-50 text-red-700",
  Complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Planned: "border-stone-200 bg-stone-50 text-stone-600",
  Queued: "border-sky-200 bg-sky-50 text-sky-700",
  Review: "border-amber-200 bg-amber-50 text-amber-800",
  Waiting: "border-orange-200 bg-orange-50 text-orange-800",
  Working: "border-blue-200 bg-blue-50 text-blue-700",
};

const runnerStatusClassName: Record<RunnerStatus, string> = {
  Available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Cooling Down": "border-amber-200 bg-amber-50 text-amber-800",
  Limited: "border-orange-200 bg-orange-50 text-orange-800",
  Offline: "border-red-200 bg-red-50 text-red-700",
  Unknown: "border-stone-200 bg-stone-50 text-stone-500",
  Working: "border-blue-200 bg-blue-50 text-blue-700",
};

function formatDateTime(value: string) {
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

function DataSourceBadge({ source }: { source: DataSourceStatus }) {
  const label = {
    available: "Available",
    estimated: "Estimated",
    live: "Live",
    unavailable: "Unavailable",
  }[source];

  return (
    <span
      className={`inline-flex min-h-6 shrink-0 items-center rounded-full border px-2 text-[10px] uppercase tracking-[0.14em] ${sourceClassName[source]}`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {label}
    </span>
  );
}

function WorkStatusBadge({ status }: { status: WorkStatus }) {
  return (
    <span
      className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 text-[11px] uppercase tracking-[0.12em] ${workStatusClassName[status]}`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {status}
    </span>
  );
}

function RunnerStatusBadge({ status }: { status: RunnerStatus }) {
  return (
    <span
      className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 text-[11px] uppercase tracking-[0.12em] ${runnerStatusClassName[status]}`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {status}
    </span>
  );
}

function SectionHeader({
  children,
  source,
  title,
}: {
  children?: ReactNode;
  source?: DataSourceStatus;
  title: string;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="truncate text-lg font-semibold text-stone-950">
          {title}
        </h2>
        {source ? <DataSourceBadge source={source} /> : null}
      </div>
      {children ? <div className="min-w-0">{children}</div> : null}
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
      {children}
    </p>
  );
}

function CompactStat({
  detail,
  label,
  tone = "neutral",
  value,
}: {
  detail: string;
  label: string;
  tone?: "amber" | "green" | "neutral" | "red";
  value: ReactNode;
}) {
  const toneClassName = {
    amber: "border-amber-200 bg-amber-50",
    green: "border-emerald-200 bg-emerald-50",
    neutral: "border-stone-200 bg-white",
    red: "border-red-200 bg-red-50",
  }[tone];

  return (
    <div className={`rounded-lg border px-3 py-3 ${toneClassName}`}>
      <p
        className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        {label}
      </p>
      <div className="mt-1 text-2xl font-semibold leading-none text-stone-950">
        {value}
      </div>
      <p className="mt-1 truncate text-xs text-stone-600">
        {detail}
      </p>
    </div>
  );
}

function FounderDecisionButton({
  children,
  decision,
  disabled,
  issueId,
  primary = false,
}: {
  children: ReactNode;
  decision: "approve" | "hold" | "request_changes";
  disabled: boolean;
  issueId: string;
  primary?: boolean;
}) {
  return (
    <form action={saveFounderDecisionAction}>
      <input name="issueId" type="hidden" value={issueId} />
      <button
        className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400 ${
          primary
            ? "border-transparent bg-[#D4A63D] text-stone-950 hover:bg-[#E9BC50]"
            : "border-stone-300 bg-white text-stone-700 hover:border-stone-500 hover:text-stone-950"
        }`}
        disabled={disabled}
        name="decision"
        type="submit"
        value={decision}
      >
        {children}
      </button>
    </form>
  );
}

function NeedsAttentionCard({
  canAct,
  item,
}: {
  canAct: boolean;
  item: ReviewItem;
}) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white shadow-sm shadow-stone-200/40">
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              {item.product}
            </span>
            <DataSourceBadge source={item.dataSource} />
          </div>
          <h3 className="mt-2 text-xl font-semibold leading-tight text-stone-950">
            {item.issueId}: {item.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {item.whatChanged}
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 transition-colors hover:border-[#D4A63D] hover:text-stone-950"
          href={item.reviewLink}
          rel="noreferrer"
          target="_blank"
        >
          {item.reviewLinkLabel}
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-3 border-t border-stone-100 px-4 py-3 md:grid-cols-[150px_1fr]">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            Review Time
          </p>
          <p className="mt-1 text-base font-semibold text-stone-950">
            {item.estimatedReviewTime}
          </p>
        </div>
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            Decision
          </p>
          <p className="mt-1 text-base font-semibold text-stone-950">
            {item.decisionRequested}
          </p>
        </div>
      </div>
      <div className="grid gap-2 border-t border-stone-100 p-3 sm:grid-cols-3">
        <FounderDecisionButton disabled={!canAct} decision="approve" issueId={item.issueId} primary>
          <Check aria-hidden="true" className="h-4 w-4" />
          Approve
        </FounderDecisionButton>
        <FounderDecisionButton disabled={!canAct} decision="request_changes" issueId={item.issueId}>
          <X aria-hidden="true" className="h-4 w-4" />
          Request Changes
        </FounderDecisionButton>
        <FounderDecisionButton disabled={!canAct} decision="hold" issueId={item.issueId}>
          <Pause aria-hidden="true" className="h-4 w-4" />
          Hold
        </FounderDecisionButton>
      </div>
    </article>
  );
}

function OpenWorkRow({ item }: { item: ActiveWorkItem }) {
  const blocker = item.blocker || "None";
  const rowClassName = item.status === "Blocked"
    ? "bg-red-50/70 hover:bg-red-50"
    : "bg-white hover:bg-stone-50";
  const content = (
    <div className={`grid gap-3 px-4 py-3 transition-colors md:grid-cols-[86px_minmax(0,1.25fr)_minmax(0,0.8fr)_104px_104px_minmax(0,1fr)_minmax(0,0.9fr)] md:items-center ${rowClassName}`}>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-stone-950">
          {item.issueId}
        </p>
        <div className="mt-1 md:hidden">
          <DataSourceBadge source={item.dataSource} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="md:hidden text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Title
        </p>
        <p className="truncate text-sm font-semibold text-stone-950">
          {item.currentProject}
        </p>
      </div>
      <div className="min-w-0">
        <p className="md:hidden text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Product
        </p>
        <p className="truncate text-sm text-stone-600">
          {item.category}
        </p>
      </div>
      <div>
        <p className="md:hidden text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Status
        </p>
        <WorkStatusBadge status={item.status} />
      </div>
      <div className="min-w-0">
        <p className="md:hidden text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Runner
        </p>
        <p className="truncate text-sm font-medium text-stone-800">
          {item.assignedRunner}
        </p>
      </div>
      <div className="min-w-0">
        <p className="md:hidden text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Update
        </p>
        <p className="line-clamp-2 text-sm leading-5 text-stone-600">
          {item.mostRecentUpdate}
        </p>
      </div>
      <div className="min-w-0">
        <p className="md:hidden text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Blocker
        </p>
        <p className={`line-clamp-2 text-sm leading-5 ${item.blocker ? "font-semibold text-red-700" : "text-stone-500"}`}>
          {blocker}
        </p>
      </div>
    </div>
  );

  if (!item.detailHref) {
    return content;
  }

  return (
    <Link className="block" href={item.detailHref} rel="noreferrer" target="_blank">
      {content}
    </Link>
  );
}

function groupOpenWork(items: ActiveWorkItem[]) {
  const groups = new Map<string, ActiveWorkItem[]>();

  items.forEach((item) => {
    groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  });

  return Array.from(groups.entries()).map(([category, groupedItems]) => ({
    category,
    items: groupedItems,
  }));
}

function ProductCounts({ items }: { items: ActiveWorkItem[] }) {
  const counts = groupOpenWork(items);

  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex min-h-7 items-center rounded-full border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700">
        {items.length} open
      </span>
      {counts.map((group) => (
        <span
          className="inline-flex min-h-7 items-center rounded-full border border-stone-200 bg-stone-50 px-2.5 text-xs text-stone-600"
          key={group.category}
        >
          {group.category}: {group.items.length}
        </span>
      ))}
    </div>
  );
}

function OpenWorkList({ items, source }: { items: ActiveWorkItem[]; source: DataSourceStatus }) {
  const groups = groupOpenWork(items);

  return (
    <section>
      <SectionHeader source={source} title="Open Work">
        <ProductCounts items={items} />
      </SectionHeader>
      {items.length ? (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm shadow-stone-200/40">
          <div
            className="hidden grid-cols-[86px_minmax(0,1.25fr)_minmax(0,0.8fr)_104px_104px_minmax(0,1fr)_minmax(0,0.9fr)] gap-3 bg-stone-50 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-stone-500 md:grid"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            <span>Issue</span>
            <span>Title</span>
            <span>Product</span>
            <span>Status</span>
            <span>Runner</span>
            <span>Update</span>
            <span>Blocker</span>
          </div>
          {groups.map((group) => (
            <div className="border-t border-stone-200 first:border-t-0" key={group.category}>
              <div className="flex items-center justify-between gap-3 bg-stone-50/80 px-4 py-2">
                <h3 className="truncate text-sm font-semibold text-stone-950">
                  {group.category}
                </h3>
                <span className="shrink-0 text-xs text-stone-500">
                  {group.items.length} open
                </span>
              </div>
              <div className="divide-y divide-stone-100">
                {group.items.map((item) => (
                  <OpenWorkRow item={item} key={`${item.issueId}-${item.currentProject}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyLine>No open work is available from Linear or dispatcher health.</EmptyLine>
      )}
    </section>
  );
}

function CompletedWorkRow({ item }: { item: CompletedWorkItem }) {
  const content = (
    <div className="grid gap-3 px-4 py-3 transition-colors hover:bg-stone-50 md:grid-cols-[86px_minmax(0,1.25fr)_minmax(0,0.8fr)_130px_minmax(0,1fr)] md:items-center">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-stone-950">
        {item.issueId}
      </p>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-stone-950">
          {item.title}
        </p>
      </div>
      <p className="truncate text-sm text-stone-600">
        {item.product}
      </p>
      <p className="text-sm font-medium text-stone-800">
        {formatDateTime(item.completedAt)}
      </p>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="line-clamp-2 text-sm leading-5 text-stone-600">
          {item.detail}
        </p>
        <DataSourceBadge source={item.dataSource} />
      </div>
    </div>
  );

  if (!item.href) {
    return content;
  }

  return (
    <Link className="block" href={item.href} rel="noreferrer" target="_blank">
      {content}
    </Link>
  );
}

function CompletedRecently({ items }: { items: CompletedWorkItem[] }) {
  return (
    <section>
      <SectionHeader title="Completed Recently" />
      {items.length ? (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm shadow-stone-200/40">
          <div
            className="hidden grid-cols-[86px_minmax(0,1.25fr)_minmax(0,0.8fr)_130px_minmax(0,1fr)] gap-3 bg-stone-50 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-stone-500 md:grid"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            <span>Issue</span>
            <span>Title</span>
            <span>Product</span>
            <span>Finished</span>
            <span>Note</span>
          </div>
          <div className="divide-y divide-stone-100">
            {items.map((item) => (
              <CompletedWorkRow item={item} key={`${item.issueId}-${item.completedAt}`} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyLine>No meaningful completions reported.</EmptyLine>
      )}
    </section>
  );
}

function briefText(items: string[]) {
  if (!items.length) {
    return "None reported";
  }

  return items.slice(0, 2).join("; ");
}

function TodayStrip({ today }: { today: TodayBrief }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-stone-950">Today</h2>
          <DataSourceBadge source={today.dataSource} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {[
          ["Completed", briefText(today.completedToday)],
          ["Working", briefText(today.workingNow)],
          ["Review", briefText(today.waitingForReview)],
          ["Blocked", briefText(today.blocked)],
          ["Change", today.importantChange],
        ].map(([label, value]) => (
          <div className="min-w-0" key={label}>
            <p
              className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              {label}
            </p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-stone-700">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RunnerHealthRow({ runner }: { runner: RunnerCapacity }) {
  return (
    <div className="grid gap-3 px-4 py-3 md:grid-cols-[132px_116px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-center">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-950 text-white">
          <Bot aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-950">{runner.name}</p>
          <DataSourceBadge source={runner.dataSource} />
        </div>
      </div>
      <RunnerStatusBadge status={runner.status} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Current
        </p>
        <p className="mt-1 truncate text-sm text-stone-700">{runner.currentIssue}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Limits
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-stone-700">{runner.recentLimitEvent}</p>
        <p className="mt-1 text-xs text-stone-500">Reset: {runner.cooldownReset}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Recommendation
        </p>
        <p className="mt-1 line-clamp-2 text-sm font-medium text-stone-900">{runner.recommendation}</p>
        <p className="mt-1 text-xs text-stone-500">Last: {runner.lastSuccessfulRun} | {runner.usageSummary}</p>
      </div>
    </div>
  );
}

function RunnerOverridePanel({
  canAct,
  currentOverride,
}: {
  canAct: boolean;
  currentOverride: {
    dataSource: DataSourceStatus;
    requestedRunner: string;
    status: string;
    updatedAt: string;
  };
}) {
  return (
    <aside className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-stone-950">Runner Override</h3>
          <p className="mt-1 text-sm text-stone-600">
            Next eligible work packet only.
          </p>
        </div>
        <DataSourceBadge source={currentOverride.dataSource} />
      </div>
      <div className="mt-4 grid gap-2 text-sm text-stone-700">
        <p><span className="text-stone-500">Selected:</span> {currentOverride.requestedRunner}</p>
        <p><span className="text-stone-500">State:</span> {currentOverride.status}</p>
        <p><span className="text-stone-500">Updated:</span> {currentOverride.updatedAt}</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(["claude", "codex"] as const).map((runner) => (
          <form action={setRunnerOverrideAction} key={runner}>
            <input name="requestedRunner" type="hidden" value={runner} />
            <button
              className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold capitalize text-stone-800 transition-colors hover:border-[#D4A63D] hover:text-stone-950 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
              disabled={!canAct}
              type="submit"
            >
              Choose {runner}
            </button>
          </form>
        ))}
      </div>
    </aside>
  );
}

function RunnerHealth({
  canAct,
  currentOverride,
  runners,
  source,
}: {
  canAct: boolean;
  currentOverride: {
    dataSource: DataSourceStatus;
    requestedRunner: string;
    status: string;
    updatedAt: string;
  };
  runners: RunnerCapacity[];
  source: DataSourceStatus;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_310px]">
      <div>
        <SectionHeader source={source} title="Runner Health" />
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm shadow-stone-200/40">
          <div className="divide-y divide-stone-100">
            {runners.map((runner) => (
              <RunnerHealthRow key={runner.id} runner={runner} />
            ))}
          </div>
        </div>
      </div>
      <RunnerOverridePanel canAct={canAct} currentOverride={currentOverride} />
    </section>
  );
}

export default async function OperationsCenterPage() {
  const [data, authorization] = await Promise.all([
    getOperationsCenterData(),
    getAdminAuthorization(),
  ]);
  const canAct = canEditAdminContent(authorization);
  const openCount = data.activeWork.length;
  const workingCount = data.activeWork.filter((item) => item.status === "Working").length;
  const blockedCount = data.activeWork.filter((item) => item.status === "Blocked").length;
  const source = data.linearSource === "live" ? data.linearSource : data.dispatcherSource;

  return (
    <AdminShell
      active="operations-center"
      action={(
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 transition-colors hover:border-[#D4A63D] hover:text-stone-950"
          href="/admin/operations-center"
        >
          <RefreshCcw aria-hidden="true" className="h-4 w-4" />
          Refresh
        </Link>
      )}
      surface="light"
      title="Founder Command Center"
    >
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <CompactStat detail="usable packages" label="Needs Review" tone={data.needsAttention.length ? "amber" : "neutral"} value={data.needsAttention.length} />
          <CompactStat detail={`${workingCount} working now`} label="Open Work" value={openCount} />
          <CompactStat detail="true blockers" label="Blocked" tone={blockedCount ? "red" : "neutral"} value={blockedCount} />
          <CompactStat detail="meaningful completions" label="Completed" tone={data.completedRecently.length ? "green" : "neutral"} value={data.completedRecently.length} />
        </div>

        {data.dataNotes.length ? (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{data.dataNotes.join(" ")}</span>
          </div>
        ) : null}

        <TodayStrip today={data.today} />

        <section>
          <SectionHeader title="Needs My Attention">
            <div className="flex gap-2">
              <DataSourceBadge source={data.linearSource} />
              <DataSourceBadge source={data.dispatcherSource} />
            </div>
          </SectionHeader>
          {data.needsAttention.length ? (
            <div className="grid gap-3">
              {data.needsAttention.map((item) => (
                <NeedsAttentionCard canAct={canAct} item={item} key={item.issueId} />
              ))}
            </div>
          ) : (
            <EmptyLine>No usable founder review package is ready.</EmptyLine>
          )}
        </section>

        <OpenWorkList items={data.activeWork} source={source} />

        <CompletedRecently items={data.completedRecently} />

        <RunnerHealth
          canAct={canAct}
          currentOverride={data.runnerOverride}
          runners={data.runners}
          source={data.dispatcherSource}
        />

        <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600 shadow-sm shadow-stone-200/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-stone-500" />
            <span>No raw logs, secrets, shell controls, or unrestricted execution controls are exposed.</span>
          </div>
          <div className="flex items-center gap-2 text-stone-500">
            <Clock aria-hidden="true" className="h-4 w-4" />
            <span>Generated {formatDateTime(data.generatedAt)}</span>
          </div>
        </div>

        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700 transition-colors hover:text-stone-950"
          href="https://linear.app/usa-missionaries/issue/USA-54/founder-command-center-simple-one-page-visibility-and-review-dashboard"
          rel="noreferrer"
          target="_blank"
        >
          USA-54
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </AdminShell>
  );
}
