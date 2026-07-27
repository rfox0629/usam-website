import type { Metadata } from "next";
import type { DomainSiteConfig } from "@/src/lib/domain-sites";

export function buildDomainSiteIcons(site: DomainSiteConfig): Metadata["icons"] {
  return {
    apple: [
      {
        sizes: "180x180",
        type: "image/png",
        url: site.icons.appleTouch,
      },
    ],
    icon: [
      {
        sizes: "any",
        type: "image/svg+xml",
        url: site.icons.faviconSvg,
      },
      {
        sizes: "any",
        url: site.icons.faviconIco,
      },
      {
        sizes: "48x48",
        type: "image/png",
        url: site.icons.faviconPng48,
      },
      {
        sizes: "32x32",
        type: "image/png",
        url: site.icons.faviconPng32,
      },
      {
        sizes: "16x16",
        type: "image/png",
        url: site.icons.faviconPng16,
      },
      {
        sizes: "192x192",
        type: "image/png",
        url: site.icons.icon192,
      },
      {
        sizes: "512x512",
        type: "image/png",
        url: site.icons.icon512,
      },
    ],
    shortcut: [
      {
        url: site.icons.faviconIco,
      },
    ],
  };
}

export function buildDomainSiteMetadata(site: DomainSiteConfig, { noIndex = false } = {}): Metadata {
  return {
    alternates: {
      canonical: site.canonicalOrigin,
    },
    description: site.description,
    icons: buildDomainSiteIcons(site),
    manifest: site.icons.manifest,
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
