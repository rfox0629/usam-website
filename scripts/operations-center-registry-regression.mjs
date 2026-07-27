import { readFileSync } from "node:fs";

const files = {
  adminShell: "app/admin/_components/AdminShell.tsx",
  dashboard: "app/admin/dashboard/page.tsx",
  migration: "supabase/migrations/20260722125938_operations_center_registry.sql",
  page: "app/admin/operations/page.tsx",
  registry: "src/lib/admin/operations-center.ts",
};

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const adminShell = read(files.adminShell);
const dashboard = read(files.dashboard);
const migration = read(files.migration);
const page = read(files.page);
const registry = read(files.registry);

for (const table of [
  "operations_dispatchers",
  "operations_runners",
  "operations_worktrees",
  "operations_locks",
  "operations_execution_events",
]) {
  assert(
    migration.includes(`create table if not exists public.${table}`),
    `${table} must exist in the Operations Center migration.`,
  );
  assert(
    migration.includes(`alter table public.${table} enable row level security`),
    `${table} must have RLS enabled.`,
  );
  assert(
    migration.includes(`revoke all on table public.${table} from anon`),
    `${table} must block anon access.`,
  );
  assert(
    migration.includes(`grant select on table public.${table} to authenticated`),
    `${table} must expose read access to authenticated admin sessions.`,
  );
  assert(
    migration.includes(`grant select, insert, update, delete on table public.${table} to service_role`),
    `${table} must be writable only by the approved server integration/service role.`,
  );
}

assert(
  !/grant\s+(?:all|[^;]*insert|[^;]*update|[^;]*delete)[^;]*to authenticated/i.test(migration),
  "Operations registry must not grant authenticated browser writes.",
);
assert(
  migration.includes("Do not store prompts, secrets, logs, or absolute filesystem paths here."),
  "Runner registry comments must forbid sensitive runtime data.",
);
assert(
  !migration.includes("filesystem_path") && !migration.includes("absolute_path") && !migration.includes("shell_command"),
  "Operations registry schema must not expose filesystem paths or browser shell commands.",
);

assert(
  registry.includes("DISPATCHER_STALE_MINUTES") && registry.includes("RUNNER_STALE_MINUTES"),
  "Registry loader must derive stale dispatcher and runner state.",
);
assert(
  registry.includes("sanitizeRegistryText") && registry.includes("[redacted secret]") && registry.includes("[local path]"),
  "Registry loader must redact secrets and local filesystem details before rendering.",
);
assert(
  registry.includes("integration_missing") && registry.includes("Operations registry tables are not installed"),
  "Registry loader must make a missing integration explicit.",
);

assert(
  page.includes('active="operations-center"'),
  "Operations page must use the AdminShell active navigation state.",
);
assert(
  page.includes("Read Only"),
  "Operations page must clearly mark V1 as read-only.",
);
assert(
  page.includes("No Dispatcher Heartbeat") && page.includes("Recovery Guidance"),
  "Operations page must expose unmistakable offline and recovery states.",
);
assert(
  !/\bRestart\b|\bShell\b|\bshell command\b|\bterminal\b/i.test(page),
  "Operations page must not add restart, shell, or terminal controls.",
);
assert(
  adminShell.includes('href: "/admin/operations"') && dashboard.includes('href: "/admin/operations"'),
  "Operations Center must be discoverable from admin navigation and dashboard.",
);

console.log("Operations Center registry regression passed.");
