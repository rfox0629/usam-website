import { NextResponse } from "next/server";
import { recordSubscriberEvent } from "@/src/lib/communications/data";
import { verifyResendWebhook } from "@/src/lib/communications/webhook";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ResendWebhookPayload = {
  created_at?: unknown;
  data?: unknown;
  type?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function firstRecipient(value: unknown) {
  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === "string") ?? null;
  }

  return typeof value === "string" ? value : null;
}

function sendStatusForEvent(eventType: string) {
  if (eventType === "email.delivered") {
    return "delivered";
  }

  if (eventType === "email.bounced" || eventType === "email.suppressed") {
    return "bounced";
  }

  if (eventType === "email.complained") {
    return "complained";
  }

  if (eventType === "email.failed") {
    return "failed";
  }

  if (eventType === "email.sent") {
    return "sent";
  }

  return null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Resend webhook secret is not configured." }, { status: 503 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 503 });
  }

  const rawPayload = await request.text();
  let event: ResendWebhookPayload;

  try {
    event = verifyResendWebhook({
      headers: request.headers,
      payload: rawPayload,
      secret: webhookSecret,
    }) as ResendWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }

  const svixId = request.headers.get("svix-id");
  const eventType = asString(event.type);

  if (!svixId || !eventType) {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const data = asRecord(event.data);
  const resendEmailId = asString(data.email_id) || asString(data.id);
  const recipientEmail = firstRecipient(data.to)?.trim().toLowerCase() ?? null;
  const supabase = createSupabaseAdminClient();
  const sendResult = resendEmailId
    ? await supabase
      .from("communication_sends")
      .select("id, subscriber_id")
      .eq("resend_email_id", resendEmailId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    : { data: null, error: null };
  const subscriberResult = sendResult.data?.subscriber_id
    ? { data: { id: sendResult.data.subscriber_id }, error: null }
    : recipientEmail
      ? await supabase
        .from("communication_subscribers")
        .select("id")
        .eq("email", recipientEmail)
        .maybeSingle()
      : { data: null, error: null };
  const eventCreatedAt = asString(event.created_at) || asString(data.created_at);
  const { error: insertError } = await supabase
    .from("communication_delivery_events")
    .insert({
      event_created_at: eventCreatedAt,
      event_type: eventType,
      payload: event,
      processing_status: "recorded",
      resend_email_id: resendEmailId,
      send_id: sendResult.data?.id ?? null,
      subscriber_id: subscriberResult.data?.id ?? null,
      svix_id: svixId,
    });

  if (insertError?.code === "23505") {
    return NextResponse.json({ duplicate: true, received: true });
  }

  if (insertError) {
    return NextResponse.json({ error: "Unable to record webhook." }, { status: 500 });
  }

  const sendStatus = sendStatusForEvent(eventType);

  if (sendStatus && sendResult.data?.id) {
    await supabase
      .from("communication_sends")
      .update({
        status: sendStatus,
      })
      .eq("id", sendResult.data.id);
  }

  if (subscriberResult.data?.id && ["email.bounced", "email.complained", "email.suppressed"].includes(eventType)) {
    const now = new Date().toISOString();

    if (eventType === "email.complained") {
      await supabase
        .from("communication_subscribers")
        .update({
          status: "complained",
          suppressed_at: now,
        })
        .eq("id", subscriberResult.data.id);
      await supabase
        .from("communication_preferences")
        .update({
          enabled: false,
          unsubscribed_at: now,
        })
        .eq("subscriber_id", subscriberResult.data.id)
        .eq("channel", "email");
      await recordSubscriberEvent(supabase, {
        eventType: "complained",
        payload: { resend_email_id: resendEmailId, svix_id: svixId },
        source: "webhook",
        subscriberId: subscriberResult.data.id,
      });
    } else {
      await supabase
        .from("communication_subscribers")
        .update({
          status: "bounced",
          suppressed_at: now,
        })
        .eq("id", subscriberResult.data.id);
      await supabase
        .from("communication_preferences")
        .update({
          enabled: false,
          unsubscribed_at: now,
        })
        .eq("subscriber_id", subscriberResult.data.id)
        .eq("channel", "email");
      await recordSubscriberEvent(supabase, {
        eventType: eventType === "email.suppressed" ? "suppressed" : "bounced",
        payload: { resend_email_id: resendEmailId, svix_id: svixId },
        source: "webhook",
        subscriberId: subscriberResult.data.id,
      });
    }
  }

  await supabase
    .from("communication_delivery_events")
    .update({
      processed_at: new Date().toISOString(),
      processing_status: "processed",
    })
    .eq("svix_id", svixId);

  return NextResponse.json({ received: true });
}
