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
  localAgent: "scripts/usam-backup-agent.mjs",
  localAgentInstaller: "scripts/install-usam-backup-agent-launchd.sh",
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
  source.localAgent,
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
assert(source.component.includes("Mac Mini Pairing"), "Local Mac Mini pairing UI is present");
assert(source.component.includes("/v1/secrets/database"), "Database credential form sends only to the local agent");
assert(source.component.includes("/v1/secrets/encryption"), "Encryption passphrase form sends only to the local agent");
assert(source.component.includes("/v1/backblaze"), "Backblaze setup form sends only to the local agent");
assert(source.component.includes("/v1/backup/first"), "First backup action sends only to the local agent");
assert(source.component.includes("/v1/restore-test"), "Restore test action sends only to the local agent");

assert(!/\blocalStorage\b|\bsessionStorage\b/.test(codeCombined), "Backup UI/API do not use browser storage");
assert(/type=\{type\}/.test(source.component) && source.component.includes('type="password"'), "Secret setup fields are password inputs");
assert(!source.component.includes("backupActionApiRoute"), "Dashboard live actions do not call the web action API");
assert(!/createSupabase(Admin|Server)Client/.test(codeCombined), "Backup control center does not store backup secrets in Supabase");
assert(!/vercel env|VERCEL_[A-Z0-9_]*SECRET|process\.env\.[A-Z0-9_]*(PASSWORD|TOKEN|SECRET|KEY)/.test(codeCombined), "Backup control center does not depend on Vercel-stored backup secrets");

assert(source.statusRoute.includes("getAdminAuthorization"), "Read-only status API requires admin authorization");
assert(source.actionRoute.includes("hasAdminRole(authorization, [\"admin\"])"), "Action API is admin-only");
assert(source.actionRoute.includes("x-usam-operations-intent"), "Action API requires an explicit same-origin intent header");
assert(source.actionRoute.includes("isBackupActionId(payload.actionId)"), "Action API accepts only known action ids");
assert(!/payload\.(command|args|argv|path|env|script|shell|secret|password|token|key)/.test(source.actionRoute), "Action API has no command, argument, path, environment, or secret passthrough");
assert(source.agent.includes("Use the paired Mac Mini backup agent"), "Web server refuses live backup actions");

assert(source.agent.includes("shell: false"), "Local process execution disables shell mode");
assert(source.localAgent.includes("const host = \"127.0.0.1\""), "Local agent binds to loopback only");
assert(source.localAgent.includes("POST /v1/pair/start") && source.localAgent.includes("POST /v1/pair/complete"), "Local agent requires pairing");
assert(source.localAgent.includes("requireSession(request)"), "Local agent requires a paired session for setup and actions");
assert(source.localAgent.includes("add-generic-password"), "Local agent writes approved values to macOS Keychain");
assert(source.localAgent.includes("validateDatabaseCredential"), "Local agent validates database credentials before storing");
assert(source.localAgent.includes("validateBackblazeConfig"), "Local agent validates Backblaze B2 before storing");
assert(source.localAgent.includes("usam-backup.sh") && source.localAgent.includes("usam-restore.sh"), "Local agent maps fixed backup and restore scripts");
assert(source.localAgent.includes("shell: false"), "Local agent disables shell mode for child processes");
assert(!/command|argv|shell|script/.test(source.localAgent.match(/readJsonRequest[\s\S]*?function tokenFromRequest/)?.[0] ?? ""), "Local agent JSON payload parser has no shell command passthrough");
assert(source.localAgentInstaller.includes("com.usam.backup-agent"), "LaunchAgent installer is included for one-time setup");
assert(source.agent.includes("resolveApprovedScript"), "Script execution goes through approved USA-86 script resolution");
assert(source.library.includes("backup/bin/usam-backup.sh"), "Backup-now action maps to the USA-86 backup script");
assert(source.library.includes("backup/bin/usam-restore.sh"), "Restore-test action maps to the USA-86 restore script");
assert(source.library.includes("backup/bin/usam-backup-selftest.sh"), "Self-test action maps to the USA-86 self-test script");
assert(source.agent.includes("/usr/bin/security") && !source.agent.includes("-w\""), "Keychain verification checks item presence without printing secret values");

assert(source.library.includes("No secrets are stored in Supabase, Vercel, browser storage, Linear comments, or source files."), "Safeguards explicitly prohibit secret storage");
assert(source.library.includes("The web API does not execute backup actions"), "Safeguards explicitly route live actions to the local agent");
assert(source.docs.includes("No general shell endpoint exists."), "Security evidence documents the no-shell-endpoint boundary");
assert(source.docs.includes("No production schema migration is added."), "Security evidence documents no production schema migrations");
assert(source.docs.includes("No production deployment"), "Security evidence documents no production deployment or promotion path");

console.log("Operations Center backup regression checks passed.");
