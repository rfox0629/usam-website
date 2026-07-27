"use server";

import { redirect } from "next/navigation";
import { communicationTopics } from "@/src/lib/communications/config";
import { getSubscriberByPreferenceToken, unsubscribeSubscriber, updateSubscriberPreferences } from "@/src/lib/communications/data";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function selectedTopicsFromForm(formData: FormData) {
  const allowedTopics = new Set(communicationTopics.map((topic) => topic.value));

  return formData
    .getAll("topics")
    .filter((value): value is string => typeof value === "string" && allowedTopics.has(value as typeof communicationTopics[number]["value"]));
}

export async function saveNewsletterPreferences(formData: FormData) {
  const token = getString(formData, "token");

  if (!token || !isSupabaseAdminConfigured()) {
    redirect("/subscribe?error=config");
  }

  const subscriber = await getSubscriberByPreferenceToken(token);

  if (!subscriber) {
    redirect("/subscribe?error=submit");
  }

  const selectedTopics = selectedTopicsFromForm(formData);
  const supabase = createSupabaseAdminClient();

  try {
    if (selectedTopics.length === 0) {
      await unsubscribeSubscriber(supabase, {
        source: "preference_center",
        subscriberId: subscriber.id,
      });
    } else {
      await supabase
        .from("communication_subscribers")
        .update({
          status: "subscribed",
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
        })
        .eq("id", subscriber.id);
      await updateSubscriberPreferences(supabase, {
        selectedTopics,
        source: "preference_center",
        subscriberId: subscriber.id,
      });
    }
  } catch {
    redirect(`/preferences/${token}?error=save`);
  }

  redirect(`/preferences/${token}?saved=1`);
}
