import "server-only";

import { readFile } from "node:fs/promises";
import {
  buildOperationsCenterData,
  redactOperationsText,
  type OperationsCenterData,
  type OperationsSource,
} from "./workforce-status";

const LINEAR_API_URL = "https://api.linear.app/graphql";
const LINEAR_ISSUE_LIMIT = 100;

const LINEAR_QUERY = `
query OperationsCenterIssues($first: Int!) {
  issues(first: $first, orderBy: updatedAt) {
    nodes {
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
        name
      }
      labels {
        nodes {
          name
          parent {
            name
          }
        }
      }
    }
  }
}
`;

type LinearResponse = {
  data?: {
    issues?: {
      nodes?: unknown[];
    } | null;
  };
  errors?: Array<{ message?: string }>;
};

function envValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function safeError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return redactOperationsText(message, fallback, 220);
}

async function loadFeedFromUrl(url: string) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error("USAM_WORKFORCE_STATUS_URL is not a valid URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("USAM_WORKFORCE_STATUS_URL must use HTTPS.");
  }

  const response = await fetch(parsed.toString(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`USA-147 feed returned HTTP ${response.status}.`);
  }

  return response.json();
}

async function loadFeedFromFile(path: string) {
  const payload = await readFile(path, "utf8");
  return JSON.parse(payload);
}

async function loadWorkforceFeed() {
  const feedUrl = envValue("USAM_WORKFORCE_STATUS_URL");
  const feedFile = envValue("USAM_WORKFORCE_STATUS_FILE");

  if (feedUrl) {
    try {
      return {
        feed: await loadFeedFromUrl(feedUrl),
        source: "url" as const,
      };
    } catch (error) {
      return {
        error: safeError(error, "USA-147 feed endpoint could not be loaded."),
        feed: null,
        source: "url" as const,
      };
    }
  }

  if (feedFile) {
    try {
      return {
        feed: await loadFeedFromFile(feedFile),
        source: "file" as const,
      };
    } catch (error) {
      return {
        error: safeError(error, "USA-147 feed file could not be loaded."),
        feed: null,
        source: "file" as const,
      };
    }
  }

  return {
    feed: null,
    source: "unconfigured" as const,
  };
}

async function loadLinearIssues() {
  const apiKey = envValue("OPERATIONS_CENTER_LINEAR_API_KEY", "LINEAR_API_KEY");
  const unavailableSource: OperationsSource = {
    detail: "Linear server credentials are not configured for this preview.",
    fetchedAt: null,
    status: "unavailable",
  };

  if (!apiKey) {
    return {
      issues: [],
      source: unavailableSource,
    };
  }

  try {
    const response = await fetch(LINEAR_API_URL, {
      body: JSON.stringify({
        query: LINEAR_QUERY,
        variables: {
          first: LINEAR_ISSUE_LIMIT,
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

    const payload = await response.json() as LinearResponse;
    const firstError = payload.errors?.find((error) => error.message);
    if (firstError?.message) {
      throw new Error(firstError.message);
    }

    return {
      issues: payload.data?.issues?.nodes ?? [],
      source: {
        detail: "Live Linear issue states loaded server-side.",
        fetchedAt: new Date().toISOString(),
        status: "live" as const,
      },
    };
  } catch (error) {
    return {
      issues: [],
      source: {
        detail: safeError(error, "Linear issue data could not be loaded."),
        fetchedAt: null,
        status: "error" as const,
      },
    };
  }
}

export async function loadOperationsCenterData(now = new Date()): Promise<OperationsCenterData> {
  const [feedResult, linearResult] = await Promise.all([
    loadWorkforceFeed(),
    loadLinearIssues(),
  ]);
  const data = buildOperationsCenterData({
    feed: feedResult.feed,
    linearIssues: linearResult.issues,
    linearSource: linearResult.source,
    now,
  });

  if (feedResult.error) {
    data.sources.workforceFeed = {
      detail: feedResult.error,
      fetchedAt: null,
      status: "error",
    };
    data.alerts.unshift({
      code: "workforce_feed_load_failed",
      detail: feedResult.error,
      issue: null,
      severity: "red",
    });
  }

  if (feedResult.source === "file" && data.sources.workforceFeed.status === "live") {
    data.sources.workforceFeed.detail = "USA-147 feed loaded from a server-side runtime file. The browser receives only sanitized fields.";
  }

  return data;
}
