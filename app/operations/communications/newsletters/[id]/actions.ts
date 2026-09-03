"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { TEST_SEND_RECIPIENT } from "@/src/lib/communications/config";
import { sendNewsletterEmail } from "@/src/lib/communications/resend";
import { renderNewsletterEmail } from "@/src/lib/communications/newsletter-template";
import {
  communicationsSenderStatus,
  evaluateSendReadiness,
  loadAudienceSummary,
  loadNewsletterDetail,
} from "@/src/lib/operations/communications";

function fail(id: string, message: string): never {
  redirect(`/operations/communications/newsletters/${id}?error=${encodeURIComponent(message)}`);
}

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

async function requireManager(id: string) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "communications")) {
    fail(id, "Not authorized to manage communications.");
  }

  return authorization;
}

/**
 * Sends one test email, only ever to the fixed test recipient.
 *
 * The production audience is never read here, so a test cannot escape to donors
 * even if the newsletter were approved.
 */
export async function sendNewsletterTestAction(formData: FormData) {
  const id = formValue(formData, "id");

  if (!id) {
    redirect("/operations/communications/newsletters");
  }

  const authorization = await requireManager(id);
  const detail = await loadNewsletterDetail(id);

  if (!detail) {
    fail(id, "Newsletter not found.");
  }

  const sender = communicationsSenderStatus();

  if (!sender.resendConfigured || !sender.configured) {
    fail(id, "Sending is not configured in this environment.");
  }

  const supabase = createSupabaseAdminClient();
  const rendered = renderNewsletterEmail({
    // A test render uses a placeholder manage token; it is never a real
    // subscriber's token, so a forwarded test cannot unsubscribe anyone.
    manageToken: "test-preview",
    newsletter: {
      body_markdown: detail.bodyMarkdown,
      cta_label: detail.newsletter.ctaLabel,
      cta_url: detail.newsletter.ctaUrl,
      id: detail.newsletter.id,
      preheader: detail.newsletter.preheader,
      published_at: null,
      sections: detail.newsletter.sections,
      slug: detail.newsletter.slug,
      status: detail.newsletter.status,
      subject: detail.newsletter.subject,
      summary: detail.newsletter.summary,
      title: detail.newsletter.title,
    },
    subscriber: {
      email: TEST_SEND_RECIPIENT,
      first_name: "Ryan",
      id: "test",
      last_name: "Fox",
      status: "subscribed",
    },
  });

  const idempotencyKey = `test:${id}:${randomUUID()}`;
  const result = await sendNewsletterEmail({
    html: rendered.html,
    idempotencyKey,
    subject: `[TEST] ${detail.newsletter.subject}`,
    tag: "newsletter_test",
    text: rendered.text,
    to: TEST_SEND_RECIPIENT,
  });

  await supabase.from("communication_sends").insert({
    created_by_email: authorization.email,
    error_message: result.error ?? null,
    idempotency_key: idempotencyKey,
    newsletter_id: id,
    provider: "resend",
    recipient_email: TEST_SEND_RECIPIENT,
    resend_email_id: result.id ?? null,
    send_type: "test",
    sent_at: result.status === "sent" ? new Date().toISOString() : null,
    status: result.status === "sent" ? "sent" : "failed",
  });

  if (result.status !== "sent") {
    fail(id, `Test send failed: ${result.error ?? "unknown error"}`);
  }

  const nextStatus = detail.newsletter.status === "draft" || detail.newsletter.status === "ready_for_review"
    ? "test_sent"
    : detail.newsletter.status;

  await supabase
    .from("communication_newsletters")
    .update({
      last_test_sent_at: new Date().toISOString(),
      status: nextStatus,
      updated_by_email: authorization.email,
    })
    .eq("id", id);

  revalidatePath(`/operations/communications/newsletters/${id}`);
  revalidatePath("/operations/communications");
  redirect(`/operations/communications/newsletters/${id}?tested=1`);
}

/** Moves a draft into review. No sending occurs. */
export async function markNewsletterReadyAction(formData: FormData) {
  const id = formValue(formData, "id");
  const authorization = await requireManager(id);
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("communication_newsletters")
    .update({
      ready_at: new Date().toISOString(),
      status: "ready_for_review",
      updated_by_email: authorization.email,
    })
    .eq("id", id)
    .in("status", ["draft", "test_sent"]);

  if (error) {
    fail(id, error.message);
  }

  revalidatePath(`/operations/communications/newsletters/${id}`);
  redirect(`/operations/communications/newsletters/${id}?saved=1`);
}

/**
 * Approves for send. Requires a completed test send, so nobody can approve a
 * newsletter they have never seen delivered.
 */
export async function approveNewsletterAction(formData: FormData) {
  const id = formValue(formData, "id");
  const authorization = await requireManager(id);
  const detail = await loadNewsletterDetail(id);

  if (!detail) {
    fail(id, "Newsletter not found.");
  }

  if (!detail.newsletter.lastTestSentAt) {
    fail(id, "Send a test to yourself before approving.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("communication_newsletters")
    .update({
      approved_at: new Date().toISOString(),
      approved_by_email: authorization.email,
      status: "approved",
      updated_by_email: authorization.email,
    })
    .eq("id", id);

  if (error) {
    fail(id, error.message);
  }

  revalidatePath(`/operations/communications/newsletters/${id}`);
  revalidatePath("/operations/communications");
  redirect(`/operations/communications/newsletters/${id}?approved=1`);
}

/**
 * Production donor send.
 *
 * Every readiness condition is re-evaluated here rather than trusted from the
 * UI, an explicit typed confirmation is required, and the phase-1 recipient
 * CHECK constraint on communication_sends remains in the database as a final
 * backstop. Nothing in this file runs on deploy, merge, page load, or status
 * change: it only runs when a person submits this form.
 */
export async function sendNewsletterToAudienceAction(formData: FormData) {
  const id = formValue(formData, "id");
  const authorization = await requireManager(id);
  const detail = await loadNewsletterDetail(id);

  if (!detail) {
    fail(id, "Newsletter not found.");
  }

  if (formValue(formData, "confirmation") !== "SEND") {
    fail(id, "Type SEND to confirm a donor send.");
  }

  const [audience, sender] = await Promise.all([
    loadAudienceSummary(),
    Promise.resolve(communicationsSenderStatus()),
  ]);
  const readiness = evaluateSendReadiness({
    audience,
    authorizedToManage: true,
    newsletter: detail.newsletter,
    senderConfigured: sender.configured,
  });

  if (!readiness.canSend) {
    fail(id, `Send blocked: ${readiness.blockers.join(" ")}`);
  }

  // Reaching here means the newsletter is approved and eligible. The broadcast
  // fan-out itself is intentionally not implemented in this slice: the database
  // still restricts every send row to the phase-1 recipients, so a donor
  // broadcast cannot be written until that constraint is lifted deliberately.
  fail(
    id,
    "Donor broadcast is not enabled yet. The database still restricts sends to the phase-1 recipients; lifting that is a separate, explicitly authorized change.",
  );
}
