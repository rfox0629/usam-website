import { ArrowRight, ExternalLink } from "lucide-react";
import { PrimaryNav } from "@/components/PrimaryNav";
import { ecosystemItems, usamEcosystemUrl, usamNavHrefOverrides } from "@/src/lib/ecosystem";
import { domainSites, type DomainSiteConfig, type DomainSiteKey } from "@/src/lib/domain-sites";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type AlternateDomainSiteKey = Exclude<DomainSiteKey, "usam">;

const domainLandingContent = {
  "kitchen-table-gospel": {
    accent: "Kitchen Table Gospel",
    body: "Kitchen Table Gospel is a USA Missionaries initiative for sharing the gospel clearly around ordinary tables and inviting people into discipleship.",
    ctaHref: "/guides/kitchen-table-gospel.pdf",
    ctaLabel: "Open The Guide",
    imageAlt: "A Kitchen Table Gospel gathering around a table.",
    imagePath: "/images/vision/kitchen-table-01.jpg",
    label: "USA Missionaries Initiative",
    title: "The gospel, clear enough for the table.",
  },
  "discipleship-operating-system": {
    accent: "DOS",
    body: "Discipleship Operating System is a USA Missionaries product and initiative for follow up, prayer, tables, and approved fruit.",
    ctaHref: usamEcosystemUrl,
    ctaLabel: "View The Ecosystem",
    imageAlt: "Discipleship Operating System meeting screen.",
    imagePath: "/images/vision/dos-meetings.jpg",
    label: "USA Missionaries Product/Initiative",
    title: "Follow up, prayer, and discipleship in one operating rhythm.",
  },
} as const satisfies Record<
  AlternateDomainSiteKey,
  {
    accent: string;
    body: string;
    ctaHref: string;
    ctaLabel: string;
    imageAlt: string;
    imagePath: string;
    label: string;
    title: string;
  }
>;

function getDomainLandingContent(site: DomainSiteConfig) {
  return site.key === "usam" ? null : domainLandingContent[site.key];
}

export function DomainSiteLandingPage({ site }: { site: DomainSiteConfig }) {
  const content = getDomainLandingContent(site);
  const relatedItems = ecosystemItems.filter((item) => item.title !== site.siteName);

  if (!content) {
    return null;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0D0D0D] text-stone-100">
      <PrimaryNav
        active="ecosystem"
        brandHref={domainSites.usam.canonicalOrigin}
        hrefOverrides={usamNavHrefOverrides}
      />

      <section className="relative overflow-hidden border-b border-stone-900/80 px-6 pb-14 pt-28 md:pb-20 md:pt-36">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[length:72px_72px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(13,13,13,0.96)_88%)]" />

        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="max-w-3xl">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.28em] text-usam-gold/85"
              style={{ fontFamily: font.rajdhani }}
            >
              {content.label}
            </p>
            <h1
              className="mt-6 text-[clamp(2.55rem,10vw,5.5rem)] font-bold uppercase leading-[0.9] tracking-tight text-stone-100"
              style={{ fontFamily: font.oswald }}
            >
              {site.siteName}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-stone-300 md:text-lg">{content.body}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                className="inline-flex min-h-11 w-full max-w-full items-center justify-center gap-2 border border-usam-gold bg-usam-gold px-4 text-center text-xs font-bold uppercase leading-5 tracking-[0.14em] text-usam-black transition-colors hover:bg-[#d6b85f] sm:w-auto sm:px-5 sm:tracking-[0.18em]"
                href={content.ctaHref}
                style={{ fontFamily: font.rajdhani }}
              >
                {content.ctaLabel}
                <ExternalLink className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
              </a>
              <a
                className="inline-flex min-h-11 w-full max-w-full items-center justify-center gap-2 border border-stone-700 bg-black/45 px-4 text-center text-xs font-bold uppercase leading-5 tracking-[0.14em] text-stone-100 transition-colors hover:border-usam-gold hover:text-usam-gold sm:w-auto sm:px-5 sm:tracking-[0.18em]"
                href={usamEcosystemUrl}
                style={{ fontFamily: font.rajdhani }}
              >
                USA Missionaries Ecosystem
                <ArrowRight className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
              </a>
            </div>
          </div>

          <div className="overflow-hidden border border-stone-800/80 bg-black/55 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
            <img alt={content.imageAlt} className="aspect-[4/3] w-full object-cover" src={content.imagePath} />
            <div className="border-t border-stone-800/80 p-5">
              <p
                className="text-[10px] uppercase tracking-[0.22em] text-stone-500"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              >
                Connected to USA Missionaries
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Dedicated domain. Shared ecosystem. Clear path back to USA Missionaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.28em] text-usam-gold/85"
                style={{ fontFamily: font.rajdhani }}
              >
                In The Ecosystem
              </p>
              <h2
                className="mt-4 text-3xl font-bold uppercase leading-none text-stone-100 md:text-4xl"
                style={{ fontFamily: font.oswald }}
              >
                Related paths
              </h2>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {relatedItems.map((item) => (
              <a
                className="group block border border-stone-800/80 bg-black/55 p-5 transition-colors hover:border-usam-gold/70"
                href={item.href}
                key={item.title}
              >
                <span
                  className="text-[10px] uppercase leading-4 tracking-[0.12em] text-usam-gold sm:tracking-[0.2em]"
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  {item.label}
                </span>
                <h3
                  className="mt-3 text-2xl font-bold uppercase leading-tight text-stone-100"
                  style={{ fontFamily: font.oswald }}
                >
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{item.body}</p>
                <span
                  className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone-400 transition-colors group-hover:text-usam-gold"
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  Open
                  <ArrowRight className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
