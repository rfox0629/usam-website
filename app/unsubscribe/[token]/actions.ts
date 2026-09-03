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

  if (!token || !isSupabaseAdminConfigured()) {
    redirect("/subscribe?error=config");
  }

  const subscriber = await getSubscriberByPreferenceToken(token);

  if (!subscriber) {
    redirect("/subscribe?error=submit");
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
