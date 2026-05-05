import "server-only";

import type { MissionaryPrayerRequest } from "@/src/data/missionaries";

type SendPrayerTeamWelcomeEmailInput = {
  householdName: string;
  name: string;
  prayerRequests: readonly MissionaryPrayerRequest[];
  profileSlug: string;
  to: string;
};

type EmailResult = {
  provider: "resend" | "placeholder";
  status: "sent" | "skipped";
};

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "https://new.usamissionaries.org")
    .replace(/\/$/, "")
    .replace(/^([^h])/, "https://$1");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function prayerRequestText(requests: readonly MissionaryPrayerRequest[]) {
  if (requests.length === 0) {
    return "Current prayer requests have not been posted yet. We will send updates as they are added.";
  }

  return requests
    .map((request) => `- ${request.title}\n  ${request.description}`)
    .join("\n\n");
}

function prayerRequestHtml(requests: readonly MissionaryPrayerRequest[]) {
  if (requests.length === 0) {
    return "<p>Current prayer requests have not been posted yet. We will send updates as they are added.</p>";
  }

  return `<ul>${requests.map((request) => (
    `<li><strong>${escapeHtml(request.title)}</strong><br />${escapeHtml(request.description)}</li>`
  )).join("")}</ul>`;
}

export function buildPrayerTeamWelcomeEmail({
  householdName,
  name,
  prayerRequests,
  profileSlug,
}: Omit<SendPrayerTeamWelcomeEmailInput, "to">) {
  const profileUrl = `${siteUrl()}/missionaries/${profileSlug}`;
  const greetingName = name.trim().split(/\s+/)[0] || "friend";
  const subject = `Welcome to the Prayer Team for ${householdName}`;
  const text = [
    `Hi ${greetingName},`,
    "",
    `Thank you for joining the prayer team for ${householdName}. Your prayers make a meaningful difference as this household reaches, disciples, and serves.`,
    "",
    "Current Prayer Requests",
    "",
    prayerRequestText(prayerRequests),
    "",
    `You can return to this missionary profile here: ${profileUrl}`,
    "",
    "In Christ,",
    "USA Missionaries",
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; color: #171717; line-height: 1.6;">
      <h1 style="font-size: 28px; line-height: 1.15;">Thank You for Joining Our Prayer Team</h1>
      <p>Hi ${escapeHtml(greetingName)},</p>
      <p>Thank you for joining the prayer team for <strong>${escapeHtml(householdName)}</strong>. Your prayers make a meaningful difference as this household reaches, disciples, and serves.</p>
      <h2 style="font-size: 20px;">Current Prayer Requests</h2>
      ${prayerRequestHtml(prayerRequests)}
      <p><a href="${escapeHtml(profileUrl)}">Return to the missionary profile</a></p>
      <p>In Christ,<br />USA Missionaries</p>
    </div>
  `;

  return { html, subject, text };
}

export async function sendPrayerTeamWelcomeEmail(input: SendPrayerTeamWelcomeEmailInput): Promise<EmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.PRAYER_EMAIL_FROM || process.env.EMAIL_FROM;

  if (!resendApiKey || !from) {
    console.info("Prayer team welcome email skipped: email provider is not configured.");
    return {
      provider: "placeholder",
      status: "skipped",
    };
  }

  const email = buildPrayerTeamWelcomeEmail(input);
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: email.html,
      subject: email.subject,
      text: email.text,
      to: input.to,
    }),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Prayer team welcome email failed: ${response.status} ${message}`.trim());
  }

  return {
    provider: "resend",
    status: "sent",
  };
}
