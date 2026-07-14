"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./SiteFooter";

export function RouteAwareSiteFooter() {
  const pathname = usePathname();

  if (pathname?.startsWith("/dos") || pathname?.startsWith("/vision") || pathname?.startsWith("/board-briefing")) {
    return null;
  }

  return <SiteFooter />;
}
