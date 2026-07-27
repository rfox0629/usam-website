import "server-only";

export type OperationState =
  | "blocked"
  | "executing"
  | "idle"
  | "in_review"
  | "queued"
  | "stale_offline"
  | "unavailable";

export type OperationSourceStatus = "error" | "live" | "stale" | "unavailable";

export type OperationMilestone = {
  name: string;
  progress: number | null;
  source: "issue" | "project";
  status: string | null;
  targetDate: string | null;
};

export type OperationIssue = {
  agent: "Claude" | "Codex" | null;
  createdAt: string | null;
  identifier: string;
  latestActivityAt: string | null;
  milestone: OperationMilestone | null;
  projectId: string | null;
  projectName: string | null;
  startTime: string | null;
  stateName: string;
  stateType: string;
  status: OperationState;
  title: string;
  url: string | null;
};

export type OperationDepartment = {
  blockedCount: number;
  completedCount: number;
  currentIssue: OperationIssue | null;
  currentMilestone: OperationMilestone | null;
  executingCount: number;
  idleReason: string;
  inReviewCount: number;
  issueCount: number;
  lastActivityAt: string | null;
  name: string;
  projectState: string | null;
  queuedCount: number;
  status: OperationState;
  url: string | null;
};

export type OperationAgentState = {
  agent: "Claude" | "Codex";
  detail: string;
  issue: OperationIssue | null;
  latestActivityAt: string | null;
  source: "dispatcher" | "linear" | "unavailable";
  state: OperationState;
};

export type OperationsCenterData = {
  agentStates: OperationAgentState[];
  blockedIssues: OperationIssue[];
  currentIssues: OperationIssue[];
  departments: OperationDepartment[];
  dispatcher: {
    detail: string;
    heartbeatAt: string | null;
    mode: string;
    status: OperationSourceStatus;
  };
  generatedAt: string;
  linear: {
    detail: string;
    fetchedAt: string | null;
    issueCount: number | null;
    projectCount: number | null;
    status: OperationSourceStatus;
  };
  queueIssues: OperationIssue[];
  reviewIssues: OperationIssue[];
  summary: {
    blocked: number | null;
    executing: number | null;
    idle: number | null;
    inReview: number | null;
    queued: number | null;
    staleOffline: number;
  };
};

type LinearLabel = {
  name?: unknown;
};

type LinearMilestone = {
  name?: unknown;
  progress?: unknown;
  status?: unknown;
  targetDate?: unknown;
};

type LinearProject = {
  completedAt?: unknown;
  createdAt?: unknown;
  id?: unknown;
  name?: unknown;
  projectMilestones?: {
    nodes?: LinearMilestone[] | null;
  } | null;
  startedAt?: unknown;
  state?: unknown;
  targetDate?: unknown;
  updatedAt?: unknown;
  url?: unknown;
};

type LinearIssue = {
  assignee?: {
    name?: unknown;
  } | null;
  completedAt?: unknown;
  createdAt?: unknown;
  id?: unknown;
  identifier?: unknown;
  labels?: {
    nodes?: LinearLabel[] | null;
  } | null;
  project?: {
    id?: unknown;
    name?: unknown;
    state?: unknown;
    url?: unknown;
  } | null;
  projectMilestone?: LinearMilestone | null;
  startedAt?: unknown;
  state?: {
    name?: unknown;
    type?: unknown;
  } | null;
  title?: unknown;
  updatedAt?: unknown;
  url?: unknown;
};

type LinearQueryData = {
  issues?: {
    nodes?: LinearIssue[] | null;
  } | null;
  projects?: {
    nodes?: LinearProject[] | null;
  } | null;
};

type LinearQueryResponse = {
  data?: LinearQueryData;
  errors?: Array<{ message?: string }>;
};

type LinearLoadResult =
  | {
      detail: string;
      fetchedAt: null;
      issues: [];
      projects: [];
      status: Exclude<OperationSourceStatus, "live">;
    }
  | {
      detail: string;
      fetchedAt: string;
      issues: OperationIssue[];
      projects: SanitizedProject[];
      status: "live";
    };

type SanitizedProject = {
  createdAt: string | null;
  id: string;
  milestones: OperationMilestone[];
  name: string;
  state: string | null;
  updatedAt: string | null;
  url: string | null;
};

const LINEAR_API_URL = "https://api.linear.app/graphql";
const LINEAR_RESULT_LIMIT = 100;
const STALE_HEARTBEAT_MINUTES = 15;
const STALE_DEPARTMENT_DAYS = 14;

const LINEAR_QUERY = `
query OperationsCenterLinear($issueFirst: Int!, $projectFirst: Int!) {
  issues(first: $issueFirst, orderBy: updatedAt) {
    nodes {
      id
      identifier
      title
      url
      createdAt
      updatedAt
      startedAt
      completedAt
      assignee {
        name
      }
      state {
        name
        type
      }
      project {
        id
        name
        state
        url
      }
      labels {
        nodes {
          name
        }
      }
      projectMilestone {
        name
        status
        progress
        targetDate
      }
    }
  }
  projects(first: $projectFirst, orderBy: updatedAt) {
    nodes {
      id
      name
      url
      state
      createdAt
      updatedAt
      startedAt
      completedAt
      targetDate
      projectMilestones(first: 8) {
        nodes {
          name
          status
          progress
          targetDate
        }
      }
    }
  }
}
`;

const LINEAR_FALLBACK_QUERY = `
query OperationsCenterLinearFallback($issueFirst: Int!, $projectFirst: Int!) {
  issues(first: $issueFirst) {
    nodes {
      id
      identifier
      title
      url
      createdAt
      updatedAt
      startedAt
      completedAt
      assignee {
        name
      }
      state {
        name
        type
      }
      project {
        id
        name
        url
      }
      labels {
        nodes {
          name
        }
      }
    }
  }
  projects(first: $projectFirst) {
    nodes {
      id
      name
      url
      updatedAt
    }
  }
}
`;

function cleanText(value: unknown, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.replace(/\s+/g, " ").trim() || fallback;
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function cleanDate(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "linear.app" ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanProgress(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(1, value));
}

function stateFromIssue(stateName: string, stateType: string) {
  const normalizedName = stateName.toLowerCase();
  const normalizedType = stateType.toLowerCase();

  if (
    normalizedName.includes("block")
    || normalizedName.includes("conflict")
    || normalizedName.includes("dependency")
    || normalizedName.includes("failed")
    || normalizedName.includes("failing")
  ) {
    return "blocked" as const;
  }

  if (normalizedName.includes("review") || normalizedName.includes("approval")) {
    return "in_review" as const;
  }

  if (normalizedType === "started" || normalizedName.includes("progress") || normalizedName.includes("executing")) {
    return "executing" as const;
  }

  if (
    normalizedType === "backlog"
    || normalizedType === "triage"
    || normalizedType === "unstarted"
    || normalizedName.includes("queued")
    || normalizedName.includes("todo")
    || normalizedName.includes("ready")
  ) {
    return "queued" as const;
  }

  return "idle" as const;
}

function labelsFromIssue(issue: LinearIssue) {
  return (issue.labels?.nodes ?? [])
    .map((label) => cleanText(label.name))
    .filter(Boolean)
    .slice(0, 8);
}

function agentFromIssue(issue: LinearIssue) {
  const assignee = cleanText(issue.assignee?.name);
  const labels = labelsFromIssue(issue).join(" ");
  const title = cleanText(issue.title);
  const haystack = `${assignee} ${labels} ${title}`.toLowerCase();

  if (haystack.includes("codex")) {
    return "Codex" as const;
  }

  if (haystack.includes("claude")) {
    return "Claude" as const;
  }

  return null;
}

function sanitizeMilestone(value: LinearMilestone | null | undefined, source: "issue" | "project") {
  const name = cleanText(value?.name);

  if (!name) {
    return null;
  }

  return {
    name: truncateText(name, 80),
    progress: cleanProgress(value?.progress),
    source,
    status: cleanText(value?.status) || null,
    targetDate: cleanDate(value?.targetDate),
  };
}

function sanitizeIssue(issue: LinearIssue): OperationIssue | null {
  const identifier = cleanText(issue.identifier);
  const title = cleanText(issue.title);

  if (!identifier || !title) {
    return null;
  }

  const stateName = cleanText(issue.state?.name, "No state");
  const stateType = cleanText(issue.state?.type, "unknown");

  return {
    agent: agentFromIssue(issue),
    createdAt: cleanDate(issue.createdAt),
    identifier: truncateText(identifier, 24),
    latestActivityAt: cleanDate(issue.updatedAt),
    milestone: sanitizeMilestone(issue.projectMilestone, "issue"),
    projectId: cleanText(issue.project?.id) || null,
    projectName: cleanText(issue.project?.name) || null,
    startTime: cleanDate(issue.startedAt) ?? cleanDate(issue.updatedAt),
    stateName: truncateText(stateName, 60),
    stateType: truncateText(stateType, 40),
    status: stateFromIssue(stateName, stateType),
    title: truncateText(title, 140),
    url: cleanUrl(issue.url),
  };
}

function sanitizeProject(project: LinearProject): SanitizedProject | null {
  const id = cleanText(project.id);
  const name = cleanText(project.name);

  if (!id || !name) {
    return null;
  }

  const milestones = (project.projectMilestones?.nodes ?? [])
    .map((milestone) => sanitizeMilestone(milestone, "project"))
    .filter((milestone): milestone is OperationMilestone => Boolean(milestone));

  return {
    createdAt: cleanDate(project.createdAt),
    id,
    milestones,
    name: truncateText(name, 90),
    state: cleanText(project.state) || null,
    updatedAt: cleanDate(project.updatedAt),
    url: cleanUrl(project.url),
  };
}

async function queryLinear(apiKey: string, query: string): Promise<LinearQueryData> {
  const response = await fetch(LINEAR_API_URL, {
    body: JSON.stringify({
      query,
      variables: {
        issueFirst: LINEAR_RESULT_LIMIT,
        projectFirst: 50,
      },
    }),
    cache: "no-store",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Linear API returned HTTP ${response.status}.`);
  }

  const payload = await response.json() as LinearQueryResponse;
  const firstError = payload.errors?.find((error) => cleanText(error.message));

  if (firstError?.message) {
    throw new Error(firstError.message);
  }

  return payload.data ?? {};
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Linear data could not be loaded.";
  return truncateText(message.replace(/lin_api_[A-Za-z0-9_-]+/g, "[redacted]"), 180);
}

async function loadLinearData(): Promise<LinearLoadResult> {
  const apiKey = process.env.LINEAR_API_KEY?.trim();

  if (!apiKey) {
    return {
      detail: "Linear server credentials are not configured. Linear project and issue states are unavailable.",
      fetchedAt: null,
      issues: [],
      projects: [],
      status: "unavailable",
    };
  }

  try {
    let data: LinearQueryData;

    try {
      data = await queryLinear(apiKey, LINEAR_QUERY);
    } catch {
      data = await queryLinear(apiKey, LINEAR_FALLBACK_QUERY);
    }

    const issues = (data.issues?.nodes ?? [])
      .map(sanitizeIssue)
      .filter((issue): issue is OperationIssue => Boolean(issue))
      .sort(compareByActivity);
    const projects = (data.projects?.nodes ?? [])
      .map(sanitizeProject)
      .filter((project): project is SanitizedProject => Boolean(project))
      .sort((first, second) => {
        return dateValue(second.updatedAt) - dateValue(first.updatedAt);
      });

    return {
      detail: "Live Linear project and issue states loaded server-side.",
      fetchedAt: new Date().toISOString(),
      issues,
      projects,
      status: "live",
    };
  } catch (error) {
    return {
      detail: safeErrorMessage(error),
      fetchedAt: null,
      issues: [],
      projects: [],
      status: "error",
    };
  }
}

function readDispatcherState() {
  const heartbeatAt = cleanDate(process.env.OPERATIONS_DISPATCHER_HEARTBEAT_AT);
  const mode = cleanText(process.env.OPERATIONS_DISPATCHER_MODE, "Unavailable");

  if (!heartbeatAt) {
    return {
      detail: "Dispatcher heartbeat ingestion is not connected yet.",
      heartbeatAt: null,
      mode,
      status: "unavailable" as const,
    };
  }

  const minutesOld = (Date.now() - new Date(heartbeatAt).getTime()) / 60000;

  if (minutesOld > STALE_HEARTBEAT_MINUTES) {
    return {
      detail: `Last heartbeat is older than ${STALE_HEARTBEAT_MINUTES} minutes.`,
      heartbeatAt,
      mode,
      status: "stale" as const,
    };
  }

  return {
    detail: "Dispatcher heartbeat is current.",
    heartbeatAt,
    mode,
    status: "live" as const,
  };
}

function dateValue(value: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function compareByActivity(first: OperationIssue, second: OperationIssue) {
  return dateValue(second.latestActivityAt) - dateValue(first.latestActivityAt);
}

function countIssues(issues: readonly OperationIssue[]) {
  return issues.reduce(
    (counts, issue) => {
      if (issue.status === "blocked") {
        counts.blocked += 1;
      } else if (issue.status === "executing") {
        counts.executing += 1;
      } else if (issue.status === "in_review") {
        counts.inReview += 1;
      } else if (issue.status === "queued") {
        counts.queued += 1;
      }

      if (issue.stateType.toLowerCase() === "completed" || issue.stateName.toLowerCase().includes("done")) {
        counts.completed += 1;
      }

      return counts;
    },
    {
      blocked: 0,
      completed: 0,
      executing: 0,
      inReview: 0,
      queued: 0,
    },
  );
}

function currentMilestoneFor(project: SanitizedProject, issues: readonly OperationIssue[]) {
  const projectMilestone = project.milestones.find((milestone) => {
    const status = milestone.status?.toLowerCase() ?? "";
    return !status.includes("complete") && !status.includes("cancel");
  }) ?? null;

  if (projectMilestone) {
    return projectMilestone;
  }

  const issueMilestone = issues.find((issue) => issue.milestone)?.milestone ?? null;

  if (issueMilestone) {
    return issueMilestone;
  }

  return null;
}

function isDepartmentStale(project: SanitizedProject, issues: readonly OperationIssue[]) {
  const latestIssueActivity = issues.reduce((latest, issue) => {
    return Math.max(latest, dateValue(issue.latestActivityAt));
  }, 0);
  const latestActivity = Math.max(latestIssueActivity, dateValue(project.updatedAt));

  if (!latestActivity) {
    return false;
  }

  return Date.now() - latestActivity > STALE_DEPARTMENT_DAYS * 24 * 60 * 60 * 1000;
}

function statusForDepartment(project: SanitizedProject, issues: readonly OperationIssue[]) {
  const counts = countIssues(issues);

  if (counts.executing > 0) {
    return "executing" as const;
  }

  if (counts.blocked > 0) {
    return "blocked" as const;
  }

  if (counts.inReview > 0) {
    return "in_review" as const;
  }

  if (counts.queued > 0) {
    return "queued" as const;
  }

  if (isDepartmentStale(project, issues)) {
    return "stale_offline" as const;
  }

  return "idle" as const;
}

function buildDepartments(
  projects: readonly SanitizedProject[],
  issues: readonly OperationIssue[],
) {
  return projects.map((project) => {
    const projectIssues = issues.filter((issue) => issue.projectId === project.id);
    const counts = countIssues(projectIssues);
    const currentIssue = projectIssues.find((issue) => issue.status === "executing") ?? null;
    const latestIssueActivity = projectIssues.reduce((latest, issue) => {
      return Math.max(latest, dateValue(issue.latestActivityAt));
    }, 0);
    const lastActivityAt = Math.max(latestIssueActivity, dateValue(project.updatedAt));

    return {
      blockedCount: counts.blocked,
      completedCount: counts.completed,
      currentIssue,
      currentMilestone: currentMilestoneFor(project, projectIssues),
      executingCount: counts.executing,
      idleReason: currentIssue
        ? "Linear issue is in a started workflow state."
        : "No Linear issue is currently in a started workflow state for this project.",
      inReviewCount: counts.inReview,
      issueCount: projectIssues.length,
      lastActivityAt: lastActivityAt > 0 ? new Date(lastActivityAt).toISOString() : project.updatedAt,
      name: project.name,
      projectState: project.state,
      queuedCount: counts.queued,
      status: statusForDepartment(project, projectIssues),
      url: project.url,
    };
  });
}

function buildAgentStates(issues: readonly OperationIssue[], linearStatus: OperationSourceStatus) {
  return (["Codex", "Claude"] as const).map((agent) => {
    const activeIssue = issues.find((issue) => issue.agent === agent && issue.status === "executing") ?? null;

    if (activeIssue) {
      return {
        agent,
        detail: "Matched from Linear assignee, label, or title on a started issue.",
        issue: activeIssue,
        latestActivityAt: activeIssue.latestActivityAt,
        source: "linear" as const,
        state: "executing" as const,
      };
    }

    if (linearStatus === "live") {
      return {
        agent,
        detail: `No started Linear issue is labeled or assigned to ${agent}.`,
        issue: null,
        latestActivityAt: null,
        source: "linear" as const,
        state: "idle" as const,
      };
    }

    return {
      agent,
      detail: "Dispatcher workforce registry is not connected yet.",
      issue: null,
      latestActivityAt: null,
      source: "unavailable" as const,
      state: "unavailable" as const,
    };
  });
}

export async function loadOperationsCenterData(): Promise<OperationsCenterData> {
  const linear = await loadLinearData();
  const dispatcher = readDispatcherState();
  const departments = linear.status === "live"
    ? buildDepartments(linear.projects, linear.issues)
    : [];
  const counts = countIssues(linear.issues);
  const staleDepartmentCount = departments.filter((department) => department.status === "stale_offline").length;
  const staleSourceCount = linear.status === "live" ? 0 : 1;
  const staleDispatcherCount = dispatcher.status === "live" ? 0 : 1;

  return {
    agentStates: buildAgentStates(linear.issues, linear.status),
    blockedIssues: linear.issues.filter((issue) => issue.status === "blocked").slice(0, 6),
    currentIssues: linear.issues.filter((issue) => issue.status === "executing").slice(0, 6),
    departments,
    dispatcher,
    generatedAt: new Date().toISOString(),
    linear: {
      detail: linear.detail,
      fetchedAt: linear.fetchedAt,
      issueCount: linear.status === "live" ? linear.issues.length : null,
      projectCount: linear.status === "live" ? linear.projects.length : null,
      status: linear.status,
    },
    queueIssues: linear.issues.filter((issue) => issue.status === "queued").slice(0, 6),
    reviewIssues: linear.issues.filter((issue) => issue.status === "in_review").slice(0, 6),
    summary: {
      blocked: linear.status === "live" ? counts.blocked : null,
      executing: linear.status === "live" ? counts.executing : null,
      idle: linear.status === "live" ? departments.filter((department) => department.status === "idle").length : null,
      inReview: linear.status === "live" ? counts.inReview : null,
      queued: linear.status === "live" ? counts.queued : null,
      staleOffline: staleSourceCount + staleDispatcherCount + staleDepartmentCount,
    },
  };
}
