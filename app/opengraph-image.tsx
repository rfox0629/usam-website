import {
  brandShareCard,
  createShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from "@/src/lib/share/share-image";

/**
 * The site-wide default link preview.
 *
 * Next applies a segment's `opengraph-image` to that segment and everything
 * below it, so every route on usamissionaries.org unfurls with this card unless
 * it declares its own. New pages need no work to be on-brand; they only add a
 * file when their own name belongs on the card.
 */
const card = brandShareCard("usam");

export const alt = shareImageAlt(card);
export const contentType = shareImageContentType;
export const runtime = "nodejs";
export const size = shareImageSize;

export default createShareImage(card);
