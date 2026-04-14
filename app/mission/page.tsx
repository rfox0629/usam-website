import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mission | USA Missionaries",
  description: "The mission page for USA Missionaries: mandate, posture, field rhythm, and deployment path.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function NavLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-xs uppercase tracking-[0.2em] transition-colors ${
        active ? "text-stone-200" : "text-stone-500 hover:text-stone-200"
      }`}
      style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
    >
      {label}
    </Link>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-[10px] uppercase tracking-[0.34em] text-amber-500/70"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </span>
  );
}

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

function SectionTitle({
  overline,
  title,
  description,
  align = "left",
}: {
  overline: string;
  title: React.ReactNode;
  description: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <p className="mb-4 text-xs tracking-[0.35em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
        {overline}
      </p>
      <h2 className="text-3xl font-bold leading-tight tracking-tight text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
        {title}
      </h2>
      <div className="mt-5 text-base leading-relaxed text-stone-400 md:text-lg">{description}</div>
    </div>
  );
}

function TacticalMap() {
  const routes = [
    { from: [232, 258], to: [418, 210] },
    { from: [232, 258], to: [508, 270] },
    { from: [232, 258], to: [628, 222] },
    { from: [232, 258], to: [702, 322] },
  ];
  const nodes = [
    [232, 258],
    [418, 210],
    [508, 270],
    [628, 222],
    [702, 322],
    [594, 362],
    [342, 352],
  ];

  return (
    <div className="relative overflow-hidden rounded-sm border border-stone-800/70 bg-[#060606]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:72px_72px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_34%,rgba(212,160,84,0.13),transparent_24%)]" />
      <div className="absolute left-5 top-5 z-10 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <span className="text-[10px] uppercase tracking-[0.34em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
          Mission Theater
        </span>
      </div>
      <svg viewBox="0 0 920 540" className="relative z-0 h-auto w-full">
        <defs>
          <radialGradient id="originGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d4a054" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#d4a054" stopOpacity={0} />
          </radialGradient>
        </defs>
        <image
          href="/usa-outline-clean.png"
          x="66"
          y="34"
          width="790"
          height="454"
          preserveAspectRatio="xMidYMid meet"
          opacity="0.22"
        />
        <circle cx="232" cy="258" r="112" fill="url(#originGlow)" />
        {routes.map((route, index) => (
          <line
            key={`${route.from.join("-")}-${route.to.join("-")}`}
            x1={route.from[0]}
            y1={route.from[1]}
            x2={route.to[0]}
            y2={route.to[1]}
            stroke="#d4a054"
            strokeWidth="1.2"
            opacity="0.24"
            strokeDasharray="6 8"
          >
            <animate attributeName="stroke-dashoffset" values="0;-28" dur={`${3 + index * 0.4}s`} repeatCount="indefinite" />
          </line>
        ))}
        {nodes.map(([x, y], index) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="4" fill="#d4a054" opacity="0.8">
              <animate attributeName="opacity" values="0.45;1;0.45" dur={`${2.2 + index * 0.25}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={x} cy={y} r="12" fill="none" stroke="#d4a054" strokeWidth="0.7" opacity="0.24">
              <animate attributeName="r" values="8;18;8" dur={`${2.6 + index * 0.3}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.24;0;0.24" dur={`${2.6 + index * 0.3}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
        <rect x="28" y="28" width="864" height="484" fill="none" stroke="#1b1b1b" strokeWidth="1" />
      </svg>
    </div>
  );
}

function MetricsDashboard() {
  const metrics = [
    { label: "Active Cities", value: "27", note: "+4 this quarter" },
    { label: "Live Tables", value: "118", note: "14 launch-ready" },
    { label: "Operators", value: "43", note: "9 in training" },
  ];

  const rows = [
    { operator: "OPR-0042", city: "Austin, TX", status: "Active", tables: 12, pulse: "Stable" },
    { operator: "OPR-0117", city: "Denver, CO", status: "Active", tables: 8, pulse: "Growing" },
    { operator: "OPR-0203", city: "Portland, OR", status: "Deploying", tables: 3, pulse: "Seeding" },
    { operator: "OPR-0089", city: "Nashville, TN", status: "Active", tables: 10, pulse: "Healthy" },
    { operator: "OPR-0314", city: "Tampa, FL", status: "Deploying", tables: 2, pulse: "Forming" },
  ];

  return (
    <div className="relative overflow-hidden rounded-sm border border-stone-800/80 bg-[#040404] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[length:64px_64px]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.018)_2px,rgba(255,255,255,0.018)_4px)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(212,160,84,0.12),transparent_22%)]" />

      <div className="relative border-b border-stone-800/80 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
            <span className="text-xs tracking-[0.34em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
              DOS // ACCESS BRIEFING // METRICS DASHBOARD
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-[0.28em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
            v1.0 mission-live
          </span>
        </div>
      </div>

      <div className="relative grid gap-0 border-b border-stone-800/60 md:grid-cols-3">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={`px-5 py-5 ${index < metrics.length - 1 ? "md:border-r md:border-stone-800/60" : ""}`}
          >
            <div className="text-[10px] uppercase tracking-[0.34em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
              {metric.label}
            </div>
            <div className="mt-3 text-4xl leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
              {metric.value}
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-[0.24em] text-amber-500/70" style={{ fontFamily: font.rajdhani }}>
              {metric.note}
            </div>
          </div>
        ))}
      </div>

      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-stone-800/60">
              {["Operator", "City", "Status", "Tables", "Pulse"].map((heading) => (
                <th
                  key={heading}
                  className="px-5 py-4 text-[11px] font-normal uppercase tracking-[0.34em] text-stone-600"
                  style={{ fontFamily: font.rajdhani }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isActive = row.status === "Active";

              return (
                <tr key={row.operator} className="border-b border-stone-800/40 text-sm text-stone-300">
                  <td className="px-5 py-4 text-base text-stone-200" style={{ fontFamily: font.rajdhani }}>
                    {row.operator}
                  </td>
                  <td className="px-5 py-4">{row.city}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex min-w-[96px] items-center justify-center border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
                        isActive
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                      }`}
                      style={{ fontFamily: font.rajdhani }}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-stone-200">{row.tables}</td>
                  <td className="px-5 py-4 text-stone-500">{row.pulse}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LaneCard({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="h-full border border-stone-800/60 bg-stone-950/60 p-7">
      <div className="text-xs tracking-[0.32em] text-amber-600/70" style={{ fontFamily: font.rajdhani }}>
        {number}
      </div>
      <h3 className="mt-4 text-2xl text-stone-100" style={{ fontFamily: font.oswald }}>
        {title}
      </h3>
      <p className="mt-4 text-sm leading-7 text-stone-400">{body}</p>
    </div>
  );
}

function RhythmStep({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-sm border border-stone-800/70 bg-stone-950/45 p-6">
      <div className="text-[11px] uppercase tracking-[0.34em] text-amber-600/70" style={{ fontFamily: font.rajdhani }}>
        {step}
      </div>
      <h3 className="mt-4 text-2xl text-stone-100" style={{ fontFamily: font.oswald }}>
        {title}
      </h3>
      <p className="mt-4 text-sm leading-7 text-stone-400">{body}</p>
    </div>
  );
}

export default function MissionPage() {
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
            <NavLink href="/mission" label="Mission" active />
            <NavLink href="/#movement" label="Movement" />
            <NavLink href="/system" label="System" />
            <NavLink href="/#deploy" label="Deploy" />
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-6 pb-24 pt-24 md:pb-32 md:pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_28%,rgba(212,160,84,0.12),transparent_24%),linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:auto,72px_72px,72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_34%,#050505_100%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <Pill>Active Deployment</Pill>
            <h1 className="mt-8 text-5xl font-bold leading-none tracking-tight text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
              ENTER
              <br />
              THE MISSION
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-8 text-stone-400 md:text-lg">
              This is the operational layer beneath the headline. The mission is not abstract vision. It is a living assignment to go, proclaim the gospel, make disciples, and multiply obedient presence across cities, campuses, and neighborhoods.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <ActionLink href="#briefing">Access the Briefing</ActionLink>
              <ActionLink href="/system" variant="secondary">View the System</ActionLink>
            </div>
            <div className="mt-12 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                ["The Assignment", "Go where people already are and carry the presence of Jesus there."],
                ["The Posture", "Move with courage, humility, prayer, and clarity."],
                ["The Outcome", "New believers, new tables, new laborers, and visible multiplication."],
              ].map(([title, body]) => (
                <div key={title} className="border-t border-stone-800/80 pt-4">
                  <div className="text-xs uppercase tracking-[0.28em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
                    {title}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-500">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <TacticalMap />
          </div>
        </div>
      </section>

      <section id="briefing" className="px-6 py-24 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <SectionTitle
            overline="ACCESS BRIEFING"
            title={<>LIVE FIELD<br />METRICS</>}
            description={<>This briefing now opens the operational picture. Instead of general directives, it surfaces the current field state: where deployment is active, where tables are forming, and where multiplication capacity is building right now.</>}
          />
          <MetricsDashboard />
        </div>
      </section>

      <section className="bg-[#080808] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            overline="FIELD LANES"
            title={<>ONE MISSION.<br />MULTIPLE FRONTS.</>}
            description={<>Every deployment looks a little different, but the mission stays the same. We move into the spaces where people already gather and establish faithful presence until relationships, witness, and multiplication begin to form.</>}
            align="center"
          />
          <div className="mt-14 grid gap-px bg-stone-800/30 md:grid-cols-3">
            <LaneCard
              number="01"
              title="City Presence"
              body="Enter the rhythms of a city with long-term vision. Learn the people, listen well, pray on the ground, and build trust where the gospel can be seen and heard."
            />
            <LaneCard
              number="02"
              title="Table Formation"
              body="Gather small pockets of hunger into simple tables of scripture, prayer, repentance, obedience, and shared mission. Keep it reproducible from day one."
            />
            <LaneCard
              number="03"
              title="Leader Multiplication"
              body="Disciple the ones who will disciple others. The mission matures when new laborers can carry the same DNA into their own relational networks."
            />
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            overline="DEPLOYMENT RHYTHM"
            title={<>HOW THE MISSION<br />MOVES FORWARD</>}
            description={<>The rhythm is simple on purpose. Complexity slows obedience. We want a pathway that can travel from one person to one household to one city without depending on a stage, a building, or a specialist class.</>}
          />
          <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <RhythmStep
              step="STEP 01"
              title="Enter"
              body="Go first. Cross the room, enter the neighborhood, start the conversation, and refuse passive Christianity."
            />
            <RhythmStep
              step="STEP 02"
              title="Discern"
              body="Look for openness, peace, pain, need, and spiritual hunger. Follow the doors God is already opening."
            />
            <RhythmStep
              step="STEP 03"
              title="Establish"
              body="Open scripture, pray with boldness, minister in practical ways, and create repeatable environments where others can belong and grow."
            />
            <RhythmStep
              step="STEP 04"
              title="Multiply"
              body="Train emerging leaders to carry the same pattern forward. The goal is not dependence on us, but reproduction through them."
            />
          </div>
        </div>
      </section>

      <section className="bg-[#080808] px-6 py-24 md:py-32">
        <div className="mx-auto grid max-w-7xl items-start gap-14 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <SectionTitle
              overline="RULES OF ENGAGEMENT"
              title={<>THIS IS NOT<br />PERFORMANCE</>}
              description={<>We are not trying to look missional. We are trying to be faithful. The mission does not need more atmosphere than substance. It needs men and women who pray, obey, repent quickly, stay in the field, and keep showing up where Jesus sends them.</>}
            />
          </div>
          <div className="grid gap-4">
            {[
              "No spectators. Everyone is sent.",
              "No celebrity center. The work belongs in the field.",
              "No dependency culture. We train people to obey without needing permission for every step.",
              "No mission without prayer, scripture, and actual proximity to people.",
            ].map((line, index) => (
              <div key={line} className="border-l border-amber-500/30 bg-stone-950/40 px-5 py-5">
                <div className="text-[11px] uppercase tracking-[0.32em] text-amber-600/70" style={{ fontFamily: font.rajdhani }}>
                  Protocol {String(index + 1).padStart(2, "0")}
                </div>
                <p className="mt-3 text-sm leading-7 text-stone-400">{line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 py-28 md:py-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,rgba(212,160,84,0.06),transparent_44%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-xs uppercase tracking-[0.42em] text-amber-600/60" style={{ fontFamily: font.rajdhani }}>
            Matthew 28:19-20
          </p>
          <h2 className="mt-8 text-5xl font-bold leading-none tracking-tight text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
            THE MISSION
            <br />
            CONTINUES
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-stone-400 md:text-lg">
            The command has not changed. Go, make disciples, teach obedience, and trust that Jesus is still with His people as they move.
          </p>
          <div className="mt-12 flex flex-col justify-center gap-4 sm:flex-row">
            <ActionLink href="/">Return to Base</ActionLink>
            <ActionLink href="/system" variant="secondary">Inspect the Infrastructure</ActionLink>
          </div>
        </div>
      </section>
    </main>
  );
}
