import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MissionHeader } from "@/components/mission-of-reconciliation/MissionHeader";
import { buildDomainSiteSocialImage } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";
import { morColor, morFont, morRoutes } from "@/src/lib/mission-of-reconciliation/brand";
import { caseStudies, caseStudyHref, getCaseStudy } from "@/src/lib/mission-of-reconciliation/case-studies";
import { CaseStudyBlock } from "../../_components/CaseStudy";
import { PrimaryCta, SecondaryCta } from "../../_components/MissionCta";

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);

  if (!study) {
    return { title: { absolute: "Story | Mission of Reconciliation" } };
  }

  const title = `${study.name} | Mission of Reconciliation`;

  return {
    alternates: { canonical: caseStudyHref(study) },
    description: study.cardSummary,
    openGraph: {
      description: study.cardSummary,
      images: [buildDomainSiteSocialImage(domainSites.usam)],
      siteName: domainSites.usam.siteName,
      title,
      type: "article",
      url: caseStudyHref(study),
    },
    title: { absolute: title },
  };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = getCaseStudy(slug);

  if (!study) {
    notFound();
  }

  const index = caseStudies.findIndex((entry) => entry.id === study.id) + 1;

  return (
    <>
      <MissionHeader cta="restoration" />
      <main style={{ backgroundColor: morColor.page }}>
        <section className="px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-14">
          <div className="mx-auto w-full max-w-6xl">
            <Link
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]"
              href={`${morRoutes.home}#stories`}
              style={{ color: morColor.goldInk, fontFamily: morFont.rajdhani, fontWeight: 700 }}
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Stories of Reconciliation
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
              {study.name}
            </h1>

            <div className="mt-10">
              <CaseStudyBlock hideName index={index} study={study} />
            </div>

            <div
              className="mt-14 border-t pt-10"
              style={{ borderColor: morColor.rule }}
            >
              <p
                className="max-w-2xl text-[1.35rem] leading-[1.3] md:text-[1.6rem]"
                style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 500 }}
              >
                What if thousands of us lived this way?
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <PrimaryCta href={morRoutes.restoration}>Begin Your Restoration Journey</PrimaryCta>
                <SecondaryCta href={morRoutes.joinAnchor}>Join the Mission</SecondaryCta>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
