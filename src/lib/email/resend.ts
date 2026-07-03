import "server-only";

import { getConfiguredSiteUrl } from "@/src/lib/site-url";

type EmailTemplate = {
  html: string;
  subject: string;
  text: string;
};

type EmailResult = {
  error?: string;
  id?: string;
  provider: "resend";
  sent: boolean;
  skippedReason?: string;
};

type JoinApplicationEmailInput = {
  adminUrl?: string;
  adminNote?: string;
  applicantEmail: string;
  applicantName: string;
  applicationId: string;
  location?: string;
  status: string;
  submittedAt: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function configuredFromEmail() {
  return process.env.JOIN_EMAIL_FROM
    || process.env.PRAYER_EMAIL_FROM
    || process.env.EMAIL_FROM
    || "USA Missionaries <onboarding@resend.dev>";
}

function adminApplicationEmail() {
  return process.env.ADMIN_APPLICATION_EMAIL
    || process.env.USAM_APPLICATION_ADMIN_EMAIL
    || "ryan@usamissionaries.org";
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

function emailShell(title: string, body: string) {
  return `
    <div style="margin:0;background:#f8fbff;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
      <div style="margin:0 auto;max-width:620px;border:1px solid #dcecff;border-radius:24px;background:#ffffff;padding:28px;">
        <p style="margin:0 0 16px;color:#2563eb;font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;">USA Missionaries</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;color:#020617;">${escapeHtml(title)}</h1>
        ${body}
      </div>
    </div>
  `;
}

async function sendResendEmail(to: string, template: EmailTemplate): Promise<EmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.warn("Join application email skipped: RESEND_API_KEY is not configured.");
    return {
      provider: "resend",
      sent: false,
      skippedReason: "missing_resend_api_key",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from: configuredFromEmail(),
        html: template.html,
        subject: template.subject,
        text: template.text,
        to,
      }),
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");

      console.warn(`Join application email failed: ${response.status} ${message}`.trim());

      return {
        error: "resend_request_failed",
        provider: "resend",
        sent: false,
      };
    }

    const data = await response.json().catch(() => ({} as { id?: string }));

    return {
      id: typeof data.id === "string" ? data.id : undefined,
      provider: "resend",
      sent: true,
    };
  } catch (error) {
    console.warn(`Join application email failed: ${error instanceof Error ? error.message : "unknown error"}`);

    return {
      error: "resend_network_failed",
      provider: "resend",
      sent: false,
    };
  }
}

export function buildApplicantApplicationSubmittedEmail(input: JoinApplicationEmailInput): EmailTemplate {
  const submittedAt = formatDate(input.submittedAt);
  const body = emailShell("Application submitted", `
    <p style="margin:0 0 16px;">Hi ${escapeHtml(input.applicantName || "there")},</p>
    <p style="margin:0 0 16px;">We received your USA Missionaries application. It is now in review with the team.</p>
    <table cellpadding="0" cellspacing="0" style="margin:18px 0;width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#64748b;">Status</td><td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(input.status)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Submitted</td><td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(submittedAt)}</td></tr>
    </table>
    <p style="margin:0;color:#475569;">Your account will be activated after your application is reviewed. We will follow up if we need anything else.</p>
  `);

  return {
    html: body,
    subject: "USA Missionaries application received",
    text: [
      `Hi ${input.applicantName || "there"},`,
      "",
      "We received your USA Missionaries application. It is now in review with the team.",
      `Status: ${input.status}`,
      `Submitted: ${submittedAt}`,
      "",
      "Your account will be activated after your application is reviewed. We will follow up if we need anything else.",
    ].join("\n"),
  };
}

export function buildAdminNewApplicationEmail(input: JoinApplicationEmailInput): EmailTemplate {
  const adminUrl = input.adminUrl || `${getConfiguredSiteUrl()}/admin/organizations/usam`;
  const submittedAt = formatDate(input.submittedAt);
  const body = emailShell("New USA Missionaries application", `
    <p style="margin:0 0 16px;">A new application was submitted through the DOS onboarding flow.</p>
    <table cellpadding="0" cellspacing="0" style="margin:18px 0;width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#64748b;">Applicant</td><td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(input.applicantName || "Unnamed applicant")}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(input.applicantEmail)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Location</td><td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(input.location || "Not provided")}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Submitted</td><td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(submittedAt)}</td></tr>
    </table>
    <p style="margin:22px 0 0;"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;border-radius:999px;background:#2563eb;color:#ffffff;font-weight:800;padding:12px 18px;text-decoration:none;">Open application queue</a></p>
  `);

  return {
    html: body,
    subject: `New USA Missionaries application: ${input.applicantName || input.applicantEmail}`,
    text: [
      "A new USA Missionaries application was submitted through the DOS onboarding flow.",
      "",
      `Applicant: ${input.applicantName || "Unnamed applicant"}`,
      `Email: ${input.applicantEmail}`,
      `Location: ${input.location || "Not provided"}`,
      `Submitted: ${submittedAt}`,
      `Queue: ${adminUrl}`,
    ].join("\n"),
  };
}

export function buildApplicationApprovedEmail(input: JoinApplicationEmailInput): EmailTemplate {
  const body = emailShell("Application approved", `
    <p style="margin:0 0 16px;">Hi ${escapeHtml(input.applicantName || "there")},</p>
    <p style="margin:0 0 16px;">Your USA Missionaries application has been approved.</p>
    <p style="margin:0;color:#475569;">Your missionary profile, prayer team, and support setup are being activated. Ryan or the USA Missionaries team will follow up with next steps.</p>
  `);

  return {
    html: body,
    subject: "Your USA Missionaries application has been approved",
    text: [
      `Hi ${input.applicantName || "there"},`,
      "",
      "Your USA Missionaries application has been approved.",
      "Your missionary profile, prayer team, and support setup are being activated. Ryan or the USA Missionaries team will follow up with next steps.",
    ].join("\n"),
  };
}

export function buildRequestMoreInformationEmail(input: JoinApplicationEmailInput): EmailTemplate {
  const note = input.adminNote?.trim();
  const body = emailShell("Application update", `
    <p style="margin:0 0 16px;">Hi ${escapeHtml(input.applicantName || "there")},</p>
    <p style="margin:0 0 16px;">The USA Missionaries team needs a little more information to continue reviewing your application.</p>
    ${note ? `<div style="margin:18px 0;border:1px solid #dcecff;border-radius:16px;background:#f8fbff;padding:14px;"><p style="margin:0;color:#334155;">${escapeHtml(note)}</p></div>` : ""}
    <p style="margin:0;color:#475569;">Ryan or the USA Missionaries team will follow up with next steps.</p>
  `);

  return {
    html: body,
    subject: "USA Missionaries application update",
    text: [
      `Hi ${input.applicantName || "there"},`,
      "",
      "The USA Missionaries team needs a little more information to continue reviewing your application.",
      note ? `\n${note}` : "",
      "",
      "Ryan or the USA Missionaries team will follow up with next steps.",
    ].filter(Boolean).join("\n"),
  };
}

export function buildApplicationDeclinedEmail(input: JoinApplicationEmailInput): EmailTemplate {
  const note = input.adminNote?.trim();
  const body = emailShell("Application update", `
    <p style="margin:0 0 16px;">Hi ${escapeHtml(input.applicantName || "there")},</p>
    <p style="margin:0 0 16px;">Thank you for taking time to complete the USA Missionaries application.</p>
    <p style="margin:0 0 16px;">After review, the team is not moving this application forward right now.</p>
    ${note ? `<div style="margin:18px 0;border:1px solid #dcecff;border-radius:16px;background:#f8fbff;padding:14px;"><p style="margin:0;color:#334155;">${escapeHtml(note)}</p></div>` : ""}
    <p style="margin:0;color:#475569;">Ryan or the USA Missionaries team will follow up personally if there are additional next steps.</p>
  `);

  return {
    html: body,
    subject: "USA Missionaries application update",
    text: [
      `Hi ${input.applicantName || "there"},`,
      "",
      "Thank you for taking time to complete the USA Missionaries application.",
      "After review, the team is not moving this application forward right now.",
      note ? `\n${note}` : "",
      "",
      "Ryan or the USA Missionaries team will follow up personally if there are additional next steps.",
    ].filter(Boolean).join("\n"),
  };
}

export async function sendApplicantApplicationSubmittedEmail(input: JoinApplicationEmailInput) {
  return sendResendEmail(input.applicantEmail, buildApplicantApplicationSubmittedEmail(input));
}

export async function sendAdminNewApplicationNotificationEmail(input: JoinApplicationEmailInput) {
  return sendResendEmail(adminApplicationEmail(), buildAdminNewApplicationEmail(input));
}

export async function sendApplicationApprovedEmail(input: JoinApplicationEmailInput) {
  return sendResendEmail(input.applicantEmail, buildApplicationApprovedEmail(input));
}

export async function sendApplicationMoreInformationRequestedEmail(input: JoinApplicationEmailInput) {
  return sendResendEmail(input.applicantEmail, buildRequestMoreInformationEmail(input));
}

export async function sendApplicationDeclinedEmail(input: JoinApplicationEmailInput) {
  return sendResendEmail(input.applicantEmail, buildApplicationDeclinedEmail(input));
}
