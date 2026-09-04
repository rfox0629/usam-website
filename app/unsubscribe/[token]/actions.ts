"use server";

import { redirect } from "next/navigation";
import { getSubscriberByPreferenceToken, unsubscribeSubscriber } from "@/src/lib/communications/data";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

export async function unsubscribeFromNewsletter(formData: FormData) {
  const token = getString(formData, "token");

  if (!token) {
    redirect("/newsletter");
  }

  if (!isSupabaseAdminConfigured()) {
    redirect(`/unsubscribe/${token}?error=1`);
  }

  const subscriber = await getSubscriberByPreferenceToken(token);

  if (!subscriber) {
    // The page renders its own expired-link state for an unresolvable token.
    redirect(`/unsubscribe/${token}`);
  }

  try {
    await unsubscribeSubscriber(createSupabaseAdminClient(), {
      source: "unsubscribe",
      subscriberId: subscriber.id,
    });
  } catch {
    redirect(`/unsubscribe/${token}?error=1`);
  }

  redirect(`/unsubscribe/${token}?done=1`);
}
