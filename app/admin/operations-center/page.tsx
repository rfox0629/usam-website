import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  Check,
  Circle,
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
  type DataSourceStatus,
  type RecentActivityItem,
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
      className={`inline-flex min-h-6 items-center rounded-full border px-2 text-[10px] uppercase tracking-[0.14em] ${sourceClassName[source]}`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {label}
    </span>
  );
}

function WorkStatusBadge({ status }: { status: WorkStatus }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] uppercase tracking-[0.12em] ${workStatusClassName[status]}`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {status}
    </span>
  );
}

function RunnerStatusBadge({ status }: { status: RunnerStatus }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] uppercase tracking-[0.12em] ${runnerStatusClassName[status]}`}
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
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="truncate text-lg font-semibold text-stone-950">
          {title}
        </h2>
        {source ? <DataSourceBadge source={source} /> : null}
      </div>
      {children}
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

function MetricTile({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/40">
      <p
        className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        {label}
      </p>
      <div className="mt-2 text-2xl font-semibold leading-none text-stone-950 md:text-3xl">
        {value}
      </div>
      <p className="mt-2 truncate text-sm text-stone-500">
        {detail}
      </p>
    </div>
  );
}

function FounderDecisionButton({
  children,
  decision,
  issueId,
  primary = false,
  disabled,
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
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/40">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <DataSourceBadge source={item.dataSource} />
            <span
              className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              {item.product}
            </span>
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
      <div className="mt-4 grid gap-3 border-t border-stone-100 pt-4 md:grid-cols-[160px_1fr]">
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
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
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

function ActiveWorkRow({ item }: { item: ActiveWorkItem }) {
  const content = (
    <div className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm shadow-stone-200/40 md:grid-cols-[1.25fr_120px_120px_1.1fr_1fr] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-stone-950">
          {item.category}
        </p>
        <p className="mt-1 truncate text-sm text-stone-500">
          {item.currentProject}
        </p>
      </div>
      <WorkStatusBadge status={item.status} />
      <p className="truncate text-sm font-medium text-stone-700">
        {item.assignedRunner}
      </p>
      <p className="text-sm leading-5 text-stone-600">
        {item.mostRecentUpdate}
      </p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-800">
          {item.nextMilestone}
        </p>
        <DataSourceBadge source={item.dataSource} />
      </div>
    </div>
  );

  if (!item.detailHref) {
    return content;
  }

  return (
    <Link className="block transition-transform hover:-translate-y-0.5" href={item.detailHref} rel="noreferrer" target="_blank">
      {content}
    </Link>
  );
}

function RunnerCard({ runner }: { runner: RunnerCapacity }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-950 text-white">
            <Bot aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-stone-950">
              {runner.name}
            </h3>
            <p className="truncate text-sm text-stone-500">
              {runner.statusDetail}
            </p>
          </div>
        </div>
        <RunnerStatusBadge status={runner.status} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="text-stone-500">Current issue</dt>
          <dd className="mt-1 font-medium text-stone-900">{runner.currentIssue}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Recent limit event</dt>
          <dd className="mt-1 font-medium text-stone-900">{runner.recentLimitEvent}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Cooldown/reset</dt>
          <dd className="mt-1 font-medium text-stone-900">{runner.cooldownReset}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Last successful run</dt>
          <dd className="mt-1 font-medium text-stone-900">{runner.lastSuccessfulRun}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Usage</dt>
          <dd className="mt-1 font-medium text-stone-900">{runner.usageSummary}</dd>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
          <dd className="font-semibold text-stone-950">{runner.recommendation}</dd>
          <DataSourceBadge source={runner.dataSource} />
        </div>
      </dl>
    </article>
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
    <aside className="rounded-lg border border-stone-200 bg-stone-50 p-4">
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

function BriefList({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        {title}
      </p>
      {items.length ? (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li className="flex gap-2 text-sm leading-5 text-stone-700" key={item}>
              <Circle aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 fill-[#D4A63D] text-[#D4A63D]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-stone-500">None reported</p>
      )}
    </div>
  );
}

function TodayPanel({ today }: { today: TodayBrief }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/40">
      <SectionHeader source={today.dataSource} title="Today" />
      <div className="grid gap-4 sm:grid-cols-2">
        <BriefList items={today.completedToday} title="Completed Today" />
        <BriefList items={today.workingNow} title="Working Now" />
        <BriefList items={today.waitingForReview} title="Waiting Review" />
        <BriefList items={today.blocked} title="Blocked" />
      </div>
      <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
        <p
          className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          Important Change
        </p>
        <p className="mt-1 text-sm font-medium leading-5 text-stone-900">
          {today.importantChange}
        </p>
      </div>
    </section>
  );
}

function RecentActivity({ activity }: { activity: RecentActivityItem[] }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/40">
      <SectionHeader title="Recent Activity" />
      {activity.length ? (
        <div className="space-y-3">
          {activity.map((item) => {
            const content = (
              <div className="grid gap-2 rounded-lg border border-stone-100 bg-stone-50 p-3 sm:grid-cols-[110px_1fr_auto] sm:items-center">
                <span
                  className="text-[10px] uppercase tracking-[0.16em] text-stone-500"
                  style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                >
                  {item.label}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">{item.title}</p>
                  <p className="mt-1 text-sm text-stone-600">{item.detail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">{formatDateTime(item.timestamp)}</span>
                  <DataSourceBadge source={item.dataSource} />
                </div>
              </div>
            );

            return item.href ? (
              <Link className="block transition-transform hover:-translate-y-0.5" href={item.href} key={`${item.timestamp}-${item.title}`} rel="noreferrer" target="_blank">
                {content}
              </Link>
            ) : (
              <div key={`${item.timestamp}-${item.title}`}>{content}</div>
            );
          })}
        </div>
      ) : (
        <EmptyLine>No meaningful milestones reported.</EmptyLine>
      )}
    </section>
  );
}

export default async function OperationsCenterPage() {
  const [data, authorization] = await Promise.all([
    getOperationsCenterData(),
    getAdminAuthorization(),
  ]);
  const canAct = canEditAdminContent(authorization);
  const workingCount = data.activeWork.filter((item) => item.status === "Working").length;
  const blockedCount = data.activeWork.filter((item) => item.status === "Blocked").length;
  const recommendedRunner = data.runners.find((runner) => runner.recommendation === "Best available for next large build");

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
      description="Visibility, review, runner capacity."
      surface="light"
      title="Founder Command Center"
    >
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricTile detail="Usable review packages only" label="Needs My Attention" value={data.needsAttention.length} />
          <MetricTile detail="Across pinned categories" label="Working Now" value={workingCount} />
          <MetricTile detail="True blockers only" label="Blocked" value={blockedCount} />
          <MetricTile
            detail={recommendedRunner?.statusDetail ?? "No trusted recommendation"}
            label="Best Runner"
            value={recommendedRunner?.name ?? "Unknown"}
          />
        </div>

        {data.dataNotes.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {data.dataNotes.join(" ")}
          </div>
        ) : null}

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

        <section>
          <SectionHeader source={data.linearSource === "live" ? "live" : data.dispatcherSource} title="Active Work" />
          <div className="grid gap-2">
            {data.activeWork.map((item) => (
              <ActiveWorkRow item={item} key={item.category} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader source={data.dispatcherSource} title="AI Workforce Capacity" />
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_320px]">
            {data.runners.map((runner) => (
              <RunnerCard key={runner.id} runner={runner} />
            ))}
            <RunnerOverridePanel canAct={canAct} currentOverride={data.runnerOverride} />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <TodayPanel today={data.today} />
          <RecentActivity activity={data.recentActivity} />
        </div>

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
