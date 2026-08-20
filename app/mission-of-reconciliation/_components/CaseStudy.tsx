import Image from "next/image";
import { morColor, morFont } from "@/src/lib/mission-of-reconciliation/brand";
import type { CaseStudy } from "@/src/lib/mission-of-reconciliation/case-studies";

/**
 * One case study, laid out as an editorial spread: a full-width then-and-now
 * photo pair, then the narrative measured against a supporting column that
 * carries the Scripture and the video. Numbered by position, so a second or
 * third entry in `caseStudies` renders without touching this component.
 */
export function CaseStudyBlock({ index, study }: { index: number; study: CaseStudy }) {
  const number = String(index).padStart(2, "0");

  return (
    <article id={study.id}>
      <header
        className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t pt-6"
        style={{ borderColor: morColor.rule }}
      >
        <span
          className="text-[1.5rem] leading-none md:text-[1.75rem]"
          style={{ color: morColor.gold, fontFamily: morFont.oswald, fontWeight: 600 }}
        >
          {number}
        </span>
        <h3
          className="text-[1.75rem] leading-none md:text-[2.25rem]"
          style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
        >
          {study.name}
        </h3>
        <span
          className="text-[11px] uppercase tracking-[0.2em]"
          style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 600 }}
        >
          {study.where}
        </span>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-4 md:gap-6">
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
                sizes="(max-width: 768px) 46vw, (max-width: 1200px) 45vw, 552px"
                src={photo.src}
              />
            </div>
            <figcaption
              className="mt-3 text-[10px] uppercase tracking-[0.18em] md:text-[11px]"
              style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 600 }}
            >
              {photo.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <p
            className="text-[1.5rem] leading-[1.3] md:text-[1.9rem]"
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 500 }}
          >
            {study.summary}
          </p>

          {study.story.map((paragraph) => (
            <p
              className="mt-5 text-base leading-8 md:text-[1.0625rem] md:leading-9"
              key={paragraph.slice(0, 40)}
              style={{ color: morColor.body }}
            >
              {paragraph}
            </p>
          ))}

          <p
            className="mt-8 border-t pt-6 text-[1.25rem] leading-[1.4] md:text-[1.45rem]"
            style={{
              borderColor: morColor.rule,
              color: morColor.ink,
              fontFamily: morFont.oswald,
              fontWeight: 500,
            }}
          >
            {study.closing}
          </p>
        </div>

        <aside className="lg:pt-2">
          {study.scripture ? (
            <figure className="border-l-2 pl-5 md:pl-6" style={{ borderColor: morColor.gold }}>
              <blockquote>
                <p
                  className="text-[1.15rem] leading-[1.55] md:text-[1.3rem]"
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

          {study.video ? (
            <div className={study.scripture ? "mt-8" : ""}>
              <p
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 700 }}
              >
                {study.video.note}
              </p>
              <div
                className="mt-3 w-full overflow-hidden"
                style={{ aspectRatio: "16 / 9", backgroundColor: morColor.deep, position: "relative" }}
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
              <a
                className="mt-3 inline-block text-[13px] leading-6 underline underline-offset-4"
                href={study.video.watchUrl}
                rel="noopener noreferrer"
                style={{ color: morColor.goldInk }}
                target="_blank"
              >
                {study.video.title}
              </a>
            </div>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
