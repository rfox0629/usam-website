import type { Metadata, Viewport } from "next";
import { domainSites, type DomainSiteConfig } from "@/src/lib/domain-sites";

export function buildDomainSiteIcons(site: DomainSiteConfig): Metadata["icons"] {
  return {
    apple: [
      {
        sizes: "180x180",
        type: "image/png",
        url: site.appleTouchIconPath,
      },
    ],
    icon: [
      {
        type: "image/svg+xml",
        url: site.faviconSvgPath,
      },
      {
        sizes: "any",
        url: site.faviconPath,
      },
      {
        sizes: "48x48",
        type: "image/png",
        url: site.favicon48Path,
      },
      {
        sizes: "32x32",
        type: "image/png",
        url: site.favicon32Path,
      },
      {
        sizes: "16x16",
        type: "image/png",
        url: site.favicon16Path,
      },
    ],
  };
}

/**
 * A brand's standard social preview card, drawn by `src/lib/share/share-card.tsx`
 * and served from `/share/<brand>`.
 *
 * Absolute, and always on the USA Missionaries origin: a brand host serves only
 * its own pages and bounces everything else back to usamissionaries.org, so a
 * card addressed on the brand's own domain would unfurl through a redirect at
 * best. Unfurlers do not care which host an image comes from.
 *
 * Reach for this only on a surface that cannot use the file convention — a brand
 * served from another domain. A page on usamissionaries.org should add an
 * `opengraph-image.tsx` (see `src/lib/share/share-image.ts`) and leave the
 * `images` key out of its metadata entirely.
 */
export function buildDomainSiteSocialImage(site: DomainSiteConfig) {
  return {
    alt: site.socialImage.alt,
    height: site.socialImage.height,
    url: `${domainSites.usam.canonicalOrigin}${site.socialImage.path}`,
    width: site.socialImage.width,
  };
}

/**
 * Colors the browser chrome and the PWA splash for a brand. Keep this next to the
 * brand's metadata so a surface can never pick up another brand's theme color.
 */
export function buildDomainSiteViewport(site: DomainSiteConfig): Viewport {
  return {
    themeColor: site.themeColor,
  };
}

/**
 * The whole browser and sharing identity for one brand: titles, description,
 * canonical, icons, manifest, and social previews.
 *
 * `canonical` defaults to the brand's origin, which is only correct for a single
 * page. Layouts that wrap many routes must pass `canonical: null` and let each
 * page declare its own, otherwise every page claims the brand root as canonical.
 *
 * `surface` decides how the title is expressed, and it matters: Next resolves a
 * segment's title — including a `default` — against the *parent* segment's
 * template. Declaring a brand title without `absolute` therefore comes back with
 * the parent brand appended (`DOS | Discipleship Operating System | USA
 * Missionaries`), so both variants pin an absolute title.
 *
 *   "layout"  absolute title for this segment, plus the brand template for children
 *   "page"    absolute title only; a layout template never applies to its own page
 */
export function buildDomainSiteMetadata(
  site: DomainSiteConfig,
  {
    canonical = site.canonicalOrigin as string | null,
    manifestPath = site.manifestPath,
    metadataBaseOrigin = site.canonicalOrigin as string,
    noIndex = false,
    shareImage = "brand" as "brand" | "file",
    surface = "layout" as "layout" | "page",
  } = {},
): Metadata {
  // "file" leaves the `images` keys out so Next's `opengraph-image.tsx`
  // convention applies — the app-root card, or a page's own. Setting `images`
  // at all, even to undefined, suppresses it. Only the root layout wants this;
  // brands served from their own domain cannot reach a file-convention card.
  const socialImages: {
    openGraph?: Pick<NonNullable<Metadata["openGraph"]>, "images">;
    twitter?: { images: string[] };
  } =
    shareImage === "file"
      ? {}
      : {
          openGraph: { images: [buildDomainSiteSocialImage(site)] },
          twitter: { images: [buildDomainSiteSocialImage(site).url] },
        };

  return {
    alternates: canonical ? { canonical } : undefined,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: site.siteName,
    },
    description: site.description,
    icons: buildDomainSiteIcons(site),
    manifest: manifestPath,
    metadataBase: new URL(metadataBaseOrigin),
    openGraph: {
      description: site.description,
      ...socialImages.openGraph,
      siteName: site.siteName,
      title: site.title,
      type: "website",
      // Omitted for multi-route layouts so unfurlers fall back to the shared URL
      // instead of every page advertising the brand root.
      url: canonical ?? undefined,
    },
    robots: noIndex
      ? {
          follow: false,
          index: false,
        }
      : undefined,
    title:
      surface === "page"
        ? { absolute: site.title }
        : {
            absolute: site.title,
            template: site.titleTemplate,
          },
    twitter: {
      card: "summary_large_image",
      description: site.description,
      ...socialImages.twitter,
      title: site.title,
    },
  };
}
