"use server";

import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { redirect } from "next/navigation";
import { getAdminAuthorization, hasAdminRole } from "@/src/lib/admin-auth";
import type { FounderDecision, RunnerOverride } from "@/src/lib/operations-center/operations-center";

const decisionValues = ["approve", "hold", "request_changes"] as const;
const runnerValues = ["auto", "claude", "codex"] as const;

function isFounderDecision(value: FormDataEntryValue | null): value is FounderDecision {
  return typeof value === "string" && decisionValues.includes(value as FounderDecision);
}

function isRunnerOverride(value: FormDataEntryValue | null): value is RunnerOverride {
  return typeof value === "string" && runnerValues.includes(value as RunnerOverride);
}

function isIssueId(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && /^USA-\d{1,5}$/.test(value);
}

async function appendJsonLine(path: string, payload: Record<string, unknown>) {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(payload)}\n`, { encoding: "utf8", mode: 0o600 });
}

export async function recordFounderDecision(formData: FormData) {
  const authorization = await getAdminAuthorization();

  if (!hasAdminRole(authorization, ["admin"])) {
    redirect("/admin/operations-center?decision=unauthorized#needs-attention");
  }

  const decision = formData.get("decision");
  const issueId = formData.get("issueId");

  if (!isFounderDecision(decision) || !isIssueId(issueId)) {
    redirect("/admin/operations-center?decision=invalid#needs-attention");
  }

  const outboxPath = process.env.OPERATIONS_CENTER_DECISION_OUTBOX_PATH?.trim();

  if (!outboxPath) {
    redirect("/admin/operations-center?decision=unavailable#needs-attention");
  }

  await appendJsonLine(outboxPath, {
    decision,
    issueId,
    requestedAt: new Date().toISOString(),
    requestedBy: authorization.email,
    safety: "Records founder intent only; dispatcher/Linear apply rules remain responsible for locks, review package checks, and production gates.",
    scope: "founder_review_item",
    version: "usa-54-founder-command-center-v1",
  });

  redirect("/admin/operations-center?decision=saved#needs-attention");
}

export async function recordRunnerOverride(formData: FormData) {
  const authorization = await getAdminAuthorization();

  if (!hasAdminRole(authorization, ["admin"])) {
    redirect("/admin/operations-center?override=unauthorized#capacity");
  }

  const runner = formData.get("runner");

  if (!isRunnerOverride(runner)) {
    redirect("/admin/operations-center?override=invalid#capacity");
  }

  const outboxPath = process.env.OPERATIONS_CENTER_RUNNER_OVERRIDE_OUTBOX_PATH?.trim();

  if (!outboxPath) {
    redirect("/admin/operations-center?override=unavailable#capacity");
  }

  await appendJsonLine(outboxPath, {
    requestedAt: new Date().toISOString(),
    requestedBy: authorization.email,
    runnerPreference: runner,
    safety: [
      "Applies only to the next eligible work packet.",
      "Does not interrupt active work.",
      "Does not bypass cooldown, locks, labels, retries, or founder approval gates.",
    ],
    scope: "next_eligible_work_packet",
    version: "usa-54-founder-command-center-v1",
  });

  redirect("/admin/operations-center?override=saved#capacity");
}
