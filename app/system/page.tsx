import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "DOS Platform | USA Missionaries",
  description: "The operating system for discipleship at scale.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs tracking-[0.35em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
      {children}
    </p>
  );
}

function SectionTitle({
  overline,
  title,
  description,
}: {
  overline: string;
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      <Eyebrow>{overline}</Eyebrow>
      <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
        {title}
      </h2>
      <div className="mt-5 max-w-2xl text-base leading-relaxed text-stone-400 md:text-lg">{description}</div>
    </div>
  );
}

function ActionLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "tertiary";
}) {
  const className = variant === "primary"
    ? "bg-stone-100 text-stone-950 hover:bg-amber-200"
    : variant === "secondary"
      ? "border border-stone-600 text-stone-300 hover:border-stone-400 hover:text-stone-100"
      : "text-stone-500 hover:text-stone-300";

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

function MetricStrip() {
  const metrics = [
    ["Cities Visible", "38"],
    ["Operators Active", "147"],
    ["Disciple Paths", "412"],
  ];

  return (
    <div className="mt-10 grid gap-px bg-stone-800/50 sm:grid-cols-3">
      {metrics.map(([label, value]) => (
        <div key={label} className="border border-stone-800/60 bg-stone-950/60 px-5 py-5">
          <div className="text-3xl text-stone-100" style={{ fontFamily: font.oswald }}>{value}</div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.3em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

function IntelligencePanel() {
  const rows = [
    { city: "Austin, TX", leaders: 12, active: 36, signal: "High" },
    { city: "Denver, CO", leaders: 8, active: 21, signal: "Rising" },
    { city: "Portland, OR", leaders: 4, active: 7, signal: "Emerging" },
    { city: "Nashville, TN", leaders: 10, active: 29, signal: "High" },
  ];

  return (
    <div>
      <Eyebrow>LIVE MOVEMENT INTELLIGENCE</Eyebrow>
      <p className="mt-4 max-w-lg text-sm leading-7 text-stone-400 md:text-base">
        For the first time, leaders can see where momentum is building, who is actively discipling, and which cities are growing.
      </p>

      <div className="relative mt-8 overflow-hidden rounded-sm border border-stone-800/80 bg-[#060606] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.018)_3px,rgba(255,255,255,0.018)_4px)]" />
        <div className="relative border-b border-stone-800/80 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs tracking-[0.32em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
                DOS // MOVEMENT SIGNAL
              </span>
            </div>
            <span className="text-[11px] uppercase tracking-[0.24em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
              live field view
            </span>
          </div>
        </div>

        <div className="relative grid border-b border-stone-800/50 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          {["City", "Leaders", "Active Paths", "Signal"].map((label) => (
            <div
              key={label}
              className="border-b border-stone-800/40 px-5 py-3 text-[11px] uppercase tracking-[0.28em] text-stone-600 md:border-b-0 md:border-r md:border-stone-800/40"
              style={{ fontFamily: font.rajdhani }}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="relative">
          {rows.map((row) => (
            <div key={row.city} className="grid border-b border-stone-800/30 last:border-b-0 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
              <div className="px-5 py-4 text-sm text-stone-300">{row.city}</div>
              <div className="px-5 py-4 font-mono text-sm text-stone-400">{row.leaders}</div>
              <div className="px-5 py-4 font-mono text-sm text-stone-400">{row.active}</div>
              <div className="px-5 py-4">
                <span
                  className={`inline-flex rounded-sm px-2 py-1 text-xs ${
                    row.signal === "Emerging"
                      ? "bg-amber-900/30 text-amber-400"
                      : row.signal === "Rising"
                        ? "bg-sky-900/30 text-sky-300"
                        : "bg-emerald-900/30 text-emerald-400"
                  }`}
                  style={{ fontFamily: font.rajdhani }}
                >
                  {row.signal}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="relative grid gap-px border-t border-stone-800/60 bg-stone-900/50 md:grid-cols-3">
          {[
            ["3.4x", "Avg. City Growth Signal"],
            ["72%", "Operators in Active Rhythm"],
            ["24h", "From Activity to Visibility"],
          ].map(([value, label]) => (
            <div key={label} className="bg-[#060606] px-5 py-5">
              <div className="text-3xl text-stone-100" style={{ fontFamily: font.oswald }}>{value}</div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.3em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProblemList() {
  const items = [
    "Millions of believers are not actively discipling anyone",
    "Conversations happen, but there is no system to capture or multiply them",
    "Churches cannot see what is actually happening outside Sunday gatherings",
    "No real infrastructure exists to track spiritual outcomes in real time",
  ];

  return (
    <div className="grid gap-px bg-stone-800/30 md:grid-cols-2">
      {items.map((item, index) => (
        <div key={item} className="border border-stone-800/60 bg-stone-950/50 p-6 md:p-7">
          <div className="text-xs tracking-[0.32em] text-amber-600/70" style={{ fontFamily: font.rajdhani }}>
            0{index + 1}
          </div>
          <p className="mt-4 text-base leading-7 text-stone-300">{item}</p>
        </div>
      ))}
    </div>
  );
}

function PossibilityCard({
  number,
  title,
  body,
  note,
}: {
  number: string;
  title: string;
  body: string;
  note: string;
}) {
  return (
    <div className="border border-stone-800/60 bg-stone-950/60 p-7">
      <div className="text-xs tracking-[0.32em] text-amber-600/70" style={{ fontFamily: font.rajdhani }}>
        {number}
      </div>
      <h3 className="mt-4 text-3xl text-stone-100" style={{ fontFamily: font.oswald }}>
        {title}
      </h3>
      <p className="mt-4 text-sm leading-7 text-stone-300">{body}</p>
      <div className="mt-6 border-t border-stone-800/60 pt-4 text-sm leading-7 text-stone-500">{note}</div>
    </div>
  );
}

function StrategicBlock({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="border border-stone-800/60 bg-stone-950/40 p-6">
      <div className="text-xs tracking-[0.3em] text-amber-600/70" style={{ fontFamily: font.rajdhani }}>
        {number}
      </div>
      <h3 className="mt-4 text-xl text-stone-100" style={{ fontFamily: font.oswald }}>
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-stone-400">{body}</p>
    </div>
  );
}

export default function SystemPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <nav className="sticky top-0 z-50 border-b border-stone-800/40 bg-[rgba(5,5,5,0.88)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rotate-45 bg-amber-500/70" />
            <span className="text-sm tracking-[0.35em] text-stone-300" style={{ fontFamily: font.oswald }}>
              USA MISSIONARIES
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {[
              { label: "Mission", href: "/" },
              { label: "Movement", href: "/" },
              { label: "System", href: "/system" },
              { label: "Deploy", href: "/" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`text-xs uppercase tracking-[0.2em] transition-colors ${item.label === "System" ? "text-stone-200" : "text-stone-500 hover:text-stone-200"}`}
                style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-6 pb-24 pt-24 md:pb-32 md:pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(212,160,84,0.09),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.03),transparent_22%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#050505_100%)]" />

        <div className="relative mx-auto grid max-w-7xl items-start gap-16 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <Eyebrow>DEPLOYMENT OPERATING SYSTEM</Eyebrow>
            <h1 className="mt-6 text-5xl font-bold leading-none tracking-tight text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
              THE OPERATING
              <br />
              SYSTEM FOR
              <br />
              DISCIPLESHIP
              <br />
              AT SCALE
            </h1>

            <div className="mt-8 max-w-2xl space-y-5 text-base leading-8 text-stone-300 md:text-lg">
              <p>
                The Church does not have a discipleship problem.
                <br />
                It has an infrastructure problem.
              </p>
              <p className="text-stone-400">
                Millions of conversations are happening every day, but they are untracked, unsupported, and disappear. DOS turns scattered obedience into coordinated movement by giving leaders visibility, operators structure, and the mission momentum.
              </p>
            </div>

            <p className="mt-8 max-w-2xl border-l border-amber-500/30 pl-5 text-sm uppercase tracking-[0.18em] text-stone-500 md:text-[13px]" style={{ fontFamily: font.rajdhani }}>
              Built to activate and track millions of disciple making interactions across cities, churches, and networks.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <ActionLink href="#brief">View Investor Brief</ActionLink>
              <ActionLink href="#build" variant="secondary">Join the Build</ActionLink>
              <ActionLink href="/" variant="tertiary">Back to Mission</ActionLink>
            </div>

            <MetricStrip />
          </div>

          <IntelligencePanel />
        </div>
      </section>

      <section className="px-6 py-24 md:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            overline="THE INVISIBLE BREAKDOWN"
            title={<>THE MISSION IS ACTIVE.<br />THE SYSTEM IS MISSING.</>}
            description={
              <>
                DOS exists because the Church has no modern infrastructure for field-level discipleship. Ministry activity is happening everywhere, but it remains fragmented, invisible, and almost impossible to multiply with confidence.
              </>
            }
          />

          <div className="mt-14">
            <ProblemList />
          </div>

          <div className="mt-8 border-t border-stone-800/60 pt-8 text-xl leading-8 text-stone-200 md:text-2xl" style={{ fontFamily: font.oswald }}>
            The result is a fragmented and invisible mission with no feedback loop.
          </div>
        </div>
      </section>

      <section id="brief" className="bg-[#080808] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            overline="WHAT DOS MAKES POSSIBLE"
            title={<>FROM SCATTERED ACTIVITY<br />TO REPEATABLE MOVEMENT</>}
            description={
              <>
                DOS creates a shared operating layer for disciple making work. It does not replace obedience in the field. It gives that obedience structure, continuity, and the ability to scale across cities and networks.
              </>
            }
          />

          <div className="mt-14 grid gap-px bg-stone-800/30 md:grid-cols-3">
            <PossibilityCard
              number="01"
              title="MEET"
              body="Capture every person, every conversation, and every relationship."
              note="Turn scattered contacts into a mapped mission field."
            />
            <PossibilityCard
              number="02"
              title="MINISTER"
              body="Log real spiritual outcomes in seconds."
              note="Track discipleship progress, breakthroughs, and next steps with repeatable workflows."
            />
            <PossibilityCard
              number="03"
              title="MULTIPLY"
              body="Identify who is ready to lead."
              note="Turn disciples into disciple makers and expand from individuals to teams, cities, and networks."
            />
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.92fr_1.08fr]">
          <SectionTitle
            overline="WHY THIS WILL BECOME THE STANDARD"
            title={<>INFRASTRUCTURE ALWAYS<br />DEFINES THE NEXT PHASE</>}
            description={
              <>
                The movements that scale are the movements that can see, support, and strengthen what is actually happening. DOS is positioned to become the standard layer because it is designed around the field, not around institutional reporting.
              </>
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <StrategicBlock
              number="01"
              title="Built for real life"
              body="Designed for homes, coffee shops, small groups, and field ministry, not just church administration."
            />
            <StrategicBlock
              number="02"
              title="Creates visibility"
              body="What was invisible becomes measurable, actionable, and coachable."
            />
            <StrategicBlock
              number="03"
              title="Compounds over time"
              body="Every interaction strengthens the system and creates institutional memory."
            />
            <StrategicBlock
              number="04"
              title="Bridges ecosystems"
              body="Can support churches, ministries, missionary teams, and independent operators on shared infrastructure."
            />
            <StrategicBlock
              number="05"
              title="Unlocks better funding"
              body="Real time impact data helps donors and leaders see where fruit is actually happening."
            />
          </div>
        </div>
      </section>

      <section className="bg-[#080808] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="border border-stone-800/60 bg-stone-950/40 p-8 md:p-10">
            <Eyebrow>STRATEGIC THESIS</Eyebrow>
            <p className="mt-5 max-w-4xl text-2xl leading-tight text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
              If modern platforms can track every transaction, DOS can track every act of obedience.
            </p>
          </div>
        </div>
      </section>

      <section id="build" className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            overline="THE END STATE"
            title={<>A SHARED INFRASTRUCTURE<br />FOR THE GREAT COMMISSION</>}
            description={
              <>
                DOS is designed for a future where disciple making is visible at movement scale. The long-term opportunity is not a better ministry dashboard. It is a system-wide operating layer for mission intelligence, deployment, and measurable multiplication.
              </>
            }
          />

          <div className="mt-14 grid gap-px bg-stone-800/30 md:grid-cols-2 lg:grid-cols-5">
            {[
              "Millions of disciple making conversations tracked annually",
              "Cities mapped by spiritual activity and momentum",
              "Leaders equipped with real time field visibility",
              "Donors connected to measurable outcomes",
              "A unified infrastructure layer for the Great Commission",
            ].map((item, index) => (
              <div key={item} className="border border-stone-800/60 bg-stone-950/50 p-6">
                <div className="text-xs tracking-[0.3em] text-amber-600/70" style={{ fontFamily: font.rajdhani }}>
                  0{index + 1}
                </div>
                <p className="mt-4 text-base leading-7 text-stone-300">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 max-w-4xl">
            <p className="text-3xl leading-tight text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
              DOS is not another ministry tool.
              <br />
              It is the system the mission has been missing.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
