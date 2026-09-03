import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MissionHeader } from "@/components/mission-of-reconciliation/MissionHeader";
import { buildDomainSiteIcons, buildDomainSiteSocialImage } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";
import { morColor, morFont } from "@/src/lib/mission-of-reconciliation/brand";
import { missionCanonical } from "@/src/lib/mission-of-reconciliation/domain";
import { getMissionPaths } from "@/src/lib/mission-of-reconciliation/request-domain";
import { caseStudies, getCaseStudy } from "@/src/lib/mission-of-reconciliation/case-studies";
import { CaseStudyBlock } from "../../_components/CaseStudy";

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
    // The root layout emits USA Missionaries icons for every route, so the
    // Mission of Reconciliation surfaces restate their own brand identity.
    icons: buildDomainSiteIcons(domainSites["mission-of-reconciliation"]),
    manifest: domainSites["mission-of-reconciliation"].manifestPath,
    alternates: { canonical: missionCanonical.story(study.id) },
    description: study.cardSummary,
    openGraph: {
      description: study.cardSummary,
      images: [buildDomainSiteSocialImage(domainSites["mission-of-reconciliation"])],
      siteName: domainSites["mission-of-reconciliation"].siteName,
      title,
      type: "article",
      url: missionCanonical.story(study.id),
    },
    title: { absolute: title },
  };
}

/**
 * A single case study. Deliberately not a second landing page: no national call
 * and no mission-level CTAs, just the story and a way back to the others.
 */
export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [study, paths] = [getCaseStudy(slug), await getMissionPaths()];

  if (!study) {
    notFound();
  }

  const index = caseStudies.findIndex((entry) => entry.id === study.id) + 1;
  const backLinkClassName = "inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]";
  const backLinkStyle = {
    color: morColor.goldInk,
    fontFamily: morFont.rajdhani,
    fontWeight: 700,
  } as const;

  return (
    <>
      <MissionHeader cta="restoration" paths={paths} />
      <main style={{ backgroundColor: morColor.page }}>
        <section className="px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-14">
          <div className="mx-auto w-full max-w-6xl">
            <Link className={backLinkClassName} href={paths.stories} style={backLinkStyle}>
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

            <div className="mt-14 border-t pt-8" style={{ borderColor: morColor.rule }}>
              <Link className={backLinkClassName} href={paths.stories} style={backLinkStyle}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                All Stories of Reconciliation
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
