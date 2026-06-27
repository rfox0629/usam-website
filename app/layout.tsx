import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AnalyticsScripts } from "../components/AnalyticsScripts";
import { RouteAwareSiteFooter } from "../components/RouteAwareSiteFooter";

export const metadata: Metadata = {
  title: "USA Missionaries",
  description: "The Mission Is Active",
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
        <div className="flex-1">
          {children}
        </div>
        <RouteAwareSiteFooter />
      </body>
    </html>
  );
}
