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

/* ------------------------------------------------------------------ *
 * USA-170 — member access recovery.
 *
 * When a participant lands on an invitation that no longer works, the only
 * honest recovery path today is to ask their leader for a fresh link: there is
 * no member-facing invitation email, and minting a token the participant never
 * receives is what produced the production lockout in the first place.
 *
 * This notifies the leader so the request is real. If the provider is not
 * configured the result is "skipped" and the caller MUST NOT tell the
 * participant a request was sent.
 * ------------------------------------------------------------------ */

type SendGroupAccessRecoveryInput = {
  dashboardUrl: string;
  groupName: string;
  leaderEmails: readonly string[];
  memberName: string;
  requestedAt: string;
};

export function buildGroupAccessRecoveryEmail(input: SendGroupAccessRecoveryInput) {
  const safeName = escapeHtml(input.memberName);
  const safeGroup = escapeHtml(input.groupName);
  const when = formatDate(input.requestedAt);
  const subject = `${input.memberName} needs a new ${input.groupName} link`;
  const text = [
    `${input.memberName} tried to open their Group Home for ${input.groupName} and their invitation link no longer works.`,
    "",
    `Requested: ${when}`,
    "",
    `Send them a fresh secure link: ${input.dashboardUrl}`,
    "",
    "Open the group, find them in the member list, and use Send a fresh link.",
  ].join("\n");

  return {
    html: [
      `<p><strong>${safeName}</strong> tried to open their Group Home for <strong>${safeGroup}</strong> and their invitation link no longer works.</p>`,
      `<p>Requested: ${escapeHtml(when)}</p>`,
      `<p><a href="${escapeHtml(input.dashboardUrl)}">Send them a fresh secure link</a></p>`,
      `<p>Open the group, find them in the member list, and use <em>Send a fresh link</em>.</p>`,
    ].join("\n"),
    subject,
    text,
  };
}

export async function sendGroupAccessRecoveryNotification(input: SendGroupAccessRecoveryInput): Promise<EmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.GROUPS_EMAIL_FROM || process.env.PRAYER_EMAIL_FROM || process.env.EMAIL_FROM;
  const recipients = input.leaderEmails.filter(Boolean);

  if (!resendApiKey || !from || !recipients.length) {
    console.info("Group access recovery notification skipped: email provider or leader contact is not configured.");
    return { provider: "placeholder", status: "skipped" };
  }

  const email = buildGroupAccessRecoveryEmail(input);
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
    throw new Error(`Group access recovery notification failed: ${response.status} ${message}`.trim());
  }

  return { provider: "resend", status: "sent" };
}
