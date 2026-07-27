import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrimaryNav } from "@/components/PrimaryNav";
import { formatCommunicationDate, loadPublishedNewsletterBySlug } from "@/src/lib/communications/newsletter";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";

export const dynamic = "force-dynamic";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function paragraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function safeUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPublishedNewsletterBySlug(slug);

  if (!result.publication) {
    return {
      title: "Newsletter | USA Missionaries",
    };
  }

  const url = `${getCanonicalSiteUrl()}/newsletter/${result.publication.slug}`;

  return {
    alternates: {
      canonical: url,
    },
    description: result.publication.preview_text ?? result.publication.intro_text ?? undefined,
    openGraph: {
      description: result.publication.preview_text ?? result.publication.intro_text ?? undefined,
      siteName: "USA Missionaries",
      title: result.publication.title,
      type: "article",
      url,
    },
    title: `${result.publication.title} | USA Missionaries`,
  };
}

export default async function NewsletterIssuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await loadPublishedNewsletterBySlug(slug);

  if (result.error || !result.publication) {
    notFound();
  }

  const publication = result.publication;
  const ctaUrl = safeUrl(publication.cta_url);
  const heroUrl = safeUrl(publication.hero_image_url);

  return (
    <main className="min-h-screen bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="support" />

      <article>
        <header className="bg-[#0D0D0D] px-6 pb-12 pt-24 md:pt-28">
          <div className="mx-auto max-w-3xl">
            <Link className="text-sm font-semibold text-[#C2A14E] hover:text-stone-100" href="/newsletter">
              Newsletter Archive
            </Link>
            <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-[#C2A14E]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {formatCommunicationDate(publication.published_at)}
            </p>
            <h1 className="mt-4 text-5xl font-bold leading-none tracking-normal text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
              {publication.title}
            </h1>
            {publication.preview_text ? (
              <p className="mt-6 text-base leading-8 text-stone-300 md:text-lg">
                {publication.preview_text}
              </p>
            ) : null}
          </div>
        </header>

        <section className="bg-stone-50 px-6 py-12 text-stone-950 md:py-16">
          <div className="mx-auto max-w-3xl border border-stone-200 bg-white p-5 shadow-[0_24px_80px_rgba(13,13,13,0.08)] md:p-8">
            {heroUrl ? (
              <img alt="" className="mb-7 aspect-[16/9] w-full object-cover" src={heroUrl} />
            ) : null}

            {publication.intro_text ? (
              <p className="text-lg leading-8 text-stone-800 md:text-xl md:leading-9">
                {publication.intro_text}
              </p>
            ) : null}

            <div className="mt-7 space-y-5 text-base leading-8 text-stone-700">
              {paragraphs(publication.body_text).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {ctaUrl && publication.cta_label ? (
              <Link
                className="mt-8 inline-flex min-h-12 items-center justify-center bg-[#C2A14E] px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#DAB95C]"
                href={ctaUrl}
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              >
                {publication.cta_label}
              </Link>
            ) : null}
          </div>
        </section>
      </article>
    </main>
  );
}
