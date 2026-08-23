import { founderRevisionInfo, issueLabels } from "./routing-policy.mjs";

function labelParentName(label) {
  return label?.parent?.name || label?.parent || null;
}

export function runnerSelectionsForIssue(issue, linear) {
  const runnerGroup = linear.runnerLabelGroup || "Runner";
  const selections = new Set();

  for (const label of issue.labels?.nodes || []) {
    const name = label?.name;
    const parentName = labelParentName(label);
    const isRunnerGroup = parentName === runnerGroup;
    // Older dispatcher queries did not fetch label parents, so accept bare
    // Codex/Claude labels as a transition fallback.
    const isBareRunnerLabel = !parentName && ["Codex", "Claude"].includes(name);
    if (!isRunnerGroup && !isBareRunnerLabel) continue;
    if (name === "Codex") selections.add("codex");
    if (name === "Claude") selections.add("claude");
  }

  return [...selections];
}

export function deprecatedRoutingLabelsForIssue(issue, linear = {}) {
  const labels = issueLabels(issue);
  const deprecatedRoutingLabels = linear.deprecatedRoutingLabels || ["Ready for Codex", "Ready for Claude"];
  return deprecatedRoutingLabels.filter((label) => labels.has(label));
}

function condition(id, status, message, metadata = {}) {
  return {
    id,
    message,
    metadata,
    status,
  };
}

function selectedRepository(repository) {
  if (!repository) {
    return null;
  }
  return {
    kind: repository.kind || null,
    name: repository.name || null,
    path: repository.repositoryPath || null,
  };
}

function delegatedRunner(issue) {
  const delegate = issue.delegate || issue.delegatedTo || issue.assigneeDelegate || null;
  const text = [delegate?.name, delegate?.displayName, delegate?.email, delegate].filter(Boolean).join(" ");
  if (/\bcodex\b/i.test(text)) return "codex";
  if (/\bclaude\b/i.test(text)) return "claude";
  return null;
}

function diagnosticsFor({ conditions, eligible, issue, reason, repository, revision, runnerSelections, stateName }) {
  return {
    schemaVersion: "usam.dispatcher.eligibility.v1",
    conditions,
    conflicting: conditions.filter((item) => item.status === "conflicting"),
    delegatedRunner: delegatedRunner(issue),
    eligible,
    missing: conditions.filter((item) => item.status === "missing"),
    reason: reason || null,
    revision: {
      ambiguous: Boolean(revision?.ambiguous),
      reclaim: Boolean(revision?.reclaim),
      reason: revision?.reason || null,
    },
    satisfied: conditions.filter((item) => item.status === "satisfied"),
    selectedRepository: selectedRepository(repository),
    selectedRunner: runnerSelections.length === 1 ? runnerSelections[0] : null,
    state: stateName,
  };
}

export function classifyDispatchEligibility(issue, options = {}) {
  const config = options.config || {};
  const linear = config.linear || config;
  const labels = issueLabels(issue);
  const runnerSelections = runnerSelectionsForIssue(issue, linear);
  const deprecatedRoutingLabels = deprecatedRoutingLabelsForIssue(issue, linear);
  const blocked = (linear.blockedLabels || []).filter((label) => labels.has(label));
  const stateName = issue.state?.name || "unknown";
  const revision = founderRevisionInfo(issue, options.previousCompletedLock || null, {
    founderAuthorNames: linear.founderAuthorNames || undefined,
  });
  const reclaimableState = [linear.statusInReview, linear.statusInProgress].includes(stateName);
  const reclaimingFounderRevision = (stateName === linear.statusTodo || reclaimableState) && revision.reclaim;
  const blockingLock = options.blockingLock || null;
  const blockingLockSupersedable = options.blockingLockSupersedable === true;
  const repositoryRouteMatched = options.repositoryRouteMatched !== false;
  const conditions = [];

  const finish = (eligible, reason, extra = {}) => ({
    ...extra,
    diagnostics: diagnosticsFor({
      conditions,
      eligible,
      issue,
      reason,
      repository: options.repository,
      revision,
      runnerSelections,
      stateName,
    }),
    eligible,
    reason,
  });

  if (revision.ambiguous) {
    conditions.push(condition("founder_revision", "conflicting", revision.reason, { ambiguous: true }));
    return finish(false, revision.reason);
  }
  conditions.push(condition("founder_revision", "satisfied", revision.reclaim
    ? "founder revision reclaim is available"
    : revision.reason || "no ambiguous founder revision"));

  if (stateName !== linear.statusTodo && !reclaimingFounderRevision) {
    const reason = `state is ${stateName}; ${revision.reason}`;
    conditions.push(condition("linear_state", "conflicting", reason, {
      expected: linear.statusTodo,
      actual: stateName,
    }));
    return finish(false, reason);
  }
  conditions.push(condition("linear_state", "satisfied", reclaimingFounderRevision
    ? `state ${stateName} is reclaimable because founder revision was detected`
    : `state is ${linear.statusTodo}`, {
      actual: stateName,
      expected: linear.statusTodo,
    }));

  if (!labels.has(linear.labelReadyForDispatcher)) {
    conditions.push(condition("ready_for_dispatcher_label", "missing", "missing Ready for Dispatcher", {
      label: linear.labelReadyForDispatcher,
    }));
    return finish(false, "missing Ready for Dispatcher");
  }
  conditions.push(condition("ready_for_dispatcher_label", "satisfied", `${linear.labelReadyForDispatcher} label present`, {
    label: linear.labelReadyForDispatcher,
  }));

  if (deprecatedRoutingLabels.length) {
    const reason = `deprecated routing labels present: ${deprecatedRoutingLabels.join(", ")}`;
    conditions.push(condition("deprecated_routing_labels", "conflicting", reason, {
      labels: deprecatedRoutingLabels,
    }));
    return finish(false, reason);
  }
  conditions.push(condition("deprecated_routing_labels", "satisfied", "no deprecated routing labels present", {
    deprecatedRoutingLabels: linear.deprecatedRoutingLabels || ["Ready for Codex", "Ready for Claude"],
  }));

  if (runnerSelections.length !== 1) {
    const reason = runnerSelections.length ? "both ownership labels present" : "missing ownership label";
    conditions.push(condition("ownership_selection", runnerSelections.length ? "conflicting" : "missing", reason, {
      ownershipLabels: runnerSelections,
    }));
    return finish(false, reason);
  }
  conditions.push(condition("ownership_selection", "satisfied", `selected ownership is ${runnerSelections[0]}`, {
    runner: runnerSelections[0],
  }));

  if (blocked.length) {
    const reason = `blocked labels present: ${blocked.join(", ")}`;
    conditions.push(condition("blocking_labels", "conflicting", reason, { labels: blocked }));
    return finish(false, reason);
  }
  conditions.push(condition("blocking_labels", "satisfied", "no blocking labels present", {
    blockedLabels: linear.blockedLabels || [],
  }));

  if (!issue.description || issue.description.trim().length < 20) {
    conditions.push(condition("scope", "missing", "scope is too thin", {
      minimumDescriptionLength: 20,
    }));
    return finish(false, "scope is too thin");
  }
  conditions.push(condition("scope", "satisfied", "issue description has enough routing context", {
    descriptionLength: issue.description.trim().length,
  }));

  if (!options.repository?.repositoryPath || !repositoryRouteMatched) {
    conditions.push(condition("repository_route", "missing", "no repository route matched", {
      fallbackRepository: options.repository?.name || null,
      repositoryPath: options.repository?.repositoryPath || null,
    }));
    return finish(false, "no repository route matched");
  }
  conditions.push(condition("repository_route", "satisfied", `selected repository is ${options.repository.name}`, {
    kind: options.repository.kind,
    name: options.repository.name,
    repositoryPath: options.repository.repositoryPath,
  }));

  if (blockingLock) {
    if (blockingLock.status === "cooldown") {
      const cooldown = options.blockingLockCooldown || null;
      const reason = `${blockingLock.runner} cooldown until ${cooldown?.resumeAfter || cooldown?.resetAt || "reset"}`;
      conditions.push(condition("blocking_lock", "conflicting", reason, {
        issue: blockingLock.identifier || null,
        runner: blockingLock.runner || null,
        status: blockingLock.status,
      }));
      return finish(false, reason);
    }
    if (!(reclaimingFounderRevision && blockingLockSupersedable && blockingLock.status === "failed")) {
      const reason = `${blockingLock.status} lock exists`;
      conditions.push(condition("blocking_lock", "conflicting", reason, {
        issue: blockingLock.identifier || null,
        runner: blockingLock.runner || null,
        status: blockingLock.status,
      }));
      return finish(false, reason);
    }
  }
  conditions.push(condition("blocking_lock", "satisfied", blockingLock
    ? "terminal failed lock can be superseded by founder revision"
    : "no blocking dispatcher lock exists", {
      status: blockingLock?.status || null,
    }));

  if (blockingLock && blockingLockSupersedable) {
    return finish(true, null, {
      expectedPaths: options.expectedPaths || [],
      previousCompletedLock: options.previousCompletedLock || null,
      previousCompletedLockPath: options.previousCompletedLockPath || null,
      previousRevisionCycle: options.previousRevisionCycle || null,
      reclaim: revision,
      repository: options.repository,
      runner: runnerSelections[0],
      supersedeFailedLock: blockingLock,
    });
  }

  return finish(true, null, {
    expectedPaths: options.expectedPaths || [],
    previousCompletedLock: options.previousCompletedLock || null,
    previousCompletedLockPath: options.previousCompletedLockPath || null,
    previousRevisionCycle: options.previousRevisionCycle || null,
    reclaim: reclaimingFounderRevision ? revision : null,
    repository: options.repository,
    runner: runnerSelections[0],
  });
}
