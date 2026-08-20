import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { morColor, morFont } from "@/src/lib/mission-of-reconciliation/brand";
import { caseStudyHref, type CaseStudy } from "@/src/lib/mission-of-reconciliation/case-studies";

/**
 * One story on the index. The whole card is the link; the arrow is decoration.
 * Leads with the current photo so the grid reads as people, not documents.
 */
export function StoryCard({ index, study }: { index: number; study: CaseStudy }) {
  const number = String(index).padStart(2, "0");
  const cover = study.photos[study.photos.length - 1] ?? study.photos[0];

  return (
    <article className="h-full">
      <Link
        className="group flex h-full flex-col overflow-hidden rounded-lg border transition-colors hover:border-[#C2A14E]"
        href={caseStudyHref(study)}
        style={{ backgroundColor: "#FFFFFF", borderColor: morColor.rule }}
      >
        <div className="relative aspect-[3/2] w-full overflow-hidden" style={{ backgroundColor: morColor.band }}>
          <Image
            alt={cover.alt}
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            src={cover.src}
          />
        </div>

        <div className="flex flex-1 flex-col p-5 md:p-6">
          <div className="flex items-baseline gap-3">
            <span
              className="text-[1.05rem] leading-none"
              style={{ color: morColor.gold, fontFamily: morFont.oswald, fontWeight: 600 }}
            >
              {number}
            </span>
            <span
              className="text-[10px] uppercase tracking-[0.2em]"
              style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 600 }}
            >
              {study.where}
            </span>
          </div>

          <h3
            className="mt-2 text-[1.45rem] leading-tight md:text-[1.6rem]"
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
          >
            {study.name}
          </h3>

          <p className="mt-3 text-[15px] leading-7" style={{ color: morColor.body }}>
            {study.cardSummary}
          </p>

          <span
            className="mt-auto inline-flex items-center gap-2 pt-6 text-[11px] uppercase tracking-[0.18em]"
            style={{ color: morColor.goldInk, fontFamily: morFont.rajdhani, fontWeight: 700 }}
          >
            Read their story
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </article>
  );
}
