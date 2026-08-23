export const defaultFounderAuthorNames = ["Ryan Fox"];

export function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value) {
  return String(value || "").toLowerCase();
}

function compilePattern(pattern) {
  if (pattern instanceof RegExp) {
    return pattern;
  }

  return new RegExp(String(pattern), "i");
}

function patternMatchCount(text, patterns = []) {
  return patterns.filter((pattern) => compilePattern(pattern).test(text)).length;
}

export function labelNames(issue) {
  return (issue.labels?.nodes || []).map((label) => label.name).filter(Boolean);
}

export function issueLabels(issue) {
  return new Set(labelNames(issue));
}

export function issueCoreText(issue) {
  return [issue.title, issue.description].map(normalizeText).filter(Boolean).join("\n\n");
}

export function issueText(issue) {
  const comments = (issue.comments?.nodes || [])
    .map((comment) => comment.body || "")
    .filter(Boolean)
    .join("\n\n");
  return `${issue.title || ""}\n\n${issue.description || ""}\n\n${comments}`;
}

export function extractMentionedPaths(text) {
  const paths = new Set();
  const re = /(?:^|[\s`'"])((?:app|src|components|docs|scripts|public|supabase|config|bin|sandbox|launchd|locks|state|tmp|logs|control)\/[A-Za-z0-9._/\-[\]]+)/gm;
  for (const match of String(text || "").matchAll(re)) {
    paths.add(match[1].replace(/[.,;:)]$/, ""));
  }
  return [...paths].sort();
}

function normalizeRouting(routing = {}) {
  return {
    labelNames: routing.labelNames || [],
    pathPrefixes: routing.pathPrefixes || [],
    textPatterns: routing.textPatterns || [],
  };
}

function configuredValue(source, key, fallbackValue) {
  return Object.prototype.hasOwnProperty.call(source, key) ? source[key] : fallbackValue;
}

function normalizeRepository(name, repository, fallback = {}) {
  return {
    baseRef: configuredValue(repository, "baseRef", fallback.baseRef ?? null),
    branchPrefix: configuredValue(repository, "branchPrefix", fallback.branchPrefix ?? "dispatcher"),
    kind: repository.kind || "git-worktree",
    metadataPath: configuredValue(repository, "metadataPath", fallback.metadataPath ?? null),
    name,
    priority: Number(configuredValue(repository, "priority", fallback.priority ?? 0)),
    repositoryPath: configuredValue(repository, "repositoryPath", fallback.repositoryPath ?? null),
    routing: normalizeRouting(repository.routing),
    worktreeRoot: configuredValue(repository, "worktreeRoot", fallback.worktreeRoot ?? null),
  };
}

export function normalizeRepositories(config, options = {}) {
  const repositories = {};
  const legacyGit = config.git || {};
  const configured = config.repositories || {};

  for (const [name, repository] of Object.entries(configured)) {
    repositories[name] = normalizeRepository(name, repository, {
      baseRef: legacyGit.baseRef,
      branchPrefix: legacyGit.branchPrefix,
      metadataPath: legacyGit.metadataPath,
      repositoryPath: legacyGit.repositoryPath,
      worktreeRoot: options.defaultWorktreeRoot || null,
    });
  }

  if (!repositories.website && legacyGit.repositoryPath) {
    repositories.website = normalizeRepository("website", {
      kind: "git-worktree",
      priority: 10,
      routing: {
        pathPrefixes: ["app/", "components/", "data/", "docs/", "public/", "scripts/", "src/", "supabase/"],
        textPatterns: [
          "\\bwebsite\\b",
          "\\bpublic\\s+(?:site|page|profile|experience)\\b",
          "\\bmissionar(?:y|ies)\\b",
          "\\bfinancial\\s+freedom\\b",
          "\\bprofile\\b",
          "\\badmin\\b",
          "\\bdomain-sites?\\b",
        ],
      },
    }, {
      baseRef: legacyGit.baseRef,
      branchPrefix: legacyGit.branchPrefix,
      metadataPath: legacyGit.metadataPath,
      repositoryPath: legacyGit.repositoryPath,
      worktreeRoot: options.defaultWorktreeRoot || null,
    });
  }

  return {
    defaultRepositoryName: config.defaultRepository || "website",
    repositories,
  };
}

function pathMatchesPrefixes(path, prefixes = []) {
  return prefixes.some((prefix) => path === prefix.replace(/\/$/, "") || path.startsWith(prefix));
}

function repositoryRouteScore(issue, repository, expectedPaths) {
  const labels = new Set(labelNames(issue).map(lower));
  const text = issueCoreText(issue);
  const routing = repository.routing || {};

  const labelMatch = (routing.labelNames || []).some((label) => labels.has(lower(label)));
  const pathMatch = expectedPaths.some((path) => pathMatchesPrefixes(path, routing.pathPrefixes || []));
  const textMatchCount = patternMatchCount(text, routing.textPatterns || []);
  const textMatch = textMatchCount > 0;
  let score = Number(repository.priority || 0);

  if (pathMatch) {
    score += 1000;
  }
  if (labelMatch) {
    score += 2000;
  }
  if (textMatch) {
    score += 100 * textMatchCount;
  }

  return labelMatch || pathMatch || textMatch ? score : 0;
}

export function repositoryForIssue(issue, config, options = {}) {
  const expectedPaths = options.expectedPaths || extractMentionedPaths(issueCoreText(issue));
  const { defaultRepositoryName, repositories } = normalizeRepositories(config, options);
  const matches = Object.values(repositories)
    .map((repository) => ({
      repository,
      score: repository.repositoryPath ? repositoryRouteScore(issue, repository, expectedPaths) : 0,
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || b.repository.priority - a.repository.priority);

  const repository = matches[0]?.repository
    || repositories[defaultRepositoryName]
    || Object.values(repositories)[0]
    || null;

  return {
    expectedPaths,
    fallbackRepository: !matches[0],
    matched: Boolean(matches[0]),
    matches: matches.map((match) => ({
      repository: match.repository.name,
      score: match.score,
    })),
    repository,
  };
}

export function commentAuthorName(comment) {
  return comment.author?.name || comment.author?.displayName || comment.user?.name || comment.user?.displayName || "";
}

export function founderCommentAllowed(comment, founderAuthorNames = defaultFounderAuthorNames) {
  const name = commentAuthorName(comment);
  if (!name) {
    return false;
  }

  const allowedNames = founderAuthorNames.length ? founderAuthorNames : defaultFounderAuthorNames;
  return allowedNames.some((allowedName) => lower(allowedName) === lower(name));
}

export function isGeneratedDispatcherComment(comment) {
  const text = normalizeText(comment.body);
  return /^Founder revisions detected\./i.test(text)
    || /^Dispatcher implementation complete, but preview publishing is blocked\./i.test(text)
    || /^Dispatcher (?:pickup started|implementation complete|runner completed successfully|runner finished|runner attempt|runner failed|failed before completion|runner could not start|runner hit a usage\/session limit)/i.test(text)
    || /\bDispatcher runner (?:completed successfully|finished|failed|could not start|hit a usage\/session limit)\b/i.test(text)
    || /^Host publisher repair status\b/i.test(text)
    || /^Publisher recovery attempt\b/i.test(text)
    || /\bTrusted publisher result:\s*No Vercel CLI credentials found for ryanfox\b/i.test(text)
    || /\bVercel auth failed:\s*No Vercel CLI credentials found for ryanfox\b/i.test(text)
    || /\bRunner:\s*(?:codex|claude)\b.+\bWorktree:\s*`?\/Users\/ryanfox\/(?:USAM-Automation\/worktrees|USAM-Worktrees|USAM-Releases)(?:\/|`|\s|$)/is.test(text)
    || /\bThe issue is (?:being returned to Todo|returned to Todo|remains `?In Progress`?)\b/i.test(text);
}

export function isFounderStatusNote(comment) {
  const text = normalizeText(comment.body);
  return /^(?:#{1,6}\s*)?(?:USA-\d+\s+)?(?:follow-up\s+)?(?:validation package|verified preview|preview repaired|review package|implementation(?:\s+and\s+live-proof\s+update)?|validation update)\b/i.test(text)
    || /^(?:#{1,6}\s*)?(?:USA-\d+\s+)?Permanent Publisher Fix and Live Recovery\b/i.test(text)
    || /^(?:#{1,6}\s*)?(?:USA-\d+\s+)?follow-up:\s*dispatcher resume guard verified\b/i.test(text)
    || /^USA-\d+\s*[-:—]\s*.{0,220}\bVerified preview URL:\s*https?:\/\/\S+/i.test(text)
    || /^(?:#{1,6}\s*)?(?:Updated|Corrected|Completed|Deployed|Verified|Implemented|Fixed|Replaced|Added|Removed|Created|Published)\b.{0,240}\b(?:preview|deployment|vercel|work|artifact|link|review|validation|screenshot|route|build|change)/i.test(text)
    || /^What changed:/i.test(text)
    || /^New preview deployment:/i.test(text)
    || /^Current founder review links:/i.test(text);
}

export function completedCycleTime(lock) {
  if (!lock) {
    return null;
  }

  const status = lock.status || "";
  const previousStatus = lock.supersededPreviousStatus || "";
  const isCompleted = ["completed", "review_blocked"].includes(status)
    || (status === "superseded" && ["completed", "review_blocked"].includes(previousStatus));

  if (!isCompleted) {
    return null;
  }

  return lock.completedAt || lock.reviewBlockedAt || lock.heartbeatAt || lock.createdAt || null;
}

export function latestCompletedCycleLock(items = []) {
  return items
    .map((item) => {
      const lock = item?.lock || item;
      const completedAt = completedCycleTime(lock);
      const completedAtMs = Date.parse(completedAt || "");
      return Number.isFinite(completedAtMs) ? { ...item, lock, completedAt, completedAtMs } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.completedAtMs - a.completedAtMs)[0] || null;
}

export function latestRevisionCycle(items = []) {
  return items.reduce((latest, item) => {
    const lock = item?.lock || item || {};
    const candidates = [
      lock.revisionCycle,
      lock.revision?.cycle,
      lock.supersededByRevisionCycle,
    ].map((value) => Number(value)).filter((value) => Number.isFinite(value));
    return Math.max(latest, ...candidates, 0);
  }, 0);
}

const revisionIntentPatterns = [
  /\bfounder\s+(?:revision|feedback|direction|decision|request)\b/i,
  /\brevision(?:s| request)?\b/i,
  /\brequest(?:ed|ing|s)?\s+changes?\b/i,
  /\bchanges?\s+requested\b/i,
  /\banother\s+pass\b/i,
  /\bredesign\b/i,
  /\brework\b/i,
  /\bcorrect(?:ion|ive|ed)?\b/i,
  /\bworkflow\s+correction\b/i,
  /\bapply\s+the\s+following\s+(?:revisions?|changes?|updates?)\b/i,
  /\breturn\s+a\s+fresh\s+(?:verified\s+)?preview\b/i,
  /\bpreserve\s+the\s+current\b.{0,160}\b(?:apply|change|revise|update|replace|remove|restore)\b/i,
  /\b(?:replace|remove|change|revise|update|adjust|tighten|soften|reframe|restore|preserve)\b.{0,160}\b(?:section|copy|content|layout|design|preview|page|hero|language|visual|branch|worktree)\b/i,
  /\b(?:section|copy|content|layout|design|preview|page|hero|language|visual|branch|worktree)\b.{0,160}\b(?:replace|remove|change|revise|update|adjust|tighten|soften|reframe|restore|preserve)\b/i,
];

export function hasFounderRevisionIntent(text) {
  const normalized = normalizeText(text);
  return revisionIntentPatterns.some((pattern) => pattern.test(normalized));
}

export function summarizeFounderComment(comment, maxSnippet = 600) {
  return {
    author: commentAuthorName(comment),
    body: comment.body || "",
    createdAt: comment.createdAt || null,
    snippet: normalizeText(comment.body).slice(0, maxSnippet),
  };
}

export function founderCommentsAfter(issue, since, options = {}) {
  const sinceMs = Date.parse(since || "");
  if (!Number.isFinite(sinceMs)) {
    return [];
  }

  const founderAuthorNames = options.founderAuthorNames || defaultFounderAuthorNames;
  return (issue.comments?.nodes || [])
    .filter((comment) => founderCommentAllowed(comment, founderAuthorNames))
    .filter((comment) => !isGeneratedDispatcherComment(comment))
    .filter((comment) => !isFounderStatusNote(comment))
    .filter((comment) => Date.parse(comment.createdAt || "") > sinceMs)
    .sort((a, b) => Date.parse(a.createdAt || "") - Date.parse(b.createdAt || ""));
}

export function founderRevisionInfo(issue, previousLock, options = {}) {
  const since = completedCycleTime(previousLock);
  if (!since) {
    return {
      reclaim: false,
      reason: "no previous completed dispatcher cycle or review package",
      source: null,
    };
  }

  const sinceMs = Date.parse(since);
  if (!Number.isFinite(sinceMs)) {
    return {
      reclaim: false,
      reason: "previous completed dispatcher cycle has no valid timestamp",
      source: null,
    };
  }

  const comments = founderCommentsAfter(issue, since, options);
  if (!comments.length) {
    return {
      reclaim: false,
      reason: `no founder revision comment after ${since}`,
      source: null,
    };
  }

  const newest = comments.at(-1);
  const source = summarizeFounderComment(newest);
  const summarizedComments = comments.map((comment) => summarizeFounderComment(comment, 2000));

  if (!hasFounderRevisionIntent(newest.body)) {
    return {
      ambiguous: true,
      comments: summarizedComments,
      reclaim: false,
      reason: `newest founder comment after ${since} does not clearly request revisions`,
      source,
    };
  }

  return {
    comments: summarizedComments,
    previousCompletedAt: since,
    reclaim: true,
    reason: `newest founder revision comment after ${since}`,
    source,
  };
}

export function revisionCycleAfter(previousLock, previousRevisionCycle = null) {
  const lockCycle = Number(previousLock?.revisionCycle || previousLock?.revision?.cycle || previousLock?.supersededByRevisionCycle || 1);
  const historyCycle = Number(previousRevisionCycle || 0);
  const previousCycle = Math.max(
    Number.isFinite(lockCycle) ? lockCycle : 1,
    Number.isFinite(historyCycle) ? historyCycle : 0,
    1,
  );
  return Math.max(2, previousCycle + 1);
}

export function continuedFounderRevisionFromLock(lock) {
  const revisionCycle = Number(lock?.revisionCycle || 0);
  if (!lock || lock.status !== "cooldown" || !Number.isFinite(revisionCycle) || revisionCycle < 2) {
    return null;
  }

  if (!lock.revisionPreviousCompletedAt || !Array.isArray(lock.revisionFounderComments)) {
    return null;
  }

  return {
    comments: lock.revisionFounderComments,
    previousCompletedAt: lock.revisionPreviousCompletedAt,
    reclaim: true,
    reason: `continuing founder revision cycle ${revisionCycle} after runner retry window`,
    revisionCycle,
    source: lock.revisionFounderComments.at(-1) || null,
    supersedesFailedLockPath: lock.supersedesFailedLockPath || null,
    supersedesLockPath: lock.supersedesLockPath || null,
  };
}

export function resolveFounderRevisionContext({
  continuedRevision = null,
  previousCompletedLock = null,
  previousRevisionCycle = null,
  reclaim = null,
} = {}) {
  const revision = continuedRevision || reclaim || null;
  return {
    revision,
    revisionCycle: continuedRevision?.revisionCycle || (revision ? revisionCycleAfter(previousCompletedLock, previousRevisionCycle) : null),
  };
}

export function supersedeLockRecord(lock, options = {}) {
  const at = options.at || new Date().toISOString();
  return {
    ...lock,
    status: "superseded",
    supersededAt: at,
    supersededByBranch: options.branch || null,
    supersededByLockPath: options.lockPath || null,
    supersededByRevisionCycle: options.revisionCycle || null,
    supersededPreviousStatus: lock?.supersededPreviousStatus || lock?.status || null,
    supersededReason: options.reason || "Founder revision cycle superseded this prior review package.",
  };
}

export function buildFounderRevisionPromptSection(lock) {
  if (!lock?.revisionCycle || lock.revisionCycle < 2) {
    return "";
  }

  const websitePreviewFirst = lock.repositoryName === "website";
  const comments = lock.revisionFounderComments || [];
  const commentBlock = comments.length
    ? comments.map((comment, index) => [
      `Founder comment ${index + 1} (${comment.createdAt || "unknown"}${comment.author ? `, ${comment.author}` : ""}):`,
      comment.body || comment.snippet || "",
    ].join("\n")).join("\n\n---\n\n")
    : "(No founder comments were captured on the lock; inspect Linear before continuing.)";

  return [
    "Founder revision cycle:",
    `- Revision cycle: ${lock.revisionCycle}`,
    `- Previous completed/review package time: ${lock.revisionPreviousCompletedAt || "unknown"}`,
    `- Supersedes previous lock: ${lock.supersedesLockPath || "unknown"}`,
    lock.supersedesFailedLockPath ? `- Supersedes terminal failed lock: ${lock.supersedesFailedLockPath}` : null,
    websitePreviewFirst
      ? "- Active website iteration uses the preview-first gate: commit and push the revision on the existing issue branch, create or update the protected preview, verify the exact preview URL renders the intended page, and report only the verified preview URL, one update sentence, and any true blocker. Do not wait for screenshots, long review packages, changed-file summaries, validation narratives, known-limitations sections, estimated review time, formal In Review status, or test submissions unless merge-readiness was explicitly requested."
      : "- The new review package must clearly state that it supersedes the previous package and must include a usable preview or directly viewable assets, validation summary, changed files, known limitations, estimated review time, and the exact founder decision requested.",
    "",
    "Founder comments newer than the previous completed cycle, oldest first:",
    "",
    commentBlock,
  ].filter((line) => line !== null).join("\n");
}

export function buildFounderRevisionReclaimComment(lock) {
  const cycle = lock.revisionCycle || 2;
  const worktreeLine = lock.reuseExistingWorktree
    ? "Reclaiming the existing worktree"
    : "Existing worktree was unavailable; creating one replacement worktree";

  return [
    `Founder revisions detected. ${worktreeLine} and beginning revision cycle ${cycle}.`,
    "",
    `Runner: ${lock.runner}`,
    `Branch: \`${lock.branch}\``,
    `Worktree: \`${lock.worktreePath}\``,
    `Supersedes prior review package: ${lock.revisionPreviousCompletedAt || "unknown"}`,
    lock.supersedesFailedLockPath ? `Supersedes terminal failed lock: \`${lock.supersedesFailedLockPath}\`` : null,
    "",
    lock.repositoryName === "website"
      ? "Prior preview links, screenshots, and completion comments remain in history. The next verified preview update supersedes them for active website iteration."
      : "Prior preview links, screenshots, and completion comments remain in history. The next review package must explicitly supersede them.",
  ].filter((line) => line !== null).join("\n");
}
