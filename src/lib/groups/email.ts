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
    ["Group", input.groupName],
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
      <h1 style="font-size: 24px;">New group join request</h1>
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
    console.info("Group join request notification skipped: email provider or facilitator contact is not configured.");
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
    throw new Error(`Group join request notification failed: ${response.status} ${message}`.trim());
  }

  return {
    provider: "resend",
    status: "sent",
  };
}

type SendGroupMemberAccessRecoveryEmailInput = {
  accessUrl: string;
  groupName: string;
  recipientEmail: string;
};

function buildGroupMemberAccessRecoveryEmail(input: SendGroupMemberAccessRecoveryEmailInput) {
  const subject = `Your secure link to ${input.groupName}`;
  const text = [
    `Your Discipleship Journey in ${input.groupName} is ready.`,
    "",
    `Open Group Home: ${input.accessUrl}`,
    "",
    "This link is just for you. If you did not request it, you can ignore this email.",
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0F172A; line-height: 1.6;">
      <p style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #1D4ED8;">${escapeHtml(input.groupName)}</p>
      <h1 style="font-size: 22px;">Your Discipleship Journey is ready.</h1>
      <p style="margin-top: 16px;">
        <a href="${escapeHtml(input.accessUrl)}" style="display:inline-block;border-radius:999px;background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#ffffff;font-weight:800;padding:12px 22px;text-decoration:none;">Open Group Home</a>
      </p>
      <p style="margin-top: 20px; font-size: 13px; color: #64748B;">This link is just for you. If you did not request it, you can ignore this email.</p>
    </div>
  `;

  return { html, subject, text };
}

/**
 * Best-effort, same as the join-request notification: a misconfigured
 * provider returns "skipped" rather than throwing, so the caller can show
 * the same generic confirmation regardless of whether delivery actually
 * happened. That keeps the recovery flow enumeration-resistant — the
 * response never reveals whether the email matched an active member.
 */
export async function sendGroupMemberAccessRecoveryEmail(input: SendGroupMemberAccessRecoveryEmailInput): Promise<EmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.GROUPS_EMAIL_FROM || process.env.PRAYER_EMAIL_FROM || process.env.EMAIL_FROM;

  if (!resendApiKey || !from) {
    console.info("Group member access recovery email skipped: email provider is not configured.");
    return {
      provider: "placeholder",
      status: "skipped",
    };
  }

  const email = buildGroupMemberAccessRecoveryEmail(input);
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: email.html,
      subject: email.subject,
      text: email.text,
      to: [input.recipientEmail],
    }),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Group member access recovery email failed: ${response.status} ${message}`.trim());
  }

  return {
    provider: "resend",
    status: "sent",
  };
}
