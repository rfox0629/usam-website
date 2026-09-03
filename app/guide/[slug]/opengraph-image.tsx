import { renderShareCard, shareCardContentType, shareCardSize } from "@/src/lib/share/share-card";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";

/**
 * The guide's own title on the card, for every guide that ships without cover
 * art. Guides that have cover art declare it in `openGraph.images` and keep it.
 */
export const alt = "USA Missionaries";
export const contentType = shareCardContentType;
export const runtime = "nodejs";
export const size = shareCardSize;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = getDosResourceBySlug(slug);

  return renderShareCard({
    eyebrow: "Guide",
    title: resource?.title ?? "Guide",
  });
}
