"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { domainSiteRoutePrefix, getAlternateDomainSiteByHostname } from "@/src/lib/domain-sites";
import { SiteFooter } from "./SiteFooter";

export function RouteAwareSiteFooter() {
  const pathname = usePathname();
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  if (
    pathname?.startsWith("/dos")
    || pathname?.startsWith(domainSiteRoutePrefix)
    || Boolean(getAlternateDomainSiteByHostname(hostname))
  ) {
    return null;
  }

  return <SiteFooter />;
}
