import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MissionHeader } from "@/components/mission-of-reconciliation/MissionHeader";
import { buildDomainSiteSocialImage } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";
import { morColor, morFont, morRoutes } from "@/src/lib/mission-of-reconciliation/brand";
import { caseStudies } from "@/src/lib/mission-of-reconciliation/case-studies";
import { StoryCard } from "../_components/StoryCard";

const description =
  "Ordinary followers of Jesus making themselves available to the people God has placed around them.";

export const metadata: Metadata = {
  alternates: { canonical: morRoutes.stories },
  description,
  openGraph: {
    description,
    images: [buildDomainSiteSocialImage(domainSites.usam)],
    siteName: domainSites.usam.siteName,
    title: "Stories of Reconciliation | Mission of Reconciliation",
    type: "website",
    url: morRoutes.stories,
  },
  title: { absolute: "Stories of Reconciliation | Mission of Reconciliation" },
};

export default function StoriesIndexPage() {
  const onlyOne = caseStudies.length === 1;

  return (
    <>
      <MissionHeader cta="restoration" />
      <main style={{ backgroundColor: morColor.page }}>
        <section className="px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-14">
          <div className="mx-auto w-full max-w-6xl">
            <Link
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]"
              href={morRoutes.home}
              style={{ color: morColor.goldInk, fontFamily: morFont.rajdhani, fontWeight: 700 }}
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Mission of Reconciliation
            </Link>

            <h1
              className="mt-6 max-w-4xl"
              style={{
                color: morColor.ink,
                fontFamily: morFont.oswald,
                fontSize: "clamp(2.25rem, 6vw, 4rem)",
                fontWeight: 600,
                letterSpacing: 0,
                lineHeight: 1,
              }}
            >
              Stories of Reconciliation
            </h1>

            <p
              className="mt-6 max-w-2xl text-[1.0625rem] leading-8 md:text-lg md:leading-9"
              style={{ color: morColor.body }}
            >
              {description}
            </p>

            <div
              className={onlyOne ? "mt-12" : "mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"}
            >
              {caseStudies.map((study, index) => (
                <StoryCard
                  index={index + 1}
                  key={study.id}
                  layout={onlyOne ? "feature" : "card"}
                  study={study}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
