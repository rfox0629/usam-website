/**
 * Repository resolution against repository-registry.json v2 (USA-89 R2/R4).
 *
 * Fail-closed by design. A bare repository name is NEVER accepted: an empty
 * duplicate USA-Missionaries/usam-website once existed alongside the canonical
 * rfox0629/usam-website, so resolving by name alone could target the wrong
 * repository. Callers must supply a fully qualified "owner/repo" slug.
 *
 * There is deliberately no default repository and no inference from folder name.
 */

import { readFileSync, existsSync } from "node:fs";

export class RepositoryResolutionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "RepositoryResolutionError";
    this.code = code;
  }
}

const REQUIRED_FIELDS = [
  "githubOwner", "repository", "slug", "defaultBranch",
  "runtimePath", "vercelProject", "supabaseProject", "linearApplication", "status",
];

/** Load and structurally validate the registry. Throws on anything malformed. */
export function loadRegistry(registryPath) {
  if (!registryPath || !existsSync(registryPath)) {
    throw new RepositoryResolutionError(
      `Repository registry not found: ${registryPath}`, "REGISTRY_MISSING");
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(registryPath, "utf8"));
  } catch (error) {
    throw new RepositoryResolutionError(
      `Repository registry is not valid JSON: ${error.message}`, "REGISTRY_MALFORMED");
  }

  if (parsed?.schemaVersion !== 2) {
    throw new RepositoryResolutionError(
      `Repository registry must be schemaVersion 2, got ${parsed?.schemaVersion}. ` +
      `v1 has no ownership data and cannot be resolved against.`, "REGISTRY_MALFORMED");
  }

  if (!Array.isArray(parsed.applications)) {
    throw new RepositoryResolutionError(
      "Repository registry has no applications[] array.", "REGISTRY_MALFORMED");
  }

  for (const record of parsed.applications) {
    for (const field of REQUIRED_FIELDS) {
      if (!(field in record)) {
        throw new RepositoryResolutionError(
          `Registry record ${record.slug ?? "(unnamed)"} is missing required field "${field}".`,
          "REGISTRY_MALFORMED");
      }
    }
    if (!record.githubOwner) {
      throw new RepositoryResolutionError(
        `Registry record ${record.repository ?? "(unnamed)"} has no githubOwner. ` +
        `Ownership is mandatory.`, "OWNER_MISSING");
    }
  }

  return parsed;
}

/** Expand a record whose repository/slug fields hold comma-separated lists. */
function expandSlugs(record) {
  return String(record.slug)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Resolve a fully qualified "owner/repo" slug to its registry record.
 * Throws unless exactly one record matches.
 */
export function resolveRepository(registry, slug) {
  if (typeof slug !== "string" || slug.trim() === "") {
    throw new RepositoryResolutionError(
      "A repository slug is required. Pass a fully qualified \"owner/repo\".",
      "SLUG_REQUIRED");
  }

  const candidate = slug.trim();

  if (!candidate.includes("/")) {
    throw new RepositoryResolutionError(
      `Refusing to resolve bare repository name "${candidate}". ` +
      `A fully qualified "owner/repo" slug is required — repository names are ` +
      `not unique across owners.`, "OWNER_MISSING");
  }

  const [owner, ...rest] = candidate.split("/");
  const repo = rest.join("/");
  if (!owner || !repo) {
    throw new RepositoryResolutionError(
      `Malformed repository slug "${candidate}". Expected "owner/repo".`, "SLUG_MALFORMED");
  }

  const matches = registry.applications.filter((record) =>
    expandSlugs(record).includes(candidate));

  if (matches.length === 0) {
    throw new RepositoryResolutionError(
      `No registry record for "${candidate}". If this repository is real, add it ` +
      `to repository-registry.json — resolution never falls back to a default.`,
      "REPOSITORY_NOT_FOUND");
  }

  if (matches.length > 1) {
    throw new RepositoryResolutionError(
      `Ambiguous: ${matches.length} registry records match "${candidate}". ` +
      `Exactly one is required.`, "AMBIGUOUS_MATCH");
  }

  const record = matches[0];
  return {
    slug: candidate,
    owner,
    repository: repo,
    defaultBranch: record.defaultBranch,
    visibility: record.visibility ?? null,
    vercelProject: record.vercelProject,
    vercelProjectId: record.vercelProjectId ?? null,
    supabaseProject: record.supabaseProject,
    supabaseRef: record.supabaseRef ?? null,
    linearApplication: record.linearApplication,
    runtimePath: record.runtimePath,
    status: record.status,
    application: record.application,
  };
}

/**
 * Resolve the Vercel project for a slug. Fails closed rather than defaulting —
 * publishing to the wrong Vercel project is a production incident.
 */
export function resolveVercelProject(registry, slug) {
  const record = resolveRepository(registry, slug);
  if (!record.vercelProject) {
    throw new RepositoryResolutionError(
      `Registry record "${slug}" has no Vercel project mapping. ` +
      `Refusing to guess.`, "VERCEL_PROJECT_MISSING");
  }
  return { project: record.vercelProject, projectId: record.vercelProjectId };
}
