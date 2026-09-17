import { renderShareCard } from "@/src/lib/share/share-card";
import { dosShareableResourceSlugs } from "@/src/lib/dos/resource-sharing";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";

/**
 * USA-280: the share card a sent assessment link unfurls with.
 *
 * Addressed by RESOURCE SLUG, never by share token. The token is the whole of
 * the access to a couple's answers, and an unfurler hands the URL it fetches to
 * third-party caches and previews; a token in an image path would leak there.
 * Every link to the same assessment therefore unfurls the same image, and the
 * card names the assessment and nothing else: no participant, no score, no
 * answer, no workspace.
 *
 * Prerendered at build time, one PNG per shareable assessment.
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return dosShareableResourceSlugs.map((slug) => ({ slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!dosShareableResourceSlugs.includes(slug as (typeof dosShareableResourceSlugs)[number])) {
    return new Response("Not Found", { status: 404 });
  }

  const resource = getDosResourceBySlug(slug);

  if (!resource) {
    return new Response("Not Found", { status: 404 });
  }

  return renderShareCard({
    brand: "discipleship-operating-system",
    eyebrow: "Assessment",
    subtitle: "A short assessment two people answer together. Open the link to begin.",
    title: resource.title,
  });
}
