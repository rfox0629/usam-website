import { renderShareCard } from "@/src/lib/share/share-card";
import { brandShareCard } from "@/src/lib/share/share-image";
import { domainSites, type DomainSiteKey } from "@/src/lib/domain-sites";

/**
 * Each brand's default share card, at a stable URL.
 *
 * These exist as a route rather than as `opengraph-image.tsx` files because the
 * brands are served from their own domains: a file-convention card would be
 * addressed under `/domain-sites/...` or `/mission-of-reconciliation/...`, and
 * `middleware.ts` either 404s those paths or redirects them off the host. This
 * path is plain, lives on the USA Missionaries origin, and every brand host
 * forwards it there, so an unfurler always reaches the image.
 *
 * Prerendered at build time — four PNGs, no per-request work.
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(domainSites).map((brand) => ({ brand }));
}

function isDomainSiteKey(value: string): value is DomainSiteKey {
  return Object.hasOwn(domainSites, value);
}

export async function GET(_request: Request, { params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;

  if (!isDomainSiteKey(brand)) {
    return new Response("Not Found", { status: 404 });
  }

  return renderShareCard(brandShareCard(brand));
}
