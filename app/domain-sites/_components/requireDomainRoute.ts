import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { domainRouteHeader, getAlternateDomainSiteByHostname, type DomainSiteKey } from "@/src/lib/domain-sites";

export async function requireDomainRoute(siteKey: DomainSiteKey) {
  // Mirrors the preview bypass in middleware.ts: preview deployments have no custom
  // domain, so hostname-based routing can never match there. Production is unaffected.
  if (process.env.VERCEL_ENV === "preview") {
    return;
  }

  const headerList = await headers();
  const routedSite = getAlternateDomainSiteByHostname(headerList.get("x-forwarded-host") ?? headerList.get("host"));

  if (headerList.get(domainRouteHeader) !== siteKey || routedSite?.key !== siteKey) {
    notFound();
  }
}
