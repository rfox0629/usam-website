import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyDispatchEligibility } from "../src/dispatch-policy.mjs";
import {
  WORKFORCE_STATUS_SCHEMA_VERSION,
  buildClaimAcknowledgment,
  buildCompletionReport,
  buildEligibilityReport,
  buildLifecycleEvent,
  buildWorkforceStatusFeed,
  redactObservableValue,
} from "../src/dispatcher-observability.mjs";
import { repositoryForIssue } from "../src/routing-policy.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(rootDir, "config", "dispatcher.config.json"), "utf8"));

function labels(items) {
  return {
    nodes: items.map((item) => typeof item === "string" ? { name: item } : item),
  };
}

const codexLabel = { name: "Codex", parent: { name: "Runner" } };
const claudeLabel = { name: "Claude", parent: { name: "Runner" } };

function issue(overrides = {}) {
  return {
    branchName: "automation/usa-147-test",
    comments: { nodes: [] },
    description: "Acceptance criteria: update src/dispatcher.mjs and docs for deterministic dispatcher observability.",
    id: "linear-id",
    identifier: "USA-147T",
    labels: labels(["Ready for Dispatcher", codexLabel, "Automation"]),
    state: { name: "Ready" },
    title: "Dispatcher observability test",
    url: "https://linear.test/USA-147T",
    ...overrides,
  };
}

function classify(testIssue) {
  const route = repositoryForIssue(testIssue, config, { defaultWorktreeRoot: "/Users/ryanfox/USAM-Worktrees" });
  const classification = classifyDispatchEligibility(testIssue, {
    config,
    expectedPaths: route.expectedPaths,
    repository: route.repository,
    repositoryRouteMatched: route.matched,
  });
  return { classification, route };
}

{
  const candidate = issue();
  const { classification, route } = classify(candidate);
  const report = buildEligibilityReport({ classification, issue: candidate, route });
  assert.equal(report.eligible, true);
  assert.equal(report.selectedRunner, "codex");
  assert.equal(report.selectedRepository.name, "automation");
  assert.equal(report.satisfied.some((item) => item.id === "ready_for_dispatcher_label"), true);
}

{
  const candidate = issue({ labels: labels(["Ready for Dispatcher", claudeLabel, "Automation"]) });
  const { classification } = classify(candidate);
  assert.equal(classification.eligible, true);
  assert.equal(classification.runner, "claude");
}

{
  const candidate = issue({
    delegate: { name: "Codex" },
    labels: labels([codexLabel, "Automation"]),
  });
  const { classification } = classify(candidate);
  assert.equal(classification.eligible, false);
  assert.equal(classification.reason, "missing Ready for Dispatcher");
  assert.equal(classification.diagnostics.delegatedRunner, "codex");
}

{
  const candidate = issue({ labels: labels(["Ready for Dispatcher", "Automation"]) });
  const { classification } = classify(candidate);
  assert.equal(classification.eligible, false);
  assert.equal(classification.reason, "missing ownership label");
  assert.equal(classification.diagnostics.missing.some((item) => item.id === "ownership_selection"), true);
}

{
  const candidate = issue({ labels: labels(["Ready for Dispatcher", codexLabel, claudeLabel, "Automation"]) });
  const { classification } = classify(candidate);
  assert.equal(classification.eligible, false);
  assert.equal(classification.reason, "both ownership labels present");
  assert.equal(classification.diagnostics.conflicting.some((item) => item.id === "ownership_selection"), true);
}

{
  const candidate = issue({
    description: "Acceptance criteria: update a harmless placeholder without naming any configured app route.",
    labels: labels(["Ready for Dispatcher", codexLabel]),
    title: "Neutral unrouted task",
  });
  const { classification, route } = classify(candidate);
  assert.equal(route.matched, false);
  assert.equal(classification.eligible, false);
  assert.equal(classification.reason, "no repository route matched");
}

{
  const comment = buildClaimAcknowledgment({
    config,
    issue: issue(),
    lock: {
      baseCommit: "abc123",
      branch: "automation/usa-147-test",
      createdAt: "2026-07-31T12:00:00.000Z",
      repositoryKind: "local",
      repositoryName: "automation",
      runner: "codex",
      worktreePath: "/Users/ryanfox/USAM-Worktrees/usa-147-test",
    },
    nextStep: "launch Codex and write heartbeats",
    reviewAuthorization: { allowed: false },
  });
  assert.match(comment, /Claim time: 2026-07-31T12:00:00.000Z/);
  assert.match(comment, /Next expected step: launch Codex and write heartbeats/);
}

{
  const event = buildLifecycleEvent("heartbeat", {
    currentStep: "runner_active",
    issue: "USA-147T",
    metadata: {
      prompt: "LINEAR_API_KEY=lin_api_should_not_leak",
      token: "sk-should-not-leak",
    },
    repository: "automation",
    runner: "codex",
  }, { now: () => "2026-07-31T12:00:00.000Z" });
  assert.equal(event.event, "heartbeat");
  assert.equal(event.metadata.prompt, "[redacted]");
  assert.equal(event.metadata.token, "[redacted]");
}

{
  const event = buildLifecycleEvent("retry_scheduled", {
    currentStep: "runner_cooldown",
    issue: "USA-147T",
    metadata: { resumeAfter: "2026-07-31T12:30:00.000Z" },
    runner: "codex",
  });
  assert.equal(event.event, "retry_scheduled");
  assert.equal(event.metadata.resumeAfter, "2026-07-31T12:30:00.000Z");
}

{
  const text = JSON.stringify(redactObservableValue({
    authToken: "sk-secret",
    nested: { body: "raw issue body", safe: "visible" },
  }));
  assert.doesNotMatch(text, /sk-secret|raw issue body/);
  assert.match(text, /visible/);
}

{
  const report = buildCompletionReport({
    finalText: "Validation passed. Founder decision required: review branch.",
    issue: issue(),
    lock: {
      branch: "automation/usa-147-test",
      publishHealth: { previewUrl: "https://preview.example.test" },
      repositoryKind: "local",
      repositoryName: "automation",
      runner: "codex",
      worktreePath: "/Users/ryanfox/USAM-Worktrees/usa-147-test",
    },
    reviewAuthorization: { allowed: false },
    reviewPackage: { required: false },
    summary: {
      changedFiles: ["src/dispatcher.mjs"],
      headCommit: "abc1234",
      status: " M src/dispatcher.mjs",
    },
  });
  assert.match(report, /Commit: abc1234/);
  assert.match(report, /PR: not created by dispatcher/);
  assert.match(report, /Preview URL: https:\/\/preview.example.test/);
  assert.match(report, /Production changed: no/);
}

{
  const feed = buildWorkforceStatusFeed({
    health: {
      alerts: [{ code: "runner_process_missing", issue: "USA-147T", severity: "red" }],
      dispatcher: { state: "running" },
      lastCompletion: { issue: "USA-146", branch: "automation/usa-146" },
      locks: [{
        active: true,
        branch: "automation/usa-147-test",
        createdAt: "2026-07-31T12:00:00.000Z",
        currentStep: "runner_active",
        heartbeatAt: "2026-07-31T12:01:00.000Z",
        issue: "USA-147T",
        process: { active: true, pid: 1234 },
        repository: "automation",
        repositoryPath: "/Users/ryanfox/Code/usam-website/tooling/automation",
        runner: "codex",
        status: "running",
        worktree: "/Users/ryanfox/USAM-Worktrees/usa-147-test",
      }],
      queue: {
        holds: [{ issue: "USA-148", reason: "missing ownership label", runner: "unknown" }],
      },
      runners: { codex: { availability: "busy" } },
    },
    recentEvents: [buildLifecycleEvent("stalled", { issue: "USA-147T" })],
    now: () => "2026-07-31T12:02:00.000Z",
  });
  assert.equal(feed.schemaVersion, WORKFORCE_STATUS_SCHEMA_VERSION);
  assert.equal(feed.activeRuns.length, 1);
  assert.equal(feed.queuedIssues.length, 1);
  assert.equal(feed.stalledOrFailedWork.length, 1);
  assert.equal(feed.reviewReadyDeliverables.length, 1);
}

console.log("dispatcher observability regression passed");
