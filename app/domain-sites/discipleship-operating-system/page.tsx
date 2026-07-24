import { MonitorCheck } from "lucide-react";
import { DomainMarketingPage } from "../_components/DomainMarketingPage";
import { requireDomainRoute } from "../_components/requireDomainRoute";
import { buildDomainSiteMetadata } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

const site = domainSites["discipleship-operating-system"];

export const metadata = buildDomainSiteMetadata(site);

export default async function DiscipleshipOperatingSystemDomainPage() {
  await requireDomainRoute(site.key);

  return (
    <DomainMarketingPage
      accent="blue"
      attribution="USA Missionaries product/initiative"
      body="DOS is the public home for the discipleship operating system being built by USA Missionaries to help leaders care for people, tables, fruit, and next steps."
      heroImage={{
        alt: "Discipleship Operating System mobile interface preview",
        src: "/images/vision/dos-circles.jpg",
      }}
      highlights={[
        "Primary public DOS marketing URL: discipleshipoperatingsystem.com.",
        "The private DOS application remains under /dos and is not part of this marketing page.",
        "Visitors can return to USA Missionaries through the shared ecosystem navigation.",
      ]}
      icon={MonitorCheck}
      site={site}
    />
  );
}
