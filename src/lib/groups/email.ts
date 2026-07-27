import "server-only";

type SendGroupJoinRequestNotificationInput = {
  dashboardUrl: string;
  facilitatorEmails: readonly string[];
  groupName: string;
  requesterEmail: string;
  requesterMessage?: string | null;
  requesterName: string;
  requesterPhone?: string | null;
  submittedAt: string;
};

type EmailResult = {
  provider: "placeholder" | "resend";
  status: "sent" | "skipped";
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function buildGroupJoinRequestNotificationEmail(input: SendGroupJoinRequestNotificationInput) {
  const subject = `New request to join ${input.groupName}`;
  const details = [
    ["Community", input.groupName],
    ["Name", input.requesterName],
    ["Email", input.requesterEmail],
    ["Phone", input.requesterPhone || "Not provided"],
    ["Submitted", formatDate(input.submittedAt)],
    ["Message", input.requesterMessage || "No message provided"],
  ];
  const text = [
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    `Review this request: ${input.dashboardUrl}`,
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; color: #171717; line-height: 1.6;">
      <h1 style="font-size: 24px;">New community join request</h1>
      <table cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        ${details.map(([label, value]) => (
          `<tr><td style="font-weight: bold; vertical-align: top;">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`
        )).join("")}
      </table>
      <p style="margin-top: 20px;">
        <a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;border-radius:999px;background:#2563eb;color:#ffffff;font-weight:800;padding:12px 18px;text-decoration:none;">Review request</a>
      </p>
    </div>
  `;

  return { html, subject, text };
}

/**
 * Notifies the group's active leaders/co-leaders that a new join request arrived.
 * Never throws away silently: a misconfigured provider returns a "skipped" result
 * rather than blocking the caller, but a real send failure still surfaces to the
 * caller as a thrown error so it can be recorded (never re-thrown to the public
 * submission flow, which must always succeed regardless of notification outcome).
 */
export async function sendGroupJoinRequestNotification(input: SendGroupJoinRequestNotificationInput): Promise<EmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.GROUPS_EMAIL_FROM || process.env.PRAYER_EMAIL_FROM || process.env.EMAIL_FROM;
  const recipients = input.facilitatorEmails.filter(Boolean);

  if (!resendApiKey || !from || !recipients.length) {
    console.info("Community join request notification skipped: email provider or facilitator contact is not configured.");
    return {
      provider: "placeholder",
      status: "skipped",
    };
  }

  const email = buildGroupJoinRequestNotificationEmail(input);
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: email.html,
      subject: email.subject,
      text: email.text,
      to: recipients,
    }),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Community join request notification failed: ${response.status} ${message}`.trim());
  }

  return {
    provider: "resend",
    status: "sent",
  };
}
