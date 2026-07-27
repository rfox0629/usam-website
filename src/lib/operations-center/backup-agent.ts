import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  backupActionForId,
  backupAgentActionDefinitions,
  backupSafeguards,
  buildBackupMetrics,
  buildBackupWizard,
  codeProtectionSignals,
  evaluateBackupDiskState,
  evaluateOffsiteMode,
  parseBackupRunStatus,
  redactBackupText,
  type BackupActionId,
  type BackupControlCenterData,
  type BackupDiskState,
  type BackupHealthStatus,
  type BackupHistoryItem,
  type BackupRetentionState,
} from "./backups";

type BackupEnvConfig = {
  keychainAccount: string;
  keychainAlertWebhookService: string;
  keychainDbPasswordService: string;
  keychainGpgPassphraseService: string;
  offsiteMode: string;
  retentionDailyDays: number;
  retentionMonthlyDays: number;
  retentionWeeklyDays: number;
};

type ProcessResult = {
  exitCode: number | null;
  output: string;
  timedOut: boolean;
};

const automationRoot = process.env.USAM_AUTOMATION_ROOT ?? "/Users/ryanfox/USAM-Automation";
const backupHome = process.env.USAM_BACKUP_HOME ?? path.join(automationRoot, "backup");
const backupRoot = process.env.USAM_BACKUP_ROOT ?? path.join(process.env.HOME ?? "", "USAM-Backups");
const backupEnvPath = path.join(backupHome, "config", "backup.env");
const backupLogDir = path.join(backupRoot, "logs");
const localExecutionEnabled = process.env.USAM_BACKUP_AGENT_LOCAL_EXECUTION === "enabled";
const keychainWritesEnabled = false;

const defaultBackupConfig: BackupEnvConfig = {
  keychainAccount: "usam-backup",
  keychainAlertWebhookService: "usam-backup-alert-webhook",
  keychainDbPasswordService: "usam-supabase-db-password",
  keychainGpgPassphraseService: "usam-backup-gpg-passphrase",
  offsiteMode: "none",
  retentionDailyDays: 14,
  retentionMonthlyDays: 185,
  retentionWeeklyDays: 56,
};

function redactProcessOutput(value: string) {
  const output = value
    .split(/\r?\n/)
    .map((line) => redactBackupText(line, ""))
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);

  return output || "No process output.";
}

function parseBackupEnvValue(source: string, key: string) {
  const match = new RegExp(`^${key}=("?)([^"\\n#]+)\\1`, "m").exec(source);
  return match?.[2]?.trim() ?? null;
}

function parseBackupEnvNumber(source: string, key: string, fallback: number) {
  const value = Number.parseInt(parseBackupEnvValue(source, key) ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function readBackupEnvConfig(): Promise<{
  config: BackupEnvConfig;
  found: boolean;
}> {
  try {
    const source = await readFile(backupEnvPath, "utf8");

    return {
      config: {
        keychainAccount: parseBackupEnvValue(source, "KEYCHAIN_ACCOUNT") ?? defaultBackupConfig.keychainAccount,
        keychainAlertWebhookService: parseBackupEnvValue(source, "KEYCHAIN_ALERT_WEBHOOK_SERVICE") ?? defaultBackupConfig.keychainAlertWebhookService,
        keychainDbPasswordService: parseBackupEnvValue(source, "KEYCHAIN_DB_PASSWORD_SERVICE") ?? defaultBackupConfig.keychainDbPasswordService,
        keychainGpgPassphraseService: parseBackupEnvValue(source, "KEYCHAIN_GPG_PASSPHRASE_SERVICE") ?? defaultBackupConfig.keychainGpgPassphraseService,
        offsiteMode: parseBackupEnvValue(source, "OFFSITE_MODE") ?? defaultBackupConfig.offsiteMode,
        retentionDailyDays: parseBackupEnvNumber(source, "RETENTION_DAILY_DAYS", defaultBackupConfig.retentionDailyDays),
        retentionMonthlyDays: parseBackupEnvNumber(source, "RETENTION_MONTHLY_DAYS", defaultBackupConfig.retentionMonthlyDays),
        retentionWeeklyDays: parseBackupEnvNumber(source, "RETENTION_WEEKLY_DAYS", defaultBackupConfig.retentionWeeklyDays),
      },
      found: true,
    };
  } catch {
    return {
      config: defaultBackupConfig,
      found: false,
    };
  }
}

async function readTextFile(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function loadHistory(): Promise<BackupHistoryItem[]> {
  const lastRun = parseBackupRunStatus(await readTextFile(path.join(backupLogDir, "LAST_RUN_STATUS")));
  const history: BackupHistoryItem[] = [
    {
      at: lastRun.finishedAt,
      detail: lastRun.detail,
      label: "LAST_RUN_STATUS",
      status: lastRun.state === "ok" ? "ok" : lastRun.state === "failed" ? "critical" : "unknown",
    },
  ];

  try {
    await stat(path.join(backupLogDir, "BACKUP_FAILING"));
    history.push({
      at: new Date().toISOString(),
      detail: "Failure marker is present. The next successful USA-86 run clears it.",
      label: "BACKUP_FAILING",
      status: "critical",
    });
  } catch {
    history.push({
      at: lastRun.finishedAt,
      detail: "No active failure marker was found.",
      label: "BACKUP_FAILING",
      status: lastRun.state === "failed" ? "warning" : "ok",
    });
  }

  try {
    const entries = await readdir(backupLogDir, { withFileTypes: true });
    const logs = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && /^backup-\d{4}-\d{2}-\d{2}\.log$/.test(entry.name))
        .slice(-8)
        .map(async (entry) => {
          const fileStat = await stat(path.join(backupLogDir, entry.name));

          return {
            at: fileStat.mtime.toISOString(),
            detail: "Local log file detected. Contents are not streamed into the browser.",
            label: entry.name,
            status: "ok" as BackupHealthStatus,
          };
        }),
    );

    history.push(...logs.sort((first, second) => {
      return new Date(second.at ?? 0).getTime() - new Date(first.at ?? 0).getTime();
    }).slice(0, 5));
  } catch {
    history.push({
      at: null,
      detail: "Local backup log directory is not available to this runtime.",
      label: "backup logs",
      status: "unknown",
    });
  }

  return history;
}

function retentionState(config: BackupEnvConfig): BackupRetentionState {
  return {
    dailyDays: config.retentionDailyDays,
    detail: `Daily ${config.retentionDailyDays}d, weekly ${config.retentionWeeklyDays}d, monthly ${config.retentionMonthlyDays}d. Retention is enforced by USA-86 after each backup run.`,
    monthlyDays: config.retentionMonthlyDays,
    status: "ok",
    weeklyDays: config.retentionWeeklyDays,
  };
}

function agentMode(envFound: boolean) {
  if (localExecutionEnabled) {
    return {
      detail: "Local Mac Mini execution is enabled for approved USA-86 backup actions.",
      mode: "local_ready" as const,
      status: "ok" as const,
    };
  }

  if (envFound) {
    return {
      detail: "USA-86 configuration is visible, but action execution is disabled for this dashboard runtime.",
      mode: "preview_read_only" as const,
      status: "warning" as const,
    };
  }

  return {
    detail: "USA-86 local backup files are not available to this runtime.",
    mode: "unavailable" as const,
    status: "unknown" as const,
  };
}

async function runProcess(
  command: string,
  args: readonly string[],
  timeoutMs = 120000,
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = spawn(command, [...args], {
      cwd: backupHome,
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      child.kill("SIGTERM");
      resolve({
        exitCode: null,
        output: "Action timed out before completion.",
        timedOut: true,
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode: null,
        output: redactProcessOutput(error.message),
        timedOut: false,
      });
    });
    child.on("close", (exitCode) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode,
        output: redactProcessOutput(Buffer.concat(chunks).toString("utf8")),
        timedOut: false,
      });
    });
  });
}

async function runDf(): Promise<BackupDiskState> {
  if (!localExecutionEnabled) {
    return evaluateBackupDiskState({ freeBytes: null, totalBytes: null });
  }

  const result = await runProcess("/bin/df", ["-k", backupRoot], 15000);
  const line = result.output.split(/\n/).find((candidate) => candidate.includes("/")) ?? "";
  const columns = line.trim().split(/\s+/);
  const totalKb = Number.parseInt(columns[1] ?? "", 10);
  const freeKb = Number.parseInt(columns[3] ?? "", 10);

  if (!Number.isFinite(totalKb) || !Number.isFinite(freeKb)) {
    return evaluateBackupDiskState({ freeBytes: null, totalBytes: null });
  }

  return evaluateBackupDiskState({
    freeBytes: freeKb * 1024,
    totalBytes: totalKb * 1024,
  });
}

async function checkKeychainCredentials(config: BackupEnvConfig) {
  if (!localExecutionEnabled) {
    return null;
  }

  const requiredServices = [
    config.keychainDbPasswordService,
    config.keychainGpgPassphraseService,
  ];

  const results = await Promise.all(requiredServices.map(async (service) => {
    const result = await runProcess("/usr/bin/security", [
      "find-generic-password",
      "-s",
      service,
      "-a",
      config.keychainAccount,
    ], 15000);

    return result.exitCode === 0;
  }));

  return results.every(Boolean);
}

export async function loadBackupControlCenterData(): Promise<BackupControlCenterData> {
  const { config, found } = await readBackupEnvConfig();
  const agent = agentMode(found);
  const lastRun = parseBackupRunStatus(await readTextFile(path.join(backupLogDir, "LAST_RUN_STATUS")));
  const offsite = evaluateOffsiteMode(config.offsiteMode);
  const disk = await runDf();
  const credentialsReady = await checkKeychainCredentials(config);
  const retention = retentionState(config);
  const codeProtection = codeProtectionSignals();
  const codeProtectionStatus = codeProtection.some((signal) => signal.status === "critical")
    ? "critical"
    : codeProtection.some((signal) => signal.status === "warning")
      ? "warning"
      : "ok";

  return {
    actions: [...backupAgentActionDefinitions],
    agent: {
      detail: agent.detail,
      keychainWritesEnabled,
      localExecutionEnabled,
      mode: agent.mode,
      requiresPairing: true,
      status: agent.status,
    },
    codeProtection: {
      detail: "Read-only code protection status. This dashboard cannot mutate repositories, DNS, production deployments, or production schemas.",
      signals: codeProtection,
      status: codeProtectionStatus,
    },
    disk,
    generatedAt: new Date().toISOString(),
    history: await loadHistory(),
    lastRun,
    metrics: buildBackupMetrics({
      agentStatus: agent.status,
      disk,
      lastRun,
      offsite,
    }),
    offsite,
    retention,
    safeguards: [...backupSafeguards],
    wizard: buildBackupWizard({
      agentStatus: agent.status,
      credentialsReady,
      keychainWritesEnabled,
      lastRun,
      offsiteStatus: offsite.status,
    }),
  };
}

function resolveApprovedScript(actionId: BackupActionId) {
  const action = backupActionForId(actionId);

  if (!action?.approvedCommand || action.approvedCommand.startsWith("/")) {
    return null;
  }

  const commandPath = path.resolve(automationRoot, action.approvedCommand);
  const approvedBackupBin = path.resolve(automationRoot, "backup", "bin");

  if (!commandPath.startsWith(`${approvedBackupBin}${path.sep}`)) {
    return null;
  }

  return {
    args: [...action.approvedArgs],
    commandPath,
  };
}

export async function executeBackupAgentAction(actionId: BackupActionId) {
  const action = backupActionForId(actionId);

  if (!action) {
    return {
      message: "Unknown backup action.",
      ok: false,
      status: 400,
    };
  }

  if (actionId === "refresh_status") {
    return {
      data: await loadBackupControlCenterData(),
      message: "Status refreshed.",
      ok: true,
      status: 200,
    };
  }

  if (action.requiresLocalAgent) {
    return {
      message: "Use the paired Mac Mini backup agent for setup, Keychain writes, backup runs, and restore tests. The web server never receives backup secrets or executes backup commands.",
      ok: false,
      status: 410,
    };
  }

  if (!localExecutionEnabled) {
    return {
      message: "No command ran. This runtime is read-only; enable the local Mac Mini agent before executing backup actions.",
      ok: false,
      status: 503,
    };
  }

  const { config } = await readBackupEnvConfig();

  if (actionId === "verify_credentials") {
    const credentialsReady = await checkKeychainCredentials(config);

    return {
      message: credentialsReady
        ? "Required Keychain items are present and readable by the local agent."
        : "One or more required Keychain items are missing.",
      ok: credentialsReady === true,
      status: credentialsReady === true ? 200 : 424,
    };
  }

  if (actionId === "verify_backblaze") {
    const offsite = evaluateOffsiteMode(config.offsiteMode);

    return {
      message: offsite.status === "ok"
        ? "Backblaze/off-site configuration is present in the local USA-86 config."
        : offsite.detail,
      ok: offsite.status === "ok",
      status: offsite.status === "ok" ? 200 : 424,
    };
  }

  const approvedScript = resolveApprovedScript(actionId);

  if (!approvedScript) {
    return {
      message: "This action is not mapped to an approved USA-86 script.",
      ok: false,
      status: 400,
    };
  }

  const result = await runProcess(approvedScript.commandPath, approvedScript.args, 20 * 60 * 1000);
  const ok = result.exitCode === 0 && !result.timedOut;

  return {
    message: ok
      ? `${action.label} completed. ${result.output}`
      : `${action.label} did not complete successfully. ${result.output}`,
    ok,
    status: ok ? 200 : 500,
  };
}
