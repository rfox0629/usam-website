import { requireDomainRoute } from "../_components/requireDomainRoute";
import { KitchenTableGospelSite } from "@/src/components/domain-sites/KitchenTableGospelSite";
import { buildDomainSiteMetadata } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

const site = domainSites["kitchen-table-gospel"];

export const metadata = buildDomainSiteMetadata(site, { noIndex: true });

export default async function KitchenTableGospelDomainPage() {
  await requireDomainRoute(site.key);

  const isProduction = process.env.VERCEL_ENV === "production";
  const ecosystemHref = isProduction ? "https://usamissionaries.org/ecosystem" : "/ecosystem";
  const siteHref = isProduction ? "/" : site.rootPath;

  return <KitchenTableGospelSite ecosystemHref={ecosystemHref} siteHref={siteHref} />;
}
