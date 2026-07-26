import { requireDomainRoute } from "../_components/requireDomainRoute";
import { DosLandingPage } from "./DosLandingPage";
import { buildDomainSiteMetadata } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

const site = domainSites["discipleship-operating-system"];

export const metadata = buildDomainSiteMetadata(site, { noIndex: process.env.VERCEL_ENV !== "production" });

export default async function DiscipleshipOperatingSystemDomainPage() {
  await requireDomainRoute(site.key);

  return <DosLandingPage />;
}
