"use server";

import { redirect } from "next/navigation";
import {
  communicationPreferenceTopics,
  requestPreferenceManagementLink,
  unsubscribeByToken,
  updatePreferencesByToken,
  type CommunicationPreferenceTopic,
} from "@/src/lib/communications/newsletter";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function selectedTopics(formData: FormData) {
  return communicationPreferenceTopics
    .filter((topic) => formData.get(topic.value) === "on")
    .map((topic) => topic.value) as CommunicationPreferenceTopic[];
}

export async function requestPreferenceLink(formData: FormData) {
  const email = formString(formData, "email");

  if (!email) {
    redirect("/preferences?error=missing");
  }

  const result = await requestPreferenceManagementLink({
    email,
    source: "public_preferences_request",
  });

  if (result.error) {
    redirect(`/preferences?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/preferences?requested=1");
}

export async function saveCommunicationPreferences(formData: FormData) {
  const token = formString(formData, "token");

  if (!token) {
    redirect("/preferences?error=invalid");
  }

  const result = await updatePreferencesByToken(token, selectedTopics(formData));

  if (result.error) {
    redirect(`/preferences/${encodeURIComponent(token)}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/preferences/${encodeURIComponent(token)}?saved=1`);
}

export async function unsubscribeCommunication(formData: FormData) {
  const token = formString(formData, "token");
  const redirectTo = formString(formData, "redirect_to");

  if (!token) {
    redirect("/preferences?error=invalid");
  }

  const result = await unsubscribeByToken(token);

  if (result.error) {
    redirect(`/${redirectTo === "unsubscribe" ? "unsubscribe" : "preferences"}/${encodeURIComponent(token)}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/preferences/${encodeURIComponent(token)}?unsubscribed=1`);
}
