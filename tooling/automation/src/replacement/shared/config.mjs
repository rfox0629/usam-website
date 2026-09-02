/**
 * Configuration schema for the minimal automation replacement.
 *
 * Fail-closed: an unknown, missing, or malformed field is an error, never a
 * silently-applied default. Dry-run is the DEFAULT; mutation must be requested.
 */

import { readFileSync, existsSync } from "node:fs";
import { AutomationError, ERROR_CODES } from "./errors.mjs";

export const DEFAULT_CONFIG = Object.freeze({
  dryRun: true,
  linear: {
    apiUrl: "https://api.linear.app/graphql",
    teamKey: "USA",
    pollFirst: 250,
    readyStateName: "Ready",
    inProgressStateName: "In Progress",
    founderReviewStateName: "Founder Review",
    terminalStateNames: ["Done", "Canceled", "Duplicate"],
    applicationLabelGroup: "Application",
    runnerLabelGroup: "Runner",
  },
  limits: {
    perRunnerWip: 2,
    founderReviewCap: 7,
  },
  runners: {
    Claude: { command: "claude", args: [] },
    Codex: { command: "codex", args: [] },
  },
  worktrees: {
    allowlistRoots: ["/Users/ryanfox/USAM-Worktrees"],
    protectedPaths: [
      "/Users/ryanfox/Code",
      "/Users/ryanfox/USAM-Releases",
    ],
  },
  backup: {
    scriptPath: "backup/bin/usam-backup.sh",
    envPath: "backup/config/backup.env",
    lockPath: "/tmp/usam-backup.lock",
  },
  registryPath: "config/repository-registry.json",
});

const REQUIRED_TOP = ["linear", "limits", "runners", "worktrees", "backup", "registryPath"];

function deepMerge(base, override) {
  if (override === undefined) return base;
  if (Array.isArray(base) || Array.isArray(override)) return override ?? base;
  if (typeof base !== "object" || base === null) return override ?? base;
  if (typeof override !== "object" || override === null) return override ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) out[k] = deepMerge(base[k], v);
  return out;
}

export function validateConfig(cfg) {
  for (const key of REQUIRED_TOP) {
    if (!(key in cfg)) {
      throw new AutomationError(ERROR_CODES.CONFIG_INVALID_FIELD, `config is missing required field "${key}"`);
    }
  }
  const { limits, worktrees } = cfg;
  if (!Number.isInteger(limits.perRunnerWip) || limits.perRunnerWip < 1) {
    throw new AutomationError(ERROR_CODES.CONFIG_INVALID_FIELD, "limits.perRunnerWip must be a positive integer");
  }
  if (!Number.isInteger(limits.founderReviewCap) || limits.founderReviewCap < 1) {
    throw new AutomationError(ERROR_CODES.CONFIG_INVALID_FIELD, "limits.founderReviewCap must be a positive integer");
  }
  if (!Array.isArray(worktrees.allowlistRoots) || worktrees.allowlistRoots.length === 0) {
    throw new AutomationError(
      ERROR_CODES.CONFIG_INVALID_FIELD,
      "worktrees.allowlistRoots must be a non-empty array — the janitor refuses to run without an explicit allowlist",
    );
  }
  for (const root of worktrees.allowlistRoots) {
    if (typeof root !== "string" || !root.startsWith("/")) {
      throw new AutomationError(ERROR_CODES.CONFIG_INVALID_FIELD, `allowlist root must be an absolute path: ${root}`);
    }
  }
  if (typeof cfg.dryRun !== "boolean") {
    throw new AutomationError(ERROR_CODES.CONFIG_INVALID_FIELD, "dryRun must be a boolean");
  }
  return cfg;
}

export function loadConfig(path, { overrides = {} } = {}) {
  let fileConfig = {};
  if (path) {
    if (!existsSync(path)) {
      throw new AutomationError(ERROR_CODES.CONFIG_MISSING, `config not found: ${path}`);
    }
    try {
      fileConfig = JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      throw new AutomationError(ERROR_CODES.CONFIG_MALFORMED, `config is not valid JSON: ${e.message}`);
    }
  }
  return validateConfig(deepMerge(deepMerge(DEFAULT_CONFIG, fileConfig), overrides));
}

/**
 * Dry-run guard. Wraps any mutating operation so that in dry-run the operation
 * is RECORDED and never executed. Jobs must route every mutation through this.
 */
export function createMutationGuard({ dryRun }) {
  const planned = [];
  return {
    get dryRun() {
      return dryRun;
    },
    get planned() {
      return [...planned];
    },
    async perform(description, fn, details = {}) {
      planned.push({ description, ...details });
      if (dryRun) return { performed: false, dryRun: true, description, ...details };
      const result = await fn();
      return { performed: true, dryRun: false, description, result, ...details };
    },
  };
}
