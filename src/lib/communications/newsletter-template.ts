import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import type { CommunicationNewsletter, CommunicationSubscriber } from "./types";

type RenderNewsletterEmailInput = {
  manageToken: string;
  newsletter: CommunicationNewsletter;
  /**
   * CAN-SPAM requires a physical mailing address on commercial email. It is
   * passed in rather than hard-coded, and nothing is rendered when it is
   * absent: an invented address would be worse than a visibly missing one.
   */
  postalAddress?: string | null;
  subscriber: CommunicationSubscriber;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeParagraphs(value: string | null | undefined) {
  return (value ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function paragraphHtml(value: string | null | undefined) {
  const paragraphs = normalizeParagraphs(value);

  if (paragraphs.length === 0) {
    return "";
  }

  return paragraphs
    .map((paragraph) => (
      `<p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#292524;">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`
    ))
    .join("");
}

function textParagraphs(value: string | null | undefined) {
  return normalizeParagraphs(value).join("\n\n");
}

function subscriberGreeting(subscriber: CommunicationSubscriber) {
  return subscriber.first_name?.trim() || "friend";
}

export function normalizeNewsletterSections(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const section = item as Record<string, unknown>;
      const heading = typeof section.heading === "string" ? section.heading.trim() : "";
      const body = typeof section.body === "string" ? section.body.trim() : "";
      const image = section.image && typeof section.image === "object"
        ? section.image as Record<string, unknown>
        : null;
      const imageUrl = typeof image?.url === "string" ? image.url.trim() : "";
      const imageAlt = typeof image?.alt === "string" ? image.alt.trim() : "";

      if (!heading || !body) {
        return null;
      }

      // An image is only carried through when it has both a URL and real alt
      // text; a photograph with no description is dropped rather than shipped.
      return imageUrl && imageAlt
        ? { body, heading, image: { alt: imageAlt, url: imageUrl } }
        : { body, heading };
    })
    .filter((item): item is { body: string; heading: string; image?: { alt: string; url: string } } => Boolean(item));
}

export function renderNewsletterEmail({
  manageToken,
  newsletter,
  postalAddress,
  subscriber,
}: RenderNewsletterEmailInput) {
  const siteUrl = getConfiguredSiteUrl();
  const archiveUrl = `${siteUrl}/newsletter/${newsletter.slug}`;
  const preferencesUrl = `${siteUrl}/preferences/${manageToken}`;
  const unsubscribeUrl = `${siteUrl}/unsubscribe/${manageToken}`;
  const preheader = newsletter.preheader || newsletter.summary || newsletter.subject;
  const greeting = subscriberGreeting(subscriber);
  const bodyHtml = paragraphHtml(newsletter.body_markdown);
  const sectionsHtml = newsletter.sections.map((section) => `
    <tr>
      <td style="padding:22px 0;border-top:1px solid #e7e5e4;">
        <h2 style="margin:0 0 10px;font-size:21px;line-height:1.25;color:#0c0a09;">${escapeHtml(section.heading)}</h2>
        ${paragraphHtml(section.body)}
        ${section.image ? `
        <img src="${escapeHtml(section.image.url)}" alt="${escapeHtml(section.image.alt)}" width="632" style="display:block;width:100%;max-width:632px;height:auto;border:0;border-radius:6px;margin:4px 0 6px;" />
        ` : ""}
      </td>
    </tr>
  `).join("");
  const ctaHtml = newsletter.cta_label && newsletter.cta_url
    ? `
      <tr>
        <td style="padding:8px 0 28px;">
          <a href="${escapeHtml(newsletter.cta_url)}" style="display:inline-block;border-radius:6px;background:#c2a14e;color:#0c0a09;font-size:14px;font-weight:700;padding:13px 18px;text-decoration:none;">${escapeHtml(newsletter.cta_label)}</a>
        </td>
      </tr>
    `
    : "";
  const html = `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(newsletter.subject)}</title>
  </head>
  <body style="margin:0;background:#f5f3ef;color:#292524;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f5f3ef;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;border-collapse:collapse;background:#fffdf8;border:1px solid #e7e5e4;">
            <tr>
              <td style="padding:26px 24px 18px;border-bottom:1px solid #e7e5e4;">
                <p style="margin:0 0 10px;color:#a27f2d;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">USA Missionaries</p>
                <h1 style="margin:0;color:#0c0a09;font-size:34px;line-height:1.08;">${escapeHtml(newsletter.title)}</h1>
                ${newsletter.summary ? `<p style="margin:14px 0 0;color:#57534e;font-size:16px;line-height:1.7;">${escapeHtml(newsletter.summary)}</p>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:26px 24px 6px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#292524;">Hi ${escapeHtml(greeting)},</p>
                ${bodyHtml}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  ${sectionsHtml}
                  ${ctaHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 26px;border-top:1px solid #e7e5e4;background:#fafaf9;">
                <p style="margin:0 0 10px;color:#57534e;font-size:13px;line-height:1.6;">
                  You are receiving this because you subscribed to USA Missionaries updates.
                </p>
                ${postalAddress ? `<p style="margin:0 0 10px;color:#78716c;font-size:12px;line-height:1.6;">${escapeHtml(postalAddress)}</p>` : ""}
                <p style="margin:0;color:#78716c;font-size:12px;line-height:1.7;">
                  <a href="${escapeHtml(archiveUrl)}" style="color:#8a6a1f;">Read online</a>
                  &nbsp;|&nbsp;
                  <a href="${escapeHtml(preferencesUrl)}" style="color:#8a6a1f;">Manage preferences</a>
                  &nbsp;|&nbsp;
                  <a href="${escapeHtml(unsubscribeUrl)}" style="color:#8a6a1f;">Unsubscribe</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const sectionText = newsletter.sections
    .map((section) => `${section.heading}\n${textParagraphs(section.body)}`)
    .join("\n\n");
  const text = [
    `Hi ${greeting},`,
    "",
    newsletter.title,
    newsletter.summary,
    textParagraphs(newsletter.body_markdown),
    sectionText,
    newsletter.cta_label && newsletter.cta_url ? `${newsletter.cta_label}: ${newsletter.cta_url}` : "",
    "",
    postalAddress ?? "",
    `Read online: ${archiveUrl}`,
    `Manage preferences: ${preferencesUrl}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].filter(Boolean).join("\n");

  return {
    archiveUrl,
    html,
    preferencesUrl,
    subject: newsletter.subject,
    text,
    unsubscribeUrl,
  };
}
