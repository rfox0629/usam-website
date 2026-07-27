import type { Metadata } from "next";
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

export function buildDomainSiteMetadata(site: DomainSiteConfig, { noIndex = false } = {}): Metadata {
  const socialImage = {
    alt: site.socialImage.alt,
    height: site.socialImage.height,
    url: site.socialImage.path,
    width: site.socialImage.width,
  };

  return {
    alternates: {
      canonical: site.canonicalOrigin,
    },
    description: site.description,
    icons: buildDomainSiteIcons(site),
    manifest: site.manifestPath,
    metadataBase: new URL(site.canonicalOrigin),
    openGraph: {
      description: site.description,
      images: [socialImage],
      siteName: site.siteName,
      title: site.title,
      type: "website",
      url: site.canonicalOrigin,
    },
    robots: noIndex
      ? {
          follow: false,
          index: false,
        }
      : undefined,
    title: {
      default: site.title,
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
