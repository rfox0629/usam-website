export const backupControlCenterRoute = "/admin/operations-center/infrastructure/backups" as const;
export const backupStatusApiRoute = "/api/admin/operations-center/backups" as const;
export const backupActionApiRoute = "/api/admin/operations-center/backups/actions" as const;

export type BackupHealthStatus = "critical" | "ok" | "unknown" | "warning";

export type BackupAgentMode =
  | "local_disabled"
  | "local_ready"
  | "preview_read_only"
  | "unavailable";

export type BackupActionId =
  | "refresh_status"
  | "verify_credentials"
  | "verify_backblaze"
  | "run_backup_now"
  | "run_restore_test"
  | "run_self_test";

export type BackupActionDefinition = {
  approvedCommand: string | null;
  approvedArgs: readonly string[];
  id: BackupActionId;
  label: string;
  readOnly: boolean;
  requiresLocalAgent: boolean;
  tone: "amber" | "blue" | "green" | "red";
};

export type BackupRunStatus = {
  detail: string;
  finishedAt: string | null;
  state: "failed" | "ok" | "unknown";
};

export type BackupMetric = {
  detail: string;
  label: string;
  status: BackupHealthStatus;
  value: string;
};

export type BackupWizardStep = {
  detail: string;
  id: "agent" | "credentials" | "encryption" | "backblaze" | "restore" | "alerts";
  label: string;
  status: BackupHealthStatus;
};

export type BackupHistoryItem = {
  at: string | null;
  detail: string;
  label: string;
  status: BackupHealthStatus;
};

export type BackupRetentionState = {
  dailyDays: number;
  detail: string;
  monthlyDays: number;
  status: BackupHealthStatus;
  weeklyDays: number;
};

export type BackupDiskState = {
  detail: string;
  freeBytes: number | null;
  status: BackupHealthStatus;
  totalBytes: number | null;
};

export type CodeProtectionSignal = {
  detail: string;
  label: string;
  status: BackupHealthStatus;
};

export type BackupControlCenterData = {
  actions: BackupActionDefinition[];
  agent: {
    detail: string;
    keychainWritesEnabled: boolean;
    localExecutionEnabled: boolean;
    mode: BackupAgentMode;
    status: BackupHealthStatus;
  };
  codeProtection: {
    detail: string;
    signals: CodeProtectionSignal[];
    status: BackupHealthStatus;
  };
  disk: BackupDiskState;
  generatedAt: string;
  history: BackupHistoryItem[];
  lastRun: BackupRunStatus;
  metrics: BackupMetric[];
  offsite: {
    detail: string;
    mode: string;
    status: BackupHealthStatus;
  };
  retention: BackupRetentionState;
  safeguards: string[];
  wizard: BackupWizardStep[];
};

export const backupAgentActionDefinitions = [
  {
    approvedArgs: [],
    approvedCommand: null,
    id: "refresh_status",
    label: "Refresh Status",
    readOnly: true,
    requiresLocalAgent: false,
    tone: "blue",
  },
  {
    approvedArgs: [],
    approvedCommand: "/usr/bin/security find-generic-password",
    id: "verify_credentials",
    label: "Verify Keychain",
    readOnly: true,
    requiresLocalAgent: true,
    tone: "blue",
  },
  {
    approvedArgs: [],
    approvedCommand: null,
    id: "verify_backblaze",
    label: "Verify Backblaze",
    readOnly: true,
    requiresLocalAgent: true,
    tone: "blue",
  },
  {
    approvedArgs: [],
    approvedCommand: "backup/bin/usam-backup.sh",
    id: "run_backup_now",
    label: "Run Backup Now",
    readOnly: false,
    requiresLocalAgent: true,
    tone: "green",
  },
  {
    approvedArgs: ["--latest"],
    approvedCommand: "backup/bin/usam-restore.sh",
    id: "run_restore_test",
    label: "Run Restore Test",
    readOnly: false,
    requiresLocalAgent: true,
    tone: "amber",
  },
  {
    approvedArgs: [],
    approvedCommand: "backup/bin/usam-backup-selftest.sh",
    id: "run_self_test",
    label: "Run Self-Test",
    readOnly: false,
    requiresLocalAgent: true,
    tone: "amber",
  },
] as const satisfies readonly BackupActionDefinition[];

const sensitiveValuePattern = /(bearer\s+[a-z0-9._-]+|service_role|password\s*=|passphrase\s*=|secret\s*=|token\s*=|key\s*=|sk-[a-z0-9_-]+)/i;

export function isBackupActionId(value: unknown): value is BackupActionId {
  return backupAgentActionDefinitions.some((action) => action.id === value);
}

export function backupActionForId(actionId: BackupActionId) {
  return backupAgentActionDefinitions.find((action) => action.id === actionId) ?? null;
}

export function redactBackupText(value: unknown, fallback = "Unavailable") {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return fallback;
  }

  return sensitiveValuePattern.test(normalized)
    ? "[redacted]"
    : normalized.slice(0, 220);
}

export function parseBackupRunStatus(value: string | null | undefined): BackupRunStatus {
  const statusText = redactBackupText(value, "");

  if (!statusText) {
    return {
      detail: "No backup status file is available.",
      finishedAt: null,
      state: "unknown",
    };
  }

  const match = /^(OK|FAILED)\s+([0-9-]{10}\s+[0-9:]{8})(?:\s+::\s+(.+))?$/i.exec(statusText);

  if (!match) {
    return {
      detail: statusText,
      finishedAt: null,
      state: "unknown",
    };
  }

  const parsedDate = new Date(`${match[2].replace(" ", "T")}`);

  return {
    detail: redactBackupText(match[3], match[1].toUpperCase() === "OK" ? "Backup completed." : "Backup failed."),
    finishedAt: Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString(),
    state: match[1].toUpperCase() === "OK" ? "ok" : "failed",
  };
}

export function formatBackupBytes(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "Unavailable";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let current = Math.max(0, value);
  let unitIndex = 0;

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }

  const maximumFractionDigits = current >= 10 || unitIndex === 0 ? 0 : 1;
  return `${current.toLocaleString("en-US", { maximumFractionDigits })} ${units[unitIndex]}`;
}

export function evaluateBackupDiskState({
  freeBytes,
  totalBytes,
}: {
  freeBytes: number | null;
  totalBytes: number | null;
}): BackupDiskState {
  if (freeBytes === null || totalBytes === null || totalBytes <= 0) {
    return {
      detail: "Disk capacity is available only from the local Mac Mini agent.",
      freeBytes,
      status: "unknown",
      totalBytes,
    };
  }

  const freeRatio = freeBytes / totalBytes;

  if (freeBytes < 40 * 1024 ** 3 || freeRatio < 0.1) {
    return {
      detail: `${formatBackupBytes(freeBytes)} free. Backup writes should pause until space is reclaimed.`,
      freeBytes,
      status: "critical",
      totalBytes,
    };
  }

  if (freeBytes < 80 * 1024 ** 3 || freeRatio < 0.2) {
    return {
      detail: `${formatBackupBytes(freeBytes)} free. Capacity is inside the warning band.`,
      freeBytes,
      status: "warning",
      totalBytes,
    };
  }

  return {
    detail: `${formatBackupBytes(freeBytes)} free of ${formatBackupBytes(totalBytes)}.`,
    freeBytes,
    status: "ok",
    totalBytes,
  };
}

export function evaluateOffsiteMode(mode: string | null | undefined) {
  const normalized = redactBackupText(mode, "none");

  if (normalized === "none" || normalized === "Unavailable") {
    return {
      detail: "Backblaze or another off-site destination is not configured; local encrypted backups are loud-only.",
      mode: "none",
      status: "warning" as const,
    };
  }

  if (normalized.startsWith("rclone:")) {
    return {
      detail: "Off-site shipment is configured through a local rclone remote. Secrets stay in the Mac Mini profile.",
      mode: "Backblaze B2 via rclone",
      status: "ok" as const,
    };
  }

  if (normalized.startsWith("dir:")) {
    return {
      detail: "Off-site shipment is configured to a mounted destination.",
      mode: "Mounted directory",
      status: "ok" as const,
    };
  }

  return {
    detail: "Off-site mode is present but not recognized by the dashboard.",
    mode: normalized,
    status: "warning" as const,
  };
}

export function buildBackupMetrics({
  agentStatus,
  disk,
  lastRun,
  offsite,
}: {
  agentStatus: BackupHealthStatus;
  disk: BackupDiskState;
  lastRun: BackupRunStatus;
  offsite: { detail: string; mode: string; status: BackupHealthStatus };
}): BackupMetric[] {
  return [
    {
      detail: lastRun.detail,
      label: "Last Backup",
      status: lastRun.state === "ok" ? "ok" : lastRun.state === "failed" ? "critical" : "unknown",
      value: lastRun.state === "ok" ? "OK" : lastRun.state === "failed" ? "Failed" : "Unknown",
    },
    {
      detail: offsite.detail,
      label: "Off-Site Copy",
      status: offsite.status,
      value: offsite.mode,
    },
    {
      detail: disk.detail,
      label: "Disk Capacity",
      status: disk.status,
      value: formatBackupBytes(disk.freeBytes),
    },
    {
      detail: agentStatus === "ok" ? "Local Mac Mini execution is available." : "Preview is read-only until the local agent is enabled.",
      label: "Local Agent",
      status: agentStatus,
      value: agentStatus === "ok" ? "Ready" : "Read-only",
    },
  ];
}

export function buildBackupWizard({
  agentStatus,
  credentialsReady,
  lastRun,
  offsiteStatus,
}: {
  agentStatus: BackupHealthStatus;
  credentialsReady: boolean | null;
  lastRun: BackupRunStatus;
  offsiteStatus: BackupHealthStatus;
}): BackupWizardStep[] {
  return [
    {
      detail: "Run the dashboard locally on the Mac Mini to enable approved backup actions.",
      id: "agent",
      label: "Mac Mini Agent",
      status: agentStatus,
    },
    {
      detail: "Database password lives in macOS Keychain under the USA-86 service name.",
      id: "credentials",
      label: "Database Credential",
      status: credentialsReady === true ? "ok" : credentialsReady === false ? "warning" : "unknown",
    },
    {
      detail: "Encryption passphrase is checked by the local agent without printing it.",
      id: "encryption",
      label: "Encryption Passphrase",
      status: credentialsReady === true ? "ok" : credentialsReady === false ? "warning" : "unknown",
    },
    {
      detail: "Backblaze B2 should be configured through a local rclone remote; no B2 key is stored in Supabase or Vercel.",
      id: "backblaze",
      label: "Backblaze Destination",
      status: offsiteStatus,
    },
    {
      detail: "Restore tests use the USA-86 isolated local Postgres workflow and never target production.",
      id: "restore",
      label: "Restore-Test Proof",
      status: lastRun.state === "failed" ? "warning" : "unknown",
    },
    {
      detail: "Failures write LAST_RUN_STATUS, BACKUP_FAILING, macOS notification, and optional webhook.",
      id: "alerts",
      label: "Visible Alerts",
      status: "ok",
    },
  ];
}

export function codeProtectionSignals(): CodeProtectionSignal[] {
  return [
    {
      detail: "The dashboard exposes status only. No write, prune, reset, checkout, DNS, or production deployment action is available.",
      label: "Repository Safety",
      status: "ok",
    },
    {
      detail: "Logical Supabase dumps do not contain Auth JWT secrets, API keys, Edge Function source, or Vercel project settings.",
      label: "Platform Gaps",
      status: "warning",
    },
    {
      detail: "Restore actions are constrained to the USA-86 local restore script, which refuses non-local database targets.",
      label: "Restore Boundary",
      status: "ok",
    },
  ];
}

export const backupSafeguards = [
  "No secrets are stored in Supabase, Vercel, browser storage, Linear comments, or source files.",
  "The action API accepts a fixed action id only; there is no command, argument, or shell body field.",
  "Local execution is disabled unless the Mac Mini runtime explicitly opts in.",
  "Credential readiness checks use Keychain item presence only and never request secret values.",
  "Restore tests use the USA-86 local restore workflow and cannot target production.",
] as const;
