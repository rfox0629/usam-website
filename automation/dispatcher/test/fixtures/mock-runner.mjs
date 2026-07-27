import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const delayMs = Number(process.argv[2] || 200);
const issue = process.env.DISPATCHER_ISSUE_IDENTIFIER || "unknown";
const outputPath = process.env.DISPATCHER_OUTPUT_PATH;
const worktreePath = process.env.DISPATCHER_WORKTREE || process.cwd();

let prompt = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  prompt += chunk;
});

await new Promise((resolvePromise) => process.stdin.on("end", resolvePromise));
await new Promise((resolvePromise) => setTimeout(resolvePromise, delayMs));

const outputFile = join(worktreePath, "docs", "dispatcher-fixtures", `${issue.toLowerCase()}.md`);
mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, `# ${issue}\n\nPrompt bytes: ${prompt.length}\n`);

if (outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `Mock runner completed ${issue} in ${delayMs}ms.\n`);
}

process.stdout.write(`mock runner completed ${issue}\n`);
