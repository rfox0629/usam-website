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

/**
 * The redesigned welcome email goes to real applicants only after the founder
 * has reviewed a test send (USA-289). Until then approvals keep the earlier
 * email, and Operations can send the new one to the signed-in reviewer.
 */
export const dosWelcomeEmailV2Live = false;

function paragraph(html: string) {
  return `<p style="margin:0 0 16px;color:#1e293b;font-size:15px;">${html}</p>`;
}

function heading(text: string) {
  return `<h2 style="margin:28px 0 10px;font-size:17px;line-height:1.3;color:#020617;">${escapeHtml(text)}</h2>`;
}

function list(items: string[], ordered = true) {
  const tag = ordered ? "ol" : "ul";

  return `<${tag} style="margin:0 0 16px;padding-left:22px;color:#1e293b;font-size:15px;">${items
    .map((item) => `<li style="margin:0 0 6px;">${item}</li>`)
    .join("")}</${tag}>`;
}

function button(href: string, label: string) {
  return `<p style="margin:8px 0 20px;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#1E6FBF;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:0;">${escapeHtml(label)}</a></p>`;
}

function buildDosWelcomeEmailV1(input: DosWelcomeEmailInput): EmailTemplate {
  const siteUrl = getCanonicalSiteUrl();
  const dosUrl = `${siteUrl}/dos`;
  const workspaceUrl = `${siteUrl}/dos/${encodeURIComponent(input.workspaceSlug)}`;
  const signInUrl = `${siteUrl}/login?next=${encodeURIComponent(`/dos/${input.workspaceSlug}`)}`;
  const supportEmail = dosSupportEmail();
  const videoUrl = dosWalkthroughVideoUrl();
  const name = input.firstName.trim() || "there";
  const forOrganization = input.requestType === "organization" && input.organizationName
    ? ` for ${input.organizationName}`
    : "";

  const signInSteps = input.accountState === "existing"
    ? [
      `Open <a href="${escapeHtml(signInUrl)}">${escapeHtml(`${siteUrl.replace(/^https?:\/\//, "")}/login`)}</a>.`,
      "Sign in with this email address the way you already do (password or email link).",
      "Your existing people, groups, Journeys, and reading plans are unchanged.",
    ]
    : [
      `Open <a href="${escapeHtml(signInUrl)}">${escapeHtml(`${siteUrl.replace(/^https?:\/\//, "")}/login`)}</a>.`,
      "Under <strong>Email me a sign-in link</strong>, enter this email address and send the link.",
      "Open the link on the same phone or computer. It signs you straight in to DOS.",
      "Prefer a password? On the same page choose <strong>Set or reset password</strong> at any time.",
    ];
  const signInStepsText = input.accountState === "existing"
    ? [
      `1. Open ${signInUrl}`,
      "2. Sign in with this email address the way you already do (password or email link).",
      "3. Your existing people, groups, Journeys, and reading plans are unchanged.",
    ]
    : [
      `1. Open ${signInUrl}`,
      "2. Under \"Email me a sign-in link\", enter this email address and send the link.",
      "3. Open the link on the same phone or computer. It signs you straight in to DOS.",
      "4. Prefer a password? On the same page choose \"Set or reset password\" at any time.",
    ];

  const iphoneSteps = [
    `Open <a href="${escapeHtml(dosUrl)}">${escapeHtml(dosUrl.replace(/^https?:\/\//, ""))}</a> in <strong>Safari</strong> and sign in.`,
    "Tap the <strong>Share</strong> button (the square with an arrow).",
    "Scroll down and tap <strong>Add to Home Screen</strong>. If you see <strong>Open as Web App</strong>, leave it on.",
    "Tap <strong>Add</strong>. DOS now opens from its own icon.",
  ];
  const androidSteps = [
    `Open <a href="${escapeHtml(dosUrl)}">${escapeHtml(dosUrl.replace(/^https?:\/\//, ""))}</a> in <strong>Chrome</strong> and sign in.`,
    "Tap the <strong>⋮</strong> menu in the top right.",
    "Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>, whichever your phone shows.",
    "Confirm. DOS now opens from its own icon.",
  ];

  const videoHtml = paragraph(`Watch the 2-minute walkthrough: <a href="${escapeHtml(videoUrl)}">${escapeHtml(videoUrl)}</a>`);
  const videoText = `Watch the 2-minute walkthrough: ${videoUrl}`;

  const html = `
    <div style="margin:0;background:#EDF5FC;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#0E1822;line-height:1.6;">
      <div style="margin:0 auto;max-width:620px;border:1px solid #E6EAEE;background:#ffffff;">
        <div style="background:#0A1622;padding:22px 28px;">
          <p style="margin:0;color:#6FB2F0;font-size:12px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">Discipleship Operating System</p>
        </div>
        <div style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;color:#0E1822;">Your DOS access is ready</h1>
          ${paragraph(`Hi ${escapeHtml(name)},`)}
          ${paragraph(`Your request to use DOS${escapeHtml(forOrganization)} has been approved, and your workspace, <strong>${escapeHtml(input.workspaceName)}</strong>, is ready.`)}
          ${button(signInUrl, "Sign in to DOS")}
          ${heading("Signing in")}
          ${list(signInSteps)}
          ${paragraph("We never send passwords by email, and no one from our team will ask for yours.")}
          ${heading("Where DOS lives")}
          ${paragraph(`DOS is a web app. Your workspace is at <a href="${escapeHtml(workspaceUrl)}">${escapeHtml(workspaceUrl.replace(/^https?:\/\//, ""))}</a>. There is nothing to download from an app store.`)}
          ${heading("Add DOS to your iPhone home screen")}
          ${list(iphoneSteps)}
          ${heading("Add DOS to your Android home screen")}
          ${list(androidSteps)}
          ${heading("Walkthrough video")}
          ${videoHtml}
          ${heading("Need help?")}
          ${paragraph(`Reply to this email or write to <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.`)}
          <p style="margin:28px 0 0;color:#5E6B78;font-size:13px;">DOS · An initiative of USA Missionaries</p>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Hi ${name},`,
    "",
    `Your request to use DOS${forOrganization} has been approved, and your workspace, ${input.workspaceName}, is ready.`,
    "",
    "SIGNING IN",
    ...signInStepsText,
    "",
    "We never send passwords by email, and no one from our team will ask for yours.",
    "",
    "WHERE DOS LIVES",
    `DOS is a web app. Your workspace is at ${workspaceUrl}. There is nothing to download from an app store.`,
    "",
    "ADD DOS TO YOUR IPHONE HOME SCREEN",
    `1. Open ${dosUrl} in Safari and sign in.`,
    "2. Tap the Share button (the square with an arrow).",
    "3. Scroll down and tap Add to Home Screen. If you see Open as Web App, leave it on.",
    "4. Tap Add. DOS now opens from its own icon.",
    "",
    "ADD DOS TO YOUR ANDROID HOME SCREEN",
    `1. Open ${dosUrl} in Chrome and sign in.`,
    "2. Tap the ⋮ menu in the top right.",
    "3. Tap Install app or Add to Home screen, whichever your phone shows.",
    "4. Confirm. DOS now opens from its own icon.",
    "",
    "WALKTHROUGH VIDEO",
    videoText,
    "",
    "NEED HELP?",
    `Reply to this email or write to ${supportEmail}.`,
    "",
    "DOS · An initiative of USA Missionaries",
  ].join("\n");

  return {
    html,
    subject: "Your DOS access is ready",
    text,
  };
}

export function buildDosWelcomeEmail(input: DosWelcomeEmailInput): EmailTemplate {
  return dosWelcomeEmailV2Live ? buildDosWelcomeEmailV2(input) : buildDosWelcomeEmailV1(input);
}

/* ----------------------------------------------------- welcome email, v2 */

/**
 * The redesigned welcome (USA-289): DOS header, a personal line, one main
 * action, the walkthrough, compact phone setup, and "reply to this email" for
 * help. Built for Gmail and other clients: tables and inline styles only, no
 * SVG, absolute image URLs with alt text, 600px wide and fluid on phones.
 * It carries no password, token, or sign-in link; the button opens the
 * recipient's own verified workspace, and DOS asks them to sign in there.
 */
const v2 = {
  blue: "#1E6FBF",
  blueHi: "#6FB2F0",
  font: "Inter,'Helvetica Neue',Helvetica,Arial,sans-serif",
  heading: "Oswald,'Arial Narrow','Helvetica Neue',Arial,sans-serif",
  ink: "#0E1822",
  label: "Rajdhani,'Arial Narrow','Helvetica Neue',Arial,sans-serif",
  line: "#E6EAEE",
  muted: "#5E6B78",
  navy: "#0A1622",
  tint: "#EDF5FC",
};

function v2Button(href: string, label: string, variant: "primary" | "secondary") {
  const primary = variant === "primary";

  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;${primary ? "width:100%;" : ""}">
    <tr><td align="center" bgcolor="${primary ? v2.blue : "#ffffff"}" style="background:${primary ? v2.blue : "#ffffff"};border:2px solid ${v2.blue};">
      <a href="${escapeHtml(href)}" style="display:block;padding:${primary ? "16px 28px" : "11px 20px"};font-family:${v2.label};font-size:${primary ? "16px" : "14px"};font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${primary ? "#ffffff" : v2.blue};text-decoration:none;">${escapeHtml(label)}</a>
    </td></tr></table>`;
}

export function dosWelcomeEmailWorkspaceUrl(workspaceSlug: string | null | undefined) {
  const siteUrl = getCanonicalSiteUrl();

  return workspaceSlug ? `${siteUrl}/dos/${encodeURIComponent(workspaceSlug)}` : `${siteUrl}/dos`;
}

export function buildDosWelcomeEmailV2(input: DosWelcomeEmailInput): EmailTemplate {
  const siteUrl = getCanonicalSiteUrl();
  const workspaceUrl = dosWelcomeEmailWorkspaceUrl(input.workspaceSlug);
  const videoUrl = dosWalkthroughVideoUrl();
  const logoUrl = `${siteUrl}/images/email/dos-mark-v1.png`;
  const thumbUrl = `${siteUrl}/videos/dos/dos-walkthrough-v1-email-thumb.jpg`;
  const name = input.firstName.trim();
  const greeting = name ? `${name}, your DOS workspace is ready.` : "Your DOS workspace is ready.";
  const existing = input.linkedExistingWorkspace
    ? "Everyone and everything already in your workspace is right where you left it."
    : input.requestType === "organization" && input.organizationName
      ? `${input.organizationName} is set up in DOS and ready for you.`
      : "It's set up and ready for the people you're discipling.";
  const signIn = input.accountState === "created"
    ? "When DOS asks you to sign in, choose <strong>Email me a sign-in link</strong> and use this email address."
    : "Sign in the way you usually do.";
  const signInText = input.accountState === "created"
    ? "When DOS asks you to sign in, choose \"Email me a sign-in link\" and use this email address."
    : "Sign in the way you usually do.";
  const p = (html: string, extra = "") => `<p style="margin:0;font-family:${v2.font};font-size:16px;line-height:1.6;color:${v2.ink};${extra}">${html}</p>`;
  const eyebrow = (text: string, color = v2.blue) => `<p style="margin:0 0 10px;font-family:${v2.label};font-size:13px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${color};">${escapeHtml(text)}</p>`;
  const phoneCell = (title: string, html: string) => `<td class="stack" valign="top" width="50%" style="padding:0 6px 12px;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid ${v2.line};background:#ffffff;"><tr><td style="padding:16px 18px;">
        <p style="margin:0 0 6px;font-family:${v2.label};font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${v2.blue};">${escapeHtml(title)}</p>
        <p style="margin:0;font-family:${v2.font};font-size:15px;line-height:1.55;color:${v2.ink};">${html}</p>
      </td></tr></table></td>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>Welcome to DOS</title>
<style>@media only screen and (max-width:620px){.px{padding-left:22px!important;padding-right:22px!important}.stack{display:block!important;width:100%!important;padding:0 0 12px!important}.h1{font-size:30px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${v2.tint};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${v2.tint};">${escapeHtml(greeting)} Open it, watch the 2-minute walkthrough, and add DOS to your phone.</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${v2.tint}" style="background:${v2.tint};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${v2.line};">
  <tr><td bgcolor="${v2.navy}" class="px" style="background:${v2.navy};padding:26px 36px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle" style="padding-right:14px;"><img src="${escapeHtml(logoUrl)}" width="40" height="40" alt="DOS" style="display:block;border:0;width:40px;height:40px;"></td>
      <td valign="middle"><p style="margin:0;font-family:${v2.label};font-size:18px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#ffffff;">Welcome to DOS.</p>
        <p style="margin:2px 0 0;font-family:${v2.label};font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${v2.blueHi};">Discipleship Operating System</p></td>
    </tr></table>
  </td></tr>
  <tr><td class="px" style="padding:40px 36px 8px;">
    <h1 class="h1" style="margin:0 0 14px;font-family:${v2.heading};font-size:34px;line-height:1.15;font-weight:700;color:${v2.ink};">${escapeHtml(greeting)}</h1>
    ${p(escapeHtml(existing))}
  </td></tr>
  <tr><td class="px" style="padding:28px 36px 8px;">
    ${v2Button(workspaceUrl, "Open my DOS workspace", "primary")}
    ${p(signIn, `margin-top:14px;font-size:15px;color:${v2.muted};`)}
  </td></tr>
  <tr><td class="px" style="padding:36px 36px 8px;">
    ${eyebrow("Get started in two minutes")}
    <a href="${escapeHtml(videoUrl)}" style="display:block;text-decoration:none;border:0;"><img src="${escapeHtml(thumbUrl)}" width="528" alt="Watch the 2-minute DOS walkthrough" style="display:block;width:100%;max-width:528px;height:auto;border:0;"></a>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr><td>${v2Button(videoUrl, "Watch the 2-minute walkthrough", "secondary")}</td></tr></table>
    ${p("Sign in, Home, People, Meetings, Prayer, and adding DOS to your phone.", `margin-top:12px;font-size:14px;color:${v2.muted};`)}
  </td></tr>
  <tr><td class="px" style="padding:36px 30px 8px;">
    <div style="padding:0 6px;">${eyebrow("Add DOS to your phone")}${p("DOS is a web app, so there's nothing to download. Open it from the button above, then:", "font-size:15px;margin-bottom:14px;")}</div>
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
      ${phoneCell("iPhone · Safari", "Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>, then <strong>Add</strong>.")}
      ${phoneCell("Android · Chrome", "Tap <strong>&#8942;</strong>, then <strong>Install app</strong> or <strong>Add to Home screen</strong>.")}
    </tr></table>
  </td></tr>
  <tr><td class="px" style="padding:26px 36px 36px;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${v2.tint}" style="background:${v2.tint};"><tr><td style="padding:18px 20px;">
      ${p("<strong>Need help?</strong> Reply to this email and a person on the DOS team will get back to you.", "font-size:15px;")}
    </td></tr></table>
  </td></tr>
  <tr><td bgcolor="${v2.navy}" class="px" style="background:${v2.navy};padding:18px 36px;">
    <p style="margin:0;font-family:${v2.label};font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#8FA3B6;">Meet. Minister. Multiply. &middot; An initiative of USA Missionaries</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    "WELCOME TO DOS.",
    "",
    greeting,
    existing,
    "",
    `Open my DOS workspace: ${workspaceUrl}`,
    signInText,
    "",
    `Watch the 2-minute walkthrough: ${videoUrl}`,
    "(Sign in, Home, People, Meetings, Prayer, and adding DOS to your phone.)",
    "",
    "ADD DOS TO YOUR PHONE",
    "DOS is a web app, so there's nothing to download. Open it from the link above, then:",
    "- iPhone (Safari): tap Share, then Add to Home Screen, then Add.",
    "- Android (Chrome): tap the ⋮ menu, then Install app or Add to Home screen.",
    "",
    "Need help? Reply to this email and a person on the DOS team will get back to you.",
    "",
    "Meet. Minister. Multiply. · An initiative of USA Missionaries",
  ].join("\n");

  return {
    html,
    subject: name ? `Welcome to DOS, ${name}. Your workspace is ready.` : "Welcome to DOS. Your workspace is ready.",
    text,
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
