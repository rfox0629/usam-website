import { renderShareCard, shareCardContentType, shareCardSize } from "@/src/lib/share/share-card";
import { getMissionaryProfileBySlug } from "@/src/lib/missionaries/queries";

/**
 * A missionary's own name on the card.
 *
 * Only reached when the profile has no approved hero photo — a profile that has
 * one declares it in `openGraph.images`, and a real face of a real missionary is
 * a better preview than any card. Everything here is already public on the
 * profile page.
 */
export const alt = "USA Missionaries";
export const contentType = shareCardContentType;
export const runtime = "nodejs";
export const size = shareCardSize;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const missionary = await getMissionaryProfileBySlug(slug);

  return renderShareCard({
    eyebrow: missionary?.role ?? null,
    title: missionary?.name ?? "Missionary Team",
  });
}
