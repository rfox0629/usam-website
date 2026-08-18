import type { Metadata, Viewport } from "next";
import type { DomainSiteConfig } from "@/src/lib/domain-sites";

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
 * A brand's standard social preview image.
 *
 * Next replaces the whole `openGraph` object when a page declares one, so any page
 * with its own Open Graph block has to restate the brand image rather than
 * inheriting it — otherwise its links unfurl with no image at all.
 */
export function buildDomainSiteSocialImage(site: DomainSiteConfig) {
  return {
    alt: site.socialImage.alt,
    height: site.socialImage.height,
    url: site.socialImage.path,
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
    surface = "layout" as "layout" | "page",
  } = {},
): Metadata {
  const socialImage = buildDomainSiteSocialImage(site);

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
      images: [socialImage],
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
      images: [site.socialImage.path],
      title: site.title,
    },
  };
}
