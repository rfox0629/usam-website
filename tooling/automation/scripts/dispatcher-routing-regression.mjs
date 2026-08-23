import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyRunnerEnvironmentUnavailable } from "../src/runner-cooldowns.mjs";
import { extractMentionedPaths, founderRevisionInfo, repositoryForIssue } from "../src/routing-policy.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(rootDir, "config", "dispatcher.config.json"), "utf8"));

function issue(overrides = {}) {
  return {
    branchName: null,
    comments: { nodes: [] },
    description: "A dispatcher issue with enough detail to be eligible for routing.",
    labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Codex", parent: { name: "Runner" } }] },
    state: { name: "Todo" },
    title: "Dispatcher routing issue",
    ...overrides,
  };
}

const automationIssue = issue({
  description: "Fix src/dispatcher.mjs, config/dispatcher.config.json, LaunchAgent config, locks, logs, polling loop, and Linear integration in /Users/ryanfox/Code/usam-website/tooling/automation.",
  title: "Dispatcher founder revision loop",
});
const automationRoute = repositoryForIssue(automationIssue, config, {
  defaultWorktreeRoot: "/Users/ryanfox/USAM-Worktrees",
});
assert.equal(automationRoute.repository.name, "automation");
assert.equal(automationRoute.repository.kind, "local");
assert.equal(automationRoute.repository.repositoryPath, "/Users/ryanfox/Code/usam-website/tooling/automation");
assert.equal(automationRoute.repository.baseRef, null);
assert.equal(automationRoute.repository.metadataPath, "/Users/ryanfox/Code/usam-website/.git");
assert(automationRoute.expectedPaths.includes("src/dispatcher.mjs"));

const websiteIssue = issue({
  comments: {
    nodes: [{
      user: { name: "Ryan Fox" },
      body: "Dispatcher runner completed successfully. Runner: codex Branch: `dispatcher/usa-38` Worktree: `/Users/ryanfox/USAM-Automation/worktrees/usa-38-codex-20260722` Changed files: `src/dispatcher.mjs`",
      createdAt: "2026-07-24T19:00:00.000Z",
    }],
  },
  description: "Build the public website page in app/domain-sites/kitchen-table-gospel/page.tsx with shared src/lib/domain-sites.ts metadata and public assets.",
  title: "Website C - replace System with Ecosystem and integrate domains",
});
const websiteRoute = repositoryForIssue(websiteIssue, config, {
  defaultWorktreeRoot: "/Users/ryanfox/USAM-Worktrees",
});
assert.equal(websiteRoute.repository.name, "website");
assert.equal(websiteRoute.repository.kind, "git-worktree");
assert.equal(websiteRoute.repository.repositoryPath, "/Users/ryanfox/Code/usam-website");

const websiteWithDispatcherText = issue({
  description: "Build app/admin/operations-center/page.tsx and docs/ncc-reset-2026-07-22/reconciliation-report.md. Mention Dispatcher/Linear only as a System & Developer area inside the website mockup.",
  title: "Urgent NCC reset mockup - reconcile legacy platform and Operations Center",
});
const mixedRoute = repositoryForIssue(websiteWithDispatcherText, config, {
  defaultWorktreeRoot: "/Users/ryanfox/USAM-Worktrees",
});
assert.equal(mixedRoute.repository.name, "website");

const websiteApplicationLabelIssue = issue({
  description: "Fix the /join rollback path. Mention dispatcher repair only as an out-of-scope note; the work is in the website repository.",
  labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Codex", parent: { name: "Runner" } }, { name: "USAM Website" }] },
  title: "Fix /join rollback orphan-account defect",
});
const applicationLabelRoute = repositoryForIssue(websiteApplicationLabelIssue, config, {
  defaultWorktreeRoot: "/Users/ryanfox/USAM-Worktrees",
});
assert.equal(applicationLabelRoute.repository.name, "website");
assert.equal(applicationLabelRoute.repository.repositoryPath, "/Users/ryanfox/Code/usam-website");

const automationApplicationLabelIssue = issue({
  description: "Repair LaunchAgent and dispatcher runtime without touching product repositories.",
  labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Codex", parent: { name: "Runner" } }, { name: "Automation" }] },
  title: "Deploy repaired dispatcher",
});
const automationApplicationLabelRoute = repositoryForIssue(automationApplicationLabelIssue, config, {
  defaultWorktreeRoot: "/Users/ryanfox/USAM-Worktrees",
});
assert.equal(automationApplicationLabelRoute.repository.name, "automation");

const automationLabelWithDocsPathIssue = issue({
  description: "Acceptance criteria: update docs/dispatcher-fixtures/usa-147-pilot.md as an automation-only dispatcher fixture.",
  labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Codex", parent: { name: "Runner" } }, { name: "Automation" }] },
  title: "Dispatcher observability pilot fixture",
});
const automationLabelWithDocsPathRoute = repositoryForIssue(automationLabelWithDocsPathIssue, config, {
  defaultWorktreeRoot: "/Users/ryanfox/USAM-Worktrees",
});
assert.equal(automationLabelWithDocsPathRoute.repository.name, "automation");

const saveApplicationLabelIssue = issue({
  description: "Repository `rfox0629/save-website`. Redesign SAVE ministry, donor, and staff administration portals.",
  labels: { nodes: [{ name: "Ready for Dispatcher" }, { name: "Codex", parent: { name: "Runner" } }, { name: "SAVE", parent: { name: "Application" } }] },
  title: "Redesign SAVE ministry, donor, and staff administration portals",
});
const saveApplicationLabelRoute = repositoryForIssue(saveApplicationLabelIssue, config, {
  defaultWorktreeRoot: "/Users/ryanfox/USAM-Worktrees",
});
assert.equal(saveApplicationLabelRoute.repository.name, "save");
assert.equal(saveApplicationLabelRoute.repository.repositoryPath, "/Users/ryanfox/Code/save-website");
assert.equal(saveApplicationLabelRoute.repository.baseRef, "origin/main");

const dosJourneyWithSaveReflectionCopyIssue = issue({
  description: [
    "Replace the Discipleship Journey week-card stack with a compact selector.",
    "Preserve the DOS Journey shell, voice input, save/resume, and assignment integrations.",
    "The UI includes a Save Reflection action and My Record sync helper copy.",
    "Do not use the save-website repository.",
  ].join("\n\n"),
  labels: {
    nodes: [
      { name: "Ready for Dispatcher" },
      { name: "Claude", parent: { name: "Runner" } },
      { name: "DOS", parent: { name: "Application" } },
    ],
  },
  title: "Journey V2 polish - replace week-card stack with compact progress selector",
});
const dosJourneyRoute = repositoryForIssue(dosJourneyWithSaveReflectionCopyIssue, config, {
  defaultWorktreeRoot: "/Users/ryanfox/USAM-Worktrees",
});
assert.equal(dosJourneyRoute.repository.name, "website");
assert.equal(dosJourneyRoute.repository.repositoryPath, "/Users/ryanfox/Code/usam-website");
assert.ok(
  dosJourneyRoute.matches.find((match) => match.repository === "website")?.score
    > (dosJourneyRoute.matches.find((match) => match.repository === "save")?.score || 0),
  "DOS application label must outrank incidental Save Reflection copy",
);

const expectedPaths = extractMentionedPaths("Patch src/dispatcher.mjs and launchd/com.usam.dispatcher.plist, not app/page.tsx.");
assert.deepEqual(expectedPaths, ["app/page.tsx", "launchd/com.usam.dispatcher.plist", "src/dispatcher.mjs"]);

const revision = founderRevisionInfo(websiteIssue, {
  completedAt: "2026-07-24T18:00:00.000Z",
  identifier: "USA-71",
  status: "completed",
}, {
  founderAuthorNames: ["Ryan Fox"],
});
assert.equal(revision.reclaim, false);

const generatedDispatcherComment = founderRevisionInfo(websiteIssue, {
  completedAt: "2026-07-24T18:00:00.000Z",
  identifier: "USA-38",
  status: "completed",
}, {
  founderAuthorNames: ["Ryan Fox"],
});
assert.equal(generatedDispatcherComment.reclaim, false);

const publisherStatusIssue = issue({
  comments: {
    nodes: [
      {
        author: { name: "Ryan Fox" },
        body: "Publisher recovery attempt - blocked by host Vercel auth\n\nTrusted publisher result:\n\nNo Vercel CLI credentials found for ryanfox. Run `npx --yes vercel login` as ryanfox or configure VERCEL_TOKEN before publishing.",
        createdAt: "2026-07-24T19:00:00.000Z",
      },
      {
        author: { name: "Ryan Fox" },
        body: "Dispatcher implementation complete, but preview publishing is blocked.\n\nUSA-38 - Website C\nStage: preflight\nBlocker: Vercel auth failed: No Vercel CLI credentials found for ryanfox.",
        createdAt: "2026-07-24T19:01:00.000Z",
      },
      {
        author: { name: "Ryan Fox" },
        body: "Host publisher repair status - 2026-07-25\n\nCurrent live blocker: No Vercel CLI credentials found for ryanfox.",
        createdAt: "2026-07-24T19:02:00.000Z",
      },
    ],
  },
  title: "Website C - publisher status comments",
});
const publisherStatusRevision = founderRevisionInfo(publisherStatusIssue, {
  completedAt: "2026-07-24T18:00:00.000Z",
  identifier: "USA-38",
  status: "completed",
}, {
  founderAuthorNames: ["Ryan Fox"],
});
assert.equal(publisherStatusRevision.reclaim, false);

const revisionIssue = issue({
  comments: {
    nodes: [{
      author: { name: "Ryan Fox" },
      body: "Founder revision request: preserve the current visual direction and apply the following revisions.",
      createdAt: "2026-07-24T19:00:00.000Z",
    }],
  },
  state: { name: "In Review" },
  title: "Website A - revise DOS page",
});
const revisionFound = founderRevisionInfo(revisionIssue, {
  completedAt: "2026-07-24T18:00:00.000Z",
  identifier: "USA-36",
  status: "completed",
}, {
  founderAuthorNames: ["Ryan Fox"],
});
assert.equal(revisionFound.reclaim, true);
assert.equal(revisionFound.source.author, "Ryan Fox");

const noEnvironment = classifyRunnerEnvironmentUnavailable({
  code: 0,
  finalText: "Codex couldn't start a task for this request: Codex cannot start tasks because the workspace has no available environments.",
  stderr: "",
  stdout: "",
  timedOut: false,
}, {
  now: new Date("2026-07-24T20:00:00.000Z"),
  retryMs: 300000,
});
assert.equal(noEnvironment.reason, "runner_environment_unavailable");
assert.equal(noEnvironment.resumeAfter, "2026-07-24T20:05:00.000Z");

console.log("dispatcher routing regression passed");
