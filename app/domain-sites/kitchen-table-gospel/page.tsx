import { requireDomainRoute } from "../_components/requireDomainRoute";
import { KitchenTableGospelSite } from "@/src/components/domain-sites/KitchenTableGospelSite";
import { buildDomainSiteMetadata } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

const site = domainSites["kitchen-table-gospel"];

export const metadata = buildDomainSiteMetadata(site, { noIndex: true });

export default async function KitchenTableGospelDomainPage() {
  await requireDomainRoute(site.key);

  const ecosystemHref = process.env.VERCEL_ENV === "production"
    ? "https://usamissionaries.org/ecosystem"
    : "/ecosystem";

  return <KitchenTableGospelSite ecosystemHref={ecosystemHref} />;
}
