/**
 * Job 2 — Review packet and daily digest composer.
 *
 * Assembles a standardized packet per Founder Review issue and one grouped
 * daily digest. It never merges, never deploys, and in dry-run never posts.
 */

import { createMutationGuard } from "../shared/config.mjs";
import { createLogger } from "../shared/logging.mjs";
import { labelsInGroup, stateName } from "../launcher/eligibility.mjs";

export const DIGEST_MARKER = "<!-- usam-digest -->";

export const REQUIRED_PACKET_FIELDS = Object.freeze([
  "branch",
  "pullRequest",
  "ciStatus",
  "previewUrl",
]);

/** Build one review packet. Missing fields are reported, never invented. */
export function buildReviewPacket(issue, evidence = {}, config) {
  const application = labelsInGroup(issue, config.linear.applicationLabelGroup)[0] ?? null;
  const runner = labelsInGroup(issue, config.linear.runnerLabelGroup)[0] ?? null;

  const packet = {
    issueId: issue.id,
    title: issue.title ?? "",
    application,
    repository: evidence.repository ?? null,
    runner,
    summary: evidence.summary ?? null,
    branch: evidence.branch ?? issue.gitBranchName ?? null,
    pullRequest: evidence.pullRequest ?? null,
    ciStatus: evidence.ciStatus ?? null,
    previewUrl: evidence.previewUrl ?? null,
    artifacts: evidence.artifacts ?? [],
    riskLevel: evidence.riskLevel ?? "unknown",
    migrationsInvolved: evidence.migrationsInvolved ?? false,
    productionDataImpact: evidence.productionDataImpact ?? false,
    unresolvedBlockers: evidence.unresolvedBlockers ?? [],
    decisionRequested: evidence.decisionRequested ?? null,
  };

  packet.missingFields = REQUIRED_PACKET_FIELDS.filter((f) => packet[f] === null || packet[f] === undefined);
  packet.complete = packet.missingFields.length === 0;
  return packet;
}

export function renderPacket(p) {
  const lines = [
    `### ${p.issueId} — ${p.title}`,
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| Application | ${p.application ?? "—"} |`,
    `| Repository | ${p.repository ? `\`${p.repository}\`` : "—"} |`,
    `| Runner | ${p.runner ?? "—"} |`,
    `| Branch | ${p.branch ? `\`${p.branch}\`` : "**missing**"} |`,
    `| Pull request | ${p.pullRequest ?? "**missing**"} |`,
    `| CI | ${p.ciStatus ?? "**missing**"} |`,
    `| Preview | ${p.previewUrl ?? "**missing**"} |`,
    `| Risk | ${p.riskLevel} |`,
    `| Migrations | ${p.migrationsInvolved ? "⚠️ yes" : "no"} |`,
    `| Production data impact | ${p.productionDataImpact ? "⚠️ yes" : "no"} |`,
  ];
  if (p.summary) lines.push("", p.summary);
  if (p.unresolvedBlockers.length) {
    lines.push("", "**Blockers:**", ...p.unresolvedBlockers.map((b) => `- ${b}`));
  }
  if (!p.complete) {
    lines.push("", `⚠️ **Not review-ready** — missing: ${p.missingFields.join(", ")}`);
  }
  lines.push("", `**Decision requested:** ${p.decisionRequested ?? "_none stated_"}`);
  return lines.join("\n");
}

/** Compose the daily digest across all Founder Review issues. */
export function buildDigest({ issues, evidenceByIssue = {}, config, now = new Date() }) {
  const reviewIssues = (issues ?? []).filter(
    (i) => stateName(i) === config.linear.founderReviewStateName,
  );
  const packets = reviewIssues.map((i) => buildReviewPacket(i, evidenceByIssue[i.id] ?? {}, config));
  const cap = config.limits.founderReviewCap;
  const overCap = packets.length > cap;

  return {
    generatedAt: now.toISOString(),
    queueSize: packets.length,
    cap,
    overCap,
    incomplete: packets.filter((p) => !p.complete).map((p) => p.issueId),
    packets,
  };
}

export function renderDigest(d) {
  const header = [
    DIGEST_MARKER,
    `# Daily Review Digest — ${d.generatedAt.slice(0, 10)}`,
    "",
    `**Queue: ${d.queueSize} / ${d.cap}**${d.overCap ? " — ⚠️ **OVER CAP**, launcher backpressure is engaged" : ""}`,
  ];
  if (d.incomplete.length) {
    header.push("", `⚠️ **Not review-ready (${d.incomplete.length}):** ${d.incomplete.join(", ")}`);
  }
  if (d.queueSize === 0) {
    header.push("", "_Review queue is empty._");
    return header.join("\n");
  }
  header.push("", "---", "");
  return [...header, ...d.packets.map(renderPacket)].join("\n\n");
}

export async function runDigest({
  config,
  issues,
  evidenceByIssue = {},
  linear = null,
  target = null,
  logger = createLogger({ job: "digest" }),
  now = new Date(),
}) {
  const guard = createMutationGuard({ dryRun: config.dryRun });
  const digest = buildDigest({ issues, evidenceByIssue, config, now });
  const rendered = renderDigest(digest);

  await guard.perform(
    `post digest (${digest.queueSize} item(s))`,
    () => linear.createComment(target, rendered),
    { type: "comment", target },
  );

  logger.info("digest_built", {
    queueSize: digest.queueSize,
    cap: digest.cap,
    overCap: digest.overCap,
    incomplete: digest.incomplete.length,
    dryRun: config.dryRun,
  });

  return { digest, rendered, plannedMutations: guard.planned, dryRun: config.dryRun };
}
