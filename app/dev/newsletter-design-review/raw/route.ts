import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import { renderEcosystemNewsletter } from "@/src/lib/communications/newsletter-ecosystem";
import {
  septemberSections,
  SEPTEMBER_PREHEADER,
  SEPTEMBER_SUBJECT,
} from "@/src/lib/communications/september-2026-sections";

/**
 * The proposed HTML on its own, for full-width review and client testing.
 *
 * Sendable output: no review markers, and no unverified testimony.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = getConfiguredSiteUrl();
  const { html } = renderEcosystemNewsletter({
    issue: {
      markBase: siteUrl,
      postalAddress: null,
      preheader: SEPTEMBER_PREHEADER,
      sections: septemberSections.map((section) => (section.image
        ? { ...section, image: { ...section.image, url: `${siteUrl}${section.image.url}` } }
        : section)),
      subject: SEPTEMBER_SUBJECT,
    },
    links: {
      archiveUrl: `${siteUrl}/newsletter/q2-q3-2026-field-update`,
      preferencesUrl: `${siteUrl}/preferences/test-preview`,
      unsubscribeUrl: `${siteUrl}/unsubscribe/test-preview`,
    },
    recipientFirstName: "Ryan",
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
