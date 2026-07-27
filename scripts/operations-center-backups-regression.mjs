import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

const files = {
  actionRoute: "app/api/admin/operations-center/backups/actions/route.ts",
  agent: "src/lib/operations-center/backup-agent.ts",
  component: "app/admin/operations-center/_components/BackupControlCenter.tsx",
  docs: "docs/operations-center-backups-security.md",
  library: "src/lib/operations-center/backups.ts",
  page: "app/admin/operations-center/infrastructure/backups/page.tsx",
  statusRoute: "app/api/admin/operations-center/backups/route.ts",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, read(file)]),
);
const combined = Object.values(source).join("\n");
const codeCombined = [
  source.actionRoute,
  source.agent,
  source.component,
  source.library,
  source.page,
  source.statusRoute,
].join("\n");

assert(source.page.includes("/admin/operations-center/infrastructure/backups") || source.page.includes("Operations Center"), "Backups page lives under the Operations Center route");
assert(source.component.includes("Infrastructure / Backups"), "UI exposes Infrastructure / Backups");
assert(source.component.includes("Backblaze"), "Guided Backblaze setup is present");
assert(source.component.includes("Code Protection"), "Read-only Code Protection card is present");
assert(source.component.includes("Backup and Restore-Test"), "Backup and restore-test view is present");
assert(source.component.includes("Disk and Retention"), "Disk-capacity and retention view is present");
assert(source.component.includes("Recent Backup Signals"), "History view is present");

assert(!/\blocalStorage\b|\bsessionStorage\b/.test(codeCombined), "Backup UI/API do not use browser storage");
assert(!/type=["']password["']/.test(source.component), "Preview wizard does not collect secret values");
assert(!/createSupabase(Admin|Server)Client/.test(codeCombined), "Backup control center does not store backup secrets in Supabase");
assert(!/vercel env|VERCEL_[A-Z0-9_]*SECRET|process\.env\.[A-Z0-9_]*(PASSWORD|TOKEN|SECRET|KEY)/.test(codeCombined), "Backup control center does not depend on Vercel-stored backup secrets");

assert(source.statusRoute.includes("getAdminAuthorization"), "Read-only status API requires admin authorization");
assert(source.actionRoute.includes("hasAdminRole(authorization, [\"admin\"])"), "Action API is admin-only");
assert(source.actionRoute.includes("x-usam-operations-intent"), "Action API requires an explicit same-origin intent header");
assert(source.actionRoute.includes("isBackupActionId(payload.actionId)"), "Action API accepts only known action ids");
assert(!/payload\.(command|args|argv|path|env|script|shell|secret|password|token|key)/.test(source.actionRoute), "Action API has no command, argument, path, environment, or secret passthrough");

assert(source.agent.includes("shell: false"), "Local process execution disables shell mode");
assert(source.agent.includes("USAM_BACKUP_AGENT_LOCAL_EXECUTION") && source.agent.includes("enabled"), "Local execution is opt-in for the Mac Mini");
assert(source.agent.includes("resolveApprovedScript"), "Script execution goes through approved USA-86 script resolution");
assert(source.library.includes("backup/bin/usam-backup.sh"), "Backup-now action maps to the USA-86 backup script");
assert(source.library.includes("backup/bin/usam-restore.sh"), "Restore-test action maps to the USA-86 restore script");
assert(source.library.includes("backup/bin/usam-backup-selftest.sh"), "Self-test action maps to the USA-86 self-test script");
assert(source.agent.includes("/usr/bin/security") && !source.agent.includes("-w\""), "Keychain verification checks item presence without printing secret values");

assert(source.library.includes("No secrets are stored in Supabase, Vercel, browser storage, Linear comments, or source files."), "Safeguards explicitly prohibit secret storage");
assert(source.library.includes("there is no command, argument, or shell body field"), "Safeguards explicitly prohibit shell passthrough");
assert(source.docs.includes("No general shell endpoint exists."), "Security evidence documents the no-shell-endpoint boundary");
assert(source.docs.includes("No production schema migration is added."), "Security evidence documents no production schema migrations");
assert(source.docs.includes("No production deployment"), "Security evidence documents no production deployment or promotion path");

console.log("Operations Center backup regression checks passed.");
