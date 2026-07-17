import type { DomainSiteConfig } from "@/src/lib/domain-sites";

export function DomainHoldingPage({
  eyebrow = "Public site",
  site,
  status = "Coming soon",
}: {
  eyebrow?: string;
  site: DomainSiteConfig;
  status?: string;
}) {
  return (
    <main className="flex min-h-screen items-center bg-[#0D0D0D] px-6 py-20 text-stone-100">
      <section className="mx-auto w-full max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#C2A14E]">
          {eyebrow}
        </p>
        <h1 className="mt-5 text-5xl font-bold uppercase leading-none text-stone-100 sm:text-6xl md:text-7xl">
          {site.siteName}
        </h1>
        <div className="mx-auto mt-8 h-px w-14 bg-[#C2A14E]/50" />
        <p className="mx-auto mt-8 max-w-xl text-base leading-7 text-stone-400 sm:text-lg">
          {status}
        </p>
      </section>
    </main>
  );
}
