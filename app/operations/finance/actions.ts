"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { runPlanningCenterGivingSync } from "@/src/lib/planning-center/giving-sync";
import { runPlanningCenterPeopleSync } from "@/src/lib/planning-center/people-sync";

export async function runPlanningCenterSyncAction() {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "finance")) {
    redirect("/operations/finance/giving?error=Not+authorized+to+run+the+Planning+Center+sync.");
  }

  const result = await runPlanningCenterGivingSync({ syncType: "manual" });

  revalidatePath("/operations/finance/giving");

  if (result.status === "failed") {
    redirect(`/operations/finance/giving?error=${encodeURIComponent(result.errors[0] ?? "Planning Center sync failed.")}`);
  }

  redirect(`/operations/finance/giving?synced=${result.inserted}-${result.updated}-${result.seen}`);
}

/**
 * Syncs Planning Center donor identity. Deliberately separate from the giving
 * sync: donations, amounts, and attribution are not touched by this.
 */
export async function runPlanningCenterPeopleSyncAction() {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "finance")) {
    redirect("/operations/finance/giving?error=Not+authorized+to+run+the+donor+sync.");
  }

  const result = await runPlanningCenterPeopleSync();

  revalidatePath("/operations/finance/giving");

  if (result.status === "failed") {
    redirect(`/operations/finance/giving?error=${encodeURIComponent(result.errors[0] ?? "Donor sync failed.")}`);
  }

  redirect(`/operations/finance/giving?donors=${result.inserted}-${result.updated}-${result.named}`);
}
