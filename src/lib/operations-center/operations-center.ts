import "server-only";

import { readFile } from "node:fs/promises";

export type DataSourceStatus = "audit" | "available" | "estimated" | "live" | "unavailable";
export type FounderDecision = "approve" | "hold" | "request_changes";
export type RunnerOverride = "auto" | "claude" | "codex";
export type WorkStatus = "Blocked" | "Complete" | "Planned" | "Queued" | "Review" | "Waiting" | "Working";
export type RunnerStatus = "Available" | "Cooling Down" | "Limited" | "Offline" | "Unknown" | "Working";

export type OperationsIssue = {
  assignee?: string | null;
  id: string;
  labels: string[];
  project?: string | null;
  stateName: string;
  stateType?: string | null;
  title: string;
  updatedAt: string;
  url: string;
};

export type DataSource = {
  detail: string;
  label: string;
  status: DataSourceStatus;
};

export type AttentionItem = {
  decisionRequest: string;
  estimatedReviewTime: string;
  id: string;
  issue: string;
  linearUrl: string;
  previewUrl?: string;
  product: string;
  source: DataSourceStatus;
  title: string;
  whatChanged: string;
};

export type ActiveWorkItem = {
  category: string;
  detailUrl?: string;
  issue?: string;
  milestone: string;
  project: string;
  runner: string;
  source: DataSourceStatus;
  status: WorkStatus;
  update: string;
};

export type RunnerCapacity = {
  cooldownUntil?: string;
  currentIssue: string;
  lastSuccessfulRun: string;
  name: "Claude" | "Codex" | "Dispatcher";
  recentLimitEvent: string;
  recommendation: string;
  source: DataSourceStatus;
  status: RunnerStatus;
};

export type TodayBrief = {
  blocked: string[];
  completedToday: string[];
  importantChange: string;
  waitingForReview: string[];
  workingNow: string[];
};

export type RecentActivityItem = {
  href?: string;
  label: string;
  source: DataSourceStatus;
  timestamp: string;
  title: string;
};

export type OperationsCenterData = {
  activeWork: ActiveWorkItem[];
  attentionItems: AttentionItem[];
  capacity: RunnerCapacity[];
  generatedAt: string;
  issues: OperationsIssue[];
  recentActivity: RecentActivityItem[];
  reviewDecisionOutbox: DataSource;
  runnerOverrideOutbox: DataSource;
  sources: DataSource[];
  today: TodayBrief;
};

const linearIssueIds = [
  "USA-50",
  "USA-51",
  "USA-52",
  "USA-53",
  "USA-54",
  "USA-55",
  "USA-60",
  "USA-61",
  "USA-62",
  "USA-63",
  "USA-64",
  "USA-65",
  "USA-68",
] as const;

const auditedAt = "2026-07-22T16:49:06.644Z";

const auditedIssues: OperationsIssue[] = [
  issue("USA-50", "AI Workforce Operations Center — Sprint 1", "Todo", "unstarted", "AI and Automation", "https://linear.app/usa-missionaries/issue/USA-50/ai-workforce-operations-center-sprint-1", ["Founder Approval", "Product", "Backend"], auditedAt),
  issue("USA-51", "Operations Center A — architecture, auth, and security foundation", "In Review", "started", "AI and Automation", "https://linear.app/usa-missionaries/issue/USA-51/operations-center-a-architecture-auth-and-security-foundation", ["Founder Approval", "Engineering", "Security", "Backend"], "2026-07-22T16:48:36.225Z"),
  issue("USA-52", "Operations Center B — rapid dashboard MVP and protected preview", "In Review", "started", "AI and Automation", "https://linear.app/usa-missionaries/issue/USA-52/operations-center-b-rapid-dashboard-mvp-and-protected-preview", ["Founder Approval", "Design", "UX"], "2026-07-22T03:00:52.409Z"),
  issue("USA-53", "Operations Center C — workforce registry and dispatcher health", "In Review", "started", "AI and Automation", "https://linear.app/usa-missionaries/issue/USA-53/operations-center-c-workforce-registry-and-dispatcher-health", ["Engineering", "Backend"], "2026-07-22T16:48:35.183Z"),
  issue("USA-54", "Founder Command Center — simple one-page visibility and review dashboard", "In Progress", "started", "AI and Automation", "https://linear.app/usa-missionaries/issue/USA-54/founder-command-center-simple-one-page-visibility-and-review-dashboard", ["Founder Approval", "Product", "Design", "UX"], auditedAt),
  issue("USA-55", "Operations Center E — morning brief generator", "Backlog", "backlog", "AI and Automation", "https://linear.app/usa-missionaries/issue/USA-55/operations-center-e-morning-brief-generator", ["Founder Approval", "Engineering", "Backend"], "2026-07-20T20:46:23.283Z"),
  issue("USA-60", "Preview pipeline — automatic protected review URLs for every completed build", "In Review", "started", "AI and Automation", "https://linear.app/usa-missionaries/issue/USA-60/preview-pipeline-automatic-protected-review-urls-for-every-completed", ["Engineering", "Backend"], "2026-07-22T03:00:52.409Z"),
  issue("USA-61", "Enable safe review-branch pushes and publish the USA-52 preview", "In Review", "started", "AI and Automation", "https://linear.app/usa-missionaries/issue/USA-61/enable-safe-review-branch-pushes-and-publish-the-usa-52-preview", ["Engineering", "Backend"], "2026-07-22T03:00:52.409Z"),
  issue("USA-62", "Recover Operations Center build, publish preview, and resume paused pipeline", "In Review", "started", "AI and Automation", "https://linear.app/usa-missionaries/issue/USA-62/recover-operations-center-build-publish-preview-and-resume-paused", ["Engineering", "Backend"], "2026-07-22T03:08:27.224Z"),
  issue("USA-63", "Urgent NCC reset mockup — reconcile legacy, new platform, and Operations Center", "Todo", "unstarted", "NCC Overhaul", "https://linear.app/usa-missionaries/issue/USA-63/urgent-ncc-reset-mockup-reconcile-legacy-new-platform-and-operations", ["Founder Approval", "Engineering"], "2026-07-22T14:29:30.950Z"),
  issue("USA-64", "P0 Dispatcher outage — restore automatic Linear pickup and health reporting", "In Review", "started", "AI and Automation", "https://linear.app/usa-missionaries/issue/USA-64/p0-dispatcher-outage-restore-automatic-linear-pickup-and-health", ["Founder Approval", "Engineering", "Operations"], "2026-07-22T15:57:13.003Z"),
  issue("USA-65", "URGENT — Codex build Ecosystem, KTG, and DOS preview today", "In Review", "started", "usamissionaries.org", "https://linear.app/usa-missionaries/issue/USA-65/urgent-codex-build-ecosystem-ktg-and-dos-preview-today", ["Founder Approval", "Engineering", "Design", "Website"], "2026-07-22T16:37:38.005Z", "Ryan Fox"),
  issue("USA-68", "Dispatcher runner cooldown — pause on usage limits and resume at reset", "In Review", "started", "AI and Automation", "https://linear.app/usa-missionaries/issue/USA-68/dispatcher-runner-cooldown-pause-on-usage-limits-and-resume-at-reset", ["Founder Approval", "Engineering", "Operations"], "2026-07-22T16:47:02.199Z"),
];

function issue(
  id: string,
  title: string,
  stateName: string,
  stateType: string,
  project: string,
  url: string,
  labels: string[],
  updatedAt: string,
  assignee?: string,
): OperationsIssue {
  return {
    assignee,
    id,
    labels,
    project,
    stateName,
    stateType,
    title,
    updatedAt,
    url,
  };
}

function getLinearApiKey() {
  return process.env.OPERATIONS_CENTER_LINEAR_API_KEY?.trim()
    || process.env.LINEAR_API_KEY?.trim()
    || process.env.LINEAR_API_TOKEN?.trim()
    || "";
}

function linearAuthorizationHeader(apiKey: string) {
  return apiKey.startsWith("Bearer ") ? apiKey : apiKey;
}

function mapLinearIssue(raw: unknown): OperationsIssue | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as {
    assignee?: { name?: unknown } | null;
    identifier?: unknown;
    labels?: { nodes?: Array<{ name?: unknown }> } | null;
    project?: { name?: unknown } | null;
    state?: { name?: unknown; type?: unknown } | null;
    title?: unknown;
    updatedAt?: unknown;
    url?: unknown;
  };

  if (
    typeof record.identifier !== "string"
    || typeof record.title !== "string"
    || typeof record.url !== "string"
  ) {
    return null;
  }

  return {
    assignee: typeof record.assignee?.name === "string" ? record.assignee.name : null,
    id: record.identifier,
    labels: (record.labels?.nodes ?? [])
      .map((label) => label.name)
      .filter((label): label is string => typeof label === "string"),
    project: typeof record.project?.name === "string" ? record.project.name : null,
    stateName: typeof record.state?.name === "string" ? record.state.name : "Unknown",
    stateType: typeof record.state?.type === "string" ? record.state.type : null,
    title: record.title,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
    url: record.url,
  };
}

async function fetchLiveLinearIssues() {
  const apiKey = getLinearApiKey();

  if (!apiKey) {
    return {
      issues: auditedIssues,
      source: {
        detail: "Server token not configured; showing the Codex audit snapshot from Linear.",
        label: "Linear",
        status: "audit" as const,
      },
    };
  }

  const aliases = linearIssueIds
    .map((id, index) => `issue${index}: issue(id: "${id}") { ...IssueFields }`)
    .join("\n");
  const query = `
    query OperationsCenterIssues {
      ${aliases}
    }

    fragment IssueFields on Issue {
      identifier
      title
      url
      updatedAt
      state { name type }
      assignee { name }
      project { name }
      labels { nodes { name } }
    }
  `;

  try {
    const response = await fetch("https://api.linear.app/graphql", {
      body: JSON.stringify({ query }),
      cache: "no-store",
      headers: {
        Authorization: linearAuthorizationHeader(apiKey),
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Linear responded with ${response.status}.`);
    }

    const payload = await response.json() as { data?: Record<string, unknown>; errors?: Array<{ message?: string }> };

    if (payload.errors?.length) {
      throw new Error("Linear returned GraphQL errors.");
    }

    const issues = Object.values(payload.data ?? {})
      .map(mapLinearIssue)
      .filter((item): item is OperationsIssue => Boolean(item));

    if (!issues.length) {
      throw new Error("Linear returned no tracked issues.");
    }

    return {
      issues,
      source: {
        detail: "Live server-side Linear GraphQL; API key never reaches the browser.",
        label: "Linear",
        status: "live" as const,
      },
    };
  } catch {
    return {
      issues: auditedIssues,
      source: {
        detail: "Live Linear request failed; showing the Codex audit snapshot.",
        label: "Linear",
        status: "audit" as const,
      },
    };
  }
}

async function readJsonPath(path: string) {
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as unknown;
}

function getPathSource(path: string | undefined, label: string): DataSource {
  return path?.trim()
    ? {
        detail: "Server-only path configured. Browser receives sanitized fields only.",
        label,
        status: "available",
      }
    : {
        detail: "No server-only source path configured.",
        label,
        status: "unavailable",
      };
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "America/Chicago",
  }).format(date);
}

function byId(issues: OperationsIssue[], id: string) {
  return issues.find((issueItem) => issueItem.id === id) ?? auditedIssues.find((issueItem) => issueItem.id === id);
}

function workStatus(issueItem: OperationsIssue | undefined): WorkStatus {
  const stateName = issueItem?.stateName.toLowerCase() ?? "";
  const stateType = issueItem?.stateType?.toLowerCase() ?? "";

  if (stateType === "completed" || stateName.includes("done") || stateName.includes("complete")) {
    return "Complete";
  }

  if (stateType === "canceled" || stateName.includes("blocked")) {
    return "Blocked";
  }

  if (stateName.includes("review")) {
    return "Review";
  }

  if (stateName.includes("progress") || stateType === "started") {
    return "Working";
  }

  if (stateName.includes("todo")) {
    return "Queued";
  }

  return "Planned";
}

function activeWork(issues: OperationsIssue[], linearSource: DataSource): ActiveWorkItem[] {
  const usa54 = byId(issues, "USA-54");
  const usa65 = byId(issues, "USA-65");
  const usa63 = byId(issues, "USA-63");
  const usa64 = byId(issues, "USA-64");
  const usa55 = byId(issues, "USA-55");

  return [
    {
      category: "USA Missionaries / Ministry Strategy",
      detailUrl: "https://linear.app/usa-missionaries/issue/USA-50/ai-workforce-operations-center-sprint-1",
      issue: "USA-50",
      milestone: "Founder command visibility before expanding controls",
      project: "Operations Center Sprint 1",
      runner: "Chief of Staff thread",
      source: linearSource.status,
      status: workStatus(byId(issues, "USA-50")),
      update: "Executive visibility is the current strategy bottleneck.",
    },
    {
      category: "Public Website / Marketing",
      detailUrl: usa65?.url,
      issue: usa65?.id,
      milestone: "Founder decision on Ecosystem, KTG, and DOS preview",
      project: usa65?.title ?? "Ecosystem preview package",
      runner: "Codex",
      source: "audit",
      status: workStatus(usa65),
      update: "Corrected preview links were posted for Ecosystem, DOS, and Kitchen Table Gospel.",
    },
    {
      category: "DOS — Discipleship Operating System",
      detailUrl: "https://usam-website-usa-65-preview-cmgdlimnl.vercel.app/domain-sites/discipleship-operating-system",
      issue: "USA-65",
      milestone: "Founder review of DOS V4 fidelity",
      project: "DOS public preview",
      runner: "Codex",
      source: "audit",
      status: workStatus(usa65),
      update: "Latest package serves the approved DOS V4 artifact with minimal route integration.",
    },
    {
      category: "Kitchen Table Gospel",
      detailUrl: "https://usam-website-usa-65-preview-cmgdlimnl.vercel.app/domain-sites/kitchen-table-gospel",
      issue: "USA-65",
      milestone: "Founder review of standalone initiative quality",
      project: "Kitchen Table Gospel public site",
      runner: "Codex",
      source: "audit",
      status: workStatus(usa65),
      update: "Repaired preview is ready after founder rejected the weaker first pass.",
    },
    {
      category: "NCC / Operations",
      detailUrl: usa63?.url,
      issue: usa63?.id,
      milestone: "NCC reset mockup after Claude is available",
      project: usa63?.title ?? "NCC reset mockup",
      runner: "Claude",
      source: linearSource.status,
      status: "Waiting",
      update: "Held by prior Claude cooldown/lock context; not a public profile or Field UI.",
    },
    {
      category: "Communications",
      detailUrl: "https://linear.app/usa-missionaries/issue/USA-44/communications-phase-1-resend-subscribers-newsletter-and-archive",
      milestone: "Resume after dashboard/review path is stable",
      project: "Newsletter, subscribers, and archive",
      runner: "Unassigned",
      source: "audit",
      status: "Planned",
      update: "No current runner packet in the audited Operations Center cluster.",
    },
    {
      category: "AI Workforce / Automation",
      detailUrl: usa54?.url,
      issue: usa54?.id,
      milestone: "One-page Founder Command Center review package",
      project: usa54?.title ?? "Founder Command Center",
      runner: "Codex",
      source: linearSource.status,
      status: workStatus(usa54),
      update: "Current Codex pass is rebuilding the missing protected dashboard route.",
    },
    {
      category: "Finance / Compliance",
      detailUrl: "/admin/finance",
      milestone: "Keep finance controls separate from workforce monitoring",
      project: "Finance operations and compliance workspace",
      runner: "Unassigned",
      source: "audit",
      status: "Planned",
      update: "No active finance packet in the audited USA-50 to USA-68 set.",
    },
  ];
}

function attentionItems(issues: OperationsIssue[]): AttentionItem[] {
  const usa65 = byId(issues, "USA-65") ?? auditedIssues[0];
  const usa64 = byId(issues, "USA-64") ?? auditedIssues[0];

  return [
    {
      decisionRequest: "Approve the current preview, request visual changes, or hold for another repair pass.",
      estimatedReviewTime: "12 min",
      id: "attention-usa-65",
      issue: usa65.id,
      linearUrl: usa65.url,
      previewUrl: "https://usam-website-usa-65-preview-cmgdlimnl.vercel.app/ecosystem",
      product: "Public Website / Marketing",
      source: "audit",
      title: usa65.title,
      whatChanged: "Corrected preview posted for Ecosystem, DOS, and Kitchen Table Gospel after the first DOS/KTG pass was rejected.",
    },
    {
      decisionRequest: "Approve broad dispatcher pickup, keep it paused, or hold until browser ingestion is wired.",
      estimatedReviewTime: "8 min",
      id: "attention-usa-64",
      issue: usa64.id,
      linearUrl: usa64.url,
      product: "AI Workforce / Automation",
      source: "audit",
      title: usa64.title,
      whatChanged: "Dispatcher proof completed: automatic Codex and Claude pickups ran, health files were added, and cooldown behavior changed runner visibility expectations.",
    },
  ];
}

function auditCapacity(dispatcherSource: DataSource): RunnerCapacity[] {
  return [
    {
      currentIssue: dispatcherSource.status === "available" ? "Read from dispatcher health JSON" : "Last audited: USA-65 was active on Codex",
      lastSuccessfulRun: "USA-65 preview correction posted Jul 22, 11:37 AM CT",
      name: "Codex",
      recentLimitEvent: "No recent Codex limit event in the audited comments",
      recommendation: "Best observed runner for the next large build once live health confirms availability",
      source: dispatcherSource.status === "available" ? "available" : "audit",
      status: dispatcherSource.status === "available" ? "Unknown" : "Unknown",
    },
    {
      cooldownUntil: "2026-07-22T18:32:00.000Z",
      currentIssue: "Last audited hold: USA-63",
      lastSuccessfulRun: "USA-67 automatic pickup proof completed Jul 22, 10:12 AM CT",
      name: "Claude",
      recentLimitEvent: "Session limit observed; provider reset was 1:30 PM America/Chicago with retry buffer to 1:32 PM",
      recommendation: "Use only after live health confirms cooldown cleared",
      source: "audit",
      status: "Unknown",
    },
    {
      currentIssue: dispatcherSource.status === "available" ? "Read from dispatcher health JSON" : "Live browser source unavailable",
      lastSuccessfulRun: "USA-64 proof reported dispatcher running and polling",
      name: "Dispatcher",
      recentLimitEvent: "Runner cooldown support added; no exact live capacity percentage is exposed",
      recommendation: "Connect health.json before making launch decisions from this page",
      source: dispatcherSource.status,
      status: dispatcherSource.status === "available" ? "Unknown" : "Unknown",
    },
  ];
}

function readString(record: Record<string, unknown>, keys: string[], fallback = "Unavailable") {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return fallback;
}

function normalizeRunnerStatus(value: string): RunnerStatus {
  const normalized = value.toLowerCase();

  if (normalized.includes("cooldown")) {
    return "Cooling Down";
  }

  if (normalized.includes("available") || normalized === "ready" || normalized === "idle") {
    return "Available";
  }

  if (normalized.includes("busy") || normalized.includes("working") || normalized.includes("running")) {
    return "Working";
  }

  if (normalized.includes("limit")) {
    return "Limited";
  }

  if (normalized.includes("offline") || normalized.includes("unavailable")) {
    return "Offline";
  }

  return "Unknown";
}

function runnerName(value: string): RunnerCapacity["name"] | null {
  const normalized = value.toLowerCase();

  if (normalized.includes("claude")) {
    return "Claude";
  }

  if (normalized.includes("codex")) {
    return "Codex";
  }

  if (normalized.includes("dispatcher")) {
    return "Dispatcher";
  }

  return null;
}

function normalizeHealthRunner(name: RunnerCapacity["name"], value: unknown): RunnerCapacity {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawStatus = readString(record, ["status", "state", "availability"], "Unknown");

  return {
    cooldownUntil: readString(record, ["cooldownUntil", "cooldown_until", "resumeAfter", "resume_after"], "") || undefined,
    currentIssue: readString(record, ["currentIssue", "current_issue", "issue", "activeIssue"], "No current issue reported"),
    lastSuccessfulRun: readString(record, ["lastSuccessfulRun", "last_successful_run", "lastCompletion", "last_completion"], "No successful run reported"),
    name,
    recentLimitEvent: readString(record, ["recentLimitEvent", "recent_limit_event", "lastLimitEvent", "providerMessageOriginal"], "No recent limit event reported"),
    recommendation: readString(record, ["recommendation"], "Use dispatcher eligibility, locks, and cooldown rules before assigning work"),
    source: "available",
    status: normalizeRunnerStatus(rawStatus),
  };
}

function parseHealthCapacity(raw: unknown): RunnerCapacity[] | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const rawRunners = record.runners ?? record.runnerRegistry ?? record.runner_registry ?? record.agents;
  const runners: RunnerCapacity[] = [];

  if (Array.isArray(rawRunners)) {
    for (const item of rawRunners) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const itemRecord = item as Record<string, unknown>;
      const nameValue = readString(itemRecord, ["name", "runner", "id"], "");
      const name = runnerName(nameValue);

      if (name) {
        runners.push(normalizeHealthRunner(name, itemRecord));
      }
    }
  } else if (rawRunners && typeof rawRunners === "object") {
    for (const [key, value] of Object.entries(rawRunners as Record<string, unknown>)) {
      const name = runnerName(key);

      if (name) {
        runners.push(normalizeHealthRunner(name, value));
      }
    }
  }

  if (!runners.some((runner) => runner.name === "Dispatcher")) {
    runners.push(normalizeHealthRunner("Dispatcher", record));
  }

  return runners.length ? runners : null;
}

function todayBrief(): TodayBrief {
  return {
    blocked: [
      "Protected external preview for USA-54 is blocked by this lane's no-push/no-deploy rule.",
      "Website route cannot read Mac mini dispatcher health until a server-only ingestion path is configured.",
    ],
    completedToday: [
      "Dispatcher outage proof completed with Codex and Claude automatic pickups.",
      "USA-65 preview was corrected and reposted with Ecosystem, DOS, and Kitchen Table Gospel links.",
    ],
    importantChange: "Runner capacity must show observed status only. Exact remaining usage is unavailable unless a provider/account source exposes it.",
    waitingForReview: [
      "USA-65 public preview package",
      "USA-64 dispatcher proof and broad-pickup decision",
      "Operations Center foundation packets USA-51 through USA-53",
    ],
    workingNow: [
      "USA-54 Founder Command Center Codex implementation pass",
    ],
  };
}

function recentActivity(): RecentActivityItem[] {
  return [
    {
      href: "https://linear.app/usa-missionaries/issue/USA-54/founder-command-center-simple-one-page-visibility-and-review-dashboard",
      label: "Work Claimed",
      source: "audit",
      timestamp: "2026-07-22T16:49:06.644Z",
      title: "USA-54 Codex pass started",
    },
    {
      href: "https://usam-website-usa-65-preview-cmgdlimnl.vercel.app/ecosystem",
      label: "Preview Published",
      source: "audit",
      timestamp: "2026-07-22T16:37:38.005Z",
      title: "USA-65 corrected preview posted",
    },
    {
      href: "https://linear.app/usa-missionaries/issue/USA-64/p0-dispatcher-outage-restore-automatic-linear-pickup-and-health",
      label: "Review Ready",
      source: "audit",
      timestamp: "2026-07-22T15:57:13.003Z",
      title: "Dispatcher resumed with health and cooldown reporting",
    },
    {
      href: "https://linear.app/usa-missionaries/issue/USA-68/dispatcher-runner-cooldown-pause-on-usage-limits-and-resume-at-reset",
      label: "Cooldown",
      source: "audit",
      timestamp: "2026-07-22T15:55:34.115Z",
      title: "Claude cooldown buffer corrected to two minutes",
    },
    {
      href: "https://linear.app/usa-missionaries/issue/USA-65/urgent-codex-build-ecosystem-ktg-and-dos-preview-today",
      label: "Founder Decision",
      source: "audit",
      timestamp: "2026-07-22T15:38:25.038Z",
      title: "First DOS/KTG pass rejected for fidelity repair",
    },
  ];
}

export function formatOperationsDateTime(value: string) {
  return formatDateTime(value);
}

export function dataSourceLabel(status: DataSourceStatus) {
  return {
    audit: "Audit Snapshot",
    available: "Available",
    estimated: "Estimated",
    live: "Live",
    unavailable: "Unavailable",
  }[status];
}

export function decisionLabel(decision: FounderDecision) {
  return {
    approve: "Approve",
    hold: "Hold",
    request_changes: "Request Changes",
  }[decision];
}

export async function getOperationsCenterData(): Promise<OperationsCenterData> {
  const linear = await fetchLiveLinearIssues();
  const dispatcherPath = process.env.OPERATIONS_CENTER_DISPATCHER_HEALTH_PATH?.trim();
  let dispatcherSource = getPathSource(dispatcherPath, "Dispatcher Health");
  let capacity = auditCapacity(dispatcherSource);

  if (dispatcherPath) {
    try {
      const health = await readJsonPath(dispatcherPath);
      capacity = parseHealthCapacity(health) ?? capacity;
    } catch {
      dispatcherSource = {
        detail: "Configured health path could not be read; showing unavailable dispatcher state.",
        label: "Dispatcher Health",
        status: "unavailable",
      };
      capacity = auditCapacity(dispatcherSource);
    }
  }

  const reviewDecisionOutbox = getPathSource(process.env.OPERATIONS_CENTER_DECISION_OUTBOX_PATH, "Review Decisions");
  const runnerOverrideOutbox = getPathSource(process.env.OPERATIONS_CENTER_RUNNER_OVERRIDE_OUTBOX_PATH, "Runner Override");

  return {
    activeWork: activeWork(linear.issues, linear.source),
    attentionItems: attentionItems(linear.issues),
    capacity,
    generatedAt: new Date().toISOString(),
    issues: linear.issues,
    recentActivity: recentActivity(),
    reviewDecisionOutbox,
    runnerOverrideOutbox,
    sources: [
      linear.source,
      dispatcherSource,
      reviewDecisionOutbox,
      runnerOverrideOutbox,
      {
        detail: "Review-time estimates are human estimates from the product/design pass.",
        label: "Review Time",
        status: "estimated",
      },
    ],
    today: todayBrief(),
  };
}
