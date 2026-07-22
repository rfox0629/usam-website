"use server";

import { revalidatePath } from "next/cache";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import {
  appendOperationsCenterAction,
  type FounderDecision,
  type OverrideRunnerId,
} from "@/src/lib/operations-center/operations-center";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function isFounderDecision(value: string): value is FounderDecision {
  return value === "approve" || value === "request_changes" || value === "hold";
}

function isOverrideRunner(value: string): value is OverrideRunnerId {
  return value === "claude" || value === "codex";
}

async function requireActionAuthorization() {
  const authorization = await getAdminAuthorization();

  if (!canEditAdminContent(authorization)) {
    throw new Error("You do not have permission to create Operations Center actions.");
  }

  return authorization;
}

export async function saveFounderDecisionAction(formData: FormData) {
  const authorization = await requireActionAuthorization();
  const issueId = readString(formData, "issueId").toUpperCase();
  const decision = readString(formData, "decision");

  if (!/^USA-\d+$/.test(issueId) || !isFounderDecision(decision)) {
    throw new Error("Invalid founder decision.");
  }

  await appendOperationsCenterAction({
    actorEmail: authorization.email,
    actorUserId: authorization.userId,
    decision,
    issueId,
    type: "founder_decision",
  });

  revalidatePath("/admin/operations-center");
}

export async function setRunnerOverrideAction(formData: FormData) {
  const authorization = await requireActionAuthorization();
  const requestedRunner = readString(formData, "requestedRunner");

  if (!isOverrideRunner(requestedRunner)) {
    throw new Error("Invalid runner override.");
  }

  await appendOperationsCenterAction({
    actorEmail: authorization.email,
    actorUserId: authorization.userId,
    requestedRunner,
    type: "runner_override",
  });

  revalidatePath("/admin/operations-center");
}
