/**
 * Job 4 — Backup trigger / integration.
 *
 * This job COORDINATES the existing backup framework under backup/. It does not
 * implement a second backup system, and it never performs a restore.
 *
 * HONESTY RULE: it must never report healthy when prerequisites are missing or
 * when the database dump or storage export did not actually complete. USA-86
 * remains authoritative for backup readiness; this job does not satisfy it.
 */

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { ERROR_CODES } from "../shared/errors.mjs";
import { createMutationGuard } from "../shared/config.mjs";
import { createLogger } from "../shared/logging.mjs";

export const BACKUP_STATUS = Object.freeze({
  READY: "ready",
  BLOCKED: "blocked",
  RUNNING: "running",
  COMPLETE: "complete",
  INCOMPLETE: "incomplete",
});

/**
 * Preflight. Reads only the PRESENCE of credentials, never their values, and
 * never returns or logs them.
 */
/**
 * Probe the macOS Keychain for PRESENCE of a secret. Never returns the value.
 * Returns false on any non-macOS platform or any failure — fail-closed.
 */
export function defaultKeychainProbe(service, account) {
  try {
    if (process.platform !== "darwin") return false;
    execFileSync("/usr/bin/security", ["find-generic-password", "-s", service, "-a", account], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

export function preflight({
  config,
  root = process.cwd(),
  env = process.env,
  fs = { existsSync, readFileSync },
  keychainLookup = {},
}) {
  const problems = [];
  const scriptPath = path.isAbsolute(config.backup.scriptPath)
    ? config.backup.scriptPath
    : path.join(root, config.backup.scriptPath);
  const envPath = path.isAbsolute(config.backup.envPath)
    ? config.backup.envPath
    : path.join(root, config.backup.envPath);

  if (!fs.existsSync(scriptPath)) {
    problems.push({ code: ERROR_CODES.BACKUP_SCRIPT_MISSING, detail: `backup script not found at ${scriptPath}` });
  }

  // Credential presence is derived from the env file's KEY NAMES plus the
  // process environment. Values are never read into the result.
  let declaredKeys = new Set();
  let offsiteModeFromEnvFile = null;
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      const [, key, rawValue] = m;
      const value = rawValue.trim().replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "");
      if (value !== "") declaredKeys.add(key);
      if (key === "OFFSITE_MODE") offsiteModeFromEnvFile = value;
    }
  }

  const has = (key) =>
    declaredKeys.has(key) || (typeof env[key] === "string" && env[key].trim() !== "");

  const declaredValue = (key) => {
    // Only used for non-secret config values such as OFFSITE_MODE.
    if (typeof env[key] === "string" && env[key].trim() !== "") return env[key].trim();
    return null;
  };

  // The real framework stores secrets in the macOS Keychain, not in env vars.
  // backup/config/backup.env declares only the SERVICE NAMES. We therefore
  // check Keychain PRESENCE (never the value) when a service name is declared,
  // and fall back to env vars for non-macOS or overridden setups.
  const keychainAccount = keychainLookup.account ?? "usam-backup";
  const probeKeychain = keychainLookup.probe ?? defaultKeychainProbe;

  const dbService = declaredKeys.has("KEYCHAIN_DB_PASSWORD_SERVICE")
    ? keychainLookup.dbService ?? "usam-supabase-db-password"
    : null;
  const gpgService = declaredKeys.has("KEYCHAIN_GPG_PASSPHRASE_SERVICE")
    ? keychainLookup.gpgService ?? "usam-backup-gpg-passphrase"
    : null;

  const dbConfigured =
    has("SUPABASE_DB_PASSWORD") || has("PGPASSWORD") || (dbService ? probeKeychain(dbService, keychainAccount) : false);
  const passphraseConfigured =
    has("USAM_BACKUP_PASSPHRASE") ||
    has("BACKUP_PASSPHRASE") ||
    (gpgService ? probeKeychain(gpgService, keychainAccount) : false);

  if (!dbConfigured) {
    problems.push({
      code: ERROR_CODES.BACKUP_DB_PASSWORD_MISSING,
      detail: dbService
        ? `database password not found in Keychain (service ${dbService}, account ${keychainAccount})`
        : "database password is not configured",
    });
  }
  if (!passphraseConfigured) {
    problems.push({
      code: ERROR_CODES.BACKUP_PASSPHRASE_MISSING,
      detail: gpgService
        ? `encryption passphrase not found in Keychain (service ${gpgService}, account ${keychainAccount})`
        : "encryption passphrase is not configured",
    });
  }

  // OFFSITE_MODE="none" is an explicit, deliberate "not configured" in this
  // framework — backup.env says the gap should be loud, not silent.
  const offsiteMode = declaredValue("OFFSITE_MODE") ?? offsiteModeFromEnvFile;
  const offsiteConfigured =
    has("USAM_BACKUP_OFFSITE_DEST") ||
    has("BACKUP_OFFSITE_DEST") ||
    (offsiteMode !== null && offsiteMode !== "none");
  if (!offsiteConfigured) {
    problems.push({
      code: ERROR_CODES.BACKUP_OFFSITE_MISSING,
      detail: offsiteMode === "none" ? 'OFFSITE_MODE is "none" — offsite backup is explicitly not configured' : "offsite destination is not configured",
    });
  }

  const lockPath = config.backup.lockPath;
  const locked = fs.existsSync(lockPath);
  if (locked) {
    problems.push({ code: ERROR_CODES.BACKUP_ALREADY_RUNNING, detail: `lock present at ${lockPath}` });
  }

  return {
    status: problems.length === 0 ? BACKUP_STATUS.READY : BACKUP_STATUS.BLOCKED,
    ready: problems.length === 0,
    problems,
    scriptPath,
    // Explicitly no values, only names that were found to be non-empty.
    configuredKeys: [...declaredKeys].sort(),
  };
}

/**
 * Interpret the result of the backup script. A non-zero exit, or output that
 * does not evidence BOTH a database dump and a storage export, is INCOMPLETE —
 * never "healthy".
 */
export function interpretResult(result) {
  const stdout = result?.stdout ?? "";
  const exitCode = result?.exitCode ?? result?.code ?? 0;

  if (exitCode !== 0) {
    return {
      status: BACKUP_STATUS.INCOMPLETE,
      healthy: false,
      code: ERROR_CODES.BACKUP_INCOMPLETE,
      reason: `backup script exited ${exitCode}`,
    };
  }
  const dbDone = /(database (dump|backup) (complete|ok|succeeded)|pg_dump.*(complete|ok)|dump_complete)/i.test(stdout);
  const storageDone = /(storage (export|backup) (complete|ok|succeeded)|storage_complete)/i.test(stdout);

  if (!dbDone || !storageDone) {
    const missing = [!dbDone && "database dump", !storageDone && "storage export"].filter(Boolean);
    return {
      status: BACKUP_STATUS.INCOMPLETE,
      healthy: false,
      code: ERROR_CODES.BACKUP_INCOMPLETE,
      reason: `exit 0 but no evidence of: ${missing.join(" and ")}`,
    };
  }
  return { status: BACKUP_STATUS.COMPLETE, healthy: true };
}

export async function runBackup({
  config,
  root = process.cwd(),
  env = process.env,
  exec = null,
  fs = { existsSync, readFileSync },
  keychainLookup = {},
  logger = createLogger({ job: "backup" }),
}) {
  const guard = createMutationGuard({ dryRun: config.dryRun });
  const pre = preflight({ config, root, env, fs, keychainLookup });

  logger.info("backup_preflight", {
    status: pre.status,
    ready: pre.ready,
    problems: pre.problems.map((p) => p.code),
    configuredKeys: pre.configuredKeys,
  });

  if (!pre.ready) {
    return { ...pre, healthy: false, exitStatus: 1, plannedMutations: guard.planned, dryRun: config.dryRun };
  }

  const outcome = await guard.perform(
    `run ${pre.scriptPath}`,
    () => exec(pre.scriptPath),
    { type: "backup_run", script: pre.scriptPath },
  );

  if (!outcome.performed) {
    return {
      ...pre,
      status: BACKUP_STATUS.READY,
      healthy: false,
      dryRun: true,
      exitStatus: 0,
      note: "dry-run — preflight passed, backup NOT executed",
      plannedMutations: guard.planned,
    };
  }

  const interpreted = interpretResult(outcome.result);
  logger.info("backup_result", { status: interpreted.status, healthy: interpreted.healthy });
  return {
    ...pre,
    ...interpreted,
    exitStatus: interpreted.healthy ? 0 : 1,
    plannedMutations: guard.planned,
    dryRun: false,
  };
}
