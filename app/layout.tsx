import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Suspense } from "react";
import "./globals.css";
import { AnalyticsScripts } from "../components/AnalyticsScripts";
import { RouteAwareSiteFooter } from "../components/RouteAwareSiteFooter";
import { VercelWebAnalytics } from "../components/VercelWebAnalytics";
import { domainSites } from "@/src/lib/domain-sites";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";

const siteName = domainSites.usam.siteName;
const siteDescription = domainSites.usam.description;
const siteSocialImage = domainSites.usam.socialImage;
const canonicalSiteUrl = getCanonicalSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(canonicalSiteUrl),
  title: siteName,
  description: siteDescription,
  openGraph: {
    description: siteDescription,
    images: siteSocialImage
      ? [
          {
            alt: siteSocialImage.alt,
            height: siteSocialImage.height,
            url: siteSocialImage.path,
            width: siteSocialImage.width,
          },
        ]
      : undefined,
    siteName,
    title: siteName,
    type: "website",
    url: canonicalSiteUrl,
  },
  twitter: {
    card: siteSocialImage ? "summary_large_image" : "summary",
    description: siteDescription,
    images: siteSocialImage ? [siteSocialImage.path] : undefined,
    title: siteName,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Oswald:wght@400;500;600;700&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className="flex min-h-screen flex-col bg-usam-black text-stone-100"
        style={{ fontFamily: "'Inter', sans-serif", WebkitFontSmoothing: "antialiased" }}
      >
        <Suspense fallback={null}>
          <AnalyticsScripts />
        </Suspense>
        <Suspense fallback={null}>
          <VercelWebAnalytics />
        </Suspense>
        <SpeedInsights />
        <div className="flex-1">
          {children}
        </div>
        <RouteAwareSiteFooter />
      </body>
    </html>
  );
}
