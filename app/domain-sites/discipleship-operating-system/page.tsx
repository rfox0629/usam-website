import { DomainSiteLandingPage } from "../_components/DomainSiteLandingPage";
import { requireDomainRoute } from "../_components/requireDomainRoute";
import { buildDomainSiteMetadata } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

const site = domainSites["discipleship-operating-system"];

export const metadata = buildDomainSiteMetadata(site);

export default async function DiscipleshipOperatingSystemDomainPage() {
  await requireDomainRoute(site.key);

  return <DomainSiteLandingPage site={site} />;
}
