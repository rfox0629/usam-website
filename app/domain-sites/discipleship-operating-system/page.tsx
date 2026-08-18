import { requireDomainRoute } from "../_components/requireDomainRoute";
import { DosLandingPage } from "./DosLandingPage";
import { buildDomainSiteMetadata, buildDomainSiteViewport } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

const site = domainSites["discipleship-operating-system"];

export const metadata = buildDomainSiteMetadata(site, {
  noIndex: process.env.VERCEL_ENV !== "production",
  surface: "page",
});

export const viewport = buildDomainSiteViewport(site);

export default async function DiscipleshipOperatingSystemDomainPage() {
  await requireDomainRoute(site.key);

  return <DosLandingPage />;
}
