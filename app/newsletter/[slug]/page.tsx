import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrimaryNav } from "@/components/PrimaryNav";
import { getPublishedNewsletterBySlug } from "@/src/lib/communications/data";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type PageParams = {
  slug: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function paragraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const newsletter = await getPublishedNewsletterBySlug(slug);

  if (!newsletter) {
    return {
      title: "Newsletter | USA Missionaries",
    };
  }

  return {
    description: newsletter.summary ?? newsletter.preheader ?? undefined,
    title: `${newsletter.title} | USA Missionaries`,
  };
}

export default async function NewsletterIssuePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const newsletter = await getPublishedNewsletterBySlug(slug);

  if (!newsletter) {
    notFound();
  }

  const publishedDate = formatDate(newsletter.published_at);

  return (
    <main className="min-h-screen bg-[#f8f6f0] text-stone-950">
      <PrimaryNav active="mission" />

      <article className="px-5 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Link className="text-sm font-semibold text-[#7a5a12] underline-offset-4 hover:underline" href="/newsletter">
            Archive
          </Link>

          <header className="mt-8 border-b border-stone-300/70 pb-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a6a1f]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {publishedDate ?? "Newsletter"}
            </p>
            <h1 className="mt-4 text-5xl font-semibold uppercase leading-[0.95] text-stone-950 md:text-6xl" style={{ fontFamily: font.oswald }}>
              {newsletter.title}
            </h1>
            {newsletter.summary ? (
              <p className="mt-5 text-lg leading-8 text-stone-700">
                {newsletter.summary}
              </p>
            ) : null}
          </header>

          <div className="mt-8 space-y-5 text-base leading-8 text-stone-700">
            {paragraphs(newsletter.body_markdown).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-10 divide-y divide-stone-300/70 border-y border-stone-300/70">
            {newsletter.sections.map((section) => (
              <section key={section.heading} className="py-7">
                <h2 className="text-3xl font-semibold text-stone-950">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4 text-base leading-8 text-stone-700">
                  {paragraphs(section.body).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {newsletter.cta_label && newsletter.cta_url ? (
            <div className="mt-8">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#C2A14E] px-5 text-sm font-semibold text-stone-950" href={newsletter.cta_url}>
                {newsletter.cta_label}
              </Link>
            </div>
          ) : null}

          <div className="mt-12 border-t border-stone-300/70 pt-6">
            <Link className="text-sm font-semibold text-[#7a5a12] underline-offset-4 hover:underline" href="/subscribe">
              Subscribe to updates
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
