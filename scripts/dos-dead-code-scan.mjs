// DOS dead-code scan (USA-239 Phase 5). Report only; deletes nothing.
//
// Lists every function declared in app/dos/app/DosMvpAppClient.tsx whose name
// appears nowhere else in the repository's code (the file exports only the
// client component, so a name referenced once is referenced only by its own
// declaration). Names that a regression script still pins are marked, because
// deleting those needs the script updated in the same PR. This is the method
// behind the Phase 7 deletion manifest, made repeatable so the manifest can be
// re-validated against current main before any cleanup PR.
//
//   npm run scan:dos-dead-code            human-readable report
//   npm run scan:dos-dead-code -- --json  machine-readable
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const clientPath = "app/dos/app/DosMvpAppClient.tsx";
const json = process.argv.includes("--json");
const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter((file) => /\.(?:ts|tsx|mjs|js)$/.test(file) && !file.startsWith("docs/"));
const sources = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));
const client = sources.get(clientPath);

if (!client) {
  throw new Error(`Missing ${clientPath}`);
}

const declared = [...new Set([...client.matchAll(/^(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/gm)].map((match) => match[1]))].sort();
const findings = [];

for (const name of declared) {
  const pattern = new RegExp(`\\b${name}\\b`, "g");
  let references = 0;
  const pinnedBy = [];

  for (const [file, source] of sources) {
    const count = (source.match(pattern) ?? []).length;

    if (!count) {
      continue;
    }

    references += count;

    if (file.startsWith("scripts/")) {
      pinnedBy.push(file);
    }
  }

  // One reference is the declaration itself. A script mention keeps the name
  // in the repository but is not a call, so it is listed as pinned rather
  // than hidden.
  if (references - pinnedBy.length <= 1) {
    findings.push({ name, pinnedBy });
  }
}

if (json) {
  console.log(JSON.stringify({ client: clientPath, declared: declared.length, zeroReference: findings }, null, 2));
} else {
  const unpinned = findings.filter((finding) => !finding.pinnedBy.length);
  const pinned = findings.filter((finding) => finding.pinnedBy.length);

  console.log(`${clientPath}: ${declared.length} functions declared, ${findings.length} referenced only by their declaration.`);
  console.log(`\nDeletable without touching a script (${unpinned.length}):\n${unpinned.map((finding) => `- ${finding.name}`).join("\n")}`);

  if (pinned.length) {
    console.log(`\nPinned by a regression script (${pinned.length}); update the script in the same PR:\n${pinned.map((finding) => `- ${finding.name} (${finding.pinnedBy.join(", ")})`).join("\n")}`);
  }
}
