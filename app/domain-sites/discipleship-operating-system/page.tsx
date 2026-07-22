import { requireDomainRoute } from "../_components/requireDomainRoute";
import { DosV4Site } from "@/src/components/domain-sites/DosV4Site";
import { buildDomainSiteMetadata } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

const site = domainSites["discipleship-operating-system"];

export const metadata = buildDomainSiteMetadata(site, { noIndex: true });

export default async function DiscipleshipOperatingSystemDomainPage() {
  await requireDomainRoute(site.key);

  return <DosV4Site />;
}
