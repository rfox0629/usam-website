import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

const sourcePath = resolve("src/lib/operations-center/workforce-status.ts");
const source = await readFile(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
const {
  OPERATIONS_CENTER_SCHEMA_VERSION,
  WORKFORCE_STATUS_SCHEMA_VERSION,
  buildOperationsCenterData,
  redactOperationsText,
} = await import(moduleUrl);

const now = new Date("2026-08-01T12:10:00.000Z");

const feed = {
  schemaVersion: WORKFORCE_STATUS_SCHEMA_VERSION,
  generatedAt: "2026-08-01T12:09:40.000Z",
  dispatcher: {
    heartbeatAt: "2026-08-01T12:09:50.000Z",
    phase: "polling",
    pid: 12345,
    state: "running",
  },
  activeRuns: [
    {
      branch: "ryan/usa-200-dashboard",
      currentStep: "heartbeat",
      heartbeatAt: "2026-08-01T12:09:55.000Z",
      issue: "USA-200",
      latestCommit: "abc1234",
      repository: "website",
      repositoryPath: "/Users/ryanfox/Code/usam-website",
      runner: "codex",
      status: "running",
      worktree: "/Users/ryanfox/USAM-Worktrees/usa-200-dashboard",
    },
  ],
  queuedIssues: [
    {
      eligibility: {
        eligible: true,
        evaluatedAt: "2026-08-01T12:09:41.000Z",
        issue: {
          identifier: "USA-201",
          title: "Queued Codex task",
          url: "https://linear.app/usa-missionaries/issue/USA-201/queued-codex-task",
        },
        queueState: "queued",
        selectedRepository: {
          name: "website",
          path: "/Users/ryanfox/Code/usam-website",
        },
        selectedRunner: "codex",
      },
      issue: "USA-201",
      reason: "dispatcher globally paused",
      runner: "codex",
    },
    {
      eligibility: {
        eligible: false,
        evaluatedAt: "2026-08-01T12:09:42.000Z",
        issue: {
          identifier: "USA-202",
          title: "Conflicting runner labels",
        },
        queueState: "blocked",
        selectedRepository: {
          name: "automation",
          path: "/Users/ryanfox/Code/usam-automation",
        },
      },
      issue: "USA-202",
      reason: "conflicting runner labels",
      runner: "unknown",
    },
  ],
  recentEvents: [
    {
      at: "2026-08-01T12:09:55.000Z",
      currentStep: "heartbeat",
      event: "heartbeat",
      issue: "USA-200",
      metadata: {
        reason: "LINEAR_API_KEY=lin_api_should_not_leak /Users/ryanfox/Code/usam-website",
      },
      repository: "website",
      repositoryPath: "/Users/ryanfox/Code/usam-website",
      runner: "codex",
    },
  ],
  reviewReadyDeliverables: [
    {
      at: "2026-08-01T12:09:44.000Z",
      branch: "ryan/usa-203-review",
      checks: ["typecheck=pass", "build=pass"],
      commit: "def5678",
      issue: "USA-203",
      previewUrl: "https://usam-website-preview.vercel.app/admin/operations-center?_vercel_share=secret",
      productionChanged: false,
      repository: "website",
      runner: "codex",
      screenshots: ["https://raw.githubusercontent.com/rfox0629/usam-website/def5678/screenshot.png"],
      worktree: "/Users/ryanfox/USAM-Worktrees/usa-203-review",
    },
  ],
  runners: {
    claude: {
      availability: "idle",
    },
    codex: {
      availability: "busy",
    },
  },
  stalledOrFailedWork: [
    {
      code: "usage_rate_limit_cooldown",
      issue: "USA-202",
      message: "Codex usage/rate-limit cooldown reported.",
      severity: "amber",
    },
  ],
};

const linearIssues = [
  {
    identifier: "USA-204",
    labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Runner/Codex" }, { name: "Application/USAM Website" }] },
    project: { name: "Platform & Automation" },
    state: { name: "Ready", type: "unstarted" },
    title: "Eligible Codex issue",
    updatedAt: "2026-08-01T12:08:00.000Z",
    url: "https://linear.app/usa-missionaries/issue/USA-204/eligible-codex-issue",
  },
  {
    identifier: "USA-205",
    labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Runner/Claude" }, { name: "Application/USAM Website" }] },
    project: { name: "Platform & Automation" },
    state: { name: "Ready", type: "unstarted" },
    title: "Eligible Claude issue",
    updatedAt: "2026-08-01T12:07:00.000Z",
    url: "https://linear.app/usa-missionaries/issue/USA-205/eligible-claude-issue",
  },
  {
    identifier: "USA-206",
    labels: { nodes: [{ name: "Ready for Codex" }, { name: "Application/USAM Website" }] },
    project: { name: "Platform & Automation" },
    state: { name: "Ready", type: "unstarted" },
    title: "Delegated but not dispatcher-ready",
    updatedAt: "2026-08-01T12:06:00.000Z",
    url: "https://linear.app/usa-missionaries/issue/USA-206/delegated",
  },
  {
    identifier: "USA-207",
    labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Application/SAVE" }] },
    project: { name: "Platform & Automation" },
    state: { name: "Ready", type: "unstarted" },
    title: "Missing runner label",
    updatedAt: "2026-08-01T12:05:00.000Z",
    url: "https://linear.app/usa-missionaries/issue/USA-207/missing-runner",
  },
  {
    identifier: "USA-208",
    labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Runner/Codex" }, { name: "Runner/Claude" }, { name: "Application/USAM Website" }] },
    project: { name: "Platform & Automation" },
    state: { name: "Ready", type: "unstarted" },
    title: "Conflicting runner labels",
    updatedAt: "2026-08-01T12:04:00.000Z",
    url: "https://linear.app/usa-missionaries/issue/USA-208/conflicting-runner",
  },
  {
    identifier: "USA-209",
    labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Runner/Codex" }] },
    project: { name: "Platform & Automation" },
    state: { name: "Ready", type: "unstarted" },
    title: "Missing repository route",
    updatedAt: "2026-08-01T12:03:00.000Z",
    url: "https://linear.app/usa-missionaries/issue/USA-209/missing-route",
  },
  {
    identifier: "USA-210",
    labels: { nodes: [{ name: "Runner/Codex" }, { name: "Application/USAM Website" }] },
    project: { name: "Platform & Automation" },
    state: { name: "Founder Review", type: "started" },
    title: "Founder review item",
    updatedAt: "2026-08-01T12:02:00.000Z",
    url: "https://linear.app/usa-missionaries/issue/USA-210/review",
  },
  {
    identifier: "USA-211",
    labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Runner/Codex" }, { name: "Application/USAM Website" }] },
    project: { name: "Platform & Automation" },
    state: { name: "In Progress", type: "started" },
    title: "Stale in progress issue",
    updatedAt: "2026-07-30T12:00:00.000Z",
    url: "https://linear.app/usa-missionaries/issue/USA-211/stale-in-progress",
  },
];

const data = buildOperationsCenterData({
  feed,
  linearIssues,
  linearSource: {
    detail: "fixture",
    fetchedAt: "2026-08-01T12:09:00.000Z",
    status: "live",
  },
  now,
});

assert.equal(data.schemaVersion, OPERATIONS_CENTER_SCHEMA_VERSION);
assert.equal(data.sources.workforceFeed.status, "live");
assert.equal(data.sources.linear.status, "live");
assert.equal(data.cards.find((card) => card.runner === "codex")?.currentIssue, "USA-200");
assert.equal(data.cards.find((card) => card.runner === "codex")?.state, "working");
assert.equal(data.activeWork.find((item) => item.issue === "USA-201")?.state, "queued");
assert.equal(data.activeWork.find((item) => item.issue === "USA-204")?.state, "dispatcher_eligible");
assert.equal(data.activeWork.find((item) => item.issue === "USA-204")?.runner, "codex");
assert.equal(data.activeWork.find((item) => item.issue === "USA-205")?.runner, "claude");
assert.equal(data.activeWork.find((item) => item.issue === "USA-206")?.state, "delegated");
assert.ok(data.alerts.some((alert) => alert.code === "missing_or_conflicting_runner" && alert.issue === "USA-207"));
assert.ok(data.alerts.some((alert) => alert.code === "missing_or_conflicting_runner" && alert.issue === "USA-208"));
assert.ok(data.alerts.some((alert) => alert.code === "missing_repository_route" && alert.issue === "USA-209"));
assert.ok(data.alerts.some((alert) => alert.code === "missing_preview" && alert.issue === "USA-210"));
assert.ok(data.alerts.some((alert) => alert.code === "stale_in_progress_issue" && alert.issue === "USA-211"));
assert.ok(data.alerts.some((alert) => alert.code === "usage_rate_limit_cooldown"));
assert.ok(data.founderReviewQueue.some((item) => item.issue === "USA-203" && item.commit === "def5678"));
assert.ok(data.founderReviewQueue.some((item) => item.issue === "USA-210"));
assert.ok(data.recentActivity.some((item) => item.event === "heartbeat" && item.issue === "USA-200"));

const serialized = JSON.stringify(data);
assert.doesNotMatch(serialized, /lin_api_should_not_leak/);
assert.doesNotMatch(serialized, /\/Users\/ryanfox/);
assert.doesNotMatch(serialized, /_vercel_share=secret/);
assert.equal(redactOperationsText("token lin_api_should_not_leak /Users/ryanfox/Code/usam-website"), "[redacted]");

const staleData = buildOperationsCenterData({
  feed: {
    ...feed,
    generatedAt: "2026-08-01T11:59:00.000Z",
  },
  linearSource: {
    detail: "no token",
    fetchedAt: null,
    status: "unavailable",
  },
  now,
});

assert.equal(staleData.sources.workforceFeed.status, "stale");
assert.ok(staleData.alerts.some((alert) => alert.code === "stale_workforce_feed"));
assert.ok(staleData.alerts.some((alert) => alert.code === "linear_unavailable"));

console.log("operations center regression passed");
