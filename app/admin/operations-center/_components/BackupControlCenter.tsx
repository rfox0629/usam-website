"use client";

import { useState, type FormEvent, type ReactNode } from "react";
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
  backupStatusApiRoute,
  formatBackupBytes,
  localBackupAgentDefaultUrl,
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

function FormField({
  autoComplete,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  autoComplete?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "password" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        autoComplete={autoComplete}
        className="mt-2 h-10 w-full border border-stone-800 bg-stone-950 px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-700 focus:border-[#C9A24A]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function ActionMessage({
  message,
  ok,
}: {
  message: string;
  ok: boolean;
}) {
  return (
    <div className={`mt-4 border px-4 py-3 text-sm leading-6 ${ok ? "border-green-500/25 bg-green-950/20 text-green-200" : "border-red-500/30 bg-red-950/20 text-red-200"}`}>
      {message}
    </div>
  );
}

type LocalAgentPayload = {
  data?: BackupControlCenterData;
  error?: string;
  expiresAt?: string;
  message?: string;
  ok?: boolean;
  sessionToken?: string;
};

export function BackupControlCenter({
  initialData,
}: {
  initialData: BackupControlCenterData;
}) {
  const [data, setData] = useState(initialData);
  const [pendingAction, setPendingAction] = useState<BackupActionId | null>(null);
  const [agentUrl, setAgentUrl] = useState<string>(localBackupAgentDefaultUrl);
  const [agentToken, setAgentToken] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [actionResult, setActionResult] = useState<{
    message: string;
    ok: boolean;
  } | null>(null);
  const [databasePassword, setDatabasePassword] = useState("");
  const [encryptionPassphrase, setEncryptionPassphrase] = useState("");
  const [encryptionConfirm, setEncryptionConfirm] = useState("");
  const [b2KeyId, setB2KeyId] = useState("");
  const [b2ApplicationKey, setB2ApplicationKey] = useState("");
  const [b2Bucket, setB2Bucket] = useState("");
  const [b2Prefix, setB2Prefix] = useState("usam-supabase");
  const [b2RemoteName, setB2RemoteName] = useState("usam-b2");
  const agentBaseUrl = agentUrl.replace(/\/+$/, "");

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

  async function callLocalAgent(
    path: string,
    options: {
      body?: Record<string, unknown>;
      method?: "GET" | "POST";
      requireToken?: boolean;
    } = {},
  ) {
    if (options.requireToken !== false && !agentToken) {
      throw new Error("Pair with the Mac Mini backup agent first.");
    }

    const headers: Record<string, string> = {
      "X-USAM-Backup-Agent": "operations-dashboard",
    };

    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    if (options.requireToken !== false) {
      headers.Authorization = `Bearer ${agentToken}`;
    }

    const response = await fetch(`${agentBaseUrl}${path}`, {
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      headers,
      method: options.method ?? "GET",
      mode: "cors",
    });
    const payload = await response.json().catch(() => ({})) as LocalAgentPayload;

    if (!response.ok) {
      throw new Error(payload.error ?? payload.message ?? `Mac Mini agent returned HTTP ${response.status}.`);
    }

    return payload;
  }

  async function refreshFromLocalAgent() {
    const payload = await callLocalAgent("/v1/status");

    if (payload.data) {
      setData(payload.data);
    }

    return payload;
  }

  async function connectLocalAgent() {
    setActionResult(null);

    try {
      const payload = await callLocalAgent("/v1/health", { requireToken: false });

      setActionResult({
        message: payload.message ?? "Mac Mini backup agent is reachable. Start pairing to unlock setup actions.",
        ok: true,
      });
    } catch (error) {
      setActionResult({
        message: error instanceof Error ? error.message : "Mac Mini backup agent could not be reached.",
        ok: false,
      });
    }
  }

  async function startPairing() {
    setActionResult(null);

    try {
      const payload = await callLocalAgent("/v1/pair/start", {
        method: "POST",
        requireToken: false,
      });

      setActionResult({
        message: payload.message ?? "Pairing code displayed on the Mac Mini.",
        ok: true,
      });
    } catch (error) {
      setActionResult({
        message: error instanceof Error ? error.message : "Pairing could not start.",
        ok: false,
      });
    }
  }

  async function completePairing() {
    setActionResult(null);

    try {
      const payload = await callLocalAgent("/v1/pair/complete", {
        body: { code: pairingCode },
        method: "POST",
        requireToken: false,
      });

      if (!payload.sessionToken) {
        throw new Error("Mac Mini agent did not return a session token.");
      }

      setAgentToken(payload.sessionToken);
      setPairingCode("");
      setActionResult({
        message: `Mac Mini agent paired until ${formatDateTime(payload.expiresAt ?? null)}.`,
        ok: true,
      });
    } catch (error) {
      setActionResult({
        message: error instanceof Error ? error.message : "Pairing failed.",
        ok: false,
      });
    }
  }

  async function runAction(actionId: BackupActionId) {
    setPendingAction(actionId);
    setActionResult(null);

    try {
      if (actionId === "refresh_status") {
        if (agentToken) {
          const payload = await refreshFromLocalAgent();

          setActionResult({
            message: payload.message ?? "Local backup status refreshed.",
            ok: true,
          });
        } else {
          await refreshData();
          setActionResult({
            message: "Preview status refreshed. Pair the Mac Mini agent for live setup and backup actions.",
            ok: true,
          });
        }

        return;
      }

      const pathByAction: Partial<Record<BackupActionId, string>> = {
        run_backup_now: "/v1/backup/first",
        run_restore_test: "/v1/restore-test",
        run_self_test: "/v1/self-test",
        verify_backblaze: "/v1/validate/backblaze",
        verify_credentials: "/v1/validate/database",
      };
      const agentPath = pathByAction[actionId];

      if (!agentPath) {
        throw new Error("Use the setup forms for this action.");
      }

      const payload = await callLocalAgent(agentPath, { method: "POST" });

      setActionResult({
        message: payload.message ?? "Backup action completed.",
        ok: payload.ok !== false,
      });
      await refreshFromLocalAgent();
    } catch (error) {
      setActionResult({
        message: error instanceof Error ? error.message : "The Mac Mini backup agent could not be reached.",
        ok: false,
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function submitDatabaseCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("configure_database_credential");
    setActionResult(null);

    try {
      const payload = await callLocalAgent("/v1/secrets/database", {
        body: { password: databasePassword },
        method: "POST",
      });

      setDatabasePassword("");
      setActionResult({ message: payload.message ?? "Database credential stored.", ok: payload.ok !== false });
      await refreshFromLocalAgent();
    } catch (error) {
      setActionResult({ message: error instanceof Error ? error.message : "Database credential could not be saved.", ok: false });
    } finally {
      setPendingAction(null);
    }
  }

  async function submitEncryptionPassphrase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("configure_encryption_passphrase");
    setActionResult(null);

    try {
      const payload = await callLocalAgent("/v1/secrets/encryption", {
        body: {
          confirm: encryptionConfirm,
          passphrase: encryptionPassphrase,
        },
        method: "POST",
      });

      setEncryptionPassphrase("");
      setEncryptionConfirm("");
      setActionResult({ message: payload.message ?? "Encryption passphrase stored.", ok: payload.ok !== false });
      await refreshFromLocalAgent();
    } catch (error) {
      setActionResult({ message: error instanceof Error ? error.message : "Encryption passphrase could not be saved.", ok: false });
    } finally {
      setPendingAction(null);
    }
  }

  async function submitBackblaze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("configure_backblaze");
    setActionResult(null);

    try {
      const payload = await callLocalAgent("/v1/backblaze", {
        body: {
          applicationKey: b2ApplicationKey,
          bucket: b2Bucket,
          keyId: b2KeyId,
          prefix: b2Prefix,
          remoteName: b2RemoteName,
        },
        method: "POST",
      });

      setB2KeyId("");
      setB2ApplicationKey("");
      setActionResult({ message: payload.message ?? "Backblaze B2 configured.", ok: payload.ok !== false });
      await refreshFromLocalAgent();
    } catch (error) {
      setActionResult({ message: error instanceof Error ? error.message : "Backblaze B2 could not be configured.", ok: false });
    } finally {
      setPendingAction(null);
    }
  }

  const isPaired = Boolean(agentToken);
  const formDisabled = !isPaired || pendingAction !== null;
  const actionDisabledReason = isPaired
    ? null
    : "Pair with the Mac Mini backup agent to unlock Keychain setup, first backup, and restore-test actions.";

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
              disabled={action.requiresLocalAgent && !isPaired}
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
          <ActionMessage message={actionResult.message} ok={actionResult.ok} />
        ) : null}
      </section>

      <section>
        <SectionHeader
          detail="Pairing is held in memory only for this browser session. Secret forms and live actions are sent directly to the local agent URL below."
          icon={ServerCog}
          label="Local Agent"
          title="Mac Mini Pairing"
        />
        <section className="grid gap-3 border border-stone-800/75 bg-[#080808]/90 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,420px)]">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <FormField
              label="Agent URL"
              onChange={setAgentUrl}
              value={agentUrl}
            />
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 self-end border border-blue-400/25 bg-blue-950/30 px-3 text-[11px] uppercase tracking-[0.14em] text-blue-200 transition-colors hover:border-blue-300/60"
              onClick={connectLocalAgent}
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
              Connect
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 self-end border border-[#C9A24A]/35 bg-[#C9A24A]/10 px-3 text-[11px] uppercase tracking-[0.14em] text-[#F5D07A] transition-colors hover:border-[#F5B942]"
              onClick={startPairing}
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              type="button"
            >
              <KeyRound aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
              Pair
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <FormField
              autoComplete="one-time-code"
              label="Pairing Code"
              onChange={setPairingCode}
              placeholder="6 digits"
              value={pairingCode}
            />
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 self-end border border-green-500/25 bg-green-950/30 px-3 text-[11px] uppercase tracking-[0.14em] text-green-200 transition-colors hover:border-green-300/60 disabled:cursor-not-allowed disabled:border-stone-800 disabled:bg-stone-950 disabled:text-stone-600"
              disabled={!pairingCode}
              onClick={completePairing}
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              type="button"
            >
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
              Unlock
            </button>
          </div>
        </section>
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
          detail="Credentials go from this browser to the paired Mac Mini agent on loopback. The web server receives neither the values nor the action payload."
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
              <span>{isPaired ? "Unlocked for this browser session." : "Pair the local Mac Mini agent first."}</span>
            </DetailRow>
            <DetailRow label="Backblaze Path">
              <span>The agent writes only the non-secret <code className="text-[#F5D07A]">OFFSITE_MODE</code> destination path to <code className="text-[#F5D07A]">backup.env</code>.</span>
            </DetailRow>
            <DetailRow label="Secret Storage">
              <span>macOS Keychain only.</span>
            </DetailRow>
            <DetailRow label="Generated">
              {formatDateTime(data.generatedAt)}
            </DetailRow>
          </section>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <form className="border border-stone-800/75 bg-[#080808]/90 p-4" onSubmit={submitDatabaseCredential}>
          <SectionHeader icon={Database} label="Step 1" title="Supabase Credential" />
          <div className="space-y-3">
            <FormField
              autoComplete="new-password"
              label="Database Password"
              onChange={setDatabasePassword}
              type="password"
              value={databasePassword}
            />
            <button
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 border border-green-500/25 bg-green-950/30 px-3 text-[11px] uppercase tracking-[0.14em] text-green-200 transition-colors hover:border-green-300/60 disabled:cursor-not-allowed disabled:border-stone-800 disabled:bg-stone-950 disabled:text-stone-600"
              disabled={formDisabled || !databasePassword}
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              type="submit"
            >
              <KeyRound aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
              Validate And Store
            </button>
          </div>
        </form>

        <form className="border border-stone-800/75 bg-[#080808]/90 p-4" onSubmit={submitEncryptionPassphrase}>
          <SectionHeader icon={ShieldCheck} label="Step 2" title="Encryption Passphrase" />
          <div className="space-y-3">
            <FormField
              autoComplete="new-password"
              label="Passphrase"
              onChange={setEncryptionPassphrase}
              type="password"
              value={encryptionPassphrase}
            />
            <FormField
              autoComplete="new-password"
              label="Confirm"
              onChange={setEncryptionConfirm}
              type="password"
              value={encryptionConfirm}
            />
            <button
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 border border-green-500/25 bg-green-950/30 px-3 text-[11px] uppercase tracking-[0.14em] text-green-200 transition-colors hover:border-green-300/60 disabled:cursor-not-allowed disabled:border-stone-800 disabled:bg-stone-950 disabled:text-stone-600"
              disabled={formDisabled || !encryptionPassphrase || !encryptionConfirm}
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              type="submit"
            >
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
              Store In Keychain
            </button>
          </div>
        </form>

        <form className="border border-stone-800/75 bg-[#080808]/90 p-4" onSubmit={submitBackblaze}>
          <SectionHeader icon={RadioTower} label="Step 3" title="Backblaze B2" />
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                autoComplete="new-password"
                label="Key ID"
                onChange={setB2KeyId}
                type="password"
                value={b2KeyId}
              />
              <FormField
                autoComplete="new-password"
                label="Application Key"
                onChange={setB2ApplicationKey}
                type="password"
                value={b2ApplicationKey}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Bucket" onChange={setB2Bucket} value={b2Bucket} />
              <FormField label="Prefix" onChange={setB2Prefix} value={b2Prefix} />
              <FormField label="Remote" onChange={setB2RemoteName} value={b2RemoteName} />
            </div>
            <button
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 border border-green-500/25 bg-green-950/30 px-3 text-[11px] uppercase tracking-[0.14em] text-green-200 transition-colors hover:border-green-300/60 disabled:cursor-not-allowed disabled:border-stone-800 disabled:bg-stone-950 disabled:text-stone-600"
              disabled={formDisabled || !b2KeyId || !b2ApplicationKey || !b2Bucket || !b2RemoteName}
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              type="submit"
            >
              <RadioTower aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
              Validate And Configure
            </button>
          </div>
        </form>
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
