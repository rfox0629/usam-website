import "server-only";

import { escapeHtml, type EmailTemplate } from "@/src/lib/email/resend";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";

/**
 * USA-289: the welcome email sent after a DOS access request is approved and
 * access is verified ready.
 *
 * It never contains a password, a sign-in token, or a magic link. The person
 * signs in on the normal DOS sign-in page with an email link (or their
 * existing password), so nothing in this email grants access by itself.
 *
 * Home Screen steps match what the DOS web app actually supports: a web app
 * manifest scoped to /dos with display "standalone" (public/favicons/dos/
 * app.webmanifest), and no native app. The wording mirrors the install help
 * DOS participants already see (app/groups/MemberHomeInstallPrompt.tsx).
 */

export type DosWelcomeEmailInput = {
  accountState: "created" | "existing";
  firstName: string;
  /** True when approval linked a workspace they already had (their people and work are in it). */
  linkedExistingWorkspace?: boolean;
  organizationName: string | null;
  requestType: "individual" | "organization";
  workspaceName: string;
  workspaceSlug: string;
};

export function dosSupportEmail() {
  return process.env.DOS_SUPPORT_EMAIL?.trim()
    || process.env.ADMIN_APPLICATION_EMAIL?.trim()
    || "ryan@usamissionaries.org";
}

export function dosEmailFrom() {
  return process.env.DOS_EMAIL_FROM?.trim() || undefined;
}

/**
 * The 2-minute instructional walkthrough (USA-289), hosted at /dos/walkthrough
 * with the video files in public/videos/dos. DOS_WALKTHROUGH_VIDEO_URL can
 * point somewhere else; it must be https.
 */
export const dosWalkthroughPath = "/dos/walkthrough";

export function dosWalkthroughVideoUrl() {
  const value = process.env.DOS_WALKTHROUGH_VIDEO_URL?.trim();

  if (!value) {
    return `${getCanonicalSiteUrl()}${dosWalkthroughPath}`;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" ? url.toString() : `${getCanonicalSiteUrl()}${dosWalkthroughPath}`;
  } catch {
    return `${getCanonicalSiteUrl()}${dosWalkthroughPath}`;
  }
}

/* ------------------------------------------------------------ welcome email */

/**
 * USA-289 welcome email, sent once access is verified ready. Short on
 * purpose: DOS header, "your workspace is ready", one Open DOS button, a
 * brief sign-in line, a compact home screen note, and help by replying.
 *
 * The button goes to /dos for every recipient. After sign-in, /dos opens the
 * person's own workspace, so no workspace slug appears in the email, and
 * there is no second sign-in or workspace link. No password, token, or
 * sign-in link is ever included.
 *
 * Built for Gmail and other clients: tables and inline styles only, no SVG,
 * one absolute image (the logo) with alt text, 560px wide and fluid on phones.
 * The walkthrough video lives on the DOS sign-in page, not in this email.
 */
const mail = {
  blue: "#1E6FBF",
  blueHi: "#6FB2F0",
  font: "Inter,'Helvetica Neue',Helvetica,Arial,sans-serif",
  heading: "Oswald,'Helvetica Neue',Arial,sans-serif",
  ink: "#0E1822",
  label: "Rajdhani,'Helvetica Neue',Arial,sans-serif",
  line: "#E6EAEE",
  muted: "#5E6B78",
  navy: "#0A1622",
  tint: "#EDF5FC",
};

/** Where every welcome email sends people: DOS, which opens their workspace after sign-in. */
export function dosWelcomeEmailEntryUrl() {
  return `${getCanonicalSiteUrl()}/dos`;
}

export function buildDosWelcomeEmail(input: DosWelcomeEmailInput): EmailTemplate {
  const siteUrl = getCanonicalSiteUrl();
  const openUrl = dosWelcomeEmailEntryUrl();
  const logoUrl = `${siteUrl}/images/email/dos-mark-v1.png`;
  const name = input.firstName.trim();
  const title = name ? `${name}, your workspace is ready.` : "Your workspace is ready.";
  const detail = input.linkedExistingWorkspace
    ? "Your DOS access is approved, and everything already in your workspace is right where you left it."
    : input.requestType === "organization" && input.organizationName
      ? `Your DOS access is approved, and the workspace for ${input.organizationName} is set up.`
      : "Your DOS access is approved, and your workspace is set up.";
  const signIn = input.accountState === "created"
    ? "New to DOS? On the sign-in screen, choose <strong>Email me a sign-in link</strong>."
    : "Sign in the way you usually do.";
  const signInText = input.accountState === "created"
    ? "New to DOS? On the sign-in screen, choose \"Email me a sign-in link\"."
    : "Sign in the way you usually do.";
  const text = (html: string, style = "") => `<p style="margin:0;font-family:${mail.font};font-size:16px;line-height:1.6;color:${mail.ink};${style}">${html}</p>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>Your DOS workspace is ready</title>
<style>@media only screen and (max-width:600px){.px{padding-left:24px!important;padding-right:24px!important}.h1{font-size:28px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${mail.tint};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${mail.tint};">${escapeHtml(title)} Open DOS to get started.</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${mail.tint}" style="background:${mail.tint};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="560" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid ${mail.line};">
  <tr><td bgcolor="${mail.navy}" class="px" style="background:${mail.navy};padding:22px 36px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle" style="padding-right:12px;"><img src="${escapeHtml(logoUrl)}" width="34" height="34" alt="DOS" style="display:block;border:0;width:34px;height:34px;"></td>
      <td valign="middle"><p style="margin:0;font-family:${mail.label};font-size:15px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#ffffff;">DOS</p>
        <p style="margin:1px 0 0;font-family:${mail.label};font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${mail.blueHi};">Discipleship Operating System</p></td>
    </tr></table>
  </td></tr>
  <tr><td class="px" style="padding:36px 36px 0;">
    <h1 class="h1" style="margin:0 0 12px;font-family:${mail.heading};font-size:32px;line-height:1.15;font-weight:700;color:${mail.ink};">${escapeHtml(title)}</h1>
    ${text(escapeHtml(detail), `color:${mail.muted};`)}
  </td></tr>
  <tr><td class="px" style="padding:28px 36px 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
      <td align="center" bgcolor="${mail.blue}" style="background:${mail.blue};">
        <a href="${escapeHtml(openUrl)}" style="display:inline-block;padding:15px 40px;font-family:${mail.label};font-size:16px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#ffffff;text-decoration:none;">Open DOS</a>
      </td>
    </tr></table>
    ${text(signIn, `margin-top:14px;font-size:15px;color:${mail.muted};`)}
  </td></tr>
  <tr><td class="px" style="padding:28px 36px 0;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top:1px solid ${mail.line};"><tr><td style="padding-top:20px;">
      <p style="margin:0 0 6px;font-family:${mail.label};font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${mail.blue};">Keep DOS on your phone</p>
      ${text("<strong>iPhone:</strong> in Safari, tap Share, then Add to Home Screen.<br><strong>Android:</strong> in Chrome, tap &#8942;, then Install app.", "font-size:15px;")}
      ${text("DOS is a web app, so there's nothing to download.", `margin-top:6px;font-size:14px;color:${mail.muted};`)}
    </td></tr></table>
  </td></tr>
  <tr><td class="px" style="padding:24px 36px 32px;">
    ${text("<strong>Need help?</strong> Just reply to this email.", "font-size:15px;")}
  </td></tr>
  <tr><td class="px" style="padding:16px 36px;border-top:1px solid ${mail.line};">
    <p style="margin:0;font-family:${mail.label};font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${mail.muted};">Meet. Minister. Multiply. &middot; An initiative of USA Missionaries</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  return {
    html,
    subject: "Your DOS workspace is ready",
    text: [
      title,
      "",
      detail,
      "",
      `Open DOS: ${openUrl}`,
      signInText,
      "",
      "KEEP DOS ON YOUR PHONE",
      "iPhone: in Safari, tap Share, then Add to Home Screen.",
      "Android: in Chrome, tap the ⋮ menu, then Install app.",
      "DOS is a web app, so there's nothing to download.",
      "",
      "Need help? Just reply to this email.",
      "",
      "Meet. Minister. Multiply. · DOS, an initiative of USA Missionaries",
    ].join("\n"),
  };
}

export function buildDosAccessRequestAdminNotification(input: {
  email: string;
  name: string;
  operationsUrl: string;
  organizationName: string | null;
  referenceCode: string;
  requestType: "individual" | "organization";
}): EmailTemplate {
  const kind = input.requestType === "organization" ? `Organization: ${input.organizationName ?? ""}` : "Individual";
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#0E1822;line-height:1.6;padding:16px;">
      <p style="margin:0 0 12px;"><strong>New DOS access request ${escapeHtml(input.referenceCode)}</strong></p>
      <p style="margin:0 0 12px;">${escapeHtml(input.name)} (${escapeHtml(input.email)}) · ${escapeHtml(kind)}</p>
      <p style="margin:0;"><a href="${escapeHtml(input.operationsUrl)}">Review it in Operations</a></p>
    </div>
  `;

  return {
    html,
    subject: `DOS access request ${input.referenceCode}: ${input.name}`,
    text: [
      `New DOS access request ${input.referenceCode}`,
      `${input.name} (${input.email}) · ${kind}`,
      `Review it in Operations: ${input.operationsUrl}`,
    ].join("\n"),
  };
}
