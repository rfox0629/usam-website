#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const home = "/Users/ryanfox";
const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const evidenceRoot = join(home, ".usam-dispatcher", "evidence", `${now}-mac-dev-environment-audit`);

const canonicalRepos = [
  join(home, "Code", "usam-automation"),
  join(home, "Code", "usam-website"),
  join(home, "Code", "save-website"),
  join(home, "Code", "stewardship.capital"),
  join(home, "Code", "theLordsarmy-website"),
];

const requiredRoots = [
  join(home, "Code"),
  join(home, "Documents", "GitHub"),
  join(home, "Documents", "Codex"),
  join(home, "Documents", "Codex 2"),
  join(home, "Projects"),
  join(home, "USAM-Worktrees"),
  join(home, "USAM-Archive"),
  join(home, "USAM-Backups"),
  join(home, "USAM-Releases"),
  join(home, "Archived-USAM-Automation-20260731T150953Z"),
  "/Volumes/LaCie/USAM-Archive",
];

const extraHomeScanRoots = [
  join(home, "Desktop"),
  join(home, "Documents"),
  join(home, "Downloads"),
];

const skipNames = new Set([
  ".cache",
  ".git",
  ".next",
  ".npm",
  ".pnpm-store",
  ".turbo",
  ".vercel",
  "Applications",
  "Library",
  "Movies",
  "Music",
  "node_modules",
  "Pictures",
  "publications",
  "tmp",
]);

function sh(cmd, args, options = {}) {
  try {
    return execFileSync(cmd, args, {
      cwd: options.cwd || evidenceRoot,
      encoding: "utf8",
      maxBuffer: options.maxBuffer || 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }).trimEnd();
  } catch (error) {
    const stderr = error.stderr?.toString?.() || "";
    const stdout = error.stdout?.toString?.() || "";
    return { error: error.message, stdout: stdout.trimEnd(), stderr: stderr.trimEnd(), status: error.status ?? null };
  }
}

function safeStat(path) {
  try {
    const s = lstatSync(path);
    return {
      exists: true,
      isDirectory: s.isDirectory(),
      isFile: s.isFile(),
      isSymbolicLink: s.isSymbolicLink(),
      mtime: s.mtime.toISOString(),
      size: s.size,
    };
  } catch {
    return { exists: false };
  }
}

function walkForGitRepos(root, maxDepth, found = new Map(), depth = 0) {
  if (!existsSync(root) || depth > maxDepth) return found;
  let entries = [];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return found;
  }

  const gitMarker = join(root, ".git");
  if (existsSync(gitMarker)) {
    const top = sh("git", ["rev-parse", "--show-toplevel"], { cwd: root });
    if (typeof top === "string" && top.startsWith("/")) {
      found.set(resolve(top), resolve(top));
      return found;
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    if (skipNames.has(entry.name)) continue;
    if (entry.name.endsWith(".app")) continue;
    const child = join(root, entry.name);
    let real = child;
    try {
      real = realpathSync(child);
    } catch {
      continue;
    }
    if (!real.startsWith(home) && !real.startsWith("/Volumes/LaCie")) continue;
    walkForGitRepos(child, maxDepth, found, depth + 1);
  }
  return found;
}

function parseRemoteSlug(remoteOutput) {
  if (typeof remoteOutput !== "string") return null;
  const first = remoteOutput.split("\n").find((line) => line.includes("(fetch)")) || remoteOutput.split("\n")[0] || "";
  const match = first.match(/[:/]([^/\s:]+\/[^/\s]+?)(?:\.git)?\s/);
  return match ? match[1].replace(/\.git$/, "") : null;
}

function statusBuckets(statusPorcelain) {
  const buckets = { staged: [], modified: [], deleted: [], untracked: [] };
  for (const line of String(statusPorcelain || "").split("\n").filter(Boolean)) {
    const code = line.slice(0, 2);
    const file = line.slice(3);
    if (code === "??") {
      buckets.untracked.push(file);
      continue;
    }
    if (code[0] !== " ") buckets.staged.push(`${code[0]} ${file}`);
    if (code[1] === "M") buckets.modified.push(file);
    if (code[1] === "D" || code[0] === "D") buckets.deleted.push(file);
  }
  return buckets;
}

function duKb(path) {
  const result = sh("du", ["-sk", path], { maxBuffer: 1024 * 1024 });
  if (typeof result !== "string") return null;
  const value = Number(result.split(/\s+/)[0]);
  return Number.isFinite(value) ? value : null;
}

function classifyPath(path, remoteSlug) {
  if (canonicalRepos.includes(path)) return "canonical";
  if (path.startsWith(join(home, "USAM-Worktrees"))) return "worktree";
  if (/Archive|Backups|Releases|Archived-USAM-Automation/.test(path)) return "archive-or-backup";
  if (path.startsWith(join(home, "Documents")) || path.startsWith(join(home, "Projects"))) {
    return remoteSlug ? "duplicate-or-legacy" : "unknown-old-folder";
  }
  return "unknown";
}

function gitInfo(path) {
  const remote = sh("git", ["remote", "-v"], { cwd: path });
  const status = sh("git", ["status", "--porcelain=v1", "-uall"], { cwd: path });
  const statusShort = sh("git", ["status", "-sb"], { cwd: path });
  const head = sh("git", ["rev-parse", "HEAD"], { cwd: path });
  const branch = sh("git", ["branch", "--show-current"], { cwd: path });
  const defaultBranch = sh("git", ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], { cwd: path });
  const localBranches = sh("git", ["branch", "--format=%(refname:short) %(objectname:short) %(upstream:short)"], { cwd: path });
  const remoteBranches = sh("git", ["branch", "-r", "--format=%(refname:short) %(objectname:short)"], { cwd: path });
  const uniqueCommits = sh("git", ["log", "--branches", "--not", "--remotes", "--oneline", "--decorate", "--max-count=200"], { cwd: path });
  const stashes = sh("git", ["stash", "list"], { cwd: path });
  const worktrees = sh("git", ["worktree", "list", "--porcelain"], { cwd: path });
  const remotes = typeof remote === "string" ? remote.split("\n").filter(Boolean) : [];
  const remoteSlug = parseRemoteSlug(remote);
  return {
    path,
    classification: classifyPath(path, remoteSlug),
    remoteSlug,
    remotes,
    currentBranch: typeof branch === "string" ? branch : null,
    defaultBranch: typeof defaultBranch === "string" ? defaultBranch : null,
    head: typeof head === "string" ? head : null,
    statusShort,
    clean: typeof status === "string" ? status.length === 0 : false,
    statusPorcelain: typeof status === "string" ? status.split("\n").filter(Boolean) : [],
    statusBuckets: typeof status === "string" ? statusBuckets(status) : { staged: [], modified: [], deleted: [], untracked: [] },
    localBranches: typeof localBranches === "string" ? localBranches.split("\n").filter(Boolean) : [],
    remoteBranches: typeof remoteBranches === "string" ? remoteBranches.split("\n").filter(Boolean) : [],
    uniqueLocalCommitsNotOnRemote: typeof uniqueCommits === "string" ? uniqueCommits.split("\n").filter(Boolean) : [],
    stashes: typeof stashes === "string" ? stashes.split("\n").filter(Boolean) : [],
    worktrees: typeof worktrees === "string" ? worktrees.split("\n").filter(Boolean) : [],
    sizeKb: duKb(path),
  };
}

function processReport(repos) {
  const ps = sh("ps", ["-axo", "pid,ppid,lstart,command"], { maxBuffer: 50 * 1024 * 1024 });
  const lines = typeof ps === "string" ? ps.split("\n") : [];
  const rootPatterns = [
    ...canonicalRepos,
    join(home, "Documents", "GitHub"),
    join(home, "Documents", "Codex"),
    join(home, "Documents", "Codex 2"),
    join(home, "USAM-Worktrees"),
    join(home, "USAM-Automation"),
    join(home, "Archived-USAM-Automation-20260731T150953Z"),
  ];
  const matches = lines.filter((line) => rootPatterns.some((pattern) => line.includes(pattern)));
  const byRepo = Object.fromEntries(repos.map((repo) => [
    repo.path,
    matches.filter((line) => line.includes(repo.path)),
  ]));
  return { allMatches: matches, byRepo };
}

function pathReferenceReport() {
  const targets = [
    join(home, "Code", "usam-automation"),
    join(home, "Library", "LaunchAgents"),
    join(home, ".codex", "config.toml"),
    join(home, ".codex", "AGENTS.md"),
    join(home, ".codex", "instructions.md"),
    join(home, ".claude", "settings.json"),
    join(home, ".claude", "settings.local.json"),
  ].filter(existsSync);
  const patterns = [
    "/Users/ryanfox/Documents/GitHub",
    "/Users/ryanfox/Documents/Codex",
    "/Users/ryanfox/USAM-Automation",
    "/Users/ryanfox/Archived-USAM-Automation",
  ];
  const args = [
    "-n",
    "--hidden",
    "--glob", "!.git/**",
    "--glob", "!node_modules/**",
    "--glob", "!.next/**",
    "--glob", "!tmp/**",
    "--glob", "!*.env",
    "--glob", "!.env*",
    patterns.join("|"),
    ...targets,
  ];
  const result = sh("rg", args, { maxBuffer: 20 * 1024 * 1024 });
  return typeof result === "string" ? result.split("\n").filter(Boolean) : [`rg failed: ${result.error || result.stderr || "unknown"}`];
}

function listFiles(root, maxDepth, depth = 0, rows = []) {
  if (!existsSync(root) || depth > maxDepth) return rows;
  let entries = [];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return rows;
  }
  for (const entry of entries) {
    const path = join(root, entry.name);
    const info = safeStat(path);
    rows.push({ path, depth, ...info });
    if (entry.isDirectory() && !skipNames.has(entry.name)) listFiles(path, maxDepth, depth + 1, rows);
  }
  return rows;
}

function lacieReport() {
  const root = "/Volumes/LaCie/USAM-Archive";
  if (!existsSync(root)) return { mounted: false, root };
  const listing = listFiles(root, 4).map((item) => ({
    path: item.path,
    depth: item.depth,
    isDirectory: item.isDirectory,
    size: item.size,
    mtime: item.mtime,
  }));
  const bundles = listing.filter((item) => /\.bundle$/i.test(item.path) && !basename(item.path).startsWith("._"));
  const tars = listing.filter((item) => /\.(tar|tgz|tar\.gz)$/i.test(item.path));
  const encrypted = listing.filter((item) => /\.(age|gpg|enc|encrypted|crypt)$/i.test(item.path) || item.path.includes("/encrypted/"));
  const checksums = listing.filter((item) => /\.(sha256|sha512|md5)$/i.test(item.path) || /checksum/i.test(basename(item.path)));

  const bundleChecks = bundles.map((item) => {
    const verified = sh("git", ["bundle", "verify", item.path], {
      cwd: join(home, "Code", "usam-automation"),
      maxBuffer: 1024 * 1024,
    });
    return { path: item.path, verified };
  });
  const tarChecks = tars.map((item) => {
    const result = spawnSync("tar", ["-tf", item.path], {
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      path: item.path,
      status: result.status,
      error: result.error?.message || null,
      stderr: result.stderr?.trim() || null,
      sample: result.stdout?.split("\n").filter(Boolean).slice(0, 25) || [],
      truncated: Boolean(result.error && result.error.code === "ENOBUFS"),
    };
  });

  const checksumSamples = checksums.slice(0, 20).map((item) => {
    let sample = "";
    try {
      sample = readFileSync(item.path, "utf8").split("\n").slice(0, 10).join("\n");
    } catch (error) {
      sample = `unable to read checksum file: ${error.message}`;
    }
    return { path: item.path, sample };
  });

  return { mounted: true, root, listing, bundles, bundleChecks, tars, tarChecks, encrypted, checksums, checksumSamples };
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function writeJson(name, value) {
  writeFileSync(join(evidenceRoot, name), `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(name, value) {
  writeFileSync(join(evidenceRoot, name), `${value.trimEnd()}\n`);
}

function markdownList(items, empty = "None observed.") {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${empty}`;
}

function main() {
  mkdirSync(evidenceRoot, { recursive: true });

  const rootStatuses = requiredRoots.map((path) => ({ path, ...safeStat(path) }));
  const found = new Map();
  for (const root of requiredRoots) walkForGitRepos(root, 8, found);
  for (const root of extraHomeScanRoots) walkForGitRepos(root, 4, found);
  for (const path of canonicalRepos) if (existsSync(path)) found.set(path, path);

  const repos = [...found.keys()].sort().map(gitInfo);
  const canonicalBySlug = new Map(
    repos
      .filter((repo) => repo.classification === "canonical" && repo.remoteSlug)
      .map((repo) => [repo.remoteSlug, repo]),
  );
  const oldMappings = repos.map((repo) => {
    const canonical = repo.remoteSlug ? canonicalBySlug.get(repo.remoteSlug) : null;
    let workStatus = "unclear and needing founder review";
    if (repo.classification === "canonical") workStatus = "canonical active repository";
    else if (repo.statusBuckets.untracked.length || repo.statusBuckets.modified.length || repo.statusBuckets.staged.length || repo.statusBuckets.deleted.length) {
      workStatus = "uniquely uncommitted or dirty";
    } else if (repo.uniqueLocalCommitsNotOnRemote.length) {
      workStatus = "uniquely committed";
    } else if (repo.remoteSlug && canonical) {
      workStatus = "already pushed or already represented by canonical remote";
    } else if (repo.classification === "archive-or-backup") {
      workStatus = "archive/backup copy; review before cleanup";
    }
    return {
      sourcePath: repo.path,
      canonicalPath: canonical?.path || null,
      remoteSlug: repo.remoteSlug,
      classification: repo.classification,
      workStatus,
    };
  });

  const processes = processReport(repos);
  const lacie = lacieReport();
  const pathRefs = pathReferenceReport();
  const worktreeRepos = repos.filter((repo) => repo.classification === "worktree");
  const untrackedRows = repos.flatMap((repo) =>
    repo.statusBuckets.untracked.map((file) => ({ repo: repo.path, file })),
  );
  const uniqueCommitRows = repos.flatMap((repo) =>
    repo.uniqueLocalCommitsNotOnRemote.map((commit) => ({ repo: repo.path, commit })),
  );

  writeJson("root-statuses.json", rootStatuses);
  writeJson("repository-inventory.json", repos);
  writeJson("old-folder-to-canonical-mapping.json", oldMappings);
  writeJson("active-process-path-report.json", processes);
  writeJson("lacie-backup-verification.json", lacie);
  writeJson("old-path-references.json", pathRefs);

  writeText("repository-inventory.csv", [
    ["path", "classification", "remoteSlug", "currentBranch", "head", "defaultBranch", "clean", "sizeKb", "untrackedCount", "uniqueLocalCommitCount", "stashCount"].map(csvEscape).join(","),
    ...repos.map((repo) => [
      repo.path,
      repo.classification,
      repo.remoteSlug,
      repo.currentBranch,
      repo.head,
      repo.defaultBranch,
      repo.clean,
      repo.sizeKb,
      repo.statusBuckets.untracked.length,
      repo.uniqueLocalCommitsNotOnRemote.length,
      repo.stashes.length,
    ].map(csvEscape).join(",")),
  ].join("\n"));

  writeText("unique-commits-report.md", [
    "# Unique Local Commits",
    "",
    markdownList(uniqueCommitRows.map((row) => `\`${row.repo}\`: ${row.commit}`)),
  ].join("\n"));

  writeText("untracked-source-report.md", [
    "# Untracked And Dirty Source",
    "",
    "This report lists paths only. It intentionally does not print file contents.",
    "",
    markdownList(untrackedRows.map((row) => `\`${row.repo}\`: \`${row.file}\``)),
    "",
    "## Dirty Repositories",
    "",
    markdownList(repos.filter((repo) => !repo.clean).map((repo) => `\`${repo.path}\` (${repo.statusPorcelain.length} status entries)`)),
  ].join("\n"));

  writeText("active-process-path-report.md", [
    "# Active Process And Path Report",
    "",
    markdownList(processes.allMatches.map((line) => `\`${line}\``)),
  ].join("\n"));

  writeText("worktree-report.md", [
    "# Worktree Report",
    "",
    markdownList(worktreeRepos.map((repo) => `\`${repo.path}\` branch \`${repo.currentBranch || "(detached)"}\`, status: ${repo.clean ? "clean" : "dirty"}`)),
  ].join("\n"));

  writeText("old-folder-to-canonical-mapping.md", [
    "# Old Folder To Canonical Mapping",
    "",
    markdownList(oldMappings.map((row) => [
      `\`${row.sourcePath}\` -> ${row.canonicalPath ? `\`${row.canonicalPath}\`` : "no canonical match found"}`,
      `classification: ${row.classification}`,
      `work: ${row.workStatus}`,
    ].join("; "))),
  ].join("\n"));

  writeText("lacie-backup-verification-report.md", [
    "# LaCie Backup Verification",
    "",
    `Mounted: ${lacie.mounted ? "yes" : "no"}`,
    `Root: \`${lacie.root}\``,
    "",
    "## Bundles",
    markdownList((lacie.bundleChecks || []).map((item) => `\`${item.path}\`: ${typeof item.verified === "string" ? "verified/listed" : `error ${item.verified.error || item.verified.stderr}`}`)),
    "",
    "## Tar Archives",
    markdownList((lacie.tarChecks || []).map((item) => `\`${item.path}\`: status ${item.status}; sample entries ${item.sample.length}`)),
    "",
    "## Encrypted Items",
    markdownList((lacie.encrypted || []).map((item) => `\`${item.path}\``)),
    "",
    "## Checksum Files",
    markdownList((lacie.checksums || []).map((item) => `\`${item.path}\``)),
    "",
    "No archive was extracted by this audit.",
  ].join("\n"));

  writeText("old-path-references.md", [
    "# Old Path References",
    "",
    markdownList(pathRefs.map((line) => `\`${line}\``)),
  ].join("\n"));

  writeText("proposed-preservation-integration-plan.md", [
    "# Proposed Preservation And Integration Plan",
    "",
    markdownList(oldMappings.map((row) => {
      if (row.classification === "canonical") return `Keep \`${row.sourcePath}\` as canonical.`;
      if (row.workStatus === "uniquely committed") return `Preserve \`${row.sourcePath}\` by pushing or copying a scoped safety branch after branch-level review.`;
      if (row.workStatus === "uniquely uncommitted or dirty") return `Founder review required for \`${row.sourcePath}\`; preserve dirty/untracked paths in a scoped safety branch before cleanup.`;
      if (row.workStatus.startsWith("already")) return `Archive candidate after founder approval: \`${row.sourcePath}\` maps to \`${row.canonicalPath}\`.`;
      return `Founder review required: \`${row.sourcePath}\`.`;
    })),
  ].join("\n"));

  writeText("proposed-archive-cleanup-plan.md", [
    "# Proposed Archive And Cleanup Plan",
    "",
    "No deletion is authorized or performed by this audit.",
    "",
    markdownList(oldMappings
      .filter((row) => row.classification !== "canonical")
      .map((row) => `\`${row.sourcePath}\`: ${row.workStatus}; proposed action requires founder review before archive/delete.`)),
  ].join("\n"));

  writeText("canonical-environment-guide.md", [
    "# Canonical Environment Guide",
    "",
    "- Active repositories live under `/Users/ryanfox/Code/`.",
    "- Temporary issue worktrees live under `/Users/ryanfox/USAM-Worktrees/`.",
    "- Runtime state lives under `/Users/ryanfox/.usam-dispatcher/`.",
    "- Do not start new work from `Documents/GitHub`, `Documents/Codex`, `Documents/Codex 2`, archives, backups, or `/Users/ryanfox/USAM-Automation`.",
    "- `/Users/ryanfox/Code/theLordsarmy-website` is active and not an archive candidate.",
    "- Preserve before cleanup; delete nothing without founder approval.",
  ].join("\n"));

  writeText("summary.md", [
    "# USA-139 Environment Audit Summary",
    "",
    `Evidence root: \`${evidenceRoot}\``,
    `Repositories discovered: ${repos.length}`,
    `Dirty repositories: ${repos.filter((repo) => !repo.clean).length}`,
    `Repositories with unique local commits not on remotes: ${repos.filter((repo) => repo.uniqueLocalCommitsNotOnRemote.length).length}`,
    `LaCie mounted: ${lacie.mounted ? "yes" : "no"}`,
    "",
    "## Required Roots",
    markdownList(rootStatuses.map((root) => `\`${root.path}\`: ${root.exists ? "present" : "missing"}`)),
    "",
    "## Immediate Review Items",
    markdownList(oldMappings
      .filter((row) => /unique|unclear|review/.test(row.workStatus))
      .map((row) => `\`${row.sourcePath}\`: ${row.workStatus}`)),
  ].join("\n"));

  console.log(evidenceRoot);
}

main();
