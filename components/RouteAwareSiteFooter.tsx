"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { domainSiteRoutePrefix, getAlternateDomainSiteByHostname } from "@/src/lib/domain-sites";
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
    || pathname?.startsWith("/groups")
    || pathname?.startsWith("/vision")
    || pathname?.startsWith("/board-briefing")
    || pathname?.startsWith(domainSiteRoutePrefix)
    || (clientRoute === null && pathname === "/")
    || clientRoute?.hasDomainSitePage
    || Boolean(getAlternateDomainSiteByHostname(clientRoute?.hostname))
  ) {
    return null;
  }

  return <SiteFooter />;
}
