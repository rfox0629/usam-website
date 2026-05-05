import "server-only";

type SendMajorGiftNotificationInput = {
  bestTimeToContact?: string | null;
  createdAt: string;
  donationTypes: readonly string[];
  email: string;
  firstName: string;
  householdName?: string | null;
  intendedFor?: string | null;
  lastName: string;
  message?: string | null;
  notifyEmail: string;
  phone?: string | null;
  profileSlug?: string | null;
  projectedAmountRange?: string | null;
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

export function buildMajorGiftNotificationEmail(input: SendMajorGiftNotificationInput) {
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const subject = `New Major Gift Inquiry from ${fullName}`;
  const details = [
    ["Household/Profile", input.householdName || input.profileSlug || "Not specified"],
    ["Name", fullName],
    ["Email", input.email],
    ["Phone", input.phone || "Not provided"],
    ["Donation Types", input.donationTypes.length > 0 ? input.donationTypes.join(", ") : "Not specified"],
    ["Projected Amount", input.projectedAmountRange || "Not specified"],
    ["Intended For", input.intendedFor || "Not specified"],
    ["Best Time To Contact", input.bestTimeToContact || "Not provided"],
    ["Created", formatDate(input.createdAt)],
    ["Message", input.message || "No message provided"],
  ];
  const text = details.map(([label, value]) => `${label}: ${value}`).join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; color: #171717; line-height: 1.6;">
      <h1 style="font-size: 24px;">New Major Gift Inquiry</h1>
      <table cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        ${details.map(([label, value]) => (
          `<tr><td style="font-weight: bold; vertical-align: top;">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`
        )).join("")}
      </table>
    </div>
  `;

  return { html, subject, text };
}

export async function sendMajorGiftNotification(input: SendMajorGiftNotificationInput): Promise<EmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAJOR_GIFT_EMAIL_FROM || process.env.PRAYER_EMAIL_FROM || process.env.EMAIL_FROM;

  if (!resendApiKey || !from) {
    // TODO: Configure RESEND_API_KEY and MAJOR_GIFT_EMAIL_FROM in Vercel to enable major gift notifications.
    console.info("Major gift inquiry notification skipped: email provider is not configured.");
    return {
      provider: "placeholder",
      status: "skipped",
    };
  }

  const email = buildMajorGiftNotificationEmail(input);
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: email.html,
      subject: email.subject,
      text: email.text,
      to: input.notifyEmail,
    }),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Major gift notification failed: ${response.status} ${message}`.trim());
  }

  return {
    provider: "resend",
    status: "sent",
  };
}
