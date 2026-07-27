import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { AdminBadge, type AdminBadgeTone, adminFont } from "../_components/AdminUI";
import { AdminShell } from "../_components/AdminShell";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import {
  loadOperationsRegistry,
  type OperationsDispatcher,
  type OperationsExecutionEvent,
  type OperationsLock,
  type OperationsRegistryData,
  type OperationsReviewItem,
  type OperationsRunner,
  type OperationsWorktree,
} from "@/src/lib/admin/operations-center";

export const metadata: Metadata = {
  title: "Operations | National Command Center",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

const tonePriority: Record<AdminBadgeTone, number> = {
  red: 5,
  amber: 4,
  blue: 3,
  muted: 2,
  green: 1,
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Missing";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function formatElapsed(seconds: number | null) {
  if (seconds === null) {
    return "Idle";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function labelFromValue(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function metricTone(data: OperationsRegistryData): AdminBadgeTone {
  if (data.status !== "ready" || data.dispatchers.length === 0) {
    return "red";
  }

  const tones = [
    ...data.dispatchers.map((item) => item.tone),
    ...data.runners.map((item) => item.tone),
    ...data.locks.map((item) => item.tone),
    ...data.worktrees.map((item) => item.tone),
  ];

  return tones.sort((a, b) => tonePriority[b] - tonePriority[a])[0] ?? "muted";
}

function HealthBanner({ data }: { data: OperationsRegistryData }) {
  const tone = metricTone(data);
  const className = {
    amber: "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#F5D684]",
    blue: "border-blue-400/25 bg-blue-950/30 text-blue-200",
    green: "border-green-500/25 bg-green-950/30 text-green-200",
    muted: "border-stone-800 bg-stone-950 text-stone-300",
    red: "border-red-500/35 bg-red-950/30 text-red-100",
  }[tone];
  const title = data.status === "ready"
    ? data.dispatchers.length > 0
      ? tone === "green"
        ? "Dispatcher Healthy"
        : "Dispatcher Needs Review"
      : "Dispatcher Offline"
    : data.status === "integration_missing"
      ? "Registry Not Installed"
      : data.status === "not_configured"
        ? "Admin Integration Not Configured"
        : "Registry Error";
  const detail = data.error
    ?? (data.dispatchers.length > 0
      ? `Snapshot generated ${formatDateTime(data.generatedAt)}.`
      : "No dispatcher heartbeat is available from the registry.");

  return (
    <section className={`rounded-xl border p-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-current">{title}</p>
          <p className="mt-1 text-sm leading-6 text-current/75">{detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminBadge tone={tone}>{labelFromValue(data.status)}</AdminBadge>
          <AdminBadge tone="muted">Read Only</AdminBadge>
        </div>
      </div>
    </section>
  );
}

function MetricTile({
  label,
  tone = "muted",
  value,
}: {
  label: string;
  tone?: AdminBadgeTone;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold leading-none text-stone-50">
          {value}
        </p>
        <AdminBadge tone={tone}>{labelFromValue(tone)}</AdminBadge>
      </div>
    </div>
  );
}

function SectionHeader({
  action,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#D8B65D]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          {eyebrow}
        </p>
        <h2 className="mt-1 text-base font-semibold text-stone-50">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function DetailList({ items }: { items: Array<{ label: string; value: string | null | undefined }> }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-lg border border-stone-800/70 bg-[#050505] p-3">
          <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            {item.label}
          </dt>
          <dd className="mt-1 truncate text-sm font-semibold text-stone-100">
            {item.value || "None"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DispatcherCard({ dispatcher }: { dispatcher: OperationsDispatcher }) {
  return (
    <article className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-stone-50">{dispatcher.displayName}</h3>
            <AdminBadge tone={dispatcher.tone}>{dispatcher.stateLabel}</AdminBadge>
            {dispatcher.testMode ? <AdminBadge tone="blue">Test Mode</AdminBadge> : null}
          </div>
          <p className="mt-1 truncate text-sm text-stone-400">{dispatcher.key}</p>
        </div>
        <p className="text-sm text-stone-400">{dispatcher.version ?? "No version"}</p>
      </div>
      <div className="mt-4">
        <DetailList
          items={[
            { label: "Last Poll", value: formatDateTime(dispatcher.lastPollAt) },
            { label: "Last Pickup", value: formatDateTime(dispatcher.lastSuccessfulPickupAt) },
            { label: "Heartbeat", value: formatDateTime(dispatcher.heartbeatAt) },
            { label: "Updated", value: formatDateTime(dispatcher.updatedAt) },
          ]}
        />
      </div>
      {dispatcher.recoveryGuidance ? (
        <p className="mt-3 rounded-lg border border-[#C9A24A]/25 bg-[#C9A24A]/10 p-3 text-sm leading-6 text-[#F5D684]">
          {dispatcher.recoveryGuidance}
        </p>
      ) : null}
    </article>
  );
}

function RunnerCard({ runner }: { runner: OperationsRunner }) {
  const currentIssue = runner.currentIssueIdentifier
    ? `${runner.currentIssueIdentifier}${runner.currentIssueTitle ? ` - ${runner.currentIssueTitle}` : ""}`
    : "Unassigned";

  return (
    <article className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-stone-50">{runner.displayName}</h3>
            <AdminBadge tone={runner.tone}>{labelFromValue(runner.availability)}</AdminBadge>
            {runner.paused ? <AdminBadge tone="blue">Paused</AdminBadge> : null}
          </div>
          <p className="mt-1 truncate text-sm text-stone-400">{labelFromValue(runner.runnerType)} - {runner.key}</p>
        </div>
        <p className="text-sm text-stone-400">{runner.version ?? "No version"}</p>
      </div>
      <div className="mt-4">
        <DetailList
          items={[
            { label: "Current Issue", value: currentIssue },
            { label: "Elapsed", value: formatElapsed(runner.elapsedSeconds) },
            { label: "Heartbeat", value: formatDateTime(runner.heartbeatAt) },
            { label: "Updated", value: formatDateTime(runner.updatedAt) },
          ]}
        />
      </div>
      {runner.recoveryGuidance ? (
        <p className="mt-3 rounded-lg border border-[#C9A24A]/25 bg-[#C9A24A]/10 p-3 text-sm leading-6 text-[#F5D684]">
          {runner.recoveryGuidance}
        </p>
      ) : null}
    </article>
  );
}

function CompactRow({
  badges,
  detail,
  meta,
  title,
}: {
  badges: ReactNode;
  detail: string;
  meta: Array<{ label: string; value: string | null | undefined }>;
  title: string;
}) {
  return (
    <article className="rounded-lg border border-stone-800/70 bg-[#050505] p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-stone-50">{title}</h3>
            {badges}
          </div>
          <p className="mt-1 truncate text-sm text-stone-400">{detail}</p>
        </div>
        <dl className="grid shrink-0 gap-2 sm:grid-cols-2 lg:min-w-[420px] lg:grid-cols-4">
          {meta.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-[9px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                {item.label}
              </dt>
              <dd className="mt-0.5 truncate text-xs font-semibold text-stone-200">{item.value || "None"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

function WorktreeList({ worktrees }: { worktrees: OperationsWorktree[] }) {
  return (
    <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <SectionHeader eyebrow="Worktrees" title="Active And Recent" />
      {worktrees.length > 0 ? (
        <div className="grid gap-2">
          {worktrees.map((worktree) => (
            <CompactRow
              badges={(
                <>
                  <AdminBadge tone={worktree.tone}>{labelFromValue(worktree.status)}</AdminBadge>
                  <AdminBadge tone={worktree.lockState === "stale" ? "red" : worktree.lockState === "locked" ? "blue" : "muted"}>
                    {labelFromValue(worktree.lockState)}
                  </AdminBadge>
                </>
              )}
              detail={`${worktree.issueIdentifier}${worktree.issueTitle ? ` - ${worktree.issueTitle}` : ""}`}
              key={worktree.key}
              meta={[
                { label: "Runner", value: worktree.runnerKey ?? worktree.runnerType },
                { label: "Branch", value: worktree.branchName },
                { label: "Started", value: formatDateTime(worktree.startedAt) },
                { label: "Updated", value: formatDateTime(worktree.lastSeenAt ?? worktree.updatedAt) },
              ]}
              title={worktree.key}
            />
          ))}
        </div>
      ) : (
        <EmptyPanel text="No worktrees have reported yet." />
      )}
    </section>
  );
}

function LockList({ locks }: { locks: OperationsLock[] }) {
  return (
    <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <SectionHeader eyebrow="Locks" title="Lock Registry" />
      {locks.length > 0 ? (
        <div className="grid gap-2">
          {locks.map((lock) => (
            <CompactRow
              badges={<AdminBadge tone={lock.tone}>{labelFromValue(lock.state)}</AdminBadge>}
              detail={`${lock.issueIdentifier ?? "Unassigned"}${lock.branchName ? ` - ${lock.branchName}` : ""}`}
              key={lock.key}
              meta={[
                { label: "Runner", value: lock.runnerKey ?? lock.runnerType },
                { label: "Acquired", value: formatDateTime(lock.acquiredAt) },
                { label: "Expires", value: formatDateTime(lock.expiresAt) },
                { label: "Released", value: formatDateTime(lock.releasedAt) },
              ]}
              title={lock.key}
            />
          ))}
        </div>
      ) : (
        <EmptyPanel text="No locks have reported yet." />
      )}
    </section>
  );
}

function ReviewQueue({ items }: { items: OperationsReviewItem[] }) {
  return (
    <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <SectionHeader eyebrow="Review Queue" title="Recovery Guidance" />
      {items.length > 0 ? (
        <div className="grid gap-2">
          {items.map((item) => (
            <article key={item.key} className="rounded-lg border border-stone-800/70 bg-[#050505] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-stone-50">{item.title}</h3>
                    <AdminBadge tone={item.tone}>{labelFromValue(item.tone)}</AdminBadge>
                  </div>
                  <p className="mt-1 truncate text-sm text-stone-400">{item.detail}</p>
                </div>
                <p className="text-xs text-stone-500">{formatDateTime(item.timestamp)}</p>
              </div>
              <p className="mt-3 rounded-lg border border-[#C9A24A]/25 bg-[#C9A24A]/10 p-3 text-sm leading-6 text-[#F5D684]">
                {item.guidance}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyPanel text="No recovery items are waiting." />
      )}
    </section>
  );
}

function HistoryList({ history }: { history: OperationsExecutionEvent[] }) {
  return (
    <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <SectionHeader eyebrow="History" title="Recent Execution" />
      {history.length > 0 ? (
        <div className="grid gap-2">
          {history.slice(0, 12).map((event) => (
            <CompactRow
              badges={(
                <>
                  <AdminBadge tone={event.tone}>{labelFromValue(event.eventType)}</AdminBadge>
                  {event.attempt > 1 ? <AdminBadge tone="amber">Attempt {event.attempt}</AdminBadge> : null}
                </>
              )}
              detail={event.summary ?? event.issueTitle ?? event.worktreeKey ?? "Execution event"}
              key={`${event.eventType}-${event.issueIdentifier ?? event.occurredAt}-${event.attempt}`}
              meta={[
                { label: "Issue", value: event.issueIdentifier },
                { label: "Runner", value: event.runnerKey ?? event.runnerType },
                { label: "Worktree", value: event.worktreeKey },
                { label: "Occurred", value: formatDateTime(event.occurredAt) },
              ]}
              title={event.issueTitle ?? event.issueIdentifier ?? labelFromValue(event.eventType)}
            />
          ))}
        </div>
      ) : (
        <EmptyPanel text="No execution history has reported yet." />
      )}
    </section>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-stone-800/70 bg-[#050505] p-5 text-sm text-stone-400">
      {text}
    </div>
  );
}

function OperationsSummary({ data }: { data: OperationsRegistryData }) {
  const activeWorktrees = data.worktrees.filter((worktree) => worktree.status === "active").length;
  const openLocks = data.locks.filter((lock) => lock.state === "active" || lock.state === "stale" || lock.state === "expired").length;
  const claude = data.runners.find((runner) => runner.runnerType === "claude");
  const codex = data.runners.find((runner) => runner.runnerType === "codex");
  const dispatcher = data.dispatchers[0];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
      <MetricTile
        label="Dispatcher"
        tone={dispatcher?.tone ?? "red"}
        value={dispatcher?.stateLabel ?? "Offline"}
      />
      <MetricTile
        label="Mode"
        tone={dispatcher ? (dispatcher.testMode ? "blue" : "green") : "red"}
        value={dispatcher ? (dispatcher.testMode ? "Test" : "Live") : "Unknown"}
      />
      <MetricTile
        label="Claude"
        tone={claude?.tone ?? "amber"}
        value={labelFromValue(claude?.availability)}
      />
      <MetricTile
        label="Codex"
        tone={codex?.tone ?? "amber"}
        value={labelFromValue(codex?.availability)}
      />
      <MetricTile
        label="Worktrees"
        tone={activeWorktrees > 0 ? "blue" : "muted"}
        value={String(activeWorktrees)}
      />
      <MetricTile
        label="Locks"
        tone={openLocks > 0 ? "blue" : "green"}
        value={String(openLocks)}
      />
      <MetricTile
        label="Review"
        tone={data.reviewQueue.length > 0 ? "amber" : "green"}
        value={String(data.reviewQueue.length)}
      />
    </section>
  );
}

export default async function AdminOperationsPage() {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const data = await loadOperationsRegistry();

  return (
    <AdminShell
      active="operations-center"
      action={(
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-700 px-4 text-[11px] uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
          href="/admin"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          Dashboard
        </Link>
      )}
      title="Operations"
    >
      <div className="space-y-6">
        <HealthBanner data={data} />
        <OperationsSummary data={data} />

        <section className="grid gap-3 xl:grid-cols-2">
          {data.dispatchers.length > 0 ? (
            data.dispatchers.map((dispatcher) => (
              <DispatcherCard dispatcher={dispatcher} key={dispatcher.key} />
            ))
          ) : (
            <article className="rounded-xl border border-red-500/35 bg-red-950/25 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-red-100">No Dispatcher Heartbeat</h3>
                <AdminBadge tone="red">Offline</AdminBadge>
              </div>
              <p className="mt-2 text-sm leading-6 text-red-100/75">
                The registry has no dispatcher row. Confirm the approved dispatcher integration is writing health snapshots.
              </p>
            </article>
          )}
        </section>

        <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
          <SectionHeader eyebrow="Runners" title="Claude And Codex" />
          {data.runners.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {data.runners.map((runner) => (
                <RunnerCard key={runner.key} runner={runner} />
              ))}
            </div>
          ) : (
            <EmptyPanel text="No runner heartbeats have reported yet." />
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-6">
            <WorktreeList worktrees={data.worktrees} />
            <LockList locks={data.locks} />
          </div>
          <div className="space-y-6">
            <ReviewQueue items={data.reviewQueue} />
            <HistoryList history={data.history} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
