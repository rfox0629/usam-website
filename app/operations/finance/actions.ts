"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { runPlanningCenterGivingSync } from "@/src/lib/planning-center/giving-sync";

export async function runPlanningCenterSyncAction() {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "finance")) {
    redirect("/operations/finance?error=Not+authorized+to+run+the+Planning+Center+sync.");
  }

  const result = await runPlanningCenterGivingSync({ syncType: "manual" });

  revalidatePath("/operations/finance");

  if (result.status === "failed") {
    redirect(`/operations/finance?error=${encodeURIComponent(result.errors[0] ?? "Planning Center sync failed.")}`);
  }

  redirect(`/operations/finance?synced=${result.inserted}-${result.updated}-${result.seen}`);
}
