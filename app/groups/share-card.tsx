import {
  renderShareCard,
  shareCardContentType,
  shareCardSize,
} from "@/src/lib/share/share-card";
import {
  fallbackUsamPublicSite,
  resolvePublicSiteForHost,
  type PublicSiteConfig,
} from "@/src/lib/groups/public-site";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

/**
 * Groups are the one place cards are drawn per request rather than from a fixed
 * card definition, because each group needs its own name on it.
 *
 * The drawing itself is the site-wide share card — cream field, the name set
 * large, one gold rule — so a group link and a page link unfurl as the same
 * system. A tenant site that sets its own `brand.primaryColor` gets that as the
 * accent; the field stays cream so the family holds together.
 */
export { shareCardContentType, shareCardSize };

/** Site branding is stored loosely, so only usable color strings are trusted. */
function brandColor(brand: Record<string, unknown>, key: string) {
  const value = brand[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function resolveShareCardSite(hostname: string): Promise<PublicSiteConfig> {
  if (!isSupabaseAdminConfigured()) {
    return fallbackUsamPublicSite;
  }

  try {
    const resolution = await resolvePublicSiteForHost(createSupabaseAdminClient(), hostname);

    return resolution.site ?? fallbackUsamPublicSite;
  } catch {
    // A share card is never worth failing a page over.
    return fallbackUsamPublicSite;
  }
}

export async function renderGroupsShareCard({
  footnote,
  site,
  subtitle,
  title,
}: {
  footnote: string;
  site: PublicSiteConfig;
  subtitle: string;
  title: string;
}) {
  return renderShareCard({
    accent: brandColor(site.brand, "primaryColor"),
    eyebrow: footnote,
    eyebrowBrand: site.displayName,
    subtitle,
    title,
  });
}
