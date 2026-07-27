import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle,
  Clock,
  ExternalLink,
  Gauge,
  PauseCircle,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { AdminShell } from "../_components/AdminShell";
import { adminFont } from "../_components/AdminUI";
import { recordFounderDecision, recordRunnerOverride } from "./actions";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import {
  dataSourceLabel,
  decisionLabel,
  formatOperationsDateTime,
  getOperationsCenterData,
  type ActiveWorkItem,
  type AttentionItem,
  type DataSource,
  type DataSourceStatus,
  type FounderDecision,
  type RecentActivityItem,
  type RunnerCapacity,
  type WorkStatus,
} from "@/src/lib/operations-center/operations-center";

export const metadata: Metadata = {
  title: "Founder Command Center | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

type SearchParams = {
  decision?: string;
  override?: string;
};

const shellText = "#18130d";
const mutedText = "#6f675b";

const sourceTone: Record<DataSourceStatus, string> = {
  audit: "border-[#d8b968]/45 bg-[#fff7de] text-[#7a5a09]",
  available: "border-emerald-200 bg-emerald-50 text-emerald-800",
  estimated: "border-[#d9d2c5] bg-white text-[#6f675b]",
  live: "border-emerald-200 bg-emerald-50 text-emerald-800",
  unavailable: "border-[#e7c8c8] bg-[#fff1f1] text-[#9b1c1c]",
};

const statusTone: Record<WorkStatus, string> = {
  Blocked: "border-red-200 bg-red-50 text-red-700",
  Complete: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Planned: "border-[#d9d2c5] bg-white text-[#6f675b]",
  Queued: "border-blue-200 bg-blue-50 text-blue-800",
  Review: "border-[#d8b968]/45 bg-[#fff7de] text-[#7a5a09]",
  Waiting: "border-[#d9d2c5] bg-[#f8f6f1] text-[#51483d]",
  Working: "border-[#18130d] bg-[#18130d] text-white",
};

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[10px] uppercase tracking-[0.16em] text-[#9a6b09]"
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </p>
  );
}

function SourcePill({ status }: { status: DataSourceStatus }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2 text-[9px] uppercase tracking-[0.12em] ${sourceTone[status]}`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {dataSourceLabel(status)}
    </span>
  );
}

function StatusPill({ status }: { status: WorkStatus }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2.5 text-[10px] uppercase tracking-[0.12em] ${statusTone[status]}`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {status}
    </span>
  );
}

function SectionTitle({
  action,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#18130d]">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function actionResultMessage(params: SearchParams) {
  if (params.decision === "saved") {
    return "Founder decision recorded to the configured server outbox.";
  }

  if (params.decision === "unavailable") {
    return "Decision outbox is not configured, so no review action was sent.";
  }

  if (params.decision === "unauthorized") {
    return "Only admin users can record founder review decisions.";
  }

  if (params.override === "saved") {
    return "Runner preference recorded for the next eligible work packet.";
  }

  if (params.override === "unavailable") {
    return "Runner override outbox is not configured, so dispatcher preference was not changed.";
  }

  if (params.override === "unauthorized") {
    return "Only admin users can change runner preference.";
  }

  return null;
}

function FlashMessage({ params }: { params: SearchParams }) {
  const message = actionResultMessage(params);

  if (!message) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#d8b968]/45 bg-[#fff7de] px-4 py-3 text-sm leading-6 text-[#6f4d00]">
      {message}
    </div>
  );
}

function DecisionButton({
  decision,
  icon,
}: {
  decision: FounderDecision;
  icon: ReactNode;
}) {
  return (
    <button
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-3 text-[10px] uppercase tracking-[0.14em] transition-colors ${
        decision === "approve"
          ? "border-transparent bg-[#D4A63D] text-black hover:bg-[#F5B942]"
          : "border-[#d7d0c1] bg-white text-[#18130d] hover:border-[#c8952d] hover:text-[#7a5200]"
      }`}
      name="decision"
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      type="submit"
      value={decision}
    >
      {icon}
      {decisionLabel(decision)}
    </button>
  );
}

function AttentionCard({ item }: { item: AttentionItem }) {
  return (
    <article className="rounded-lg border border-[#ded8ca] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SourcePill status={item.source} />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8174]" style={{ fontFamily: adminFont.rajdhani }}>
              {item.product}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold leading-6 text-[#18130d]">
            {item.issue} · {item.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#51483d]">
            {item.whatChanged}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-md border border-[#e2ddd2] bg-[#fbfaf7] px-3 py-2 text-sm text-[#51483d]">
          <Clock aria-hidden="true" className="h-4 w-4 text-[#9a6b09]" />
          {item.estimatedReviewTime}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#8b8174]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            Decision Requested
          </p>
          <p className="mt-1 text-sm leading-6 text-[#18130d]">
            {item.decisionRequest}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.previewUrl ? (
            <Link
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[#18130d] bg-[#18130d] px-3 text-[10px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-black"
              href={item.previewUrl}
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              Preview
            </Link>
          ) : null}
          <Link
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[#d7d0c1] bg-white px-3 text-[10px] uppercase tracking-[0.14em] text-[#18130d] transition-colors hover:border-[#c8952d] hover:text-[#7a5200]"
            href={item.linearUrl}
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            Review
          </Link>
        </div>
      </div>

      <form action={recordFounderDecision} className="mt-4 flex flex-wrap gap-2">
        <input name="issueId" type="hidden" value={item.issue} />
        <DecisionButton decision="approve" icon={<CheckCircle aria-hidden="true" className="h-3.5 w-3.5" />} />
        <DecisionButton decision="request_changes" icon={<RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />} />
        <DecisionButton decision="hold" icon={<PauseCircle aria-hidden="true" className="h-3.5 w-3.5" />} />
      </form>
    </article>
  );
}

function NeedsAttention({ items }: { items: AttentionItem[] }) {
  return (
    <section id="needs-attention" className="scroll-mt-24">
      <SectionTitle
        action={<span className="text-sm font-semibold text-[#18130d]">{items.length}</span>}
        eyebrow="Review"
        title="Needs My Attention"
      />
      <div className="grid gap-3">
        {items.length > 0 ? items.map((item) => (
          <AttentionCard item={item} key={item.id} />
        )) : (
          <div className="rounded-lg border border-[#ded8ca] bg-white p-5 text-sm text-[#6f675b]">
            Nothing is ready for founder review.
          </div>
        )}
      </div>
    </section>
  );
}

function CapacityStatus({ status }: { status: RunnerCapacity["status"] }) {
  const className = {
    Available: "border-emerald-200 bg-emerald-50 text-emerald-800",
    "Cooling Down": "border-[#d8b968]/45 bg-[#fff7de] text-[#7a5a09]",
    Limited: "border-orange-200 bg-orange-50 text-orange-800",
    Offline: "border-red-200 bg-red-50 text-red-700",
    Unknown: "border-[#d9d2c5] bg-white text-[#6f675b]",
    Working: "border-[#18130d] bg-[#18130d] text-white",
  }[status];

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2.5 text-[10px] uppercase tracking-[0.12em] ${className}`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {status}
    </span>
  );
}

function CapacityRow({ runner }: { runner: RunnerCapacity }) {
  return (
    <article className="rounded-lg border border-[#ded8ca] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Bot aria-hidden="true" className="h-4 w-4 shrink-0 text-[#9a6b09]" />
          <h3 className="font-semibold text-[#18130d]">{runner.name}</h3>
        </div>
        <CapacityStatus status={runner.status} />
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-[#8b8174]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Current</dt>
          <dd className="mt-0.5 text-[#18130d]">{runner.currentIssue}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-[#8b8174]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Limit Event</dt>
          <dd className="mt-0.5 text-[#51483d]">{runner.recentLimitEvent}</dd>
        </div>
        {runner.cooldownUntil ? (
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-[#8b8174]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Cooldown</dt>
            <dd className="mt-0.5 text-[#51483d]">{formatOperationsDateTime(runner.cooldownUntil)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-[#8b8174]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Last Run</dt>
          <dd className="mt-0.5 text-[#51483d]">{runner.lastSuccessfulRun}</dd>
        </div>
        <div className="rounded-md border border-[#e2ddd2] bg-[#fbfaf7] p-2">
          <dt className="text-[10px] uppercase tracking-[0.12em] text-[#8b8174]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Recommendation</dt>
          <dd className="mt-0.5 text-[#18130d]">{runner.recommendation}</dd>
        </div>
      </dl>
      <div className="mt-3">
        <SourcePill status={runner.source} />
      </div>
    </article>
  );
}

function RunnerOverrideControl({ source }: { source: DataSource }) {
  return (
    <form action={recordRunnerOverride} className="rounded-lg border border-[#ded8ca] bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Eyebrow>Override</Eyebrow>
          <h3 className="mt-1 font-semibold text-[#18130d]">Next Runner</h3>
        </div>
        <SourcePill status={source.status} />
      </div>
      <div className="mt-3 grid gap-2">
        {[
          ["auto", "Auto"],
          ["codex", "Codex"],
          ["claude", "Claude"],
        ].map(([value, label]) => (
          <label className="flex min-h-10 items-center gap-2 rounded-md border border-[#e2ddd2] bg-[#fbfaf7] px-3 text-sm text-[#18130d]" key={value}>
            <input className="h-4 w-4 accent-[#D4A63D]" defaultChecked={value === "auto"} name="runner" type="radio" value={value} />
            {label}
          </label>
        ))}
      </div>
      <button
        className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border border-transparent bg-[#D4A63D] px-3 text-[10px] uppercase tracking-[0.14em] text-black transition-colors hover:bg-[#F5B942]"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        type="submit"
      >
        <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
        Save Preference
      </button>
      <p className="mt-2 text-xs leading-5 text-[#6f675b]">
        Applies only to the next eligible packet. Locks, cooldowns, labels, and approval gates still win.
      </p>
    </form>
  );
}

function WorkforceCapacity({
  runners,
  runnerOverrideOutbox,
}: {
  runnerOverrideOutbox: DataSource;
  runners: RunnerCapacity[];
}) {
  return (
    <section id="capacity" className="scroll-mt-24">
      <SectionTitle eyebrow="Capacity" title="AI Workforce" />
      <div className="grid gap-3">
        {runners.map((runner) => (
          <CapacityRow key={runner.name} runner={runner} />
        ))}
        <RunnerOverrideControl source={runnerOverrideOutbox} />
      </div>
    </section>
  );
}

function BriefList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => (
        <li className="flex gap-2 text-sm leading-6 text-[#51483d]" key={item}>
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A63D]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TodaySection({
  today,
}: {
  today: Awaited<ReturnType<typeof getOperationsCenterData>>["today"];
}) {
  const columns = [
    ["Completed Today", today.completedToday],
    ["Working Now", today.workingNow],
    ["Waiting For Review", today.waitingForReview],
    ["Blocked", today.blocked],
  ] as const;

  return (
    <section>
      <SectionTitle eyebrow="Brief" title="Today" />
      <div className="rounded-lg border border-[#ded8ca] bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map(([title, items]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-[#18130d]">{title}</h3>
              <BriefList items={items} />
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-[#d8b968]/45 bg-[#fff7de] p-3 text-sm leading-6 text-[#6f4d00]">
          {today.importantChange}
        </div>
      </div>
    </section>
  );
}

function ActiveWorkRow({ item }: { item: ActiveWorkItem }) {
  const content = (
    <div className="grid gap-3 p-3 transition-colors hover:bg-[#fbfaf7] lg:grid-cols-[1fr_1.35fr_100px_130px_1.2fr] lg:items-center">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#18130d]">{item.category}</p>
        {item.issue ? <p className="mt-1 text-xs text-[#8b8174]">{item.issue}</p> : null}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-[#18130d]">{item.project}</p>
        <p className="mt-1 text-xs leading-5 text-[#6f675b]">{item.update}</p>
      </div>
      <StatusPill status={item.status} />
      <p className="text-sm font-medium text-[#18130d]">{item.runner}</p>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="text-sm leading-6 text-[#51483d]">{item.milestone}</p>
        <SourcePill status={item.source} />
      </div>
    </div>
  );

  if (item.detailUrl) {
    return (
      <Link href={item.detailUrl}>
        {content}
      </Link>
    );
  }

  return content;
}

function ActiveWork({ items }: { items: ActiveWorkItem[] }) {
  return (
    <section>
      <SectionTitle eyebrow="Portfolio" title="Active Work" />
      <div className="overflow-hidden rounded-lg border border-[#ded8ca] bg-white shadow-sm">
        <div
          className="hidden border-b border-[#e2ddd2] bg-[#fbfaf7] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#8b8174] lg:grid lg:grid-cols-[1fr_1.35fr_100px_130px_1.2fr]"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          <span>Category</span>
          <span>Current Work</span>
          <span>Status</span>
          <span>Runner</span>
          <span>Next</span>
        </div>
        <div className="divide-y divide-[#e2ddd2]">
          {items.map((item) => (
            <ActiveWorkRow item={item} key={item.category} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <section>
      <SectionTitle eyebrow="Milestones" title="Recent Activity" />
      <div className="divide-y divide-[#e2ddd2] overflow-hidden rounded-lg border border-[#ded8ca] bg-white shadow-sm">
        {items.map((item) => {
          const row = (
            <div className="grid gap-2 p-3 transition-colors hover:bg-[#fbfaf7] md:grid-cols-[150px_minmax(0,1fr)_120px] md:items-center">
              <span
                className="inline-flex w-fit items-center rounded-full border border-[#d8b968]/45 bg-[#fff7de] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[#7a5a09]"
                style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              >
                {item.label}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#18130d]">{item.title}</span>
                <span className="mt-1 block">
                  <SourcePill status={item.source} />
                </span>
              </span>
              <span className="text-sm text-[#6f675b] md:text-right">{formatOperationsDateTime(item.timestamp)}</span>
            </div>
          );

          return item.href ? <Link href={item.href} key={`${item.timestamp}-${item.title}`}>{row}</Link> : <div key={`${item.timestamp}-${item.title}`}>{row}</div>;
        })}
      </div>
    </section>
  );
}

function DataSources({ sources }: { sources: DataSource[] }) {
  return (
    <section>
      <SectionTitle eyebrow="Freshness" title="Data Sources" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {sources.map((source) => (
          <article className="rounded-lg border border-[#ded8ca] bg-white p-3" key={source.label}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#18130d]">{source.label}</p>
              <SourcePill status={source.status} />
            </div>
            <p className="mt-2 text-xs leading-5 text-[#6f675b]">{source.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SummaryBar({
  data,
}: {
  data: Awaited<ReturnType<typeof getOperationsCenterData>>;
}) {
  const reviewCount = data.attentionItems.length;
  const workingCount = data.activeWork.filter((item) => item.status === "Working").length;
  const blockedCount = data.activeWork.filter((item) => item.status === "Blocked" || item.status === "Waiting").length;

  return (
    <section className="grid gap-3 md:grid-cols-3">
      {[
        ["Needs Review", String(reviewCount), "Only usable review packages"],
        ["Working", String(workingCount), "Current live or audited work"],
        ["Waiting / Blocked", String(blockedCount), "Requires source wiring or runner availability"],
      ].map(([label, value, detail], index) => (
        <article className="rounded-lg border border-[#ded8ca] bg-white p-4 shadow-sm" key={label}>
          <div className="flex items-center justify-between gap-3">
            <p
              className="text-[10px] uppercase tracking-[0.16em] text-[#8b8174]"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              {label}
            </p>
            {index === 0 ? <AlertTriangle aria-hidden="true" className="h-4 w-4 text-[#9a6b09]" /> : index === 1 ? <Gauge aria-hidden="true" className="h-4 w-4 text-[#9a6b09]" /> : <XCircle aria-hidden="true" className="h-4 w-4 text-[#9a6b09]" />}
          </div>
          <p className="mt-3 text-3xl font-semibold leading-none text-[#18130d]">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#6f675b]">
            {detail}
          </p>
        </article>
      ))}
    </section>
  );
}

export default async function OperationsCenterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const params = await searchParams;
  const data = await getOperationsCenterData();

  return (
    <AdminShell
      active="operations-center"
      action={(
        <div className="flex flex-wrap items-center gap-2">
          <SourcePill status={data.sources[0]?.status ?? "unavailable"} />
          <span className="text-xs text-[#6f675b]">
            Updated {formatOperationsDateTime(data.generatedAt)}
          </span>
        </div>
      )}
      description="One page for review, active work, runner status, and a factual brief. Linear remains the hidden source of record."
      title="Founder Command Center"
      workspace="light"
    >
      <div className="space-y-5 text-[#18130d]">
        <FlashMessage params={params} />
        <SummaryBar data={data} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
          <NeedsAttention items={data.attentionItems} />
          <WorkforceCapacity runnerOverrideOutbox={data.runnerOverrideOutbox} runners={data.capacity} />
        </div>

        <TodaySection today={data.today} />
        <ActiveWork items={data.activeWork} />
        <RecentActivity items={data.recentActivity} />
        <DataSources sources={data.sources} />

        <section className="rounded-lg border border-[#ded8ca] bg-white p-4 text-sm leading-6 text-[#51483d]">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#9a6b09]" />
            <p>
              No chat box, unrestricted shell control, raw logs, secrets, production merge, production deployment, DNS change, or production database mutation is exposed from this V1 route.
            </p>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
