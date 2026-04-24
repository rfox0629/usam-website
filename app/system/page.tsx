import type { Metadata } from "next";
import { PrimaryNav } from "../../components/PrimaryNav";
import { WaitingListCTA } from "./WaitingListCTA";

export const metadata: Metadata = {
  title: "System Layer | USA Missionaries",
  description: "USA Missionaries is building discipleship infrastructure for accountability, leadership, and multiplication.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const commandRows = [
  { post: "CP-014", city: "Austin, TX", status: "Active", tables: "3" },
  { post: "CP-028", city: "Denver, CO", status: "Active", tables: "5" },
  { post: "CP-041", city: "Nashville, TN", status: "Deploying", tables: "2" },
  { post: "CP-057", city: "Phoenix, AZ", status: "Active", tables: "4" },
] as const;

const cards = [
  {
    number: "01",
    title: "Connect",
    body: "Every person reached needs a next step.",
  },
  {
    number: "02",
    title: "Account",
    body: "Commitments, conversations, and care cannot disappear.",
  },
  {
    number: "03",
    title: "Multiply",
    body: "Leaders are trained to train others.",
  },
] as const;

function BriefingLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.32em] text-amber-500/80" style={{ fontFamily: font.rajdhani }}>
      {children}
    </p>
  );
}

function DashboardPanel() {
  return (
    <div
      id="system-preview"
      className="relative border border-stone-800/80 bg-[#060606]/95 shadow-[0_0_36px_rgba(0,0,0,0.45)]"
    >
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.018),rgba(255,255,255,0.018)_1px,transparent_1px,transparent_5px)]" />
      <div className="relative border-b border-stone-800/70 px-4 py-4 md:px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(34,197,94,0.35)]" />
            <span
              className="truncate text-[10px] uppercase tracking-[0.26em] text-stone-400"
              style={{ fontFamily: font.rajdhani }}
            >
              System // Operator Dashboard
            </span>
          </div>
          <span className="hidden text-[10px] text-stone-700 sm:inline">v0.1.0-alpha</span>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-stone-900/90">
              {["Command Post", "City", "Status", "Tables"].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-4 text-[10px] font-normal uppercase tracking-[0.28em] text-stone-700 md:px-5"
                  style={{ fontFamily: font.rajdhani }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {commandRows.map((row) => (
              <tr key={row.post} className="border-b border-stone-900/80 last:border-b-0">
                <td className="px-4 py-4 text-xs text-stone-300 md:px-5" style={{ fontFamily: font.rajdhani }}>
                  {row.post}
                </td>
                <td className="px-4 py-4 text-sm text-stone-400 md:px-5">{row.city}</td>
                <td className="px-4 py-4 md:px-5">
                  <span
                    className={`inline-flex px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
                      row.status === "Active"
                        ? "bg-emerald-950/70 text-emerald-500"
                        : "bg-amber-950/60 text-amber-500"
                    }`}
                    style={{ fontFamily: font.rajdhani }}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-stone-300 md:px-5">{row.tables}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SystemPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" />

      <section className="relative overflow-hidden border-b border-stone-900/80 px-6 pb-16 pt-28 md:pb-20 md:pt-36">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.06),transparent_24%),linear-gradient(180deg,rgba(5,5,5,0.15),#050505_88%)]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="max-w-2xl">
            <BriefingLabel>SYSTEM LAYER</BriefingLabel>
            <h1
              className="mt-7 text-5xl font-bold uppercase leading-[0.92] tracking-tight text-stone-100 md:text-7xl"
              style={{ fontFamily: font.oswald }}
            >
              The Infrastructure
              <br />
              Is Being Built
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-stone-400 md:text-xl">
              A discipleship platform designed to connect leaders, track movement, and support multiplication at scale.
            </p>

            <WaitingListCTA />
          </div>

          <DashboardPanel />
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <BriefingLabel>THE DISCIPLESHIP PROBLEM</BriefingLabel>
            <h2
              className="mt-6 text-4xl font-bold uppercase leading-tight text-stone-100 md:text-5xl"
              style={{ fontFamily: font.oswald }}
            >
              Evangelism starts the conversation.
              <br />
              Discipleship carries it forward.
            </h2>
            <div className="mt-7 space-y-5 text-base leading-8 text-stone-400 md:text-lg">
              <p>
                People are being reached. But without a system for follow up, accountability, and training, momentum gets lost.
              </p>
              <p>
                USA Missionaries is building the infrastructure to help pastors, teachers, and lay leaders disciple in the masses.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-px bg-stone-800/30 md:grid-cols-3">
            {cards.map((card) => (
              <div key={card.title} className="border border-stone-800/60 bg-stone-950/60 p-6 text-left">
                <div className="text-[10px] uppercase tracking-[0.28em] text-amber-500/80" style={{ fontFamily: font.rajdhani }}>
                  {card.number}
                </div>
                <h3 className="mt-4 text-2xl uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-stone-400">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-stone-900/80 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <BriefingLabel>COMING INTO VIEW</BriefingLabel>
            <h2
              className="mt-6 text-4xl font-bold uppercase leading-tight text-stone-100 md:text-5xl"
              style={{ fontFamily: font.oswald }}
            >
              A System For Tables,
              <br />
              Teams, And Cities.
            </h2>
            <p className="mt-7 whitespace-pre-line text-base leading-8 text-stone-400 md:text-lg">
              {`From one table to many.
From one leader to a trained network.
From scattered effort to accountable multiplication.`}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
