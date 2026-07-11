import { existsSync, readdirSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function exists(path) {
  return existsSync(new URL(`../${path}`, import.meta.url));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

function assertOrder(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert(firstIndex !== -1 && secondIndex !== -1 && firstIndex < secondIndex, message);
}

const migrationPath = "supabase/migrations/20260710190000_platform_events_foundation.sql";

assert(exists(migrationPath), "platform_events migration file must exist.");

const migration = read(migrationPath);
const recordEventHelper = read("src/lib/events/record-event.ts");
const joinSubmitRoute = read("app/api/join/submit/route.ts");
const majorGiftRoute = read("app/api/major-gift-inquiries/route.ts");
const inboxPage = read("app/admin/_components/OperationsInboxPage.tsx");

// --- Table shape ---

assertIncludes(migration, "create table if not exists public.platform_events", "Migration must create platform_events.");

for (const column of [
  "id uuid primary key default gen_random_uuid()",
  "organization_id uuid not null references public.organizations(id)",
  "event_type text not null",
  "subject_type text not null",
  "subject_id uuid not null",
  "actor_type text not null default 'public'",
  "actor_id text",
  "payload jsonb not null default '{}'::jsonb",
  "occurred_at timestamptz not null default now()",
  "correlation_id uuid not null default gen_random_uuid()",
  "schema_version smallint not null default 1",
]) {
  assertIncludes(migration, column, `platform_events must define column: ${column}`);
}

assertIncludes(
  migration,
  "constraint platform_events_dedupe unique (subject_type, subject_id, event_type)",
  "platform_events must have a uniqueness rule preventing duplicate events for the same subject and event type.",
);

// --- Service-role-only access, matching the prayer_logs/append-only convention ---

assertIncludes(migration, "alter table public.platform_events enable row level security", "platform_events must enable RLS.");
assertIncludes(migration, "revoke all on table public.platform_events from anon", "platform_events must revoke anon access.");
assertIncludes(migration, "revoke all on table public.platform_events from authenticated", "platform_events must revoke authenticated access.");
assertIncludes(migration, "grant all on table public.platform_events to service_role", "platform_events must grant service_role access.");

// --- The table's scope is documented, not silently assumed ---

assertIncludes(
  migration,
  "not the permanent audit log for every administrative action, document access, permission change",
  "platform_events must document that it is not a general-purpose audit log.",
);

// --- recordEvent helper: never hardcodes an organization UUID, never throws ---

assertIncludes(recordEventHelper, "export async function recordEvent(", "record-event.ts must export recordEvent.");
assertIncludes(recordEventHelper, "export async function recordNotificationResult(", "record-event.ts must export recordNotificationResult.");
assertIncludes(
  recordEventHelper,
  '.or("branding_mode.eq.usam,slug.eq.usa-missionaries")',
  "recordEvent must resolve the USA Missionaries organization via the seeded record, not a hardcoded UUID.",
);
assert(
  !/organizationId\s*=\s*["'][0-9a-f]{8}-[0-9a-f]{4}/.test(recordEventHelper),
  "recordEvent must not hardcode an organization UUID.",
);
assertIncludes(recordEventHelper, "} catch (error) {\n    return { reason:", "recordEvent must catch its own errors rather than throwing.");

// --- Missionary application: event recorded, notification hardened, order preserved ---

assertIncludes(
  joinSubmitRoute,
  'import { recordEvent, recordNotificationResult } from "@/src/lib/events/record-event";',
  "join/submit route must import the event helpers.",
);
assertOrder(
  joinSubmitRoute,
  "const applicationResult = await submitUsamApplicationForSetup(",
  'eventType: "usam_application.submitted"',
  "The application must be persisted before the submitted event is recorded.",
);
assertOrder(
  joinSubmitRoute,
  'eventType: "usam_application.submitted"',
  "sendApplicantApplicationSubmittedEmail(emailInput)",
  "The submitted event must be recorded before the notification is attempted.",
);
assertOrder(
  joinSubmitRoute,
  'eventType: "usam_application.notification_attempted"',
  "return NextResponse.json({\n      applicationId: applicationResult.applicationId,",
  "The notification result must be recorded before the final success response is returned.",
);
assertIncludes(
  joinSubmitRoute,
  'notificationStatus: notificationSent ? "sent" : notificationSkippedReason ? "skipped" : "failed"',
  "join/submit must classify the notification outcome as sent, skipped, or failed.",
);

// --- Major gift inquiry: event recorded, notification hardened, finance deep-link fixed ---

assertIncludes(
  majorGiftRoute,
  'import { recordEvent, recordNotificationResult } from "@/src/lib/events/record-event";',
  "major-gift-inquiries route must import the event helpers.",
);
assertOrder(
  majorGiftRoute,
  ".from(\"major_gift_inquiries\")\n    .insert(",
  'eventType: "major_gift_inquiry.submitted"',
  "The inquiry must be persisted before the submitted event is recorded.",
);
assertOrder(
  majorGiftRoute,
  'eventType: "major_gift_inquiry.submitted"',
  "sendMajorGiftNotification({",
  "The submitted event must be recorded before the notification is attempted.",
);
assertOrder(
  majorGiftRoute,
  'eventType: "major_gift_inquiry.notification_attempted"',
  "return NextResponse.json({\n    diagnostics:",
  "The notification result must be recorded before the final success response is returned.",
);
assertIncludes(
  majorGiftRoute,
  "return NextResponse.json({\n    diagnostics:",
  "major-gift-inquiries must still return success even when notification delivery fails (no early return added around the email attempt).",
);

assertIncludes(
  inboxPage,
  "record.href && showProfileAssignment",
  "OperationsInboxPage must link the submission title to record.href even when profile assignment is shown (the Finance dead-end fix).",
);
assertIncludes(
  inboxPage,
  'href: "/admin/financial-freedom?type=major-gift"',
  "Major gift records must still point at the real review screen.",
);
assertIncludes(
  inboxPage,
  'href: "/admin/support?view=reconciliation"',
  "Support commitment records must still point at the real review screen (same fix benefits this consumer too).",
);
// The pre-existing whole-row link behavior for non-profile-assignment consumers (e.g.
// Applications, Profiles) must be unchanged -- this fix must only add a link where one
// was previously missing, never remove the existing one.
assertIncludes(
  inboxPage,
  "record.href && !showProfileAssignment",
  "The original whole-row link path for consumers without profile assignment must remain intact.",
);

// --- Explicit scope discipline: none of the deferred infrastructure was built ---

const migrationFiles = readdirSync(new URL("../supabase/migrations", import.meta.url));

assert(
  !migrationFiles.some((file) => /work_items|notifications_/i.test(file)),
  "This batch must not introduce a generic work_items or notifications table.",
);

console.log("platform-events-regression: all checks passed.");
