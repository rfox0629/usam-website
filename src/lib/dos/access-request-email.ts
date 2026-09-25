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
 * The walkthrough video link is included only when DOS_WALKTHROUGH_VIDEO_URL
 * is set, which happens after the video is published and verified (USA-289, walkthrough video workstream; see docs/dos-onboarding/walkthrough-video-plan.md).
 * Until then the email says the video is coming and links nothing.
 */
export function dosWalkthroughVideoUrl() {
  const value = process.env.DOS_WALKTHROUGH_VIDEO_URL?.trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

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

export function buildDosWelcomeEmail(input: DosWelcomeEmailInput): EmailTemplate {
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

  const videoHtml = videoUrl
    ? paragraph(`Watch the short walkthrough: <a href="${escapeHtml(videoUrl)}">${escapeHtml(videoUrl)}</a>`)
    : paragraph("A short walkthrough video is on the way. We will send you the link as soon as it is ready.");
  const videoText = videoUrl
    ? `Watch the short walkthrough: ${videoUrl}`
    : "A short walkthrough video is on the way. We will send you the link as soon as it is ready.";

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
