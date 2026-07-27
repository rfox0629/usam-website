import { NextResponse } from "next/server";
import { recordResendWebhookEvent } from "@/src/lib/communications/newsletter";
import { verifyResendWebhookSignature } from "@/src/lib/communications/resend-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const verification = verifyResendWebhookSignature({
    id: svixId,
    payload,
    secret: process.env.RESEND_WEBHOOK_SECRET,
    signature: request.headers.get("svix-signature"),
    timestamp: request.headers.get("svix-timestamp"),
  });

  if (!verification.ok) {
    const status = verification.reason === "missing_secret" ? 503 : 400;

    return NextResponse.json({ error: "Invalid webhook." }, { status });
  }

  let event: Record<string, unknown>;

  try {
    event = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!svixId) {
    return NextResponse.json({ error: "Missing event id." }, { status: 400 });
  }

  const result = await recordResendWebhookEvent({
    event,
    providerEventId: svixId,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
