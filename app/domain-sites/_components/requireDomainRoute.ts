import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  domainRouteHeader,
  getAlternateDomainSiteByHostname,
  isDirectDomainSitePreviewAllowed,
  type DomainSiteKey,
} from "@/src/lib/domain-sites";

export async function requireDomainRoute(siteKey: DomainSiteKey) {
  const headerList = await headers();
  const routedSite = getAlternateDomainSiteByHostname(headerList.get("x-forwarded-host") ?? headerList.get("host"));

  if (isDirectDomainSitePreviewAllowed() && !routedSite) {
    return;
  }

  if (headerList.get(domainRouteHeader) !== siteKey || routedSite?.key !== siteKey) {
    notFound();
  }
}
