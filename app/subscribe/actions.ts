"use server";

import { redirect } from "next/navigation";
import { communicationTopics, isValidEmail, normalizeEmail } from "@/src/lib/communications/config";
import { getOrCreateSubscriber, updateSubscriberPreferences } from "@/src/lib/communications/data";
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

export async function subscribeToNewsletter(formData: FormData) {
  const email = normalizeEmail(getString(formData, "email"));
  const firstName = getString(formData, "first_name") || null;
  const lastName = getString(formData, "last_name") || null;
  const selectedTopics = selectedTopicsFromForm(formData);

  if (!email || !isValidEmail(email)) {
    redirect("/subscribe?error=email");
  }

  if (selectedTopics.length === 0) {
    redirect("/subscribe?error=topics");
  }

  if (!isSupabaseAdminConfigured()) {
    redirect("/subscribe?error=config");
  }

  try {
    const supabase = createSupabaseAdminClient();
    const subscriber = await getOrCreateSubscriber(supabase, {
      email,
      firstName,
      lastName,
      source: "website",
    });

    await updateSubscriberPreferences(supabase, {
      selectedTopics,
      source: "website",
      subscriberId: subscriber.id,
    });
  } catch {
    redirect("/subscribe?error=submit");
  }

  redirect("/subscribe?submitted=1");
}
