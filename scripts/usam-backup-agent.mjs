#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes, randomInt } from "node:crypto";
import { readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.USAM_BACKUP_AGENT_PORT ?? "47691", 10);
const automationRoot = process.env.USAM_AUTOMATION_ROOT ?? path.join(os.homedir(), "USAM-Automation");
const backupHome = process.env.USAM_BACKUP_HOME ?? path.join(automationRoot, "backup");
const backupRoot = process.env.USAM_BACKUP_ROOT ?? path.join(os.homedir(), "USAM-Backups");
const backupEnvPath = path.join(backupHome, "config", "backup.env");
const backupLogDir = path.join(backupRoot, "logs");
const agentVersion = "usa-91-keychain-agent-v1";
const maxJsonBytes = 24 * 1024;
const sessionMs = 8 * 60 * 60 * 1000;
const pairingMs = 5 * 60 * 1000;

const defaultConfig = {
  alertStateFile: path.join(backupLogDir, "LAST_RUN_STATUS"),
  dbArtifactDir: path.join(backupRoot, "artifacts", "db"),
  gpgBin: "/opt/homebrew/bin/gpg",
  keychainAccount: "usam-backup",
  keychainAlertWebhookService: "usam-backup-alert-webhook",
  keychainB2ApplicationKeyService: "usam-backup-b2-application-key",
  keychainB2KeyIdService: "usam-backup-b2-key-id",
  keychainDbPasswordService: "usam-supabase-db-password",
  keychainGpgPassphraseService: "usam-backup-gpg-passphrase",
  offsiteMode: "none",
  pgBin: "/opt/homebrew/opt/postgresql@17/bin",
  retentionDailyDays: 14,
  retentionMonthlyDays: 185,
  retentionWeeklyDays: 56,
  rcloneBin: "/opt/homebrew/bin/rclone",
  storageArtifactDir: path.join(backupRoot, "artifacts", "storage"),
  supabaseDbHost: "aws-1-us-east-1.pooler.supabase.com",
  supabaseDbName: "postgres",
  supabaseDbPort: "5432",
  supabaseDbUser: "postgres.dbupuphezeqkiolprrlg",
};

let pendingPairing = null;
const sessions = new Map();

const endpoints = new Set([
  "GET /v1/health",
  "POST /v1/pair/start",
  "POST /v1/pair/complete",
  "GET /v1/status",
  "POST /v1/secrets/database",
  "POST /v1/secrets/encryption",
  "POST /v1/backblaze",
  "POST /v1/validate/database",
  "POST /v1/validate/backblaze",
  "POST /v1/backup/first",
  "POST /v1/restore-test",
  "POST /v1/self-test",
]);

function isAllowedOrigin(origin) {
  if (!origin) {
    return false;
  }

  try {
    const url = new URL(origin);

    if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) {
      return true;
    }

    if (url.protocol !== "https:") {
      return false;
    }

    return url.hostname === "usamissionaries.org"
      || url.hostname === "www.usamissionaries.org"
      || (url.hostname.endsWith(".vercel.app") && url.hostname.startsWith("usam-website"));
  } catch {
    return false;
  }
}

function corsHeaders(origin) {
  const headers = {
    "Cache-Control": "private, no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };

  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-USAM-Backup-Agent";
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Max-Age"] = "600";
  }

  return headers;
}

function sendJson(response, origin, status, payload) {
  response.writeHead(status, corsHeaders(origin));
  response.end(JSON.stringify(payload));
}

function redact(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/(bearer\s+)[a-z0-9._-]+/gi, "$1[redacted]")
    .replace(/(password|passphrase|secret|token|key)(\s*[=:]\s*)[^\s]+/gi, "$1$2[redacted]")
    .replace(/sk-[a-z0-9_-]+/gi, "[redacted]")
    .slice(0, 4000);
}

function cleanText(value, maxLength = 160) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

function isSafeName(value) {
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(value);
}

function isSafeBucket(value) {
  return /^[a-z0-9][a-z0-9.-]{1,62}[a-z0-9]$/.test(value);
}

function isSafePrefix(value) {
  return value === "" || /^[a-zA-Z0-9._/@-]{1,180}$/.test(value);
}

function parseEnvValue(source, key, fallback = "") {
  const match = new RegExp(`^${key}=("?)([^"\\n#]+)\\1`, "m").exec(source);
  return match?.[2]?.trim() ?? fallback;
}

function parseEnvNumber(source, key, fallback) {
  const value = Number.parseInt(parseEnvValue(source, key), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function readConfig() {
  try {
    const source = await readFile(backupEnvPath, "utf8");

    return {
      alertStateFile: parseEnvValue(source, "ALERT_STATE_FILE", defaultConfig.alertStateFile).replace("${BACKUP_ROOT}", backupRoot),
      dbArtifactDir: parseEnvValue(source, "DB_ARTIFACT_DIR", defaultConfig.dbArtifactDir).replace("${BACKUP_ROOT}", backupRoot),
      envSource: source,
      gpgBin: parseEnvValue(source, "GPG_BIN", defaultConfig.gpgBin),
      keychainAccount: parseEnvValue(source, "KEYCHAIN_ACCOUNT", defaultConfig.keychainAccount),
      keychainAlertWebhookService: parseEnvValue(source, "KEYCHAIN_ALERT_WEBHOOK_SERVICE", defaultConfig.keychainAlertWebhookService),
      keychainB2ApplicationKeyService: parseEnvValue(source, "KEYCHAIN_B2_APPLICATION_KEY_SERVICE", defaultConfig.keychainB2ApplicationKeyService),
      keychainB2KeyIdService: parseEnvValue(source, "KEYCHAIN_B2_KEY_ID_SERVICE", defaultConfig.keychainB2KeyIdService),
      keychainDbPasswordService: parseEnvValue(source, "KEYCHAIN_DB_PASSWORD_SERVICE", defaultConfig.keychainDbPasswordService),
      keychainGpgPassphraseService: parseEnvValue(source, "KEYCHAIN_GPG_PASSPHRASE_SERVICE", defaultConfig.keychainGpgPassphraseService),
      offsiteMode: parseEnvValue(source, "OFFSITE_MODE", defaultConfig.offsiteMode),
      pgBin: parseEnvValue(source, "PG_BIN", defaultConfig.pgBin),
      retentionDailyDays: parseEnvNumber(source, "RETENTION_DAILY_DAYS", defaultConfig.retentionDailyDays),
      retentionMonthlyDays: parseEnvNumber(source, "RETENTION_MONTHLY_DAYS", defaultConfig.retentionMonthlyDays),
      retentionWeeklyDays: parseEnvNumber(source, "RETENTION_WEEKLY_DAYS", defaultConfig.retentionWeeklyDays),
      rcloneBin: parseEnvValue(source, "RCLONE_BIN", defaultConfig.rcloneBin),
      storageArtifactDir: parseEnvValue(source, "STORAGE_ARTIFACT_DIR", defaultConfig.storageArtifactDir).replace("${BACKUP_ROOT}", backupRoot),
      supabaseDbHost: parseEnvValue(source, "SUPABASE_DB_HOST", defaultConfig.supabaseDbHost),
      supabaseDbName: parseEnvValue(source, "SUPABASE_DB_NAME", defaultConfig.supabaseDbName),
      supabaseDbPort: parseEnvValue(source, "SUPABASE_DB_PORT", defaultConfig.supabaseDbPort),
      supabaseDbUser: parseEnvValue(source, "SUPABASE_DB_USER", defaultConfig.supabaseDbUser),
    };
  } catch {
    return {
      ...defaultConfig,
      alertStateFile: defaultConfig.alertStateFile,
      envSource: "",
    };
  }
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? backupHome,
      env: options.env ?? process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks = [];
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      child.kill("SIGTERM");
      resolve({ exitCode: null, output: "Timed out.", timedOut: true });
    }, options.timeoutMs ?? 120000);

    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => chunks.push(chunk));
    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve({ exitCode: null, output: redact(error.message), timedOut: false });
    });
    child.on("close", (exitCode) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve({ exitCode, output: redact(Buffer.concat(chunks).toString("utf8")), timedOut: false });
    });
  });
}

async function keychainGet(config, service) {
  const result = await runProcess("/usr/bin/security", [
    "find-generic-password",
    "-s",
    service,
    "-a",
    config.keychainAccount,
    "-w",
  ], { timeoutMs: 15000 });

  return result.exitCode === 0 ? result.output.trim() : "";
}

async function keychainHas(config, service) {
  const result = await runProcess("/usr/bin/security", [
    "find-generic-password",
    "-s",
    service,
    "-a",
    config.keychainAccount,
  ], { timeoutMs: 15000 });

  return result.exitCode === 0;
}

async function keychainSet(config, service, value, label) {
  if (!value) {
    return { ok: false, message: "A value is required." };
  }

  const result = await runProcess("/usr/bin/security", [
    "add-generic-password",
    "-s",
    service,
    "-a",
    config.keychainAccount,
    "-w",
    value,
    "-U",
    "-T",
    "/usr/bin/security",
    "-l",
    `USAM backup: ${label}`,
  ], { timeoutMs: 15000 });

  return result.exitCode === 0
    ? { ok: true, message: `${label} stored in macOS Keychain.` }
    : { ok: false, message: `${label} could not be stored in Keychain.` };
}

async function readJsonRequest(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;

    request.on("data", (chunk) => {
      bytes += chunk.length;

      if (bytes > maxJsonBytes) {
        reject(new Error("Payload too large."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });
    request.on("error", reject);
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });
  });
}

function tokenFromRequest(request) {
  const header = request.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] ?? "";
}

function requireSession(request) {
  const token = tokenFromRequest(request);
  const session = sessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }

  session.expiresAt = Date.now() + sessionMs;
  return true;
}

function actionDefinitions() {
  return [
    ["refresh_status", "Refresh Status", true, false, "blue"],
    ["configure_database_credential", "Save DB Credential", false, true, "green"],
    ["configure_encryption_passphrase", "Save Encryption", false, true, "green"],
    ["configure_backblaze", "Configure Backblaze", false, true, "green"],
    ["verify_credentials", "Verify Keychain", true, true, "blue"],
    ["verify_backblaze", "Verify Backblaze", true, true, "blue"],
    ["run_backup_now", "Run Backup Now", false, true, "green"],
    ["run_restore_test", "Run Restore Test", false, true, "amber"],
    ["run_self_test", "Run Self-Test", false, true, "amber"],
  ].map(([id, label, readOnly, requiresLocalAgent, tone]) => ({
    approvedArgs: [],
    approvedCommand: id === "run_backup_now"
      ? "backup/bin/usam-backup.sh"
      : id === "run_restore_test"
        ? "backup/bin/usam-restore.sh --latest"
        : id === "run_self_test"
          ? "backup/bin/usam-backup-selftest.sh"
          : id.startsWith("configure_") || id === "verify_credentials"
            ? "/usr/bin/security"
            : null,
    id,
    label,
    readOnly,
    requiresLocalAgent,
    tone,
  }));
}

function parseRunStatus(value) {
  const text = redact(value ?? "").trim();
  const match = /^(OK|FAILED)\s+([0-9-]{10}\s+[0-9:]{8})(?:\s+::\s+(.+))?$/i.exec(text);

  if (!match) {
    return {
      detail: text || "No backup status file is available.",
      finishedAt: null,
      state: "unknown",
    };
  }

  const date = new Date(match[2].replace(" ", "T"));

  return {
    detail: match[3] || (match[1].toUpperCase() === "OK" ? "Backup completed." : "Backup failed."),
    finishedAt: Number.isNaN(date.getTime()) ? null : date.toISOString(),
    state: match[1].toUpperCase() === "OK" ? "ok" : "failed",
  };
}

async function artifactBytes(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    let total = 0;

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const item = await stat(path.join(directory, entry.name));
      total += item.size;
    }

    return total;
  } catch {
    return null;
  }
}

async function diskState() {
  const result = await runProcess("/bin/df", ["-k", backupRoot], { timeoutMs: 15000 });
  const line = result.output.split(/\n/).find((candidate) => candidate.includes("/")) ?? "";
  const columns = line.trim().split(/\s+/);
  const totalKb = Number.parseInt(columns[1] ?? "", 10);
  const freeKb = Number.parseInt(columns[3] ?? "", 10);

  if (!Number.isFinite(totalKb) || !Number.isFinite(freeKb)) {
    return {
      detail: "Disk capacity is unavailable.",
      freeBytes: null,
      status: "unknown",
      totalBytes: null,
    };
  }

  const freeBytes = freeKb * 1024;
  const totalBytes = totalKb * 1024;
  const freeRatio = freeBytes / totalBytes;

  if (freeBytes < 50 * 1024 ** 3 || freeRatio < 0.1) {
    return {
      detail: "Free disk space is inside the critical band.",
      freeBytes,
      status: "critical",
      totalBytes,
    };
  }

  if (freeBytes < 100 * 1024 ** 3 || freeRatio < 0.2) {
    return {
      detail: "Free disk space is inside the warning band.",
      freeBytes,
      status: "warning",
      totalBytes,
    };
  }

  return {
    detail: "Disk capacity is healthy.",
    freeBytes,
    status: "ok",
    totalBytes,
  };
}

function formatBytes(value) {
  if (value === null || !Number.isFinite(value)) {
    return "Unavailable";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let current = value;
  let unitIndex = 0;

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }

  return `${current.toLocaleString("en-US", { maximumFractionDigits: current >= 10 ? 0 : 1 })} ${units[unitIndex]}`;
}

function offsiteStatus(mode) {
  if (!mode || mode === "none") {
    return {
      detail: "Backblaze/off-site destination is not configured.",
      mode: "none",
      status: "warning",
    };
  }

  if (mode.startsWith("rclone:")) {
    return {
      detail: "Backblaze B2 is configured through a Keychain-backed rclone environment.",
      mode: "Backblaze B2 via rclone",
      status: "ok",
    };
  }

  return {
    detail: "Off-site mode is configured.",
    mode,
    status: "ok",
  };
}

function codeProtectionSignals() {
  return [
    {
      detail: "The local backup agent has no repository mutation endpoint.",
      label: "Repository Safety",
      status: "ok",
    },
    {
      detail: "Backups still do not include Supabase JWT secrets, API keys, Edge Functions, or Vercel settings.",
      label: "Platform Gaps",
      status: "warning",
    },
    {
      detail: "Restore tests call only the USA-86 local restore script.",
      label: "Restore Boundary",
      status: "ok",
    },
  ];
}

async function statusData() {
  const config = await readConfig();
  const [
    dbReady,
    gpgReady,
    b2KeyReady,
    b2SecretReady,
    dbBytes,
    storageBytes,
    disk,
  ] = await Promise.all([
    keychainHas(config, config.keychainDbPasswordService),
    keychainHas(config, config.keychainGpgPassphraseService),
    keychainHas(config, config.keychainB2KeyIdService),
    keychainHas(config, config.keychainB2ApplicationKeyService),
    artifactBytes(config.dbArtifactDir),
    artifactBytes(config.storageArtifactDir),
    diskState(),
  ]);
  const lastRun = parseRunStatus(await readFile(config.alertStateFile, "utf8").catch(() => ""));
  const offsite = offsiteStatus(config.offsiteMode);
  const credentialsReady = dbReady && gpgReady;
  const b2Ready = b2KeyReady && b2SecretReady && offsite.status === "ok";
  const signals = codeProtectionSignals();

  return {
    actions: actionDefinitions(),
    agent: {
      detail: "Paired Mac Mini agent is connected. Keychain writes and fixed USA-86 backup actions are available.",
      keychainWritesEnabled: true,
      localExecutionEnabled: true,
      mode: "local_ready",
      requiresPairing: false,
      status: "ok",
    },
    codeProtection: {
      detail: "Read-only code protection status. The local backup agent cannot mutate repositories.",
      signals,
      status: signals.some((signal) => signal.status === "critical") ? "critical" : signals.some((signal) => signal.status === "warning") ? "warning" : "ok",
    },
    disk,
    generatedAt: new Date().toISOString(),
    history: [
      {
        at: lastRun.finishedAt,
        detail: lastRun.detail,
        label: "LAST_RUN_STATUS",
        status: lastRun.state === "ok" ? "ok" : lastRun.state === "failed" ? "critical" : "unknown",
      },
    ],
    lastRun,
    metrics: [
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
        detail: `Database artifacts: ${formatBytes(dbBytes)}. Storage artifacts: ${formatBytes(storageBytes)}.`,
        label: "Local Artifacts",
        status: dbBytes || storageBytes ? "ok" : "unknown",
        value: formatBytes((dbBytes ?? 0) + (storageBytes ?? 0)),
      },
      {
        detail: disk.detail,
        label: "Disk Capacity",
        status: disk.status,
        value: formatBytes(disk.freeBytes),
      },
    ],
    offsite,
    retention: {
      dailyDays: config.retentionDailyDays,
      detail: `Daily ${config.retentionDailyDays}d, weekly ${config.retentionWeeklyDays}d, monthly ${config.retentionMonthlyDays}d.`,
      monthlyDays: config.retentionMonthlyDays,
      status: "ok",
      weeklyDays: config.retentionWeeklyDays,
    },
    safeguards: [
      "Secrets are sent only to this loopback Mac Mini agent and stored in macOS Keychain.",
      "This agent exposes fixed backup endpoints only; there is no shell or arbitrary command endpoint.",
      "Backblaze B2 keys are loaded from Keychain into rclone environment variables only for validation or backup runs.",
      "Restore tests use the USA-86 local restore script and cannot target production.",
    ],
    wizard: [
      { detail: "Paired browser session is active.", id: "agent", label: "Mac Mini Agent", status: "ok" },
      { detail: "Database password is stored in Keychain after validation.", id: "credentials", label: "Database Credential", status: dbReady ? "ok" : "warning" },
      { detail: "Encryption passphrase is stored in Keychain.", id: "encryption", label: "Encryption Passphrase", status: gpgReady ? "ok" : "warning" },
      { detail: "Backblaze keys are in Keychain and OFFSITE_MODE is non-secret.", id: "backblaze", label: "Backblaze Destination", status: b2Ready ? "ok" : "warning" },
      { detail: "Restore tests use isolated local Postgres.", id: "restore", label: "Restore-Test Proof", status: lastRun.state === "failed" ? "warning" : "unknown" },
      { detail: "Failures write LAST_RUN_STATUS and BACKUP_FAILING.", id: "alerts", label: "Visible Alerts", status: "ok" },
    ],
  };
}

async function validateDatabaseCredential(config, password) {
  if (!password) {
    return { ok: false, message: "Database password is required." };
  }

  const result = await runProcess(path.join(config.pgBin, "psql"), [
    `postgresql://${config.supabaseDbUser}@${config.supabaseDbHost}:${config.supabaseDbPort}/${config.supabaseDbName}`,
    "-tAc",
    "select 1",
  ], {
    env: {
      ...process.env,
      PGCONNECT_TIMEOUT: "20",
      PGPASSWORD: password,
    },
    timeoutMs: 45000,
  });

  return result.exitCode === 0 && result.output.includes("1")
    ? { ok: true, message: "Database credential validated." }
    : { ok: false, message: "Database credential validation failed." };
}

function offsiteTarget({ bucket, prefix, remoteName }) {
  const cleanPrefix = prefix ? prefix.replace(/^\/+|\/+$/g, "") : "";
  return `rclone:${remoteName}:${bucket}${cleanPrefix ? `/${cleanPrefix}` : ""}`;
}

function rcloneEnv({ applicationKey, keyId, remoteName }) {
  const envKey = remoteName.toUpperCase().replace(/[^A-Z0-9]/g, "_");

  return {
    [`RCLONE_CONFIG_${envKey}_ACCOUNT`]: keyId,
    [`RCLONE_CONFIG_${envKey}_KEY`]: applicationKey,
    [`RCLONE_CONFIG_${envKey}_TYPE`]: "b2",
  };
}

async function validateBackblazeConfig(config, payload) {
  const remoteName = cleanText(payload.remoteName || "usam-b2", 40).toLowerCase();
  const bucket = cleanText(payload.bucket, 64).toLowerCase();
  const prefix = cleanText(payload.prefix ?? "usam-supabase", 180);
  const keyId = cleanText(payload.keyId, 120);
  const applicationKey = cleanText(payload.applicationKey, 240);

  if (!isSafeName(remoteName) || !isSafeBucket(bucket) || !isSafePrefix(prefix) || !keyId || !applicationKey) {
    return { ok: false, message: "Backblaze remote, bucket, prefix, key ID, and application key must be valid.", values: null };
  }

  const result = await runProcess(config.rcloneBin, [
    "lsd",
    `${remoteName}:`,
    "--no-config",
  ], {
    env: {
      ...process.env,
      ...rcloneEnv({ applicationKey, keyId, remoteName }),
    },
    timeoutMs: 45000,
  });

  if (result.exitCode !== 0) {
    return { ok: false, message: "Backblaze B2 credential validation failed.", values: null };
  }

  return {
    ok: true,
    message: "Backblaze B2 credentials validated.",
    values: {
      applicationKey,
      keyId,
      mode: offsiteTarget({ bucket, prefix, remoteName }),
      remoteName,
    },
  };
}

async function setOffsiteMode(config, mode) {
  const source = config.envSource || "";
  const updated = source.includes("OFFSITE_MODE=")
    ? source.replace(/^OFFSITE_MODE=.*$/m, `OFFSITE_MODE="${mode}"`)
    : `${source.trimEnd()}\nOFFSITE_MODE="${mode}"\n`;
  const tempPath = `${backupEnvPath}.${process.pid}.tmp`;

  await writeFile(tempPath, updated, { mode: 0o600 });
  await rename(tempPath, backupEnvPath);
}

async function b2RuntimeEnv(config) {
  if (!config.offsiteMode.startsWith("rclone:")) {
    return {};
  }

  const afterPrefix = config.offsiteMode.slice("rclone:".length);
  const remoteName = afterPrefix.split(":")[0];
  const [keyId, applicationKey] = await Promise.all([
    keychainGet(config, config.keychainB2KeyIdService),
    keychainGet(config, config.keychainB2ApplicationKeyService),
  ]);

  if (!remoteName || !keyId || !applicationKey) {
    return {};
  }

  return rcloneEnv({ applicationKey, keyId, remoteName });
}

async function runBackupScript(command, args, timeoutMs) {
  const config = await readConfig();
  const env = {
    ...process.env,
    ...(await b2RuntimeEnv(config)),
  };
  const result = await runProcess(command, args, { cwd: backupHome, env, timeoutMs });

  return result.exitCode === 0
    ? { ok: true, message: result.output || "Action completed." }
    : { ok: false, message: result.output || "Action failed." };
}

async function routeRequest(request, response) {
  const origin = request.headers.origin ?? "";

  if (request.method === "OPTIONS") {
    response.writeHead(isAllowedOrigin(origin) ? 204 : 403, corsHeaders(origin));
    response.end();
    return;
  }

  if (!isAllowedOrigin(origin)) {
    sendJson(response, origin, 403, { error: "Origin is not allowed." });
    return;
  }

  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  const key = `${request.method} ${url.pathname}`;

  if (!endpoints.has(key)) {
    sendJson(response, origin, 404, { error: "Backup agent endpoint was not found." });
    return;
  }

  if (key === "GET /v1/health") {
    sendJson(response, origin, 200, {
      agent: "usam-backup-agent",
      ok: true,
      pairingRequired: true,
      version: agentVersion,
    });
    return;
  }

  if (key === "POST /v1/pair/start") {
    pendingPairing = {
      code: String(randomInt(100000, 999999)),
      expiresAt: Date.now() + pairingMs,
    };

    runProcess("/usr/bin/osascript", [
      "-e",
      `display dialog "USA Missionaries backup dashboard pairing code: ${pendingPairing.code}" with title "USAM Backup Agent" buttons {"OK"} default button "OK"`,
    ], { timeoutMs: 60000 }).catch(() => undefined);

    sendJson(response, origin, 200, {
      expiresAt: new Date(pendingPairing.expiresAt).toISOString(),
      message: "Pairing code displayed on the Mac Mini.",
      ok: true,
    });
    return;
  }

  if (key === "POST /v1/pair/complete") {
    const body = await readJsonRequest(request);
    const code = cleanText(body.code, 12);

    if (!pendingPairing || pendingPairing.expiresAt < Date.now() || code !== pendingPairing.code) {
      sendJson(response, origin, 401, { error: "Pairing code was invalid or expired.", ok: false });
      return;
    }

    pendingPairing = null;
    const token = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + sessionMs;

    sessions.set(token, { expiresAt });
    sendJson(response, origin, 200, {
      expiresAt: new Date(expiresAt).toISOString(),
      ok: true,
      sessionToken: token,
    });
    return;
  }

  if (!requireSession(request)) {
    sendJson(response, origin, 401, { error: "Pair with the Mac Mini backup agent first.", ok: false });
    return;
  }

  if (key === "GET /v1/status") {
    sendJson(response, origin, 200, { data: await statusData(), ok: true });
    return;
  }

  if (key === "POST /v1/secrets/database") {
    const body = await readJsonRequest(request);
    const password = typeof body.password === "string" ? body.password : "";
    const config = await readConfig();
    const validation = await validateDatabaseCredential(config, password);

    if (!validation.ok) {
      sendJson(response, origin, 424, validation);
      return;
    }

    const stored = await keychainSet(config, config.keychainDbPasswordService, password, "Supabase database password");
    sendJson(response, origin, stored.ok ? 200 : 500, stored);
    return;
  }

  if (key === "POST /v1/secrets/encryption") {
    const body = await readJsonRequest(request);
    const passphrase = typeof body.passphrase === "string" ? body.passphrase : "";
    const confirm = typeof body.confirm === "string" ? body.confirm : "";
    const config = await readConfig();

    if (passphrase.length < 25 || passphrase !== confirm) {
      sendJson(response, origin, 400, { message: "Passphrase must be 25+ characters and match confirmation.", ok: false });
      return;
    }

    const stored = await keychainSet(config, config.keychainGpgPassphraseService, passphrase, "backup encryption passphrase");
    sendJson(response, origin, stored.ok ? 200 : 500, stored);
    return;
  }

  if (key === "POST /v1/backblaze") {
    const body = await readJsonRequest(request);
    const config = await readConfig();
    const validation = await validateBackblazeConfig(config, body);

    if (!validation.ok || !validation.values) {
      sendJson(response, origin, 424, validation);
      return;
    }

    const storedKeyId = await keychainSet(config, config.keychainB2KeyIdService, validation.values.keyId, "Backblaze B2 key ID");
    const storedApplicationKey = storedKeyId.ok
      ? await keychainSet(config, config.keychainB2ApplicationKeyService, validation.values.applicationKey, "Backblaze B2 application key")
      : { ok: false, message: "Backblaze key ID was not stored." };

    if (!storedKeyId.ok || !storedApplicationKey.ok) {
      sendJson(response, origin, 500, { message: "Backblaze credentials could not be stored in Keychain.", ok: false });
      return;
    }

    await setOffsiteMode(config, validation.values.mode);
    sendJson(response, origin, 200, { message: "Backblaze B2 configured. Secrets are in Keychain; backup.env contains only OFFSITE_MODE.", ok: true });
    return;
  }

  if (key === "POST /v1/validate/database") {
    const config = await readConfig();
    const password = await keychainGet(config, config.keychainDbPasswordService);
    const validation = await validateDatabaseCredential(config, password);
    sendJson(response, origin, validation.ok ? 200 : 424, validation);
    return;
  }

  if (key === "POST /v1/validate/backblaze") {
    const config = await readConfig();
    if (!config.offsiteMode.startsWith("rclone:")) {
      sendJson(response, origin, 424, {
        message: "Backblaze B2 is not configured yet.",
        ok: false,
      });
      return;
    }

    const remoteName = config.offsiteMode.slice("rclone:".length).split(":")[0];

    if (!remoteName) {
      sendJson(response, origin, 424, {
        message: "Backblaze B2 remote name is missing.",
        ok: false,
      });
      return;
    }

    const result = await runProcess(config.rcloneBin, ["lsd", `${remoteName}:`, "--no-config"], {
      env: {
        ...process.env,
        ...(await b2RuntimeEnv(config)),
      },
      timeoutMs: 45000,
    });
    sendJson(response, origin, result.exitCode === 0 ? 200 : 424, {
      message: result.exitCode === 0 ? "Backblaze B2 connection validated." : "Backblaze B2 validation failed.",
      ok: result.exitCode === 0,
    });
    return;
  }

  if (key === "POST /v1/backup/first") {
    const result = await runBackupScript(path.join(backupHome, "bin", "usam-backup.sh"), [], 30 * 60 * 1000);
    sendJson(response, origin, result.ok ? 200 : 500, result);
    return;
  }

  if (key === "POST /v1/restore-test") {
    const result = await runBackupScript(path.join(backupHome, "bin", "usam-restore.sh"), ["--latest"], 20 * 60 * 1000);
    sendJson(response, origin, result.ok ? 200 : 500, result);
    return;
  }

  if (key === "POST /v1/self-test") {
    const result = await runBackupScript(path.join(backupHome, "bin", "usam-backup-selftest.sh"), [], 20 * 60 * 1000);
    sendJson(response, origin, result.ok ? 200 : 500, result);
  }
}

const server = createServer((request, response) => {
  routeRequest(request, response).catch((error) => {
    sendJson(response, request.headers.origin ?? "", 500, {
      error: redact(error instanceof Error ? error.message : "Backup agent request failed."),
      ok: false,
    });
  });
});

server.listen(port, host, () => {
  console.log(`USAM backup agent ${agentVersion} listening on http://${host}:${port}`);
});
