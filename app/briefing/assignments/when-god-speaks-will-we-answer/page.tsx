import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PrimaryNav } from "../../../../components/PrimaryNav";
import { assignmentArticle, assignmentParagraphs } from "../assignments";

export const metadata: Metadata = {
  title: `${assignmentArticle.title} | Assignments Completed`,
  description: assignmentArticle.excerpt,
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function ArticleParagraph({ children }: { children: string }) {
  const isEmphasis = children.length < 90;

  if (isEmphasis) {
    return (
      <p className="border-l-2 border-usam-gold/55 pl-5 text-xl font-semibold leading-8 text-white md:text-2xl md:leading-10">
        {children}
      </p>
    );
  }

  return (
    <p className="text-base leading-8 text-stone-300 md:text-[17px] md:leading-9">
      {children}
    </p>
  );
}

export default function AssignmentArticlePage() {
  return (
    <main className="min-h-screen bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="briefing" />

      <article>
        <header className="relative overflow-hidden px-6 pb-14 pt-24 md:pb-20 md:pt-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_26%,rgba(194,161,78,0.14),transparent_25%),radial-gradient(circle_at_80%_42%,rgba(255,255,255,0.035),transparent_26%),linear-gradient(180deg,rgba(13,13,13,0.72),#0D0D0D_86%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[length:86px_86px]" />

          <div className="relative mx-auto max-w-6xl">
            <Link
              className="inline-flex text-[10px] font-semibold uppercase tracking-[0.22em] text-usam-gold transition-colors hover:text-white"
              href="/briefing"
              style={{ fontFamily: font.rajdhani }}
            >
              Back to Briefing
            </Link>

            <div className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_0.95fr] lg:items-center">
              <div>
                <p className="tactical-gold-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  Assignments Completed
                </p>
                <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-none text-white md:text-7xl" style={{ fontFamily: font.oswald }}>
                  {assignmentArticle.title}
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-400">
                  {assignmentArticle.excerpt}
                </p>
                <div className="mt-8 flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45" style={{ fontFamily: font.rajdhani }}>
                  <span>{assignmentArticle.author}</span>
                  <span className="text-usam-gold">//</span>
                  <span>{assignmentArticle.date}</span>
                  <span className="text-usam-gold">//</span>
                  <span>{assignmentArticle.sourceLabel}</span>
                </div>
              </div>

              <div className="relative overflow-hidden border border-white/[0.1] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.5)] lg:max-w-[540px] lg:justify-self-end">
                <div className="absolute inset-y-0 left-0 z-10 w-1 bg-usam-gold" />
                <div className="relative aspect-[5/6]">
                  <Image
                    alt={assignmentArticle.image.alt}
                    className="h-full w-full object-cover opacity-90 saturate-[0.9]"
                    height={assignmentArticle.image.height}
                    priority
                    sizes="(min-width: 1024px) 520px, 100vw"
                    src={assignmentArticle.image.src}
                    width={assignmentArticle.image.width}
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="relative border-t border-white/[0.08] px-6 py-16 md:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(194,161,78,0.08),transparent_24%),linear-gradient(180deg,#0D0D0D,rgba(13,13,13,0.94))]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.74fr_0.26fr]">
            <div className="max-w-3xl space-y-7">
              {assignmentParagraphs.map((paragraph, index) => (
                <ArticleParagraph key={`${paragraph.slice(0, 24)}-${index}`}>
                  {paragraph}
                </ArticleParagraph>
              ))}
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="border border-white/[0.1] bg-white/[0.018] p-6 shadow-[0_18px_54px_rgba(0,0,0,0.28)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-usam-gold" style={{ fontFamily: font.rajdhani }}>
                  Assignment Record
                </p>
                <dl className="mt-6 space-y-5 text-sm">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/38" style={{ fontFamily: font.rajdhani }}>
                      Author
                    </dt>
                    <dd className="mt-1 text-white">{assignmentArticle.author}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/38" style={{ fontFamily: font.rajdhani }}>
                      Date
                    </dt>
                    <dd className="mt-1 text-white">{assignmentArticle.date}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/38" style={{ fontFamily: font.rajdhani }}>
                      Source Page
                    </dt>
                    <dd className="mt-1">
                      <a
                        className="text-usam-gold transition-colors hover:text-white"
                        href={assignmentArticle.sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {assignmentArticle.sourceLabel}
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </section>
      </article>
    </main>
  );
}
