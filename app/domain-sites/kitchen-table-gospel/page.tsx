import { requireDomainRoute } from "../_components/requireDomainRoute";
import { buildDomainSiteMetadata, buildDomainSiteViewport } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";
import { KitchenTableGospelPage } from "./KitchenTableGospelPage";
import { KitchenTableTestimonials } from "./KitchenTableTestimonials";

const site = domainSites["kitchen-table-gospel"];

export const metadata = buildDomainSiteMetadata(site, {
  noIndex: process.env.VERCEL_ENV !== "production",
  surface: "page",
});

export const viewport = buildDomainSiteViewport(site);

export default async function KitchenTableGospelDomainPage() {
  await requireDomainRoute(site.key);

  return (
    <>
      <KitchenTableGospelPage />
      <KitchenTableTestimonials />
    </>
  );
}
