"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import {
  phase1NewsletterRecipients,
  publishNewsletterIssue,
  saveNewsletterDraft,
  sendNewsletterPreview,
  setSubscriberStatus,
} from "@/src/lib/communications/newsletter";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

async function requireEditorEmail() {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized" || !canEditAdminContent(authorization)) {
    throw new Error("Editor access is required.");
  }

  return authorization.email;
}

function redirectToCommunications(query: string): never {
  redirect(`/admin/communications?${query}`);
}

export async function createNewsletterDraft(formData: FormData) {
  const actorEmail = await requireEditorEmail();
  const result = await saveNewsletterDraft({
    actorEmail,
    bodyText: formString(formData, "body_text"),
    ctaLabel: formString(formData, "cta_label"),
    ctaUrl: formString(formData, "cta_url"),
    heroImageUrl: formString(formData, "hero_image_url"),
    introText: formString(formData, "intro_text"),
    previewText: formString(formData, "preview_text"),
    slug: formString(formData, "slug"),
    subject: formString(formData, "subject"),
    title: formString(formData, "title"),
  });

  if (result.error) {
    redirectToCommunications(`error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/admin/communications");
  redirectToCommunications("saved=draft");
}

export async function publishNewsletterDraft(formData: FormData) {
  const actorEmail = await requireEditorEmail();
  const issueId = formString(formData, "issue_id");

  if (!issueId) {
    redirectToCommunications("error=missing_issue");
  }

  const result = await publishNewsletterIssue({
    actorEmail,
    archiveVisible: formData.get("archive_visible") === "on",
    issueId,
  });

  if (result.error) {
    redirectToCommunications(`error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/admin/communications");
  revalidatePath("/newsletter");
  redirectToCommunications(formData.get("archive_visible") === "on" ? "saved=published" : "saved=publication");
}

export async function sendNewsletterPreviewAction(formData: FormData) {
  const actorEmail = await requireEditorEmail();
  const publicationId = formString(formData, "publication_id");
  const recipientEmail = formString(formData, "recipient_email");

  if (!publicationId) {
    redirectToCommunications("error=missing_publication");
  }

  if (!phase1NewsletterRecipients.some((recipient) => recipient.email === recipientEmail)) {
    redirectToCommunications("error=recipient_not_allowed");
  }

  const result = await sendNewsletterPreview({
    publicationId,
    recipientEmail,
    requestedByEmail: actorEmail,
    sendType: "preview",
  });

  if (result.error) {
    redirectToCommunications(`error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/admin/communications");
  redirectToCommunications(`sent=${result.send?.status ?? "queued"}&recipient=${encodeURIComponent(recipientEmail)}`);
}

export async function updateSubscriberStatus(formData: FormData) {
  const actorEmail = await requireEditorEmail();
  const subscriberId = formString(formData, "subscriber_id");
  const status = formString(formData, "status");

  if (!subscriberId || !["subscribed", "suppressed", "unsubscribed"].includes(status)) {
    redirectToCommunications("error=invalid_subscriber_status");
  }

  const result = await setSubscriberStatus({
    actorEmail,
    status: status as "subscribed" | "suppressed" | "unsubscribed",
    subscriberId,
  });

  if (result.error) {
    redirectToCommunications(`error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/admin/communications");
  redirectToCommunications("saved=subscriber");
}
