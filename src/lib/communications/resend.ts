import "server-only";

import { newsletterFromEmail } from "./config";

type SendNewsletterEmailInput = {
  html: string;
  idempotencyKey: string;
  subject: string;
  text: string;
  to: string;
};

export type SendNewsletterEmailResult = {
  error?: string;
  id?: string;
  provider: "resend";
  status: "failed" | "sent" | "skipped";
};

export async function sendNewsletterEmail(input: SendNewsletterEmailInput): Promise<SendNewsletterEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = newsletterFromEmail();

  if (!resendApiKey) {
    return {
      error: "missing_resend_api_key",
      provider: "resend",
      status: "skipped",
    };
  }

  if (!from) {
    return {
      error: "missing_newsletter_from",
      provider: "resend",
      status: "skipped",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from,
        html: input.html,
        subject: input.subject,
        tags: [
          { name: "category", value: "newsletter_preview" },
        ],
        text: input.text,
        to: input.to,
      }),
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      method: "POST",
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");

      return {
        error: `resend_${response.status}${message ? `_${message.slice(0, 120)}` : ""}`,
        provider: "resend",
        status: "failed",
      };
    }

    const data = await response.json().catch(() => ({} as { id?: string }));

    return {
      id: typeof data.id === "string" ? data.id : undefined,
      provider: "resend",
      status: "sent",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "resend_network_failed",
      provider: "resend",
      status: "failed",
    };
  }
}
