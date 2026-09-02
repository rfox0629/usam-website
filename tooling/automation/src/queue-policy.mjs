export function orderCandidateIssues(issues, options = {}) {
  const priority = new Map((options.priorityIdentifiers || []).map((identifier, index) => [identifier, index]));
  return issues
    .map((issue, index) => ({
      index,
      issue,
      priority: priority.has(issue.identifier) ? priority.get(issue.identifier) : Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .map((entry) => entry.issue);
}
