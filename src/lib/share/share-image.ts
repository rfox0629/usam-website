import {
  renderShareCard,
  shareCardContentType,
  shareCardSize,
  type ShareCardInput,
} from "@/src/lib/share/share-card";
import { domainSites } from "@/src/lib/domain-sites";

/**
 * What an `opengraph-image.tsx` route needs, so a page's share card is six lines
 * rather than a new design:
 *
 *   import { createShareImage, shareImageAlt, shareImageContentType, shareImageSize }
 *     from "@/src/lib/share/share-image";
 *
 *   const card = { eyebrow: "Video Collection", subtitle: "…", title: "Remnant" };
 *
 *   export const alt = shareImageAlt(card);
 *   export const contentType = shareImageContentType;
 *   export const runtime = "nodejs";
 *   export const size = shareImageSize;
 *   export default createShareImage(card);
 *
 * Next applies a segment's `opengraph-image` to that segment and every segment
 * below it, so the card at the app root is the site-wide default and a page only
 * adds a file when its own name belongs on the card.
 *
 * One trap, and it is the reason older pages unfurled with no picture at all: a
 * page that declares `openGraph.images` — *including* setting it to `undefined` —
 * suppresses the file convention. Leave the key out entirely.
 */
export const shareImageContentType = shareCardContentType;
export const shareImageSize = shareCardSize;

/** The alt text unfurlers read aloud: the page name, then who it belongs to. */
export function shareImageAlt({ brand = "usam", title }: Pick<ShareCardInput, "brand" | "title">) {
  const siteName = domainSites[brand].siteName;

  return title === siteName ? siteName : `${title} — ${siteName}`;
}

/**
 * A brand's own card: its name, its tagline. Shared by the app-root
 * `opengraph-image.tsx` and the `/share/<brand>` routes so the site-wide default
 * and the brand defaults are literally the same card.
 */
export function brandShareCard(brand: ShareCardInput["brand"] = "usam"): ShareCardInput {
  const site = domainSites[brand];

  return {
    brand,
    eyebrow: site.socialImage.eyebrow,
    subtitle: site.socialImage.tagline,
    title: site.siteName,
  };
}

export function createShareImage(card: ShareCardInput) {
  return function Image() {
    return renderShareCard(card);
  };
}
