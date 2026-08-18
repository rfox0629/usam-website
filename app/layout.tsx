import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Suspense } from "react";
import "./globals.css";
import { AnalyticsScripts } from "../components/AnalyticsScripts";
import { RouteAwareSiteFooter } from "../components/RouteAwareSiteFooter";
import { VercelWebAnalytics } from "../components/VercelWebAnalytics";
import { buildDomainSiteMetadata, buildDomainSiteViewport } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

// USA Missionaries is the default identity for every route: title template,
// description, favicon family, manifest, and social preview. Surfaces that belong
// to another brand (DOS under /dos, the domain sites) replace the whole block in
// their own layout instead of patching individual pages. Pages normally override
// only title, description, canonical, and social image.
export const metadata: Metadata = buildDomainSiteMetadata(domainSites.usam, { canonical: null });

export const viewport: Viewport = buildDomainSiteViewport(domainSites.usam);

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
