import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "../components/SiteFooter";

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
        className="flex min-h-screen flex-col bg-[#050505] text-stone-100"
        style={{ fontFamily: "'Inter', sans-serif", WebkitFontSmoothing: "antialiased" }}
      >
        <div className="flex-1">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
