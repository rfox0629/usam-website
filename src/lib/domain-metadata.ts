import type { Metadata } from "next";
import type { DomainSiteConfig } from "@/src/lib/domain-sites";

export function buildDomainSiteMetadata(site: DomainSiteConfig, { noIndex = false } = {}): Metadata {
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
      card: "summary",
      description: site.description,
      title: site.title,
    },
  };
}
