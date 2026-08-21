import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { morColor, morFont } from "@/src/lib/mission-of-reconciliation/brand";
import type { CaseStudy } from "@/src/lib/mission-of-reconciliation/case-studies";

/**
 * One story, linked whole.
 *
 * "feature" is a wide horizontal treatment used when only one story is
 * published, so a single entry reads as an intentional spotlight rather than a
 * lone tile in an empty grid. "card" is the vertical tile the grid uses once
 * there are two or more.
 */
export function StoryCard({
  href,
  index,
  layout = "card",
  study,
}: {
  /** Host-native link to the story page. */
  href: string;
  index: number;
  layout?: "card" | "feature";
  study: CaseStudy;
}) {
  const number = String(index).padStart(2, "0");
  const cover = study.photos[study.photos.length - 1] ?? study.photos[0];
  const isFeature = layout === "feature";

  return (
    <article className="h-full">
      <Link
        className={`group flex h-full overflow-hidden rounded-lg border transition-colors hover:border-[#C2A14E] ${
          isFeature ? "flex-col md:flex-row" : "flex-col"
        }`}
        href={href}
        style={{ backgroundColor: "#FFFFFF", borderColor: morColor.rule }}
      >
        <div
          className={`relative overflow-hidden ${
            isFeature ? "aspect-[3/2] w-full md:aspect-auto md:w-[46%] md:shrink-0" : "aspect-[3/2] w-full"
          }`}
          style={{ backgroundColor: morColor.band }}
        >
          <Image
            alt={cover.alt}
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
            fill
            sizes={isFeature ? "(min-width: 768px) 46vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
            src={cover.src}
            style={{ objectPosition: cover.focalPoint ?? "center" }}
          />
        </div>

        <div className={`flex flex-1 flex-col ${isFeature ? "p-6 md:p-9 lg:p-11" : "p-5 md:p-6"}`}>
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
            className={`mt-2 leading-tight ${isFeature ? "text-[1.75rem] md:text-[2.35rem]" : "text-[1.45rem] md:text-[1.6rem]"}`}
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
          >
            {study.name}
          </h3>

          <p
            className={`mt-3 leading-7 ${isFeature ? "max-w-md text-[1.0625rem] md:text-lg md:leading-8" : "text-[15px]"}`}
            style={{ color: morColor.body }}
          >
            {study.cardSummary}
          </p>

          <span
            className={`mt-auto inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] ${isFeature ? "pt-8" : "pt-6"}`}
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
