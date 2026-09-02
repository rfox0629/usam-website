#!/usr/bin/env node
/**
 * USA-167 resume-email idempotency guard.
 *
 * One intentional Save and email action owns one stable request ID. The client
 * reuses it after an ambiguous failure, the API scopes it to the saved draft,
 * and Resend receives it as its provider-level Idempotency-Key.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (relativePath) => readFileSync(path.join(process.cwd(), relativePath), "utf8");
const client = read("app/join/UsamApplicationClient.tsx");
const route = read("app/api/join/draft/route.ts");
const email = read("src/lib/email/resend.ts");
const drafts = read("src/lib/join/drafts.ts");

const failures = [];
const check = (condition, message) => {
  console.log(`${condition ? "  ok  " : "  FAIL"}  ${message}`);
  if (!condition) failures.push(message);
};

console.log("USA-167 resume-email idempotency guard\n");

check(client.includes("resumeEmailAttemptRef"), "the client tracks one resume-email attempt at a time");
check(client.includes("crypto.randomUUID()"), "each intentional send receives a unique request ID");
check(
  client.includes("resumeEmailAttemptRef.current?.inFlight"),
  "a double click cannot start a second in-flight send",
);
check(
  client.includes("inFlight: false"),
  "an ambiguous failure retains the request ID for a safe retry",
);
check(
  client.includes("disabled={!hasEmail || isSaving}"),
  "the email button is disabled while any save is in flight",
);
check(
  route.includes('error: "missing_email_request_id"'),
  "the server refuses an unprotected resume-email request",
);
check(
  route.includes("join-resume-${emailRequestId}"),
  "the provider key is stable for the full intentional action, even if draft creation is retried",
);
check(
  email.includes('headers["Idempotency-Key"] = options.idempotencyKey'),
  "Resend receives the idempotency key header",
);
check(
  drafts.includes('record.status === "abandoned"') && drafts.includes('reason: "revoked"'),
  "revoked resume credentials cannot restore an abandoned draft",
);

console.log("");

if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed.`);
  process.exit(1);
}

console.log("Resume emails are protected against duplicate delivery from one action.");
