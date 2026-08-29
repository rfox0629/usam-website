"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { domainSiteRoutePrefix, getAlternateDomainSiteByHostname } from "@/src/lib/domain-sites";
import { isMissionHostname } from "@/src/lib/mission-of-reconciliation/domain";
import { SiteFooter } from "./SiteFooter";

export function RouteAwareSiteFooter() {
  const pathname = usePathname();
  const [clientRoute, setClientRoute] = useState<{
    hasDomainSitePage: boolean;
    hostname: string;
  } | null>(null);

  useEffect(() => {
    setClientRoute({
      hasDomainSitePage: Boolean(document.querySelector("[data-domain-site]")),
      hostname: window.location.hostname,
    });
  }, []);

  if (
    pathname?.startsWith("/dos")
    // USA-191: /join is a full-screen guided experience with its own fixed
    // advance bar. The site footer would sit underneath that bar and break the
    // immersion, so the application owns the whole viewport.
    || pathname?.startsWith("/join")
    || pathname?.startsWith("/groups")
    || pathname?.startsWith("/operations")
    || pathname?.startsWith("/guide/new-testament-14-days")
    || pathname?.startsWith("/restoration")
    || pathname?.startsWith("/vision")
    || pathname?.startsWith("/board-briefing")
    || pathname?.startsWith(domainSiteRoutePrefix)
    || (clientRoute === null && pathname === "/")
    || clientRoute?.hasDomainSitePage
    // Mission of Reconciliation keeps the USA Missionaries footer: it carries the
    // partnership line and the 501(c)(3) notice.
    || Boolean(
      getAlternateDomainSiteByHostname(clientRoute?.hostname)
      && !isMissionHostname(clientRoute?.hostname),
    )
  ) {
    return null;
  }

  return <SiteFooter />;
}
