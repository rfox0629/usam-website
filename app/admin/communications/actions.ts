"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { isPhase1NewsletterRecipient, normalizeEmail, phase1NewsletterRecipients } from "@/src/lib/communications/config";
import { createSubscriberPreferenceToken, getOrCreateSubscriber, mapNewsletterRow, recordSubscriberEvent } from "@/src/lib/communications/data";
import { renderNewsletterEmail } from "@/src/lib/communications/newsletter-template";
import { sendNewsletterEmail } from "@/src/lib/communications/resend";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import type { CommunicationNewsletter } from "@/src/lib/communications/types";

type NewsletterRow = Omit<CommunicationNewsletter, "sections"> & {
  sections: unknown;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function recipientName(email: string) {
  return phase1NewsletterRecipients.find((recipient) => recipient.email === email)?.label ?? email;
}

function nameParts(label: string) {
  const [firstName = "", ...rest] = label.trim().split(/\s+/);

  return {
    firstName,
    lastName: rest.join(" "),
  };
}

export async function sendNewsletterPreview(formData: FormData) {
  const authorization = await getAdminAuthorization();

  if (!canEditAdminContent(authorization)) {
    redirect("/admin/communications?error=unauthorized");
  }

  const recipientEmail = normalizeEmail(getString(formData, "recipient_email"));
  const newsletterId = getString(formData, "newsletter_id");

  if (!newsletterId || !recipientEmail) {
    redirect("/admin/communications?error=missing");
  }

  if (!isPhase1NewsletterRecipient(recipientEmail)) {
    redirect("/admin/communications?error=recipient");
  }

  if (!isSupabaseAdminConfigured()) {
    redirect("/admin/communications?error=config");
  }

  const supabase = createSupabaseAdminClient();
  const { data: newsletterData, error: newsletterError } = await supabase
    .from("communication_newsletters")
    .select("id, slug, title, subject, preheader, summary, body_markdown, sections, cta_label, cta_url, status, published_at")
    .eq("id", newsletterId)
    .maybeSingle();

  if (newsletterError || !newsletterData) {
    redirect("/admin/communications?error=newsletter");
  }

  const newsletter = mapNewsletterRow(newsletterData as NewsletterRow);
  const parts = nameParts(recipientName(recipientEmail));
  const subscriber = await getOrCreateSubscriber(supabase, {
    email: recipientEmail,
    firstName: parts.firstName,
    lastName: parts.lastName,
    source: "admin",
  });
  const { data: publication } = await supabase
    .from("communication_publications")
    .select("id")
    .eq("newsletter_id", newsletter.id)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const manageToken = await createSubscriberPreferenceToken(supabase, subscriber.id);
  const renderedEmail = renderNewsletterEmail({
    manageToken,
    newsletter,
    // Every send this system can make today is a preview to the phase 1
    // allowlist, so a preview is exactly where the review notes belong.
    showPlaceholderNotes: true,
    subscriber,
  });
  const idempotencyKey = `newsletter-preview:${newsletter.id}:${subscriber.id}:${randomUUID()}`;
  const { data: sendRow, error: sendCreateError } = await supabase
    .from("communication_sends")
    .insert({
      created_by_email: authorization.email,
      idempotency_key: idempotencyKey,
      metadata: {
        archive_url: renderedEmail.archiveUrl,
        preferences_url_created: true,
      },
      newsletter_id: newsletter.id,
      publication_id: publication?.id ?? null,
      recipient_email: recipientEmail,
      send_type: "preview",
      status: "queued",
      subscriber_id: subscriber.id,
    })
    .select("id")
    .single();

  if (sendCreateError || !sendRow) {
    redirect(`/admin/communications?error=${encodeURIComponent(sendCreateError?.message ?? "send")}`);
  }

  const result = await sendNewsletterEmail({
    html: renderedEmail.html,
    idempotencyKey,
    subject: renderedEmail.subject,
    text: renderedEmail.text,
    to: recipientEmail,
  });
  const status = result.status === "sent" ? "sent" : result.status;

  await supabase
    .from("communication_sends")
    .update({
      error_message: result.error ?? null,
      resend_email_id: result.id ?? null,
      sent_at: result.status === "sent" ? new Date().toISOString() : null,
      status,
    })
    .eq("id", sendRow.id);

  await recordSubscriberEvent(supabase, {
    actorEmail: authorization.email,
    eventType: "newsletter_preview_requested",
    payload: {
      newsletter_id: newsletter.id,
      recipient_email: recipientEmail,
      send_id: sendRow.id,
      status,
    },
    source: "admin",
    subscriberId: subscriber.id,
  });

  revalidatePath("/admin/communications");
  redirect(`/admin/communications?sent=${status}&recipient=${encodeURIComponent(recipientEmail)}`);
}
