"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  HardDrive,
  History,
  KeyRound,
  PlayCircle,
  RadioTower,
  RefreshCw,
  RotateCcw,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import { AdminBadge, adminFont, type AdminBadgeTone } from "../../_components/AdminUI";
import {
  backupActionApiRoute,
  backupStatusApiRoute,
  formatBackupBytes,
  type BackupActionId,
  type BackupControlCenterData,
  type BackupHealthStatus,
} from "@/src/lib/operations-center/backups";

const statusTone: Record<BackupHealthStatus, AdminBadgeTone> = {
  critical: "red",
  ok: "green",
  unknown: "muted",
  warning: "amber",
};

const statusIcon = {
  critical: AlertTriangle,
  ok: CheckCircle2,
  unknown: Clock3,
  warning: AlertTriangle,
} satisfies Record<BackupHealthStatus, typeof AlertTriangle>;

const actionToneClassName = {
  amber: "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#F5D07A] hover:border-[#F5B942]",
  blue: "border-blue-400/25 bg-blue-950/30 text-blue-200 hover:border-blue-300/60",
  green: "border-green-500/25 bg-green-950/30 text-green-200 hover:border-green-300/60",
  red: "border-red-500/35 bg-red-950/25 text-red-200 hover:border-red-300/60",
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
  }).format(date);
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

function SectionHeader({
  action,
  detail,
  icon: Icon,
  label,
  title,
}: {
  action?: ReactNode;
  detail?: string;
  icon: typeof Database;
  label: string;
  title: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon aria-hidden="true" className="h-4 w-4 text-[#C9A24A]" strokeWidth={1.8} />
          <Label>{label}</Label>
        </div>
        <h2 className="mt-2 text-xl font-semibold text-stone-100">{title}</h2>
        {detail ? <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">{detail}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function StatusPill({ status }: { status: BackupHealthStatus }) {
  const Icon = statusIcon[status];

  return (
    <AdminBadge tone={statusTone[status]}>
      <span className="inline-flex items-center gap-1.5">
        <Icon aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
        {status}
      </span>
    </AdminBadge>
  );
}

function MetricCard({
  detail,
  label,
  status,
  value,
}: {
  detail: string;
  label: string;
  status: BackupHealthStatus;
  value: string;
}) {
  return (
    <section className="border border-stone-800/75 bg-[#080808]/90 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Label>{label}</Label>
          <p
            className="mt-2 truncate text-3xl font-bold leading-none text-stone-100"
            style={{ fontFamily: adminFont.oswald }}
          >
            {value}
          </p>
        </div>
        <StatusPill status={status} />
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">{detail}</p>
    </section>
  );
}

function WizardStep({
  detail,
  index,
  label,
  status,
}: {
  detail: string;
  index: number;
  label: string;
  status: BackupHealthStatus;
}) {
  return (
    <li className="grid gap-3 border-b border-stone-900/95 px-4 py-3 last:border-b-0 sm:grid-cols-[44px_minmax(0,1fr)_96px]">
      <div
        className="flex h-8 w-8 items-center justify-center border border-stone-800 bg-stone-950 text-xs font-bold text-[#E4C465]"
        style={{ fontFamily: adminFont.rajdhani }}
      >
        {index + 1}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-stone-100">{label}</p>
        <p className="mt-1 text-xs leading-5 text-stone-500">{detail}</p>
      </div>
      <div className="sm:justify-self-end">
        <StatusPill status={status} />
      </div>
    </li>
  );
}

function DetailRow({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-1 border-b border-stone-900/95 px-4 py-3 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)]">
      <Label>{label}</Label>
      <div className="min-w-0 text-sm leading-6 text-stone-300">{children}</div>
    </div>
  );
}

function ActionButton({
  action,
  disabled,
  onRun,
  pending,
}: {
  action: BackupControlCenterData["actions"][number];
  disabled: boolean;
  onRun: (actionId: BackupActionId) => void;
  pending: boolean;
}) {
  const Icon = action.id === "refresh_status"
    ? RefreshCw
    : action.id === "run_restore_test"
      ? RotateCcw
      : action.id === "verify_credentials"
        ? KeyRound
        : action.id === "verify_backblaze"
          ? ShieldCheck
          : PlayCircle;

  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 border px-3 text-[11px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:border-stone-800 disabled:bg-stone-950 disabled:text-stone-600 ${actionToneClassName[action.tone]}`}
      disabled={disabled || pending}
      onClick={() => onRun(action.id)}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      type="button"
    >
      <Icon aria-hidden="true" className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} strokeWidth={2} />
      {pending ? "Running" : action.label}
    </button>
  );
}

export function BackupControlCenter({
  initialData,
}: {
  initialData: BackupControlCenterData;
}) {
  const [data, setData] = useState(initialData);
  const [pendingAction, setPendingAction] = useState<BackupActionId | null>(null);
  const [actionResult, setActionResult] = useState<{
    message: string;
    ok: boolean;
  } | null>(null);

  async function refreshData() {
    const response = await fetch(backupStatusApiRoute, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json() as { data?: BackupControlCenterData };

    if (payload.data) {
      setData(payload.data);
    }
  }

  async function runAction(actionId: BackupActionId) {
    setPendingAction(actionId);
    setActionResult(null);

    try {
      const response = await fetch(backupActionApiRoute, {
        body: JSON.stringify({ actionId }),
        headers: {
          "Content-Type": "application/json",
          "x-usam-operations-intent": "backups",
        },
        method: "POST",
      });
      const payload = await response.json() as {
        data?: BackupControlCenterData;
        error?: string;
        message?: string;
        ok?: boolean;
      };

      setActionResult({
        message: payload.message ?? payload.error ?? "Backup action finished without a message.",
        ok: response.ok && payload.ok !== false,
      });

      if (payload.data) {
        setData(payload.data);
      } else {
        await refreshData();
      }
    } catch {
      setActionResult({
        message: "The admin backup API could not be reached.",
        ok: false,
      });
    } finally {
      setPendingAction(null);
    }
  }

  const actionDisabledReason = data.agent.localExecutionEnabled
    ? null
    : "Local Mac Mini execution is disabled in this protected preview.";

  return (
    <div className="space-y-6">
      <section className="border border-stone-800/75 bg-[#080808]/90 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ServerCog aria-hidden="true" className="h-4 w-4 text-[#C9A24A]" strokeWidth={1.8} />
              <Label>Infrastructure / Backups</Label>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-stone-100">Backup Control Center</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-stone-500">
              {data.agent.detail}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill status={data.agent.status} />
            <AdminBadge tone="muted">{data.agent.mode.replace(/_/g, " ")}</AdminBadge>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.actions.map((action) => (
            <ActionButton
              action={action}
              disabled={action.requiresLocalAgent && !data.agent.localExecutionEnabled}
              key={action.id}
              onRun={runAction}
              pending={pendingAction === action.id}
            />
          ))}
        </div>
        {actionDisabledReason ? (
          <p className="mt-3 text-xs leading-5 text-stone-500">{actionDisabledReason}</p>
        ) : null}
        {actionResult ? (
          <div className={`mt-4 border px-4 py-3 text-sm leading-6 ${actionResult.ok ? "border-green-500/25 bg-green-950/20 text-green-200" : "border-red-500/30 bg-red-950/20 text-red-200"}`}>
            {actionResult.message}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <MetricCard
            detail={metric.detail}
            key={metric.label}
            label={metric.label}
            status={metric.status}
            value={metric.value}
          />
        ))}
      </section>

      <section>
        <SectionHeader
          detail="Credential setup remains local to the Mac Mini. The dashboard never asks for or stores database, GPG, webhook, or Backblaze secret values."
          icon={KeyRound}
          label="Guided Setup"
          title="Credentials and Backblaze"
        />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_420px]">
          <ol className="border border-stone-800/75 bg-[#080808]/90">
            {data.wizard.map((step, index) => (
              <WizardStep
                detail={step.detail}
                index={index}
                key={step.id}
                label={step.label}
                status={step.status}
              />
            ))}
          </ol>
          <section className="border border-stone-800/75 bg-[#080808]/90">
            <DetailRow label="Keychain Setup">
              <code className="break-words text-xs text-[#F5D07A]">~/USAM-Automation/backup/bin/usam-backup-setup-secrets.sh</code>
            </DetailRow>
            <DetailRow label="Backblaze Path">
              <span>Configure B2 in local rclone, then set <code className="text-[#F5D07A]">OFFSITE_MODE=&quot;rclone:&lt;remote&gt;:&lt;path&gt;&quot;</code>.</span>
            </DetailRow>
            <DetailRow label="Secret Storage">
              <span>macOS Keychain and local rclone config only.</span>
            </DetailRow>
            <DetailRow label="Generated">
              {formatDateTime(data.generatedAt)}
            </DetailRow>
          </section>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div>
          <SectionHeader icon={Database} label="Backup View" title="Backup and Restore-Test" />
          <section className="border border-stone-800/75 bg-[#080808]/90">
            <DetailRow label="Last Run">
              <span className="inline-flex flex-wrap items-center gap-2">
                <StatusPill status={data.lastRun.state === "ok" ? "ok" : data.lastRun.state === "failed" ? "critical" : "unknown"} />
                {data.lastRun.detail}
              </span>
            </DetailRow>
            <DetailRow label="Finished">
              {formatDateTime(data.lastRun.finishedAt)}
            </DetailRow>
            <DetailRow label="Restore Boundary">
              Isolated local Postgres only; the USA-86 restore script refuses non-local targets.
            </DetailRow>
          </section>
        </div>

        <div>
          <SectionHeader icon={HardDrive} label="Capacity View" title="Disk and Retention" />
          <section className="border border-stone-800/75 bg-[#080808]/90">
            <DetailRow label="Disk">
              <span className="inline-flex flex-wrap items-center gap-2">
                <StatusPill status={data.disk.status} />
                {data.disk.detail}
              </span>
            </DetailRow>
            <DetailRow label="Total">
              {formatBackupBytes(data.disk.totalBytes)}
            </DetailRow>
            <DetailRow label="Retention">
              <span className="inline-flex flex-wrap items-center gap-2">
                <StatusPill status={data.retention.status} />
                {data.retention.detail}
              </span>
            </DetailRow>
          </section>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div>
          <SectionHeader icon={History} label="History View" title="Recent Backup Signals" />
          <section className="border border-stone-800/75 bg-[#080808]/90">
            {data.history.map((item) => (
              <DetailRow key={`${item.label}-${item.at ?? "none"}`} label={item.label}>
                <span className="inline-flex flex-wrap items-center gap-2">
                  <StatusPill status={item.status} />
                  <span>{item.detail}</span>
                  <span className="text-stone-600">{formatDateTime(item.at)}</span>
                </span>
              </DetailRow>
            ))}
          </section>
        </div>

        <div>
          <SectionHeader
            detail={data.codeProtection.detail}
            icon={ShieldCheck}
            label="Read-Only"
            title="Code Protection"
          />
          <section className="border border-stone-800/75 bg-[#080808]/90">
            {data.codeProtection.signals.map((signal) => (
              <DetailRow key={signal.label} label={signal.label}>
                <span className="inline-flex flex-wrap items-center gap-2">
                  <StatusPill status={signal.status} />
                  {signal.detail}
                </span>
              </DetailRow>
            ))}
          </section>
        </div>
      </section>

      <section>
        <SectionHeader icon={RadioTower} label="Security" title="Safeguards" />
        <ul className="grid gap-2 md:grid-cols-2">
          {data.safeguards.map((safeguard) => (
            <li className="border border-stone-800/75 bg-[#080808]/90 p-4 text-sm leading-6 text-stone-400" key={safeguard}>
              {safeguard}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
