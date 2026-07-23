import "server-only";

import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import { dirname } from "node:path";

export const TRACKED_LINEAR_ISSUE_IDS = [
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
  "USA-68",
] as const;

export type DataSourceStatus = "available" | "estimated" | "live" | "unavailable";
export type WorkStatus = "Planned" | "Queued" | "Working" | "Waiting" | "Review" | "Blocked" | "Complete";
export type RunnerStatus = "Available" | "Working" | "Cooling Down" | "Limited" | "Offline" | "Unknown";
export type RunnerId = "claude" | "codex" | "dispatcher";
export type FounderDecision = "approve" | "hold" | "request_changes";
export type OverrideRunnerId = "claude" | "codex";

export type ReviewItem = {
  dataSource: DataSourceStatus;
  decisionRequested: string;
  estimatedReviewTime: string;
  issueId: string;
  product: string;
  reviewLink: string;
  reviewLinkLabel: string;
  title: string;
  whatChanged: string;
};

export type ActiveWorkItem = {
  assignedRunner: string;
  blocker: string;
  category: string;
  currentProject: string;
  dataSource: DataSourceStatus;
  detailHref?: string;
  issueId: string;
  mostRecentUpdate: string;
  nextMilestone: string;
  status: WorkStatus;
};

export type CompletedWorkItem = {
  completedAt: string;
  dataSource: DataSourceStatus;
  detail: string;
  href?: string;
  issueId: string;
  product: string;
  title: string;
};

export type RunnerCapacity = {
  cooldownReset: string;
  currentIssue: string;
  dataSource: DataSourceStatus;
  id: RunnerId;
  lastSuccessfulRun: string;
  name: string;
  recentLimitEvent: string;
  recommendation: string;
  status: RunnerStatus;
  statusDetail: string;
  usageSummary: string;
};

export type TodayBrief = {
  blocked: string[];
  completedToday: string[];
  dataSource: DataSourceStatus;
  importantChange: string;
  waitingForReview: string[];
  workingNow: string[];
};

export type RecentActivityItem = {
  dataSource: DataSourceStatus;
  detail: string;
  href?: string;
  label: string;
  timestamp: string;
  title: string;
};

export type RunnerOverrideState = {
  dataSource: DataSourceStatus;
  requestedRunner: "Claude" | "Codex" | "None";
  status: string;
  updatedAt: string;
};

export type OperationsCenterData = {
  activeWork: ActiveWorkItem[];
  completedRecently: CompletedWorkItem[];
  dataNotes: string[];
  dispatcherSource: DataSourceStatus;
  generatedAt: string;
  linearSource: DataSourceStatus;
  needsAttention: ReviewItem[];
  recentActivity: RecentActivityItem[];
  runnerOverride: RunnerOverrideState;
  runners: RunnerCapacity[];
  today: TodayBrief;
};

type LinearIssue = {
  assigneeName: string;
  category: string;
  createdAt: string;
  description: string;
  id: string;
  identifier: string;
  labels: string[];
  projectName: string;
  stateName: string;
  stateType: string;
  status: WorkStatus;
  title: string;
  updatedAt: string;
  url: string;
};

type LinearIssueResult = {
  issues: LinearIssue[];
  note?: string;
  status: DataSourceStatus;
};

type RawDispatcherHealth = {
  activeWork?: unknown;
  generatedAt?: unknown;
  needsAttention?: unknown;
  recentActivity?: unknown;
  runnerOverride?: unknown;
  runners?: unknown;
  today?: unknown;
};

type DispatcherHealthResult = {
  activeWork: ActiveWorkItem[];
  generatedAt?: string;
  needsAttention: ReviewItem[];
  note?: string;
  recentActivity: RecentActivityItem[];
  runnerOverride?: RunnerOverrideState;
  runners: RunnerCapacity[];
  status: DataSourceStatus;
  today?: Partial<TodayBrief>;
};

const CATEGORY_DEFINITIONS = [
  {
    keywords: ["ministry", "strategy", "chief of staff", "founder"],
    title: "USA Missionaries / Ministry Strategy",
  },
  {
    keywords: ["website", "marketing", "public", "profile", "missionaries"],
    title: "Public Website / Marketing",
  },
  {
    keywords: ["dos", "discipleship operating system", "field", "table"],
    title: "DOS - Discipleship Operating System",
  },
  {
    keywords: ["kitchen table", "gospel"],
    title: "Kitchen Table Gospel",
  },
  {
    keywords: ["operations center", "command center", "ncc", "founder command center", "morning brief"],
    title: "NCC / Operations Center",
  },
  {
    keywords: ["communications", "email", "brief", "message"],
    title: "Communications",
  },
  {
    keywords: ["ai workforce", "automation", "dispatcher", "runner", "codex", "claude", "cooldown", "preview pipeline", "outage"],
    title: "AI Workforce / Automation",
  },
  {
    keywords: ["finance", "compliance", "legal", "giving"],
    title: "Finance / Compliance",
  },
  {
    keywords: ["save standard"],
    title: "SAVE Standard",
  },
] as const;

export const OPERATIONS_CENTER_CATEGORIES = CATEGORY_DEFINITIONS.map((category) => category.title);

const ISSUE_CATEGORY_HINTS: Record<string, string> = {
  "USA-50": "AI Workforce / Automation",
  "USA-54": "NCC / Operations Center",
  "USA-55": "NCC / Operations Center",
  "USA-60": "AI Workforce / Automation",
  "USA-64": "AI Workforce / Automation",
  "USA-68": "AI Workforce / Automation",
};

const DEFAULT_RUNNERS: RunnerCapacity[] = [
  {
    cooldownReset: "Unavailable",
    currentIssue: "None reported",
    dataSource: "unavailable",
    id: "claude",
    lastSuccessfulRun: "Unavailable",
    name: "Claude",
    recentLimitEvent: "Unavailable",
    recommendation: "Unavailable until dispatcher health is connected",
    status: "Unknown",
    statusDetail: "Dispatcher health not configured",
    usageSummary: "Exact remaining allowance unavailable",
  },
  {
    cooldownReset: "Unavailable",
    currentIssue: "None reported",
    dataSource: "unavailable",
    id: "codex",
    lastSuccessfulRun: "Unavailable",
    name: "Codex",
    recentLimitEvent: "Unavailable",
    recommendation: "Unavailable until dispatcher health is connected",
    status: "Unknown",
    statusDetail: "Dispatcher health not configured",
    usageSummary: "Exact remaining allowance unavailable",
  },
  {
    cooldownReset: "Unavailable",
    currentIssue: "None reported",
    dataSource: "unavailable",
    id: "dispatcher",
    lastSuccessfulRun: "Unavailable",
    name: "Dispatcher",
    recentLimitEvent: "Unavailable",
    recommendation: "Connect dispatcher health before scheduling automation",
    status: "Unknown",
    statusDetail: "Dispatcher health not configured",
    usageSummary: "Not a usage-metered runner",
  },
];

function cleanText(value: unknown, fallback = "Unavailable", maxLength = 220) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toIso(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatDateTime(value: string) {
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
    timeZone: "America/Chicago",
  }).format(date);
}

function todayKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Chicago",
    year: "numeric",
  }).format(value);
}

function isToday(value: string) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return todayKey(date) === todayKey(new Date());
}

function categoryForIssue(issue: Pick<LinearIssue, "description" | "identifier" | "labels" | "projectName" | "title">) {
  const explicitCategory = ISSUE_CATEGORY_HINTS[issue.identifier];

  if (explicitCategory) {
    return explicitCategory;
  }

  const haystack = `${issue.identifier} ${issue.title} ${issue.description} ${issue.projectName} ${issue.labels.join(" ")}`.toLowerCase();
  const matchedCategory = CATEGORY_DEFINITIONS.find((category) => category.keywords.some((keyword) => haystack.includes(keyword)));

  return matchedCategory?.title ?? "USA Missionaries / Ministry Strategy";
}

function normalizeWorkStatus(stateName: string, stateType: string): WorkStatus {
  const state = `${stateName} ${stateType}`.toLowerCase();

  if (state.includes("complete") || state.includes("done") || stateType === "completed") {
    return "Complete";
  }

  if (state.includes("block") || state.includes("outage")) {
    return "Blocked";
  }

  if (state.includes("review")) {
    return "Review";
  }

  if (state.includes("wait") || state.includes("pause") || state.includes("hold")) {
    return "Waiting";
  }

  if (state.includes("progress") || state.includes("working") || stateType === "started") {
    return "Working";
  }

  if (state.includes("queue") || state.includes("ready")) {
    return "Queued";
  }

  return "Planned";
}

function normalizeRunnerStatus(value: unknown): RunnerStatus {
  const status = cleanText(value, "Unknown").toLowerCase();

  if (status.includes("available")) {
    return "Available";
  }

  if (status.includes("cool")) {
    return "Cooling Down";
  }

  if (status.includes("limit")) {
    return "Limited";
  }

  if (status.includes("offline")) {
    return "Offline";
  }

  if (status.includes("work") || status.includes("running")) {
    return "Working";
  }

  return "Unknown";
}

function normalizeRunnerId(value: unknown): RunnerId | null {
  const runner = cleanText(value, "", 40).toLowerCase();

  if (runner.includes("claude")) {
    return "claude";
  }

  if (runner.includes("codex")) {
    return "codex";
  }

  if (runner.includes("dispatcher")) {
    return "dispatcher";
  }

  return null;
}

function normalizeSource(value: unknown, fallback: DataSourceStatus = "available"): DataSourceStatus {
  const source = cleanText(value, fallback, 40).toLowerCase();

  if (source === "live") {
    return "live";
  }

  if (source === "estimated") {
    return "estimated";
  }

  if (source === "unavailable") {
    return "unavailable";
  }

  return "available";
}

function safeUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  try {
    const url = new URL(value.trim());

    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function extractUrls(source: string) {
  return Array.from(source.matchAll(/https?:\/\/[^\s)>\]]+/g))
    .map((match) => safeUrl(match[0]))
    .filter(Boolean);
}

function firstMatchingLine(source: string, needles: string[]) {
  const lines = source.split(/\r?\n/);
  const matchedLine = lines.find((line) => {
    const normalized = line.toLowerCase();

    return needles.some((needle) => normalized.includes(needle));
  });

  if (!matchedLine) {
    return "";
  }

  return matchedLine
    .replace(/^[-*#\s:]+/, "")
    .replace(/^(exact decision requested|decision requested|decision|estimated review time|review time|what changed|changed):\s*/i, "")
    .trim();
}

function estimateFromText(source: string) {
  const explicit = firstMatchingLine(source, ["estimated review time", "review time"]);

  if (explicit && /\d/.test(explicit)) {
    return cleanText(explicit, "", 80);
  }

  const match = source.match(/\b(\d{1,2}\s?(?:min|mins|minute|minutes|hour|hours))\b/i);

  return match ? cleanText(match[1], "", 80) : "";
}

function parseReviewPackage(issue: LinearIssue): ReviewItem | null {
  if (issue.status !== "Review") {
    return null;
  }

  const urls = extractUrls(issue.description).filter((url) => !url.includes("linear.app/"));
  const reviewLink = urls.find((url) => url.includes("vercel.app") || url.toLowerCase().includes("preview")) ?? urls[0] ?? "";
  const decisionRequested = firstMatchingLine(issue.description, ["exact decision requested", "decision requested", "founder decision"]);
  const estimatedReviewTime = estimateFromText(issue.description);

  if (!reviewLink || !decisionRequested || !estimatedReviewTime) {
    return null;
  }

  return {
    dataSource: "live",
    decisionRequested: cleanText(decisionRequested, "Review and decide", 180),
    estimatedReviewTime,
    issueId: issue.identifier,
    product: issue.category,
    reviewLink,
    reviewLinkLabel: reviewLink.includes("vercel.app") ? "Preview" : "Review",
    title: issue.title,
    whatChanged: cleanText(firstMatchingLine(issue.description, ["what changed", "changed"]) || "Founder review package is complete.", "Founder review package is complete.", 180),
  };
}

function normalizeReviewItem(value: unknown): ReviewItem | null {
  const raw = toRecord(value);
  const issueId = cleanText(raw.issueId ?? raw.issue ?? raw.identifier, "", 24).toUpperCase();
  const reviewLink = safeUrl(raw.reviewLink ?? raw.previewUrl ?? raw.previewLink);
  const decisionRequested = cleanText(raw.decisionRequested ?? raw.decision, "", 180);
  const estimatedReviewTime = cleanText(raw.estimatedReviewTime ?? raw.reviewTime, "", 80);

  if (!/^USA-\d+$/.test(issueId) || !reviewLink || !decisionRequested || !estimatedReviewTime) {
    return null;
  }

  return {
    dataSource: normalizeSource(raw.dataSource ?? raw.source),
    decisionRequested,
    estimatedReviewTime,
    issueId,
    product: cleanText(raw.product ?? raw.project ?? raw.category, "Unassigned", 80),
    reviewLink,
    reviewLinkLabel: cleanText(raw.reviewLinkLabel ?? raw.linkLabel, "Review", 40),
    title: cleanText(raw.title, "Review package", 140),
    whatChanged: cleanText(raw.whatChanged ?? raw.changed, "Review package is complete.", 180),
  };
}

function normalizeActiveWork(value: unknown): ActiveWorkItem | null {
  const raw = toRecord(value);
  const category = cleanText(raw.category, "", 80);
  const status = cleanText(raw.status, "Planned", 40);
  const issueId = cleanText(raw.issueId ?? raw.issue ?? raw.identifier, "Untracked", 24).toUpperCase();

  if (!category || !CATEGORY_DEFINITIONS.some((definition) => definition.title === category)) {
    return null;
  }

  return {
    assignedRunner: cleanText(raw.assignedRunner ?? raw.runner, "Unknown", 60),
    blocker: cleanText(raw.blocker ?? raw.blockedBy, "", 140),
    category,
    currentProject: cleanText(raw.currentProject ?? raw.project ?? raw.title, "No tracked work packet", 140),
    dataSource: normalizeSource(raw.dataSource ?? raw.source),
    detailHref: safeUrl(raw.detailHref ?? raw.url) || undefined,
    issueId,
    mostRecentUpdate: cleanText(raw.mostRecentUpdate ?? raw.update, "No meaningful update reported", 180),
    nextMilestone: cleanText(raw.nextMilestone ?? raw.next, "Awaiting next milestone", 160),
    status: normalizeWorkStatus(status, status),
  };
}

function normalizeRecentActivity(value: unknown): RecentActivityItem | null {
  const raw = toRecord(value);
  const timestamp = toIso(raw.timestamp ?? raw.createdAt ?? raw.updatedAt);
  const title = cleanText(raw.title, "", 120);
  const detail = cleanText(raw.detail ?? raw.summary, "", 180);

  if (!timestamp || !title || !detail) {
    return null;
  }

  return {
    dataSource: normalizeSource(raw.dataSource ?? raw.source),
    detail,
    href: safeUrl(raw.href ?? raw.url) || undefined,
    label: cleanText(raw.label ?? raw.type, "Milestone", 40),
    timestamp,
    title,
  };
}

function normalizeToday(value: unknown): Partial<TodayBrief> | undefined {
  const raw = toRecord(value);

  if (!Object.keys(raw).length) {
    return undefined;
  }

  return {
    blocked: toArray(raw.blocked).map((item) => cleanText(item, "", 120)).filter(Boolean),
    completedToday: toArray(raw.completedToday ?? raw.completed).map((item) => cleanText(item, "", 120)).filter(Boolean),
    dataSource: normalizeSource(raw.dataSource ?? raw.source),
    importantChange: cleanText(raw.importantChange, "", 180),
    waitingForReview: toArray(raw.waitingForReview ?? raw.review).map((item) => cleanText(item, "", 120)).filter(Boolean),
    workingNow: toArray(raw.workingNow ?? raw.working).map((item) => cleanText(item, "", 120)).filter(Boolean),
  };
}

function normalizeRunner(value: unknown): RunnerCapacity | null {
  const raw = toRecord(value);
  const id = normalizeRunnerId(raw.id ?? raw.runner ?? raw.name);

  if (!id) {
    return null;
  }

  const status = normalizeRunnerStatus(raw.status);
  const cooldownUntil = toIso(raw.cooldownUntil ?? raw.resetAt ?? raw.cooldownReset);
  const lastSuccessfulRun = toIso(raw.lastSuccessfulRun ?? raw.lastSuccessAt);
  const exactUsageSource = cleanText(raw.usageSource ?? raw.providerSource, "", 80);
  const usagePercent = typeof raw.usageRemainingPercent === "number" && Number.isFinite(raw.usageRemainingPercent)
    ? Math.max(0, Math.min(100, Math.round(raw.usageRemainingPercent)))
    : null;
  const usageSummary = usagePercent !== null && exactUsageSource
    ? `Exact remaining ${usagePercent}% from ${exactUsageSource}`
    : cleanText(raw.usageSummary, "Exact remaining allowance unavailable", 140);

  return {
    cooldownReset: cooldownUntil ? formatDateTime(cooldownUntil) : cleanText(raw.cooldownReset, status === "Cooling Down" ? "Reset time unavailable" : "None reported", 80),
    currentIssue: cleanText(raw.currentIssue ?? raw.issue, "None reported", 80),
    dataSource: normalizeSource(raw.dataSource ?? raw.source),
    id,
    lastSuccessfulRun: lastSuccessfulRun ? formatDateTime(lastSuccessfulRun) : cleanText(raw.lastSuccessfulRun, "Unavailable", 80),
    name: id === "claude" ? "Claude" : id === "codex" ? "Codex" : "Dispatcher",
    recentLimitEvent: cleanText(raw.recentLimitEvent ?? raw.limitEvent, status === "Available" ? "No recent limit event" : "Unavailable", 120),
    recommendation: cleanText(raw.recommendation, "No recommendation reported", 120),
    status,
    statusDetail: cleanText(raw.statusDetail ?? raw.detail, status === "Available" ? "Available - no recent limit event" : status, 120),
    usageSummary,
  };
}

function normalizeRunnerOverride(value: unknown): RunnerOverrideState | undefined {
  const raw = toRecord(value);
  const requestedRunner = cleanText(raw.requestedRunner ?? raw.runner, "None", 40).toLowerCase();
  const updatedAt = toIso(raw.updatedAt ?? raw.createdAt);

  return {
    dataSource: normalizeSource(raw.dataSource ?? raw.source),
    requestedRunner: requestedRunner.includes("claude") ? "Claude" : requestedRunner.includes("codex") ? "Codex" : "None",
    status: cleanText(raw.status, "No override active", 120),
    updatedAt: updatedAt ? formatDateTime(updatedAt) : "Unavailable",
  };
}

async function readLimitedJsonFile(filePath: string) {
  const fileStat = await stat(filePath);

  if (fileStat.size > 512 * 1024) {
    throw new Error("Health file is larger than the safe dashboard read limit.");
  }

  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

async function loadDispatcherHealth(): Promise<DispatcherHealthResult> {
  const healthPath = process.env.OPERATIONS_CENTER_DISPATCHER_HEALTH_PATH;

  if (!healthPath) {
    return {
      activeWork: [],
      needsAttention: [],
      note: "Dispatcher health path is not configured.",
      recentActivity: [],
      runners: [],
      status: "unavailable",
    };
  }

  try {
    const raw = toRecord(await readLimitedJsonFile(healthPath)) as RawDispatcherHealth;
    const runners = Array.isArray(raw.runners)
      ? raw.runners.map(normalizeRunner).filter((runner): runner is RunnerCapacity => Boolean(runner))
      : Object.values(toRecord(raw.runners)).map(normalizeRunner).filter((runner): runner is RunnerCapacity => Boolean(runner));

    return {
      activeWork: toArray(raw.activeWork).map(normalizeActiveWork).filter((item): item is ActiveWorkItem => Boolean(item)),
      generatedAt: toIso(raw.generatedAt),
      needsAttention: toArray(raw.needsAttention).map(normalizeReviewItem).filter((item): item is ReviewItem => Boolean(item)),
      recentActivity: toArray(raw.recentActivity).map(normalizeRecentActivity).filter((item): item is RecentActivityItem => Boolean(item)),
      runnerOverride: normalizeRunnerOverride(raw.runnerOverride),
      runners,
      status: "available",
      today: normalizeToday(raw.today),
    };
  } catch (error) {
    return {
      activeWork: [],
      needsAttention: [],
      note: cleanText(error instanceof Error ? error.message : String(error), "Dispatcher health could not be read."),
      recentActivity: [],
      runners: [],
      status: "unavailable",
    };
  }
}

function linearAuthHeader(apiKey: string) {
  return apiKey.startsWith("Bearer ") ? apiKey : apiKey;
}

async function loadLinearIssues(): Promise<LinearIssueResult> {
  const apiKey = process.env.OPERATIONS_CENTER_LINEAR_API_KEY || process.env.LINEAR_API_KEY;

  if (!apiKey) {
    return {
      issues: [],
      note: "Linear API key is not configured.",
      status: "unavailable",
    };
  }

  const fields = `
    fragment FounderCommandCenterIssueFields on Issue {
      id
      identifier
      title
      description
      url
      createdAt
      updatedAt
      state { name type }
      assignee { name }
      project { name }
      labels { nodes { name } }
    }
  `;
  const issueQueries = TRACKED_LINEAR_ISSUE_IDS.map((issueId) => {
    const alias = `issue${issueId.replace("-", "")}`;

    return `${alias}: issue(id: "${issueId}") { ...FounderCommandCenterIssueFields }`;
  }).join("\n");

  try {
    const response = await fetch("https://api.linear.app/graphql", {
      body: JSON.stringify({
        query: `query FounderCommandCenterIssues { ${issueQueries} } ${fields}`,
      }),
      cache: "no-store",
      headers: {
        Authorization: linearAuthHeader(apiKey),
        "Content-Type": "application/json",
      },
      method: "POST",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return {
        issues: [],
        note: `Linear returned HTTP ${response.status}.`,
        status: "unavailable",
      };
    }

    const payload = await response.json() as {
      data?: Record<string, unknown>;
      errors?: Array<{ message?: string }>;
    };
    const issues = Object.values(payload.data ?? {}).map((value) => {
      const raw = toRecord(value);
      const labels = toArray(toRecord(raw.labels).nodes).map((label) => cleanText(toRecord(label).name, "", 80)).filter(Boolean);
      const state = toRecord(raw.state);
      const issue: LinearIssue = {
        assigneeName: cleanText(toRecord(raw.assignee).name, "Unknown", 80),
        category: "",
        createdAt: toIso(raw.createdAt),
        description: typeof raw.description === "string" ? raw.description : "",
        id: cleanText(raw.id, "", 80),
        identifier: cleanText(raw.identifier, "", 24),
        labels,
        projectName: cleanText(toRecord(raw.project).name, "No Linear project", 100),
        stateName: cleanText(state.name, "Planned", 60),
        stateType: cleanText(state.type, "", 60),
        status: normalizeWorkStatus(cleanText(state.name, ""), cleanText(state.type, "")),
        title: cleanText(raw.title, "Untitled issue", 160),
        updatedAt: toIso(raw.updatedAt),
        url: safeUrl(raw.url),
      };

      return {
        ...issue,
        category: categoryForIssue(issue),
      };
    }).filter((issue) => issue.identifier && issue.title);

    return {
      issues,
      note: payload.errors?.length ? cleanText(payload.errors.map((error) => error.message).join("; "), "Linear returned partial errors.") : undefined,
      status: issues.length ? "live" : "unavailable",
    };
  } catch (error) {
    return {
      issues: [],
      note: cleanText(error instanceof Error ? error.message : String(error), "Linear could not be reached."),
      status: "unavailable",
    };
  }
}

function nextMilestoneForIssue(issue: LinearIssue) {
  if (issue.status === "Review") {
    return "Founder decision";
  }

  if (issue.status === "Blocked") {
    return "Clear blocker";
  }

  if (issue.status === "Complete") {
    return "No next milestone";
  }

  if (issue.status === "Working") {
    return "Working preview or review package";
  }

  if (issue.status === "Waiting") {
    return "Waiting reason resolved";
  }

  return "Runner pickup";
}

function blockerForIssue(issue: LinearIssue) {
  if (issue.status !== "Blocked") {
    return "";
  }

  return cleanText(
    firstMatchingLine(issue.description, ["true blocker", "blocked by", "blocker", "blocked"]),
    "Open blocker noted in Linear",
    140,
  );
}

function latestUpdateForIssue(issue: LinearIssue) {
  if (issue.status === "Review") {
    return parseReviewPackage(issue)
      ? `Usable review package ready ${formatDateTime(issue.updatedAt)}`
      : `In review without a usable package ${formatDateTime(issue.updatedAt)}`;
  }

  if (issue.status === "Blocked") {
    return blockerForIssue(issue);
  }

  if (issue.status === "Working") {
    return `Work in progress as of ${formatDateTime(issue.updatedAt)}`;
  }

  if (issue.status === "Waiting") {
    return `Waiting state updated ${formatDateTime(issue.updatedAt)}`;
  }

  if (issue.status === "Queued") {
    return `Queued for runner pickup ${formatDateTime(issue.updatedAt)}`;
  }

  return `Updated ${formatDateTime(issue.updatedAt)}`;
}

function buildActiveWork(issues: LinearIssue[], dispatcherItems: ActiveWorkItem[]) {
  const byIssue = new Map<string, ActiveWorkItem>();

  issues
    .filter((issue) => issue.status !== "Complete")
    .forEach((issue) => {
      byIssue.set(issue.identifier, {
        assignedRunner: issue.assigneeName,
        blocker: blockerForIssue(issue),
        category: issue.category,
        currentProject: issue.title,
        dataSource: "live",
        detailHref: issue.url,
        issueId: issue.identifier,
        mostRecentUpdate: latestUpdateForIssue(issue),
        nextMilestone: nextMilestoneForIssue(issue),
        status: issue.status,
      });
    });

  dispatcherItems.forEach((item) => {
    byIssue.set(item.issueId || `${item.category}:${item.currentProject}`, item);
  });

  const statusRank: Record<WorkStatus, number> = {
    Blocked: 0,
    Review: 1,
    Working: 2,
    Waiting: 3,
    Queued: 4,
    Planned: 5,
    Complete: 6,
  };

  return Array.from(byIssue.values())
    .filter((item) => item.status !== "Complete")
    .sort((a, b) => {
      const statusSort = statusRank[a.status] - statusRank[b.status];

      if (statusSort !== 0) {
        return statusSort;
      }

      return a.category.localeCompare(b.category) || a.issueId.localeCompare(b.issueId);
    });
}

function completionActivityIssueId(item: RecentActivityItem) {
  const match = `${item.title} ${item.detail}`.match(/\bUSA-\d+\b/i);

  return match ? match[0].toUpperCase() : "Milestone";
}

function buildCompletedRecently(issues: LinearIssue[], dispatcherActivity: RecentActivityItem[]): CompletedWorkItem[] {
  const completionWords = ["complete", "completed", "finished", "review ready", "preview published"];
  const byIssue = new Map<string, CompletedWorkItem>();

  dispatcherActivity
    .filter((item) => {
      const text = `${item.label} ${item.title} ${item.detail}`.toLowerCase();

      return completionWords.some((word) => text.includes(word));
    })
    .forEach((item) => {
      const issueId = completionActivityIssueId(item);

      byIssue.set(`${issueId}:${item.timestamp}`, {
        completedAt: item.timestamp,
        dataSource: item.dataSource,
        detail: item.detail,
        href: item.href,
        issueId,
        product: "Operations",
        title: item.title,
      });
    });

  issues
    .filter((issue) => issue.status === "Complete" && issue.updatedAt)
    .forEach((issue) => {
      byIssue.set(issue.identifier, {
        completedAt: issue.updatedAt,
        dataSource: "live",
        detail: `${issue.projectName} - completed in Linear`,
        href: issue.url,
        issueId: issue.identifier,
        product: issue.category,
        title: issue.title,
      });
    });

  return Array.from(byIssue.values())
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 6);
}

function buildTodayBrief(issues: LinearIssue[], reviewItems: ReviewItem[], dispatcherToday?: Partial<TodayBrief>): TodayBrief {
  const completedToday = dispatcherToday?.completedToday?.length
    ? dispatcherToday.completedToday
    : issues
      .filter((issue) => issue.status === "Complete" && isToday(issue.updatedAt))
      .map((issue) => `${issue.identifier}: ${issue.title}`)
      .slice(0, 4);
  const workingNow = dispatcherToday?.workingNow?.length
    ? dispatcherToday.workingNow
    : issues
      .filter((issue) => issue.status === "Working")
      .map((issue) => `${issue.identifier}: ${issue.title}`)
      .slice(0, 4);
  const waitingForReview = dispatcherToday?.waitingForReview?.length
    ? dispatcherToday.waitingForReview
    : reviewItems.map((item) => `${item.issueId}: ${item.title}`).slice(0, 4);
  const blocked = dispatcherToday?.blocked?.length
    ? dispatcherToday.blocked
    : issues
      .filter((issue) => issue.status === "Blocked")
      .map((issue) => `${issue.identifier}: ${issue.title}`)
      .slice(0, 4);
  const latestIssue = [...issues].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  return {
    blocked,
    completedToday,
    dataSource: dispatcherToday?.dataSource ?? (issues.length ? "live" : "unavailable"),
    importantChange: dispatcherToday?.importantChange
      || (latestIssue ? `${latestIssue.identifier} updated ${formatDateTime(latestIssue.updatedAt)}.` : "Unavailable until Linear or dispatcher health is connected."),
    waitingForReview,
    workingNow,
  };
}

function buildRecentActivity(issues: LinearIssue[], dispatcherActivity: RecentActivityItem[]) {
  if (dispatcherActivity.length) {
    return dispatcherActivity
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }

  return issues
    .filter((issue) => issue.updatedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8)
    .map((issue) => ({
      dataSource: "live" as DataSourceStatus,
      detail: `${issue.status} - ${issue.projectName}`,
      href: issue.url,
      label: "Linear update",
      timestamp: issue.updatedAt,
      title: `${issue.identifier}: ${issue.title}`,
    }));
}

function mergeRunners(dispatcherRunners: RunnerCapacity[]) {
  const byId = new Map<RunnerId, RunnerCapacity>();

  DEFAULT_RUNNERS.forEach((runner) => byId.set(runner.id, runner));
  dispatcherRunners.forEach((runner) => byId.set(runner.id, runner));

  const runners = ["claude", "codex", "dispatcher"].map((id) => byId.get(id as RunnerId)).filter((runner): runner is RunnerCapacity => Boolean(runner));
  const eligible = runners.filter((runner) => (
    (runner.id === "claude" || runner.id === "codex")
    && runner.status === "Available"
  ));

  if (eligible.length) {
    return runners.map((runner) => (
      runner.id === eligible[0].id
        ? { ...runner, recommendation: "Best available for next large build" }
        : runner
    ));
  }

  return runners;
}

function mergeReviewItems(linearItems: ReviewItem[], dispatcherItems: ReviewItem[]) {
  const byIssue = new Map<string, ReviewItem>();

  linearItems.forEach((item) => byIssue.set(item.issueId, item));
  dispatcherItems.forEach((item) => byIssue.set(item.issueId, item));

  return Array.from(byIssue.values());
}

function fallbackRunnerOverride(): RunnerOverrideState {
  return {
    dataSource: "unavailable",
    requestedRunner: "None",
    status: "No override state connected",
    updatedAt: "Unavailable",
  };
}

export async function getOperationsCenterData(): Promise<OperationsCenterData> {
  const [linear, dispatcher] = await Promise.all([
    loadLinearIssues(),
    loadDispatcherHealth(),
  ]);
  const needsAttention = mergeReviewItems(
    linear.issues.map(parseReviewPackage).filter((item): item is ReviewItem => Boolean(item)),
    dispatcher.needsAttention,
  );
  const dataNotes = [linear.note, dispatcher.note].filter((note): note is string => Boolean(note));

  return {
    activeWork: buildActiveWork(linear.issues, dispatcher.activeWork),
    completedRecently: buildCompletedRecently(linear.issues, dispatcher.recentActivity),
    dataNotes,
    dispatcherSource: dispatcher.status,
    generatedAt: dispatcher.generatedAt || new Date().toISOString(),
    linearSource: linear.status,
    needsAttention,
    recentActivity: buildRecentActivity(linear.issues, dispatcher.recentActivity),
    runnerOverride: dispatcher.runnerOverride ?? fallbackRunnerOverride(),
    runners: mergeRunners(dispatcher.runners),
    today: buildTodayBrief(linear.issues, needsAttention, dispatcher.today),
  };
}

export async function appendOperationsCenterAction(payload: {
  actorEmail: string;
  actorUserId: string;
  decision?: FounderDecision;
  issueId?: string;
  requestedRunner?: OverrideRunnerId;
  type: "founder_decision" | "runner_override";
}) {
  const actionPath = process.env.OPERATIONS_CENTER_ACTION_OUTBOX_PATH || "/tmp/usam-operations-center-actions.jsonl";
  const entry = {
    ...payload,
    createdAt: new Date().toISOString(),
    source: "founder-command-center",
  };

  await mkdir(dirname(actionPath), { recursive: true });
  await appendFile(actionPath, `${JSON.stringify(entry)}\n`, "utf8");
}
