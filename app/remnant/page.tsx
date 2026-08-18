import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PrimaryNav } from "@/components/PrimaryNav";
import { buildDomainSiteSocialImage } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";
import { getFeaturedRemnantVideo, getRemnantVideos, remnantCollection } from "@/src/lib/remnant/content";
import { RemnantVideoEmbed } from "./RemnantVideoEmbed";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const canonicalUrl = `${getCanonicalSiteUrl()}/remnant`;
const pageDescription = `${remnantCollection.tagline} A curated video resource from USA Missionaries centered on sermons and trusted biblical teaching.`;

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl,
  },
  description: pageDescription,
  openGraph: {
    description: pageDescription,
    images: [buildDomainSiteSocialImage(domainSites.usam)],
    siteName: domainSites.usam.siteName,
    title: `${remnantCollection.title} | USA Missionaries`,
    type: "website",
    url: canonicalUrl,
  },
  robots: {
    follow: false,
    index: false,
  },
  title: remnantCollection.title,
};

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.28em] text-usam-gold"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
      <span aria-hidden="true" className="h-px w-12 bg-usam-gold/50" />
    </p>
  );
}

function Section({
  children,
  id,
  variant = "plain",
}: {
  children: ReactNode;
  id?: string;
  variant?: "plain" | "panel" | "light";
}) {
  const backgrounds = {
    light: "bg-[#F5F3EE] text-[#141414]",
    panel: "border-y border-stone-900/80 bg-white/[0.015]",
    plain: "",
  } as const;

  return (
    <section className={`scroll-mt-24 px-6 py-16 md:py-24 ${backgrounds[variant]}`} id={id}>
      <div className="relative mx-auto max-w-5xl">{children}</div>
    </section>
  );
}

function CategoryChip({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center border border-usam-gold/35 bg-usam-gold/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-usam-gold"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </span>
  );
}

export default function RemnantPage() {
  const featured = getFeaturedRemnantVideo();
  const allVideos = getRemnantVideos();
  const remainingVideos = allVideos.filter((video) => video.id !== featured?.id);

  return (
    <>
      <PrimaryNav minimal />

      <section className="relative overflow-hidden border-b border-stone-900/80 px-6 pb-16 pt-20 md:pb-24 md:pt-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(194,161,78,0.1),transparent_32%)]" />
        <div className="relative mx-auto max-w-5xl">
          <Eyebrow>USA Missionaries</Eyebrow>
          <h1
            className="mt-8 text-[clamp(2.75rem,9vw,5rem)] font-bold uppercase leading-[0.94] text-stone-100"
            style={{ fontFamily: font.oswald }}
          >
            The <span className="text-usam-gold">Remnant</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-stone-300 md:text-xl md:leading-9">
            {remnantCollection.tagline}
          </p>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-400">
            A small, curated library of sermons and trusted biblical teaching aligned with wholehearted obedience to
            Jesus, discipleship, mission, prayer, reconciliation, compassion, and biblical formation.
          </p>
        </div>
      </section>

      {featured ? (
        <Section id="featured">
          <Eyebrow>Featured Message</Eyebrow>
          <h2
            className="mt-5 max-w-2xl text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-[1.1] text-stone-100"
            style={{ fontFamily: font.oswald }}
          >
            Start here.
          </h2>

          <div className="mt-10 grid gap-8 md:grid-cols-[1.15fr_1fr] md:items-start">
            <RemnantVideoEmbed video={featured} />

            <div className="md:pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryChip>{featured.category}</CategoryChip>
              </div>
              <h3 className="mt-4 text-2xl font-bold leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                {featured.speaker}
              </h3>
              {featured.ministry ? <p className="mt-1 text-sm text-stone-500">{featured.ministry}</p> : null}
              <p className="mt-5 text-base leading-7 text-stone-300">{featured.description}</p>
              <div className="mt-6 border-l-2 border-usam-gold/60 pl-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-usam-gold" style={{ fontFamily: font.rajdhani }}>
                  Why We Recommend It
                </p>
                <p className="mt-2 text-sm leading-7 text-stone-400">{featured.whyWeRecommendIt}</p>
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      {remainingVideos.length ? (
        <Section id="messages" variant="panel">
          <Eyebrow>Recommended Messages</Eyebrow>
          <h2
            className="mt-5 max-w-2xl text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-[1.1] text-stone-100"
            style={{ fontFamily: font.oswald }}
          >
            Keep listening.
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {remainingVideos.map((video) => (
              <article key={video.id}>
                <RemnantVideoEmbed video={video} />
                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryChip>{video.category}</CategoryChip>
                  </div>
                  <h3 className="mt-3 text-lg font-bold leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                    {video.speaker}
                  </h3>
                  {video.ministry ? <p className="mt-1 text-sm text-stone-500">{video.ministry}</p> : null}
                  <p className="mt-3 text-sm leading-6 text-stone-400">{video.description}</p>
                </div>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      <Section id="disclaimer" variant="light">
        <div className="max-w-2xl">
          <p
            className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#8C6D1F]"
            style={{ fontFamily: font.rajdhani }}
          >
            A Note On Recommendations
            <span aria-hidden="true" className="h-px w-12 bg-[#8C6D1F]/45" />
          </p>
          <p className="mt-6 text-base leading-8 text-[#4B4740]">{remnantCollection.disclaimer}</p>
          <p className="mt-4 text-base leading-8 text-[#4B4740]">
            Remnant is not a claim that USA Missionaries alone is faithfully following Jesus. It is a short, growing
            list of messages we have found genuinely helpful for wholehearted discipleship.
          </p>
        </div>
      </Section>
    </>
  );
}
