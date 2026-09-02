import Image from "next/image";
import { morColor, morFont } from "@/src/lib/mission-of-reconciliation/brand";
import type { CaseStudy } from "@/src/lib/mission-of-reconciliation/case-studies";

/**
 * One case study: a then-and-now photo pair over a two-column read. Numbered by
 * position, so a second or third entry in `caseStudies` renders without
 * touching this component.
 */
export function CaseStudyBlock({
  hideName = false,
  index,
  study,
}: {
  /** The story page prints the name as its h1, so the block skips it there. */
  hideName?: boolean;
  index: number;
  study: CaseStudy;
}) {
  const number = String(index).padStart(2, "0");

  return (
    <article id={study.id}>
      <header
        className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t pt-6"
        style={{ borderColor: morColor.rule }}
      >
        <span
          className="text-[1.35rem] leading-none md:text-[1.6rem]"
          style={{ color: morColor.gold, fontFamily: morFont.oswald, fontWeight: 600 }}
        >
          {number}
        </span>
        {hideName ? null : (
          <h3
            className="text-[1.6rem] leading-none md:text-[2rem]"
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
          >
            {study.name}
          </h3>
        )}
        <span
          className="text-[11px] uppercase tracking-[0.2em]"
          style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 600 }}
        >
          {study.where}
        </span>
      </header>

      <div className="mt-7 grid max-w-2xl grid-cols-2 gap-4 md:gap-5">
        {study.photos.map((photo) => (
          <figure key={photo.src}>
            <div
              className="relative aspect-[4/3] w-full overflow-hidden rounded-lg"
              style={{ backgroundColor: morColor.band }}
            >
              <Image
                alt={photo.alt}
                className="object-cover"
                fill
                sizes="(max-width: 768px) 46vw, 326px"
                src={photo.src}
                style={{ objectPosition: photo.focalPoint ?? "center" }}
              />
            </div>
            <figcaption
              className="mt-2.5 text-[10px] uppercase tracking-[0.18em]"
              style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 600 }}
            >
              {photo.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <p
            className="text-[1.3rem] leading-[1.35] md:text-[1.55rem]"
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 500 }}
          >
            {study.summary}
          </p>

          {study.story.map((paragraph) => (
            <p
              className="mt-4 text-base leading-8"
              key={paragraph.slice(0, 40)}
              style={{ color: morColor.body }}
            >
              {paragraph}
            </p>
          ))}
        </div>

        <aside className="lg:pt-1">
          {study.scripture ? (
            <figure className="border-l-2 pl-5" style={{ borderColor: morColor.gold }}>
              <blockquote>
                <p
                  className="text-[1.1rem] leading-[1.55] md:text-[1.2rem]"
                  style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 400 }}
                >
                  {study.scripture.text}
                </p>
              </blockquote>
              <figcaption
                className="mt-3 text-[11px] uppercase tracking-[0.2em]"
                style={{ color: morColor.goldInk, fontFamily: morFont.rajdhani, fontWeight: 700 }}
              >
                {study.scripture.reference}
              </figcaption>
            </figure>
          ) : null}

          <p
            className="mt-7 text-[1.15rem] leading-[1.4] md:text-[1.3rem]"
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 500 }}
          >
            {study.closing}
          </p>

        </aside>
      </div>
    </article>
  );
}
