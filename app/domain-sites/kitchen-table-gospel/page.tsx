import { DomainHoldingPage } from "../_components/DomainHoldingPage";
import { requireDomainRoute } from "../_components/requireDomainRoute";
import { buildDomainSiteMetadata } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

const site = domainSites["kitchen-table-gospel"];

export const metadata = buildDomainSiteMetadata(site, { noIndex: true });

export default async function KitchenTableGospelDomainPage() {
  await requireDomainRoute(site.key);

  return <DomainHoldingPage site={site} />;
}
