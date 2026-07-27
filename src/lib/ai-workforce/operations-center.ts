import "server-only";

export const operationsCenterRoute = "/admin/operations-center" as const;

export const workforceDepartments = [
  "intake",
  "engineering",
  "validation",
  "qa",
  "founder_review",
] as const;

export type WorkforceDepartment = typeof workforceDepartments[number];

export const workforceSnapshotSources = [
  {
    description: "Linear issue identifier, title, priority, status, labels, assignee, and review state.",
    key: "linear_issues",
    label: "Linear Issues",
  },
  {
    description: "Dispatcher heartbeat, queue age, active lane count, and offline/stale status.",
    key: "dispatcher_health",
    label: "Dispatcher Health",
  },
  {
    description: "Lock owner, issue identifier, lane, status, and expiry metadata without local paths.",
    key: "dispatcher_locks",
    label: "Dispatcher Locks",
  },
  {
    description: "Worktree issue, branch, lane, status, and last activity without absolute filesystem paths.",
    key: "worktrees",
    label: "Worktrees",
  },
  {
    description: "Claude/Codex lane, issue identifier, current status, heartbeat, and safe summary.",
    key: "agents",
    label: "Agents",
  },
  {
    description: "QA result, founder review state, approval gate, and unresolved limitations.",
    key: "reviews",
    label: "Reviews",
  },
] as const;

export type WorkforceSnapshotSourceKey = typeof workforceSnapshotSources[number]["key"];

export type WorkforceFreshness = "empty" | "fresh" | "offline" | "stale";
export type WorkforceHealthStatus = "blocked" | "degraded" | "offline" | "ok" | "unknown";
export type WorkforceItemStatus = "blocked" | "failed" | "in_review" | "idle" | "running" | "stale" | "unknown";

export type WorkforceSourceSummary = {
  key: WorkforceSnapshotSourceKey;
  label: string;
  lastUpdatedAt: string | null;
  status: WorkforceHealthStatus;
};

export type DispatcherHealthSummary = {
  activeAgents: number | null;
  heartbeatAt: string | null;
  queueDepth: number | null;
  staleAfterSeconds: number;
  status: WorkforceHealthStatus;
};

export type WorkforceIssueSummary = {
  assignee: string | null;
  department: WorkforceDepartment;
  identifier: string;
  state: string;
  status: WorkforceItemStatus;
  title: string;
  updatedAt: string | null;
  url: string | null;
};

export type WorkforceLockSummary = {
  expiresAt: string | null;
  identifier: string;
  lane: string;
  owner: string;
  status: WorkforceItemStatus;
};

export type WorkforceWorktreeSummary = {
  branch: string;
  identifier: string;
  lane: string;
  status: WorkforceItemStatus;
  updatedAt: string | null;
};

export type WorkforceAgentSummary = {
  currentStep: string | null;
  identifier: string;
  lane: string;
  lastHeartbeatAt: string | null;
  name: string;
  status: WorkforceItemStatus;
};

export type WorkforceReviewSummary = {
  identifier: string;
  requiredApproval: "founder" | "none" | "qa";
  reviewer: string | null;
  status: WorkforceItemStatus;
  updatedAt: string | null;
};

export type WorkforceSnapshot = {
  agents: WorkforceAgentSummary[];
  dispatcher: DispatcherHealthSummary;
  freshness: WorkforceFreshness;
  generatedAt: string | null;
  issues: WorkforceIssueSummary[];
  locks: WorkforceLockSummary[];
  reviews: WorkforceReviewSummary[];
  schemaVersion: 1;
  sources: WorkforceSourceSummary[];
  warnings: string[];
  worktrees: WorkforceWorktreeSummary[];
};

const maxItems = 50;
const staleAfterSeconds = 180;
const maxWarningCount = 12;
const sensitiveTextPattern = /(\b[A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)[A-Z0-9_]*\b|\/Users\/|\/private\/|\.env|service_role|bearer\s+[a-z0-9._-]+|sk-[a-z0-9_-]+)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value.slice(0, maxItems) : [];
}

function cleanText(value: unknown, fallback: string, maxLength = 120) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return fallback;
  }

  if (sensitiveTextPattern.test(trimmed)) {
    return "[redacted]";
  }

  return trimmed.slice(0, maxLength);
}

function nullableCleanText(value: unknown, maxLength = 120) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return cleanText(value, "[redacted]", maxLength);
}

function asSafeUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return null;
    }

    return url.toString().slice(0, 240);
  } catch {
    return null;
  }
}

function asNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

function asIsoDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asHealthStatus(value: unknown): WorkforceHealthStatus {
  return ["blocked", "degraded", "offline", "ok", "unknown"].includes(value as WorkforceHealthStatus)
    ? value as WorkforceHealthStatus
    : "unknown";
}

function asItemStatus(value: unknown): WorkforceItemStatus {
  return ["blocked", "failed", "in_review", "idle", "running", "stale", "unknown"].includes(value as WorkforceItemStatus)
    ? value as WorkforceItemStatus
    : "unknown";
}

function asDepartment(value: unknown): WorkforceDepartment {
  return workforceDepartments.includes(value as WorkforceDepartment)
    ? value as WorkforceDepartment
    : "engineering";
}

function asApproval(value: unknown): WorkforceReviewSummary["requiredApproval"] {
  return ["founder", "none", "qa"].includes(value as WorkforceReviewSummary["requiredApproval"])
    ? value as WorkforceReviewSummary["requiredApproval"]
    : "founder";
}

function resolveFreshness(generatedAt: string | null, now: Date): WorkforceFreshness {
  if (!generatedAt) {
    return "empty";
  }

  const generatedTime = new Date(generatedAt).getTime();

  if (Number.isNaN(generatedTime)) {
    return "empty";
  }

  const ageSeconds = Math.max(0, Math.floor((now.getTime() - generatedTime) / 1000));

  return ageSeconds > staleAfterSeconds ? "stale" : "fresh";
}

function emptySources(status: WorkforceHealthStatus = "unknown"): WorkforceSourceSummary[] {
  return workforceSnapshotSources.map((source) => ({
    key: source.key,
    label: source.label,
    lastUpdatedAt: null,
    status,
  }));
}

export function createEmptyWorkforceSnapshot(warning = "No dispatcher snapshot source is connected."): WorkforceSnapshot {
  return {
    agents: [],
    dispatcher: {
      activeAgents: null,
      heartbeatAt: null,
      queueDepth: null,
      staleAfterSeconds,
      status: "unknown",
    },
    freshness: "empty",
    generatedAt: null,
    issues: [],
    locks: [],
    reviews: [],
    schemaVersion: 1,
    sources: emptySources(),
    warnings: [warning],
    worktrees: [],
  };
}

export function sanitizeWorkforceSnapshot(input: unknown, now = new Date()): WorkforceSnapshot {
  if (!isRecord(input)) {
    return createEmptyWorkforceSnapshot("Dispatcher snapshot was missing or invalid.");
  }

  const generatedAt = asIsoDate(input.generatedAt);
  const dispatcherInput = isRecord(input.dispatcher) ? input.dispatcher : {};

  return {
    agents: asArray(input.agents).map((agent, index) => {
      const item = isRecord(agent) ? agent : {};

      return {
        currentStep: nullableCleanText(item.currentStep, 180),
        identifier: cleanText(item.identifier, `agent-${index + 1}`, 40),
        lane: cleanText(item.lane, "unknown", 40),
        lastHeartbeatAt: asIsoDate(item.lastHeartbeatAt),
        name: cleanText(item.name, "Agent", 80),
        status: asItemStatus(item.status),
      };
    }),
    dispatcher: {
      activeAgents: asNumber(dispatcherInput.activeAgents),
      heartbeatAt: asIsoDate(dispatcherInput.heartbeatAt),
      queueDepth: asNumber(dispatcherInput.queueDepth),
      staleAfterSeconds,
      status: asHealthStatus(dispatcherInput.status),
    },
    freshness: resolveFreshness(generatedAt, now),
    generatedAt,
    issues: asArray(input.issues).map((issue, index) => {
      const item = isRecord(issue) ? issue : {};

      return {
        assignee: nullableCleanText(item.assignee, 80),
        department: asDepartment(item.department),
        identifier: cleanText(item.identifier, `ISSUE-${index + 1}`, 40),
        state: cleanText(item.state, "Unknown", 80),
        status: asItemStatus(item.status),
        title: cleanText(item.title, "Untitled work packet", 160),
        updatedAt: asIsoDate(item.updatedAt),
        url: asSafeUrl(item.url),
      };
    }),
    locks: asArray(input.locks).map((lock, index) => {
      const item = isRecord(lock) ? lock : {};

      return {
        expiresAt: asIsoDate(item.expiresAt),
        identifier: cleanText(item.identifier, `LOCK-${index + 1}`, 40),
        lane: cleanText(item.lane, "unknown", 40),
        owner: cleanText(item.owner, "unknown", 80),
        status: asItemStatus(item.status),
      };
    }),
    reviews: asArray(input.reviews).map((review, index) => {
      const item = isRecord(review) ? review : {};

      return {
        identifier: cleanText(item.identifier, `REVIEW-${index + 1}`, 40),
        requiredApproval: asApproval(item.requiredApproval),
        reviewer: nullableCleanText(item.reviewer, 80),
        status: asItemStatus(item.status),
        updatedAt: asIsoDate(item.updatedAt),
      };
    }),
    schemaVersion: 1,
    sources: emptySources("unknown"),
    warnings: asArray(input.warnings)
      .slice(0, maxWarningCount)
      .map((warning) => cleanText(warning, "Snapshot warning", 180)),
    worktrees: asArray(input.worktrees).map((worktree, index) => {
      const item = isRecord(worktree) ? worktree : {};

      return {
        branch: cleanText(item.branch, "unknown", 96),
        identifier: cleanText(item.identifier, `WORKTREE-${index + 1}`, 40),
        lane: cleanText(item.lane, "unknown", 40),
        status: asItemStatus(item.status),
        updatedAt: asIsoDate(item.updatedAt),
      };
    }),
  };
}

export async function loadWorkforceSnapshot(): Promise<WorkforceSnapshot> {
  return createEmptyWorkforceSnapshot();
}
