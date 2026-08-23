/**
 * Job 1 — Runner launcher: issue eligibility and repository resolution.
 *
 * FAIL-CLOSED THROUGHOUT. Every uncertainty is a refusal with a named code,
 * never a guess. In particular a repository is NEVER resolved by bare name —
 * an empty duplicate USA-Missionaries/usam-website once existed alongside the
 * canonical rfox0629/usam-website, and resolving by name could target the wrong
 * repository.
 */

import { ERROR_CODES } from "../shared/errors.mjs";
import { resolveRepository } from "../../repository-registry.mjs";

const OK = (extra = {}) => ({ eligible: true, ...extra });
const NO = (code, reason, extra = {}) => ({ eligible: false, code, reason, ...extra });

/** Labels belonging to a named group, e.g. group "Application" → ["DOS"]. */
export function labelsInGroup(issue, group) {
  const labels = issue?.labels ?? [];
  return labels
    .filter((l) => {
      if (typeof l === "string") return false;
      return (l.parent?.name ?? l.parent) === group;
    })
    .map((l) => l.name);
}

export function stateName(issue) {
  return typeof issue?.state === "string" ? issue.state : (issue?.state?.name ?? issue?.status ?? null);
}

/**
 * Decide whether an issue may be claimed by the launcher.
 * Order matters: terminal/archived checks come first so a Done issue never
 * produces a "missing label" complaint.
 */
export function classifyEligibility(issue, config, context = {}) {
  const { linear, limits } = config;

  if (!issue || !issue.id) return NO(ERROR_CODES.ISSUE_NOT_READY, "no issue supplied");

  if (issue.archivedAt) return NO(ERROR_CODES.ISSUE_ARCHIVED, `issue ${issue.id} is archived`);

  const state = stateName(issue);
  if (linear.terminalStateNames.includes(state)) {
    return NO(ERROR_CODES.ISSUE_TERMINAL, `issue ${issue.id} is in terminal state "${state}"`);
  }
  if (state !== linear.readyStateName) {
    return NO(ERROR_CODES.ISSUE_NOT_READY, `issue ${issue.id} is "${state}", not "${linear.readyStateName}"`);
  }

  const apps = labelsInGroup(issue, linear.applicationLabelGroup);
  if (apps.length === 0) {
    return NO(ERROR_CODES.APPLICATION_MISSING, `issue ${issue.id} has no ${linear.applicationLabelGroup} label`);
  }
  if (apps.length > 1) {
    return NO(
      ERROR_CODES.APPLICATION_AMBIGUOUS,
      `issue ${issue.id} has ${apps.length} ${linear.applicationLabelGroup} labels: ${apps.join(", ")}`,
      { applications: apps },
    );
  }

  const runners = labelsInGroup(issue, linear.runnerLabelGroup);
  if (runners.length === 0) {
    return NO(ERROR_CODES.RUNNER_MISSING, `issue ${issue.id} has no ${linear.runnerLabelGroup} label`);
  }
  if (runners.length > 1) {
    return NO(ERROR_CODES.RUNNER_AMBIGUOUS, `issue ${issue.id} has multiple runners: ${runners.join(", ")}`, {
      runners,
    });
  }
  const runner = runners[0];
  if (!config.runners[runner]) {
    return NO(ERROR_CODES.RUNNER_MISSING, `runner "${runner}" is not configured`);
  }

  if (!hasAcceptanceCriteria(issue)) {
    return NO(ERROR_CODES.ACCEPTANCE_CRITERIA_MISSING, `issue ${issue.id} has no acceptance criteria`);
  }

  // Capacity
  const inFlight = context.inFlightByRunner?.[runner] ?? 0;
  if (inFlight >= limits.perRunnerWip) {
    return NO(
      ERROR_CODES.WIP_LIMIT_REACHED,
      `runner ${runner} is at its WIP limit (${inFlight}/${limits.perRunnerWip})`,
      { runner },
    );
  }
  const reviewQueue = context.founderReviewCount ?? 0;
  if (reviewQueue >= limits.founderReviewCap) {
    return NO(
      ERROR_CODES.REVIEW_CAP_REACHED,
      `Founder Review is full (${reviewQueue}/${limits.founderReviewCap}) — backpressure engaged`,
      { reviewQueue },
    );
  }

  // Cooldown (USA-68)
  const cooldown = context.cooldowns?.[runner];
  if (cooldown && cooldown.until && new Date(cooldown.until).getTime() > (context.now ?? Date.now())) {
    return NO(ERROR_CODES.RUNNER_COOLING_DOWN, `runner ${runner} is cooling down until ${cooldown.until}`, {
      runner,
      until: cooldown.until,
    });
  }

  return OK({ application: apps[0], runner });
}

export function hasAcceptanceCriteria(issue) {
  const text = `${issue?.description ?? ""}`;
  return /acceptance (?:criteria|tests?)|^#{1,6}\s+acceptance\b|success criteria|required outcomes|definition of done|^#{1,6}\s+deliverables?\b/im.test(text);
}

/**
 * Resolve an Application label to a fully-qualified repository via registry v2.
 * Fails closed on unknown application and on any bare (unqualified) name.
 */
export function resolveApplicationRepository(application, registry) {
  const records = (registry?.applications ?? []).filter((r) =>
    (r.linearApplication ?? []).includes(application),
  );
  if (records.length === 0) {
    return { ok: false, code: ERROR_CODES.REPO_UNRESOLVED, reason: `no registry record for Application "${application}"` };
  }
  const active = records.filter((r) => r.status !== "legacy-reference" && r.status !== "archived");
  const chosen = active.length === 1 ? active[0] : null;
  if (!chosen) {
    return {
      ok: false,
      code: ERROR_CODES.REPO_UNRESOLVED,
      reason:
        active.length === 0
          ? `Application "${application}" maps only to legacy/archived repositories`
          : `Application "${application}" maps to ${active.length} active repositories — ambiguous`,
      candidates: active.map((r) => r.slug),
    };
  }
  if (!chosen.slug || !chosen.slug.includes("/")) {
    return { ok: false, code: ERROR_CODES.REPO_BARE_NAME, reason: `registry record for "${application}" has a bare repository name` };
  }
  // Round-trip through the canonical resolver so a malformed record fails here.
  try {
    const resolved = resolveRepository(registry, chosen.slug);
    return { ok: true, slug: resolved.slug, owner: resolved.owner, repo: resolved.repository, defaultBranch: resolved.defaultBranch };
  } catch (e) {
    return { ok: false, code: ERROR_CODES.REPO_UNRESOLVED, reason: e.message };
  }
}

/** Deterministic branch name, matching Linear's convention. */
export function planBranchName(issue) {
  if (issue?.gitBranchName) return issue.gitBranchName;
  const slug = String(issue?.title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `ryan/${String(issue.id).toLowerCase()}-${slug}`;
}
