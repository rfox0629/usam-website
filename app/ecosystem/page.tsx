import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { PrimaryNav } from "../../components/PrimaryNav";
import { ecosystemItems, type EcosystemItem } from "@/src/lib/ecosystem";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const pageUrl = `${getCanonicalSiteUrl()}/ecosystem`;
const shareImage = "/images/usam/default-hero-background.png";

export const metadata: Metadata = {
  alternates: {
    canonical: pageUrl,
  },
  description: "The USA Missionaries ecosystem connects Kitchen Table Gospel, DOS, and strategic ministry partners.",
  openGraph: {
    description: "The USA Missionaries ecosystem connects Kitchen Table Gospel, DOS, and strategic ministry partners.",
    images: [
      {
        alt: "USA Missionaries ecosystem",
        height: 916,
        url: shareImage,
        width: 1718,
      },
    ],
    siteName: "USA Missionaries",
    title: "Ecosystem | USA Missionaries",
    type: "website",
    url: pageUrl,
  },
  title: "Ecosystem | USA Missionaries",
  twitter: {
    card: "summary_large_image",
    description: "The USA Missionaries ecosystem connects Kitchen Table Gospel, DOS, and strategic ministry partners.",
    images: [shareImage],
    title: "Ecosystem | USA Missionaries",
  },
};

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-[0.28em] text-usam-gold/85"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </p>
  );
}

function EcosystemCard({ item, index }: { item: EcosystemItem; index: number }) {
  const isMor = item.title.includes("MOR");

  return (
    <article className="grid overflow-hidden border border-stone-800/80 bg-black/55 md:grid-cols-[0.72fr_1fr]">
      <div className="relative min-h-[220px] border-b border-stone-800/80 bg-stone-950 md:min-h-full md:border-b-0 md:border-r">
        <img
          alt={item.imageAlt}
          className={`${isMor ? "object-contain p-10 opacity-70" : "object-cover"} h-full w-full`}
          src={item.imagePath}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.52))]" />
        <span
          className="absolute left-4 top-4 border border-white/15 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-300"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          0{index + 1}
        </span>
      </div>

      <div className="flex min-w-0 flex-col justify-between p-6 md:p-8">
        <div>
          <div className="flex flex-wrap gap-2">
            <span
              className="max-w-full break-words border border-usam-gold/25 bg-usam-gold/10 px-3 py-1 text-[10px] uppercase leading-4 tracking-[0.12em] text-usam-gold sm:tracking-[0.2em]"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              {item.label}
            </span>
            {item.relationship ? (
              <span
                className="max-w-full break-words border border-stone-700 bg-stone-950 px-3 py-1 text-[10px] uppercase leading-4 tracking-[0.12em] text-stone-300 sm:tracking-[0.18em]"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              >
                {item.relationship}
              </span>
            ) : null}
          </div>

          <h2
            className="mt-5 text-3xl font-bold uppercase leading-none text-stone-100 md:text-4xl"
            style={{ fontFamily: font.oswald }}
          >
            {item.title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 md:text-base">{item.body}</p>
        </div>

        <div className="mt-7">
          <a
            aria-label={`${item.ctaLabel}: ${item.href}`}
            className="inline-flex min-h-11 w-full max-w-full items-center justify-center gap-2 border border-usam-gold bg-usam-gold px-4 text-center text-xs font-bold uppercase leading-5 tracking-[0.14em] text-usam-black transition-colors hover:bg-[#d6b85f] sm:w-auto sm:px-5 sm:tracking-[0.18em]"
            href={item.href}
            style={{ fontFamily: font.rajdhani }}
          >
            {item.ctaLabel}
            <ExternalLink className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function EcosystemPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="ecosystem" />

      <section className="relative overflow-hidden border-b border-stone-900/80 px-6 pb-14 pt-28 md:pb-20 md:pt-36">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[length:72px_72px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(13,13,13,0.94)_86%)]" />

        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div className="max-w-3xl">
            <Eyebrow>USA Missionaries Ecosystem</Eyebrow>
            <h1
              className="mt-6 text-[clamp(2.55rem,11vw,5.75rem)] font-bold uppercase leading-[0.9] tracking-tight text-stone-100"
              style={{ fontFamily: font.oswald }}
            >
              <span className="sm:hidden">
                One mission.
                <br />
                Connected
                <br />
                expressions.
              </span>
              <span className="hidden sm:inline">
                One mission.
                <br />
                Connected expressions.
              </span>
            </h1>
          </div>
          <div className="max-w-2xl lg:pb-2">
            <p className="text-base leading-8 text-stone-300 md:text-lg">
              USA Missionaries is building and connecting public initiatives that help people move from gospel encounter to discipleship, follow up, prayer, and multiplication.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Kitchen Table Gospel", "DOS", "Strategic Partners"].map((label) => (
                <span
                  className="border border-stone-800 bg-black/55 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-stone-300"
                  key={label}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-5">
          {ecosystemItems.map((item, index) => (
            <EcosystemCard index={index} item={item} key={item.title} />
          ))}
        </div>
      </section>

      <section className="border-t border-stone-900/80 px-6 py-12 md:py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <Eyebrow>Domain Homes</Eyebrow>
            <p className="mt-4 text-base leading-8 text-stone-300 md:text-lg">
              kitchentablegospel.org and discipleshipoperatingsystem.com are the primary public homes for those USA Missionaries initiatives. MOR links to its independent website as a strategic partner.
            </p>
          </div>
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-stone-700 bg-black/45 px-5 text-xs font-bold uppercase tracking-[0.18em] text-stone-100 transition-colors hover:border-usam-gold hover:text-usam-gold"
            href="/"
            style={{ fontFamily: font.rajdhani }}
          >
            USA Missionaries
            <ArrowRight className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
          </a>
        </div>
      </section>
    </main>
  );
}
