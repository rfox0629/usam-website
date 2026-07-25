import { Table2 } from "lucide-react";
import { DomainMarketingPage } from "../_components/DomainMarketingPage";
import { requireDomainRoute } from "../_components/requireDomainRoute";
import { buildDomainSiteMetadata } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

const site = domainSites["kitchen-table-gospel"];

export const metadata = buildDomainSiteMetadata(site);

export default async function KitchenTableGospelDomainPage() {
  await requireDomainRoute(site.key);

  return (
    <DomainMarketingPage
      accent="amber"
      attribution="USA Missionaries initiative"
      body="Kitchen Table Gospel is a USA Missionaries initiative helping people gather in homes, share the Gospel with clarity, pray together, and move conversations toward discipleship."
      heroImage={{
        alt: "Kitchen Table Gospel gathering around a table",
        src: "/images/vision/kitchen-table-01.jpg",
      }}
      highlights={[
        "Primary public Kitchen Table Gospel marketing URL: kitchentablegospel.org.",
        "This domain stays distinct while remaining clearly connected to USA Missionaries.",
        "Visitors can return to USA Missionaries through the shared System navigation.",
      ]}
      icon={Table2}
      site={site}
    />
  );
}
