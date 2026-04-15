import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "../../components/PrimaryNav";
import { commandsMetrics, commandsRows } from "../mission/mockData";

export const metadata: Metadata = {
  title: "System Vision | USA Missionaries",
  description: "Vision page for future disciple-making infrastructure centered on accountability, continuity, and multiplication.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function ActionLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const className = variant === "primary"
    ? "bg-stone-100 text-stone-950 hover:bg-amber-200"
    : "border border-stone-600 text-stone-300 hover:border-stone-400 hover:text-stone-100";

  return (
    <Link
      href={href}
      className={`inline-block px-7 py-3 text-sm uppercase tracking-[0.2em] transition-all duration-300 ${className}`}
      style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
    >
      {children}
    </Link>
  );
}

export default function SystemPage() {
  const blocks = [
    ["Accountability", "Disciple making grows where truth is remembered, commitments are followed up, and people are lovingly called forward in obedience."],
    ["Continuity", "The work should not disappear into scattered notes, forgotten conversations, and isolated leaders. Healthy ministry needs shared memory and clear next steps."],
    ["Multiplication", "The goal is not more software. The goal is stronger disciple makers, clearer support, measurable fruit, and the ability to multiply the mission with integrity."],
  ];

  const breakdown = [
    "Scattered notes",
    "Forgotten follow-up",
    "Isolated leaders",
    "No shared visibility",
    "Difficulty measuring long-term fruit",
  ];

  const future = [
    "Visible",
    "Accountable",
    "Repeatable",
    "Measurable",
    "Scalable",
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" />

      <section className="relative overflow-hidden border-b border-stone-900/80 px-6 pb-24 pt-28 md:pb-32 md:pt-40">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[length:72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(212,160,84,0.05),transparent_20%),radial-gradient(ellipse_at_center,transparent_35%,#050505_100%)]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Accountability Infrastructure
          </p>
          <h1 className="mt-10 text-5xl md:text-7xl font-bold tracking-tight leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
            THE INFRASTRUCTURE
            <br />
            FOR ACCOUNTABLE
            <br />
            DISCIPLE MAKING
          </h1>
          <p className="mt-10 max-w-3xl text-base md:text-lg leading-8 text-stone-400">
            Disciple making is too important to remain invisible. The future requires a system that helps leaders strengthen accountability, preserve continuity, and support measurable spiritual fruit over time.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <ActionLink href="mailto:info@usamissionaries.org">Join the Waitlist</ActionLink>
            <ActionLink href="/system" variant="secondary">View the System</ActionLink>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {blocks.map(([title, body], index) => (
              <div key={title} className="border border-stone-800/60 bg-stone-950/50 p-7">
                <div className="tactical-amber-label text-xs tracking-[0.28em]" style={{ fontFamily: font.rajdhani }}>
                  0{index + 1}
                </div>
                <h2 className="mt-4 text-2xl text-stone-100" style={{ fontFamily: font.oswald }}>
                  {title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-stone-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Why This Matters
            </p>
            <h2 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
              DISCIPLE MAKING
              <br />
              DESERVES
              <br />
              ENDURANCE
            </h2>
          </div>
          <div className="space-y-6 text-base md:text-lg leading-8 text-stone-400">
            <p>
              Disciple making is one of the most important forms of long-term transformation. It shapes people over time, forms obedient lives, and creates the kind of fruit that can last beyond moments, events, and emotional response.
            </p>
            <p>
              Most ministry work is relational and decentralized, which makes it hard to track and hard to support. Accountability is what turns intent into obedience and conversations into lasting fruit.
            </p>
            <p>
              The opportunity is to build infrastructure that supports disciple making without replacing its human and spiritual nature. The point is not control. The point is clarity, continuity, and faithful support.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#080808] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Commands of Jesus Dashboard
            </p>
            <h2 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
              TRACKING
              <br />
              OBEDIENCE IN
              <br />
              MOTION
            </h2>
            <p className="mt-6 max-w-2xl text-base md:text-lg leading-8 text-stone-400">
              This prototype dashboard shows why accountability infrastructure matters. Even with local mock data today, it gives partners a concrete picture of how disciple-making progress can be remembered, supported, and advanced over time.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {commandsMetrics.map((metric) => (
              <div key={metric.label} className="border border-stone-800/60 bg-[#090909] p-6 md:p-7">
                <div className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  {metric.label}
                </div>
                <div className="mt-4 text-4xl md:text-5xl text-stone-100" style={{ fontFamily: font.oswald }}>
                  {metric.value}
                </div>
                <div className="mt-3 text-sm text-stone-500 leading-relaxed">{metric.note}</div>
              </div>
            ))}
          </div>

          <div className="relative mt-8 overflow-hidden border border-stone-800/70 bg-[#070707] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.016)_3px,rgba(255,255,255,0.016)_4px)]" />
            <div className="relative border-b border-stone-800/70 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                    Commands Track // Prototype View
                  </span>
                </div>
                <span className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  accountability in view
                </span>
              </div>
            </div>

            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead>
                  <tr className="border-b border-stone-800/60">
                    {["Name", "Current Command", "Status", "Last Activity", "Next Step"].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 tactical-label uppercase"
                        style={{ fontFamily: font.rajdhani }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {commandsRows.map((row) => (
                    <tr key={`${row.name}-${row.currentCommand}`} className="border-b border-stone-800/35 text-sm text-stone-300 last:border-b-0">
                      <td className="px-5 py-4 text-stone-100">{row.name}</td>
                      <td className="px-5 py-4">{row.currentCommand}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-sm px-2 py-1 text-[11px] uppercase tracking-[0.18em] ${
                            row.status === "Completed"
                              ? "bg-emerald-900/30 text-emerald-400"
                              : row.status === "New"
                                ? "bg-sky-900/30 text-sky-300"
                                : "bg-amber-900/30 text-amber-400"
                          }`}
                          style={{ fontFamily: font.rajdhani }}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-stone-400">{row.lastActivity}</td>
                      <td className="px-5 py-4 text-stone-400">{row.nextStep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#080808] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            The Problem Today
          </p>
          <h2 className="mt-5 max-w-4xl text-4xl md:text-5xl font-bold tracking-tight leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
            IMPORTANT WORK
            <br />
            IS HAPPENING
            <br />
            WITHOUT SHARED MEMORY
          </h2>
          <p className="mt-6 max-w-3xl text-base md:text-lg leading-8 text-stone-400">
            The current breakdown is not usually a lack of passion. It is a lack of continuity. Good ministry gets weakened when follow-up disappears, leaders stay isolated, and long-term fruit cannot be seen clearly enough to support.
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {breakdown.map((item, index) => (
              <div key={item} className="border border-stone-800/60 bg-stone-950/55 p-6">
                <div className="tactical-amber-label text-xs tracking-[0.28em]" style={{ fontFamily: font.rajdhani }}>
                  0{index + 1}
                </div>
                <p className="mt-4 text-base leading-7 text-stone-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              The Future System
            </p>
            <h2 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
              WHAT FUTURE
              <br />
              INFRASTRUCTURE
              <br />
              SHOULD MAKE POSSIBLE
            </h2>
            <p className="mt-6 max-w-2xl text-base md:text-lg leading-8 text-stone-400">
              The future system is meant to help disciple making become visible, accountable, repeatable, measurable, and scalable while staying rooted in prayer, presence, truth, and relationship.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {future.map((item, index) => (
              <div key={item} className="border border-stone-800/60 bg-stone-950/45 p-6">
                <div className="tactical-amber-label text-xs tracking-[0.28em]" style={{ fontFamily: font.rajdhani }}>
                  0{index + 1}
                </div>
                <h3 className="mt-4 text-xl text-stone-100" style={{ fontFamily: font.oswald }}>
                  {item}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#080808] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="border border-stone-800/60 bg-stone-950/50 p-8 md:p-10">
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Closing Thesis
            </p>
            <p className="mt-6 max-w-5xl text-3xl md:text-5xl leading-tight text-stone-100 whitespace-pre-line" style={{ fontFamily: font.oswald }}>
              {`The goal is not to replace prayer, presence, obedience, or relationship. The goal is to build the infrastructure that helps that work endure, multiply, and remain visible over time.

Therefore, we commit to preach the word, to be ready in season and out of season, to patiently endure hardship, to do the work of an evangelist, and to fully carry out the ministry entrusted to us. With eyes fixed on Christ, we aim, by God's grace, to fight the good fight, finish the race, and keep the faith.`}
            </p>
            <p className="tactical-label mt-8 uppercase" style={{ fontFamily: font.rajdhani }}>
              2 Timothy 4:2, 5, 7
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
