"use client";

import { usePathname } from "next/navigation";
import { domainSiteRoutePrefix } from "@/src/lib/domain-sites";
import { SiteFooter } from "./SiteFooter";

export function RouteAwareSiteFooter() {
  const pathname = usePathname();
  if (
    pathname?.startsWith("/dos")
    || pathname?.startsWith("/groups")
    || pathname?.startsWith("/vision")
    || pathname?.startsWith("/board-briefing")
    || pathname?.startsWith(domainSiteRoutePrefix)
  ) {
    return null;
  }

  return <SiteFooter />;
}
