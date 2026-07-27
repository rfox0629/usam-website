import type { Metadata } from "next";
import type { DomainSiteConfig } from "@/src/lib/domain-sites";

export function buildDomainSiteMetadata(site: DomainSiteConfig, { noIndex = false } = {}): Metadata {
  const socialImage = site.socialImage;

  return {
    alternates: {
      canonical: site.canonicalOrigin,
    },
    description: site.description,
    icons: {
      icon: site.faviconPath,
    },
    metadataBase: new URL(site.canonicalOrigin),
    openGraph: {
      description: site.description,
      images: socialImage
        ? [
            {
              alt: socialImage.alt,
              height: socialImage.height,
              url: socialImage.path,
              width: socialImage.width,
            },
          ]
        : undefined,
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
      card: socialImage ? "summary_large_image" : "summary",
      description: site.description,
      images: socialImage ? [socialImage.path] : undefined,
      title: site.title,
    },
  };
}
