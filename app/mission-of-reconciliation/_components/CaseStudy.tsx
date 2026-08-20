import Image from "next/image";
import { morColor, morFont } from "@/src/lib/mission-of-reconciliation/brand";
import type { CaseStudy } from "@/src/lib/mission-of-reconciliation/case-studies";
import { ScriptureQuote } from "./MissionPrimitives";

/**
 * One case study. Numbered by position so a second or third entry in
 * `caseStudies` renders without touching this component.
 */
export function CaseStudyBlock({ index, study }: { index: number; study: CaseStudy }) {
  const number = String(index).padStart(2, "0");

  return (
    <article className="border-t pt-8 md:pt-10" id={study.id} style={{ borderColor: morColor.rule }}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span
          className="text-[1.75rem] leading-none md:text-[2rem]"
          style={{ color: morColor.gold, fontFamily: morFont.oswald, fontWeight: 600 }}
        >
          {number}
        </span>
        <h3
          className="text-[1.6rem] leading-none md:text-[2rem]"
          style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
        >
          {study.name}
        </h3>
        <span
          className="text-[11px] uppercase tracking-[0.18em]"
          style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 600 }}
        >
          {study.where}
        </span>
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {study.photos.map((photo) => (
              <figure key={photo.src}>
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden"
                  style={{ backgroundColor: morColor.band }}
                >
                  <Image
                    alt={photo.alt}
                    className="object-cover"
                    fill
                    sizes="(max-width: 1024px) 45vw, 280px"
                    src={photo.src}
                  />
                </div>
                <figcaption
                  className="mt-2 text-[10px] uppercase tracking-[0.16em]"
                  style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 600 }}
                >
                  {photo.caption}
                </figcaption>
              </figure>
            ))}
          </div>

          {study.video ? (
            <div className="mt-6 max-w-[340px]">
              <div
                className="relative w-full overflow-hidden"
                style={{ aspectRatio: "16 / 9", backgroundColor: morColor.deep }}
              >
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  src={study.video.embedUrl}
                  title={study.video.title}
                />
              </div>
              <p className="mt-2 text-[13px] leading-6" style={{ color: morColor.muted }}>
                {study.video.note}{" "}
                <a
                  className="underline underline-offset-4"
                  href={study.video.watchUrl}
                  rel="noopener noreferrer"
                  style={{ color: morColor.goldInk }}
                  target="_blank"
                >
                  {study.video.title}
                </a>
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <p
            className="text-[1.0625rem] leading-8 md:text-lg md:leading-9"
            style={{ color: morColor.body }}
          >
            {study.summary}
          </p>

          <ul className="mt-6 space-y-2.5">
            {study.points.map((point) => (
              <li
                className="border-l pl-4 text-[15px] leading-7"
                key={point}
                style={{ borderColor: morColor.rule, color: morColor.body }}
              >
                {point}
              </li>
            ))}
          </ul>

          {study.scripture ? (
            <div className="mt-7">
              <ScriptureQuote reference={study.scripture.reference}>
                {study.scripture.text}
              </ScriptureQuote>
            </div>
          ) : null}

          <p
            className="mt-7 text-[1.25rem] leading-[1.45] md:text-[1.4rem]"
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 500 }}
          >
            {study.closing}
          </p>
        </div>
      </div>
    </article>
  );
}
