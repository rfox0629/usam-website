"use server";

import { redirect } from "next/navigation";
import { subscribeToNewsletter } from "@/src/lib/communications/newsletter";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

export async function submitNewsletterSubscribe(formData: FormData) {
  const email = formString(formData, "email");
  const firstName = formString(formData, "first_name");
  const lastName = formString(formData, "last_name");
  const consent = formData.get("consent") === "on";

  if (!email || !consent) {
    redirect("/subscribe?error=missing");
  }

  const result = await subscribeToNewsletter({
    email,
    firstName,
    lastName,
    source: "public_subscribe",
    topics: ["newsletter"],
  });

  if (result.error) {
    redirect(`/subscribe?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/subscribe?subscribed=1");
}
