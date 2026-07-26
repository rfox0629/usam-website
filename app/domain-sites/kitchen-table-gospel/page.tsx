import { requireDomainRoute } from "../_components/requireDomainRoute";
import { buildDomainSiteMetadata } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";
import { KitchenTableGospelPage } from "./KitchenTableGospelPage";

const site = domainSites["kitchen-table-gospel"];

export const metadata = buildDomainSiteMetadata(site, { noIndex: process.env.VERCEL_ENV !== "production" });

export default async function KitchenTableGospelDomainPage() {
  await requireDomainRoute(site.key);

  return <KitchenTableGospelPage />;
}
