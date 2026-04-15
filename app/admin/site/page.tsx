import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "../../../components/PrimaryNav";

export const metadata: Metadata = {
  title: "Site Admin | USA Missionaries",
  description: "Internal admin control page for site routes, CTAs, and metrics source.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const routes = [
  { label: "Home", route: "/" },
  { label: "Briefing", route: "/mission" },
  { label: "DOS", route: "/system" },
  { label: "Prayer", route: "/prayer" },
  { label: "Support", route: "/support" },
] as const;

const ctas = [
  { label: "Enter the Mission", route: "/mission" },
  { label: "Access Briefing", route: "/mission" },
  { label: "Join Prayer Team", route: "/prayer" },
  { label: "View System", route: "/system" },
  { label: "Join the Mission", route: "/mission" },
  { label: "Give Now", route: "/support" },
] as const;

function ActionLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-block px-5 py-3 text-sm uppercase tracking-[0.2em] transition-all duration-300 bg-stone-100 text-stone-950 hover:bg-amber-200"
      style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
    >
      {children}
    </Link>
  );
}

export default function SiteAdminPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="mission" />

      <section className="relative overflow-hidden px-6 pb-24 pt-24 md:pb-32 md:pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(212,160,84,0.08),transparent_24%),radial-gradient(ellipse_at_center,transparent_34%,#050505_100%)]" />

        <div className="relative mx-auto max-w-6xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Internal Site Admin
          </p>
          <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
            SITE
            <br />
            CONTROL
          </h1>
          <p className="mt-8 max-w-3xl text-base md:text-lg leading-8 text-stone-400">
            This internal page gives a simple control-layer view of the current public routes, static CTA destinations, and the current metrics source used by the site.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24 md:pb-32">
        <div className="mx-auto max-w-6xl space-y-16">
          <div>
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Route Navigator
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {routes.map((item) => (
                <div key={item.route} className="border border-stone-800/60 bg-stone-950/55 p-6 md:p-7">
                  <div className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                    {item.label}
                  </div>
                  <div className="mt-4 text-2xl text-stone-100" style={{ fontFamily: font.oswald }}>
                    {item.route}
                  </div>
                  <div className="mt-6">
                    <ActionLink href={item.route}>Open Link</ActionLink>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              CTA Manager
            </p>
            <div className="mt-8 overflow-hidden border border-stone-800/70 bg-[#070707]">
              <div className="grid border-b border-stone-800/60 md:grid-cols-[1.3fr_1fr]">
                {["CTA Label", "Current Route"].map((heading) => (
                  <div
                    key={heading}
                    className="px-5 py-4 tactical-label uppercase"
                    style={{ fontFamily: font.rajdhani }}
                  >
                    {heading}
                  </div>
                ))}
              </div>
              {ctas.map((item) => (
                <div key={item.label} className="grid border-b border-stone-800/35 last:border-b-0 md:grid-cols-[1.3fr_1fr]">
                  <div className="px-5 py-4 text-stone-200">{item.label}</div>
                  <div className="px-5 py-4 text-stone-400">{item.route}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Metrics Source Panel
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="border border-stone-800/60 bg-stone-950/55 p-6 md:p-7">
                <div className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  Current Source
                </div>
                <div className="mt-4 text-3xl text-stone-100" style={{ fontFamily: font.oswald }}>
                  Local JSON
                </div>
              </div>
              <div className="border border-stone-800/60 bg-stone-950/55 p-6 md:p-7">
                <div className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  Last Updated
                </div>
                <div className="mt-4 text-3xl text-stone-100" style={{ fontFamily: font.oswald }}>
                  April 14, 2026
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
