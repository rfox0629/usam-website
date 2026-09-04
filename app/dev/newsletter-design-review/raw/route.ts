import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import { septemberProposedContent } from "@/src/lib/communications/proposed/september-content";
import { renderProposedNewsletter } from "@/src/lib/communications/proposed/september-ecosystem";

/** The proposed HTML on its own, for full-width review and client testing. */
export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = getConfiguredSiteUrl();
  const { html } = renderProposedNewsletter({
    assetBase: siteUrl,
    content: septemberProposedContent,
    links: {
      archiveUrl: `${siteUrl}/newsletter/${septemberProposedContent.slug}`,
      preferencesUrl: `${siteUrl}/preferences/test-preview`,
      unsubscribeUrl: `${siteUrl}/unsubscribe/test-preview`,
    },
    postalAddress: null,
    recipientFirstName: "Ryan",
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
