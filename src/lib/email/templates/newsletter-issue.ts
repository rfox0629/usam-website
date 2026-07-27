import type { NewsletterIssue } from "@/src/data/newsletter-fixtures";

/**
 * Email-safe, table-based HTML for the USAM newsletter (USA-46 presentation layer).
 *
 * This module only produces markup — it does not send anything. USA-47 is
 * responsible for wiring this into Resend, filling in real URLs/tokens, and
 * supplying the confirmed physical mailing address (CAN-SPAM requires a
 * real postal address in every commercial email; `physicalAddress` below is
 * a placeholder and must be replaced before any real send).
 *
 * Design notes:
 * - Table-based layout with inline styles only — the safest baseline across
 *   Outlook/Gmail/Apple Mail rendering engines.
 * - `prefers-color-scheme` + `color-scheme`/`supported-color-schemes` meta
 *   tags give graceful dark-mode behavior in clients that support it
 *   (Apple Mail, iOS Mail, newer Outlook on Mac). Clients that ignore it
 *   simply render the light theme, which stays fully legible either way.
 * - Every color has an explicit background AND text value on the same
 *   element so dark-mode "auto-invert" heuristics in Gmail/Outlook can't
 *   produce unreadable combinations.
 */

const GOLD = "#C2A14E";
const BLACK = "#0D0D0D";
const WHITE = "#FFFFFF";
const BODY_TEXT_LIGHT = "#3F3B33";
const MUTED_TEXT_LIGHT = "#6B6558";
const CARD_BG_LIGHT = "#FFFFFF";
const PAGE_BG_LIGHT = "#F5F2EA";

const DARK_PAGE_BG = "#0D0D0D";
const DARK_CARD_BG = "#17140F";
const DARK_BODY_TEXT = "#E7E2D6";
const DARK_MUTED_TEXT = "#B8B2A2";

export type NewsletterEmailLinks = {
  preferencesUrl: string;
  unsubscribeUrl: string;
  viewInBrowserUrl: string;
};

export type NewsletterEmailOptions = {
  links: NewsletterEmailLinks;
  /**
   * Required by CAN-SPAM. Placeholder until the founder confirms the
   * organization's registered mailing address.
   */
  physicalAddress?: string;
  /**
   * Preview-tool only: forces the dark-mode ruleset on regardless of the
   * reader's OS setting, so both themes can be reviewed side by side
   * without touching system preferences. Never set this for a real send —
   * production emails should always respect `prefers-color-scheme`.
   */
  previewColorScheme?: "dark" | "light";
  subscriberFirstName?: string;
};

const DEFAULT_ADDRESS_PLACEHOLDER =
  "USA Missionaries — [physical mailing address pending, required before send]";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatIssueDate(publishedAt: string) {
  return new Date(`${publishedAt}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

export function renderNewsletterIssueEmail(issue: NewsletterIssue, options: NewsletterEmailOptions): string {
  const { links, physicalAddress = DEFAULT_ADDRESS_PLACEHOLDER, previewColorScheme, subscriberFirstName } = options;
  const greeting = subscriberFirstName ? `Hi ${escapeHtml(subscriberFirstName)},` : "Hi friend,";
  const issueDate = formatIssueDate(issue.publishedAt);
  const previewSchemeOverride = previewColorScheme
    ? `
  <style>
    .page-bg { background-color: ${previewColorScheme === "dark" ? DARK_PAGE_BG : PAGE_BG_LIGHT} !important; }
    .card-bg { background-color: ${previewColorScheme === "dark" ? DARK_CARD_BG : CARD_BG_LIGHT} !important; }
    .heading-dark { color: ${previewColorScheme === "dark" ? WHITE : BLACK} !important; }
    .body-dark { color: ${previewColorScheme === "dark" ? DARK_BODY_TEXT : BODY_TEXT_LIGHT} !important; }
    .muted-dark { color: ${previewColorScheme === "dark" ? DARK_MUTED_TEXT : MUTED_TEXT_LIGHT} !important; }
    .border-dark { border-color: ${previewColorScheme === "dark" ? "#2A241A" : "#E7E1D2"} !important; }
  </style>`
    : "";

  const blocksHtml = issue.readingBlocks
    .map(
      (block) => `
      <tr>
        <td style="padding:0 32px 28px 32px;" class="stack-padding">
          ${
            block.heading
              ? `<h2 style="margin:0 0 10px 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.3;color:${BLACK};" class="heading-dark">${escapeHtml(block.heading)}</h2>`
              : ""
          }
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:${BODY_TEXT_LIGHT};" class="body-dark">
            ${escapeHtml(block.body)}
          </p>
        </td>
      </tr>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${escapeHtml(issue.title)}</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; background-color: ${PAGE_BG_LIGHT}; }

  @media screen and (max-width: 600px) {
    .email-container { width: 100% !important; }
    .stack-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .hero-title { font-size: 26px !important; }
  }

  @media (prefers-color-scheme: dark) {
    .page-bg { background-color: ${DARK_PAGE_BG} !important; }
    .card-bg { background-color: ${DARK_CARD_BG} !important; }
    .heading-dark { color: ${WHITE} !important; }
    .body-dark { color: ${DARK_BODY_TEXT} !important; }
    .muted-dark { color: ${DARK_MUTED_TEXT} !important; }
    .border-dark { border-color: #2A241A !important; }
  }
</style>${previewSchemeOverride}
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG_LIGHT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(issue.excerpt)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG_LIGHT};" class="page-bg">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="email-container" style="width:600px;max-width:600px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:0 0 24px 0;">
              <span style="font-family:'Oswald',Arial,sans-serif;font-size:13px;letter-spacing:4px;color:${GOLD};text-transform:uppercase;">
                USA MISSIONARIES
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:${CARD_BG_LIGHT};border-radius:16px;border:1px solid #E7E1D2;" class="card-bg border-dark">

              <!-- Hero -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 32px 24px 32px;" class="stack-padding">
                    <span style="font-family:'Rajdhani',Arial,sans-serif;font-weight:700;font-size:11px;letter-spacing:2px;color:${GOLD};text-transform:uppercase;">
                      Issue ${issue.issueNumber} &middot; ${escapeHtml(issueDate)}
                    </span>
                    <h1 class="hero-title heading-dark" style="margin:12px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.25;color:${BLACK};">
                      ${escapeHtml(issue.title)}
                    </h1>
                    <p style="margin:14px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:${MUTED_TEXT_LIGHT};" class="muted-dark">
                      ${greeting} ${escapeHtml(issue.excerpt)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0 32px;" class="stack-padding"><div style="border-top:1px solid #E7E1D2;" class="border-dark"></div></td></tr>
              </table>

              <!-- Body blocks -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
                ${blocksHtml}
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:4px 32px 36px 32px;" class="stack-padding">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${escapeHtml(links.viewInBrowserUrl)}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="8%" fillcolor="${BLACK}" strokecolor="${BLACK}">
                    <center style="color:${WHITE};font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:2px;">READ THE FULL ISSUE</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${escapeHtml(links.viewInBrowserUrl)}" style="display:inline-block;background-color:${BLACK};color:${WHITE};font-family:'Rajdhani',Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:16px 32px;border-radius:8px;">
                      Read the Full Issue
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 20px 0 20px;" align="center">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${MUTED_TEXT_LIGHT};" class="muted-dark">
                You're receiving this because you subscribed to updates from USA Missionaries.
              </p>
              <p style="margin:8px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${MUTED_TEXT_LIGHT};" class="muted-dark">
                <a href="${escapeHtml(links.preferencesUrl)}" style="color:${MUTED_TEXT_LIGHT};text-decoration:underline;">Manage preferences</a>
                &nbsp;&middot;&nbsp;
                <a href="${escapeHtml(links.unsubscribeUrl)}" style="color:${MUTED_TEXT_LIGHT};text-decoration:underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="${escapeHtml(links.viewInBrowserUrl)}" style="color:${MUTED_TEXT_LIGHT};text-decoration:underline;">View in browser</a>
              </p>
              <p style="margin:16px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:${MUTED_TEXT_LIGHT};" class="muted-dark">
                USA Missionaries is a registered 501(c)(3) nonprofit organization.<br />
                ${escapeHtml(physicalAddress)}
              </p>
            </td>
          </tr>
          <tr><td style="height:32px;line-height:32px;font-size:0;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
